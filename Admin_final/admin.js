// admin.js - Quyền điều khiển admin cho Bẫy Ion (bản kín: người chơi không thấy)
//
// - Namespace /admin xác thực bằng token (ADMIN_TOKEN). Sai quá 5 lần bị khóa IP 60 giây.
// - Tùy chọn ADMIN_ALLOW_IPS="192.168.1.10,192.168.1.11": chỉ các IP này (và localhost) vào được trang admin.
// - Thông số admin chỉ gửi cho DISPLAY (đã đăng ký admin_subscribe), KHÔNG gửi cho điện thoại người chơi.
const crypto = require('crypto');
const path = require('path');

const TOKEN = process.env.ADMIN_TOKEN || 'ion-admin';
const ALLOW = (process.env.ADMIN_ALLOW_IPS || '').split(',').map((s) => s.trim()).filter(Boolean);
const SUB_ROOM = '__admin_sub';

const norm = (ip) => String(ip || '').replace(/^::ffff:/, '');
const isLoopback = (ip) => ['127.0.0.1', '::1'].includes(norm(ip));
const ipAllowed = (ip) => isLoopback(ip) || ALLOW.length === 0 || ALLOW.includes(norm(ip));
const tokenOk = (t) => {
  const a = Buffer.from(String(t || '')), b = Buffer.from(TOKEN);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
};

// Chống dò token
const fails = new Map();
const blocked = (ip) => { const f = fails.get(norm(ip)); return !!f && f.until > Date.now(); };
const recordFail = (ip) => {
  const k = norm(ip), f = fails.get(k) || { n: 0, until: 0 };
  if (++f.n >= 5) { f.until = Date.now() + 60000; f.n = 0; }
  fails.set(k, f);
};

// [min, max, mặc định]  - khóa TRÙNG với DECADE_CONFIGS của IonTrapPhysicsEngine
const SCHEMA = {
  friction:           [0, 1, 0.85],            // hệ số giữ vận tốc mỗi khung (1 = không ma sát)
  mass:               [0.05, 10, 1],
  massVariable:       [0, 1, 0],
  bohrLevelVariable:  [0, 1, 0],
  noiseAmp:           [0, 1000, 110],
  shockFreq:          [0, 0.5, 0],             // xác suất xung kích mỗi khung
  shockForceMin:      [0, 20000, 2200],
  shockForceMax:      [0, 20000, 3600],
  shockDuration:      [0.02, 1, 0.15],
  hasCenterBlackHole: [0, 1, 0],
  blackHoleRadius:    [0, 100, 24],
  blackHoleStrength:  [0, 10000000, 280000],
  coordRotationSpeed: [-0.2, 0.2, 0],
  playerGain:         [0, 6, 1],               // độ nhạy người chơi (áp dụng qua adminAssist)
  centerAssist:       [0, 1, 0],               // lực kéo hạt về tâm (hỗ trợ ngầm, 0 = tắt)
  directControl:      [0, 1, 0],               // điều khiển trực tiếp: tốc độ hạt bám theo góc nghiêng (0 = vật lý gốc)
  godMode:            [0, 1, 0],               // bật: hạt chạm viền/hố đen không bị thua
  emaAlpha:           [0.05, 1, 0.4],          // làm mượt cảm biến ở server
};
const BOOL_KEYS = ['massVariable', 'bohrLevelVariable', 'hasCenterBlackHole', 'godMode'];

// Bộ thông số dựng sẵn (chỉ là các giá trị đặt cùng lúc, người chơi không thấy tên)
const PRESETS = {
  easy: { friction: 0.8, mass: 1, massVariable: 0, bohrLevelVariable: 0, noiseAmp: 0, shockFreq: 0,
          hasCenterBlackHole: 0, coordRotationSpeed: 0, playerGain: 1.5, directControl: 0.6, centerAssist: 0 },
  hard: { friction: 0.97, massVariable: 1, bohrLevelVariable: 1, noiseAmp: 300, shockFreq: 0.04,
          shockForceMin: 2800, shockForceMax: 4500, hasCenterBlackHole: 1, blackHoleRadius: 30,
          blackHoleStrength: 1500000, coordRotationSpeed: 0.06, playerGain: 1, directControl: 0, centerAssist: 0 },
};

