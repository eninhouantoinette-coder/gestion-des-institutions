import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';

const FEATURES = [
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" />
        <path d="M9 9h.01M9 13h.01M9 17h.01" />
      </svg>
    ),
    title: 'Gestion intelligente des files d’attente',
    desc: 'Réduisez les temps d’attente grâce à un système moderne de gestion des tickets, de suivi des files en temps réel et d’orientation efficace des clients.'
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <path d="m9 12 2 2 4-4M8 2v4M16 2v4" />
      </svg>
    ),
    title: 'Répartition optimisée des tâches internes',
    desc: 'Assistez les managers dans l’affectation des tâches aux agents en fonction de la charge de travail, des priorités et de la disponibilité des ressources.'
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
        <path d="m5 3 1 2.5L8.5 6 6 7 5 9.5 4 7 1.5 6 4 5 5 3Z" />
      </svg>
    ),
    title: 'Analyses prédictives et aide à la décision',
    desc: 'Exploitez des outils d’analyse intelligents capables d’anticiper les périodes de forte affluence afin d’améliorer l’organisation des services.'
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="20" x2="18" y2="10" />
        <line x1="12" y1="20" x2="12" y2="4" />
        <line x1="6" y1="20" x2="6" y2="14" />
        <path d="M3 20h18" />
      </svg>
    ),
    title: 'Suivi des performances des agences',
    desc: 'Surveillez les indicateurs clés tels que le temps moyen d’attente, la productivité des agents et l’efficacité des services en temps réel.'
  }
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
        <div style={{ marginBottom: 40 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
            <div>
              <div style={{ fontSize: 24, fontWeight: 900, letterSpacing: -0.5 }}>BanqueQueue</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1.2, marginTop: 4 }}>
                Plateforme intelligente de gestion des files d’attente et des services bancaires
              </div>
            </div>
          </div>

          <h2 style={{ fontSize: 36, fontWeight: 900, letterSpacing: -1.5, lineHeight: 1.2, marginBottom: 16 }}>
            Optimisez l’accueil des clients,<br />
            <span style={{ 
              background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', 
              WebkitBackgroundClip: 'text', 
              WebkitTextFillColor: 'transparent' 
            }}>
              et facilitez la prise de décision
            </span>
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: 15, maxWidth: 480, lineHeight: 1.6 }}>
            Améliorez l’organisation interne de vos agences grâce à une solution prédictive dédiée aux banques et aux institutions de microfinance.
          </p>
        </div>

        <div style={{ display: 'grid', gap: 14 }}>
          {FEATURES.map(f => (
            <div key={f.title} className="feature-item" style={{
              display: 'flex', gap: 16, alignItems: 'flex-start',
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: 16, padding: '16px 20px',
              transition: 'all 0.25s ease',
            }}>
              <div style={{
                color: 'var(--primary-500)',
                background: 'rgba(59,130,246,0.08)',
                padding: 10,
                borderRadius: 12,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                {f.icon}
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4, color: 'var(--text-primary)' }}>{f.title}</div>
                <div style={{ fontSize: 12.5, color: 'var(--text-muted)', lineHeight: 1.45 }}>{f.desc}</div>
              </div>
            </div>
          ))}
        </div>


        <div style={{ 
          marginTop: 24, 
          padding: '16px 20px', 
          background: 'rgba(59, 130, 246, 0.03)', 
          borderLeft: '3px solid var(--primary-500)', 
          borderRadius: '4px 16px 16px 4px',
          maxWidth: 480 
        }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--primary-400)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Une solution adaptée aux institutions financières
          </div>
          <div style={{ fontSize: 12.5, color: 'var(--text-muted)', lineHeight: 1.5 }}>
            BanqueQueue offre une plateforme centralisée permettant d’améliorer l’expérience client, de fluidifier les opérations internes et d’optimiser la gestion quotidienne des banques et des institutions de microfinance.
          </div>
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