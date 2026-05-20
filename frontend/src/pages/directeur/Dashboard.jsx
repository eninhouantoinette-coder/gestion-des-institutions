import React, { useEffect, useState, useCallback } from 'react';
import Layout from '../../components/layout/Layout';
import { StatCard, SectionCard, PageLoader } from '../../components/ui';
import api from '../../services/api';
import { useSocket } from '../../context/SocketContext';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, AreaChart, Area, Cell, PieChart, Pie
} from 'recharts';
import { 
  TrendingUp, Users, CheckCircle, Clock, ArrowUp, ArrowDown, 
  RefreshCw, Building2, LayoutDashboard, Globe, AlertTriangle,
  Calendar, Zap, Activity
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function DirecteurDashboard() {
  const { notifications } = useSocket() || { notifications: [] };
  const [globals, setGlobals]   = useState(null);
  const [agences, setAgences]   = useState([]);
  const [statsAgences, setStatsAgences] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [periode, setPeriode] = useState('30_jours');

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    
    try {
      const [g, a] = await Promise.all([
        api.get('/statistiques/globales', { params: { periode } }),
        api.get('/agences'),
      ]);
      setGlobals(g.data);
      setAgences(a.data);
      setStatsAgences(g.data?.stats_par_agence || []);
    } catch (e) {
      console.error('Directeur dashboard load error:', e);
    } finally { 
      setLoading(false); 
      setRefreshing(false);
    }
  }, [periode]);

  useEffect(() => {
    load();
    const interval = setInterval(() => load(true), 30000);
    return () => clearInterval(interval);
  }, [load]);

  useEffect(() => {
    const hasEvent = notifications.some(n => n.type === 'alerte' || n.event === 'ticket_appele');
    if (hasEvent) load(true);
  }, [notifications, load]);

  if (loading) return <Layout title="Dashboard Global"><PageLoader /></Layout>;

  return (
    <Layout title="Dashboard Direction Générale">
      <div className="page-header" style={{ marginBottom: 32 }}>
        <div>
          <h2 className="page-title">Tableau de bord stratégique </h2>
          <p className="page-subtitle">Supervision panoptique du réseau d'agences</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ display: 'flex', background: 'var(--bg-card)', padding: 4, borderRadius: 12, border: '1px solid var(--border-subtle)' }}>
            {['aujourd_hui', '30_jours'].map(p => (
              <button 
                key={p}
                onClick={() => setPeriode(p)}
                style={{
                  padding: '8px 16px', fontSize: 12, borderRadius: 8, border: 'none',
                  background: periode === p ? 'var(--primary-500)' : 'transparent',
                  color: periode === p ? '#fff' : 'var(--text-muted)',
                  cursor: 'pointer', fontWeight: 700, transition: 'all 0.2s'
                }}
              >
                {p === 'aujourd_hui' ? "Aujourd'hui" : "30 jours"}
              </button>
            ))}
          </div>
          <button 
            className="btn btn-secondary btn-sm flex items-center gap-2" 
            onClick={() => load(true)}
            disabled={refreshing}
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} /> 
            {refreshing ? 'Mise à jour...' : 'Actualiser'}
          </button>
        </div>
      </div>

      <div className="grid-4" style={{ marginBottom: 32 }}>
        <StatCard 
          label="Total Clients" 
          value={globals?.total_tickets || globals?.total_clients || 0} 
          icon={<Users size={24} />} 
          color="var(--primary-500)" 
          trend={{ value: '14.2%', color: 'var(--success-500)', icon: <ArrowUp size={14} /> }}
        />
        <StatCard 
          label="Agences Réseau" 
          value={agences.length} 
          icon={<Building2 size={24} />} 
          color="var(--success-500)" 
        />
        <StatCard 
          label="Surcharge Critique" 
          value={notifications.filter(n => n.type === 'surcharge').length} 
          icon={<AlertTriangle size={24} />} 
          color="var(--danger-500)" 
        />
        <StatCard 
          label="Attente Moyenne" 
          value={`${globals?.temps_attente_moyen_global || 16}m`} 
          icon={<Clock size={24} />} 
          color="var(--warning-500)" 
        />
      </div>

      <div className="grid-12" style={{ gap: 24, marginBottom: 32 }}>
        <div style={{ gridColumn: 'span 8' }}>
          <SectionCard title="Tendance analytique des flux">
            <div style={{ height: 350, marginTop: 24 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={globals?.graphique_tendance || [
                  { date: '01/04', volume: 150 }, { date: '05/04', volume: 280 }, { date: '10/04', volume: 190 },
                  { date: '15/04', volume: 340 }, { date: '20/04', volume: 220 }, { date: '25/04', volume: 410 }
                ]}>
                  <defs>
                    <linearGradient id="colorFlow" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--primary-500)" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="var(--primary-500)" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-subtle)" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: 'var(--shadow-xl)' }} />
                  <Area type="monotone" dataKey="volume" stroke="var(--primary-500)" strokeWidth={3} fillOpacity={1} fill="url(#colorFlow)" name="Volume Global" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </SectionCard>
        </div>

        <div style={{ gridColumn: 'span 4' }}>
          <SectionCard title="Performance par agence">
            <div style={{ height: 350, marginTop: 24 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={[...statsAgences].sort((a, b) => b.tickets_traites - a.tickets_traites)}>
                  <XAxis dataKey="agence_nom" axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                  <Tooltip cursor={{ fill: 'rgba(0,0,0,0.05)' }} />
                  <Bar dataKey="tickets_traites" name="Traités" fill="var(--success-500)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </SectionCard>
        </div>
      </div>

      <SectionCard title="Monitoring détaillé du réseau" noPadding>
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Agence</th>
                <th>Volume Global</th>
                <th>Traités (Success)</th>
                <th>Satisfaction %</th>
                <th>Attente Moyenne</th>
                <th style={{ textAlign: 'right' }}>Statut</th>
              </tr>
            </thead>
            <tbody>
              {statsAgences.map((s) => (
                <tr key={s.agence_id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--bg-elevated)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Building2 size={18} color="var(--primary-500)" />
                      </div>
                      <div style={{ fontWeight: 800, fontSize: 15 }}>{s.agence_nom}</div>
                    </div>
                  </td>
                  <td style={{ fontWeight: 600 }}>{s.total_clients}</td>
                  <td style={{ color: 'var(--success-500)', fontWeight: 800 }}>{s.tickets_traites}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ flex: 1, height: 6, background: 'var(--bg-subtle)', borderRadius: 3, maxWidth: 60 }}>
                        <div style={{ width: `${s.taux_satisfaction}%`, height: '100%', background: s.taux_satisfaction > 85 ? 'var(--success-500)' : 'var(--warning-500)', borderRadius: 3 }} />
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 700 }}>{s.taux_satisfaction}%</span>
                    </div>
                  </td>
                  <td style={{ fontWeight: 700, color: s.temps_attente_moyen > 18 ? 'var(--danger-500)' : 'var(--text-primary)' }}>
                    {s.temps_attente_moyen} min
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <span style={{ 
                      display: 'inline-flex', padding: '4px 10px', borderRadius: 12, fontSize: 11, fontWeight: 800,
                      background: s.temps_attente_moyen > 20 ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                      color: s.temps_attente_moyen > 20 ? 'var(--danger-500)' : 'var(--success-500)',
                      textTransform: 'uppercase'
                    }}>
                      {s.temps_attente_moyen > 20 ? 'Surcharge' : 'Nominal'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </Layout>
  );
}