import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { PrivateRoute } from './PrivateRoute';
import { useAuth } from '../context/AuthContext';

// Auth
const Login = lazy(() => import('../pages/auth/Login'));
const RegisterInstitution = lazy(() => import('../pages/auth/RegisterInstitution'));
const RegisterClient = lazy(() => import('../pages/auth/RegisterClient'));

// Client
const ClientDashboard   = lazy(() => import('../pages/client/Dashboard'));
const MesRdv            = lazy(() => import('../pages/client/MesRdv'));
const MonTicket         = lazy(() => import('../pages/client/MonTicket'));
const Notifications     = lazy(() => import('../pages/client/Notifications'));
const Profil            = lazy(() => import('../pages/client/Profil'));
const Historique        = lazy(() => import('../pages/client/Historique'));

// Agent
const AgentDashboard    = lazy(() => import('../pages/agent/Dashboard'));
const FileAttente       = lazy(() => import('../pages/agent/FileAttente'));
const MesTaches         = lazy(() => import('../pages/agent/MesTaches'));
const AgentProfil       = lazy(() => import('../pages/agent/Profil'));
const AgentHistorique   = lazy(() => import('../pages/agent/Historique'));

// Manager
const ManagerDashboard  = lazy(() => import('../pages/manager/Dashboard'));
const GestionAgents     = lazy(() => import('../pages/manager/GestionAgents'));
const ManagerStats      = lazy(() => import('../pages/manager/Statistiques'));
const ManagerTaches     = lazy(() => import('../pages/manager/Taches'));
const ManagerFileAttente = lazy(() => import('../pages/manager/FileAttente'));
const ManagerAlertes    = lazy(() => import('../pages/manager/Alertes'));
const ManagerRapports   = lazy(() => import('../pages/manager/Rapports'));

// Directeur
const DirecteurDashboard = lazy(() => import('../pages/directeur/Dashboard'));
const DirecteurPredictions = lazy(() => import('../pages/directeur/Predictions'));
const DirecteurRapports  = lazy(() => import('../pages/directeur/Rapports'));
const DirecteurComparaison = lazy(() => import('../pages/directeur/Comparaison'));

// Admin
const AdminDashboard    = lazy(() => import('../pages/admin/Dashboard'));
const Utilisateurs      = lazy(() => import('../pages/admin/Utilisateurs'));
const Agences           = lazy(() => import('../pages/admin/Agences'));
const Services          = lazy(() => import('../pages/admin/Services'));
const Configuration     = lazy(() => import('../pages/admin/Configuration'));
const Logs              = lazy(() => import('../pages/admin/Logs'));

const Spinner = () => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
    <div className="animate-spin" style={{
      width: 36, height: 36, border: '3px solid #1e3a8a',
      borderTop: '3px solid #3b82f6', borderRadius: '50%'
    }} />
  </div>
);

function RoleRedirect() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={`/${user.role}/dashboard`} replace />;
}

export default function AppRoutes() {
  return (
    <Suspense fallback={<Spinner />}>
      <Routes>
        {/* Public */}
        <Route path="/login" element={<Login />} />
        <Route path="/register-institution" element={<RegisterInstitution />} />
        <Route path="/register-client" element={<RegisterClient />} />
        <Route path="/" element={<RoleRedirect />} />

        {/* Client */}
        <Route path="/client/dashboard"      element={<PrivateRoute roles={['client']}><ClientDashboard /></PrivateRoute>} />
        <Route path="/client/rdv"            element={<PrivateRoute roles={['client']}><MesRdv /></PrivateRoute>} />
        <Route path="/client/ticket"         element={<PrivateRoute roles={['client']}><MonTicket /></PrivateRoute>} />
        <Route path="/client/notifications"  element={<PrivateRoute roles={['client']}><Notifications /></PrivateRoute>} />
        <Route path="/client/profil"         element={<PrivateRoute roles={['client']}><Profil /></PrivateRoute>} />
        <Route path="/client/historique"     element={<PrivateRoute roles={['client']}><Historique /></PrivateRoute>} />

        {/* Agent */}
        <Route path="/agent/dashboard"    element={<PrivateRoute roles={['agent']}><AgentDashboard /></PrivateRoute>} />
        <Route path="/agent/file"         element={<PrivateRoute roles={['agent']}><FileAttente /></PrivateRoute>} />
        <Route path="/agent/taches"       element={<PrivateRoute roles={['agent']}><MesTaches /></PrivateRoute>} />
        <Route path="/agent/profil"       element={<PrivateRoute roles={['agent']}><AgentProfil /></PrivateRoute>} />
        <Route path="/agent/historique"   element={<PrivateRoute roles={['agent']}><AgentHistorique /></PrivateRoute>} />

        {/* Manager */}
        <Route path="/manager/dashboard"  element={<PrivateRoute roles={['manager']}><ManagerDashboard /></PrivateRoute>} />
        <Route path="/manager/agents"     element={<PrivateRoute roles={['manager']}><GestionAgents /></PrivateRoute>} />
        <Route path="/manager/stats"      element={<PrivateRoute roles={['manager']}><ManagerStats /></PrivateRoute>} />
        <Route path="/manager/taches"     element={<PrivateRoute roles={['manager']}><ManagerTaches /></PrivateRoute>} />
        <Route path="/manager/file"       element={<PrivateRoute roles={['manager']}><ManagerFileAttente /></PrivateRoute>} />
        <Route path="/manager/alertes"    element={<PrivateRoute roles={['manager']}><ManagerAlertes /></PrivateRoute>} />
        <Route path="/manager/rapports"   element={<PrivateRoute roles={['manager']}><ManagerRapports /></PrivateRoute>} />

        {/* Directeur */}
        <Route path="/directeur/dashboard"    element={<PrivateRoute roles={['directeur']}><DirecteurDashboard /></PrivateRoute>} />
        <Route path="/directeur/predictions"  element={<PrivateRoute roles={['directeur']}><DirecteurPredictions /></PrivateRoute>} />
        <Route path="/directeur/rapports"     element={<PrivateRoute roles={['directeur']}><DirecteurRapports /></PrivateRoute>} />
        <Route path="/directeur/comparaison"  element={<PrivateRoute roles={['directeur']}><DirecteurComparaison /></PrivateRoute>} />

        {/* Admin */}
        <Route path="/admin/dashboard"    element={<PrivateRoute roles={['admin']}><AdminDashboard /></PrivateRoute>} />
        <Route path="/admin/utilisateurs" element={<PrivateRoute roles={['admin']}><Utilisateurs /></PrivateRoute>} />
        <Route path="/admin/agences"      element={<PrivateRoute roles={['admin']}><Agences /></PrivateRoute>} />
        <Route path="/admin/services"      element={<PrivateRoute roles={['admin']}><Services /></PrivateRoute>} />
        <Route path="/admin/config"       element={<PrivateRoute roles={['admin']}><Configuration /></PrivateRoute>} />
        <Route path="/admin/logs"         element={<PrivateRoute roles={['admin']}><Logs /></PrivateRoute>} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
