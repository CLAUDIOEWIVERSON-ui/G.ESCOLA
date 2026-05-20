'use client';

import { useEffect, useRef } from 'react';
import { useUser } from '@/lib/auth/UserContext';

export default function ActivityTracker() {
  const { profile } = useUser();
  const lastHeartbeat = useRef<number>(0);
  const sessionId = useRef<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Get or create session ID
    let sId = localStorage.getItem('app_session_id');
    if (!sId) {
      sId = crypto.randomUUID();
      localStorage.setItem('app_session_id', sId);
    }
    sessionId.current = sId;
  }, []);

  useEffect(() => {
    if (!profile || !sessionId.current) return;

    const sendHeartbeat = async () => {
      try {
        const now = Date.now();
        // Throttle heartbeats to at most once every 45 seconds
        if (now - lastHeartbeat.current < 45000) return;

        await fetch('/api/auth/update-activity', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: sessionId.current,
            deviceInfo: {
              screenWidth: window.innerWidth,
              screenHeight: window.innerHeight,
              platform: navigator.platform,
              language: navigator.language
            }
          }),
        });
        lastHeartbeat.current = now;
      } catch (err) {
        console.error('Heartbeat failed:', err);
      }
    };

    // Send initial heartbeat
    sendHeartbeat();

    // Set interval for next heartbeats
    const interval = setInterval(sendHeartbeat, 60000); // 1 minute

    return () => clearInterval(interval);
  }, [profile]);

  return null;
}
