import { useEffect, useRef } from 'react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

interface BabEvent {
  type: string;
  data: unknown;
}

/**
 * Subscribe to the live event stream (SSE) from the BAB server.
 * Reconnects automatically when the server restarts.
 */
export function useBabEvents(onEvent: (type: string, data: unknown) => void): void {
  const handlerRef = useRef(onEvent);
  handlerRef.current = onEvent;

  useEffect(() => {
    let source: EventSource | null = null;
    let closed = false;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;

    const connect = () => {
      if (closed) return;

      source = new EventSource(`${API_BASE}/v1/events`);

      source.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data) as BabEvent;
          if (parsed && typeof parsed.type === 'string') {
            handlerRef.current(parsed.type, parsed.data);
          }
        } catch {
          // Ignore malformed messages.
        }
      };

      source.onerror = () => {
        source?.close();
        source = null;
        if (!closed) {
          retryTimer = setTimeout(connect, 2000);
        }
      };
    };

    connect();

    return () => {
      closed = true;
      if (retryTimer) clearTimeout(retryTimer);
      source?.close();
    };
  }, []);
}
