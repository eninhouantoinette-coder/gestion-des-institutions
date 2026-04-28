import React, { useEffect, useState } from 'react';
import Layout from '../../components/layout/Layout';
import { SectionCard, StatusBadge, PageLoader, Modal, FormInput, FormSelect, ConfirmModal } from '../../components/ui';
import api from '../../services/api';
import toast from 'react-hot-toast';

const ROLES = ['client', 'agent', 'manager', 'directeur', 'admin'];
const STATUTS = ['actif', 'inactif', 'verrouille'];
const ROLE_COLORS = { client: '#3b82f6', agent: '#10b981', manager: '#f59e0b', directeur: '#8b5cf6', admin: '#ef4444' };

export default function Utilisateurs() {
  const [users, setUsers]     = useState([]);
  const [total, setTotal]     = useState(0);
  const [page, setPage]       = useState(1);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [editUser, setEditUser]     = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [agences, setAgences]       = useState([]);
  const [filters, setFilters]       = useState({ role: '', statut: '' });
  const [form, setForm] = useState({ nom: '', email: '', mot_de_passe: '', role: 'client', agence_id: '', guichet: '' });

  const perPage = 15;

  const load = async () => {
    setLoading(true);
    try {
      const params = { page, per_page: perPage, ...filters };
      if (!params.role) delete params.role;
      if (!params.statut) delete params.statut;
      const { data } = await api.get('/users', { params });
      setUsers(data.items || []);
      setTotal(data.total || 0);
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { api.get('/agences').then(r => setAgences(r.data)).catch(() => {}); }, []);
  useEffect(() => { load(); }, [page, filters]); // eslint-disable-line

  const create = async () => {
    if (!form.nom || !form.email || !form.mot_de_passe) return toast.error('Tous les champs sont requis');
    try {
      await api.post('/users', { ...form, agence_id: form.agence_id ? parseInt(form.agence_id) : null, guichet: form.guichet || null });
      toast.success('Utilisateur créé !');
      setShowCreate(false);
      setForm({ nom: '', email: '', mot_de_passe: '', role: 'client', agence_id: '', guichet: '' });
      load();
    } catch (e) { toast.error(e?.response?.data?.detail || 'Erreur'); }
  };

  const deleteUser = async () => {
    try {
      await api.delete(`/users/${selectedId}`);
      toast.success('Utilisateur supprimé');
      load();
    } catch { toast.error('Erreur'); }
  };

  const toggleStatut = async (user) => {
    const newStatut = user.statut === 'actif' ? 'inactif' : 'actif';
    try {
      await api.put(`/users/${user.id}/statut`, { statut: newStatut });
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, statut: newStatut } : u));
      toast.success(`Compte ${newStatut === 'actif' ? 'activé' : 'désactivé'}`);
    } catch { toast.error('Erreur'); }
  };

  const resetPwd = async (userId) => {
    const pwd = window.prompt('Nouveau mot de passe (min. 6 caractères):');
    if (!pwd || pwd.length < 6) return toast.error('Mot de passe trop court');
    try {
      await api.put(`/users/${userId}/reset-password`, { nouveau_mot_de_passe: pwd });
      toast.success('Mot de passe réinitialisé');
    } catch { toast.error('Erreur'); }
  };

  const openEditModal = (user) => {
    setEditUser(user);
    setForm({
      nom: user.nom || '',
      email: user.email || '',
      mot_de_passe: '',
      role: user.role || 'client',
      agence_id: user.agence_id || '',
      guichet: user.guichet || ''
    });
  };

  const updateUser = async () => {
    if (!form.nom || !form.email) return toast.error('Nom et email sont requis');
    try {
      const payload = {
        nom: form.nom,
        email: form.email,
        role: form.role,
        agence_id: form.agence_id ? parseInt(form.agence_id) : null,
        guichet: form.guichet || null
      };
      await api.put(`/users/${editUser.id}`, payload);
      toast.success('Utilisateur mis à jour !');
      setEditUser(null);
      setForm({ nom: '', email: '', mot_de_passe: '', role: 'client', agence_id: '', guichet: '' });
      load();
    } catch (e) { toast.error(e?.response?.data?.detail || 'Erreur'); }
  };

  const pages = Math.ceil(total / perPage);

  if (loading && page === 1) return <Layout title="Utilisateurs"><PageLoader /></Layout>;

  return (
    <Layout title="Utilisateurs">
      <div className="page-header flex justify-between items-center">
        <div>
          <h2 className="page-title">Utilisateurs</h2>
          <p className="page-subtitle">{total} utilisateur(s) au total</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-secondary btn-sm" onClick={load} disabled={loading}>
            Actualiser
          </button>
          <button id="btn-create-user" className="btn btn-primary" onClick={() => setShowCreate(true)}>
             Nouvel utilisateur
          </button>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 20, display: 'flex', gap: 16, alignItems: 'center', background: 'var(--bg-elevated)' }}>
        <div style={{ color: 'var(--text-muted)', fontSize: 13, marginRight: 8, fontWeight: 600 }}>
          Filtrer par :
        </div>
        <div style={{ flex: 1 }}>
          <FormSelect 
            label=""
            value={filters.role}
            onChange={e => { setFilters(f => ({ ...f, role: e.target.value })); setPage(1); }}
            options={[{ value: '', label: 'Tous les rôles' }, ...ROLES.map(r => ({ value: r, label: r.charAt(0).toUpperCase() + r.slice(1) }))]}
          />
        </div>
        <div style={{ flex: 1 }}>
          <FormSelect 
            label=""
            value={filters.statut}
            onChange={e => { setFilters(f => ({ ...f, statut: e.target.value })); setPage(1); }}
            options={[{ value: '', label: 'Tous les statuts' }, ...STATUTS.map(s => ({ value: s, label: s }))]}
          />
        </div>
        {(filters.role || filters.statut) && (
          <button className="btn btn-ghost btn-sm text-primary-500" onClick={() => { setFilters({ role: '', statut: '' }); setPage(1); }}>
            Réinitialiser
          </button>
        )}
      </div>

      <SectionCard title="Registre des utilisateurs">
        {loading ? (
          <div style={{ textAlign: 'center', padding: '48px 0' }}>
            <div className="animate-spin" style={{ width: 36, height: 36, border: '3px solid #1e3a8a', borderTop: '3px solid #3b82f6', borderRadius: '50%', margin: '0 auto' }} />
          </div>
        ) : (
          <>
            <div className="table-wrapper">
              <table className="table">
                <thead>
                  <tr>
                    <th>Utilisateur</th>
                    <th>Rôle</th>
                    <th>Statut</th>
                    <th>Agence</th>
                    <th>Inscrit le</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.length === 0 ? (
                    <tr><td colSpan={6} className="table-empty">Aucun utilisateur trouvé</td></tr>
                  ) : users.map(u => (
                    <tr key={u.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{
                            width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                            background: `linear-gradient(135deg, ${ROLE_COLORS[u.role] || '#3b82f6'}, #8b5cf6)`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontWeight: 800, fontSize: 13, color: '#fff'
                          }}>
                            {u.nom?.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: 14 }}>{u.nom}</div>
                            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{u.email}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span style={{
                          padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700,
                          background: `${ROLE_COLORS[u.role]}22`, color: ROLE_COLORS[u.role],
                        }}>
                          {u.role}
                        </span>
                      </td>
                      <td><StatusBadge statut={u.statut} /></td>
                      <td style={{ fontSize: 13, color: 'var(--text-muted)' }}>{u.agence_id ? `Agence #${u.agence_id}` : '—'}</td>
                      <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        {new Date(u.created_at).toLocaleDateString('fr-FR')}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button
                            className="btn btn-ghost btn-sm"
                            onClick={() => openEditModal(u)}
                            style={{ fontSize: 11, fontWeight: 700 }}
                          >
                            Modifier
                          </button>
                          <button
                            className="btn btn-ghost btn-sm"
                            onClick={() => toggleStatut(u)}
                            style={{ fontSize: 11, fontWeight: 700 }}
                          >
                            {u.statut === 'actif' ? 'Désactiver' : 'Activer'}
                          </button>
                          <button
                            className="btn btn-ghost btn-sm"
                            onClick={() => resetPwd(u.id)}
                            style={{ fontSize: 11, fontWeight: 700 }}
                          >
                            Pass
                          </button>
                          <button
                            className="btn btn-ghost btn-sm"
                            onClick={() => { setSelectedId(u.id); setShowDelete(true); }}
                            style={{ color: '#ef4444', fontSize: 11, fontWeight: 700 }}
                          >
                            Suppr.
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, marginTop: 20 }}>
                <button className="btn btn-ghost btn-sm" onClick={() => setPage(p => Math.max(1, p-1))} disabled={page === 1}>
                  Précédent
                </button>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)' }}>
                  Page {page} / {pages}
                </span>
                <button className="btn btn-ghost btn-sm" onClick={() => setPage(p => Math.min(pages, p+1))} disabled={page === pages}>
                  Suivant
                </button>
              </div>
            )}
          </>
        )}
      </SectionCard>

      {/* Create Modal */}
      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Nouvel utilisateur">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="grid-2">
            <FormInput label="Nom" value={form.nom} onChange={e => setForm(f => ({ ...f, nom: e.target.value }))} placeholder="Jean Dupont" />
            <FormInput label="Email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="jean@banque.com" />
          </div>
          <FormInput label="Mot de passe" type="password" value={form.mot_de_passe} onChange={e => setForm(f => ({ ...f, mot_de_passe: e.target.value }))} placeholder="Min. 6 caractères" />
          <div className="grid-2">
            <FormSelect 
              label="Rôle"
              value={form.role}
              onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
              options={ROLES.map(r => ({ value: r, label: r.charAt(0).toUpperCase() + r.slice(1) }))}
            />
            <FormSelect 
              label="Agence"
              value={form.agence_id}
              onChange={e => setForm(f => ({ ...f, agence_id: e.target.value }))}
              options={[{ value: '', label: 'Aucune' }, ...agences.map(a => ({ value: a.id, label: a.nom }))]}
            />
          </div>
          {form.role === 'agent' && (
            <FormInput 
              label="Guichet"
              value={form.guichet}
              onChange={e => setForm(f => ({ ...f, guichet: e.target.value }))}
              placeholder="Ex: G1, Guichet 2, etc."
            />
          )}

          <div style={{ display: 'flex', gap: 12 }}>
            <button className="btn btn-secondary btn-sm" style={{ flex: 1 }} onClick={() => setShowCreate(false)}>Annuler</button>
            <button id="btn-confirm-create-user" className="btn btn-primary btn-sm" style={{ flex: 1 }} onClick={create}>Créer</button>
          </div>
        </div>
      </Modal>

      {/* Edit Modal */}
      <Modal isOpen={!!editUser} onClose={() => setEditUser(null)} title="Modifier l'utilisateur">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="grid-2">
            <FormInput label="Nom" value={form.nom} onChange={e => setForm(f => ({ ...f, nom: e.target.value }))} placeholder="Jean Dupont" />
            <FormInput label="Email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="jean@banque.com" />
          </div>
          <div className="grid-2">
            <FormSelect 
              label="Rôle"
              value={form.role}
              onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
              options={ROLES.map(r => ({ value: r, label: r.charAt(0).toUpperCase() + r.slice(1) }))}
            />
            <FormSelect 
              label="Agence"
              value={form.agence_id}
              onChange={e => setForm(f => ({ ...f, agence_id: e.target.value }))}
              options={[{ value: '', label: 'Aucune' }, ...agences.map(a => ({ value: a.id, label: a.nom }))]}
            />
          </div>
          {form.role === 'agent' && (
            <FormInput 
              label="Guichet"
              value={form.guichet}
              onChange={e => setForm(f => ({ ...f, guichet: e.target.value }))}
              placeholder="Ex: G1, Guichet 2, etc."
            />
          )}

          <div style={{ display: 'flex', gap: 12 }}>
            <button className="btn btn-secondary btn-sm" style={{ flex: 1 }} onClick={() => setEditUser(null)}>Annuler</button>
            <button className="btn btn-primary btn-sm" style={{ flex: 1 }} onClick={updateUser}>Enregistrer</button>
          </div>
        </div>
      </Modal>

      <ConfirmModal 
        isOpen={showDelete} 
        onClose={() => setShowDelete(false)}
        onConfirm={deleteUser}
        title="Supprimer l'utilisateur"
        message="Cette action est irréversible. Voulez-vous vraiment supprimer cet utilisateur ?"
        danger
      />
    </Layout>
  );
}
