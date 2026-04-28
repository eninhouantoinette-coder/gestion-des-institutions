import React, { useEffect, useState } from 'react';
import Layout from '../../components/layout/Layout';
import { StatCard, SectionCard, StatusBadge, PageLoader } from '../../components/ui';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import toast from 'react-hot-toast';

export default function AgentDashboard() {
  const { user } = useAuth();
  const { connectQueue } = useSocket() || {};
  const [stats, setStats]   = useState({ taches: 0, terminees: 0, en_cours: 0, file: 0, ticketsJour: 0 });
  const [taches, setTaches] = useState([]);
  const [file, setFile]     = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const today = new Date().toISOString().split('T')[0];
        const [ta, tk, tj] = await Promise.all([
          api.get('/taches'),
          api.get('/tickets', { params: { statut: 'en_attente' } }),
          api.get('/tickets', { params: { agent_id: user.id, date: today, statut: 'termine' } })
        ]);
        const tachesEnCours = ta.data.filter(t => t.statut === 'en_cours');
        const tachesTerminees = ta.data.filter(t => t.statut === 'termine');
        setTaches(tachesEnCours.slice(0, 5));
        setFile(tk.data.slice(0, 5));
        setStats({
          taches: ta.data.length,
          terminees: tachesTerminees.length,
          en_cours: tachesEnCours.length,
          file: tk.data.length,
          ticketsJour: tj.data?.length || 0
        });
        if (user?.agence_id) connectQueue?.(user.agence_id);
      } catch {}
      finally { setLoading(false); }
    };
    load();
  }, []); // eslint-disable-line

  const terminerTache = async (id) => {
    try {
      await api.put(`/taches/${id}/statut`, { statut: 'termine' });
      setTaches(prev => prev.filter(t => t.id !== id));
      setStats(s => ({ ...s, en_cours: s.en_cours - 1, terminees: s.terminees + 1 }));
      toast.success('Tâche terminée !');
    } catch { toast.error('Erreur'); }
  };

  if (loading) return <Layout title="Tableau de bord"><PageLoader /></Layout>;

  return (
    <Layout title="Tableau de bord">
      <div className="page-header">
        <h2 className="page-title">Bonjour, {user?.nom?.split(' ')[0]}</h2>
        <p className="page-subtitle">Voici votre tableau de bord agent</p>
      </div>

      <div className="grid-4" style={{ marginBottom: 28 }}>
        <StatCard label="Tickets du jour" value={stats.ticketsJour} color="var(--success-500)" />
        <StatCard label="Tâches actives" value={stats.en_cours} color="var(--primary-500)" />
        <StatCard label="File d'attente" value={stats.file} color="var(--warning-500)" />
        <StatCard label="Temps moyen" value="15 min" color="var(--info-500)" />
      </div>

      <div className="grid-12" style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '24px' }}>
        {/* Mes tâches en cours */}
        <SectionCard title="Mes tâches prioritaires" style={{ gridColumn: 'span 7' }}>
          {taches.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-muted)' }}>
              <p style={{ fontWeight: 800, fontSize: 16, color: 'var(--text-primary)' }}>Tout est à jour !</p>
              <p style={{ fontSize: 14 }}>Toutes vos tâches prioritaires sont terminées.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {taches.map(t => (
                <div key={t.id} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '12px 14px', background: 'var(--bg-elevated)',
                  borderRadius: 10, border: '1px solid var(--border-subtle)',
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{t.titre}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                      {t.description?.slice(0, 60)}{t.description?.length > 60 ? '...' : ''}
                    </div>
                  </div>
                  <button
                    className="btn btn-success btn-sm"
                    onClick={() => terminerTache(t.id)}
                    style={{ fontSize: 11, fontWeight: 700 }}
                  >Terminer</button>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        {/* File d'attente */}
        <SectionCard title="Prochains clients" style={{ gridColumn: 'span 5' }}>
          {file.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-muted)', fontSize: 14 }}>
              Aucun client en attente
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {file.map((t, i) => (
                <div key={t.id} className={`queue-item ${i === 0 ? 'active' : ''}`} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '12px 14px', background: i === 0 ? 'rgba(59,130,246,0.05)' : 'var(--bg-elevated)',
                  borderRadius: 10, border: i === 0 ? '1px solid rgba(59,130,246,0.2)' : '1px solid var(--border-subtle)',
                }}>
                  <div className="queue-position" style={{
                    width: 28, height: 28, borderRadius: '50%',
                    background: i === 0 ? 'var(--primary-600)' : 'var(--bg-elevated)',
                    color: i === 0 ? '#fff' : 'var(--text-muted)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 12, fontWeight: 700, flexShrink: 0,
                  }}>{i + 1}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>
                      {t.numero_ticket} — {t.client_nom || 'Client'}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      Attente : {t.temps_estime} min
                    </div>
                  </div>
                  {i === 0 && <span style={{
                    background: 'rgba(59,130,246,0.15)', color: '#60a5fa',
                    fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20,
                  }}>Prochain</span>}
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>
    </Layout>
  );
}