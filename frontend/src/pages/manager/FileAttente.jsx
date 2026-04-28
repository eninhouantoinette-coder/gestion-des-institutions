import React, { useEffect, useState } from 'react';
import Layout from '../../components/layout/Layout';
import { SectionCard, PageLoader, Modal, EmptyState, StatusBadge } from '../../components/ui';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import toast from 'react-hot-toast';
import { 
  Users, Clock, Play, AlertTriangle, Check, XCircle, 
  UserMinus, ChevronRight, RefreshCw, Search, PhoneCall,
  UserCheck, History, ListFilter, Ticket
} from 'lucide-react';

export default function FileAttenteManager() {
  const { user } = useAuth();
  const { connectQueue } = useSocket();
  const [tickets, setTickets] = useState([]);
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('tous'); 
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [selectedAgentForCall, setSelectedAgentForCall] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);

  const loadData = async () => {
    try {
      const agenceId = user?.agence_id;
      const [ticketsRes, agentsRes] = await Promise.all([
        api.get('/tickets', { params: { agence_id: agenceId, per_page: 100 } }),
        api.get('/users', { params: { role: 'agent', agence_id: agenceId, per_page: 50 } })
      ]);
      setTickets(ticketsRes.data?.items || ticketsRes.data || []);
      setAgents(agentsRes.data?.items || []);
    } catch (e) {
      toast.error('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // Polling de secours toutes les 30s
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, [user]);

  // WebSocket temps réel : se connecte au canal file de l'agence
  useEffect(() => {
    if (!user?.agence_id) return;
    connectQueue(user.agence_id, (msg) => {
      // Recharge dès qu'un événement arrive sur la file
      setLastUpdate(new Date());
      loadData();
    });
  }, [user?.agence_id]); // eslint-disable-line

  const filteredTickets = tickets.filter(t => {
    const matchesSearch = (t.numero_ticket?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           t.client_nom?.toLowerCase().includes(searchTerm.toLowerCase()));
    if (!matchesSearch) return false;
    if (filter === 'tous')       return ['en_attente', 'en_cours', 'appele'].includes(t.statut);
    if (filter === 'en_attente') return t.statut === 'en_attente';
    if (filter === 'en_cours')   return t.statut === 'en_cours' || t.statut === 'appele';
    if (filter === 'urgent')     return t.priorite === 'haute' || t.priorite === 'urgente' || t.est_urgent;
    if (filter === 'termine')    return ['termine', 'annule', 'absent'].includes(t.statut);
    return true;
  });

  const stats = {
    total: tickets.filter(t => ['en_attente', 'en_cours', 'appele'].includes(t.statut)).length,
    enAttente: tickets.filter(t => t.statut === 'en_attente').length,
    enCours: tickets.filter(t => t.statut === 'en_cours' || t.statut === 'appele').length,
    termines: tickets.filter(t => {
      const isPast = ['termine', 'absent', 'annule'].includes(t.statut);
      const isToday = new Date(t.created_at).toISOString().split('T')[0] === new Date().toISOString().split('T')[0];
      return isPast && isToday;
    }).length,
  };

  const appelerTicket = async (ticket, guichet = 'Guichet Central') => {
    setProcessing(true);
    try {
      const params = { guichet };
      if (selectedAgentForCall) {
        params.agent_id = selectedAgentForCall;
      }
      const { data } = await api.post(`/tickets/${ticket.id}/appeler`, null, { params });
      toast.success(`Ticket ${data.numero_ticket} appelé au ${data.guichet}`);
      setSelectedAgentForCall(null);
      loadData();
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Erreur lors de l\'appel');
    } finally {
      setProcessing(false);
    }
  };

  const marquerAbsent = async (ticket) => {
    setProcessing(true);
    try {
      await api.post(`/tickets/${ticket.id}/absent`);
      toast.success('Client marqué comme absent');
      loadData();
    } catch (e) {
      toast.error('Erreur lors de la mise à jour');
    } finally {
      setProcessing(false);
    }
  };

  const terminerTicket = async (ticket) => {
    setProcessing(true);
    try {
      await api.put(`/tickets/${ticket.id}/statut`, { statut: 'termine' });
      toast.success('Ticket marqué comme terminé');
      loadData();
    } catch (e) {
      toast.error('Erreur');
    } finally {
      setProcessing(false);
    }
  };

  const assignerAgent = async (ticketId, agentId) => {
    setProcessing(true);
    try {
      await api.put(`/tickets/${ticketId}/statut`, { 
        statut: 'en_cours',
        agent_id: agentId 
      });
      toast.success('Ticket assigné avec succès');
      setShowAssignModal(false);
      loadData();
    } catch (e) {
      toast.error('Erreur d\'assignation');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) return <Layout title="File d'attente agence"><PageLoader /></Layout>;

  return (
    <Layout title="Gestion de la file">
      <div className="page-header" style={{ marginBottom: 28 }}>
        <div>
          <h2 className="page-title"> Gestion de la file d'attente</h2>
          <p className="page-subtitle">Supervisez et gérez les flux clients en temps réel</p>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <select
            className="form-input"
            style={{ padding: '8px 12px', borderRadius: 8, minWidth: 180 }}
            value={selectedAgentForCall || ''}
            onChange={(e) => setSelectedAgentForCall(e.target.value || null)}
          >
            <option value="">Sans agent assigné</option>
            {agents.map(agent => (
              <option key={agent.id} value={agent.id}>{agent.nom}</option>
            ))}
          </select>
          <button className="btn btn-secondary btn-sm flex items-center gap-2" onClick={loadData}>
            <RefreshCw size={14} /> Actualiser
          </button>
          {lastUpdate && (
            <span style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
              Mis à jour : {lastUpdate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          )}
        </div>
      </div>

      <div className="grid-4" style={{ marginBottom: 28 }}>
        <SectionCard>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ padding: 10, background: 'rgba(59,130,246,0.1)', color: '#3b82f6', borderRadius: 10 }}>
              <Users size={24} />
            </div>
            <div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>Total Actifs</div>
              <div style={{ fontSize: 24, fontWeight: 800 }}>{stats.total}</div>
            </div>
          </div>
        </SectionCard>
        <SectionCard>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ padding: 10, background: 'rgba(245,158,11,0.1)', color: '#f59e0b', borderRadius: 10 }}>
              <Clock size={24} />
            </div>
            <div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>En attente</div>
              <div style={{ fontSize: 24, fontWeight: 800 }}>{stats.enAttente}</div>
            </div>
          </div>
        </SectionCard>
        <SectionCard>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ padding: 10, background: 'rgba(139,92,246,0.1)', color: '#8b5cf6', borderRadius: 10 }}>
              <Play size={24} />
            </div>
            <div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>En traitement</div>
              <div style={{ fontSize: 24, fontWeight: 800 }}>{stats.enCours}</div>
            </div>
          </div>
        </SectionCard>
        <SectionCard
          style={{ cursor: 'pointer', transition: 'all 0.2s', border: filter === 'termine' ? '2px solid #10b981' : '2px solid transparent' }}
          onClick={() => setFilter(filter === 'termine' ? 'tous' : 'termine')}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ padding: 10, background: 'rgba(16,185,129,0.1)', color: '#10b981', borderRadius: 10 }}>
              <History size={24} />
            </div>
            <div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>Terminés (Jour)</div>
              <div style={{ fontSize: 24, fontWeight: 800 }}>{stats.termines}</div>
              <div style={{ fontSize: 10, color: '#10b981', fontWeight: 600 }}>{filter === 'termine' ? '▲ Vue active' : 'Cliquer pour voir'}</div>
            </div>
          </div>
        </SectionCard>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, gap: 16 }}>
        <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 4 }}>
          {[
            { key: 'tous',       label: 'Tous actifs',   icon: ListFilter,   count: stats.total },
            { key: 'en_attente', label: 'En attente',    icon: Clock,        count: stats.enAttente },
            { key: 'en_cours',   label: 'En traitement', icon: Play,         count: stats.enCours },
            { key: 'urgent',     label: 'Urgents',       icon: AlertTriangle,count: null },
            { key: 'termine',    label: 'Terminés',      icon: History,      count: stats.termines, color: '#10b981' },
          ].map(({ key, label, icon: Icon, count, color }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              style={{
                padding: '10px 16px', borderRadius: 10, border: 'none',
                background: filter === key ? (color || 'var(--primary-500)') : 'var(--bg-card)',
                color: filter === key ? '#fff' : 'var(--text-secondary)',
                fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
                boxShadow: filter === key ? `0 4px 12px ${color ? color + '33' : 'rgba(59,130,246,0.2)'}` : 'none',
                whiteSpace: 'nowrap'
              }}
            >
              <Icon size={14} /> {label}
              {count !== null && count !== undefined && (
                <span style={{
                  background: filter === key ? 'rgba(255,255,255,0.25)' : 'var(--bg-elevated)',
                  color: filter === key ? '#fff' : (color || 'var(--primary-500)'),
                  fontSize: 11, fontWeight: 800, padding: '1px 7px', borderRadius: 20, minWidth: 22, textAlign: 'center'
                }}>{count}</span>
              )}
            </button>
          ))}
        </div>
        <div style={{ position: 'relative', width: 300 }}>
          <Search size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }} />
          <input 
            className="form-input" 
            placeholder="Rechercher ticket ou client..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ paddingLeft: 40, borderRadius: 12 }}
          />
        </div>
      </div>

      <SectionCard noPadding>
        {filteredTickets.length === 0 ? (
          <EmptyState 
            icon={<Ticket size={48} />}
            title="Aucun ticket trouvé" 
            message="Aucun client ne correspond aux critères actuels."
          />
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th style={{ width: 60, textAlign: 'center' }}>#</th>
                  <th>Ticket</th>
                  <th>Client</th>
                  <th>Service</th>
                  <th>Statut</th>
                  <th>Agent</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTickets.map((ticket, idx) => (
                  <tr key={ticket.id}>
                    <td style={{ textAlign: 'center', fontWeight: 800, color: 'var(--text-muted)' }}>{idx + 1}</td>
                    <td>
                      <div style={{ fontSize: 16, fontWeight: 900, color: 'var(--primary-600)' }}>{ticket.numero_ticket}</div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 700 }}>{ticket.client_nom || 'Anonyme'}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>ID: {ticket.client_id}</div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{ticket.service_nom || 'Standard'}</div>
                      {ticket.est_urgent && <span style={{ fontSize: 10, background: 'rgba(239,68,68,0.1)', color: '#ef4444', padding: '2px 6px', borderRadius: 4, fontWeight: 800 }}>URGENT</span>}
                    </td>
                    <td>
                      <StatusBadge statut={ticket.statut} />
                    </td>
                    <td>
                      {ticket.agent_nom ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <UserCheck size={14} color="var(--success-500)" />
                          <span style={{ fontSize: 13, fontWeight: 500 }}>{ticket.agent_nom}</span>
                        </div>
                      ) : (
                        <span style={{ fontSize: 13, color: 'var(--text-muted)', fontStyle: 'italic' }}>Non assigné</span>
                      )}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                        {ticket.statut === 'en_attente' && (
                          <>
                            <button className="btn btn-ghost btn-sm" style={{ color: '#3b82f6' }} title="Appeler" onClick={() => appelerTicket(ticket)}>
                              <PhoneCall size={16} />
                            </button>
                            <button className="btn btn-ghost btn-sm" style={{ color: '#8b5cf6' }} title="Assigner" onClick={() => { setSelectedTicket(ticket); setShowAssignModal(true); }}>
                              <UserCheck size={16} />
                            </button>
                          </>
                        )}
                        {(ticket.statut === 'appele' || ticket.statut === 'en_cours') && (
                          <>
                            {/* Bouton assigner si pas encore d'agent */}
                            {!ticket.agent_nom && (
                              <button className="btn btn-ghost btn-sm" style={{ color: '#8b5cf6' }} title="Assigner un agent" onClick={() => { setSelectedTicket(ticket); setShowAssignModal(true); }}>
                                <UserCheck size={16} />
                              </button>
                            )}
                            <button className="btn btn-ghost btn-sm" style={{ color: '#ef4444' }} title="Marquer absent" onClick={() => marquerAbsent(ticket)}>
                              <UserMinus size={16} />
                            </button>
                            <button className="btn btn-ghost btn-sm" style={{ color: '#10b981' }} title="Terminer" onClick={() => terminerTicket(ticket)}>
                              <Check size={16} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      {/* Modal Assignation */}
      <Modal isOpen={showAssignModal} onClose={() => setShowAssignModal(false)} title={`Assigner Ticket ${selectedTicket?.numero_ticket}`} maxWidth={450}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>Choisissez un agent disponible pour traiter ce client :</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 300, overflowY: 'auto', paddingRight: 4 }}>
            {agents.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 20, color: 'var(--text-secondary)' }}>Aucun agent trouvé</div>
            ) : (
              agents.map(agent => (
                <button 
                  key={agent.id}
                  onClick={() => assignerAgent(selectedTicket?.id, agent.id)}
                  disabled={processing}
                  style={{
                    padding: 14, borderRadius: 12, border: '1px solid var(--border-subtle)',
                    background: 'var(--bg-card)', cursor: 'pointer', textAlign: 'left',
                    display: 'flex', alignItems: 'center', gap: 12, transition: 'all 0.2s'
                  }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--primary-500)'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-subtle)'}
                >
                  <div style={{ width: 36, height: 36, borderRadius: 18, background: 'var(--primary-500)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800 }}>
                    {agent.nom?.charAt(0).toUpperCase()}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{agent.nom}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      Statut: <span style={{ color: agent.agent_status === 'disponible' ? '#10b981' : '#f59e0b', fontWeight: 600 }}>{agent.agent_status || 'Hors ligne'}</span>
                    </div>
                  </div>
                  <ChevronRight size={16} color="var(--text-muted)" />
                </button>
              ))
            )}
          </div>
          <button className="btn btn-secondary w-full" onClick={() => setShowAssignModal(false)} disabled={processing}>Annuler</button>
        </div>
      </Modal>
    </Layout>
  );
}