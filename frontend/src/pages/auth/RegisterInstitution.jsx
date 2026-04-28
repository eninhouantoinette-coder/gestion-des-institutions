import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';

import api from '../../services/api';

const FEATURES = [
  { icon: '🏦', title: 'Créez votre institution', desc: 'Banque ou microfinance avec un compte administrateur dédié' },
  { icon: '👨‍💼', title: 'Admin automatique', desc: 'Un compte admin est créé et lié à votre institution' },
  { icon: '🚀', title: 'Démarrage rapide', desc: 'Accès immédiat au tableau de bord après inscription' },
  { icon: '🔒', title: 'Sécurisé', desc: 'Vos données sont protégées et cryptées' },
];

export default function RegisterInstitution() {
  const { setUser, setToken } = useAuth();
  const navigate = useNavigate();
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1); // Étape 1: Institution, Étape 2: Admin
  const { register, handleSubmit, watch, formState: { errors }, trigger, getValues } = useForm({
    defaultValues: {
      institution_type: 'banque',
    }
  });

  const institutionType = watch('institution_type');

  const validateStep1 = async () => {
    const fields = ['institution_nom', 'institution_email', 'institution_telephone', 'institution_type'];
    const valid = await trigger(fields);
    if (valid) setStep(2);
  };

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      const response = await api.post('/auth/register-institution', data);
      const { access_token, refresh_token, user } = response.data;
      
      // Connecter automatiquement l'admin
      localStorage.setItem('access_token', access_token);
      localStorage.setItem('refresh_token', refresh_token);
      localStorage.setItem('user', JSON.stringify(user));
      
      // Mettre à jour le contexte
      setToken(access_token);
      setUser(user);
      
      toast.success(`Bienvenue ${user.nom} ! Votre institution a été créée.`);
      navigate('/admin/dashboard');
    } catch (err) {
      let msg = 'Erreur lors de l\'inscription';
      const detail = err?.response?.data?.detail;
      if (Array.isArray(detail) && detail.length > 0) {
        msg = detail[0]?.msg || detail[0]?.message || JSON.stringify(detail);
      } else if (typeof detail === 'string') {
        msg = detail;
      }
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-bg" />

      {/* Left panel */}
      <div className="auth-left">
        <div style={{ marginBottom: 48 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 32 }}>
            <div>
              <div style={{ fontSize: 22, fontWeight: 900, letterSpacing: -0.5 }}>BanqueQueue</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>Système de gestion bancaire</div>
            </div>
          </div>

          <h2 style={{ fontSize: 42, fontWeight: 900, letterSpacing: -2, lineHeight: 1.1, marginBottom: 20 }}>
            Inscrivez votre<br />
            <span style={{ 
              background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', 
              WebkitBackgroundClip: 'text', 
              WebkitTextFillColor: 'transparent' 
            }}>
              institution
            </span>
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: 17, maxWidth: 420, lineHeight: 1.6 }}>
            Créez un compte pour votre banque ou microfinance et accédez à des outils professionnels pour gérer vos agences et clients.
          </p>
        </div>

        <div style={{ display: 'grid', gap: 16 }}>
          {FEATURES.map(f => (
            <div key={f.title} style={{
              display: 'flex', gap: 16, alignItems: 'flex-start',
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: 16, padding: '16px 20px',
              transition: 'all 0.2s ease',
            }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>{f.title}</div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.4 }}>{f.desc}</div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 40 }}>
          <Link to="/login" className="flex items-center gap-2 text-sm font-semibold text-white hover:text-blue-400 transition-colors">
            Retour à la connexion
          </Link>
        </div>
      </div>

      {/* Right panel */}
      <div className="auth-right">
        <div className="auth-card animate-slide">
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <h1 style={{ fontSize: 28, fontWeight: 900, letterSpacing: -1 }}>
              {step === 1 ? 'Votre institution' : 'Administrateur'}
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: 15, marginTop: 8 }}>
              {step === 1 ? 'Étape 1/2 : Détails de la structure' : 'Étape 2/2 : Vos accès personnels'}
            </p>
            
            {/* Progress bar */}
            <div style={{ display: 'flex', gap: 12, marginTop: 24, justifyContent: 'center' }}>
              <div style={{
                flex: 1, maxWidth: 80, height: 6, borderRadius: 3,
                background: step >= 1 ? 'var(--primary-600)' : 'var(--border-subtle)',
                transition: 'all 0.3s ease'
              }} />
              <div style={{
                flex: 1, maxWidth: 80, height: 6, borderRadius: 3,
                background: step >= 2 ? 'var(--primary-600)' : 'var(--border-subtle)',
                transition: 'all 0.3s ease'
              }} />
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {step === 1 ? (
              <>
                {/* Type d'institution */}
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 600 }}>Type d'institution</label>
                  <div style={{ display: 'flex', gap: 12 }}>
                    <label style={{
                      flex: 1, padding: '14px', borderRadius: 12, cursor: 'pointer',
                      border: institutionType === 'banque' ? '2px solid var(--primary-600)' : '1px solid var(--border-subtle)',
                      background: institutionType === 'banque' ? 'rgba(37,99,235,0.05)' : 'transparent',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                      transition: 'all 0.2s ease',
                    }}>
                      <input
                        type="radio"
                        value="banque"
                        {...register('institution_type')}
                        style={{ display: 'none' }}
                      />
                      <span style={{ fontSize: 13, fontWeight: institutionType === 'banque' ? 700 : 500, color: institutionType === 'banque' ? 'var(--primary-600)' : 'var(--text-muted)' }}>Banque</span>
                    </label>
                    <label style={{
                      flex: 1, padding: '14px', borderRadius: 12, cursor: 'pointer',
                      border: institutionType === 'microfinance' ? '2px solid var(--primary-600)' : '1px solid var(--border-subtle)',
                      background: institutionType === 'microfinance' ? 'rgba(37,99,235,0.05)' : 'transparent',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                      transition: 'all 0.2s ease',
                    }}>
                      <input
                        type="radio"
                        value="microfinance"
                        {...register('institution_type')}
                        style={{ display: 'none' }}
                      />
                      <span style={{ fontSize: 13, fontWeight: institutionType === 'microfinance' ? 700 : 500, color: institutionType === 'microfinance' ? 'var(--primary-600)' : 'var(--text-muted)' }}>Microfinance</span>
                    </label>
                  </div>
                </div>

                {/* Nom de l'institution */}
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 600 }}>Nom de l'institution *</label>
                  <div className="form-input-icon" style={{ position: 'relative' }}>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Nom de votre structure"
                      style={{ paddingLeft: 44 }}
                      {...register('institution_nom', { required: 'Nom requis' })}
                    />
                  </div>
                  {errors.institution_nom && <span className="form-error">{errors.institution_nom.message}</span>}
                </div>

                {/* Email institution */}
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 600 }}>Email institution *</label>
                  <div className="form-input-icon" style={{ position: 'relative' }}>
                                        <input
                      type="email"
                      className="form-input"
                      placeholder="contact@banque.com"
                      style={{ paddingLeft: 44 }}
                      {...register('institution_email', { required: 'Email requis' })}
                    />
                  </div>
                  {errors.institution_email && <span className="form-error">{errors.institution_email.message}</span>}
                </div>

                {/* Téléphone institution */}
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 600 }}>Téléphone *</label>
                  <div className="form-input-icon" style={{ position: 'relative' }}>
                                        <input
                      type="tel"
                      className="form-input"
                      placeholder="+229 XX XX XX XX"
                      style={{ paddingLeft: 44 }}
                      {...register('institution_telephone', { required: 'Téléphone requis' })}
                    />
                  </div>
                  {errors.institution_telephone && <span className="form-error">{errors.institution_telephone.message}</span>}
                </div>

                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">Pays</label>
                    <div className="form-input-icon" style={{ position: 'relative' }}>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="Bénin"
                        style={{ paddingLeft: 44 }}
                        {...register('institution_pays')}
                      />
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Ville</label>
                    <div className="form-input-icon" style={{ position: 'relative' }}>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="Cotonou"
                        style={{ paddingLeft: 44 }}
                        {...register('institution_ville')}
                      />
                    </div>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Adresse physique</label>
                  <div className="form-input-icon" style={{ position: 'relative' }}>
                    <textarea
                      className="form-input"
                      placeholder="Rue, quartier, etc."
                      rows={2}
                      style={{ resize: 'none', paddingLeft: 44, paddingTop: 12, borderRadius: 12 }}
                      {...register('institution_adresse')}
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={validateStep1}
                  className="btn btn-primary btn-lg w-full flex items-center justify-center gap-2"
                  style={{ padding: '14px', borderRadius: 12, fontSize: 16, fontWeight: 700, marginTop: 10 }}
                >
                  Continuer vers l'admin
                </button>
              </>
            ) : (
              <>
                {/* Nom admin */}
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 600 }}>Nom de l'administrateur *</label>
                  <div className="form-input-icon" style={{ position: 'relative' }}>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Identité du responsable"
                      style={{ paddingLeft: 44 }}
                      {...register('admin_nom', { required: 'Nom requis' })}
                    />
                  </div>
                  {errors.admin_nom && <span className="form-error">{errors.admin_nom.message}</span>}
                </div>

                {/* Email admin */}
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 600 }}>Email personnel *</label>
                  <div className="form-input-icon" style={{ position: 'relative' }}>
                                        <input
                      type="email"
                      className="form-input"
                      placeholder="admin@email.com"
                      style={{ paddingLeft: 44 }}
                      {...register('admin_email', { required: 'Email requis' })}
                    />
                  </div>
                  {errors.admin_email && <span className="form-error">{errors.admin_email.message}</span>}
                </div>

                {/* Téléphone admin (optionnel) */}
                <div className="form-group">
                  <label className="form-label">Téléphone personnel</label>
                  <div className="form-input-icon" style={{ position: 'relative' }}>
                                        <input
                      type="tel"
                      className="form-input"
                      placeholder="+229 XX XX XX XX"
                      style={{ paddingLeft: 44 }}
                      {...register('admin_telephone')}
                    />
                  </div>
                </div>

                {/* Mot de passe admin */}
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 600 }}>Mot de passe sécurisé *</label>
                  <div className="form-input-icon" style={{ position: 'relative' }}>
                    <input
                      type={showPwd ? 'text' : 'password'}
                      className="form-input"
                      placeholder="••••••••"
                      style={{ paddingLeft: 44, paddingRight: 44 }}
                      {...register('admin_mot_de_passe', { 
                        required: 'Mot de passe requis',
                        minLength: { value: 6, message: '6 caractères minimum' }
                      })}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPwd(!showPwd)}
                      style={{
                        position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                        background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer',
                        padding: 8, display: 'flex', alignItems: 'center'
                      }}
                    >
                    </button>
                  </div>
                  {errors.admin_mot_de_passe && <span className="form-error">{errors.admin_mot_de_passe.message}</span>}
                </div>

                <div style={{ display: 'flex', gap: 12, marginTop: 10 }}>
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="btn btn-secondary"
                    style={{ flex: 1, height: 50, borderRadius: 12, fontWeight: 600 }}
                  >
                     Retour
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary btn-lg flex-2"
                    disabled={loading}
                    style={{ flex: 2, height: 50, borderRadius: 12, fontSize: 16, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    {loading ? (
                      <>Création en cours...</>
                    ) : (
                      <>Finir l'inscription</>
                    )}
                  </button>
                </div>
              </>
            )}
          </form>

          {step === 1 && (
            <div style={{ textAlign: 'center', marginTop: 32, paddingTop: 24, borderTop: '1px solid var(--border-subtle)' }}>
              <p style={{ fontSize: 14, color: 'var(--text-muted)', fontWeight: 500 }}>
                Votre institution est déjà inscrite ?{' '}
                <Link to="/login" style={{ color: 'var(--primary-600)', fontWeight: 700 }}>
                  Connectez-vous
                </Link>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
