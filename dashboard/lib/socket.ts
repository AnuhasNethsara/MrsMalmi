import { io, Socket } from 'socket.io-client';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

let socket: Socket | null = null;

/**
 * Get or create a Socket.io client connection with JWT authentication.
 */
export function getSocket(): Socket {
  if (socket && socket.connected) {
    return socket;
  }

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  socket = io(API_BASE_URL, {
    auth: {
      token,
    },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
  });

  socket.on('connect', () => {
    console.log('[Socket] Connected');
  });

  socket.on('disconnect', (reason) => {
    console.log('[Socket] Disconnected:', reason);
  });

  socket.on('connect_error', (error) => {
    console.error('[Socket] Connection error:', error.message);
  });

  return socket;
}

/**
 * Subscribe to guild-specific events.
 */
export function subscribeToGuild(guildId: string): void {
  const sock = getSocket();
  sock.emit('subscribe', { guildId });
}

/**
 * Unsubscribe from guild-specific events.
 */
export function unsubscribeFromGuild(guildId: string): void {
  const sock = getSocket();
  sock.emit('unsubscribe', { guildId });
}

/**
 * Disconnect the socket connection.
 */
export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export default getSocket;
