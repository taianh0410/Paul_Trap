const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');

const app = express();

// Cho phép Express phục vụ các file HTML, CSS, JS trong thư mục public
app.use(express.static(path.join(__dirname, 'public')));

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

const ionTrap = io.of('/ion-trap');

const emaState = {};
const EMA_ALPHA = 0.4;

// Tính Exponential Moving Average
function calcEMA(prevEma, newValue) {
  if (prevEma === undefined) return newValue;

  return EMA_ALPHA * newValue + (1 - EMA_ALPHA) * prevEma;
}

// Xử lý kết nối trong namespace /ion-trap
ionTrap.on('connection', (socket) => {
  console.log(`[ion-trap] Client kết nối: ${socket.id}`);

  // Client tham gia room
  socket.on('join_room', (roomId) => {
    socket.join(roomId);

    console.log(
      `[ion-trap] Socket ${socket.id} đã join room: ${roomId}`
    );

    socket.emit('room_joined', { roomId });
  });

  // Nhận dữ liệu cảm biến và lọc bằng EMA
  socket.on('sensor_data', ({ roomId, beta, gamma }) => {
    const prev = emaState[socket.id];

    const smoothedBeta = calcEMA(prev?.beta, beta);
    const smoothedGamma = calcEMA(prev?.gamma, gamma);

    emaState[socket.id] = {
      beta: smoothedBeta,
      gamma: smoothedGamma,
    };

    // Gửi dữ liệu đã lọc đến các client khác trong cùng room
    socket.to(roomId).emit('sync_data', {
      beta: smoothedBeta,
      gamma: smoothedGamma,
    });
  });

  // Xử lý khi client ngắt kết nối
  socket.on('disconnect', () => {
    delete emaState[socket.id];

    console.log(
      `[ion-trap] Client ngắt kết nối: ${socket.id}, đã xóa EMA state.`
    );
  });
});

// Kiểm tra trạng thái server
app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// Khởi động server
const PORT = 3000;

server.listen(PORT, () => {
  console.log(`Server đang chạy tại http://localhost:${PORT}`);
});