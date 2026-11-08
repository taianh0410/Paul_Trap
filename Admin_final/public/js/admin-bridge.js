// admin-bridge.js
// Cầu nối giữa quyền điều khiển admin (server) và UI/game của nhóm.
// Cách dùng: thêm 1 dòng vào cuối public/index.html, SAU các script khác:
//   <script src="js/admin-bridge.js"></script>
// File này KHÔNG sửa code của nhóm, chỉ lắng nghe sự kiện từ admin.
(function () {
  if (window.__ionBridgeLoaded) { console.warn('[admin-bridge] bị nạp 2 lần, bỏ bản thứ hai (kiểm tra index.html)'); return; }
  window.__ionBridgeLoaded = true;
  const socket = window.socket || (window.socketClient && window.socketClient.socket);
  if (!socket) { console.warn('[admin-bridge] Không thấy socket, bỏ qua'); return; }

  // ---- Trạng thái admin cho engine vật lý đọc ----
  window.adminState = { params: {}, decade: null, touched: [], phase: 'waiting' };
  window.adminPaused = false;

  // Lấy giá trị admin đã chỉnh tay cho 1 thông số. Chưa chỉnh thì trả undefined.
  //   const friction = adminOverride('friction') ?? friction_theo_thap_ky;
  window.adminOverride = (key) =>
    (window.adminState.touched || []).includes(key) ? window.adminState.params[key] : undefined;
  // Lấy giá trị thông số hiện hành (kể cả chưa chỉnh tay), có mặc định dự phòng
  window.adminParam = (key, fallback) => {
    const v = window.adminState.params && window.adminState.params[key];
    return v == null ? fallback : v;
  };

  // ---- Nối với IonTrapPhysicsEngine ----
  // Engine nhận stageConfig mỗi khung hình. Thay vì gọi engine.getCurrentStageConfig(t),
  // game gọi adminStageConfig(engine, t): trả về config của thập kỷ (hoặc thập kỷ admin ép),
  // sau đó ghi đè các thông số admin đã chỉnh tay.
  const BOOL_KEYS = ['massVariable', 'bohrLevelVariable', 'hasCenterBlackHole'];
  const CFG_KEYS = ['friction', 'mass', 'massVariable', 'bohrLevelVariable', 'noiseAmp',
    'shockFreq', 'shockForceMin', 'shockForceMax', 'shockDuration',
    'hasCenterBlackHole', 'blackHoleRadius', 'blackHoleStrength', 'coordRotationSpeed', 'playerGain'];
  window.adminStageConfig = function (engine, elapsedSec) {
    const st = window.adminState || {};
    let base = engine.getCurrentStageConfig(elapsedSec);
    if (st.decade && typeof DECADE_CONFIGS !== 'undefined' && DECADE_CONFIGS[st.decade - 1]) {
      base = DECADE_CONFIGS[st.decade - 1];            // admin ép thập kỷ
    }
    const cfg = Object.assign({}, base);
    (st.touched || []).forEach((k) => {
      if (!CFG_KEYS.includes(k)) return;
      const v = st.params[k];
      cfg[k] = BOOL_KEYS.includes(k) ? v >= 0.5 : v;
    });
    // Engine không có giá trị mặc định cho hố đen: bật bằng tay thì phải bù, nếu không sẽ ra NaN
    if (cfg.hasCenterBlackHole) {
      if (cfg.blackHoleRadius == null) cfg.blackHoleRadius = 24;
      if (cfg.blackHoleStrength == null) cfg.blackHoleStrength = 280000;
    }
    if (cfg.shockForceMin != null && cfg.shockForceMax != null && cfg.shockForceMin > cfg.shockForceMax) {
      const t = cfg.shockForceMin; cfg.shockForceMin = cfg.shockForceMax; cfg.shockForceMax = t;
    }
    return cfg;
  };

  // ---- Đăng ký nhận thông số admin (chỉ display mới đăng ký, điện thoại người chơi thì không) ----
  // Display chạy trên chính máy server (localhost) thì tự được chấp nhận.
  // Display chạy trên máy khác: mở trang với ?key=<ADMIN_TOKEN>
  const subKey = new URLSearchParams(location.search).get('key') || '';
  const subscribe = () => socket.emit('admin_subscribe', subKey);
  socket.on('connect', subscribe);
  if (socket.connected) subscribe();

  // Hỗ trợ ngầm. Game gọi MỘT lần sau mỗi engine.update(...):
  //   adminAssist(engine, dt)
  // Gồm 3 phần, mỗi phần chỉ chạy khi admin đã chỉnh thông số tương ứng:
  //   playerGain    : nhân thêm lực người chơi (engine gốc cố định 650)
  //   directControl : vận tốc bám theo góc nghiêng, thả ra là dừng (cảm giác điều khiển trực tiếp)
  //   centerAssist  : kéo hạt nhẹ về tâm
  window.adminAssist = function (engine, dt) {
    const p = engine.particle, c = engine.center, sm = engine.smoothInput;
    const cr = Math.cos(engine.coordRotation), sr = Math.sin(engine.coordRotation);
    const ix = sm.x * cr - sm.y * sr, iy = sm.x * sr + sm.y * cr;       // cùng phép xoay với engine

    const g = window.adminOverride('playerGain');
    if (g != null && g !== 1) {
      const k = (g - 1) * 650 / (p.mass || 1) * dt;
      p.vel.x += ix * k; p.vel.y += iy * k;
    }

    const d = window.adminOverride('directControl');
    if (d > 0) {
      const vmax = engine.trapRadius * 0.9;                              // đi hết bẫy trong ~2 giây khi nghiêng tối đa
      const blend = Math.min(1, d * 10 * dt);
      p.vel.x += (ix * vmax - p.vel.x) * blend;
      p.vel.y += (iy * vmax - p.vel.y) * blend;
    }

    const a = window.adminOverride('centerAssist');
    if (a > 0) {
      const k = a * 4;
      p.vel.x += (c.x - p.pos.x) * k * dt;
      p.vel.y += (c.y - p.pos.y) * k * dt;
    }
  };
  // Bất tử: game kiểm tra trong onGameOver/onDisqualify, nếu true thì bỏ qua thua và đặt lại hạt
  window.adminGodMode = () => (window.adminOverride('godMode') || 0) >= 0.5;

  // ---- Báo phase thật của game về cho admin ----
  const PHASE_MAP = { waiting: 'waiting', countdown: 'countdown', playing: 'playing', game_over: 'over', victory: 'over' };
  const report = (s) => socket.emit('phase_report', PHASE_MAP[s] || s);
  if (typeof window.changeGameState === 'function') {
    const orig = window.changeGameState;
    window.changeGameState = function (s) { orig.apply(this, arguments); report(s); };
  }
  const reportNow = () => { if (typeof currentState !== 'undefined') report(currentState); };
  socket.on('connect', reportNow);
  if (socket.connected) reportNow();

  // ---- Hiệu ứng nhỏ dùng chung ----
  const mk = (css) => { const d = document.createElement('div'); d.style.cssText = css; document.body.appendChild(d); return d; };
  const flashEl = mk('position:fixed;inset:0;background:#f00;opacity:0;pointer-events:none;transition:opacity .25s;z-index:9998');
  const noteEl = mk('position:fixed;left:0;right:0;bottom:24px;text-align:center;font:600 28px system-ui,sans-serif;color:#ff0;text-shadow:0 0 12px #ff0;pointer-events:none;z-index:9999');
  const flash = () => { flashEl.style.opacity = 0.35; setTimeout(() => flashEl.style.opacity = 0, 150); };

  // ---- Lệnh từ admin ----
  socket.on('admin_state', (s) => {
    window.adminState = s;
    window.dispatchEvent(new CustomEvent('admin_state', { detail: s }));
  });

  socket.on('game_cmd', ({ cmd }) => {
    const has = (n) => typeof window[n] === 'function';
    switch (cmd) {
      case 'start':
        window.adminPaused = false;
        if (typeof currentState !== 'undefined' && currentState !== GAME_STATE.WAITING && has('restartGame')) restartGame();
        if (has('startGame')) startGame();
        break;
      case 'reset':  window.adminPaused = false; if (has('restartGame')) restartGame(); break;
      case 'end':    if (has('gameOver')) gameOver(); break;
      case 'win':    if (has('victory')) victory(); break;
      case 'pause':  window.adminPaused = true; break;   // engine tự kiểm tra window.adminPaused
      case 'resume': window.adminPaused = false; break;
    }
    window.dispatchEvent(new CustomEvent('admin_cmd', { detail: { cmd } }));
  });

  socket.on('admin_impulse', (d) => {
    if (window.adminState && window.adminState.stealth === false) flash();   // chế độ ẩn: không báo hiệu gì
    const rad = (d.angle || 0) * Math.PI / 180;
    const eng = window.ionEngine;                       // game gán: window.ionEngine = engine
    if (eng && eng.shockVector) {
      const f = Math.min(10, d.magnitude || 0) * 360;   // 10 = lực tối đa ~3600 như xung của engine
      eng.shockVector = { x: Math.cos(rad) * f, y: Math.sin(rad) * f, duration: 0.15 };
    } else if (window.electron) {
      // Chưa nối engine: hất electron trên quỹ đạo cho thấy được hiệu ứng
      window.electron.angle += (d.magnitude || 0) * 0.05 * (Math.cos(rad) >= 0 ? 1 : -1);
    }
    window.dispatchEvent(new CustomEvent('admin_impulse', { detail: d }));
  });

  socket.on('announce', ({ text }) => {
    noteEl.textContent = text || '';
    clearTimeout(noteEl._t);
    noteEl._t = setTimeout(() => noteEl.textContent = '', 5000);
  });

  socket.on('haptic', ({ pattern }) => { if (navigator.vibrate) navigator.vibrate(pattern); });
})();
