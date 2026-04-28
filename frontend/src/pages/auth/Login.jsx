import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';

const FEATURES = [
  { icon: '🎟️', title: 'File d\'attente virtuelle', desc: 'Gérez les tickets en temps réel avec des mises à jour instantanées' },
  { icon: '📅', title: 'Rendez-vous intelligents', desc: 'Réservation en ligne avec détection de conflits automatique' },
  { icon: '🤖', title: 'Prédictions IA', desc: 'Anticipez l\'affluence grâce au machine learning' },
  { icon: '📊', title: 'Statistiques avancées', desc: 'Tableaux de bord en temps réel pour tous les rôles' },
];

export default function Login() {
  const { login } = useAuth();
  const navigate  = useNavigate();
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm();

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      const user = await login(data.email, data.mot_de_passe);
      toast.success(`Bienvenue, ${user.nom} !`);
      navigate(`/${user.role}/dashboard`);
    } catch (err) {
      const msg = err?.response?.data?.detail || 'Erreur de connexion';
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
            Gérez vos files d'attente<br />
            <span style={{ 
              background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', 
              WebkitBackgroundClip: 'text', 
              WebkitTextFillColor: 'transparent' 
            }}>
              intelligemment
            </span>
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: 17, maxWidth: 420, lineHeight: 1.6 }}>
            Une plateforme complète pour la gestion des rendez-vous, files d'attente et tâches bancaires propulsée par l'intelligence artificielle.
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

        <div style={{ marginTop: 40, display: 'flex', gap: 10 }}>
          {['Client', 'Agent', 'Manager', 'Directeur', 'Admin'].map(r => (
            <span key={r} style={{
              fontSize: 11, fontWeight: 700, padding: '5px 12px',
              background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 20, color: 'var(--text-secondary)',
              textTransform: 'uppercase', letterSpacing: 0.5
            }}>{r}</span>
          ))}
        </div>
      </div>

      {/* Right panel */}
      <div className="auth-right">
        <div className="auth-card animate-slide">
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <h1 style={{ fontSize: 28, fontWeight: 900, letterSpacing: -1 }}>Connexion</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: 15, marginTop: 8 }}>
              Ravi de vous revoir ! Connectez-vous.
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Email */}
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 600 }}>Adresse email</label>
              <div className="form-input-icon" style={{ position: 'relative' }}>
                <input
                  id="input-email"
                  type="email"
                  className="form-input"
                  placeholder="votre@banque.com"
                  style={{ paddingLeft: 44 }}
                  {...register('email', { required: 'Email requis' })}
                />
              </div>
              {errors.email && <span className="form-error">{errors.email.message}</span>}
            </div>

            {/* Password */}
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 600 }}>Mot de passe</label>
              <div className="form-input-icon" style={{ position: 'relative' }}>
                <input
                  id="input-password"
                  type={showPwd ? 'text' : 'password'}
                  className="form-input"
                  placeholder="••••••••"
                  style={{ paddingLeft: 44, paddingRight: 44 }}
                  {...register('mot_de_passe', { required: 'Mot de passe requis' })}
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

            <div style={{ textAlign: 'right' }}>
              <button
                type="button"
                style={{ background: 'none', border: 'none', color: 'var(--primary-600)', fontSize: 13, cursor: 'pointer', fontWeight: 600 }}
                onClick={() => toast('Contactez votre administrateur pour réinitialiser votre mot de passe', { icon: '📧' })}
              >
                Mot de passe oublié ?
              </button>
            </div>

            <button
              id="btn-login"
              type="submit"
              className="btn btn-primary btn-lg w-full flex items-center justify-center gap-2"
              disabled={loading}
              style={{ padding: '14px', borderRadius: 12, fontSize: 16, fontWeight: 700 }}
            >
              {loading ? (
                <>Connexion en cours...</>
              ) : (
                <>Se connecter</>
              )}
            </button>
          </form>

          {/* Liens d'inscription */}
          <div style={{ textAlign: 'center', marginTop: 32, paddingTop: 24, borderTop: '1px solid var(--border-subtle)' }}>
            <p style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 16, fontWeight: 500 }}>
              Nouveau sur la plateforme ?
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <Link to="/register-client" className="btn btn-ghost w-full flex items-center justify-center gap-2" style={{ border: '1px solid var(--border-subtle)', borderRadius: 12 }}>
                Créer un compte client
              </Link>
              <Link to="/register-institution" className="btn btn-ghost w-full flex items-center justify-center gap-2" style={{ border: '1px solid var(--border-subtle)', borderRadius: 12 }}>
                Inscrire une institution
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}