require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
const jwt = require('jsonwebtoken');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const config = require('./config/config');
const ensureSeedData = require('./scripts/seedInitialData');

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  console.error('JWT_SECRET must be set to a random string of at least 32 characters.');
  process.exit(1);
}

const isProd = process.env.NODE_ENV === 'production';
// Comma-separated list of allowed origins; empty means same-origin only in production
const allowedOrigins = (process.env.CORS_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
const corsOptions = { origin: isProd ? (allowedOrigins.length ? allowedOrigins : false) : true };

const app = express();
app.set('trust proxy', 1);
const server = http.createServer(app);
const io = socketIo(server, {
  cors: { origin: corsOptions.origin, methods: ["GET", "POST"] }
});

// Make io accessible to routes
app.set('io', io);

// Middleware
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors(corsOptions));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(mongoSanitize());
app.use('/api', rateLimit({ windowMs: 15 * 60 * 1000, max: 600, standardHeaders: true, legacyHeaders: false }));
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, standardHeaders: true, legacyHeaders: false, message: { message: 'Too many attempts. Try again in 15 minutes.' } });
app.use(['/api/auth/login', '/api/auth/register', '/api/password-reset', '/api/admin/login'], authLimiter);
app.get('/health', (req, res) => {
  const databaseConnected = mongoose.connection.readyState === 1;
  res.status(databaseConnected ? 200 : 503).json({
    status: databaseConnected ? 'ok' : 'unavailable',
    database: databaseConnected ? 'connected' : 'disconnected'
  });
});
app.use('/uploads/products', express.static(config.UPLOAD_DIR, {
  maxAge: '7d',
  immutable: true
}));
app.get(['/admin', '/admin/'], (req, res) => {
  res.sendFile(__dirname + '/public/admin.html');
});
app.use(express.static('public'));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/posts', require('./routes/posts'));
app.use('/api/weather', require('./routes/weather'));
app.use('/api/consultations', require('./routes/consultations'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/messages', require('./routes/messages'));
app.use('/api/products', require('./routes/products'));
app.use('/api/opportunities', require('./routes/opportunities'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/password-reset', require('./routes/passwordReset'));
app.use('/api/cart', require('./routes/cart'));
app.use('/api/wishlist', require('./routes/wishlist'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/reviews', require('./routes/reviews'));
app.use('/api/follows', require('./routes/follows'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/farm-finances', require('./routes/farmFinances'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/delivery', require('./routes/delivery'));
app.use('/api/weatherAlerts', require('./routes/weatherAlerts'));
app.use('/api/translations', require('./routes/translations'));
app.use('/api/feedback', require('./routes/feedback'));

// Socket.IO for real-time features
const Message = require('./models/Message');
const User = require('./models/User');

const connectedUsers = new Map();

// Authenticate sockets with the user's JWT so identities can't be spoofed
io.use((socket, next) => {
  try {
    const decoded = jwt.verify(socket.handshake.auth && socket.handshake.auth.token, process.env.JWT_SECRET);
    socket.userId = String(decoded.userId);
    next();
  } catch (err) {
    next(new Error('Authentication required'));
  }
});

io.on('connection', (socket) => {
  const userId = socket.userId;
  connectedUsers.set(userId, socket.id);
  io.emit('user-status', { userId, online: true });

  // Kept for client compatibility; identity comes from the verified token
  socket.on('user-connected', () => {});

  // Send message
  socket.on('send-message', async (data) => {
    try {
      const to = data && data.to;
      const message = data && data.message;
      const from = socket.userId;
      const trimmedMessage = typeof message === 'string' ? message.trim() : '';
      if (!mongoose.isValidObjectId(to) || String(to) === from || !trimmedMessage || trimmedMessage.length > 2000) {
        socket.emit('message-error', { message: 'Choose a valid recipient and enter a message of 1 to 2000 characters.' });
        return;
      }
      if (!await User.exists({ _id: to })) {
        socket.emit('message-error', { message: 'Recipient not found.' });
        return;
      }

      const newMessage = new Message({
        sender: from,
        recipient: to,
        text: trimmedMessage
      });
      await newMessage.save();
      await newMessage.populate('sender recipient', 'name role profileImage');

      // Send to recipient if online
      const recipientSocketId = connectedUsers.get(to);
      if (recipientSocketId) {
        io.to(recipientSocketId).emit('receive-message', newMessage);
      }

      // Send confirmation to sender
      socket.emit('message-sent', newMessage);
    } catch (error) {
      socket.emit('message-error', { message: 'Failed to send message' });
    }
  });

  // Typing indicator
  socket.on('typing', (data) => {
    const recipientSocketId = data && mongoose.isValidObjectId(data.to) && connectedUsers.get(String(data.to));
    if (recipientSocketId) {
      io.to(recipientSocketId).emit('user-typing', { from: socket.userId });
    }
  });

  // Stop typing
  socket.on('stop-typing', (data) => {
    const recipientSocketId = data && mongoose.isValidObjectId(data.to) && connectedUsers.get(String(data.to));
    if (recipientSocketId) {
      io.to(recipientSocketId).emit('user-stop-typing', { from: socket.userId });
    }
  });

  // Disconnect
  socket.on('disconnect', () => {
    if (connectedUsers.get(socket.userId) === socket.id) {
      connectedUsers.delete(socket.userId);
      io.emit('user-status', { userId: socket.userId, online: false });
    }
  });
});

// Home route
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

const PORT = Number(process.env.PORT || 3000);

async function startServer() {
  if (!config.MONGODB_URI) {
    throw new Error('MONGODB_URI must be configured before starting the server.');
  }

  await mongoose.connect(config.MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
  console.log('MongoDB connected successfully');

  if (process.env.NODE_ENV !== 'production' || process.env.SEED_DEMO_DATA === 'true') {
    await ensureSeedData();
    console.log('Initial app data checked and seeded if needed');
  } else {
    console.log('Production demo seeding is disabled');
  }

  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(PORT, '0.0.0.0', () => {
      server.removeListener('error', reject);
      resolve();
    });
  });
  console.log(`Server is listening on port ${PORT}`);
}

startServer().catch(error => {
  console.error('Server startup failed:', error.message);
  process.exit(1);
});

async function shutdown(signal) {
  console.log(`${signal} received; shutting down gracefully`);
  server.close(async error => {
    if (error) {
      console.error('HTTP server shutdown failed:', error.message);
      process.exitCode = 1;
    }
    try {
      await mongoose.disconnect();
      process.exit(process.exitCode || 0);
    } catch (disconnectError) {
      console.error('MongoDB shutdown failed:', disconnectError.message);
      process.exit(1);
    }
  });
}

process.once('SIGTERM', () => shutdown('SIGTERM'));
process.once('SIGINT', () => shutdown('SIGINT'));
