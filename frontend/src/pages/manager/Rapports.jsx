import React, { useEffect, useState } from 'react';
import Layout from '../../components/layout/Layout';
import { SectionCard, PageLoader, EmptyState } from '../../components/ui';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import { 
  BarChart3, PieChart as PieIcon, LineChart as LineIcon, 
  TrendingUp, Users, CheckCircle, Clock, ArrowUp, ArrowDown, 
  RefreshCw, FileText, Download, Calendar, Activity, 
  ChevronRight, Target
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend, AreaChart, Area
} from 'recharts';

export default function RapportsManager() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [periode, setPeriode] = useState('7j'); 
  const [stats, setStats] = useState(null);
  const [agents, setAgents] = useState([]);
  const [tickets, setTickets] = useState([]);

  const loadData = async () => {
    setLoading(true);
    try {
      const agenceId = user?.agence_id || 1;
      const [statsRes, agentsRes, ticketsRes] = await Promise.all([
        api.get(`/statistiques/agence/${agenceId}`),
        api.get('/users', { params: { role: 'agent', agence_id: agenceId, per_page: 50 } }),
        api.get('/tickets', { params: { agence_id: agenceId, per_page: 500 } })
      ]);
      setStats(statsRes.data);
      setAgents(agentsRes.data?.items || []);
      setTickets(ticketsRes.data?.items || ticketsRes.data || []);
    } catch (e) {
      toast.error('Erreur de chargement des statistiques');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [periode, user]);

  // Mock data for visualizations
  const heuresData = [
    { heure: '08h', tickets: 12 }, { heure: '10h', tickets: 25 }, { heure: '12h', tickets: 18 },
    { heure: '14h', tickets: 32 }, { heure: '16h', tickets: 21 }, { heure: '18h', tickets: 9 }
  ];

  const semaineData = [
    { jour: 'Lun', flux: 45, attente: 12 }, { jour: 'Mar', flux: 52, attente: 15 },
    { jour: 'Mer', flux: 38, attente: 10 }, { jour: 'Jeu', flux: 65, attente: 22 },
    { jour: 'Ven', flux: 48, attente: 18 }, { jour: 'Sam', flux: 30, attente: 8 }
  ];

  const serviceData = [
    { name: 'Caisses', value: 45, color: '#3b82f6' },
    { name: 'Conseillers', value: 30, color: '#10b981' },
    { name: 'Réclamations', value: 15, color: '#f59e0b' },
    { name: 'Autres', value: 10, color: '#8b5cf6' }
  ];

  const exportCSV = () => {
    const headers = ['ID', 'Numéro', 'Statut', 'Agent', 'Service', 'Date'];
    const rows = tickets.map(t => [
      t.id, t.numero_ticket, t.statut, t.agent_nom || 'N/A', t.service_nom || 'N/A', new Date(t.created_at).toLocaleDateString()
    ]);
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `rapport_agence_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    toast.success('Rapport exporté !');
  };

  if (loading) return <Layout title="Rapports d'agence"><PageLoader /></Layout>;

  return (
    <Layout title="Analytique et Rapports">
      <div className="page-header" style={{ marginBottom: 32 }}>
        <div>
          <h2 className="page-title"> Rapports et Performance</h2>
          <p className="page-subtitle">Analyse détaillée de l'activité commerciale</p>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <select 
            value={periode} 
            onChange={(e) => setPeriode(e.target.value)}
            className="form-select"
            style={{ width: 160, borderRadius: 10 }}
          >
            <option value="7j">7 derniers jours</option>
            <option value="30j">30 derniers jours</option>
            <option value="3m">Trimestre</option>
            <option value="1a">Année</option>
          </select>
          <button className="btn btn-outline btn-sm flex items-center gap-2" onClick={loadData}>
            <RefreshCw size={14} /> Actualiser
          </button>
          <button className="btn btn-primary btn-sm flex items-center gap-2" onClick={exportCSV}>
            <Download size={14} /> Exporter
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid-4" style={{ marginBottom: 32 }}>
        <SectionCard>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(59,130,246,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3b82f6' }}>
              <TrendingUp size={24} />
            </div>
            <div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Total Tickets</div>
              <div style={{ fontSize: 26, fontWeight: 900 }}>{stats?.total_clients || 0}</div>
              <div style={{ fontSize: 11, color: '#10b981', display: 'flex', alignItems: 'center', gap: 2 }}>
                <ArrowUp size={10} /> 12.4% <span style={{ color: 'var(--text-muted)' }}>vs mois préc.</span>
              </div>
            </div>
          </div>
        </SectionCard>
        <SectionCard>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(16,185,129,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981' }}>
              <Clock size={24} />
            </div>
            <div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Attente Moyenne</div>
              <div style={{ fontSize: 26, fontWeight: 900 }}>{stats?.temps_attente_moyen || 14}<span style={{ fontSize: 14 }}>m</span></div>
              <div style={{ fontSize: 11, color: '#ef4444', display: 'flex', alignItems: 'center', gap: 2 }}>
                <ArrowUp size={10} /> 2.1% <span style={{ color: 'var(--text-muted)' }}>flux élevé</span>
              </div>
            </div>
          </div>
        </SectionCard>
        <SectionCard>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(245,158,11,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f59e0b' }}>
              <CheckCircle size={24} />
            </div>
            <div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Taux de Traitement</div>
              <div style={{ fontSize: 26, fontWeight: 900 }}>{stats?.taux_traitement || 92}<span style={{ fontSize: 14 }}>%</span></div>
              <div style={{ fontSize: 11, color: '#10b981', display: 'flex', alignItems: 'center', gap: 2 }}>
                <ArrowUp size={10} /> 4.5% <span style={{ color: 'var(--text-muted)' }}>efficiency</span>
              </div>
            </div>
          </div>
        </SectionCard>
        <SectionCard>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(139,92,246,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8b5cf6' }}>
              <Target size={24} />
            </div>
            <div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Objectifs</div>
              <div style={{ fontSize: 26, fontWeight: 900 }}>88<span style={{ fontSize: 14 }}>%</span></div>
              <div style={{ fontSize: 11, color: '#3b82f6', display: 'flex', alignItems: 'center', gap: 2 }}>
                <Activity size={10} /> En progression
              </div>
            </div>
          </div>
        </SectionCard>
      </div>

      <div className="grid-12" style={{ gap: 24, marginBottom: 24 }}>
        <div style={{ gridColumn: 'span 8' }}>
          <SectionCard title="Fluctuation de l'activité (Semaine)">
            <div style={{ height: 350, marginTop: 24 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={semaineData}>
                  <defs>
                    <linearGradient id="colorFlux" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-subtle)" />
                  <XAxis dataKey="jour" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--text-muted)' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--text-muted)' }} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: 'var(--shadow-lg)', background: 'var(--bg-card)' }} />
                  <Area type="monotone" dataKey="flux" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorFlux)" name="Volume Clients" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </SectionCard>
        </div>

        <div style={{ gridColumn: 'span 4' }}>
          <SectionCard title="Répartition par service">
            <div style={{ height: 300, display: 'flex', flexDirection: 'column' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={serviceData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {serviceData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 12 }}>
                {serviceData.map((s) => (
                  <div key={s.name} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 8, height: 8, borderRadius: 4, background: s.color }} />
                    <span style={{ fontSize: 12, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{s.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </SectionCard>
        </div>
      </div>

      <div className="grid-12" style={{ gap: 24 }}>
        <div style={{ gridColumn: 'span 6' }}>
          <SectionCard title="Performance horaire">
            <div style={{ height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={heuresData}>
                  <XAxis dataKey="heure" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
                  <Tooltip cursor={{ fill: 'rgba(0,0,0,0.05)' }} contentStyle={{ borderRadius: 12, border: 'none' }} />
                  <Bar dataKey="tickets" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Nombre de tickets" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </SectionCard>
        </div>
        <div style={{ gridColumn: 'span 6' }}>
          <SectionCard title="Taux d'abandon vs Complétion" footer={<button className="btn btn-ghost btn-xs w-full text-primary">Analyse approfondie</button>}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '10px 0' }}>
              {[
                { label: 'Demandes traitées', value: 85, color: '#10b981' },
                { label: 'Abandons / Non-présentations', value: 12, color: '#ef4444' },
                { label: 'Retards accumulés', value: 3, color: '#f59e0b' }
              ].map((item) => (
                <div key={item.label}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
                    <span style={{ fontWeight: 600 }}>{item.label}</span>
                    <span style={{ fontWeight: 800 }}>{item.value}%</span>
                  </div>
                  <div style={{ height: 8, background: 'var(--bg-subtle)', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{ width: `${item.value}%`, height: '100%', background: item.color, borderRadius: 4 }} />
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>
      </div>
    </Layout>
  );
}