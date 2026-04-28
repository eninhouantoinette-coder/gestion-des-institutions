import React, { useEffect, useState, useRef } from 'react';
import Layout from '../../components/layout/Layout';
import { SectionCard, StatusBadge, PageLoader, Modal, FormSelect, EmptyState } from '../../components/ui';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import toast from 'react-hot-toast';
import { 
  Users, Ticket, Calendar, AlertTriangle, X, Check, 
  RotateCcw, Plus, Play, Pause, UserCheck, UserMinus,
  Monitor, Briefcase, Clock, ShieldAlert, ChevronRight
} from 'lucide-react';

export default function GestionAgents() {
  const { user } = useAuth();
  const { notifications, connectQueue } = useSocket() || { notifications: [], connectQueue: null };
  const [agents, setAgents]   = useState([]);
  const [taches, setTaches]   = useState([]);
  const [tickets, setTickets] = useState([]);
  const [rdvs, setRdvs]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selTache, setSelTache]   = useState('');
  const [selAgent, setSelAgent]   = useState('');
  const [assigning, setAssigning] = useState(false);
  
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignType, setAssignType] = useState(''); 
  const [assignItem, setAssignItem] = useState(null);
  const [selectedAgent, setSelectedAgent] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState({});
  const [lastUpdate, setLastUpdate] = useState(null);
  
  const [surchargeAlert, setSurchargeAlert] = useState(null);
  const [dismissedSurcharge, setDismissedSurcharge] = useState(false);
  const lastDetectionTime = useRef(0);

  const load = async () => {
    try {
      const agenceId = user?.agence_id;
      const [ag, ta, ti, rd] = await Promise.all([
        api.get('/users', { params: { role: 'agent', agence_id: agenceId, per_page: 50 } }),
        api.get('/taches', { params: { statut: 'a_faire', agence_id: agenceId } }),
        api.get('/tickets', { params: { statut: 'en_attente', agence_id: agenceId } }),
        api.get('/rendezvous', { params: { statut: 'confirme', agence_id: agenceId } }),
      ]);
      setAgents(ag.data?.items || []);
      setTaches(ta.data || []);
      setTickets(ti.data?.items || ti.data || []);
      setRdvs(rd.data?.items || rd.data || []);
      setLastUpdate(new Date());
    } catch (e) {
      console.error('Error loading management data', e);
    } finally { 
      setLoading(false); 
    }
  };

  // Chargement initial
  useEffect(() => { load(); }, [user]); // eslint-disable-line

  // Polling automatique toutes les 20s
  useEffect(() => {
    const interval = setInterval(load, 20000);
    return () => clearInterval(interval);
  }, [user]); // eslint-disable-line

  // WebSocket : recharger dès qu'un événement de file survient
  useEffect(() => {
    if (!user?.agence_id || !connectQueue) return;
    connectQueue(user.agence_id, () => { load(); });
  }, [user?.agence_id]); // eslint-disable-line
  
  const checkSurcharge = async () => {
    try {
      const { data } = await api.get('/tickets/surcharge/verifier');
      if (data.surcharge_detectee) {
        setSurchargeAlert(data);
        lastDetectionTime.current = Date.now();
        setDismissedSurcharge(false);
      } else if (Date.now() - lastDetectionTime.current > 15000) {
        setSurchargeAlert(null);
      }
    } catch (e) {}
  };

  useEffect(() => {
    const interval = setInterval(checkSurcharge, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const surchargeMsgs = notifications.filter(n => n.event === 'surcharge_detectee' || n.type === 'surcharge');
    if (surchargeMsgs.length > 0) {
      setSurchargeAlert(surchargeMsgs[0].data || surchargeMsgs[0]);
      lastDetectionTime.current = Date.now();
      setDismissedSurcharge(false);
    }
  }, [notifications]);

  const assignerDirect = async () => {
    if (!selectedAgent || !assignItem) return toast.error('Sélectionnez un agent');
    setAssigning(true);
    try {
      const agentIdNum = parseInt(selectedAgent);
      await api.post('/taches', {
        agent_id: agentIdNum,
        titre: assignType === 'ticket' ? `Traiter ticket ${assignItem.numero_ticket}` : `RDV Client: ${assignItem.client_nom}`,
        description: `Traitement manuel assigné par le Manager.`,
        priorite: 'haute'
      });
      
      const endpoint = assignType === 'ticket' ? `/tickets/${assignItem.id}/appeler` : `/rendezvous/${assignItem.id}/valider`;
      await api.post(endpoint, null, { params: { guichet: agents.find(a => a.id === agentIdNum)?.guichet || 'Guichet Central' } });
      
      toast.success('Assignation réussie !');
      setShowAssignModal(false);
      setSelectedAgent('');
      setAssignItem(null);

      // ✅ Suppression immédiate (optimiste) de l'item de la liste correspondante
      if (assignType === 'rdv') {
        setRdvs(prev => prev.filter(r => r.id !== assignItem.id));
      } else if (assignType === 'ticket') {
        setTickets(prev => prev.filter(t => t.id !== assignItem.id));
      }

      // Rechargement en arrière-plan pour synchroniser
      load();
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Erreur lors de l\'assignation');
    } finally { setAssigning(false); }
  };


  const changeAgentStatus = async (agentId, newStatus) => {
    setUpdatingStatus(prev => ({ ...prev, [agentId]: true }));
    try {
      await api.put(`/users/${agentId}`, { agent_status: newStatus });
      toast.success('Statut mis à jour');
      load();
    } catch {
      toast.error('Erreur');
    } finally {
      setUpdatingStatus(prev => ({ ...prev, [agentId]: false }));
    }
  };

  const activerAgentReserve = async (agentId) => {
    try {
      await api.post(`/tickets/surcharge/activer-reserve/${agentId}`);
      toast.success('Agent activé !');
      load();
      setSurchargeAlert(null);
    } catch (e) {
      toast.error('Erreur lors de l\'activation');
    }
  };

  if (loading) return <Layout title="Gestion Agents"><PageLoader /></Layout>;

  return (
    <Layout title="Gestion des agents">
      <div className="page-header">
        <div>
          <h2 className="page-title">👥 Gestion des agents</h2>
          <p className="page-subtitle">Pilotez les ressources et les flux en temps réel</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {lastUpdate && (
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              Mis à jour : {lastUpdate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          )}
          <button className="btn btn-secondary btn-sm flex items-center gap-2" onClick={load}>
            <RotateCcw size={14} /> Rafraîchir
          </button>
        </div>
      </div>

      {surchargeAlert && !dismissedSurcharge && (
        <div style={{
          background: 'linear-gradient(135deg, #ef4444, #dc2626)',
          borderRadius: 16, padding: '20px 24px', marginBottom: 28, color: '#white',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: 20, boxShadow: '0 10px 25px -5px rgba(239, 68, 68, 0.4)',
          position: 'relative', transition: 'all 0.3s ease'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 18, color: 'white' }}>
            <div style={{
              width: 52, height: 52, borderRadius: '50%',
              background: 'rgba(255,255,255,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <ShieldAlert size={28} />
            </div>
            <div>
              <div style={{ fontWeight: 900, fontSize: 18, marginBottom: 2 }}>ALERTE SURCHARGE DÉTECTÉE</div>
              <div style={{ fontSize: 14, fontWeight: 500, opacity: 0.9 }}>
                {surchargeAlert.tickets_en_attente || 0} clients attendent. Temps estimé : <strong>{surchargeAlert.temps_attente_moyen || 0} min</strong>
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {surchargeAlert.suggestions?.map((sug) => (
              <button
                key={sug.agent_id}
                onClick={() => activerAgentReserve(sug.agent_id)}
                className="btn btn-white btn-sm font-bold"
                style={{ color: '#ef4444', border: 'none', background: 'white' }}
              >
                Activer {sug.nom}
              </button>
            ))}
            <button onClick={() => setDismissedSurcharge(true)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', padding: 8, opacity: 0.8 }}>
              <X size={20} />
            </button>
          </div>
        </div>
      )}

      <div className="grid-3" style={{ gap: 24 }}>
        {/* Agents List */}
        <SectionCard title="Statut des agents" bodyStyle={{ padding: 0 }}>
          {agents.length === 0 ? (
            <EmptyState compact title="Aucun agent" />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {agents.map(ag => (
                <div key={ag.id} style={{ padding: 16, borderBottom: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 32, height: 32, borderRadius: 16, background: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 12 }}>
                        {ag.nom?.charAt(0)}
                      </div>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>{ag.nom}</div>
                    </div>
                    <StatusBadge statut={ag.agent_status || 'hors_ligne'} />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
                    {['disponible', 'en_pause', 'en_reserve'].map(s => (
                      <button 
                        key={s} 
                        onClick={() => changeAgentStatus(ag.id, s)}
                        disabled={updatingStatus[ag.id]}
                        className={`btn btn-xs ${ag.agent_status === s ? 'btn-primary' : 'btn-ghost'}`}
                        style={{ fontSize: 10, textTransform: 'capitalize' }}
                      >
                        {s.replace('_', ' ')}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        {/* Tickets Queue */}
        <SectionCard title="Salles d'attente" bodyStyle={{ padding: 0 }}>
          {tickets.length === 0 ? (
            <EmptyState compact title="File vide" />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {tickets.map(t => (
                <div key={t.id} style={{ padding: 14, borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ fontSize: 15, fontWeight: 900, color: 'var(--primary-600)' }}>{t.numero_ticket}</div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{t.client_nom || 'Anonyme'}</div>
                  </div>
                  <button 
                    className="btn btn-ghost btn-xs text-primary font-bold" 
                    onClick={() => { setAssignType('ticket'); setAssignItem(t); setShowAssignModal(true); }}
                  >
                    Assigner <ChevronRight size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        {/* RDV List */}
        <SectionCard title="Rendez-vous" bodyStyle={{ padding: 0 }}>
          {rdvs.length === 0 ? (
            <EmptyState compact title="Aucun RDV" />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {rdvs.map(r => (
                <div key={r.id} style={{ padding: 14, borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{r.client_nom}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Clock size={10} /> {r.date_heure ? new Date(r.date_heure).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '--:--'}
                    </div>
                  </div>
                  <button 
                    className="btn btn-ghost btn-xs text-purple-600 font-bold" 
                    onClick={() => { setAssignType('rdv'); setAssignItem(r); setShowAssignModal(true); }}
                  >
                    Appeler
                  </button>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>

      {/* Assignation Modal */}
      <Modal isOpen={showAssignModal} onClose={() => setShowAssignModal(false)} title="Assignation forcée" maxWidth={450}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ padding: 16, background: 'var(--bg-elevated)', borderRadius: 12, borderLeft: '4px solid var(--primary-500)' }}>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 4 }}>Assigner :</p>
            <div style={{ fontWeight: 800, fontSize: 18 }}>{assignType === 'ticket' ? assignItem?.numero_ticket : assignItem?.client_nom}</div>
          </div>
          
          <FormSelect
            label="Choisir l'agent traitant"
            value={selectedAgent}
            onChange={(e) => setSelectedAgent(e.target.value)}
            options={[
              { value: '', label: '-- Sélectionner un agent --' },
              ...agents.map(a => ({ value: a.id, label: `${a.nom} (${a.agent_status || 'Hors-ligne'})` }))
            ]}
          />

          <div style={{ marginTop: 10, display: 'flex', gap: 12 }}>
            <button className="btn btn-secondary flex-1" onClick={() => setShowAssignModal(false)}>Annuler</button>
            <button className="btn btn-primary flex-1 font-bold" onClick={assignerDirect} disabled={assigning || !selectedAgent}>
              {assigning ? 'Traitement...' : 'Appeler au guichet'}
            </button>
          </div>
        </div>
      </Modal>

      <style>{`
        .btn-white { background: white; color: #ef4444; border: 1px solid #ef4444; }
        .btn-white:hover { background: #fef2f2; }
      `}</style>
    </Layout>
  );
}