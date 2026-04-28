import React, { useState } from 'react';
import { useSocket } from '../../context/SocketContext';
import api from '../../services/api';
import toast from 'react-hot-toast';

export default function Header({ title }) {
  const { notifications, unreadCount, markAllRead } = useSocket() || {};
  const [showNotifs, setShowNotifs] = useState(false);

  const handleMarkAllRead = async () => {
    try {
      await api.get('/notifications').then(res =>
        res.data.forEach(n => api.put(`/notifications/${n.id}/lire`))
      );
      markAllRead?.();
      toast.success('Notifications marquées comme lues');
    } catch {}
  };

  return (
    <header className="header" style={{ position: 'relative' }}>
      <div>
        <h1 className="header-title">{title}</h1>
      </div>

      <div className="header-actions">
        {/* Notification notification */}
        <div style={{ position: 'relative' }}>
          <button
            id="btn-notifications"
            className="btn btn-ghost btn-sm"
            style={{ fontWeight: 600, fontSize: 13, gap: 8, display: 'flex', alignItems: 'center' }}
            onClick={() => { setShowNotifs(v => !v); markAllRead?.(); }}
          >
            Notifications
            {unreadCount > 0 && (
              <span style={{ 
                background: 'var(--danger-500)', 
                color: '#fff', 
                padding: '2px 6px', 
                borderRadius: 10, 
                fontSize: 10 
              }}>{unreadCount}</span>
            )}
          </button>

          {showNotifs && (
            <div style={{
              position: 'absolute', right: 0, top: 40,
              width: 360, background: 'var(--bg-card)',
              border: '1px solid var(--border-default)',
              borderRadius: 'var(--radius-lg)',
              boxShadow: 'var(--shadow-lg)',
              zIndex: 200,
              animation: 'slideUp 0.2s ease',
            }}>
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)',
              }}>
                <span style={{ fontWeight: 700, fontSize: 15 }}>Notifications</span>
                <div style={{ display: 'flex', gap: 12 }}>
                  <button
                    onClick={handleMarkAllRead}
                    style={{ background: 'none', border: 'none', color: 'var(--primary-500)', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}
                  >
                    Tout lire
                  </button>
                  <button 
                    onClick={() => setShowNotifs(false)} 
                    style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontWeight: 700, fontSize: 14 }}
                  >
                    Fermer
                  </button>
                </div>
              </div>
              <div style={{ maxHeight: 380, overflowY: 'auto' }}>
                {notifications?.length === 0 && (
                  <div className="text-center text-muted" style={{ padding: 32 }}>
                    <p style={{ fontSize: 13 }}>Aucune notification</p>
                  </div>
                )}
                {notifications?.map((n, i) => (
                  <div key={n.id || i} style={{
                    padding: '12px 20px',
                    borderBottom: '1px solid var(--border-subtle)',
                    transition: 'var(--transition)',
                  }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <div style={{ display: 'flex', gap: 10 }}>
                      <span style={{ fontWeight: 700, fontSize: 11, color: 'var(--primary-500)', textTransform: 'uppercase' }}>
                        {n.type} :
                      </span>
                      <div>
                        <p style={{ fontSize: 13, lineHeight: 1.5 }}>{n.message}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
