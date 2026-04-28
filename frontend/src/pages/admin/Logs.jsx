import React, { useEffect, useState } from 'react';
import Layout from '../../components/layout/Layout';
import { SectionCard, PageLoader, FormInput } from '../../components/ui';
import api from '../../services/api';
import toast from 'react-hot-toast';

const ACTION_COLORS = {
  LOGIN:  '#10b981', LOGOUT: '#64748b', CREATE: '#3b82f6',
  UPDATE: '#f59e0b', DELETE: '#ef4444', ERROR:  '#ef4444',
};

export default function Logs() {
  const [logs, setLogs]       = useState([]);
  const [total, setTotal]     = useState(0);
  const [page, setPage]       = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState('');
  const [dateDebut, setDateDebut] = useState('');

  const perPage = 50;

  const load = async () => {
    setLoading(true);
    try {
      const params = { page, per_page: perPage };
      if (search) params.action = search;
      if (dateDebut) params.date_debut = dateDebut;
      const { data } = await api.get('/admin/logs', { params });
      setLogs(data.items || []);
      setTotal(data.total || 0);
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [page, search, dateDebut]); // eslint-disable-line

  const exportCSV = async () => {
    try {
      const res = await api.get('/admin/logs/export', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url; a.download = `logs_${new Date().toISOString().split('T')[0]}.csv`; a.click();
      window.URL.revokeObjectURL(url);
      toast.success('Logs exportés en CSV');
    } catch { toast.error('Erreur export'); }
  };

  const pages = Math.ceil(total / perPage);

  if (loading && page === 1) return <Layout title="Logs système"><PageLoader /></Layout>;

  return (
    <Layout title="Logs système">
      <div className="page-header flex justify-between items-center">
        <div>
          <h2 className="page-title">Logs système</h2>
          <p className="page-subtitle">{total} entrée(s) dans l'audit log</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-secondary btn-sm" onClick={load} disabled={loading}>
            Actualiser
          </button>
          <button id="btn-export-csv" className="btn btn-primary btn-sm" onClick={exportCSV}>
             Exporter CSV
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="card" style={{ marginBottom: 20, display: 'flex', gap: 16, alignItems: 'flex-end' }}>
        <div style={{ flex: 1 }}>
          <label className="form-label">Rechercher par action</label>
          <input
            className="form-input"
            placeholder="LOGIN, LOGOUT, CREATE..."
            value={search}
            onChange={e => { setSearch(e.target.value.toUpperCase()); setPage(1); }}
          />
        </div>
        <div style={{ flex: 1 }}>
          <FormInput 
            label="Date de début" 
            type="date" 
            value={dateDebut} 
            onChange={e => { setDateDebut(e.target.value); setPage(1); }} 
          />
        </div>
        {(search || dateDebut) && (
          <button className="btn btn-ghost btn-sm" onClick={() => { setSearch(''); setDateDebut(''); setPage(1); }}>
            Réinitialiser
          </button>
        )}
      </div>

      <SectionCard title="Historique des actions">
        {loading ? (
          <div style={{ textAlign: 'center', padding: '48px 0' }}>
            <div className="animate-spin" style={{ width: 36, height: 36, border: '3px solid #1e3a8a', borderTop: '3px solid #3b82f6', borderRadius: '50%', margin: '0 auto' }} />
          </div>
        ) : (
          <>
            <div className="table-wrapper">
              <table className="table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Action</th>
                    <th>Description</th>
                    <th>User ID</th>
                    <th>IP</th>
                    <th>Date & Heure</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.length === 0 ? (
                    <tr><td colSpan={6} className="table-empty">Aucun log trouvé</td></tr>
                  ) : logs.map(l => (
                    <tr key={l.id}>
                      <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>#{l.id}</td>
                      <td>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center',
                          padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                          fontFamily: 'monospace', letterSpacing: 0.5,
                          background: `${ACTION_COLORS[l.action] || '#64748b'}22`,
                          color: ACTION_COLORS[l.action] || '#94a3b8',
                        }}>
                          {l.action}
                        </span>
                      </td>
                      <td style={{ fontSize: 13, maxWidth: 300 }}>
                        <div className="truncate" title={l.description}>{l.description || '—'}</div>
                      </td>
                      <td style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                        {l.user_id ? `#${l.user_id}` : '—'}
                      </td>
                      <td>
                        <code style={{ fontSize: 12, color: 'var(--text-muted)', background: 'var(--bg-elevated)', padding: '2px 6px', borderRadius: 4 }}>
                          {l.ip_address || '—'}
                        </code>
                      </td>
                      <td style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                        {l.created_at ? new Date(l.created_at).toLocaleString('fr-FR') : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, marginTop: 20 }}>
                <button className="btn btn-ghost btn-sm" onClick={() => setPage(p => Math.max(1, p-1))} disabled={page === 1}>
                  Précédent
                </button>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)' }}>
                  Page {page} / {pages}
                </span>
                <button className="btn btn-ghost btn-sm" onClick={() => setPage(p => Math.min(pages, p+1))} disabled={page === pages}>
                  Suivant
                </button>
              </div>
            )}
          </>
        )}
      </SectionCard>
    </Layout>
  );
}