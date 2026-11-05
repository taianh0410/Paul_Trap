
const canvas = document.getElementById("particleCanvas");
const ctx = canvas.getContext("2d");

let width;
let height;

// ================================
// 1. KHAI BÁO ELECTRON
// ================================

let electron = {
    x: 0,
    y: 0,
    angle: 0,
    radius: 90,
    speed: 0.025
};

// Cho phép file khác truy cập electron
window.electron = electron;

// Danh sách các hạt sáng
let particles = [];

// ================================
// 2. LẤY MÀU ELECTRON
// ================================

function getElectronColor() {

    return getComputedStyle(document.documentElement)
        .getPropertyValue("--electron-color")
        .trim() || "#00eaff";
}

// ================================
// 3. ĐIỀU CHỈNH KÍCH THƯỚC CANVAS
// ================================

function resizeCanvas() {

    const rect = canvas.getBoundingClientRect();

    const dpr = window.devicePixelRatio || 1;

    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    width = rect.width;
    height = rect.height;
}

window.addEventListener("resize", resizeCanvas);

resizeCanvas();

// ================================
// 4. TẠO HẠT SÁNG
// ================================

function createParticle(x, y) {

    particles.push({

        x: x,
        y: y,

        size: Math.random() * 3 + 1,

        alpha: 1,

        vx: (Math.random() - 0.5) * 2,
        vy: (Math.random() - 0.5) * 2,

        color: getElectronColor()
    });
}

// ================================
// 5. VẼ ELECTRON
// ================================

function drawElectron() {

    // Tính tọa độ electron theo quỹ đạo tròn
    electron.x = width / 2 +
        Math.cos(electron.angle) * electron.radius;

    electron.y = height / 2 +
        Math.sin(electron.angle) * electron.radius;

    // Tạo hạt sáng phía sau electron
    createParticle(electron.x, electron.y);

    // Lấy màu electron theo thập kỷ
    const electronColor = getElectronColor();

    // Vẽ quỹ đạo electron
    ctx.beginPath();

    ctx.arc(
        width / 2,
        height / 2,
        electron.radius,
        0,
        Math.PI * 2
    );

    ctx.strokeStyle = electronColor;
    ctx.globalAlpha = 0.25;
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.globalAlpha = 1;

    // Tạo hiệu ứng phát sáng bằng Gradient
    const glow = ctx.createRadialGradient(
        electron.x,
        electron.y,
        1,
        electron.x,
        electron.y,
        25
    );

    glow.addColorStop(0, "#ffffff");
    glow.addColorStop(0.3, electronColor);
    glow.addColorStop(1, "transparent");

    // Vẽ electron
    ctx.beginPath();

    ctx.arc(
        electron.x,
        electron.y,
        25,
        0,
        Math.PI * 2
    );

    ctx.fillStyle = glow;

    ctx.shadowBlur = 30;
    ctx.shadowColor = electronColor;

    ctx.fill();

    ctx.shadowBlur = 0;
}

// ================================
// 6. VẼ CÁC HẠT SÁNG
// ================================

function drawParticles() {

    for (let i = particles.length - 1; i >= 0; i--) {

        let p = particles[i];

        // Cập nhật vị trí hạt
        p.x += p.vx;
        p.y += p.vy;

        // Làm hạt mờ dần
        p.alpha -= 0.015;

        // Vẽ hạt sáng
        ctx.beginPath();

        ctx.arc(
            p.x,
            p.y,
            p.size,
            0,
            Math.PI * 2
        );

        ctx.globalAlpha = Math.max(0, p.alpha);

        ctx.fillStyle = p.color;

        ctx.shadowBlur = 10;
        ctx.shadowColor = p.color;

        ctx.fill();

        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;

        // Xóa hạt khi đã biến mất
        if (p.alpha <= 0) {

            particles.splice(i, 1);
        }
    }
}

// ================================
// 7. VÒNG LẶP ANIMATION
// ================================

function animate() {

    // Xóa nội dung Canvas của frame trước
    ctx.clearRect(0, 0, width, height);

    // Vẽ các hạt sáng
    drawParticles();

    // Vẽ electron
    drawElectron();

    // Cập nhật góc chuyển động
    electron.angle += electron.speed;

    // Tiếp tục animation
    requestAnimationFrame(animate);
}

// ================================
// 8. KHỞI CHẠY
// ================================

animate();
