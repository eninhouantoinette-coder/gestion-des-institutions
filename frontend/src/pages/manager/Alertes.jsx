import React, { useEffect, useState } from 'react';
import Layout from '../../components/layout/Layout';
import { SectionCard, StatusBadge, PageLoader, EmptyState } from '../../components/ui';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import toast from 'react-hot-toast';
import { 
  AlertTriangle, Bell, Activity, TrendingUp, Clock, 
  UserX, Users, Check, RotateCcw, AlertCircle, ShieldAlert 
} from 'lucide-react';

export default function AlertesManager() {
  const { user } = useAuth();
  const { notifications } = useSocket() || { notifications: [] };
  const [alertes, setAlertes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('tous'); 
  const [processing, setProcessing] = useState(false);

  const loadData = async () => {
    if (!user?.agence_id) return;
    setProcessing(true);
    try {
      const { data } = await api.get('/alertes', { 
        params: { 
          agence_id: user.agence_id, 
          statut: filter === 'resolue' ? 'resolue' : 'active' 
        } 
      });
      setAlertes(data || []);
    } catch (e) {
      console.error('[ERR] loadData alertes:', e);
    } finally {
      setLoading(false);
      setProcessing(false);
    }
  };

  useEffect(() => {
    if (user?.agence_id) loadData();
    const interval = setInterval(() => {
      if (user?.agence_id) loadData();
    }, 60000);
    return () => clearInterval(interval);
  }, [user, filter]);

  useEffect(() => {
    const hasNewAlert = notifications.some(n => n.type === 'alerte' || n.type === 'surcharge');
    if (hasNewAlert) loadData();
  }, [notifications]);

  const resoudreAlerte = async (alerteId) => {
    setProcessing(true);
    try {
      await api.put(`/alertes/${alerteId}/resoudre`);
      toast.success('Alerte résolue');
      loadData();
    } catch (e) {
      toast.error('Erreur lors de la résolution');
    } finally {
      setProcessing(false);
    }
  };

  const getNiveauConfig = (niveau) => {
    switch (niveau) {
      case 'critique': return { color: '#ef4444', icon: ShieldAlert, label: 'Critique' };
      case 'urgent': return { color: '#f97316', icon: AlertTriangle, label: 'Urgent' };
      case 'attention': return { color: '#f59e0b', icon: Bell, label: 'Attention' };
      case 'info': return { color: '#3b82f6', icon: Activity, label: 'Info' };
      default: return { color: '#64748b', icon: Bell, label: niveau };
    }
  };

  const getTypeConfig = (type) => {
    switch (type) {
      case 'surcharge': return { label: 'Surcharge file', icon: TrendingUp };
      case 'retard': return { label: 'Retard agent', icon: Clock };
      case 'absence': return { label: 'Absence', icon: UserX };
      case 'attente_longue': return { label: 'Attente excessive', icon: Clock };
      case 'agent_inactif': return { label: 'Agent inactif', icon: Users };
      default: return { label: type, icon: Bell };
    }
  };

  if (loading) return <Layout title="Alertes agence"><PageLoader /></Layout>;

  const filteredAlertes = alertes.filter(a => {
    if (filter === 'tous') return true;
    if (filter === 'active') return a.statut === 'active' || a.statut === 'nouvelle';
    if (filter === 'resolue') return a.statut === 'resolue';
    if (filter === 'critique') return a.niveau === 'critique' || a.niveau === 'urgent';
    return true;
  });

  return (
    <Layout title="Alertes agence">
      <div className="page-header" style={{ marginBottom: 24 }}>
        <div>
          <h2 className="page-title"> Surveillance des alertes</h2>
          <p className="page-subtitle">Gestion en temps réel des incidents de l'agence</p>
        </div>
        <button className="btn btn-secondary btn-sm flex items-center gap-2" onClick={loadData} disabled={processing}>
          <RotateCcw size={14} className={processing ? 'animate-spin' : ''} /> Actualiser
        </button>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 24, overflowX: 'auto', paddingBottom: 4 }}>
        {[
          { key: 'tous', label: 'Toutes les alertes' },
          { key: 'active', label: 'Alertes actives' },
          { key: 'critique', label: 'Priorité Critique' },
          { key: 'resolue', label: 'Historique Résolues' },
        ].map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            style={{
              padding: '10px 20px', borderRadius: 10, border: '1px solid var(--border-subtle)',
              background: filter === f.key ? 'var(--primary-500)' : 'var(--bg-card)',
              color: filter === f.key ? '#fff' : 'var(--text-secondary)',
              cursor: 'pointer', fontWeight: 600, fontSize: 13, transition: 'all 0.2s'
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      <SectionCard>
        {filteredAlertes.length === 0 ? (
          <EmptyState 
            icon={<Bell size={48} />}
            title="Calme plat !" 
            message="Aucune alerte à signaler pour le moment."
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {filteredAlertes.map(alerte => {
              const config = getNiveauConfig(alerte.niveau);
              const typeCfg = getTypeConfig(alerte.type);
              const Icon = config.icon;
              const TypeIcon = typeCfg.icon;
              
              return (
                <div key={alerte.id} style={{
                  padding: '20px', background: 'var(--bg-card)', borderRadius: 16,
                  border: `1px solid ${alerte.statut === 'resolue' ? 'rgba(16,185,129,0.2)' : 'var(--border-subtle)'}`,
                  borderLeft: `4px solid ${alerte.statut === 'resolue' ? 'var(--success-500)' : config.color}`,
                  display: 'flex', gap: 20, alignItems: 'flex-start',
                  position: 'relative', overflow: 'hidden'
                }}>
                  <div style={{
                    width: 52, height: 52, borderRadius: 14,
                    background: `${config.color}15`, color: config.color,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                  }}>
                    <Icon size={26} />
                  </div>

                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontWeight: 800, fontSize: 17 }}>{alerte.message}</span>
                        <StatusBadge statut={alerte.statut} />
                      </div>
                      <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>
                        {new Date(alerte.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 16 }}>
                      <div style={{ fontSize: 13, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <TypeIcon size={14} /> <span>Type: <strong>{typeCfg.label}</strong></span>
                      </div>
                      <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                        <span>•</span> <span style={{ marginLeft: 16 }}>{new Date(alerte.created_at).toLocaleDateString('fr-FR')}</span>
                      </div>
                    </div>

                    {alerte.statut !== 'resolue' && (
                      <div style={{ display: 'flex', gap: 12, paddingTop: 16, borderTop: '1px solid var(--border-subtle)' }}>
                        <button 
                          className="btn btn-primary btn-sm flex items-center gap-2" 
                          onClick={() => resoudreAlerte(alerte.id)}
                          disabled={processing}
                          style={{ padding: '8px 16px', fontWeight: 700 }}
                        >
                          <Check size={14} /> Marquer comme résolue
                        </button>
                        {alerte.type === 'surcharge' && (
                          <button className="btn btn-outline btn-sm font-bold" onClick={() => toast.success('Protocol de renfort envoyé')}>
                            Solliciter renfort
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </SectionCard>
    </Layout>
  );
}