const defaults = () =>
  Object.fromEntries(Object.entries(SCHEMA).map(([k, v]) => [k, v[2]]));

module.exports = function setupAdmin({ app, io, ionTrap, getEma, setAlpha }) {
  const admin = io.of('/admin');

  if (TOKEN === 'ion-admin') {
    console.log('[admin] CẢNH BÁO: đang dùng token mặc định. Đặt biến môi trường ADMIN_TOKEN trước khi mang ra gian hàng.');
  }

  // Trang admin tự phục vụ; IP không được phép sẽ thấy 404 như trang không tồn tại
  if (app) {
    const page = (f, localOnly) => (req, res) => {
      if (!ipAllowed(req.ip) || (localOnly && !isLoopback(req.ip))) return res.status(404).send('Not found');
      res.sendFile(path.join(__dirname, 'admin', f));
    };
    app.get(['/admin', '/admin.html'], page('admin.html'));
    app.get('/admin-listener.html', page('admin-listener.html', true));
  }

  const state = {
    params: defaults(),
    touched: [],         // khóa admin đã chỉnh tay (ưu tiên hơn preset thập kỷ)
    decade: null,        // null = tự động theo timeline, 1..7 = ép cố định
    phase: 'waiting',
    stealth: true,       // true: ẩn mọi hiệu ứng báo hiệu việc admin can thiệp
  };

  const snapshot = () => ({ schema: SCHEMA, bools: BOOL_KEYS, presets: Object.keys(PRESETS), ...state });
  // Chỉ phần display cần, không kèm schema
  const publicState = () => ({
    params: state.params, touched: state.touched, decade: state.decade,
    phase: state.phase, stealth: state.stealth,
  });
  const pushState = () => {
    ionTrap.to(SUB_ROOM).emit('admin_state', publicState());   // chỉ display, không phải điện thoại
    admin.emit('state', snapshot());
  };
  const log = (msg) => {
    console.log(`[admin] ${msg}`);
    admin.emit('log', { t: Date.now(), msg });
  };

  const applyParams = (patch) => {
    const applied = {};
    for (const [k, v] of Object.entries(patch || {})) {
      const def = SCHEMA[k], n = Number(v);
      if (!def || !Number.isFinite(n)) continue;
      let val = Math.min(def[1], Math.max(def[0], n));
      if (BOOL_KEYS.includes(k)) val = val >= 0.5 ? 1 : 0;
      state.params[k] = val;
      applied[k] = val;
      if (!state.touched.includes(k)) state.touched.push(k);
    }
    if ('emaAlpha' in applied && setAlpha) setAlpha(applied.emaAlpha);
    return applied;
  };
  const clearAll = () => {
    state.params = defaults(); state.touched = [];
    if (setAlpha) setAlpha(state.params.emaAlpha);
  };

  // Display đăng ký nhận thông số: chỉ localhost, IP trong ADMIN_ALLOW_IPS, hoặc có token (?key=...)
  ionTrap.on('connection', (s) => {
    s.on('admin_subscribe', (key) => {
      const ip = s.handshake.address;
      if (blocked(ip)) return;
      if (isLoopback(ip) || ALLOW.includes(norm(ip)) || tokenOk(key)) {
        s.join(SUB_ROOM); s.data.sub = true;
        s.emit('admin_state', publicState());
      } else if (key) recordFail(ip);
    });
    // Chỉ display đã đăng ký mới được báo phase thật của game
    s.on('phase_report', (ph) => {
      if (!s.data.sub) return;
      if (['waiting', 'countdown', 'playing', 'paused', 'over'].includes(ph) && state.phase !== ph) {
        state.phase = ph;
        log(`display báo phase: ${ph}`);
        pushState();
      }
    });
  });

  admin.use((socket, next) => {
    const ip = socket.handshake.address;
    if (!ipAllowed(ip) || blocked(ip)) return next(new Error('unauthorized'));
    if (tokenOk(socket.handshake.auth?.token)) return next();
    recordFail(ip);
    next(new Error('unauthorized'));
  });

  admin.on('connection', (socket) => {
    log(`Admin kết nối: ${socket.id}`);
    socket.emit('state', snapshot());

    socket.on('set_params', (patch) => {
      if (!patch || typeof patch !== 'object') return;
      const applied = applyParams(patch);
      log(`set_params ${JSON.stringify(applied)}`);
      pushState();
    });

    // Trả riêng một thông số về "theo thập kỷ"
    socket.on('clear_param', (k) => {
      if (!SCHEMA[k]) return;
      state.touched = state.touched.filter((x) => x !== k);
      state.params[k] = SCHEMA[k][2];
      if (k === 'emaAlpha' && setAlpha) setAlpha(state.params.emaAlpha);
      log(`clear_param ${k}`);
      pushState();
    });

    socket.on('reset_params', () => { clearAll(); log('reset_params'); pushState(); });

    socket.on('preset', (name) => {
      if (!PRESETS[name]) return;
      applyParams(PRESETS[name]);
      log(`preset ${name}`);
      pushState();
    });

    socket.on('set_stealth', (on) => {
      state.stealth = !!on;
      log(`stealth ${state.stealth ? 'BẬT (ẩn hiệu ứng)' : 'TẮT (hiện hiệu ứng)'}`);
      pushState();
    });

    socket.on('set_decade', (n) => {
      const d = Number(n);
      state.decade = d >= 1 && d <= 7 ? Math.floor(d) : null;
      log(`set_decade ${state.decade ?? 'auto'}`);
      pushState();
    });

    // start | pause | resume | reset | end (thua) | win (thắng)
    socket.on('game_cmd', (cmd) => {
      const map = { start: 'countdown', pause: 'paused', resume: 'playing', reset: 'waiting', end: 'over', win: 'over' };
      if (!map[cmd]) return;
      state.phase = map[cmd];
      log(`game_cmd ${cmd}`);
      ionTrap.emit('game_cmd', { cmd });
      pushState();
    });

    // Xung lực tay: chỉ gửi cho display
    socket.on('impulse', ({ angle = 0, magnitude = 5 } = {}) => {
      const payload = { angle: Number(angle) || 0, magnitude: Math.min(10, Math.abs(Number(magnitude) || 0)) };
      ionTrap.to(SUB_ROOM).emit('admin_impulse', payload);
      log(`impulse ${JSON.stringify(payload)}`);
    });

    socket.on('haptic', ({ roomId, pattern = [200] } = {}) => {
      const p = Array.isArray(pattern) ? pattern.slice(0, 10).map(Number) : [200];
      (roomId ? ionTrap.to(roomId) : ionTrap).emit('haptic', { pattern: p });
      log(`haptic ${JSON.stringify(p)}`);
    });

    socket.on('announce', (text) => {
      const t = String(text || '').slice(0, 120);
      ionTrap.emit('announce', { text: t });
      log(`announce "${t}"`);
    });

    socket.on('kick', (id) => {
      const target = ionTrap.sockets.get(id);
      if (target) { target.disconnect(true); log(`kick ${id}`); }
    });

    socket.on('disconnect', () => log(`Admin ngắt: ${socket.id}`));
  });

  // Giám sát: danh sách client + giá trị cảm biến mỗi giây (chỉ gửi cho admin)
  setInterval(() => {
    if (admin.sockets.size === 0) return;
    const ema = getEma ? getEma() : {};
    const clients = [...ionTrap.sockets.values()].map((s) => ({
      id: s.id,
      rooms: [...s.rooms].filter((r) => r !== s.id && r !== SUB_ROOM),
      display: !!s.data.sub,
      beta: ema[s.id]?.beta ?? null,
      gamma: ema[s.id]?.gamma ?? null,
    }));
    admin.emit('monitor', { clients });
  }, 1000);

  return { state };
};
