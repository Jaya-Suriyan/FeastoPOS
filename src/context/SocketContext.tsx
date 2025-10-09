import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
} from 'react';
import io, { Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';

type OrderEventHandler = (message: any) => void;

type SocketContextType = {
  isConnected: boolean;
  onOrderEvent: (handler: OrderEventHandler) => void;
  offOrderEvent: (handler: OrderEventHandler) => void;
};

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export const SocketProvider = ({ children }: { children: React.ReactNode }) => {
  const { token } = useAuth();
  const socketRef = useRef<Socket | null>(null);
  const connectedRef = useRef<boolean>(false);
  const handlersRef = useRef<Set<OrderEventHandler>>(new Set());

  useEffect(() => {
    if (!token) {
      // disconnect if no token
      if (socketRef.current) {
        try {
          socketRef.current.disconnect();
        } catch {}
        socketRef.current = null;
      }
      connectedRef.current = false;
      return;
    }

    // Initialize socket connection
    const BaseUrl = 'https://dev.feasto.co.uk';
    const socketUrl = BaseUrl.replace(/^http/, 'ws');
    const socket = io(socketUrl, {
      path: '/api/socket',
      transports: ['websocket', 'polling'],
      auth: { token },
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });
    socketRef.current = socket;

    const onConnect = () => {
      console.log('Socket connected');
      connectedRef.current = true;
    };
    const onDisconnect = () => {
      console.log('Socket disconnected');
      connectedRef.current = false;
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);

    // Join restaurant room if backend expects
    socket.emit('join_restaurant', { token });

    // Forward order events to registered handlers
    const forward = (message: any) => {
      handlersRef.current.forEach(h => {
        try {
          h(message);
        } catch {}
      });
    };
    // Listen to consolidated 'order' channel like web app
    socket.on('order', (payload: any) => forward(payload));

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('order');
      try {
        socket.disconnect();
      } catch {}
      socketRef.current = null;
      connectedRef.current = false;
    };
  }, [token]);

  const value = useMemo<SocketContextType>(
    () =>
      ({
        get isConnected() {
          return connectedRef.current;
        },
        onOrderEvent: (handler: OrderEventHandler) => {
          handlersRef.current.add(handler);
        },
        offOrderEvent: (handler: OrderEventHandler) => {
          handlersRef.current.delete(handler);
        },
      } as any),
    [],
  );

  return (
    <SocketContext.Provider value={value}>{children}</SocketContext.Provider>
  );
};

export const useSocket = (): SocketContextType => {
  const ctx = useContext(SocketContext);
  if (!ctx) throw new Error('useSocket must be used within SocketProvider');
  return ctx;
};
