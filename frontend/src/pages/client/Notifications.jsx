import React, { useEffect, useState } from 'react';
import Layout from '../../components/layout/Layout';
import { SectionCard, StatusBadge, PageLoader, EmptyState } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { 
  Bell, Clock, CheckCircle, AlertCircle, Info, 
  Calendar, Ticket, XCircle, RefreshCw, Trash2
} from 'lucide-react';

export default function Notifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('tous');

  const loadNotifications = async () => {
    try {
      const { data } = await api.get('/notifications');
      setNotifications(data || []);
    } catch (e) {
      toast.error('Erreur lors du chargement des notifications');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  const markAsRead = async (id) => {
    try {
      await api.put(`/notifications/${id}/lu`);
      setNotifications(prev => prev.map(n => 
        n.id === id ? { ...n, statut: 'lue' } : n
      ));
    } catch (e) {
      toast.error('Erreur lors du marquage comme lu');
    }
  };

  const markAllAsRead = async () => {
    try {
      await api.put('/notifications/tout-lu');
      setNotifications(prev => prev.map(n => ({ ...n, statut: 'lue' })));
      toast.success('Toutes les notifications marquées comme lues');
    } catch (e) {
      toast.error('Erreur lors du marquage');
    }
  };

  const deleteNotification = async (id) => {
    try {
      await api.delete(`/notifications/${id}`);
      setNotifications(prev => prev.filter(n => n.id !== id));
      toast.success('Notification supprimée');
    } catch (e) {
      toast.error('Erreur lors de la suppression');
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'ticket': return <Ticket size={20} />;
      case 'rdv': return <Calendar size={20} />;
      case 'alerte': return <AlertCircle size={20} />;
      case 'info': return <Info size={20} />;
      default: return <Bell size={20} />;
    }
  };

  const getNotificationColor = (type) => {
    switch (type) {
      case 'ticket': return '#3b82f6';
      case 'rdv': return '#8b5cf6';
      case 'alerte': return '#ef4444';
      case 'info': return '#10b981';
      default: return '#6b7280';
    }
  };

  const filteredNotifications = notifications.filter(n => {
    // Sécurité supplémentaire : s'assurer que c'est bien la notif de l'utilisateur
    if (n.user_id && n.user_id !== user.id) return false;
    
    if (filter === 'tous') return true;
    if (filter === 'non_lues') return n.statut === 'non_lue';
    if (filter === 'lues') return n.statut === 'lue';
    return true;
  });

  const typeColors = {
    ticket: '#3b82f6',
    rdv: '#8b5cf6',
    alerte: '#ef4444',
    info: '#10b981'
  };

  if (loading) return <Layout title="Notifications"><PageLoader /></Layout>;

  return (
    <Layout title="Notifications">
      <div className="page-header flex justify-between items-center">
        <div>
          <h2 className="page-title">Notifications</h2>
          <p className="page-subtitle">
            {notifications.filter(n => n.statut === 'non_lue').length} notification(s) non lue(s)
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button 
            className="btn btn-secondary btn-sm" 
            onClick={markAllAsRead}
            disabled={notifications.filter(n => !n.lu).length === 0}
          >
            <CheckCircle size={14} style={{ marginRight: 6 }} />
            Tout marquer comme lu
          </button>
          <button className="btn btn-secondary btn-sm" onClick={loadNotifications}>
            <RefreshCw size={14} style={{ marginRight: 6 }} />
            Actualiser
          </button>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 20, display: 'flex', gap: 16, alignItems: 'center', background: 'var(--bg-elevated)' }}>
        <div style={{ color: 'var(--text-muted)', fontSize: 13, marginRight: 8, fontWeight: 600 }}>
          Filtrer :
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {[
            { key: 'tous', label: 'Toutes' },
            { key: 'non_lues', label: 'Non lues' },
            { key: 'lues', label: 'Lues' },
          ].map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              style={{
                padding: '8px 16px',
                borderRadius: 8,
                border: 'none',
                background: filter === f.key ? 'var(--primary-500)' : 'var(--bg-card)',
                color: filter === f.key ? '#fff' : 'var(--text-secondary)',
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <SectionCard title="Mes Notifications">
        {filteredNotifications.length === 0 ? (
          <EmptyState 
            icon={<Bell size={48} style={{ opacity: 0.2 }} />}
            title="Aucune notification"
            message={filter === 'non_lues' ? "Vous n'avez pas de notifications non lues." : "Vous n'avez aucune notification pour le moment."}
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {filteredNotifications.map((notif, idx) => (
              <div
                key={notif.id}
                style={{
                  display: 'flex',
                  gap: 16,
                  padding: '16px',
                  background: (notif.statut === 'lue') ? 'var(--bg-card)' : 'var(--bg-elevated)',
                  borderRadius: 12,
                  border: `1px solid ${(notif.statut === 'lue') ? 'var(--border-subtle)' : 'var(--primary-200)'}`,
                  borderLeft: (notif.statut === 'lue') ? 'none' : '4px solid var(--primary-500)',
                  transition: 'all 0.2s'
                }}
              >
                {/* Icon */}
                <div style={{
                  width: 40,
                  height: 40,
                  borderRadius: 10,
                  background: `${getNotificationColor(notif.type)}22`,
                  color: getNotificationColor(notif.type),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  {getNotificationIcon(notif.type)}
                </div>

                {/* Content */}
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    {!notif.lu && (
                      <div style={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        background: 'var(--primary-500)',
                        flexShrink: 0
                      }} />
                    )}
                    <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>
                      {notif.titre || 'Notification'}
                    </span>
                    <span style={{ 
                      padding: '2px 8px', 
                      borderRadius: 12, 
                      fontSize: 11, 
                      fontWeight: 700,
                      background: `${typeColors[notif.type] || '#6b7280'}22`,
                      color: typeColors[notif.type] || '#6b7280'
                    }}>
                      {notif.type || 'général'}
                    </span>
                  </div>
                  <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 8 }}>
                    {notif.message}
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 12, color: 'var(--text-muted)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Clock size={12} />
                      {new Date(notif.created_at).toLocaleString('fr-FR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {(notif.statut === 'non_lue') && (
                    <button
                      onClick={() => markAsRead(notif.id)}
                      className="btn btn-ghost btn-sm"
                      style={{ fontSize: 11, fontWeight: 700, padding: '6px 12px' }}
                    >
                      <CheckCircle size={12} style={{ marginRight: 4 }} />
                      Marquer lu
                    </button>
                  )}
                  <button
                    onClick={() => deleteNotification(notif.id)}
                    className="btn btn-ghost btn-sm"
                    style={{ color: '#ef4444', fontSize: 11, fontWeight: 700, padding: '6px 12px' }}
                  >
                    <Trash2 size={12} style={{ marginRight: 4 }} />
                    Supprimer
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </Layout>
  );
}
