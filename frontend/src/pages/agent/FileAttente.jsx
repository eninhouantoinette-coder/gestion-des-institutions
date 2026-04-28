import React, { useEffect, useState } from 'react';
import Layout from '../../components/layout/Layout';
import { SectionCard, StatusBadge, PageLoader, FormSelect, Modal } from '../../components/ui';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import toast from 'react-hot-toast';

export default function FileAttente() {
  const { user } = useAuth();
  const { connectQueue } = useSocket() || {};
  const [agences, setAgences]   = useState([]);
  const [services, setServices] = useState([]);
  const [agenceId, setAgenceId] = useState('');
  const [serviceId, setServiceId] = useState('');
  const [file, setFile]         = useState([]);
  const [loading, setLoading]   = useState(true);
  const [calling, setCalling]   = useState(false);
  const [currentTicket, setCurrentTicket] = useState(null);
  const [showCallModal, setShowCallModal] = useState(false);
  const [ticketNumber, setTicketNumber] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    Promise.all([api.get('/agences'), api.get('/services')])
      .then(([a, s]) => {
        setAgences(a.data);
        setServices(s.data);
        
        // Priorité à l'agence de l'utilisateur (Agent)
        if (user?.agence_id) {
          setAgenceId(String(user.agence_id));
        } else if (a.data.length > 0) {
          setAgenceId(String(a.data[0].id));
        }
      })
      .catch(err => {
        console.error("Erreur chargement métadonnées", err);
      })
      .finally(() => setLoading(false));
  }, [user]);

  useEffect(() => {
    if (agenceId) {
      loadFile();
      connectQueue?.(agenceId, () => loadFile());
    }
  }, [agenceId]); // eslint-disable-line

  // Polling automatique toutes les 5 secondes pour mise à jour
  useEffect(() => {
    if (!agenceId) return;
    
    const interval = setInterval(() => {
      loadFile();
    }, 5000); // 5 secondes

    return () => clearInterval(interval);
  }, [agenceId]);

  const loadFile = async () => {
    try {
      const { data } = await api.get(`/tickets/file/${agenceId}`);
      setFile(data);
    } catch {}
  };

  const appelerSuivant = async () => {
    if (!agenceId) return;
    setCalling(true);
    try {
      const params = { agence_id: agenceId };
      if (serviceId) params.service_id = serviceId;
      const { data } = await api.post('/tickets/appeler-suivant', null, { params });
      if (data.ticket) {
        toast.success(`Ticket ${data.ticket} appelé !`);
        loadFile();
      } else {
        toast('File vide, aucun client à appeler');
      }
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Erreur');
    } finally { setCalling(false); }
  };

  const terminerTicket = async (id) => {
    setProcessing(true);
    try {
      await api.put(`/tickets/${id}/statut`, { statut: 'termine' });
      setFile(prev => prev.filter(t => t.id !== id));
      if (currentTicket?.id === id) setCurrentTicket(null);
      toast.success('Ticket clôturé avec succès');
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Erreur lors de la clôture');
    } finally {
      setProcessing(false);
    }
  };

  const appelerTicketSpecifique = async () => {
    if (!ticketNumber.trim()) return toast.error('Entrez un numéro de ticket');
    
    setProcessing(true);
    try {
      const ticket = file.find(t => t.numero_ticket === ticketNumber.toUpperCase());
      if (!ticket) {
        return toast.error('Ticket non trouvé dans la file');
      }
      
      const { data } = await api.post(`/tickets/${ticket.id}/appeler`, null, {
        params: { guichet: user.guichet || 'Guichet 1' }
      });
      
      toast.success(`Ticket ${data.ticket} appelé !`);
      setCurrentTicket(ticket);
      setShowCallModal(false);
      setTicketNumber('');
      loadFile();
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
      if (currentTicket?.id === ticket.id) setCurrentTicket(null);
      loadFile();
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Erreur');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) return <Layout title="File d'attente"><PageLoader /></Layout>;

  return (
    <Layout title="File d'attente">
      {/* En-tête avec stats */}
      <div className="page-header flex justify-between items-center">
        <div>
          <h2 className="page-title">File d'attente</h2>
          <p className="page-subtitle">{file.length} client(s) en attente | {currentTicket ? '1 en traitement' : 'Disponible'}</p>
        </div>

        <div style={{ display: 'flex', gap: 12 }}>
          <button className="btn btn-secondary" onClick={() => setShowCallModal(true)}>
            Appeler spécifique
          </button>
          <button className="btn btn-secondary" onClick={loadFile}>
            Actualiser
          </button>
          <button
            id="btn-appeler-suivant"
            className="btn btn-primary"
            onClick={appelerSuivant}
            disabled={calling || file.length === 0 || processing}
          >
            {calling ? 'Appel...' : 'Appeler le suivant'}
          </button>
        </div>
      </div>

      {/* Ticket en cours */}
      {currentTicket && (
        <div style={{
          background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
          borderRadius: 16,
          padding: 24,
          color: '#fff',
          marginBottom: 24,
          boxShadow: '0 10px 25px -5px rgba(59,130,246,0.4)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
            <div>
              <div style={{ fontSize: 12, opacity: 0.9, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1 }}>Client en cours de traitement</div>
              <div style={{ fontSize: 42, fontWeight: 900, letterSpacing: 2 }}>{currentTicket.numero_ticket}</div>
              <div style={{ fontSize: 18, fontWeight: 600, marginTop: 8 }}>
                 {currentTicket.client_nom || 'Client anonyme'}
              </div>
              <div style={{ fontSize: 14, opacity: 0.8, marginTop: 4 }}>
                Service: {currentTicket.service_nom || 'Non spécifié'}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <button
                onClick={() => marquerAbsent(currentTicket)}
                disabled={processing}
                className="btn"
                style={{ 
                  background: 'rgba(255,255,255,0.15)', 
                  color: '#fff', 
                  border: '1px solid rgba(255,255,255,0.25)',
                  padding: '10px 20px',
                  fontWeight: 600
                }}
              >
                Client absent
              </button>
              <button
                onClick={() => terminerTicket(currentTicket.id)}
                disabled={processing}
                className="btn"
                style={{ 
                  background: '#10b981', 
                  color: '#fff',
                  padding: '10px 24px',
                  boxShadow: '0 4px 12px rgba(16,185,129,0.3)',
                  fontWeight: 700
                }}
              >
                Terminer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filtres */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 16, alignItems: 'flex-end' }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8 }}>Agence</label>
            <div style={{ 
              padding: '10px 16px', 
              background: 'var(--bg-elevated)', 
              borderRadius: 10, 
              border: '1px solid var(--border-subtle)',
              fontSize: 14,
              fontWeight: 700,
              color: 'var(--text-primary)'
            }}>
              {agences.find(a => String(a.id) === String(agenceId))?.nom || 'Chargement...'}
            </div>
          </div>
          <div style={{ flex: 1 }}>
            <FormSelect 
              label="Service"
              value={serviceId}
              onChange={e => setServiceId(e.target.value)}
              options={[{ value: '', label: 'Tous les services' }, ...services.map(s => ({ value: s.id, label: s.nom }))]}
            />
          </div>
        </div>
      </div>

      <SectionCard title="Clients en attente">
        {file.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-muted)' }}>
            <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--text-secondary)' }}>File vide !</div>
            <p style={{ fontSize: 13, marginTop: 4 }}>Tous les clients ont été traités</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {file.map((t, i) => (
              <div
                key={t.id}
                style={{
                  display: 'flex', alignItems: 'center', gap: 14,
                  padding: '14px 16px',
                  background: i === 0 ? 'rgba(59,130,246,0.05)' : 'var(--bg-elevated)',
                  borderRadius: 12,
                  border: i === 0 ? '1px solid rgba(59,130,246,0.2)' : '1px solid var(--border-subtle)',
                }}
              >
                {/* Position */}
                <div style={{
                  width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                  background: i === 0 ? 'var(--primary-600)' : 'var(--bg-card)',
                  color: i === 0 ? '#fff' : 'var(--text-muted)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 800, fontSize: 14,
                  boxShadow: i === 0 ? '0 4px 10px rgba(59,130,246,0.3)' : 'none',
                }}>
                  {i + 1}
                </div>

                {/* Ticket info */}
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontWeight: 800, fontSize: 16, letterSpacing: 1 }}>{t.numero_ticket}</span>
                    {i === 0 && <span style={{
                      background: 'rgba(59,130,246,0.15)', color: '#60a5fa',
                      fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, textTransform: 'uppercase',
                    }}>Prochain</span>}
                    {t.priorite_score > 50 && <span style={{
                      background: 'rgba(239,68,68,0.15)', color: '#f87171',
                      fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
                    }}>Urgent</span>}
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 3 }}>
                    {t.client_nom || 'Client anonyme'} — Attente : {t.temps_estime} min
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={() => {
                      api.post(`/tickets/${t.id}/appeler`, null, { params: { guichet: user.guichet || 'Guichet 1' } })
                        .then(({ data }) => {
                          toast.success(`Ticket ${data.ticket} appelé !`);
                          setCurrentTicket(t);
                          loadFile();
                        })
                        .catch(e => toast.error(e?.response?.data?.detail || 'Erreur'));
                    }}
                    disabled={processing}
                    className="btn btn-ghost btn-sm"
                    style={{ color: '#3b82f6', borderColor: 'rgba(59,130,246,0.2)', fontSize: 11, fontWeight: 700 }}
                  >
                    Appeler
                  </button>
                  <button
                    onClick={() => marquerAbsent(t)}
                    disabled={processing}
                    className="btn btn-ghost btn-sm"
                    style={{ color: '#ef4444', borderColor: 'rgba(239,68,68,0.2)', fontSize: 11, fontWeight: 700 }}
                  >
                    Absent
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      {/* Modal appel spécifique */}
      <Modal isOpen={showCallModal} onClose={() => { setShowCallModal(false); setTicketNumber(''); }} title="Appeler un ticket spécifique">
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <p style={{ color: 'var(--text-muted)', marginBottom: 20 }}>
            Entrez le numéro du ticket à appeler
          </p>
          <input
            type="text"
            value={ticketNumber}
            onChange={(e) => setTicketNumber(e.target.value.toUpperCase())}
            className="form-input"
            placeholder="Ex: A001"
            style={{ textAlign: 'center', fontSize: 24, fontWeight: 700, letterSpacing: 2, marginBottom: 24 }}
            onKeyPress={(e) => e.key === 'Enter' && appelerTicketSpecifique()}
          />
          <div style={{ display: 'flex', gap: 12 }}>
            <button onClick={() => setShowCallModal(false)} className="btn btn-secondary flex-1">
              Annuler
            </button>
            <button onClick={appelerTicketSpecifique} disabled={processing} className="btn btn-primary flex-1 flex items-center justify-center">
              Appeler
            </button>
          </div>
        </div>
      </Modal>
    </Layout>
  );
}