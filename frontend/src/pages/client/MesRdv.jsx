import React, { useEffect, useState, useCallback, useRef } from 'react';
import Layout from '../../components/layout/Layout';
import { SectionCard, StatusBadge, EmptyState, PageLoader, Modal, FormInput, FormSelect } from '../../components/ui';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { Calendar, Clock, Plus, Building, Trash2, ChevronRight, AlertCircle, Info, Check } from 'lucide-react';

export default function MesRdv() {
  const [rdvs, setRdvs]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [institutions, setInstitutions] = useState([]);
  const [services, setServices]   = useState([]);
  const [agences, setAgences]     = useState([]);
  const [creneaux, setCreneaux]   = useState([]);
  const [form, setForm] = useState({ institution_id: '', agence_id: '', service_id: '', date_rdv: '', heure_rdv: '', notes: '' });
  const loadedRef = useRef(false);

  const load = useCallback(async () => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    try {
      const [r, i, s, a] = await Promise.all([
        api.get('/rendezvous'),
        api.get('/institutions'),
        api.get('/services'),
        api.get('/agences'),
      ]);
      setRdvs(r.data || []);
      setInstitutions(i.data || []);
      setServices(s.data || []);
      setAgences(a.data || []);
    } catch (e) {
      toast.error('Erreur lors du chargement des données');
    }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (form.agence_id && form.service_id && form.date_rdv) {
      api.get('/creneaux', {
        params: { agence_id: form.agence_id, service_id: form.service_id, date: form.date_rdv }
      }).then(r => setCreneaux(r.data)).catch(() => setCreneaux([]));
    }
  }, [form.agence_id, form.service_id, form.date_rdv]);

  const creerRdv = async () => {
    if (!form.institution_id || !form.agence_id || !form.service_id || !form.date_rdv || !form.heure_rdv) {
      return toast.error('Tous les champs obligatoires doivent être remplis');
    }
    try {
      await api.post('/rendezvous', {
        institution_id: parseInt(form.institution_id),
        agence_id: parseInt(form.agence_id),
        service_id: parseInt(form.service_id),
        date_rdv: form.date_rdv,
        heure_rdv: form.heure_rdv,
        notes: form.notes,
      });
      toast.success('Rendez-vous confirmé !');
      setShowModal(false);
      setForm({ institution_id: '', agence_id: '', service_id: '', date_rdv: '', heure_rdv: '', notes: '' });
      load();
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Erreur lors de la création');
    }
  };

  // Afficher toutes les agences et services (pas de filtrage pour les clients)
  const agencesFiltrees = agences;
  const servicesFiltres = services;

  const annuler = async (id) => {
    if (!window.confirm('Annuler ce rendez-vous ?')) return;
    try {
      await api.delete(`/rendezvous/${id}`);
      toast.success('Rendez-vous annulé');
      setRdvs(prev => prev.filter(r => r.id !== id));
    } catch { toast.error('Erreur'); }
  };

  if (loading) return <Layout title="Mes rendez-vous"><PageLoader /></Layout>;

  return (
    <Layout title="Mes rendez-vous">
      <div className="page-header flex justify-between items-center">
        <div>
          <h2 className="page-title"> Mes rendez-vous</h2>
          <p className="page-subtitle">{rdvs.length} rendez-vous au total</p>
        </div>
        <button id="btn-nouveau-rdv" className="btn btn-primary flex items-center gap-2" onClick={() => setShowModal(true)}>
          <Plus size={18} /> Nouveau RDV
        </button>
      </div>

      <SectionCard title="Liste de mes rendez-vous">
        {rdvs.length === 0 ? (
          <EmptyState 
            icon="" 
            title="Aucun rendez-vous" 
            subtitle="Vous n'avez pas encore de rendez-vous programmé. Cliquez sur 'Nouveau RDV' pour commencer." 
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {rdvs.map(rdv => (
              <div key={rdv.id} style={{
                display: 'flex', alignItems: 'center', gap: 16,
                padding: '16px 20px',
                background: 'var(--bg-elevated)',
                borderRadius: 16,
                border: '1px solid var(--border-subtle)',
                transition: 'all 0.2s ease',
              }}>
                <div style={{
                  width: 48, height: 48, borderRadius: 12,
                  background: 'rgba(59,130,246,0.1)',
                  color: '#3b82f6',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <Calendar size={24} />
                </div>

                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ fontWeight: 700, fontSize: 16 }}>{new Date(rdv.date_rdv).toLocaleDateString('fr-FR')} à {rdv.heure_rdv}</div>
                    <StatusBadge statut={rdv.statut} />
                  </div>
                  {rdv.heure_modifiee && (
                    <div style={{ 
                      fontSize: 12, 
                      color: 'var(--warning-600)', 
                      marginTop: 4,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      fontWeight: 600
                    }}>
                      <AlertCircle size={14} /> Heure ajustée par le système
                    </div>
                  )}
                  <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Building size={14} /> {rdv.agence?.nom || `Agence #${rdv.agence_id}`}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Info size={14} /> {rdv.service?.nom || `Service #${rdv.service_id}`}
                    </span>
                  </div>
                  {rdv.notes && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4, fontStyle: 'italic', background: 'rgba(0,0,0,0.02)', padding: '4px 8px', borderRadius: 4 }}>"{rdv.notes}"</div>}
                </div>
                
                {['en_attente', 'confirme'].includes(rdv.statut) && (
                  <button
                    className="btn btn-ghost btn-icon"
                    onClick={() => annuler(rdv.id)}
                    title="Annuler le rendez-vous"
                    style={{ color: 'var(--danger-500)', background: 'rgba(239,68,68,0.05)' }}
                  >
                    <Trash2 size={18} />
                  </button>
                )}
                <ChevronRight size={20} style={{ opacity: 0.3 }} />
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title=" Nouveau rendez-vous" maxWidth={600}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <FormSelect
            label="Choisir une institution"
            value={form.institution_id}
            onChange={e => setForm(f => ({ ...f, institution_id: e.target.value, agence_id: '', service_id: '' }))}
            options={[
              { value: '', label: 'Sélectionnez une institution' },
              ...institutions.map(i => ({ value: i.id, label: i.nom })),
            ]}
          />
          <div className="grid-2">
            <FormSelect
              label="Agence"
              value={form.agence_id}
              onChange={e => setForm(f => ({ ...f, agence_id: e.target.value }))}
              disabled={!form.institution_id}
              options={[{ value: '', label: form.institution_id ? 'Choisir...' : 'Choisir institution d\'abord' }, ...agencesFiltrees.map(a => ({ value: a.id, label: a.nom }))]}
            />
            <FormSelect
              label="Service souhaité"
              value={form.service_id}
              onChange={e => setForm(f => ({ ...f, service_id: e.target.value }))}
              disabled={!form.institution_id}
              options={[{ value: '', label: form.institution_id ? 'Choisir...' : 'Choisir institution d\'abord' }, ...servicesFiltres.map(s => ({ value: s.id, label: s.nom }))]}
            />
          </div>
          <div className="grid-2">
            <FormInput
              label="Date du rendez-vous"
              type="date"
              value={form.date_rdv}
              onChange={e => setForm(f => ({ ...f, date_rdv: e.target.value }))}
              min={new Date().toISOString().split('T')[0]}
            />
            <FormSelect
              label="Heure souhaitée"
              value={form.heure_rdv}
              onChange={e => setForm(f => ({ ...f, heure_rdv: e.target.value }))}
              options={[
                { value: '', label: 'Choisir...' },
                ...Array.from({ length: 10 * 60 / 15 }, (_, i) => {
                  const totalMinutes = i * 15;
                  const hour = Math.floor(totalMinutes / 60) + 8;
                  const minute = totalMinutes % 60;
                  if (hour >= 18) return null;
                  const value = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
                  return { value, label: value };
                }).filter(Boolean)
              ]}
            />
          </div>

          {creneaux.length > 0 && (
            <div>
              <div className="form-label" style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8 }}>Créneaux disponibles suggérés</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {creneaux.map(c => (
                  <button
                    key={c.id || c.heure_debut}
                    onClick={() => setForm(f => ({ ...f, heure_rdv: c.heure_debut }))}
                    className={form.heure_rdv === c.heure_debut ? 'btn btn-primary btn-sm' : 'btn btn-outline btn-sm'}
                    style={{ borderRadius: 20, padding: '4px 12px' }}
                  >
                    {c.heure_debut}
                  </button>
                ))}
              </div>
            </div>
          )}

          <FormInput
            label="Notes ou motifs (Optionnel)"
            value={form.notes}
            onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
            placeholder="Ex: Ouverture de compte, Demande de prêt..."
          />

          <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
            <button className="btn btn-secondary flex-1" onClick={() => setShowModal(false)}>Annuler</button>
            <button id="btn-confirm-rdv" className="btn btn-primary flex-1 flex items-center justify-center gap-2" onClick={creerRdv}>
              <Check size={18} /> Confirmer le RDV
            </button>
          </div>
        </div>
      </Modal>
    </Layout>
  );
}
