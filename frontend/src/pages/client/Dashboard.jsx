import React, { useEffect, useState } from 'react';
import Layout from '../../components/layout/Layout';
import { StatCard, SectionCard, StatusBadge, EmptyState, PageLoader } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

export default function ClientDashboard() {
  const { user }    = useAuth();
  const { connectQueue, queueData } = useSocket() || {};
  const navigate    = useNavigate();
  const [ticket, setTicket]   = useState(null);
  const [rdvs, setRdvs]       = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [ticketsRes, rdvsRes, notifsRes] = await Promise.all([
          api.get('/tickets', { params: { statut: 'en_attente' } }),
          api.get('/rendezvous', { params: { statut: 'confirme' } }),
          api.get('/notifications'),
        ]);
        // Mon ticket actif
        const myTicket = ticketsRes.data.find(t => t.client_id === user.id);
        setTicket(myTicket || null);
        if (myTicket) connectQueue?.(myTicket.agence_id, () => refreshTicket(myTicket.id));
        // Prochains RDV (3)
        setRdvs(rdvsRes.data.slice(0, 3));
        // Notifications (5 dernières non lues)
        setNotifications(notifsRes.data.slice(0, 5));
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []); // eslint-disable-line

  const refreshTicket = async (id) => {
    try {
      const { data } = await api.get(`/tickets/position/${id}`);
      setTicket(prev => prev ? { ...prev, ...data } : null);
    } catch {}
  };

  if (loading) return <Layout title="Tableau de bord"><PageLoader /></Layout>;

  return (
    <Layout title="Tableau de bord">
      {/* Welcome */}
      <div className="page-header">
        <h2 className="page-title">Bonjour, {user?.nom?.split(' ')[0]}</h2>
        <p className="page-subtitle">Bienvenue dans votre espace personnel</p>
      </div>

      {/* Quick actions */}
      <div className="grid-2" style={{ marginBottom: 28 }}>
        <button
          id="btn-prendre-rdv"
          className="card"
          style={{
            border: '1px solid rgba(16,185,129,0.3)',
            background: 'rgba(16,185,129,0.08)',
            transition: 'var(--transition)',
            textAlign: 'left'
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(16,185,129,0.12)'}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(16,185,129,0.08)'}
          onClick={() => navigate('/client/ticket')}
        >
          <div style={{ fontWeight: 800, fontSize: 13, marginBottom: 8, color: '#10b981', textTransform: 'uppercase' }}>Ticket</div>
          <div style={{ fontWeight: 700, fontSize: 17, marginBottom: 4 }}>Prendre un ticket</div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Rejoindre la file d'attente virtuelle</div>
        </button>
        <button
          className="card"
          style={{
            border: '1px solid rgba(59,130,246,0.3)',
            background: 'rgba(59,130,246,0.08)',
            transition: 'var(--transition)',
            textAlign: 'left'
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(59,130,246,0.12)'}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(59,130,246,0.08)'}
          onClick={() => navigate('/client/rdv')}
        >
          <div style={{ fontWeight: 800, fontSize: 13, marginBottom: 8, color: '#3b82f6', textTransform: 'uppercase' }}>Agenda</div>
          <div style={{ fontWeight: 700, fontSize: 17, marginBottom: 4 }}>Mes rendez-vous</div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Consulter et gérer vos RDV</div>
        </button>
      </div>

      {/* Active ticket */}
      <SectionCard title="Mon ticket actif">
        {ticket ? (
          <div>
            <div className="ticket-card" style={{ marginBottom: 20 }}>
              <div className="ticket-label">Numéro de ticket</div>
              <div className="ticket-number">{ticket.numero_ticket}</div>
              <div className="ticket-label" style={{ marginTop: 12 }}>Position dans la file</div>
              <div style={{ fontSize: 32, fontWeight: 800, marginTop: 4 }}>#{ticket.position}</div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div style={{ background: 'var(--bg-elevated)', borderRadius: 10, padding: 16 }}>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4, fontWeight: 600 }}>Attente estimée</div>
                <div style={{ fontWeight: 800, fontSize: 20 }}>{ticket.temps_estime} min</div>
              </div>
              <div style={{ background: 'var(--bg-elevated)', borderRadius: 10, padding: 16 }}>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4, fontWeight: 600 }}>Statut</div>
                <StatusBadge statut={ticket.statut} />
              </div>
            </div>

            {ticket.guichet && (
              <div style={{
                marginTop: 16, padding: '16px 20px', borderRadius: 12,
                background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)',
              }}>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 800, letterSpacing: 0.5 }}>Guichet assigné</div>
                  <div style={{ fontWeight: 900, fontSize: 22, color: '#10b981', marginTop: 4 }}>
                    Guichet N° {ticket.guichet}
                  </div>
                  {ticket.agent_nom && (
                    <div style={{ fontSize: 13, marginTop: 4, color: 'var(--text-secondary)' }}>
                      Agent chargé : <strong>{ticket.agent_nom}</strong>
                    </div>
                  )}
                </div>
              </div>
            )}

            {ticket.position <= 3 && ticket.position > 0 && (
              <div style={{
                marginTop: 16, padding: '16px 20px', borderRadius: 12,
                background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)',
              }}>
                <div>
                  <div style={{ fontWeight: 800, color: '#f59e0b', fontSize: 15 }}>C'est presque votre tour !</div>
                  <div style={{ fontSize: 13, color: 'rgba(245,158,11,0.9)', marginTop: 2 }}>Préparez-vous à vous rendre au guichet (# {ticket.position})</div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <EmptyState title="Aucun ticket actif" subtitle="Vous n'avez pas de ticket en cours. Prenez un ticket pour rejoindre la file d'attente.">
            <button
              className="btn btn-primary btn-sm"
              style={{ marginTop: 16 }}
              onClick={() => navigate('/client/ticket')}
            >
              Prendre un ticket
            </button>
          </EmptyState>
        )}
      </SectionCard>

      {/* Upcoming appointments */}
      <SectionCard
        title="Prochains rendez-vous"
        action={
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/client/rdv')}>
            Tout voir
          </button>
        }
      >
        {rdvs.length === 0 ? (
          <EmptyState title="Aucun rendez-vous" subtitle="Vous n'avez pas de rendez-vous programmé pour le moment.">
            <button
              className="btn btn-primary btn-sm"
              style={{ marginTop: 16 }}
              onClick={() => navigate('/client/rdv')}
            >
              Prendre un rendez-vous
            </button>
          </EmptyState>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {rdvs.map(rdv => (
              <div key={rdv.id} style={{
                padding: '16px 18px',
                background: 'var(--bg-elevated)',
                borderRadius: 12,
                border: '1px solid var(--border-subtle)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>{rdv.service_nom}</div>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                    {new Date(rdv.date_heure).toLocaleString('fr-FR', { dateStyle: 'long', timeStyle: 'short' })}
                  </div>
                </div>
                <StatusBadge statut={rdv.statut} />
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      {/* Notifications */}
      <SectionCard
        title="Notifications"
        action={
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/client/notifications')}>
            Tout voir
          </button>
        }
      >
        {notifications.length === 0 ? (
          <EmptyState title="Aucune notification" subtitle="Vous n'avez pas de nouvelles notifications." />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {notifications.map(notif => (
              <div key={notif.id} style={{
                padding: '12px 14px',
                background: notif.lu ? 'var(--bg-card)' : 'rgba(59,130,246,0.08)',
                borderRadius: 10,
                border: `1px solid ${notif.lu ? 'var(--border-subtle)' : 'rgba(59,130,246,0.2)'}`,
                borderLeft: notif.lu ? 'none' : '3px solid #3b82f6',
                display: 'flex',
                gap: 12,
                alignItems: 'flex-start'
              }}>
                {!notif.lu && (
                  <div style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: '#3b82f6',
                    marginTop: 6,
                    flexShrink: 0
                  }} />
                )}
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4 }}>
                    {notif.message}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    {new Date(notif.created_at).toLocaleString('fr-FR', {
                      day: '2-digit',
                      month: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </Layout>
  );
}



