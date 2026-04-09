import { io, type Socket } from 'socket.io-client';

let socket: Socket | null = null;

/**
 * Socket.io shares the API origin. Dev: Vite proxies `/socket.io` → backend :4000.
 * Override with `VITE_SOCKET_URL` (e.g. `http://localhost:4000`) if needed.
 */
export function getVideoSocket(): Socket {
  if (!socket) {
    const fromEnv = import.meta.env.VITE_SOCKET_URL?.trim();
    const url =
      fromEnv ||
      (typeof window !== 'undefined' ? window.location.origin : '');
    socket = io(url, {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      withCredentials: true
    });
  }
  return socket;
}
