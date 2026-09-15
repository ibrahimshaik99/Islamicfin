import { createServer } from 'http';
import { Server } from 'socket.io';
import { neon } from '@neondatabase/serverless';

const DATABASE_URL = process.env.DATABASE_URL || '';
const PORT = parseInt(process.env.PORT || '8789', 10);

const httpServer = createServer();
const io = new Server(httpServer, {
  cors: {
    origin: ['http://localhost:5173', 'http://localhost:3000'],
    credentials: true,
  },
});

const sql = neon(DATABASE_URL);

// Track online users: userId -> Set of socket ids
const onlineUsers = new Map<string, Set<string>>();

io.on('connection', (socket) => {
  console.log(`[Socket.IO] Connected: ${socket.id}`);

  // User identifies themselves
  socket.on('identify', (userId: string) => {
    socket.data.userId = userId;
    if (!onlineUsers.has(userId)) {
      onlineUsers.set(userId, new Set());
    }
    onlineUsers.get(userId)!.add(socket.id);
    console.log(`[Socket.IO] User ${userId} identified on socket ${socket.id}`);
  });

  // User joins a conversation room
  socket.on('join-conversation', (conversationId: string) => {
    socket.join(`conv:${conversationId}`);
    console.log(`[Socket.IO] Socket ${socket.id} joined conv:${conversationId}`);
  });

  // User leaves a conversation room
  socket.on('leave-conversation', (conversationId: string) => {
    socket.leave(`conv:${conversationId}`);
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    const userId = socket.data.userId;
    if (userId && onlineUsers.has(userId)) {
      onlineUsers.get(userId)!.delete(socket.id);
      if (onlineUsers.get(userId)!.size === 0) {
        onlineUsers.delete(userId);
      }
    }
    console.log(`[Socket.IO] Disconnected: ${socket.id}`);
  });
});

// Helper to emit to conversation members
export function emitToConversation(conversationId: string, event: string, data: unknown) {
  io.to(`conv:${conversationId}`).emit(event, data);
}

// Helper to emit to a specific user
export function emitToUser(userId: string, event: string, data: unknown) {
  const sockets = onlineUsers.get(userId);
  if (sockets) {
    for (const socketId of sockets) {
      io.to(socketId).emit(event, data);
    }
  }
}

// Health endpoint
httpServer.on('request', (req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', onlineUsers: onlineUsers.size }));
    return;
  }
});

httpServer.listen(PORT, () => {
  console.log(`[Socket.IO] Server running on port ${PORT}`);
});
