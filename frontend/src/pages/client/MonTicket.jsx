import React, { useEffect, useState, useCallback, useRef } from 'react';
import Layout from '../../components/layout/Layout';
import { SectionCard, StatusBadge, PageLoader, FormSelect, Modal } from '../../components/ui';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import toast from 'react-hot-toast';
import { QRCodeSVG } from 'qrcode.react';

export default function MonTicket() {
  const { user }             = useAuth();
  const { connectQueue, notifications } = useSocket() || {};
  const [ticket, setTicket]  = useState(null);
  const [institutions, setInstitutions] = useState([]);
  const [services, setServices] = useState([]);
  const [agences, setAgences]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [form, setForm]   = useState({ institution_id: '', agence_id: '', service_id: '', est_urgent: false });
  const [generating, setGenerating] = useState(false);
  const loadedRef = useRef(false);

  const loadData = useCallback(async () => {
    if (!user?.id) return;
    try {
      const [inst, svc, agc, tkts] = await Promise.all([
        api.get('/institutions'),
        api.get('/services'),
        api.get('/agences'),
        api.get('/tickets', { params: { statut: 'en_attente' } }),
      ]);
      setInstitutions(inst.data || []);
      setServices(svc.data || []);
      setAgences(agc.data || []);
      
            const myTicket = tkts.data?.find(t => t.client_id === user?.id);
      setTicket(myTicket || null);
    } catch (e) {
      toast.error('Erreur lors du chargement des données');
    } finally { 
      setLoading(false); 
    }
  }, [user?.id]);

  // Debug pour surveiller les changements du formulaire
  useEffect(() => {
    console.log('=== FORM STATE CHANGE ===');
    console.log('form.institution_id:', form.institution_id);
    console.log('form.agence_id:', form.agence_id);
    console.log('agences.length:', agences.length);
  }, [form.institution_id, agences.length]);

  useEffect(() => { 
    if (!loadedRef.current) {
      loadData();
      loadedRef.current = true;
    }
  }, [loadData]);

  // WebSocket connection with error handling
  useEffect(() => {
    if (!ticket || !ticket.agence_id) return;
    
    try {
      connectQueue?.(ticket.agence_id);
    } catch (error) {
      console.warn('WebSocket connection failed:', error);
      // Continue without WebSocket - fallback to polling only
    }
  }, [ticket?.agence_id, connectQueue]);

  // Notifications handler
  useEffect(() => {
    if (!user?.id || !notifications) return;
    
    const lastNotif = notifications[0];
    if (!lastNotif) return;

    if (lastNotif.event === 'ticket_termine' && lastNotif.data?.ticket_id === ticket?.id) {
      toast.success(lastNotif.data.message || 'Votre ticket a été traité. Merci !');
      setTicket(null);
    }
    
    if (lastNotif.event === 'ticket_appele_detail' && lastNotif.data?.ticket_id === ticket?.id) {
      const data = lastNotif.data;
      toast.success(data.message || `Présentez-vous au ${data.guichet || 'guichet'}`, { duration: 10000 });
      setTicket(prev => prev ? {
        ...prev,
        guichet: data.guichet,
        service_nom: data.service,
        statut: 'en_cours'
      } : null);
    }
  }, [notifications, ticket?.id, user?.id]);

  // Polling position
  useEffect(() => {
    if (!ticket) return;

    const interval = setInterval(async () => {
      try {
        const { data } = await api.get(`/tickets/position/${ticket.id}`);
        if (!data || data.statut === 'termine') {
          setTicket(null);
          toast.success('Votre ticket a été traité.');
        } else {
          setTicket(prev => prev ? { ...prev, ...data } : null);
        }
      } catch {
        setTicket(null);
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [ticket?.id]);

  const generer = async () => {
    if (!form.institution_id || !form.agence_id || !form.service_id) {
      return toast.error('Sélectionnez une institution, une agence et un service');
    }
    setGenerating(true);
    try {
      const { data } = await api.post('/tickets/generer', {
        institution_id: parseInt(form.institution_id),
        agence_id: parseInt(form.agence_id),
        service_id: parseInt(form.service_id),
        est_urgent: form.est_urgent,
      });
      setTicket(data);
      setShowModal(false);
      setForm({ institution_id: '', agence_id: '', service_id: '', est_urgent: false });
      toast.success(`Ticket ${data.numero_ticket} généré ! Position : ${data.position}`);
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Erreur lors de la génération');
    } finally { 
      setGenerating(false); 
    }
  };

  const annuler = async () => {
    if (!ticket) return;
    try {
      await api.put(`/tickets/${ticket.id}/statut`, { statut: 'annule' });
      setTicket(null);
      toast.success('Ticket annulé');
      return true;
    } catch (e) {
      toast.error('Erreur lors de l\'annulation');
      return false;
    }
  };

  const handlePrendreTicketClick = () => {
    if (ticket) setShowConfirmModal(true);
    else setShowModal(true);
  };

  const confirmerAnnulerEtReprendre = async () => {
    setShowConfirmModal(false);
    const cancelled = await annuler();
    if (cancelled) setShowModal(true);
  };

  if (loading) return <Layout title="Mon Ticket"><PageLoader /></Layout>;

  const positionPercent = ticket ? Math.max(5, Math.min(100, 100 - (ticket.position * 10))) : 0;

  return (
    <Layout title="Mon Ticket">
      <div className="page-header">
        <h2 className="page-title">File d'attente virtuelle</h2>
        <p className="page-subtitle">Suivez votre progression et votre position en temps réel</p>
      </div>

      {!ticket ? (
        <div style={{ maxWidth: 500, margin: '40px auto' }}>
          <SectionCard>
            <div style={{ padding: '40px 20px', textAlign: 'center' }}>
              <div style={{ 
                width: 70, height: 70, borderRadius: 20, background: 'rgba(59,130,246,0.1)', 
                display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px',
                color: '#3b82f6', fontWeight: 900, fontSize: 32
              }}>
                FILE
              </div>
              <h3 style={{ fontSize: 24, fontWeight: 900, marginBottom: 12 }}>Aucun ticket actif</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: 15, lineHeight: 1.6, marginBottom: 32 }}>
                Générez un ticket virtuel pour rejoindre la file d'attente à distance. 
                Vous serez alerté dès que votre tour approchera.
              </p>
              <button 
                className="btn btn-primary btn-lg w-full" 
                onClick={handlePrendreTicketClick}
                style={{ padding: '16px', borderRadius: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5 }}
              >
                Prendre un ticket virtuel
              </button>
            </div>
          </SectionCard>
        </div>
      ) : (
        <div style={{ maxWidth: 650, margin: '0 auto' }}>
          {/* Ticket Visual */}
          <div className="ticket-card" style={{ 
            background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
            color: 'white', borderRadius: 24, padding: '32px', position: 'relative', overflow: 'hidden',
            boxShadow: '0 25px 50px -12px rgba(37,99,235,0.4)', marginBottom: 24
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1.5, opacity: 0.8, marginBottom: 4 }}>
                   Attestation Virtuelle
                </div>
                <div style={{ fontSize: 18, fontWeight: 900 }}>BanqueQueue Service</div>
              </div>
              <div style={{ fontSize: 13, fontWeight: 800, background: 'rgba(255,255,255,0.2)', padding: '6px 14px', borderRadius: 10, letterSpacing: 1 }}>
                TK-{ticket.id}
              </div>
            </div>

            <div style={{ textAlign: 'center', marginBottom: 36 }}>
              <div style={{ fontSize: 12, fontWeight: 700, opacity: 0.9, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 2 }}>Votre Numéro</div>
              <div style={{ fontSize: 84, fontWeight: 900, lineHeight: 1, letterSpacing: -1 }}>{ticket.numero_ticket}</div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
              <div style={{ textAlign: 'center', background: 'rgba(255,255,255,0.1)', padding: '16px', borderRadius: 16 }}>
                <div style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', opacity: 0.8, marginBottom: 6, letterSpacing: 1 }}>Position Actuelle</div>
                <div style={{ fontSize: 32, fontWeight: 900 }}>#{ticket.position}</div>
              </div>
              <div style={{ textAlign: 'center', background: 'rgba(255,255,255,0.1)', padding: '16px', borderRadius: 16 }}>
                <div style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', opacity: 0.8, marginBottom: 6, letterSpacing: 1 }}>Temps Estimé</div>
                <div style={{ fontSize: 32, fontWeight: 900 }}>{ticket.temps_estime} MIN</div>
              </div>
            </div>

            <div style={{ marginTop: 32 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontWeight: 800, marginBottom: 10, textTransform: 'uppercase' }}>
                <span>Progression de la file</span>
                <span>{Math.round(positionPercent)}%</span>
              </div>
              <div style={{ height: 8, background: 'rgba(255,255,255,0.2)', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{ width: `${positionPercent}%`, height: '100%', background: 'white', transition: 'width 1s ease' }} />
              </div>
            </div>
            
            <div style={{ position: 'absolute', bottom: -20, left: '50%', transform: 'translateX(-50%)', width: '90%', height: 40, borderTop: '2px dashed rgba(255,255,255,0.3)' }} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 220px', gap: 20 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <SectionCard title="État du service">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 12, borderBottom: '1px solid var(--border-subtle)' }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: 14, fontWeight: 600 }}>Statut actuel</span>
                    <StatusBadge statut={ticket.statut} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 12, borderBottom: '1px solid var(--border-subtle)' }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: 14, fontWeight: 600 }}>Agence</span>
                    <span style={{ fontWeight: 700 }}>{agences.find(a => a.id === ticket.agence_id)?.nom || 'Agence locale'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 12, borderBottom: '1px solid var(--border-subtle)' }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: 14, fontWeight: 600 }}>Service</span>
                    <span style={{ fontWeight: 700, color: 'var(--primary-600)' }}>{services.find(s => s.id === ticket.service_id)?.nom || ticket.service_nom || 'Opération courante'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 12, borderBottom: '1px solid var(--border-subtle)' }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: 14, fontWeight: 600 }}>Heure estimée</span>
                    <span style={{ fontWeight: 700, color: 'var(--info-600)' }}>
                      {(() => {
                        // Utiliser l'heure de création du ticket pour un calcul fixe
                        if (ticket.temps_estime && ticket.temps_estime > 0 && ticket.created_at) {
                          const createdAt = new Date(ticket.created_at);
                          const estimatedTime = new Date(createdAt.getTime() + ticket.temps_estime * 60000);
                          return estimatedTime.toLocaleTimeString('fr-FR', { 
                            hour: '2-digit', 
                            minute: '2-digit',
                            hour12: false 
                          });
                        }
                        return ticket.heure_estimee || 'En attente...';
                      })()}
                    </span>
                  </div>
                  
                  {ticket.guichet && (
                    <div style={{ padding: 16, background: 'rgba(16,185,129,0.06)', borderRadius: 16, border: '1px solid rgba(16,185,129,0.2)', textAlign: 'center' }}>
                      <div style={{ fontSize: 11, color: 'var(--success-600)', fontWeight: 800, textTransform: 'uppercase', marginBottom: 4, letterSpacing: 0.5 }}>Veuillez vous présenter au</div>
                      <div style={{ fontSize: 32, fontWeight: 900, color: 'var(--success-700)', textTransform: 'uppercase' }}>{ticket.guichet}</div>
                      {ticket.agent_nom && <div style={{ fontSize: 13, marginTop: 4, fontWeight: 700 }}>Agent chargé : {ticket.agent_nom}</div>}
                    </div>
                  )}

                  {ticket.position <= 3 && !ticket.guichet && (
                    <div style={{ padding: '16px 20px', background: 'rgba(234,179,8,0.08)', borderRadius: 16, border: '1px solid rgba(234,179,8,0.3)' }}>
                      <div style={{ fontWeight: 800, color: 'var(--warning-700)', fontSize: 15, marginBottom: 4, textTransform: 'uppercase' }}>Tour imminent !</div>
                      <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.4 }}>Veuillez vous rapprocher de la zone d'attente des guichets.</div>
                    </div>
                  )}
                </div>
                
                <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
                  <button className="btn btn-outline flex-1" onClick={loadData} style={{ fontWeight: 700 }}>
                     Actualiser
                  </button>
                  <button className="btn btn-danger flex-1" onClick={annuler} style={{ fontWeight: 700 }}>
                     Annuler
                  </button>
                </div>
              </SectionCard>
            </div>

            <SectionCard title="Code d'accès">
              <div style={{ textAlign: 'center' }}>
                <div style={{ background: 'white', padding: 12, borderRadius: 16, border: '1px solid var(--border-subtle)', display: 'inline-block', marginBottom: 12, boxShadow: 'var(--shadow-sm)' }}>
                  <QRCodeSVG value={`ticket:${ticket.numero_ticket}:${ticket.id}`} size={160} />
                </div>
                <p style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.5, padding: '0 8px', fontWeight: 600 }}>
                  PRÉSENTEZ CE CODE À VOTRE ARRIVÉE POUR VALIDATION.
                </p>
              </div>
            </SectionCard>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      <Modal isOpen={showConfirmModal} onClose={() => setShowConfirmModal(false)} title="Action requise" maxWidth={450}>
        <div style={{ textAlign: 'center', padding: '10px 0' }}>
          <div style={{ 
            width: 60, height: 60, borderRadius: 16, background: 'rgba(239,68,68,0.1)', 
            display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', color: '#ef4444',
            fontWeight: 900, fontSize: 24
          }}>
            !
          </div>
          <h3 style={{ fontSize: 18, fontWeight: 900, marginBottom: 12 }}>Remplacer votre ticket ?</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: 14, lineHeight: 1.6, marginBottom: 28 }}>
            Vous avez déjà un ticket actif (<strong>{ticket?.numero_ticket}</strong>). 
            Voulez-vous l'annuler pour en générer un nouveau ?
          </p>
          <div style={{ display: 'flex', gap: 12 }}>
            <button className="btn btn-tertiary flex-1" onClick={() => setShowConfirmModal(false)}>Conserver l'actuel</button>
            <button className="btn btn-danger flex-1" onClick={confirmerAnnulerEtReprendre}>Annuler et Refaire</button>
          </div>
        </div>
      </Modal>

      {/* Create Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Prendre un ticket" maxWidth={500}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20, padding: '4px' }}>
          <FormSelect
            label="Choisir l'institution"
            value={form.institution_id}
            onChange={e => {
              const newValue = e.target.value;
              console.log('Institution sélectionnée:', newValue);
              setForm(f => ({ 
                ...f, 
                institution_id: newValue, 
                agence_id: '', 
                service_id: '' 
              }));
            }}
            options={[
              { value: '', label: 'Sélectionnez une banque...' },
              ...institutions.map(i => ({ value: i.id, label: i.nom })),
            ]}
          />
          <div className="grid-2">
            <FormSelect
              key={`agences-${form.institution_id}`}
              label="Agence"
              value={form.agence_id}
              onChange={e => setForm(f => ({ ...f, agence_id: e.target.value }))}
              disabled={!form.institution_id}
              options={[
                { value: '', label: 'Choisir...' },
                ...(() => {
                  if (!form.institution_id) return [];
                  
                  // Solution simple : filtrer par nom d'institution
                  const institutionName = institutions.find(i => i.id === parseInt(form.institution_id))?.nom?.toLowerCase() || '';
                  console.log('Institution name:', institutionName);
                  
                  const filtered = agences.filter(a => 
                    a.nom.toLowerCase().includes(institutionName)
                  );
                  
                  console.log('Agences filtrées:', filtered);
                  return filtered.map(a => ({ value: a.id, label: a.nom }));
                })(),
              ]}
            />
            <FormSelect
              key={`services-${form.institution_id}`}
              label="Service"
              value={form.service_id}
              onChange={e => setForm(f => ({ ...f, service_id: e.target.value }))}
              disabled={!form.institution_id}
              options={[
                { value: '', label: 'Choisir...' },
                // Afficher tous les services disponibles temporairement pour tester
                ...services.map(s => ({ value: s.id, label: s.nom })),
              ]}
            />
          </div>
          
          <div 
            onClick={() => setForm(f => ({ ...f, est_urgent: !f.est_urgent }))}
            style={{ 
              display: 'flex', alignItems: 'center', gap: 14, padding: '16px 20px', 
              background: form.est_urgent ? 'rgba(239,68,68,0.06)' : 'var(--bg-elevated)', 
              borderRadius: 14, cursor: 'pointer', border: '1px solid',
              borderColor: form.est_urgent ? 'rgba(239,68,68,0.2)' : 'var(--border-subtle)',
              transition: 'all 0.2s ease'
            }}
          >
            <div style={{ 
              width: 24, height: 24, borderRadius: 6, border: '2px solid var(--danger-500)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', 
              background: form.est_urgent ? 'var(--danger-500)' : 'transparent',
              flexShrink: 0
            }}>
              {form.est_urgent && <div style={{ width: 10, height: 10, background: 'white', borderRadius: 2 }} />}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 800, fontSize: 14, color: form.est_urgent ? 'var(--danger-700)' : 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Cas Prioritaire / PMR
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2, fontWeight: 500 }}>Cochez cette case uniquement pour les situations d'urgence ou mobilité réduite.</div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
            <button className="btn btn-secondary flex-1" onClick={() => setShowModal(false)} style={{ fontWeight: 700 }}>Annuler</button>
            <button
              className="btn btn-primary flex-1"
              onClick={generer}
              disabled={generating}
              style={{ padding: '14px', borderRadius: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1 }}
            >
              {generating ? 'Traitement...' : 'Confirmer le ticket'}
            </button>
          </div>
        </div>
      </Modal>
    </Layout>
  );
}