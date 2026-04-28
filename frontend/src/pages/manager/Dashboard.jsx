import React, { useEffect, useState } from 'react';
import Layout from '../../components/layout/Layout';
import { StatCard, SectionCard, StatusBadge, PageLoader, EmptyState } from '../../components/ui';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { 
  Users, Ticket, AlertTriangle, TrendingUp, Clock, 
  ArrowUpRight, ArrowDownRight, Activity, Calendar, Bell, AlertCircle
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar
} from 'recharts';

export default function ManagerDashboard() {
  const { user } = useAuth();
  const [stats, setStats]         = useState(null);
  const [statsMois, setStatsMois] = useState(null);
  const [alertes, setAlertes] = useState([]);
  const [agents, setAgents]   = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const agenceId = user?.agence_id;
        const today = new Date().toISOString().split('T')[0];
        const lastMonth = new Date();
        lastMonth.setDate(lastMonth.getDate() - 30);
        const lastMonthStr = lastMonth.toISOString().split('T')[0];

        const [stDay, stMonth, al, ag] = await Promise.all([
          api.get(`/statistiques/agence/${agenceId || 1}`, { params: { date_debut: today, date_fin: today } }),
          api.get(`/statistiques/agence/${agenceId || 1}`, { params: { date_debut: lastMonthStr, date_fin: today } }),
          api.get('/alertes', { params: { agence_id: agenceId } }),
          api.get('/users', { params: { role: 'agent', agence_id: agenceId, per_page: 50 } }),
        ]);
        setStats(stDay.data);
        setStatsMois(stMonth.data);
        setAlertes(al.data.slice(0, 5));
        setAgents(ag.data?.items || []);
      } catch (err) {
        console.error('Error loading dashboard stats:', err);
      } finally { 
        setLoading(false); 
      }
    };
    load();
  }, [user]);

  // Données graphique simulées si non présentes
  const trend = stats?.graphique_frequentation || Array.from({ length: 7 }, (_, i) => ({
    jour: ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'][i],
    clients: Math.floor(Math.random() * 80) + 20,
    attente: Math.floor(Math.random() * 30) + 5,
  }));

  if (loading) return <Layout title="Tableau de bord"><PageLoader /></Layout>;

  return (
    <Layout title="Tableau de bord Manager">
      <div className="page-header">
        <div>
          <h2 className="page-title">Tableau de bord Manager </h2>
          <p className="page-subtitle">Agence {user?.agence_nom || (user?.agence_id ? `#${user.agence_id}` : 'principale')}</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <div style={{ padding: '8px 16px', background: 'var(--bg-elevated)', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600 }}>
            <Calendar size={16} color="var(--primary-500)" />
            {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </div>
        </div>
      </div>

      <div className="grid-5" style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '16px', marginBottom: 28 }}>
        <StatCard 
          icon={<Ticket size={24} />} 
          label="Tickets du jour" 
          value={stats?.total_clients || 0} 
          color="var(--primary-500)" 
        />
        <StatCard 
          icon={<Activity size={24} />} 
          label="Volume Mensuel" 
          value={statsMois?.total_clients || 0} 
          color="var(--info-500)" 
        />
        <StatCard 
          icon={<Users size={24} />} 
          label="Agents connectés" 
          value={agents.filter(a => a.agent_status === 'disponible' || a.agent_status === 'occupe').length} 
          valueSuffix={`/ ${agents.length}`}
          color="var(--success-500)" 
        />
        <StatCard 
          icon={<Clock size={24} />} 
          label="Attente moyenne" 
          value={`${stats?.temps_attente_moyen || 12} min`} 
          color="var(--warning-500)" 
        />
        <StatCard 
          icon={<AlertTriangle size={24} />} 
          label="Alertes actives" 
          value={alertes.filter(a => a.statut === 'active').length} 
          color="var(--danger-500)" 
        />
      </div>

      <div className="grid-12">
        <div style={{ gridColumn: 'span 8' }}>
          <SectionCard title="Fréquentation de l'agence (7 jours)">
            <div style={{ height: 350, width: '100%', marginTop: 20 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trend}>
                  <defs>
                    <linearGradient id="colorClients" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--primary-500)" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="var(--primary-500)" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-subtle)" />
                  <XAxis dataKey="jour" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--text-muted)' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--text-muted)' }} />
                  <Tooltip 
                    contentStyle={{ borderRadius: 12, border: 'none', boxShadow: 'var(--shadow-lg)', background: 'var(--bg-card)' }} 
                  />
                  <Area 
                    type="monotone" 
                    dataKey="clients" 
                    stroke="var(--primary-500)" 
                    strokeWidth={3} 
                    fillOpacity={1} 
                    fill="url(#colorClients)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </SectionCard>
        </div>

        <div style={{ gridColumn: 'span 4' }}>
          <SectionCard title="Alertes récentes" footer={<button className="btn btn-ghost btn-sm w-full" onClick={() => window.location.href='/manager/alertes'}>Voir toutes les alertes</button>}>
            {alertes.length === 0 ? (
              <EmptyState 
                compact
                icon={<Bell size={24} />}
                title="Tout est normal" 
                message="Aucun incident signalé."
              />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {alertes.map(a => (
                  <div key={a.id} style={{ 
                    padding: 12, borderRadius: 10, background: 'var(--bg-elevated)', 
                    borderLeft: `3px solid ${a.niveau === 'critique' ? 'var(--danger-500)' : 'var(--warning-500)'}`,
                    display: 'flex', gap: 12, alignItems: 'center'
                  }}>
                    <div style={{ color: a.niveau === 'critique' ? 'var(--danger-500)' : 'var(--warning-500)' }}>
                      <AlertCircle size={18} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-primary)' }}>{a.message}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{new Date(a.created_at).toLocaleTimeString()}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        </div>
      </div>
    </Layout>
  );
}