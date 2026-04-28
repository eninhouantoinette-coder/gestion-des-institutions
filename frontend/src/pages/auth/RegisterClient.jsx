import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';

import api from '../../services/api';

const FEATURES = [
  { icon: '📅', title: 'Rendez-vous en ligne', desc: 'Réservez votre créneau sans attendre' },
  { icon: '🎟️', title: 'Ticket virtuel', desc: 'Suivez votre position en temps réel' },
  { icon: '📱', title: 'Notifications', desc: 'Recevez des alertes sur votre téléphone' },
  { icon: '⏱️', title: 'Gain de temps', desc: 'Évitez les files d\'attente' },
];

export default function RegisterClient() {
  const { setUser, setToken } = useAuth();
  const navigate = useNavigate();
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirmPwd, setShowConfirmPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, watch, formState: { errors } } = useForm();

  const mot_de_passe = watch('mot_de_passe');

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      // Préparer les données pour l'API
      const registerData = {
        nom: data.nom,
        email: data.email,
        telephone: data.telephone || null,
        mot_de_passe: data.mot_de_passe,
      };

      const response = await api.post('/auth/register', registerData);
      const { access_token, refresh_token, user } = response.data;
      
      // Stocker les tokens
      localStorage.setItem('access_token', access_token);
      localStorage.setItem('refresh_token', refresh_token);
      localStorage.setItem('user', JSON.stringify(user));
      
      // Mettre à jour le contexte
      setToken(access_token);
      setUser(user);
      
      toast.success(`Bienvenue ${user.nom} ! Votre compte a été créé.`);
      navigate('/client/dashboard');
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
            Créez votre compte<br />
            <span style={{ 
              background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', 
              WebkitBackgroundClip: 'text', 
              WebkitTextFillColor: 'transparent' 
            }}>
              client
            </span>
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: 17, maxWidth: 420, lineHeight: 1.6 }}>
            Inscrivez-vous pour prendre rendez-vous, suivre votre file d'attente et gérer vos opérations bancaires en ligne en toute simplicité.
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
            Déjà un compte ? Connectez-vous
          </Link>
        </div>
      </div>

      {/* Right panel */}
      <div className="auth-right">
        <div className="auth-card animate-slide">
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <h1 style={{ fontSize: 28, fontWeight: 900, letterSpacing: -1 }}>Inscription client</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: 15, marginTop: 8 }}>
              Rejoignez-nous en quelques secondes
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Nom complet */}
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 600 }}>Nom complet *</label>
              <div className="form-input-icon" style={{ position: 'relative' }}>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Jean Dupont"
                  style={{ paddingLeft: 44 }}
                  {...register('nom', { required: 'Nom requis' })}
                />
              </div>
              {errors.nom && <span className="form-error">{errors.nom.message}</span>}
            </div>

            {/* Email */}
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 600 }}>Adresse email *</label>
              <div className="form-input-icon" style={{ position: 'relative' }}>
                <input
                  type="email"
                  className="form-input"
                  placeholder="votre@email.com"
                  style={{ paddingLeft: 44 }}
                  {...register('email', { 
                    required: 'Email requis',
                    pattern: {
                      value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                      message: 'Email invalide'
                    }
                  })}
                />
              </div>
              {errors.email && <span className="form-error">{errors.email.message}</span>}
            </div>

            {/* Téléphone (optionnel) */}
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 600 }}>Téléphone (Optionnel)</label>
              <div className="form-input-icon" style={{ position: 'relative' }}>
                <input
                  type="tel"
                  className="form-input"
                  placeholder="+229 XX XX XX XX"
                  style={{ paddingLeft: 44 }}
                  {...register('telephone')}
                />
              </div>
            </div>

            {/* Mot de passe */}
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 600 }}>Mot de passe *</label>
              <div className="form-input-icon" style={{ position: 'relative' }}>
                <input
                  type={showPwd ? 'text' : 'password'}
                  className="form-input"
                  placeholder="••••••••"
                  style={{ paddingLeft: 44, paddingRight: 44 }}
                  {...register('mot_de_passe', { 
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
              {errors.mot_de_passe && <span className="form-error">{errors.mot_de_passe.message}</span>}
            </div>

            {/* Confirmation mot de passe */}
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 600 }}>Confirmer le mot de passe *</label>
              <div className="form-input-icon" style={{ position: 'relative' }}>
                <input
                  type={showConfirmPwd ? 'text' : 'password'}
                  className="form-input"
                  placeholder="••••••••"
                  style={{ paddingLeft: 44, paddingRight: 44 }}
                  {...register('confirm_mot_de_passe', { 
                    required: 'Confirmation requise',
                    validate: value => value === mot_de_passe || 'Les mots de passe ne correspondent pas'
                  })}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPwd(!showConfirmPwd)}
                  style={{
                    position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer',
                    padding: 8, display: 'flex', alignItems: 'center'
                  }}
                >
                </button>
              </div>
              {errors.confirm_mot_de_passe && <span className="form-error">{errors.confirm_mot_de_passe.message}</span>}
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-lg w-full flex items-center justify-center gap-2"
              disabled={loading}
              style={{ padding: '14px', borderRadius: 12, fontSize: 16, fontWeight: 700, marginTop: 10 }}
            >
              {loading ? (
                <>Création du compte...</>
              ) : (
                <>Créer mon compte</>
              )}
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: 24, paddingTop: 20, borderTop: '1px solid var(--border-subtle)' }}>
            <p style={{ fontSize: 14, color: 'var(--text-muted)', fontWeight: 500 }}>
              Vous avez déjà un compte ?{' '}
              <Link to="/login" style={{ color: 'var(--primary-600)', fontWeight: 700 }}>
                Connectez-vous
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
