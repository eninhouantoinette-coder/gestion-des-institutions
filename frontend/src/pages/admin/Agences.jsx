import React, { useEffect, useState } from 'react';
import Layout from '../../components/layout/Layout';
import { SectionCard, PageLoader, Modal, FormInput, ConfirmModal } from '../../components/ui';
import api from '../../services/api';
import toast from 'react-hot-toast';

export default function Agences() {
  const [agences, setAgences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal]   = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [editItem, setEditItem]     = useState(null);
  const [selId, setSelId]           = useState(null);
  const [form, setForm] = useState({ nom: '', adresse: '', capacite: 50 });

  const load = () => {
    api.get('/agences').then(r => setAgences(r.data)).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const openEdit = (ag) => {
    setEditItem(ag);
    setForm({ nom: ag.nom, adresse: ag.adresse || '', capacite: ag.capacite });
    setShowModal(true);
  };

  const save = async () => {
    if (!form.nom) return toast.error('Le nom est requis');
    try {
      if (editItem) {
        await api.put(`/agences/${editItem.id}`, form);
        toast.success('Agence mise à jour');
      } else {
        await api.post('/agences', form);
        toast.success('Agence créée !');
      }
      setShowModal(false);
      setEditItem(null);
      setForm({ nom: '', adresse: '', capacite: 50 });
      load();
    } catch (e) { toast.error(e?.response?.data?.detail || 'Erreur'); }
  };

  const deleteAgence = async () => {
    try {
      await api.delete(`/agences/${selId}`);
      toast.success('Agence supprimée');
      setAgences(prev => prev.filter(a => a.id !== selId));
    } catch { toast.error('Erreur'); }
  };

  if (loading) return <Layout title="Agences"><PageLoader /></Layout>;

  return (
    <Layout title="Agences">
      <div className="page-header flex justify-between items-center">
        <div>
          <h2 className="page-title">Agences</h2>
          <p className="page-subtitle">{agences.length} agence(s) dans le réseau</p>
        </div>
        <button id="btn-create-agence" className="btn btn-primary" onClick={() => { setEditItem(null); setForm({ nom: '', adresse: '', capacite: 50 }); setShowModal(true); }}>
           Nouvelle agence
        </button>
      </div>

      <div className="grid-3">
        {agences.map((ag, i) => (
          <div key={ag.id} className="card" style={{ borderColor: 'rgba(59,130,246,0.15)', transition: 'var(--transition)' }}
            onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(59,130,246,0.35)'}
            onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(59,130,246,0.15)'}
          >
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6, marginBottom: 12 }}>
              <button className="btn btn-ghost btn-sm" onClick={() => openEdit(ag)} style={{ fontSize: 11, fontWeight: 700 }}>
                Modifier
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => { setSelId(ag.id); setShowDelete(true); }} style={{ color: '#f87171', fontSize: 11, fontWeight: 700 }}>
                Supprimer
              </button>
            </div>
            
            <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>{ag.nom}</div>
            {ag.adresse && <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>{ag.adresse}</div>}

            <div style={{ display: 'flex', gap: 16 }}>
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Capacité</div>
                <div style={{ fontWeight: 700, fontSize: 18 }}>{ag.capacite}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>ID</div>
                <div style={{ fontWeight: 700, fontSize: 18 }}>#{ag.id}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editItem ? 'Modifier agence' : 'Nouvelle agence'}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <FormInput label="Nom de l'agence" value={form.nom} onChange={e => setForm(f => ({ ...f, nom: e.target.value }))} placeholder="Agence Centre-Ville" />
          <FormInput label="Adresse" value={form.adresse} onChange={e => setForm(f => ({ ...f, adresse: e.target.value }))} placeholder="12 rue de la Paix, Paris" />
          <FormInput label="Capacité" type="number" value={form.capacite} onChange={e => setForm(f => ({ ...f, capacite: parseInt(e.target.value) }))} min={1} />
          <div style={{ display: 'flex', gap: 12 }}>
            <button className="btn btn-secondary btn-sm" style={{ flex: 1 }} onClick={() => setShowModal(false)}>Annuler</button>
            <button id="btn-save-agence" className="btn btn-primary btn-sm" style={{ flex: 1 }} onClick={save}>
              {editItem ? 'Modifier' : 'Créer'}
            </button>
          </div>
        </div>
      </Modal>

      <ConfirmModal 
        isOpen={showDelete} 
        onClose={() => setShowDelete(false)}
        onConfirm={deleteAgence}
        title="Supprimer l'agence"
        message="Voulez-vous vraiment supprimer cette agence ? Toutes les données associées seront perdues."
        danger
      />
    </Layout>
  );
}