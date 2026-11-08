# PHẦN 4: CLIENT MOBILE - ĐIỆN THOẠI NGƯỜI CHƠI (PAUL TRAP)

Bộ mã nguồn này thực hiện đầy đủ 3 nhiệm vụ của **Nhóm 4 (Client Mobile)** và được thiết kế sẵn cơ chế đồng bộ Socket.io với **Nhóm 1 (Backend)**, **Nhóm 2 (Engine Vật lý)** và **Nhóm 3 (UI/UX Màn hình chính)**.

## Cấu trúc thư mục
- `mobile-client/index.html`: Giao diện bảng điều khiển từ trường phong cách Cyberpunk/Sci-Fi, chọn Trạm/Màn hình (Room) và nút **"SẴN SÀNG"** lớn ở trung tâm.
- `mobile-client/css/style.css`: Giao diện phát sáng Neon đồng bộ với màn hình chính, kèm hiệu ứng chớp viền cảnh báo khi va chạm hoặc qua thập kỷ.
- `mobile-client/js/config.js`: Nơi khai báo tên các sự kiện Socket.io, tần số `60Hz`, góc nghiêng tối đa và mẫu rung Haptic (chỉ cần chỉnh file này nếu Nhóm 1, 2, 3 đặt tên biến/event khác).
- `mobile-client/js/sensor.js`: Đọc `DeviceOrientationEvent` (`alpha`, `beta`, `gamma`) + fallback `DeviceMotionEvent` + hỗ trợ xin quyền cảm biến trên iOS 13+, chuyển đổi góc nghiêng thành Vector lực 2D chuẩn hóa `(x, y)` / `(fx, fy)`.
- `mobile-client/js/haptics.js`: Kích hoạt rung điện thoại (`navigator.vibrate`) kết hợp xung âm thanh trầm Web Audio API và chớp viền khi hạt electron đập vào viền bẫy hoặc khi qua bàn.
- `mobile-client/js/main.js`: Vòng lặp gửi dữ liệu `socket.emit` chuẩn **60 lần/giây (60Hz)**, quản lý Room (`?room=screen-1`) và vẽ vector lực thời gian thực trên Radar.
- `server-adapter-reference/mobileControllerAdapter.js`: Module mẫu để gắn vào Server Node.js của Nhóm 1.

## Cách tích hợp nhanh
1. Copy thư mục `mobile-client` vào thư mục `public/mobile` (hoặc thư mục static của Node.js server Nhóm 1).
2. Mở trên điện thoại theo địa chỉ `http://<IP-Laptop>:<Port>/mobile?room=screen-1`.
3. Nếu tên event Socket.io trong code Phần 2 & 3 của nhóm bạn khác mặc định, mở `mobile-client/js/config.js` để đổi tên event tương ứng trong 5 giây.
