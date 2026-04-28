import React, { useEffect, useState } from 'react';
import Layout from '../../components/layout/Layout';
import { SectionCard, PageLoader, FormSelect, StatCard } from '../../components/ui';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { 
  BarChart3, PieChart as PieIcon, TrendingUp, Users, 
  Calendar, Clock, Percent, ArrowUp, ArrowDown, RefreshCw
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line, AreaChart, Area
} from 'recharts';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444'];

export default function ManagerStats() {
  const { user }  = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [periode, setPeriode] = useState('mois');

  const loadStats = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/statistiques/agence/${user?.agence_id || 1}`);
      setStats(data);
    } catch (err) {
      console.error('Error loading stats', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, [user, periode]);

  const pieData = [
    { name: 'Traités', value: stats?.tickets_termines || 65 },
    { name: 'Annulés', value: stats?.rdv_annules || 15 },
    { name: 'En cours', value: 20 },
  ];

  const barData = Array.from({ length: 7 }, (_, i) => ({
    jour: ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'][i],
    tickets: Math.floor(Math.random() * 80) + 20,
    rdv: Math.floor(Math.random() * 40) + 10,
  }));

  if (loading) return <Layout title="Statistiques"><PageLoader /></Layout>;

  return (
    <Layout title="Statistiques Avancées">
      <div className="page-header" style={{ marginBottom: 32 }}>
        <div>
          <h2 className="page-title"> Statistiques d'agence</h2>
          <p className="page-subtitle">Analyse approfondie de la performance et des flux</p>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          {['Semaine', 'Mois', 'Trimestre'].map(p => (
            <button
              key={p}
              onClick={() => setPeriode(p.toLowerCase())}
              className={`btn btn-sm ${periode === p.toLowerCase() ? 'btn-primary' : 'btn-outline'}`}
              style={{ padding: '8px 16px', borderRadius: 10, fontWeight: 700 }}
            >
              {p}
            </button>
          ))}
          <button className="btn btn-ghost btn-sm" onClick={loadStats}>
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      <div className="grid-4" style={{ marginBottom: 32 }}>
        <StatCard 
          label="Total Clients" 
          value={stats?.total_clients || 0} 
          icon={<Users size={24} />} 
          color="#3b82f6" 
          trend={{ value: '+8%', color: '#10b981', icon: <ArrowUp size={12} /> }}
        />
        <StatCard 
          label="RDV Honorés" 
          value={stats?.rdv_total || 0} 
          icon={<Calendar size={24} />} 
          color="#10b981" 
        />
        <StatCard 
          label="Taux d'Annulation" 
          value={`${stats?.taux_annulation || 0}%`} 
          icon={<Percent size={24} />} 
          color="#f59e0b" 
        />
        <StatCard 
          label="Temps Moyen" 
          value={`${stats?.temps_attente_moyen || 14}m`} 
          icon={<Clock size={24} />} 
          color="#8b5cf6" 
        />
      </div>

      <div className="grid-12" style={{ gap: 24 }}>
        <div style={{ gridColumn: 'span 7' }}>
          <SectionCard title="Comparaison flux hebdomadaire">
            <div style={{ height: 350, marginTop: 24 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-subtle)" />
                  <XAxis dataKey="jour" axisLine={false} tickLine={false} />
                  <YAxis axisLine={false} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ borderRadius: 12, border: 'none', boxShadow: 'var(--shadow-lg)' }} 
                  />
                  <Legend verticalAlign="top" align="right" height={36} />
                  <Bar dataKey="tickets" name="Tickets" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="rdv" name="Rendez-vous" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </SectionCard>
        </div>

        <div style={{ gridColumn: 'span 5' }}>
          <SectionCard title="Répartition des statuts">
            <div style={{ height: 350, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={100}
                    paddingAngle={8}
                    dataKey="value"
                  >
                    {pieData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display: 'flex', gap: 16, marginTop: 20 }}>
                {pieData.map((d, i) => (
                  <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 10, height: 10, borderRadius: 5, background: COLORS[i] }} />
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>{d.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </SectionCard>
        </div>
      </div>
    </Layout>
  );
}