import React, { useState, useEffect } from 'react';
import Layout from '../../components/layout/Layout';
import { SectionCard, PageLoader, EmptyState } from '../../components/ui';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';

export default function HistoriqueAgent() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [tickets, setTickets] = useState([]);
  const [taches, setTaches] = useState([]);
  const [activeTab, setActiveTab] = useState('tickets');
  const [filters, setFilters] = useState({
    statut: '',
    dateFrom: '',
    dateTo: '',
    search: ''
  });
  const [stats, setStats] = useState({
    totalTickets: 0,
    ticketsTermines: 0,
    ticketsAnnules: 0,
    ticketsAujourdhui: 0,
    totalTaches: 0,
    tachesTerminees: 0,
    tachesEnCours: 0
  });

  useEffect(() => {
    loadHistorique();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadHistorique = async () => {
    setLoading(true);
    try {
      const [ticketsRes, tachesRes] = await Promise.all([
        api.get('/tickets', { params: { agent_id: user.id, per_page: 100 } }),
        api.get('/taches', { params: { agent_id: user.id, per_page: 100 } })
      ]);

      const ticketsData = ticketsRes.data.items || ticketsRes.data || [];
      const tachesData = tachesRes.data || [];

      setTickets(ticketsData);
      setTaches(tachesData);

      const todayStr = new Date().toISOString().split('T')[0];
      
      setStats({
        totalTickets: ticketsData.length,
        ticketsTermines: ticketsData.filter(t => t.statut === 'termine').length,
        ticketsAnnules: ticketsData.filter(t => t.statut === 'annule').length,
        ticketsAujourdhui: ticketsData.filter(t => 
          t.statut === 'termine' && 
          new Date(t.created_at).toISOString().split('T')[0] === todayStr
        ).length,
        totalTaches: tachesData.length,
        tachesTerminees: tachesData.filter(t => t.statut === 'termine').length,
        tachesEnCours: tachesData.filter(t => t.statut === 'en_cours').length
      });
    } catch (e) {
      toast.error('Erreur lors du chargement de l\'historique');
    } finally {
      setLoading(false);
    }
  };

  const filterData = (data) => {
    return data.filter(item => {
      if (filters.statut && item.statut !== filters.statut) return false;
      
      if (filters.dateFrom) {
        const itemDate = new Date(item.created_at || item.date_debut);
        if (itemDate < new Date(filters.dateFrom)) return false;
      }
      
      if (filters.dateTo) {
        const itemDate = new Date(item.created_at || item.date_debut);
        if (itemDate > new Date(filters.dateTo)) return false;
      }
      
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const searchableText = [
          item.numero_ticket,
          item.client?.nom,
          item.service?.nom,
          item.titre,
          item.description
        ].filter(Boolean).join(' ').toLowerCase();
        
        if (!searchableText.includes(searchLower)) return false;
      }
      
      return true;
    });
  };

  const getTicketStatusConfig = (statut) => {
    switch (statut) {
      case 'termine': return { label: 'Terminé', color: '#10b981' };
      case 'en_cours': return { label: 'En cours', color: '#3b82f6' };
      case 'annule': return { label: 'Annulé', color: '#ef4444' };
      case 'en_attente': return { label: 'En attente', color: '#f59e0b' };
      case 'appele': return { label: 'Appelé', color: '#8b5cf6' };
      default: return { label: statut, color: '#64748b' };
    }
  };

  const getTacheStatusConfig = (statut) => {
    switch (statut) {
      case 'termine': return { label: 'Terminée', color: '#10b981' };
      case 'en_cours': return { label: 'En cours', color: '#3b82f6' };
      case 'en_attente': return { label: 'En attente', color: '#f59e0b' };
      default: return { label: statut, color: '#64748b' };
    }
  };

  const exportToCSV = () => {
    const data = activeTab === 'tickets' ? filteredTickets : filteredTaches;
    const headers = activeTab === 'tickets' 
      ? ['Numéro', 'Client', 'Service', 'Statut', 'Date', 'Durée (min)']
      : ['Titre', 'Description', 'Statut', 'Date début', 'Date fin', 'Priorité'];
    
    const rows = data.map(item => {
      if (activeTab === 'tickets') {
        return [
          item.numero_ticket,
          item.client?.nom || 'N/A',
          item.service?.nom || 'N/A',
          item.statut,
          new Date(item.created_at).toLocaleDateString('fr-FR'),
          item.duree_traitement || '-'
        ];
      } else {
        return [
          item.titre,
          item.description || '-',
          item.statut,
          item.date_debut ? new Date(item.date_debut).toLocaleDateString('fr-FR') : '-',
          item.date_fin ? new Date(item.date_fin).toLocaleDateString('fr-FR') : '-',
          item.priorite || 'Normal'
        ];
      }
    });

    const csvContent = [
      headers.join(';'),
      ...rows.map(row => row.join(';'))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `historique_${activeTab}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const handleReset = () => {
    setFilters({ statut: '', dateFrom: '', dateTo: '', search: '' });
    loadHistorique();
    toast.success('Filtres réinitialisés');
  };

  const filteredTickets = filterData(tickets);
  const filteredTaches = filterData(taches);

  if (loading) return <Layout title="Mon Historique"><PageLoader /></Layout>;

  return (
    <Layout title="Mon Historique">
      <div className="page-header">
        <h2 className="page-title">Mon Historique</h2>
        <p className="page-subtitle">Consultez l'historique de vos tickets et tâches traités</p>
      </div>

      {/* Stats */}
      <div className="grid-4" style={{ marginBottom: 24 }}>
        <div style={{ 
          padding: 20, 
          background: 'var(--bg-elevated)', 
          borderRadius: 12,
          borderLeft: '4px solid #10b981'
        }}>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Tickets aujourd'hui</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#10b981' }}>{stats.ticketsAujourdhui}</div>
        </div>
        <div style={{ 
          padding: 20, 
          background: 'var(--bg-elevated)', 
          borderRadius: 12,
          borderLeft: '4px solid #3b82f6'
        }}>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Total Tickets traités</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#3b82f6' }}>{stats.totalTickets}</div>
        </div>
        <div style={{ 
          padding: 20, 
          background: 'var(--bg-elevated)', 
          borderRadius: 12,
          borderLeft: '4px solid #f59e0b'
        }}>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Tâches totales</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#f59e0b' }}>{stats.totalTaches}</div>
        </div>
        <div style={{ 
          padding: 20, 
          background: 'var(--bg-elevated)', 
          borderRadius: 12,
          borderLeft: '4px solid #8b5cf6'
        }}>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Tâches en cours</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#8b5cf6' }}>{stats.tachesEnCours}</div>
        </div>
      </div>

      {/* Filtres */}
      <SectionCard title="Rechercher dans l'historique">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'flex-end' }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <label className="form-label">Rechercher</label>
            <input
              type="text"
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="form-input"
              placeholder="Numéro, client, service..."
            />
          </div>
          
          <div style={{ minWidth: 150 }}>
            <label className="form-label">Statut</label>
            <select
              value={filters.statut}
              onChange={(e) => setFilters({ ...filters, statut: e.target.value })}
              className="form-select"
            >
              <option value="">Tous</option>
              {activeTab === 'tickets' ? (
                <>
                  <option value="termine">Terminé</option>
                  <option value="en_cours">En cours</option>
                  <option value="annule">Annulé</option>
                  <option value="en_attente">En attente</option>
                </>
              ) : (
                <>
                  <option value="termine">Terminée</option>
                  <option value="en_cours">En cours</option>
                  <option value="en_attente">En attente</option>
                </>
              )}
            </select>
          </div>

          <div style={{ minWidth: 140 }}>
            <label className="form-label">Du</label>
            <input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
              className="form-input"
            />
          </div>

          <div style={{ minWidth: 140 }}>
            <label className="form-label">Au</label>
            <input
              type="date"
              value={filters.dateTo}
              onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
              className="form-input"
            />
          </div>

          <button 
            onClick={handleReset}
            className="btn btn-secondary btn-sm"
          >
            Réinitialiser
          </button>
        </div>
      </SectionCard>

      {/* Onglets */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        <button
          onClick={() => setActiveTab('tickets')}
          style={{
            padding: '10px 20px',
            borderRadius: 8,
            border: 'none',
            background: activeTab === 'tickets' ? 'var(--primary-600)' : 'var(--bg-elevated)',
            color: activeTab === 'tickets' ? '#fff' : 'var(--text-secondary)',
            fontWeight: 700,
            fontSize: 13,
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          Mes Tickets ({filteredTickets.length})
        </button>
        <button
          onClick={() => setActiveTab('taches')}
          style={{
            padding: '10px 20px',
            borderRadius: 8,
            border: 'none',
            background: activeTab === 'taches' ? 'var(--primary-600)' : 'var(--bg-elevated)',
            color: activeTab === 'taches' ? '#fff' : 'var(--text-secondary)',
            fontWeight: 700,
            fontSize: 13,
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          Mes Tâches ({filteredTaches.length})
        </button>
        <div style={{ flex: 1 }} />
        <button 
          onClick={exportToCSV}
          className="btn btn-secondary btn-sm"
        >
          Exporter CSV
        </button>
      </div>

      {/* Liste */}
      {activeTab === 'tickets' ? (
        filteredTickets.length === 0 ? (
          <EmptyState title="Aucun ticket trouvé" subtitle="Aucun ticket ne correspond à vos critères de recherche." />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {filteredTickets.map((ticket) => {
              const status = getTicketStatusConfig(ticket.statut);
              return (
                <div
                  key={ticket.id}
                  style={{
                    padding: '16px 20px',
                    background: 'var(--bg-elevated)',
                    borderRadius: 12,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 16,
                    border: '1px solid var(--border-subtle)'
                  }}
                >
                  <div style={{
                    width: 48, height: 48,
                    borderRadius: 10,
                    background: status.color + '20',
                    color: status.color,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 14,
                    fontWeight: 800,
                    flexShrink: 0
                  }}>
                    {ticket.numero_ticket}
                  </div>
                  
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 2 }}>
                      {ticket.service?.nom || 'Service non spécifié'}
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                      Client: {ticket.client?.nom || 'Client non assigné'}
                    </div>
                  </div>

                  <div style={{ textAlign: 'center', minWidth: 100 }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 }}>Date</div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>
                      {new Date(ticket.created_at).toLocaleDateString('fr-FR')}
                    </div>
                  </div>

                  <div style={{ textAlign: 'center', minWidth: 80 }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 }}>Durée</div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>
                      {ticket.duree_traitement ? `${ticket.duree_traitement} min` : '-'}
                    </div>
                  </div>

                  <div style={{ 
                    padding: '4px 12px',
                    borderRadius: 20,
                    background: status.color + '15',
                    color: status.color,
                    fontSize: 11,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    minWidth: 100,
                    textAlign: 'center'
                  }}>
                    {status.label}
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : (
        filteredTaches.length === 0 ? (
          <EmptyState title="Aucune tâche trouvée" subtitle="Vous n'avez aucune tâche historique correspondant aux filtres." />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {filteredTaches.map((tache) => {
              const status = getTacheStatusConfig(tache.statut);
              return (
                <div
                  key={tache.id}
                  style={{
                    padding: '16px 20px',
                    background: 'var(--bg-elevated)',
                    borderRadius: 12,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 16,
                    border: '1px solid var(--border-subtle)'
                  }}
                >
                  <div style={{
                    width: 40, height: 40,
                    borderRadius: 8,
                    background: status.color + '20',
                    color: status.color,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    fontWeight: 800,
                    fontSize: 12
                  }}>
                    T
                  </div>
                  
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 2 }}>{tache.titre}</div>
                    {tache.description && (
                      <div style={{ fontSize: 13, color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 400 }}>
                        {tache.description}
                      </div>
                    )}
                  </div>

                  <div style={{ textAlign: 'center', minWidth: 100 }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 }}>Début</div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>
                      {tache.date_debut ? new Date(tache.date_debut).toLocaleDateString('fr-FR') : '-'}
                    </div>
                  </div>

                  <div style={{ textAlign: 'center', minWidth: 100 }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 }}>Fin</div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>
                      {tache.date_fin ? new Date(tache.date_fin).toLocaleDateString('fr-FR') : '-'}
                    </div>
                  </div>

                  <div style={{ 
                    padding: '4px 12px',
                    borderRadius: 20,
                    background: status.color + '15',
                    color: status.color,
                    fontSize: 11,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    minWidth: 100,
                    textAlign: 'center'
                  }}>
                    {status.label}
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}
    </Layout>
  );
}
