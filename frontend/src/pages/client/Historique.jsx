import React, { useEffect, useState } from 'react';
import Layout from '../../components/layout/Layout';
import { SectionCard, StatusBadge, PageLoader } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

export default function Historique() {
  const { user } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [rendezvous, setRendezvous] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    const load = async () => {
      try {
        const [ticketsRes, rdvsRes] = await Promise.all([
          api.get('/tickets', { params: { client_id: user.id } }),
          api.get('/rendezvous', { params: { client_id: user.id } }),
        ]);
        setTickets(ticketsRes.data);
        setRendezvous(rdvsRes.data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user.id]);

  const filteredTickets = tickets.filter(t => {
    if (filter === 'all') return true;
    if (filter === 'completed') return t.statut === 'termine';
    if (filter === 'pending') return ['en_attente', 'en_cours'].includes(t.statut);
    if (filter === 'cancelled') return t.statut === 'annule';
    return true;
  });

  const filteredRdv = rendezvous.filter(r => {
    if (filter === 'all') return true;
    if (filter === 'completed') return r.statut === 'termine';
    if (filter === 'pending') return ['confirme', 'en_attente'].includes(r.statut);
    if (filter === 'cancelled') return r.statut === 'annule';
    return true;
  });

  if (loading) return <Layout title="Historique"><PageLoader /></Layout>;

  return (
    <Layout title="Historique">
      <div className="page-header">
        <h2 className="page-title">Mon Historique</h2>
        <p className="page-subtitle">
          {tickets.length} ticket(s) et {rendezvous.length} rendez-vous
        </p>
      </div>

      {/* Tabs */}
      <div style={{ 
        display: 'flex', 
        gap: 8, 
        marginBottom: 24,
        background: 'var(--bg-elevated)',
        padding: 4,
        borderRadius: 10
      }}>
        {[
          { value: 'all', label: 'Tout' },
          { value: 'pending', label: 'En cours' },
          { value: 'completed', label: 'Terminé' },
          { value: 'cancelled', label: 'Annulé' }
        ].map(tab => (
          <button
            key={tab.value}
            className={`btn btn-sm ${filter === tab.value ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setFilter(tab.value)}
            style={{
              flex: 1,
              borderRadius: 8
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tickets */}
    <>
      <SectionCard title={`Tickets (${filteredTickets.length})`}>
        {filteredTickets.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
            Aucun ticket pour ce filtre
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {filteredTickets.map(ticket => (
              <div key={ticket.id} style={{
                padding: '14px 16px',
                background: 'var(--bg-elevated)',
                borderRadius: 10,
                border: '1px solid var(--border-subtle)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div>
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>
                    Ticket #{ticket.numero_ticket}
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                    {ticket.service_nom} • {new Date(ticket.created_at).toLocaleDateString('fr-FR')}
                  </div>
                </div>
                <StatusBadge statut={ticket.statut} />
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      {/* Rendez-vous */}
      <SectionCard title={`Rendez-vous (${filteredRdv.length})`}>
        {filteredRdv.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
            Aucun rendez-vous pour ce filtre
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {filteredRdv.map(rdv => (
              <div key={rdv.id} style={{
                padding: '14px 16px',
                background: 'var(--bg-elevated)',
                borderRadius: 10,
                border: '1px solid var(--border-subtle)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div>
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>
                    {rdv.service_nom}
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                    {new Date(rdv.date_heure).toLocaleString('fr-FR', { 
                      dateStyle: 'short', 
                      timeStyle: 'short' 
                    })}
                  </div>
                </div>
                <StatusBadge statut={rdv.statut} />
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </>
    </Layout>
  );
}
