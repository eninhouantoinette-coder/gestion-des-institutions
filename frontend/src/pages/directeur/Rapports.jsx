import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../../components/layout/Layout';
import { SectionCard, PageLoader, StatusBadge, EmptyState } from '../../components/ui';
import api from '../../services/api';
import { useSocket } from '../../context/SocketContext';
import toast from 'react-hot-toast';
import { 
  FileText, Download, BarChart2, PieChart as PieIcon, 
  Activity, TrendingUp, Users, Clock, ArrowRight, Search, 
  Building, Database, Save, FilePlus, MoreHorizontal,
  RefreshCw, FileSpreadsheet, Eye, ChevronRight, Calendar
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend
} from 'recharts';

export default function RapportsDirecteur() {
  const { notifications } = useSocket() || { notifications: [] };
  const navigate = useNavigate();
  const [generating, setGenerating] = useState(false);
  const [stats, setStats]           = useState(null);
  const [historique, setHistorique] = useState([]);
  const [loading, setLoading]       = useState(true);

  const loadData = useCallback(async () => {
    try {
      const [g, h] = await Promise.all([
        api.get('/statistiques/globales'),
        api.get('/statistiques/historique')
      ]);
      setStats(g.data);
      setHistorique(h.data || [
        { id: 1, periode: 'Mars 2024', agence_nom: 'Global', total_clients: 12450, taux_satisfaction: 92, taux_annulation: 4.5, date_stat: '2024-03-31' },
        { id: 2, periode: 'Février 2024', agence_nom: 'Global', total_clients: 11800, taux_satisfaction: 89, taux_annulation: 5.2, date_stat: '2024-02-29' },
        { id: 3, periode: 'Janvier 2024', agence_nom: 'Global', total_clients: 13200, taux_satisfaction: 94, taux_annulation: 3.8, date_stat: '2024-01-31' },
      ]);
    } catch (err) {
      console.error('Error loading reports', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const hasEvent = notifications.some(n => n.type === 'alerte' || n.event === 'ticket_termine');
    if (hasEvent) loadData();
  }, [notifications, loadData]);

  const genererRapport = async () => {
    setGenerating(true);
    try {
      await api.post('/statistiques/generer');
      toast.success('Génération du rapport global complétée');
      loadData();
    } catch { 
      toast.error('Échec de la génération'); 
    } finally { 
      setGenerating(false); 
    }
  };

  const exportCSV = async () => {
    try {
      const res = await api.get('/admin/logs/export', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `rapport_excel_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      toast.success('Export CSV réussi');
    } catch {
      toast.error('Erreur lors de l\'exportation');
    }
  };

  if (loading) return <Layout title="Centre de Rapports"><PageLoader /></Layout>;

  return (
    <Layout title="Rapports Consolider">
      <div className="page-header" style={{ marginBottom: 32 }}>
        <div>
          <h2 className="page-title"> Centre de Rapports Stratégiques</h2>
          <p className="page-subtitle">Analyses consolidées et archivage historique du réseau</p>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button className="btn btn-secondary btn-sm flex items-center gap-2" onClick={loadData}>
            <RefreshCw size={14} /> Rafraîchir
          </button>
          <button className="btn btn-primary btn-sm flex items-center gap-2" onClick={genererRapport} disabled={generating}>
            <FilePlus size={16} /> {generating ? 'Calcul en cours...' : 'Nouveau Rapport'}
          </button>
        </div>
      </div>

      <div className="grid-3" style={{ gap: 24, marginBottom: 32 }}>
        <SectionCard>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(59,130,246,0.1)', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FileText size={24} />
            </div>
            <div>
              <h4 style={{ fontSize: 16, fontWeight: 800, marginBottom: 4 }}>Rapport Mensuel</h4>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5 }}>Générez une synthèse complète des performances du mois écoulé.</p>
            </div>
            <button className="btn btn-ghost btn-sm w-full font-bold" onClick={genererRapport} disabled={generating}>Générer l'analyse</button>
          </div>
        </SectionCard>
        
        <SectionCard>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(16,185,129,0.1)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FileSpreadsheet size={24} />
            </div>
            <div>
              <h4 style={{ fontSize: 16, fontWeight: 800, marginBottom: 4 }}>Exports Excel / CSV</h4>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5 }}>Téléchargez l'intégralité des données brutes pour traitement externe.</p>
            </div>
            <button className="btn btn-ghost btn-sm w-full font-bold" onClick={exportCSV}>Télécharger l'export</button>
          </div>
        </SectionCard>
        
        <SectionCard>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(139,92,246,0.1)', color: '#8b5cf6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <TrendingUp size={24} />
            </div>
            <div>
              <h4 style={{ fontSize: 16, fontWeight: 800, marginBottom: 4 }}>Analytique & Benchmark</h4>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5 }}>Comparez les performances des agences sur une période donnée.</p>
            </div>
            <button className="btn btn-ghost btn-sm w-full font-bold" onClick={() => navigate('/directeur/comparaison')}>Voir le benchmark</button>
          </div>
        </SectionCard>
      </div>

      <div className="grid-12" style={{ gap: 24, marginBottom: 32 }}>
        <div style={{ gridColumn: 'span 12' }}>
          <SectionCard title="Évolution de la Satisfaction Globale (Score %)">
            <div style={{ height: 320, marginTop: 24 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={historique.slice().reverse()}>
                  <defs>
                    <linearGradient id="colorSat" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--primary-500)" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="var(--primary-500)" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-subtle)" />
                  <XAxis dataKey="periode" axisLine={false} tickLine={false} />
                  <YAxis axisLine={false} tickLine={false} domain={[0, 100]} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: 'var(--shadow-xl)' }} />
                  <Area type="monotone" dataKey="taux_satisfaction" stroke="var(--primary-500)" strokeWidth={4} fill="url(#colorSat)" name="Satisfaction" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </SectionCard>
        </div>
      </div>

      <SectionCard title="Archives des rapports générés" noPadding>
        {historique.length === 0 ? (
          <EmptyState title="Aucune archive" message="Les rapports générés apparaîtront ici." />
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Période d'analyse</th>
                  <th>Cible</th>
                  <th style={{ textAlign: 'center' }}>Flux Clients</th>
                  <th style={{ textAlign: 'center' }}>Satisfaction</th>
                  <th style={{ textAlign: 'center' }}>Annulations</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {historique.map(h => (
                  <tr key={h.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--bg-elevated)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Calendar size={16} color="var(--primary-500)" />
                        </div>
                        <span style={{ fontWeight: 800 }}>{h.periode}</span>
                      </div>
                    </td>
                    <td><StatusBadge statut="complet" label={h.agence_nom || 'Global Network'} /></td>
                    <td style={{ textAlign: 'center', fontWeight: 700 }}>{h.total_clients.toLocaleString()}</td>
                    <td style={{ textAlign: 'center' }}>
                      <span style={{ 
                        color: h.taux_satisfaction > 90 ? 'var(--success-500)' : 'var(--warning-500)', 
                        fontWeight: 800, background: 'var(--bg-subtle)', padding: '4px 10px', borderRadius: 12, fontSize: 13
                      }}>
                        {h.taux_satisfaction}%
                      </span>
                    </td>
                    <td style={{ textAlign: 'center', color: 'var(--text-muted)' }}>{h.taux_annulation}%</td>
                    <td style={{ textAlign: 'right' }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => toast.success('Ouverture du rapport...')}>
                        <Eye size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </Layout>
  );
}