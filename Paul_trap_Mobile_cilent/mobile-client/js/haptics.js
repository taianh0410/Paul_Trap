/**
 * NHIỆM VỤ 3: XỬ LÝ RUNG ĐIỆN THOẠI (HAPTIC FEEDBACK)
 * - Rung khi hạt electron đập vào viền bẫy (Wall Collision)
 * - Rung khi chuyển qua thập kỷ mới / qua bàn (Decade / Level Up)
 * - Có Web Audio API (âm xung trầm) + Chớp viền màn hình dự phòng cho thiết bị chặn navigator.vibrate
 */
class HapticController {
  constructor(config) {
    this.config = config;
    this.overlay = document.getElementById("haptic-flash-overlay");
    this.audioCtx = null;
    this.lastWallHitTime = 0;
  }

  // Khởi tạo AudioContext sau khi người chơi bấm nút "Sẵn sàng"
  unlockAudio() {
    if (!this.audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        this.audioCtx = new AudioContextClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === "suspended") {
      this.audioCtx.resume();
    }
  }

  // Hàm gọi rung chuẩn HTML5 Vibration API
  vibrate(pattern) {
    if ("vibrate" in navigator) {
      try {
        navigator.vibrate(pattern);
      } catch (err) {
        // Một số trình duyệt di động yêu cầu tương tác người dùng trước
      }
    }
  }

  // Phát xung âm thanh trầm mô phỏng lực phản hồi từ trường (hữu ích trên iOS)
  playSynthPulse(freq = 110, durationMs = 80, type = "sawtooth") {
    if (!this.audioCtx) return;
    try {
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.audioCtx.currentTime);

      gain.gain.setValueAtTime(0.18, this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + durationMs / 1000);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);
      osc.start();
      osc.stop(this.audioCtx.currentTime + durationMs / 1000);
    } catch (e) {}
  }

  // Hiệu ứng chớp viền màn hình
  triggerVisualFlash(className, durationMs = 220) {
    if (!this.overlay) return;
    this.overlay.classList.remove("flash-danger", "flash-levelup");
    void this.overlay.offsetWidth; // Force reflow
    this.overlay.classList.add(className);
    setTimeout(() => {
      this.overlay.classList.remove(className);
    }, durationMs);
  }

  // 1. Khi hạt electron đập vào viền bẫy (Wall Collision)
  onWallCollision(intensity = 1.0) {
    const now = performance.now();
    // Chống spam rung quá dày nếu hạt trượt dọc theo viền (cooldown 120ms)
    if (now - this.lastWallHitTime < 120) return;
    this.lastWallHitTime = now;

    const pattern = intensity > 0.7
      ? this.config.HAPTICS.WALL_HIT_HEAVY
      : this.config.HAPTICS.WALL_HIT_LIGHT;

    this.vibrate(pattern);
    this.triggerVisualFlash("flash-danger", 200);
    this.playSynthPulse(95, 90, "sawtooth");
  }

  // 2. Khi qua bàn / sang thập kỷ mới (Decade Change / Level Up)
  onDecadePass() {
    this.vibrate(this.config.HAPTICS.DECADE_UP);
    this.triggerVisualFlash("flash-levelup", 350);
    this.playSynthPulse(440, 120, "sine");
    setTimeout(() => this.playSynthPulse(660, 160, "sine"), 130);
  }

  // 3. Khi Game Over
  onGameOver() {
    this.vibrate(this.config.HAPTICS.GAME_OVER);
    this.triggerVisualFlash("flash-danger", 600);
    this.playSynthPulse(75, 350, "sawtooth");
  }

  // 4. Khi Chiến thắng (Sống sót qua 7 thập kỷ - 70 giây)
  onVictory() {
    this.vibrate(this.config.HAPTICS.VICTORY);
    this.triggerVisualFlash("flash-levelup", 600);
    this.playSynthPulse(523.25, 120, "triangle");
    setTimeout(() => this.playSynthPulse(659.25, 120, "triangle"), 140);
    setTimeout(() => this.playSynthPulse(783.99, 250, "triangle"), 280);
  }
}

window.HapticController = HapticController;
