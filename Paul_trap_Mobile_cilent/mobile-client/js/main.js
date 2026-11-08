/**
 * LUỒNG ĐIỀU KHIỂN CHÍNH (PHẦN 4 - CLIENT MOBILE)
 * - Kết nối Socket.io với Namespace & Room (đồng bộ Nhóm 1)
 * - Xử lý nút SẴN SÀNG to, xin quyền cảm biến & giữ màn hình luôn sáng (WakeLock)
 * - Duy trì vòng lặp gửi Vector lực 2D về server với tần số đúng 60 lần/giây (60Hz)
 * - Lắng nghe sự kiện va chạm viền & qua thập kỷ từ Phần 2 & 3 để kích hoạt Haptic Feedback
 */
(function () {
  const cfg = window.PAUL_TRAP_CONFIG;
  const haptics = new window.HapticController(cfg);
  const sensor = new window.MagneticSensor(cfg);

  // DOM Elements
  const connDot = document.getElementById("conn-dot");
  const roomSelect = document.getElementById("room-select");
  const gamePhaseText = document.getElementById("game-phase-text");
  const decadeText = document.getElementById("decade-text");
  const hzCounter = document.getElementById("hz-counter");

  const readyOverlay = document.getElementById("ready-overlay");
  const btnReady = document.getElementById("btn-ready");
  const countdownOverlay = document.getElementById("countdown-overlay");
  const countdownNumber = document.getElementById("countdown-number");

  const radarEl = document.getElementById("magnetic-radar");
  const puckEl = document.getElementById("electron-puck");
  const canvas = document.getElementById("vector-canvas");
  const ctx = canvas.getContext("2d");

  const valVx = document.getElementById("val-vx");
  const valVy = document.getElementById("val-vy");
  const valBeta = document.getElementById("val-beta");
  const valGamma = document.getElementById("val-gamma");

  const btnCalibrate = document.getElementById("btn-calibrate");
  const btnTestHaptic = document.getElementById("btn-test-haptic");

  let socket = null;
  let isStreaming = false;
  let sentPacketsInSec = 0;
  let currentRoom = roomSelect.value;

  // Tự động đọc tham số ?room=screen-1 từ mã QR (nếu người chơi quét QR trên màn hình Laptop)
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get("room")) {
    const r = urlParams.get("room");
    if (![...roomSelect.options].some((o) => o.value === r)) {
      const opt = document.createElement("option");
      opt.value = r;
      opt.textContent = r.toUpperCase();
      roomSelect.appendChild(opt);
    }
    roomSelect.value = r;
    currentRoom = r;
  }

  // 1. Khởi tạo kết nối Socket.io (Hỗ trợ Namespace + Room của Nhóm 1)
  function initSocket() {
    if (typeof io === "undefined") {
      gamePhaseText.textContent = "CHẾ ĐỘ OFFLINE DEMO";
      return;
    }

    socket = io(cfg.SOCKET_URL + cfg.NAMESPACE, {
      transports: ["websocket", "polling"],
      reconnectionAttempts: 5
    });

    socket.on("connect", () => {
      connDot.classList.add("online");
      gamePhaseText.textContent = "ĐÃ KẾT NỐI TRẠM";
      joinSelectedRoom(currentRoom);
    });

    socket.on("connect_error", () => {
      // Nếu server Phần 1 dùng namespace mặc định "/", tự động chuyển sang "/"
      if (cfg.FALLBACK_DEFAULT_NS && cfg.NAMESPACE !== "") {
        cfg.NAMESPACE = "";
        socket.close();
        initSocket();
      }
    });

    socket.on("disconnect", () => {
      connDot.classList.remove("online");
      gamePhaseText.textContent = "MẤT KẾT NỐI";
    });

    // Đăng ký lắng nghe các sự kiện từ Server / Màn hình chính (Phần 2 & 3)
    cfg.EVENTS.COUNTDOWN.forEach((evt) => {
      socket.on(evt, (data) => {
        const count = typeof data === "object" ? data.count : data;
        showCountdown(count);
      });
    });

    cfg.EVENTS.COLLISION.forEach((evt) => {
      socket.on(evt, (data) => {
        const intensity = data && data.intensity ? data.intensity : 1.0;
        haptics.onWallCollision(intensity);
      });
    });

    cfg.EVENTS.DECADE_PASS.forEach((evt) => {
      socket.on(evt, (data) => {
        const dec = (data && (data.decade || data.level)) || "MỚI";
        decadeText.textContent = `${dec} / 7`;
        haptics.onDecadePass();
      });
    });

    cfg.EVENTS.GAME_OVER.forEach((evt) => {
      socket.on(evt, () => {
        gamePhaseText.textContent = "MẤT HẠT (GAME OVER)";
        haptics.onGameOver();
        resetToReadyState("THỬ LẠI");
      });
    });

    cfg.EVENTS.VICTORY.forEach((evt) => {
      socket.on(evt, () => {
        gamePhaseText.textContent = "BẪY THÀNH CÔNG!";
        haptics.onVictory();
        resetToReadyState("CHƠI LẠI");
      });
    });
  }

  function joinSelectedRoom(roomId) {
    if (!socket || !socket.connected) return;
    socket.emit(cfg.EVENTS.JOIN_ROOM, {
      roomId: roomId,
      room: roomId,
      role: "mobile_controller"
    });
  }

  roomSelect.addEventListener("change", (e) => {
    currentRoom = e.target.value;
    joinSelectedRoom(currentRoom);
  });

  // 2. Xử lý nút "SẴN SÀNG" to (Nhiệm vụ 1)
  btnReady.addEventListener("click", async () => {
    haptics.unlockAudio();
    haptics.vibrate(cfg.HAPTICS.READY_CLICK);

    // Xin quyền cảm biến góc nghiêng và lấy góc cầm máy hiện tại làm gốc cân bằng
    await sensor.requestPermissionAndStart();
    setTimeout(() => sensor.calibrate(), 100);

    // Giữ màn hình điện thoại luôn sáng trong suốt 70 giây chơi
    if ("wakeLock" in navigator) {
      try {
        await navigator.wakeLock.request("screen");
      } catch (e) {}
    }

    readyOverlay.classList.add("hidden");
    gamePhaseText.textContent = "ĐANG ĐIỀU KHIỂN";

    if (socket && socket.connected) {
      socket.emit(cfg.EVENTS.PLAYER_READY, {
        roomId: currentRoom,
        room: currentRoom,
        timestamp: Date.now()
      });
    }

    start60HzLoop();
  });

  function showCountdown(count) {
    if (count > 0) {
      countdownOverlay.classList.remove("hidden");
      countdownNumber.textContent = count;
      haptics.vibrate([40]);
    } else {
      countdownOverlay.classList.add("hidden");
      gamePhaseText.textContent = "ĐANG BẪY ELECTRON";
      haptics.vibrate([100]);
    }
  }

  function resetToReadyState(buttonLabel) {
    readyOverlay.classList.remove("hidden");
    btnReady.querySelector(".btn-glitch-text").textContent = buttonLabel || "SẴN SÀNG";
  }

  // 3. Vòng lặp đọc cảm biến & gửi socket.emit 60 lần/giây (Nhiệm vụ 2)
  function start60HzLoop() {
    if (isStreaming) return;
    isStreaming = true;

    const intervalMs = 1000 / cfg.SEND_RATE_HZ; // ~16.67ms (60Hz)
    let seq = 0;

    setInterval(() => {
      const vec = sensor.computeForceVector();
      seq++;

      // Cập nhật giao diện bảng điều khiển từ trường
      updateRadarUI(vec);

      // Gửi dữ liệu về Server với tần số 60Hz
      if (socket && socket.connected) {
        const payload = {
          roomId: currentRoom,
          room: currentRoom,
          seq: seq,
          x: vec.x,
          y: vec.y,
          fx: vec.fx,
          fy: vec.fy,
          alpha: vec.alpha,
          beta: vec.beta,
          gamma: vec.gamma,
          timestamp: Date.now()
        };
        socket.emit(cfg.EVENTS.TILT_VECTOR, payload);
      }

      sentPacketsInSec++;
    }, intervalMs);

    // Bộ đếm kiểm tra tần số gửi thực tế (Hz)
    setInterval(() => {
      hzCounter.textContent = `${sentPacketsInSec} Hz`;
      sentPacketsInSec = 0;
    }, 1000);
  }

  // 4. Vẽ Vector Lực Từ Trường 2D lên Radar
  function updateRadarUI(vec) {
    valVx.textContent = vec.x.toFixed(2);
    valVy.textContent = vec.y.toFixed(2);
    valBeta.textContent = `${vec.beta}°`;
    valGamma.textContent = `${vec.gamma}°`;

    const maxRadius = 115; // Bán kính di chuyển tối đa trên radar 280x280
    const px = vec.x * maxRadius;
    const py = vec.y * maxRadius;

    puckEl.style.transform = `translate(${px}px, ${py}px)`;

    // Vẽ tia vector lực từ tâm đến hạt
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;

    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + px, cy + py);
    ctx.strokeStyle = "#00f3ff";
    ctx.lineWidth = 3;
    ctx.shadowBlur = 10;
    ctx.shadowColor = "#00f3ff";
    ctx.stroke();
  }

  // Hỗ trợ kéo chuột / chạm trực tiếp lên Radar để test khi không dùng điện thoại
  function handlePointer(e) {
    const rect = radarEl.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const maxR = rect.width / 2 - 20;

    const normX = (clientX - cx) / maxR;
    const normY = (clientY - cy) / maxR;
    sensor.setTouchVector(normX, normY);
  }

  radarEl.addEventListener("pointerdown", (e) => {
    radarEl.setPointerCapture(e.pointerId);
    handlePointer(e);
  });
  radarEl.addEventListener("pointermove", (e) => {
    if (e.buttons > 0) handlePointer(e);
  });
  radarEl.addEventListener("pointerup", () => sensor.releaseTouchVector());
  radarEl.addEventListener("pointercancel", () => sensor.releaseTouchVector());

  // Nút cân bằng góc 0 & nút test rung Haptic
  btnCalibrate.addEventListener("click", () => {
    sensor.calibrate();
    haptics.vibrate([30, 40, 30]);
  });

  btnTestHaptic.addEventListener("click", () => {
    haptics.unlockAudio();
    haptics.onWallCollision(1.0);
  });

  initSocket();
})();
