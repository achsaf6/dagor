const { createServer } = require('http');
const { Server } = require('socket.io');
const next = require('next');

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = parseInt(process.env.PORT || '3000', 10);

const app = next({ dev, hostname, port });
const handler = app.getRequestHandler();

// Store connected users
const users = new Map();

// Generate random color
function getRandomColor() {
  const colors = [
    '#ef4444', // red
    '#3b82f6', // blue
    '#10b981', // green
    '#f59e0b', // amber
    '#8b5cf6', // purple
    '#ec4899', // pink
    '#06b6d4', // cyan
    '#84cc16', // lime
    '#f97316', // orange
    '#6366f1', // indigo
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}

app.prepare().then(() => {
  const httpServer = createServer(handler);
  const io = new Server(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', (socket) => {
    // Generate unique user ID and color
    const userId = socket.id;
    const color = getRandomColor();
    const initialPosition = { x: 50, y: 50 };

    users.set(userId, {
      id: userId,
      color,
      position: initialPosition,
    });

    // Send current user their info and all existing users
    socket.emit('user-connected', {
      userId,
      color,
      position: initialPosition,
    });

    socket.emit('all-users', Array.from(users.values()));

    // Broadcast new user to all other clients
    socket.broadcast.emit('user-joined', {
      userId,
      color,
      position: initialPosition,
    });

    // Handle position updates
    socket.on('position-update', (position) => {
      const user = users.get(userId);
      if (user) {
        user.position = position;
        // Broadcast to all other clients
        socket.broadcast.emit('user-moved', {
          userId,
          position,
        });
      }
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      users.delete(userId);
      socket.broadcast.emit('user-left', { userId });
    });
  });

  httpServer
    .once('error', (err) => {
      console.error(err);
      process.exit(1);
    })
    .listen(port, () => {
      console.log(`> Ready on http://${hostname}:${port}`);
    });
});

