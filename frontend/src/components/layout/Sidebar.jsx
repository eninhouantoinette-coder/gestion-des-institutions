import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';

const NAV_CONFIG = {
  client: [
    { label: 'Tableau de bord', path: '/client/dashboard' },
    { label: 'Mon ticket',       path: '/client/ticket' },
    { label: 'Mes rendez-vous',  path: '/client/rdv' },
    { label: 'Notifications',    path: '/client/notifications' },
    { label: 'Mon historique',   path: '/client/historique' },
    { label: 'Mon profil',       path: '/client/profil' },
  ],
  agent: [
    { label: 'Tableau de bord', path: '/agent/dashboard' },
    { label: "File d'attente",   path: '/agent/file' },
    { label: 'Mes tâches',       path: '/agent/taches' },
    { label: 'Mon historique',   path: '/agent/historique' },
    { label: 'Mon profil',       path: '/agent/profil' },
  ],
  manager: [
    { label: 'Tableau de bord', path: '/manager/dashboard' },
    { label: "File d'attente",  path: '/manager/file' },
    { label: 'Gestion agents',  path: '/manager/agents' },
    { label: 'Alertes',         path: '/manager/alertes' },
    { label: 'Tâches',          path: '/manager/taches' },
    { label: 'Rapports',        path: '/manager/rapports' },
    { label: 'Statistiques',    path: '/manager/stats' },
  ],
  directeur: [
    { label: 'Tableau de bord', path: '/directeur/dashboard' },
    { label: 'Prédictions IA',  path: '/directeur/predictions' },
    { label: 'Comparaison',     path: '/directeur/comparaison' },
    { label: 'Rapports',        path: '/directeur/rapports' },
  ],
  admin: [
    { label: 'Tableau de bord', path: '/admin/dashboard' },
    { label: 'Utilisateurs',    path: '/admin/utilisateurs' },
    { label: 'Agences',         path: '/admin/agences' },
    { label: 'Services',        path: '/admin/services' },
    { label: 'Configuration',   path: '/admin/config' },
    { label: 'Logs système',    path: '/admin/logs' },
  ],
};

const ROLE_LABELS = {
  client: 'Client', agent: 'Agent', manager: 'Manager',
  directeur: 'Directeur', admin: 'Administrateur',
};

const ROLE_COLORS = {
  client: '#3b82f6', agent: '#10b981', manager: '#f59e0b',
  directeur: '#8b5cf6', admin: '#ef4444',
};

export default function Sidebar() {
  const { user, logout } = useAuth();
  const { unreadCount }  = useSocket() || {};
  const navigate         = useNavigate();
  const location         = useLocation();
  const navItems         = NAV_CONFIG[user?.role] || [];
  const initials         = user?.nom?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">🏦</div>
        <div>
          <div className="sidebar-logo-text">BanqueQueue</div>
          <div className="sidebar-logo-sub">Système de gestion</div>
        </div>
      </div>

      {/* Role badge */}
      <div style={{ padding: '10px 24px' }}>
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          background: `${ROLE_COLORS[user?.role]}18`,
          color: ROLE_COLORS[user?.role],
          fontSize: 11, fontWeight: 700, padding: '4px 10px',
          borderRadius: 20, textTransform: 'uppercase', letterSpacing: 1,
        }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor' }} />
          {ROLE_LABELS[user?.role]}
        </span>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        <div className="sidebar-section-title">Navigation</div>
        {navItems.map(({ label, path, badge }) => (
          <button
            key={path}
            onClick={() => navigate(path)}
            className={`sidebar-item ${location.pathname === path ? 'active' : ''}`}
            id={`nav-${label.toLowerCase().replace(/\s+/g, '-')}`}
          >
            <span>{label}</span>
            {badge && <span className="sidebar-badge">{badge}</span>}
            {label === 'Notifications' && unreadCount > 0 && (
              <span className="sidebar-badge">{unreadCount}</span>
            )}
          </button>
        ))}
      </nav>

      {/* Footer */}
      <div className="sidebar-footer">
        <div className="sidebar-user" style={{ marginBottom: 12 }}>
          <div className="sidebar-avatar" style={{ background: `linear-gradient(135deg, ${ROLE_COLORS[user?.role]}, #8b5cf6)` }}>
            {initials}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="sidebar-user-name truncate">{user?.nom}</div>
            <div className="sidebar-user-role">{ROLE_LABELS[user?.role]}</div>
          </div>
        </div>
        <button
          onClick={logout}
          id="btn-logout"
          style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: 8,
            padding: '8px 12px', borderRadius: 8, border: 'none',
            background: 'rgba(239,68,68,0.08)', color: '#f87171',
            fontSize: 13, fontWeight: 600, cursor: 'pointer',
            transition: 'var(--transition)',
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.15)'}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(239,68,68,0.08)'}
        >
          Déconnexion
        </button>
      </div>
    </aside>
  );
}
