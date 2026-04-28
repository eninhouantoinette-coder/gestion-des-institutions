import React, { useEffect, useState } from 'react';
import Layout from '../../components/layout/Layout';
import { SectionCard, StatusBadge, EmptyState, PageLoader } from '../../components/ui';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { 
  ClipboardList, Trash2, Plus, Filter, Search, 
  MessageSquare, Calendar, ChevronRight, User, RefreshCw
} from 'lucide-react';

export default function ManagerTaches() {
  const [taches, setTaches]       = useState([]);
  const [agents, setAgents]       = useState([]);
  const [loading, setLoading]     = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatut, setFilterStatut] = useState('tous');

  const loadData = async () => {
    try {
      const [ta, ag] = await Promise.all([
        api.get('/taches'),
        api.get('/users', { params: { role: 'agent', per_page: 50 } }),
      ]);
      setTaches(ta.data || []);
      setAgents(ag.data?.items || []);
    } catch (e) {
      toast.error('Erreur de chargement des tâches');
    } finally { 
      setLoading(false); 
    }
  };

  useEffect(() => { loadData(); }, []);

  // Rafraîchissement automatique toutes les 5 secondes
  useEffect(() => {
    const interval = setInterval(() => {
      loadData();
    }, 5000); // 5 secondes

    return () => clearInterval(interval);
  }, []);

  const supprimerTache = async (id) => {
    if (!window.confirm('Supprimer cette tâche ?')) return;
    try {
      await api.delete(`/taches/${id}`);
      setTaches(prev => prev.filter(t => t.id !== id));
      toast.success('Tâche supprimée');
    } catch { toast.error('Erreur de suppression'); }
  };

  const changerStatut = async (id, statut) => {
    try {
      await api.put(`/taches/${id}/statut`, { statut });
      setTaches(prev => prev.map(t => t.id === id ? { ...t, statut } : t));
      toast.success('Statut mis à jour');
    } catch { toast.error('Erreur lors de la mise à jour'); }
  };

  const filteredTaches = taches.filter(t => {
    const matchesSearch = t.titre?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          t.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatut === 'tous' || t.statut === filterStatut;
    return matchesSearch && matchesStatus;
  });

  if (loading) return <Layout title="Tâches"><PageLoader /></Layout>;

  return (
    <Layout title="Gestion des tâches">
      <div className="page-header" style={{ marginBottom: 28 }}>
        <div>
          <h2 className="page-title"> Gestion des tâches</h2>
          <p className="page-subtitle">Suivi des activités internes de l'agence</p>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button className="btn btn-secondary btn-sm" onClick={loadData}>
            <RefreshCw size={14} />
          </button>
          <button className="btn btn-primary btn-sm flex items-center gap-2">
            <Plus size={16} /> Nouvelle tâche
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, gap: 16 }}>
        <div style={{ display: 'flex', gap: 12 }}>
          {['tous', 'a_faire', 'en_cours', 'termine'].map(s => (
            <button
              key={s}
              onClick={() => setFilterStatut(s)}
              className={`btn btn-xs ${filterStatut === s ? 'btn-primary' : 'btn-ghost'}`}
              style={{ textTransform: 'capitalize', borderRadius: 8, padding: '6px 12px' }}
            >
              {s.replace('_', ' ')}
            </button>
          ))}
        </div>
        <div style={{ position: 'relative', width: 300 }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }} />
          <input 
            className="form-input" 
            placeholder="Rechercher une tâche..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ paddingLeft: 38, borderRadius: 10, height: 40 }}
          />
        </div>
      </div>

      <SectionCard noPadding>
        {filteredTaches.length === 0 ? (
          <EmptyState 
            icon={<ClipboardList size={48} />}
            title="Aucune tâche trouvée" 
            message="Essayez de modifier vos filtres ou créez une nouvelle tâche."
          />
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th style={{ width: '40%' }}>Détails de la tâche</th>
                  <th>Assigné à</th>
                  <th>Statut</th>
                  <th>Échéance</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTaches.map(t => {
                  const agent = agents.find(a => a.id === t.agent_id);
                  return (
                    <tr key={t.id}>
                      <td>
                        <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--text-primary)' }}>{t.titre}</div>
                        {t.description && (
                          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                            <MessageSquare size={12} /> {t.description.slice(0, 70)}{t.description.length > 70 ? '...' : ''}
                          </div>
                        )}
                      </td>
                      <td>
                        {agent ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ width: 30, height: 30, borderRadius: 15, background: 'var(--primary-100)', color: 'var(--primary-600)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 12 }}>
                              {agent.nom?.charAt(0).toUpperCase()}
                            </div>
                            <span style={{ fontSize: 13, fontWeight: 600 }}>{agent.nom}</span>
                          </div>
                        ) : (
                          <span style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic' }}>Libre</span>
                        )}
                      </td>
                      <td>
                        <StatusBadge statut={t.statut} />
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-secondary)' }}>
                          <Calendar size={14} /> {t.date_echeance ? new Date(t.date_echeance).toLocaleDateString() : '—'}
                        </div>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                          <button className="btn btn-ghost btn-sm" style={{ color: 'var(--danger-500)' }} onClick={() => supprimerTache(t.id)}>
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </Layout>
  );
}