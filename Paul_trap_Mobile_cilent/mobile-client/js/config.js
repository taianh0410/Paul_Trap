/**
 * FILE CẤU HÌNH ĐỒNG BỘ SỰ KIỆN SOCKET.IO (PHẦN 4 <-> PHẦN 1, 2, 3)
 * Nếu code Phần 2 & 3 của nhóm bạn dùng tên event khác, chỉ cần sửa tại đây.
 */
window.PAUL_TRAP_CONFIG = {
  // Cấu hình kết nối Server & Namespace (Đồng bộ Nhóm 1 - Nhiệm vụ 1)
  SOCKET_URL: window.location.origin,
  NAMESPACE: "/mobile",          // Đổi thành "" nếu server dùng default namespace "/"
  FALLBACK_DEFAULT_NS: true,     // Tự động thử kết nối "/" nếu "/mobile" không phản hồi

  // Tần số gửi dữ liệu cảm biến (Nhóm 4 - Nhiệm vụ 2)
  SEND_RATE_HZ: 60,              // 60 lần/giây (~16.67ms/lần)
  MAX_TILT_ANGLE: 35,            // Góc nghiêng tối đa (độ) để đạt 100% lực từ trường
  DEADZONE_ANGLE: 1.5,           // Vùng chết (độ) tránh nhiễu khi cầm tay

  // Tên các sự kiện Socket.io (Dễ dàng map với Phần 1, 2, 3)
  EVENTS: {
    // Emit từ Mobile -> Server
    JOIN_ROOM: "join_room",            // Kèm { roomId, role: "controller" }
    PLAYER_READY: "player_ready",      // Khi bấm nút SẴN SÀNG
    TILT_VECTOR: "tilt_input",         // Gửi vector 2D 60Hz: { x, y, fx, fy, alpha, beta, gamma, timestamp }
    TILT_VECTOR_ALT: "control_vector", // Sự kiện phụ (nếu nhóm Backend/Physics đặt tên khác)

    // Listen từ Server / Màn hình chính (Phần 2 & 3) -> Mobile
    GAME_STATE: ["game_state", "state_update", "status"],
    COUNTDOWN: ["countdown", "game_countdown"],
    COLLISION: ["wall_collision", "boundary_hit", "collision", "electron_hit"],
    DECADE_PASS: ["decade_change", "level_up", "next_decade", "stage_clear"],
    GAME_OVER: ["game_over", "player_lose", "trap_failed"],
    VICTORY: ["game_win", "victory", "trap_success"]
  },

  // Cấu hình mẫu rung Haptic Feedback (ms) (Nhóm 4 - Nhiệm vụ 3)
  HAPTICS: {
    READY_CLICK: [40],
    WALL_HIT_LIGHT: [60],
    WALL_HIT_HEAVY: [120, 40, 80],
    DECADE_UP: [50, 60, 120],
    GAME_OVER: [250, 80, 250, 80, 400],
    VICTORY: [80, 50, 80, 50, 150, 50, 300]
  }
};
