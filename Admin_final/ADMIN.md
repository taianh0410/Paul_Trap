# Quyền điều khiển Admin - Bẫy Ion

Lớp điều khiển để admin can thiệp vào ván chơi và các thông số vật lý khi đang chạy, không cần sửa code engine.
Người chơi không nhìn thấy các thông số này (xem mục Bảo mật).

## Chạy
```
npm install
ADMIN_TOKEN=matkhau node server.js        # Windows PowerShell: $env:ADMIN_TOKEN="matkhau"; node server.js
```
Mở `http://<IP-laptop>:3000/admin.html` và nhập token. Không đặt `ADMIN_TOKEN` thì dùng token mặc định `ion-admin` (server sẽ cảnh báo).
Docker: thêm `- ADMIN_TOKEN=${ADMIN_TOKEN:-ion-admin}` vào `environment` trong `docker-compose.yml`.

## File
| File | Việc |
|---|---|
| `admin.js` | Namespace `/admin` (token), giữ trạng thái thông số, phát lệnh sang `/ion-trap` |
| `admin/admin.html` | Giao diện điều khiển (trang tự phục vụ tại `/admin.html`) |
| `admin/admin-listener.html` | Công cụ dev, chỉ mở được từ localhost: in ra mọi lệnh admin gửi |
| `public/js/admin-bridge.js` | Cầu nối phía display/game: nhận lệnh, cung cấp hàm cho engine |

`server.js` chỉ thêm 2 chỗ: `let EMA_ALPHA` và `require('./admin')({ app, io, ionTrap, getEma, setAlpha })`.

## Tích hợp vào game (nhóm UI/Engine)
1. `public/index.html`, cuối file, sau các script khác (engine trước, bridge sau):
```html
<script src="js/IonTrapPhysicsEngine.js"></script>
<script src="js/admin-bridge.js"></script>
```
2. Vòng lặp game:
```js
window.ionEngine = engine;                                   // một lần sau khi tạo engine
const cfg = adminStageConfig(engine, elapsedSec);            // thay cho engine.getCurrentStageConfig(...)
if (!window.adminPaused) {
  engine.update(dt, cfg, elapsedSec, callbacks);
  adminAssist(engine, dt);                                   // độ nhạy, điều khiển trực tiếp, hỗ trợ về tâm
}
```
3. Trong `callbacks.onGameOver` và `onDisqualify`: nếu `adminGodMode()` là true thì không kết thúc ván (đẩy hạt ra khỏi viền/hố đen rồi chơi tiếp).
4. Display chạy trên máy khác máy server: mở trang với `?key=<ADMIN_TOKEN>` để được nhận thông số.

Lệnh `start / reset / end / win` gọi lại `startGame()`, `restartGame()`, `gameOver()`, `victory()` trong `main.js`.
`adminStageConfig` lấy config của thập kỷ hiện tại (hoặc thập kỷ admin ép), rồi ghi đè các thông số admin đã chỉnh tay.

## Thông số
Tên khóa trùng với `DECADE_CONFIGS` trong engine: `friction, mass, massVariable, bohrLevelVariable, noiseAmp, shockFreq, shockForceMin, shockForceMax, shockDuration, hasCenterBlackHole, blackHoleRadius, blackHoleStrength, coordRotationSpeed`.
Thêm: `playerGain` (nhân lực người chơi), `directControl` (vận tốc bám góc nghiêng), `centerAssist` (kéo về tâm), `godMode` (không thua), `emaAlpha` (làm mượt cảm biến, áp dụng ở server).
Thông số admin chưa chỉnh thì game dùng giá trị của thập kỷ; admin đã chỉnh thì giá trị admin thắng. Nút ↺ trả từng thông số về thập kỷ.

## Sự kiện Socket.IO (namespace `/ion-trap`)
| Sự kiện | Dữ liệu | Gửi cho |
|---|---|---|
| `admin_subscribe` | key (tùy chọn) | display gửi lên để đăng ký nhận thông số |
| `admin_state` | `{params, touched, decade, phase, stealth}` | chỉ display đã đăng ký |
| `admin_impulse` | `{angle, magnitude}` | chỉ display đã đăng ký |
| `game_cmd` | `{cmd}`: start, pause, resume, reset, end, win | tất cả |
| `announce` | `{text}` | tất cả |
| `haptic` | `{pattern}` | điện thoại |
| `phase_report` | phase thật của game | display gửi lên (admin hiển thị đúng trạng thái) |

## Bảo mật
- Thông số admin **không** gửi cho điện thoại người chơi; chỉ display đã đăng ký (localhost, IP trong `ADMIN_ALLOW_IPS`, hoặc có `?key=`).
- Sai token 5 lần thì khóa IP 60 giây. `ADMIN_ALLOW_IPS="ip1,ip2"` giới hạn máy được vào trang admin (IP khác thấy 404).
- Chế độ ẩn (mặc định bật): xung lực admin không có hiệu ứng báo hiệu. Muốn xem số liệu trên màn game để debug: mở `/?debug=1` (cần bản `test-glue.js` của nhóm).

## Kiểm thử đã làm
Giả lập server kiểm tra: xác thực token và khóa IP, thông số chỉ đến display, giới hạn giá trị, preset, đồng bộ phase. Phần game thật cần thử khi UI và engine đã được nối với nhau.
