import React, { useEffect, useState } from 'react';
import Layout from '../../components/layout/Layout';
import { SectionCard, PageLoader, Modal, FormInput, ConfirmModal } from '../../components/ui';
import api from '../../services/api';
import toast from 'react-hot-toast';

export default function Services() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [editService, setEditService] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [form, setForm] = useState({ nom: '', description: '', duree_moyenne: 15 });

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/services');
      setServices(data || []);
    } catch {
      toast.error('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const create = async () => {
    if (!form.nom) return toast.error('Le nom est requis');
    try {
      await api.post('/services', {
        ...form,
        duree_moyenne: parseInt(form.duree_moyenne) || 15,
      });
      toast.success('Service créé !');
      setShowCreate(false);
      setForm({ nom: '', description: '', duree_moyenne: 15 });
      load();
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Erreur lors de la création');
    }
  };

  const update = async () => {
    if (!editService?.nom) return toast.error('Le nom est requis');
    try {
      await api.put(`/services/${editService.id}`, {
        nom: editService.nom,
        description: editService.description,
        duree_moyenne: parseInt(editService.duree_moyenne) || 15,
      });
      toast.success('Service mis à jour !');
      setEditService(null);
      load();
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Erreur lors de la mise à jour');
    }
  };

  const deleteService = async () => {
    try {
      await api.delete(`/services/${selectedId}`);
      toast.success('Service supprimé !');
      setShowDelete(false);
      load();
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Erreur lors de la suppression');
    }
  };

  if (loading) return <Layout title="Gestion des Services"><PageLoader /></Layout>;

  return (
    <Layout title="Gestion des Services">
      <div className="page-header flex justify-between items-center">
        <div>
          <h2 className="page-title">Gestion des Services</h2>
          <p className="page-subtitle">{services.length} services au total</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
           Nouveau Service
        </button>
      </div>

      <SectionCard title="Liste des services">
        {services.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <h3 style={{ fontWeight: 800, fontSize: 18 }}>Aucun service configuré</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Commencez par ajouter les types de prestations offertes par votre agence.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {services.map(s => (
              <div key={s.id} style={{
                display: 'flex', alignItems: 'center', gap: 16,
                padding: '16px 20px',
                background: 'var(--bg-elevated)',
                borderRadius: 12,
                border: '1px solid var(--border-subtle)',
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{s.nom}</div>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>
                    {s.description || 'Aucune description'}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6, fontWeight: 600 }}>
                    Durée moyenne: {s.duree_moyenne} min
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => setEditService(s)}
                    style={{ fontSize: 11, fontWeight: 700 }}
                  >
                    Modifier
                  </button>
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => { setSelectedId(s.id); setShowDelete(true); }}
                    style={{ color: 'var(--danger-400)', fontSize: 11, fontWeight: 700 }}
                  >
                    Supprimer
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      {/* Modal Création */}
      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Nouveau Service">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <FormInput 
            label="Nom du service"
            value={form.nom} 
            onChange={e => setForm(f => ({ ...f, nom: e.target.value }))}
            placeholder="ex: Ouverture de compte"
          />
          <FormInput 
            label="Description"
            value={form.description} 
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            placeholder="Bref descriptif du service..."
          />
          <FormInput 
            label="Durée moyenne (min)"
            type="number"
            value={form.duree_moyenne} 
            onChange={e => setForm(f => ({ ...f, duree_moyenne: e.target.value }))}
            min={1}
          />
          <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
            <button className="btn btn-secondary btn-sm" style={{ flex: 1 }} onClick={() => setShowCreate(false)}>Annuler</button>
            <button className="btn btn-primary btn-sm" style={{ flex: 1 }} onClick={create}>Créer</button>
          </div>
        </div>
      </Modal>

      {/* Modal Édition */}
      <Modal isOpen={!!editService} onClose={() => setEditService(null)} title="Modifier Service">
        {editService && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <FormInput 
              label="Nom du service"
              value={editService.nom} 
              onChange={e => setEditService(s => ({ ...s, nom: e.target.value }))}
            />
            <FormInput 
              label="Description"
              value={editService.description} 
              onChange={e => setEditService(s => ({ ...s, description: e.target.value }))}
            />
            <FormInput 
              label="Durée moyenne (min)"
              type="number"
              value={editService.duree_moyenne} 
              onChange={e => setEditService(s => ({ ...s, duree_moyenne: e.target.value }))}
              min={1}
            />
            <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
              <button className="btn btn-secondary btn-sm" style={{ flex: 1 }} onClick={() => setEditService(null)}>Annuler</button>
              <button className="btn btn-primary btn-sm" style={{ flex: 1 }} onClick={update}>Enregistrer</button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal Suppression */}
      <ConfirmModal 
        isOpen={showDelete} 
        onClose={() => setShowDelete(false)}
        onConfirm={deleteService}
        title="Supprimer le service ?"
        message="Cette action est irréversible. Le service sera définitivement supprimé."
        danger
      />
    </Layout>
  );
}