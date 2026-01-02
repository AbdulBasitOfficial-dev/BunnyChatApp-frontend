import { io, Socket } from 'socket.io-client';

class SocketService {
    private socket: Socket | null = null;
    private listeners: Map<string, Set<(data: unknown) => void>> = new Map();

    connect() {
        const token = localStorage.getItem('accessToken');

        if (!token) {
            console.warn('No token available for socket connection');
            return;
        }

        if (this.socket?.connected) {
            console.log('Socket already connected');
            return;
        }

        // Connect to backend WebSocket server
        this.socket = io('http://localhost:3000', {
            auth: { token },
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
        });

        this.socket.on('connect', () => {
            console.log('🔌 Socket connected:', this.socket?.id);
        });

        this.socket.on('disconnect', (reason) => {
            console.log('🔌 Socket disconnected:', reason);
        });

        this.socket.on('connect_error', (error) => {
            console.error('🔌 Socket connection error:', error.message);
        });

        this.socket.on('connected', (data) => {
            console.log('✅ Server confirmed connection:', data);
        });

        // Re-register all existing listeners
        this.listeners.forEach((callbacks, event) => {
            callbacks.forEach(callback => {
                this.socket?.on(event, callback);
            });
        });
    }

    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
            console.log('🔌 Socket manually disconnected');
        }
    }

    on(event: string, callback: (data: unknown) => void) {
        // Store the listener
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        this.listeners.get(event)?.add(callback);

        // If socket is connected, register immediately
        if (this.socket) {
            this.socket.on(event, callback);
        }

        // Return unsubscribe function
        return () => {
            this.off(event, callback);
        };
    }

    off(event: string, callback: (data: unknown) => void) {
        this.listeners.get(event)?.delete(callback);
        this.socket?.off(event, callback);
    }

    emit(event: string, data?: unknown) {
        if (this.socket?.connected) {
            this.socket.emit(event, data);
        } else {
            console.warn('Socket not connected, cannot emit:', event);
        }
    }

    isConnected(): boolean {
        return this.socket?.connected ?? false;
    }
}

// Singleton instance
export const socketService = new SocketService();
