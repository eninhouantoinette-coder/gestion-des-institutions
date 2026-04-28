import React, { useEffect, useState } from 'react';
import Layout from '../../components/layout/Layout';
import { SectionCard, StatusBadge, EmptyState, PageLoader } from '../../components/ui';
import api from '../../services/api';
import toast from 'react-hot-toast';

const PRIORITY_COLORS = { urgente: '#ef4444', haute: '#f59e0b', normale: '#3b82f6', faible: '#6b7280' };

export default function MesTaches() {
  const [taches, setTaches]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]   = useState('all');

  useEffect(() => {
    const load = () => api.get('/taches').then(r => setTaches(r.data)).catch(() => {});
    load().finally(() => setLoading(false));
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, []);

  const updateStatut = async (id, statut) => {
    try {
      await api.put(`/taches/${id}/statut`, { statut });
      setTaches(prev => prev.map(t => t.id === id ? { ...t, statut } : t));
      toast.success('Tâche mise à jour');
    } catch { toast.error('Erreur'); }
  };

  const filtered = filter === 'all' ? taches : taches.filter(t => t.statut === filter);

  if (loading) return <Layout title="Mes tâches"><PageLoader /></Layout>;

  return (
    <Layout title="Mes tâches">
      <div className="page-header">
        <h2 className="page-title">Mes tâches</h2>
        <p className="page-subtitle">{taches.length} tâche(s) assignée(s)</p>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {[
          { value: 'all', label: 'Toutes' },
          { value: 'a_faire', label: 'À faire' },
          { value: 'en_cours', label: 'En cours' },
          { value: 'termine', label: 'Terminées' },
        ].map(f => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={filter === f.value ? 'btn btn-primary btn-sm' : 'btn btn-ghost btn-sm'}
          >
            {f.label}
          </button>
        ))}
      </div>

      <SectionCard title={filter === 'all' ? 'Toutes mes tâches' : `Tâches : ${filter.replace('_', ' ')}`}>
        {filtered.length === 0 ? (
          <EmptyState 
            title="Aucune tâche" 
            subtitle={filter === 'all' ? "Vous n'avez aucune tâche assignée pour le moment." : `Aucune tâche avec le statut "${filter}"`}
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {filtered.map(t => (
              <div key={t.id} style={{
                padding: '16px 20px',
                background: 'var(--bg-elevated)',
                borderRadius: 12,
                border: `1px solid ${PRIORITY_COLORS[t.priorite]}22`,
                borderLeft: `4px solid ${PRIORITY_COLORS[t.priorite]}`,
                transition: 'var(--transition)',
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 15, display: 'flex', alignItems: 'center', gap: 10 }}>
                        {t.titre}
                        <StatusBadge statut={t.statut} />
                      </div>
                      {t.description && (
                        <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4, lineHeight: 1.5 }}>
                          {t.description}
                        </div>
                      )}
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8, fontWeight: 600 }}>
                        Priorité : <span style={{ color: PRIORITY_COLORS[t.priorite], textTransform: 'capitalize' }}>{t.priorite}</span>
                        {t.date_echeance && ` | Échéance : ${new Date(t.date_echeance).toLocaleDateString('fr-FR')}`}
                      </div>
                    </div>
                  </div>
                  <div style={{ marginTop: 12, display: 'flex', gap: 8, borderTop: '1px solid var(--border-subtle)', paddingTop: 12 }}>
                    {t.statut === 'a_faire' && (
                      <button className="btn btn-primary btn-sm" onClick={() => updateStatut(t.id, 'en_cours')}>
                         Commencer
                      </button>
                    )}
                    {t.statut === 'en_cours' && (
                      <button className="btn btn-success btn-sm" onClick={() => updateStatut(t.id, 'termine')}>
                         Terminer
                      </button>
                    )}
                    {t.statut === 'termine' && (
                      <div style={{ fontSize: 12, color: 'var(--success-400)', fontWeight: 700 }}>
                        Tâche terminée
                      </div>
                    )}
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