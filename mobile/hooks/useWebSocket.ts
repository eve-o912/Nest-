import { useEffect, useRef, useCallback } from 'react';
import { useAuthStore } from '@/store/auth.store';
import { useUIStore } from '@/store/ui.store';
import { useQueryClient } from '@tanstack/react-query';

const WS_URL = process.env.EXPO_PUBLIC_WS_URL || 'ws://localhost:3001';

export function useWebSocket() {
  const auth = useAuthStore();
  const ui = useUIStore();
  const queryClient = useQueryClient();
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();

  const connect = useCallback(() => {
    if (!auth.tokens?.accessToken || wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    const ws = new WebSocket(`${WS_URL}?token=${auth.tokens.accessToken}`);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('WebSocket connected');
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        
        switch (message.type) {
          case 'new_sale':
            // Update dashboard cache
            queryClient.setQueryData(['sales', 'today'], (old: any) =>
              old ? [message.data, ...old] : [message.data]
            );
            // Update totals
            queryClient.setQueryData(['dashboard'], (old: any) => ({
              ...old,
              totalRevenue: (old?.totalRevenue || 0) + message.data.totalAmount,
              transactionCount: (old?.transactionCount || 0) + 1,
            }));
            ui.showToast(`New sale: KES ${message.data.totalAmount / 100}`, 'success');
            break;

          case 'mismatch_alert':
            ui.showToast(
              `Cash mismatch: KES ${message.data.variance / 100} missing`,
              'error'
            );
            break;

          case 'ping':
            ws.send(JSON.stringify({ type: 'pong' }));
            break;
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    };

    ws.onclose = () => {
      console.log('WebSocket disconnected');
      wsRef.current = null;
      // Auto-reconnect after 3 seconds
      reconnectTimeoutRef.current = setTimeout(connect, 3000);
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
  }, [auth.tokens?.accessToken, queryClient, ui]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (auth.isAuthenticated) {
      connect();
    }
    return () => disconnect();
  }, [auth.isAuthenticated, connect, disconnect]);

  return {
    isConnected: wsRef.current?.readyState === WebSocket.OPEN,
    connect,
    disconnect,
  };
}
