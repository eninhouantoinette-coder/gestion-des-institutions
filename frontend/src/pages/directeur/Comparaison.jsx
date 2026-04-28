import React, { useEffect, useState, useCallback } from 'react';
import Layout from '../../components/layout/Layout';
import { SectionCard, PageLoader, StatCard } from '../../components/ui';
import api from '../../services/api';
import { useSocket } from '../../context/SocketContext';
import toast from 'react-hot-toast';
import { 
  Building2, Clock, Calendar, BarChart2, TrendingUp, 
  Star, FileText, Download, LayoutGrid, Search, 
  Building, Users, ArrowUp, ArrowDown, RefreshCw,
  Trophy, AlertCircle, Medal
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Cell, PieChart, Pie, Legend, LineChart, Line, AreaChart, Area
} from 'recharts';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

export default function Comparaison() {
  const { notifications } = useSocket() || { notifications: [] };
  const [agences, setAgences] = useState([]);
  const [statsAgences, setStatsAgences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [periode, setPeriode] = useState('30_jours');

  const loadData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const { data } = await api.get('/statistiques/globales', { params: { periode } });
      const agRes = await api.get('/agences');
      setAgences(agRes.data || []);
      setStatsAgences(data?.stats_par_agence || [
        { agence_id: 1, agence_nom: 'Agence Nord', total_clients: 450, tickets_traites: 410, temps_attente_moyen: 12, taux_satisfaction: 94 },
        { agence_id: 2, agence_nom: 'Agence Sud', total_clients: 380, tickets_traites: 320, temps_attente_moyen: 18, taux_satisfaction: 88 },
        { agence_id: 3, agence_nom: 'Agence Est', total_clients: 520, tickets_traites: 490, temps_attente_moyen: 10, taux_satisfaction: 96 },
        { agence_id: 4, agence_nom: 'Agence Ouest', total_clients: 290, tickets_traites: 210, temps_attente_moyen: 22, taux_satisfaction: 82 },
      ]);
    } catch (e) {
      console.error('Error loading comparison stats', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [periode]);

  useEffect(() => {
    loadData();
    const interval = setInterval(() => loadData(true), 60000);
    return () => clearInterval(interval);
  }, [loadData]);

  useEffect(() => {
    const hasUpdate = notifications.some(n => n.event === 'ticket_appele' || n.event === 'ticket_termine');
    if (hasUpdate) loadData(true);
  }, [notifications, loadData]);

  const bestAgency = [...statsAgences].sort((a,b) => (b.tickets_traites || 0) - (a.tickets_traites || 0))[0];
  const worstAgency = [...statsAgences].sort((a,b) => (a.taux_satisfaction || 0) - (b.taux_satisfaction || 0))[0];
  const globalWait = statsAgences.length ? Math.round(statsAgences.reduce((acc, a) => acc + (a.temps_attente_moyen || 0), 0) / statsAgences.length) : 0;

  if (loading) return <Layout title="Comparaison"><PageLoader /></Layout>;

  return (
    <Layout title="Benchmarking Agences">
      <div className="page-header" style={{ marginBottom: 32 }}>
        <div>
          <h2 className="page-title"> Comparaison des agences</h2>
          <p className="page-subtitle">Analyse comparative de la performance du réseau</p>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button className="btn btn-secondary btn-sm flex items-center gap-2" onClick={() => loadData(true)} disabled={refreshing}>
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} /> Actualiser
          </button>
          <button className="btn btn-primary btn-sm flex items-center gap-2">
            <Download size={14} /> Rapport PDF
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 32, padding: 6, background: 'var(--bg-card)', borderRadius: 12, width: 'fit-content', border: '1px solid var(--border-subtle)' }}>
        {[
          { id: 'aujourd_hui', label: "Aujourd'hui", icon: Clock },
          { id: '7_jours', label: "7j", icon: Calendar },
          { id: '30_jours', label: "30j", icon: BarChart2 },
        ].map(p => {
          const Icon = p.icon;
          const isActive = periode === p.id;
          return (
            <button
              key={p.id}
              onClick={() => setPeriode(p.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '8px 20px', borderRadius: 8, border: 'none',
                background: isActive ? 'var(--primary-500)' : 'transparent',
                color: isActive ? '#fff' : 'var(--text-muted)',
                cursor: 'pointer', fontWeight: 700, fontSize: 13, transition: 'all 0.2s'
              }}
            >
              <Icon size={14} /> {p.label}
            </button>
          );
        })}
      </div>

      <div className="grid-4" style={{ marginBottom: 32 }}>
        <StatCard label="Agences Actives" value={agences.length} icon={<Building size={24} />} color="var(--primary-500)" />
        <StatCard label="Top Performance" value={bestAgency?.agence_nom || 'N/A'} icon={<Trophy size={24} />} color="var(--success-500)" />
        <StatCard label="Point d'Attention" value={worstAgency?.agence_nom || 'N/A'} icon={<AlertCircle size={24} />} color="var(--danger-500)" />
        <StatCard label="Attente Globale" value={`${globalWait}m`} icon={<Clock size={24} />} color="var(--warning-500)" />
      </div>

      <div className="grid-12" style={{ gap: 24, marginBottom: 24 }}>
        <div style={{ gridColumn: 'span 7' }}>
          <SectionCard title="Comparaison du flux (Volume Clients)">
            <div style={{ height: 350, marginTop: 24 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={statsAgences}>
                  <XAxis dataKey="agence_nom" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
                  <Tooltip cursor={{ fill: 'rgba(0,0,0,0.05)' }} contentStyle={{ borderRadius: 12, border: 'none', boxShadow: 'var(--shadow-lg)' }} />
                  <Bar dataKey="total_clients" name="Total Clients" fill="var(--primary-500)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="tickets_traites" name="Traités" fill="var(--success-500)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </SectionCard>
        </div>

        <div style={{ gridColumn: 'span 5' }}>
          <SectionCard title="Satisfaction Client">
            <div style={{ height: 350, display: 'flex', flexDirection: 'column' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statsAgences}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={5}
                    dataKey="taux_satisfaction"
                    nameKey="agence_nom"
                  >
                    {statsAgences.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 12 }}>
                {statsAgences.map((a, i) => (
                  <div key={a.agence_id} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                    <div style={{ width: 8, height: 8, borderRadius: 4, background: COLORS[i % COLORS.length] }} />
                    <span style={{ fontWeight: 600 }}>{a.agence_nom} : {a.taux_satisfaction}%</span>
                  </div>
                ))}
              </div>
            </div>
          </SectionCard>
        </div>
      </div>

      <SectionCard title="Détail des performances par agence" noPadding>
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Agence</th>
                <th style={{ textAlign: 'center' }}>Flux</th>
                <th style={{ textAlign: 'center' }}>Traités</th>
                <th>Traitement %</th>
                <th style={{ textAlign: 'center' }}>Attente</th>
                <th>Satisfaction</th>
              </tr>
            </thead>
            <tbody>
              {statsAgences.map(a => {
                const ratio = Math.round((a.tickets_traites / a.total_clients) * 100) || 0;
                return (
                  <tr key={a.agence_id}>
                    <td style={{ fontWeight: 800 }}>{a.agence_nom}</td>
                    <td style={{ textAlign: 'center' }}>{a.total_clients}</td>
                    <td style={{ textAlign: 'center' }}>{a.tickets_traites}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ flex: 1, height: 6, background: 'var(--bg-subtle)', borderRadius: 3, overflow: 'hidden' }}>
                          <div style={{ width: `${ratio}%`, height: '100%', background: ratio > 80 ? 'var(--success-500)' : 'var(--primary-500)', borderRadius: 3 }} />
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 700, minWidth: 35 }}>{ratio}%</span>
                      </div>
                    </td>
                    <td style={{ textAlign: 'center', fontWeight: 800, color: a.temps_attente_moyen > 15 ? 'var(--danger-500)' : 'var(--success-500)' }}>
                      {a.temps_attente_moyen} min
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ display: 'flex' }}>
                          {[1,2,3,4,5].map(star => (
                            <Star key={star} size={10} fill={star <= Math.round(a.taux_satisfaction/20) ? '#f59e0b' : 'none'} color="#f59e0b" />
                          ))}
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 700 }}>{a.taux_satisfaction}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </Layout>
  );
}