'use client';

import { useEffect } from 'react';

const MAX_LOGS = 8;

export default function ClientLogger() {
  useEffect(() => {
    let count = 0;

    const sendLog = (payload: Record<string, unknown>) => {
      if (count >= MAX_LOGS) return;
      count += 1;
      const body = JSON.stringify(payload);
      if (navigator.sendBeacon) {
        navigator.sendBeacon('/api/client-log', body);
        return;
      }
      fetch('/api/client-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body
      }).catch(() => null);
    };

    const onError = (event: ErrorEvent) => {
      sendLog({
        level: 'error',
        message: event.message,
        source: event.filename,
        line: event.lineno,
        column: event.colno,
        stack: event.error?.stack,
        url: window.location.href,
        userAgent: navigator.userAgent
      });
    };

    const onRejection = (event: PromiseRejectionEvent) => {
      sendLog({
        level: 'error',
        message: 'unhandledrejection',
        reason: String(event.reason),
        url: window.location.href,
        userAgent: navigator.userAgent
      });
    };

    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onRejection);

    return () => {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onRejection);
    };
  }, []);

  return null;
}
