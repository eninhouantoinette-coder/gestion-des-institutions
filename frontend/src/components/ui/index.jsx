import React from 'react';

export function StatCard({ icon, label, value, delta, deltaType = 'up', color = '#3b82f6', shadow }) {
  return (
    <div className="stat-card" style={{ '--stat-color': color, '--stat-shadow': shadow || `${color}33` }}>
      <div className="stat-icon">{icon}</div>
      <div style={{ flex: 1 }}>
        <div className="stat-label">{label}</div>
        <div className="stat-value">{value}</div>
        {delta && (
          <div className={`stat-delta ${deltaType}`}>
            {deltaType === 'up' ? '↑' : '↓'} {delta}
          </div>
        )}
      </div>
    </div>
  );
}

export function Badge({ children, variant = 'blue' }) {
  return <span className={`badge badge-${variant}`}>{children}</span>;
}

export function Spinner({ size = 32 }) {
  return (
    <div className="animate-spin" style={{
      width: size, height: size,
      border: '3px solid var(--bg-elevated)',
      borderTop: '3px solid var(--primary-500)',
      borderRadius: '50%',
    }} />
  );
}

export function PageLoader() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 300 }}>
      <Spinner />
    </div>
  );
}

export function EmptyState({ icon = '📭', title = 'Aucun résultat', subtitle }) {
  return (
    <div style={{ textAlign: 'center', padding: '48px 24px', color: 'var(--text-muted)' }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>{icon}</div>
      <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-secondary)', marginBottom: 4 }}>{title}</div>
      {subtitle && <div style={{ fontSize: 13 }}>{subtitle}</div>}
    </div>
  );
}

export function Modal({ isOpen, onClose, title, children, size = 520 }) {
  if (!isOpen) return null;
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: size }}>
        <div className="modal-header">
          <span className="modal-title">{title}</span>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4 }}
          >
            <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
              <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function ConfirmModal({ isOpen, onClose, onConfirm, title, message, danger }) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 24 }}>{message}</p>
      <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
        <button className="btn btn-secondary btn-sm" onClick={onClose}>Annuler</button>
        <button
          className={`btn btn-sm ${danger ? 'btn-danger' : 'btn-primary'}`}
          onClick={() => { onConfirm(); onClose(); }}
        >
          Confirmer
        </button>
      </div>
    </Modal>
  );
}

export function FormInput({ label, error, ...props }) {
  return (
    <div className="form-group">
      {label && <label className="form-label">{label}</label>}
      <input className="form-input" {...props} />
      {error && <span className="form-error">{error}</span>}
    </div>
  );
}

export function FormSelect({ label, error, options = [], ...props }) {
  return (
    <div className="form-group">
      {label && <label className="form-label">{label}</label>}
      <select className="form-select" {...props}>
        {options.map((o, idx) => (
          <option key={`${o.value}-${idx}`} value={o.value}>{o.label}</option>
        ))}
      </select>
      {error && <span className="form-error">{error}</span>}
    </div>
  );
}

export function SectionCard({ title, action, children }) {
  return (
    <div className="card">
      {(title || action) && (
        <div className="section-header" style={{ marginBottom: 20 }}>
          {title && <span className="section-title">{title}</span>}
          {action}
        </div>
      )}
      {children}
    </div>
  );
}

export function StatusBadge({ statut }) {
  const map = {
    en_attente:  { label: 'En attente',   variant: 'yellow' },
    confirme:    { label: 'Confirmé',      variant: 'blue'   },
    termine:     { label: 'Terminé',       variant: 'green'  },
    annule:      { label: 'Annulé',        variant: 'red'    },
    actif:       { label: 'Actif',         variant: 'green'  },
    inactif:     { label: 'Inactif',       variant: 'gray'   },
    verrouille:  { label: 'Verrouillé',    variant: 'red'    },
    appele:      { label: 'Appelé',        variant: 'purple' },
    en_cours:    { label: 'En cours',      variant: 'blue'   },
    a_faire:     { label: 'À faire',       variant: 'yellow' },
    no_show:     { label: 'Absent',        variant: 'red'    },
    faible:      { label: 'Faible',        variant: 'green'  },
    moyen:       { label: 'Moyen',         variant: 'yellow' },
    critique:    { label: 'Critique',      variant: 'red'    },
    haute:       { label: 'Haute',         variant: 'orange' },
    urgente:     { label: 'Urgente',       variant: 'red'    },
    normale:     { label: 'Normale',       variant: 'blue'   },
  };
  const { label, variant } = map[statut] || { label: statut, variant: 'gray' };
  return <Badge variant={variant}>{label}</Badge>;
}
