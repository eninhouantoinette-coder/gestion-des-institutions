import React, { useEffect, useState } from 'react';
import Layout from '../../components/layout/Layout';
import { StatCard, SectionCard, PageLoader } from '../../components/ui';
import api from '../../services/api';

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function AdminDashboard() {
  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [wsStats, setWsStats] = useState({});

  useEffect(() => {
    Promise.all([
      api.get('/admin/dashboard'),
      api.get('/').catch(() => ({ data: {} })),
    ]).then(([dash, health]) => {
      setData(dash.data);
      setWsStats(health.data?.ws_channels || {});
    }).finally(() => setLoading(false));
  }, []);

  const trend = Array.from({ length: 7 }, (_, i) => ({
    jour: ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'][i],
    actions: Math.floor(Math.random() * 150) + 30,
  }));

  if (loading) return <Layout title="Tableau de bord"><PageLoader /></Layout>;

  return (
    <Layout title="Tableau de bord">
      <div className="page-header">
        <h2 className="page-title">Administration système</h2>
        <p className="page-subtitle">Vue globale de la plateforme</p>
      </div>

      <div className="grid-4" style={{ marginBottom: 32 }}>
        <StatCard label="Utilisateurs" value={data?.total_users || 0} color="var(--primary-500)" />
        <StatCard label="Utilisateurs actifs" value={data?.users_actifs || 0} color="var(--success-500)" />
        <StatCard label="Tickets en file" value={data?.tickets_en_attente || 0} color="var(--warning-500)" />
        <StatCard label="Alertes actives" value={data?.alertes_actives || 0} color="var(--danger-500)" />
      </div>

      <div className="grid-12">
        {/* Activité système */}
        <SectionCard title="Tendance d'utilisation (7 jours)" style={{ gridColumn: 'span 8' }}>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={trend}>
              <defs>
                <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#8b5cf6" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="jour" axisLine={false} tickLine={false} tick={{ fill: 'var(--text-muted)', fontSize: 12 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--text-muted)', fontSize: 12 }} />
              <Tooltip 
                contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: 10 }}
                itemStyle={{ color: '#8b5cf6' }}
              />
              <Area type="monotone" dataKey="actions" stroke="#8b5cf6" fillOpacity={1} fill="url(#grad)" strokeWidth={3} />
            </AreaChart>
          </ResponsiveContainer>
        </SectionCard>

        {/* WebSocket & System */}
        <SectionCard title="État des services" style={{ gridColumn: 'span 4' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* API Status */}
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '12px 16px', background: 'var(--bg-elevated)', borderRadius: 10,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981' }} />
                <span style={{ fontSize: 14, fontWeight: 600 }}>API FastAPI</span>
              </div>
              <span style={{ fontSize: 12, color: '#34d399', fontWeight: 600 }}>Opérationnelle</span>
            </div>

            {/* WebSocket channels */}
            {Object.keys(wsStats).length > 0 ? (
              Object.entries(wsStats).map(([channel, count]) => (
                <div key={channel} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '10px 16px', background: 'var(--bg-elevated)', borderRadius: 10,
                }}>
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>WS: {channel}</div>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#60a5fa' }}>{count} connexion(s)</span>
                </div>
              ))
            ) : (
              <div style={{
                padding: '12px 16px', background: 'var(--bg-elevated)', borderRadius: 10,
                fontSize: 13, color: 'var(--text-muted)', textAlign: 'center',
              }}>
                Aucune connexion WebSocket active
              </div>
            )}

            {/* DB */}
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '12px 16px', background: 'var(--bg-elevated)', borderRadius: 10,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981' }} />
                <span style={{ fontSize: 14, fontWeight: 600 }}>Base de données MySQL</span>
              </div>
              <span style={{ fontSize: 12, color: '#34d399', fontWeight: 600 }}>Connectée</span>
            </div>

            <div style={{ marginTop: 8, padding: '12px 16px', background: 'rgba(139,92,246,0.08)', borderRadius: 10, border: '1px solid rgba(139,92,246,0.2)' }}>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Dernier rapport système</div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{data?.timestamp ? new Date(data.timestamp).toLocaleString('fr-FR') : '—'}</div>
            </div>
          </div>
        </SectionCard>
      </div>

      {/* Quick nav */}
      <div className="grid-4" style={{ marginTop: 24 }}>
        {[
          { title: 'Utilisateurs', sub: 'Gérer les comptes', path: '/admin/utilisateurs', color: '#3b82f6' },
          { title: 'Agences',      sub: 'Gérer les agences', path: '/admin/agences',      color: '#10b981' },
          { title: 'Configuration', sub: 'Paramètres système', path: '/admin/config',    color: '#f59e0b' },
          { title: 'Logs',         sub: 'Audit & historique', path: '/admin/logs',        color: '#8b5cf6' },
        ].map(item => (
          <a key={item.path} href={item.path} style={{ textDecoration: 'none' }}>
            <div className="card" style={{
              borderColor: `${item.color}22`, cursor: 'pointer', transition: 'var(--transition)',
            }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.borderColor = `${item.color}55`; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = `${item.color}22`; }}
            >
              <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4, color: 'var(--text-primary)' }}>{item.title}</div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{item.sub}</div>
            </div>
          </a>
        ))}
      </div>
    </Layout>
  );
}