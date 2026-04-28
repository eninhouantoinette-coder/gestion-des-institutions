import React, { useState, useEffect } from 'react';
import Layout from '../../components/layout/Layout';
import { SectionCard, PageLoader, Modal } from '../../components/ui';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';

export default function ProfilAgent() {
  const { user, setUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  
  const [form, setForm] = useState({
    nom: '',
    email: '',
    telephone: '',
    guichet: ''
  });
  
  const [passwordForm, setPasswordForm] = useState({
    current_password: '',
    new_password: '',
    confirm_password: ''
  });

  useEffect(() => {
    loadProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadProfile = async () => {
    try {
      const { data } = await api.get('/auth/me');
      setForm({
        nom: data.nom || '',
        email: data.email || '',
        telephone: data.telephone || '',
        guichet: data.guichet || ''
      });
      setUser(data);
    } catch (e) {
      toast.error('Erreur lors du chargement du profil');
    } finally {
      setLoading(false);
    }
  };

  const saveProfile = async () => {
    if (!form.nom || !form.email) {
      return toast.error('Le nom et l\'email sont obligatoires');
    }
    
    setSaving(true);
    try {
      const { data } = await api.put(`/users/${user.id}`, {
        nom: form.nom,
        email: form.email,
        telephone: form.telephone,
        guichet: form.guichet
      });
      toast.success('Profil mis à jour avec succès !');
      setUser(data);
      setEditing(false);
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Erreur lors de la mise à jour');
    } finally {
      setSaving(false);
    }
  };

  const updateAgentStatus = async (newStatus) => {
    setUpdatingStatus(true);
    try {
      await api.put(`/users/${user.id}/agent-status`, { agent_status: newStatus });
      toast.success('Statut mis à jour !');
      const { data } = await api.get('/auth/me');
      setUser(data);
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Erreur lors de la mise à jour');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const changePassword = async () => {
    if (!passwordForm.current_password || !passwordForm.new_password) {
      return toast.error('Tous les champs sont obligatoires');
    }
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      return toast.error('Les mots de passe ne correspondent pas');
    }
    if (passwordForm.new_password.length < 6) {
      return toast.error('Le mot de passe doit faire au moins 6 caractères');
    }

    try {
      await api.post('/auth/change-password', {
        current_password: passwordForm.current_password,
        new_password: passwordForm.new_password
      });
      toast.success('Mot de passe changé avec succès !');
      setShowPasswordModal(false);
      setPasswordForm({ current_password: '', new_password: '', confirm_password: '' });
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Erreur lors du changement de mot de passe');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'disponible': return { bg: '#10b981', color: '#fff' };
      case 'occupe': return { bg: '#f59e0b', color: '#fff' };
      case 'en_pause': return { bg: '#8b5cf6', color: '#fff' };
      case 'indisponible': return { bg: '#ef4444', color: '#fff' };
      case 'en_reserve': return { bg: '#64748b', color: '#fff' };
      default: return { bg: '#64748b', color: '#fff' };
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'disponible': return 'Disponible';
      case 'occupe': return 'Occupé';
      case 'en_pause': return 'En pause';
      case 'indisponible': return 'Indisponible';
      case 'en_reserve': return 'En réserve';
      default: return 'Non défini';
    }
  };

  const currentStatusStyle = getStatusColor(user?.agent_status);

  if (loading) return <Layout title="Mon Profil"><PageLoader /></Layout>;

  return (
    <Layout title="Mon Profil">
      <div className="page-header">
        <h2 className="page-title">Mon Profil</h2>
        <p className="page-subtitle">Gérez vos informations personnelles et votre disponibilité</p>
      </div>

      <div className="grid-2" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '24px' }}>
        {/* Informations personnelles */}
        <SectionCard 
          title="Informations personnelles" 
          headerActions={
            editing ? (
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => setEditing(false)} className="btn btn-secondary btn-sm">Annuler</button>
                <button onClick={saveProfile} disabled={saving} className="btn btn-primary btn-sm">{saving ? '...' : 'Enregistrer'}</button>
              </div>
            ) : (
              <button onClick={() => setEditing(true)} className="btn btn-secondary btn-sm">Modifier</button>
            )
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div>
              <label style={{ display: 'block', marginBottom: 8, fontSize: 13, color: 'var(--text-muted)', fontWeight: 600 }}>Nom complet</label>
              {editing ? (
                <input type="text" value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} className="form-input" placeholder="Votre nom" />
              ) : (
                <div style={{ fontSize: 16, fontWeight: 700 }}>{form.nom || 'Non défini'}</div>
              )}
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: 8, fontSize: 13, color: 'var(--text-muted)', fontWeight: 600 }}>Email</label>
              {editing ? (
                <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="form-input" placeholder="votre@email.com" />
              ) : (
                <div style={{ fontSize: 16, fontWeight: 700 }}>{form.email}</div>
              )}
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: 8, fontSize: 13, color: 'var(--text-muted)', fontWeight: 600 }}>Téléphone</label>
              {editing ? (
                <input type="tel" value={form.telephone} onChange={(e) => setForm({ ...form, telephone: e.target.value })} className="form-input" placeholder="+229 XX XX XX XX" />
              ) : (
                <div style={{ fontSize: 16, fontWeight: 700 }}>{form.telephone || 'Non défini'}</div>
              )}
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: 8, fontSize: 13, color: 'var(--text-muted)', fontWeight: 600 }}>Guichet</label>
              {editing ? (
                <input type="text" value={form.guichet} onChange={(e) => setForm({ ...form, guichet: e.target.value })} className="form-input" placeholder="Numéro de guichet" />
              ) : (
                <div style={{ fontSize: 16, fontWeight: 700 }}>{form.guichet || 'Non assigné'}</div>
              )}
            </div>
          </div>
        </SectionCard>

        {/* Statut de disponibilité */}
        <SectionCard title="Ma Disponibilité">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div style={{
              padding: 24,
              borderRadius: 16,
              background: currentStatusStyle.bg,
              color: currentStatusStyle.color,
              textAlign: 'center',
              boxShadow: '0 4px 15px -3px rgba(0,0,0,0.1)'
            }}>
              <div style={{ fontSize: 28, fontWeight: 900, letterSpacing: 0.5, textTransform: 'uppercase' }}>
                {getStatusLabel(user?.agent_status)}
              </div>
              <div style={{ fontSize: 14, opacity: 0.9, marginTop: 4, fontWeight: 600 }}>
                Statut actuel
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 4, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Changer mon statut :
              </div>
              {[
                { value: 'disponible', label: 'Disponible', color: '#10b981' },
                { value: 'occupe', label: 'Occupé', color: '#f59e0b' },
                { value: 'en_pause', label: 'En pause', color: '#8b5cf6' },
                { value: 'indisponible', label: 'Indisponible', color: '#ef4444' },
              ].map((status) => {
                const isActive = user?.agent_status === status.value;
                return (
                  <button
                    key={status.value}
                    onClick={() => updateAgentStatus(status.value)}
                    disabled={updatingStatus || isActive}
                    style={{
                      padding: '14px 16px',
                      borderRadius: 10,
                      border: isActive ? 'none' : '1px solid var(--border-subtle)',
                      background: isActive ? status.color : 'var(--bg-elevated)',
                      color: isActive ? '#fff' : 'var(--text-secondary)',
                      cursor: isActive || updatingStatus ? 'default' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontWeight: 700,
                      opacity: isActive ? 1 : 0.8,
                      transition: 'all 0.2s',
                    }}
                  >
                    <span>{status.label}</span>
                    {isActive && <span style={{ background: 'rgba(255,255,255,0.2)', width: 22, height: 22, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>ACTIF</span>}
                  </button>
                );
              })}
            </div>
          </div>
        </SectionCard>
      </div>

      {/* Sécurité et Infos */}
      <div style={{ marginTop: 24 }}>
        <SectionCard title="Sécurité et Historique">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 0', borderBottom: '1px solid var(--border-subtle)' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15 }}>Mot de passe</div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>•••••••• (Dernière modification il y a 3 mois)</div>
              </div>
              <button onClick={() => setShowPasswordModal(true)} className="btn btn-secondary btn-sm">Modifier</button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 0', borderBottom: '1px solid var(--border-subtle)' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15 }}>Rôle et permissions</div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)', textTransform: 'capitalize' }}>Accès {user?.role} — {user?.agence_nom || 'Siège Social'}</div>
              </div>
              <div style={{ padding: '6px 14px', background: 'rgba(16,185,129,0.1)', color: '#10b981', borderRadius: 20, fontSize: 12, fontWeight: 800, textTransform: 'uppercase' }}>
                {user?.role}
              </div>
            </div>

            <div style={{ padding: '16px 0' }}>
              <div style={{ fontWeight: 700, fontSize: 15 }}>Membre depuis</div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
                {user?.created_at ? new Date(user.created_at).toLocaleDateString('fr-FR', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                }) : 'Date inconnue'}
              </div>
            </div>
          </div>
        </SectionCard>
      </div>

      <Modal isOpen={showPasswordModal} onClose={() => setShowPasswordModal(false)} title="Changer mon mot de passe">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label className="form-label">Mot de passe actuel</label>
            <input type="password" value={passwordForm.current_password} onChange={(e) => setPasswordForm({ ...passwordForm, current_password: e.target.value })} className="form-input" placeholder="••••••••" />
          </div>
          <div>
            <label className="form-label">Nouveau mot de passe</label>
            <input type="password" value={passwordForm.new_password} onChange={(e) => setPasswordForm({ ...passwordForm, new_password: e.target.value })} className="form-input" placeholder="••••••••" />
          </div>
          <div>
            <label className="form-label">Confirmer le nouveau mot de passe</label>
            <input type="password" value={passwordForm.confirm_password} onChange={(e) => setPasswordForm({ ...passwordForm, confirm_password: e.target.value })} className="form-input" placeholder="••••••••" />
          </div>
          <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
            <button onClick={() => setShowPasswordModal(false)} className="btn btn-secondary flex-1">Annuler</button>
            <button onClick={changePassword} className="btn btn-primary flex-1">Confirmer le changement</button>
          </div>
        </div>
      </Modal>
    </Layout>
  );
}