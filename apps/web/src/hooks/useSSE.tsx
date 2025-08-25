'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from './useAuth';
import { toast } from '@/hooks/use-toast';

export interface SSEEvent {
  type: 'job_status' | 'notification' | 'dataset_update' | 'heartbeat' | 'system_status';
  data: any;
  timestamp: string;
}

export interface SSEStatus {
  connected: boolean;
  connecting: boolean;
  error: string | null;
  lastHeartbeat: Date | null;
}

export interface SSEHookReturn {
  status: SSEStatus;
  connect: () => void;
  disconnect: () => void;
  addEventListener: (type: string, callback: (event: SSEEvent) => void) => void;
  removeEventListener: (type: string, callback: (event: SSEEvent) => void) => void;
}

export const useSSE = (): SSEHookReturn => {
  const { token, isAuthenticated } = useAuth();
  const [status, setStatus] = useState<SSEStatus>({
    connected: false,
    connecting: false,
    error: null,
    lastHeartbeat: null,
  });

  const eventSourceRef = useRef<EventSource | null>(null);
  const eventListenersRef = useRef<Map<string, Set<(event: SSEEvent) => void>>>(
    new Map()
  );
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;

  const connect = useCallback(() => {
    if (!isAuthenticated || !token) {
      console.log('SSE: Cannot connect - not authenticated');
      return;
    }

    if (eventSourceRef.current) {
      console.log('SSE: Already connected or connecting');
      return;
    }

    setStatus(prev => ({ ...prev, connecting: true, error: null }));

    try {
      const clientId = `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const url = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/sse/events?clientId=${clientId}`;
      
      console.log('SSE: Connecting to', url);

      const eventSource = new EventSource(url, {
        // Note: EventSource doesn't support custom headers, so we'll pass auth via URL params if needed
        // For now, we rely on cookie-based auth
      });

      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        console.log('SSE: Connection established');
        setStatus({
          connected: true,
          connecting: false,
          error: null,
          lastHeartbeat: new Date(),
        });
        reconnectAttemptsRef.current = 0;
      };

      eventSource.onmessage = (event) => {
        try {
          const sseEvent: SSEEvent = JSON.parse(event.data);
          
          // Update last heartbeat for heartbeat events
          if (sseEvent.type === 'heartbeat') {
            setStatus(prev => ({ ...prev, lastHeartbeat: new Date() }));
            return;
          }

          // Handle notifications with toast
          if (sseEvent.type === 'notification') {
            const { title, message, type } = sseEvent.data ?? {};
            const normalized = typeof type === 'string' ? type.toUpperCase() : 'INFO';
            const variant = normalized === 'ERROR' ? 'destructive' : 'default';
            toast({ title, description: message, variant });
          }

          // Trigger event listeners
          const listeners = eventListenersRef.current.get(sseEvent.type);
          if (listeners) {
            listeners.forEach(callback => callback(sseEvent));
          }

          // Also trigger 'all' listeners
          const allListeners = eventListenersRef.current.get('all');
          if (allListeners) {
            allListeners.forEach(callback => callback(sseEvent));
          }

        } catch (error) {
          console.error('SSE: Error parsing event data:', error);
        }
      };

      eventSource.onerror = (error) => {
        console.error('SSE: Connection error:', error);
        
        setStatus(prev => ({
          ...prev,
          connected: false,
          connecting: false,
          error: 'Connection lost',
        }));

        // Clean up current connection
        eventSource.close();
        eventSourceRef.current = null;

        // Attempt reconnection with exponential backoff
        if (reconnectAttemptsRef.current < maxReconnectAttempts) {
          const delay = Math.pow(2, reconnectAttemptsRef.current) * 1000; // 1s, 2s, 4s, 8s, 16s
          console.log(`SSE: Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current + 1}/${maxReconnectAttempts})`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttemptsRef.current += 1;
            connect();
          }, delay);
        } else {
          console.error('SSE: Max reconnection attempts reached');
          setStatus(prev => ({
            ...prev,
            error: 'Connection failed after multiple attempts',
          }));
        }
      };

    } catch (error) {
      console.error('SSE: Failed to establish connection:', error);
      setStatus({
        connected: false,
        connecting: false,
        error: 'Failed to connect',
        lastHeartbeat: null,
      });
    }
  }, [isAuthenticated, token]);

  const disconnect = useCallback(() => {
    console.log('SSE: Disconnecting');
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    setStatus({
      connected: false,
      connecting: false,
      error: null,
      lastHeartbeat: null,
    });

    reconnectAttemptsRef.current = 0;
  }, []);

  const addEventListener = useCallback((type: string, callback: (event: SSEEvent) => void) => {
    if (!eventListenersRef.current.has(type)) {
      eventListenersRef.current.set(type, new Set());
    }
    eventListenersRef.current.get(type)!.add(callback);
  }, []);

  const removeEventListener = useCallback((type: string, callback: (event: SSEEvent) => void) => {
    const listeners = eventListenersRef.current.get(type);
    if (listeners) {
      listeners.delete(callback);
      if (listeners.size === 0) {
        eventListenersRef.current.delete(type);
      }
    }
  }, []);

  // Auto-connect when authenticated
  useEffect(() => {
    if (isAuthenticated && token) {
      connect();
    } else {
      disconnect();
    }

    return () => {
      disconnect();
    };
  }, [isAuthenticated, token, connect, disconnect]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    status,
    connect,
    disconnect,
    addEventListener,
    removeEventListener,
  };
};