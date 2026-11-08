/**
 * NHIỆM VỤ 2: XỬ LÝ CẢM BIẾN GÓC NGHIÊNG & CHUYỂN ĐỔI THÀNH VECTOR LỰC 2D (X, Y)
 * - Đọc góc Alpha, Beta, Gamma từ DeviceOrientationEvent
 * - Fallback sang DeviceMotionEvent (accelerationIncludingGravity) nếu thiết bị không có Orientation
 * - Hỗ trợ kéo chạm trực tiếp trên mặt Radar (Touch/Mouse) để dễ dàng test trên Laptop
 * - Hỗ trợ Calibrate (Đặt lại góc cân bằng 0,0 theo tư thế cầm tự nhiên của người chơi)
 */
class MagneticSensor {
  constructor(config) {
    this.config = config;
    this.rawAngles = { alpha: 0, beta: 0, gamma: 0 };
    this.offsetAngles = { beta: 0, gamma: 0 }; // Góc chuẩn khi người chơi bấm Calibrate / Sẵn sàng
    this.smoothedVector = { x: 0, y: 0 };
    this.smoothingFactor = 0.35; // Làm mượt nhiễu cảm biến ngay trên client trước khi gửi 60Hz
    this.hasSensorData = false;
    this.isTouchOverriding = false;
  }

  // Xin quyền truy cập cảm biến (Bắt buộc trên iOS 13+ phải gọi trong sự kiện click nút "Sẵn sàng")
  async requestPermissionAndStart() {
    if (
      typeof DeviceOrientationEvent !== "undefined" &&
      typeof DeviceOrientationEvent.requestPermission === "function"
    ) {
      try {
        const permission = await DeviceOrientationEvent.requestPermission();
        if (permission !== "granted") {
          alert("Vui lòng cấp quyền Cảm biến chuyển động để điều khiển bẫy từ trường!");
        }
      } catch (err) {
        console.warn("Không thể xin quyền DeviceOrientationEvent:", err);
      }
    }

    if (
      typeof DeviceMotionEvent !== "undefined" &&
      typeof DeviceMotionEvent.requestPermission === "function"
    ) {
      try {
        await DeviceMotionEvent.requestPermission();
      } catch (err) {}
    }

    this.bindEvents();
  }

  bindEvents() {
    // 1. Ưu tiên DeviceOrientationEvent (Đọc góc Alpha, Beta, Gamma)
    window.addEventListener(
      "deviceorientation",
      (event) => {
        if (event.beta === null && event.gamma === null) return;
        this.hasSensorData = true;
        this.rawAngles.alpha = event.alpha || 0;
        this.rawAngles.beta = event.beta || 0;   // Nghiêng trước - sau (-180 đến 180)
        this.rawAngles.gamma = event.gamma || 0; // Nghiêng trái - phải (-90 đến 90)
      },
      true
    );

    // 2. Fallback sang DeviceMotionEvent nếu thiết bị chỉ trả về gia tốc trọng trường
    window.addEventListener(
      "devicemotion",
      (event) => {
        if (this.hasSensorData) return; // Đã có DeviceOrientation thì bỏ qua
        const acc = event.accelerationIncludingGravity;
        if (!acc || (acc.x === null && acc.y === null)) return;

        // Quy đổi gần đúng gia tốc trọng trường sang góc nghiêng Beta, Gamma
        const gamma = Math.atan2(-acc.x, Math.sqrt(acc.y * acc.y + acc.z * acc.z)) * (180 / Math.PI);
        const beta = Math.atan2(acc.y, acc.z) * (180 / Math.PI);
        this.rawAngles.gamma = gamma || 0;
        this.rawAngles.beta = beta || 0;
      },
      true
    );
  }

  // Đặt tư thế cầm điện thoại hiện tại làm gốc cân bằng (0, 0)
  calibrate() {
    this.offsetAngles.beta = this.rawAngles.beta;
    this.offsetAngles.gamma = this.rawAngles.gamma;
  }

  // Cho phép kéo trên radar để test khi mở trên trình duyệt máy tính
  setTouchVector(normX, normY) {
    this.isTouchOverriding = true;
    const mag = Math.hypot(normX, normY);
    if (mag > 1) {
      normX /= mag;
      normY /= mag;
    }
    this.smoothedVector.x = normX;
    this.smoothedVector.y = normY;
    this.rawAngles.gamma = normX * this.config.MAX_TILT_ANGLE;
    this.rawAngles.beta = normY * this.config.MAX_TILT_ANGLE;
  }

  releaseTouchVector() {
    this.isTouchOverriding = false;
  }

  // Tính toán Vector lực 2D (X, Y) chuẩn hóa trong khoảng [-1.0, 1.0]
  computeForceVector() {
    if (this.isTouchOverriding) {
      return {
        x: Number(this.smoothedVector.x.toFixed(4)),
        y: Number(this.smoothedVector.y.toFixed(4)),
        fx: Number(this.smoothedVector.x.toFixed(4)),
        fy: Number(this.smoothedVector.y.toFixed(4)),
        alpha: Number(this.rawAngles.alpha.toFixed(1)),
        beta: Number(this.rawAngles.beta.toFixed(1)),
        gamma: Number(this.rawAngles.gamma.toFixed(1))
      };
    }

    const maxAngle = this.config.MAX_TILT_ANGLE;
    const deadzone = this.config.DEADZONE_ANGLE;

    let dGamma = this.rawAngles.gamma - this.offsetAngles.gamma; // Trục X (Trái/Phải)
    let dBeta = this.rawAngles.beta - this.offsetAngles.beta;    // Trục Y (Lên/Xuống)

    // Áp dụng vùng chết (Deadzone) để hạt không tự trôi khi người chơi giữ thẳng tay
    if (Math.abs(dGamma) < deadzone) dGamma = 0;
    if (Math.abs(dBeta) < deadzone) dBeta = 0;

    // Chuẩn hóa về [-1, 1]
    let targetX = Math.max(-1, Math.min(1, dGamma / maxAngle));
    let targetY = Math.max(-1, Math.min(1, dBeta / maxAngle));

    // Giới hạn biên độ vector tròn (tránh đi chéo có độ lớn > 1)
    const length = Math.hypot(targetX, targetY);
    if (length > 1) {
      targetX /= length;
      targetY /= length;
    }

    // Bộ lọc thông thấp (Exponential Moving Average) giúp tín hiệu mượt mà
    this.smoothedVector.x += (targetX - this.smoothedVector.x) * this.smoothingFactor;
    this.smoothedVector.y += (targetY - this.smoothedVector.y) * this.smoothingFactor;

    return {
      x: Number(this.smoothedVector.x.toFixed(4)),
      y: Number(this.smoothedVector.y.toFixed(4)),
      fx: Number(this.smoothedVector.x.toFixed(4)), // Đồng bộ cả key fx, fy cho Phần 2
      fy: Number(this.smoothedVector.y.toFixed(4)),
      alpha: Number(this.rawAngles.alpha.toFixed(1)),
      beta: Number((this.rawAngles.beta - this.offsetAngles.beta).toFixed(1)),
      gamma: Number((this.rawAngles.gamma - this.offsetAngles.gamma).toFixed(1))
    };
  }
}

window.MagneticSensor = MagneticSensor;
