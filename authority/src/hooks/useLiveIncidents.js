import { useEffect, useRef } from 'react';

const WS_URL = (import.meta.env.VITE_WS_URL || 'ws://localhost:8000/ws');

/**
 * Opens a WebSocket connection and invokes `onChange` whenever the server
 * broadcasts an incident/report/alert change event. Reconnects with backoff.
 */
export function useLiveIncidents(onChange, topics = ['incident_created', 'incident_updated', 'incident_deleted', 'report_created', 'report_updated', 'report_deleted', 'alert_changed']) {
  const cbRef = useRef(onChange);
  cbRef.current = onChange;

  useEffect(() => {
    let ws = null;
    let retry = 0;
    let closed = false;
    let timer = null;

    const connect = () => {
      if (closed) return;
      try {
        ws = new WebSocket(WS_URL);
      } catch {
        scheduleRetry();
        return;
      }
      ws.onopen = () => { retry = 0; };
      ws.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data);
          if (!msg?.type || topics.includes(msg.type)) {
            cbRef.current?.(msg);
          }
        } catch { /* ignore */ }
      };
      ws.onclose = () => { if (!closed) scheduleRetry(); };
      ws.onerror = () => { try { ws?.close(); } catch { /* ignore */ } };
    };

    const scheduleRetry = () => {
      const delay = Math.min(15000, 1000 * Math.pow(2, retry++));
      timer = setTimeout(connect, delay);
    };

    connect();
    return () => {
      closed = true;
      if (timer) clearTimeout(timer);
      try { ws?.close(); } catch { /* ignore */ }
    };
  }, [topics.join(',')]);
}
