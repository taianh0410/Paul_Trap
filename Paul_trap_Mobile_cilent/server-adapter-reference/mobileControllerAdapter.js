/**
 * MODULE TÍCH HỢP PHẦN 4 VÀO SERVER NODE.JS (PHẦN 1) & ENGINE VẬT LÝ (PHẦN 2, 3)
 * Chỉ cần require file này hoặc copy các listener vào server.js của Nhóm 1.
 */
module.exports = function attachMobileControllerHandlers(io) {
  // Hỗ trợ cả Namespace "/mobile" và Default Namespace "/"
  const namespaces = [io.of("/mobile"), io.of("/")];

  namespaces.forEach((nsp) => {
    nsp.on("connection", (socket) => {
      let currentRoom = "screen-1";

      // 1. Điện thoại tham gia vào Room tương ứng với màn hình Laptop (Nhóm 1 - Nhiệm vụ 1)
      socket.on("join_room", (data) => {
        const room = (data && (data.roomId || data.room)) || "screen-1";
        socket.leave(currentRoom);
        currentRoom = room;
        socket.join(currentRoom);
        console.log(`[Mobile ${socket.id}] đã kết nối vào màn hình: ${currentRoom}`);
      });

      // 2. Khi người chơi bấm nút "SẴN SÀNG" to trên điện thoại (Nhóm 4 - Nhiệm vụ 1 -> Nhóm 3 - Nhiệm vụ 3)
      socket.on("player_ready", (data) => {
        const room = (data && (data.roomId || data.room)) || currentRoom;
        // Chuyển tiếp tín hiệu bắt đầu đếm ngược 3-2-1 tới màn hình chính trong cùng Room
        io.of("/").to(room).emit("player_ready", data);
        nsp.to(room).emit("player_ready", data);
      });

      // 3. Nhận luồng Vector lực 2D 60Hz từ điện thoại (Nhóm 4 - Nhiệm vụ 2 -> Nhóm 1 & 2)
      socket.on("tilt_input", (payload) => {
        const room = (payload && (payload.roomId || payload.room)) || currentRoom;
        // Chuyển vector { x, y, fx, fy, alpha, beta, gamma } sang bộ nội suy / màn hình chính
        io.of("/").to(room).emit("tilt_input", payload);
      });

      // 4. Chuyển tiếp sự kiện Rung Haptic từ Màn hình chính (Phần 2 & 3) về Điện thoại (Nhóm 4 - Nhiệm vụ 3)
      ["wall_collision", "decade_change", "game_over", "game_win", "countdown"].forEach((evt) => {
        socket.on(evt, (data) => {
          const room = (data && (data.roomId || data.room)) || currentRoom;
          nsp.to(room).emit(evt, data);
          io.of("/").to(room).emit(evt, data);
        });
      });
    });
  });
};
