import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);
const WS_BASE = process.env.REACT_APP_WS_URL || 'ws://localhost:8000';

export function SocketProvider({ children }) {
  const { user, isAuthenticated } = useAuth();
  const wsRefs = useRef({});
  const [queueData, setQueueData]     = useState({});
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount]  = useState(0);

  const connectChannel = (channel, onMessage) => {
    if (wsRefs.current[channel]) return;
    const ws = new WebSocket(`${WS_BASE}/ws/${channel}`);
    ws.onmessage = (e) => {
      try { onMessage(JSON.parse(e.data)); } catch {}
    };
    ws.onerror = () => console.warn(`[WS] Erreur canal ${channel}`);
    ws.onclose = () => {
      delete wsRefs.current[channel];
      // Reconnect après 3s
      setTimeout(() => connectChannel(channel, onMessage), 3000);
    };
    wsRefs.current[channel] = ws;
  };

  const disconnectAll = () => {
    Object.values(wsRefs.current).forEach(ws => ws.close());
    wsRefs.current = {};
  };

  useEffect(() => {
    if (!isAuthenticated || !user) { disconnectAll(); return; }

    // Canal notifications utilisateur (spécifique à chaque user)
    connectChannel(`notifications/${user.id}`, (msg) => {
      if (msg.event === 'nouvelle_notification') {
        setNotifications(prev => [msg.data, ...prev.slice(0, 49)]);
        setUnreadCount(c => c + 1);
      }
    });

    // Canal dashboard selon rôle et agence
    // Admin/Directeur : canal global
    // Manager/Agent : canal spécifique à leur agence
    const dashboardChannel = (user.role === 'manager' || user.role === 'agent') && user.agence_id
      ? `dashboard/${user.role}/${user.agence_id}`
      : `dashboard/${user.role}`;
    
    connectChannel(dashboardChannel, (msg) => {
      if (msg.event === 'alerte_declenchee') {
        console.warn('[ALERTE]', msg.data);
        // Stocker l'alerte dans les notifications si elle concerne l'utilisateur
        setNotifications(prev => [{
          id: msg.data.id,
          message: msg.data.message,
          type: 'alerte',
          data: msg.data,
          created_at: new Date().toISOString(),
        }, ...prev.slice(0, 49)]);
        setUnreadCount(c => c + 1);
      }
    });

    return () => disconnectAll();
  }, [isAuthenticated, user]); // eslint-disable-line

  const connectQueue = (agenceId, onUpdate) => {
    connectChannel(`file/${agenceId}`, (msg) => {
      setQueueData(prev => ({ ...prev, [agenceId]: msg.data }));
      if (onUpdate) onUpdate(msg);
    });
  };

  const markAllRead = () => setUnreadCount(0);

  return (
    <SocketContext.Provider value={{
      connectQueue, queueData, notifications,
      unreadCount, markAllRead,
    }}>
      {children}
    </SocketContext.Provider>
  );
}

export const useSocket = () => useContext(SocketContext);
