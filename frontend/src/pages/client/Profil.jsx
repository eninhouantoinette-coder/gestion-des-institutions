import React, { useState, useEffect } from 'react';
import Layout from '../../components/layout/Layout';
import { SectionCard, PageLoader, Modal } from '../../components/ui';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { User, Mail, Phone, Lock, Shield, Calendar, Edit2, Save, X, Key } from 'lucide-react';

export default function Profil() {
  const { user, setUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  
  const [form, setForm] = useState({
    nom: '',
    email: '',
    telephone: ''
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
        telephone: data.telephone || ''
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
        telephone: form.telephone
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

  if (loading) return <Layout title="Mon Profil"><PageLoader /></Layout>;

  return (
    <Layout title="Mon Profil">
      <div className="page-header">
        <h2 className="page-title">Mon Profil</h2>
        <p className="page-subtitle">Gérez vos informations personnelles et votre sécurité</p>
      </div>

      <div className="grid-2">
        {/* Informations personnelles */}
        <SectionCard 
          title="Informations personnelles" 
          headerActions={
            editing ? (
              <div style={{ display: 'flex', gap: 8 }}>
                <button 
                  onClick={() => setEditing(false)}
                  className="btn btn-secondary btn-sm"
                >
                  <X size={14} /> Annuler
                </button>
                <button 
                  onClick={saveProfile}
                  disabled={saving}
                  className="btn btn-primary btn-sm"
                >
                  {saving ? '...' : <><Save size={14} /> Enregistrer</>}
                </button>
              </div>
            ) : (
              <button 
                onClick={() => setEditing(true)}
                className="btn btn-secondary btn-sm"
              >
                <Edit2 size={14} /> Modifier le profil
              </button>
            )
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24, padding: '10px 0' }}>
            {/* Nom */}
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, fontSize: 13, fontWeight: 600, color: 'var(--text-muted)' }}>
                <User size={14} /> Nom complet
              </label>
              {editing ? (
                <input
                  type="text"
                  value={form.nom}
                  onChange={(e) => setForm({ ...form, nom: e.target.value })}
                  className="form-input"
                  placeholder="Jean Dupont"
                />
              ) : (
                <div style={{ fontSize: 16, fontWeight: 700, paddingLeft: 22 }}>{form.nom || 'Non défini'}</div>
              )}
            </div>

            {/* Email */}
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, fontSize: 13, fontWeight: 600, color: 'var(--text-muted)' }}>
                <Mail size={14} /> Adresse email
              </label>
              {editing ? (
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="form-input"
                  placeholder="votre@email.com"
                />
              ) : (
                <div style={{ fontSize: 16, fontWeight: 700, paddingLeft: 22 }}>{form.email}</div>
              )}
            </div>

            {/* Téléphone */}
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, fontSize: 13, fontWeight: 600, color: 'var(--text-muted)' }}>
                <Phone size={14} /> Numéro de téléphone
              </label>
              {editing ? (
                <input
                  type="tel"
                  value={form.telephone}
                  onChange={(e) => setForm({ ...form, telephone: e.target.value })}
                  className="form-input"
                  placeholder="+229 XX XX XX XX"
                />
              ) : (
                <div style={{ fontSize: 16, fontWeight: 700, paddingLeft: 22 }}>{form.telephone || 'Non défini'}</div>
              )}
            </div>
          </div>
        </SectionCard>

        {/* Sécurité et Compte */}
        <SectionCard title="Sécurité et Compte">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 0', borderBottom: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ 
                  width: 44, height: 44, borderRadius: 12, 
                  background: 'rgba(59,130,246,0.1)', 
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#3b82f6'
                }}>
                  <Key size={20} />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>Mot de passe</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Mise à jour régulière conseillée</div>
                </div>
              </div>
              <button 
                onClick={() => setShowPasswordModal(true)}
                className="btn btn-outline btn-sm font-bold"
              >
                Changer
              </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 0', borderBottom: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ 
                  width: 44, height: 44, borderRadius: 12, 
                  background: 'rgba(139,92,246,0.1)', 
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#8b5cf6'
                }}>
                  <Shield size={20} />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>Rôle d'utilisateur</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'capitalize' }}>{user?.role || 'Client'}</div>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ 
                  width: 44, height: 44, borderRadius: 12, 
                  background: 'rgba(16,185,129,0.1)', 
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#10b981'
                }}>
                  <Calendar size={20} />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>Membre depuis</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    {user?.created_at ? new Date(user.created_at).toLocaleDateString('fr-FR', {
                      year: 'numeric', month: 'long', day: 'numeric'
                    }) : 'Inconnu'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </SectionCard>
      </div>

      {/* Modal changement de mot de passe */}
      <Modal 
        isOpen={showPasswordModal} 
        onClose={() => setShowPasswordModal(false)}
        title="Changer mon mot de passe"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div>
            <label className="form-label" style={{ fontWeight: 600 }}>Mot de passe actuel</label>
            <div className="form-input-icon" style={{ position: 'relative' }}>
              <Lock size={18} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }} />
              <input
                type="password"
                value={passwordForm.current_password}
                onChange={(e) => setPasswordForm({ ...passwordForm, current_password: e.target.value })}
                className="form-input"
                placeholder="••••••••"
                style={{ paddingLeft: 44 }}
              />
            </div>
          </div>

          <div>
            <label className="form-label" style={{ fontWeight: 600 }}>Nouveau mot de passe</label>
            <div className="form-input-icon" style={{ position: 'relative' }}>
              <Lock size={18} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }} />
              <input
                type="password"
                value={passwordForm.new_password}
                onChange={(e) => setPasswordForm({ ...passwordForm, new_password: e.target.value })}
                className="form-input"
                placeholder="••••••••"
                style={{ paddingLeft: 44 }}
              />
            </div>
          </div>

          <div>
            <label className="form-label" style={{ fontWeight: 600 }}>Confirmer le nouveau mot de passe</label>
            <div className="form-input-icon" style={{ position: 'relative' }}>
              <Lock size={18} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }} />
              <input
                type="password"
                value={passwordForm.confirm_password}
                onChange={(e) => setPasswordForm({ ...passwordForm, confirm_password: e.target.value })}
                className="form-input"
                placeholder="••••••••"
                style={{ paddingLeft: 44 }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12, marginTop: 10 }}>
            <button onClick={() => setShowPasswordModal(false)} className="btn btn-secondary flex-1">
              Annuler
            </button>
            <button onClick={changePassword} className="btn btn-primary flex-1 font-bold">
              Confirmer le changement
            </button>
          </div>
        </div>
      </Modal>
    </Layout>
  );
}
