const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');

const app = express();
app.use(express.static(path.join(__dirname, 'public')));
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*', methods: ['GET', 'POST'] } });
const ionTrap = io.of('/ion-trap');
const EMA_ALPHA = 0.4;
const rooms = new Map();
const normalizeRoomId = value => String(value ?? '').trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '').slice(0, 32);
const roomState = id => { if (!rooms.has(id)) rooms.set(id, { phones: new Set() }); return rooms.get(id); };

ionTrap.on('connection', socket => {
  let roomId = '', role = 'display';
  socket.on('join_room', payload => {
    const requestedId = normalizeRoomId(typeof payload === 'object' ? payload.roomId : payload);
    if (!requestedId) { socket.emit('room_error', { message: 'Invalid roomId' }); return; }
    if (roomId) { socket.leave(roomId); if (role === 'phone') roomState(roomId).phones.delete(socket.id); }
    roomId = requestedId;
    role = typeof payload === 'object' && ['phone', 'mobile_controller', 'controller'].includes(payload.role) ? 'phone' : 'display';
    socket.join(roomId);
    const room = roomState(roomId);
    if (role === 'phone') room.phones.add(socket.id);
    const phoneReady = room.phones.size > 0;
    socket.emit('room_joined', { roomId, phoneReady, role });
    ionTrap.to(roomId).emit('phone_status', { roomId, ready: phoneReady, phoneCount: room.phones.size });
    console.log(`[ion-trap] ${socket.id} joined ${roomId} as ${role}`);
  });
  socket.on('phone_ready', payload => {
    if (!roomId) return;
    role = 'phone';
    const ready = payload?.ready !== false;
    const phones = roomState(roomId).phones;
    if (ready) phones.add(socket.id); else phones.delete(socket.id);
    ionTrap.to(roomId).emit('phone_status', { roomId, ready: phones.size > 0, phoneCount: phones.size });
  });
  socket.on('player_ready', payload => {
    if (!roomId || (payload?.roomId && normalizeRoomId(payload.roomId) !== roomId)) return;
    role = 'phone';
    const phones = roomState(roomId).phones; phones.add(socket.id);
    ionTrap.to(roomId).emit('phone_status', { roomId, ready: true, phoneCount: phones.size });
  });
  const handleSensorData = data => {
    if (!roomId || (data?.roomId && normalizeRoomId(data.roomId) !== roomId)) return;
    const beta = Number(data?.beta), gamma = Number(data?.gamma);
    if (!Number.isFinite(beta) || !Number.isFinite(gamma)) return;
    if (role !== 'phone') {
      role = 'phone';
      roomState(roomId).phones.add(socket.id);
      ionTrap.to(roomId).emit('phone_status', { roomId, ready: true, phoneCount: roomState(roomId).phones.size });
    }
    socket.data.ema ||= {};
    socket.data.ema.beta = socket.data.ema.beta === undefined ? beta : EMA_ALPHA * beta + (1 - EMA_ALPHA) * socket.data.ema.beta;
    socket.data.ema.gamma = socket.data.ema.gamma === undefined ? gamma : EMA_ALPHA * gamma + (1 - EMA_ALPHA) * socket.data.ema.gamma;
    ionTrap.to(roomId).emit('sync_data', { roomId, beta: socket.data.ema.beta, gamma: socket.data.ema.gamma, timestamp: Date.now() });
  };
  socket.on('sensor_data', handleSensorData);
  socket.on('tilt_input', handleSensorData);
  socket.on('disconnect', () => {
    if (roomId && role === 'phone') {
      const phones = roomState(roomId).phones; phones.delete(socket.id);
      ionTrap.to(roomId).emit('phone_status', { roomId, ready: phones.size > 0, phoneCount: phones.size });
    }
  });
});
app.get('/health', (_req, res) => res.json({ status: 'ok' }));
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server listening on http://localhost:${PORT}`));
