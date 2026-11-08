const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
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
function calcEMA(prevEma, newValue) {
  if (prevEma === undefined) return newValue;
  return EMA_ALPHA * newValue + (1 - EMA_ALPHA) * prevEma;
}

ionTrap.on('connection', (socket) => {
  console.log(`[ion-trap] Client kết nối: ${socket.id}`);
  socket.on('join_room', (roomId) => {
    socket.join(roomId);
    console.log(`[ion-trap] Socket ${socket.id} đã join room: ${roomId}`);
    socket.emit('room_joined', { roomId });
  });
  socket.on('sensor_data', ({ roomId, beta, gamma }) => {
    const prev = emaState[socket.id];
    const smoothedBeta  = calcEMA(prev?.beta,  beta);
    const smoothedGamma = calcEMA(prev?.gamma, gamma);
    emaState[socket.id] = { beta: smoothedBeta, gamma: smoothedGamma };
    socket.to(roomId).emit('sync_data', {
      beta:  smoothedBeta,
      gamma: smoothedGamma,
    });
  });
   socket.on('disconnect', () => {
    delete emaState[socket.id];
    console.log(`[ion-trap] Client ngắt kết nối: ${socket.id}, đã xóa EMA state.`);
  });
});
app.get('/health', (_req, res) => res.json({ status: 'ok' }));

const PORT = 3000;
server.listen(PORT, () => {
  console.log(`Server đang chạy tại http://localhost:${PORT}`);
});
