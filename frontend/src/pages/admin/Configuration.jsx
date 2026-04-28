import React, { useEffect, useState } from 'react';
import Layout from '../../components/layout/Layout';
import { SectionCard, PageLoader, FormInput } from '../../components/ui';
import api from '../../services/api';
import toast from 'react-hot-toast';

const CONFIG_LABELS = {
  seuil_file_attente:    { label: 'Seuil alerte file d\'attente', desc: 'Nombre max de clients avant déclenchement alerte', type: 'number' },
  duree_session_minutes: { label: 'Durée session (minutes)',      desc: 'Durée de validité du token JWT',                   type: 'number' },
  notifications_email:   { label: 'Notifications email',          desc: 'Activer l\'envoi d\'emails automatiques',          type: 'boolean' },
  max_rdv_par_jour:      { label: 'RDV max par client/jour',      desc: 'Nombre maximum de rendez-vous par client',         type: 'number' },
};

export default function Configuration() {
  const [config, setConfig] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]  = useState({});

  useEffect(() => {
    api.get('/admin/config').then(r => setConfig(r.data)).finally(() => setLoading(false));
  }, []);

  const save = async (cle) => {
    setSaving(s => ({ ...s, [cle]: true }));
    try {
      await api.put(`/admin/config/${cle}`, null, { params: { valeur: config[cle] } });
      toast.success(`Paramètre "${cle}" mis à jour`);
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Erreur');
    } finally { setSaving(s => ({ ...s, [cle]: false })); }
  };

  const reload = () => {
    setLoading(true);
    api.get('/admin/config').then(r => setConfig(r.data)).finally(() => setLoading(false));
  };

  if (loading) return <Layout title="Configuration"><PageLoader /></Layout>;

  const allKeys = [...new Set([...Object.keys(CONFIG_LABELS), ...Object.keys(config)])];

  return (
    <Layout title="Configuration">
      <div className="page-header flex justify-between items-center">
        <div>
          <h2 className="page-title">Configuration système</h2>
          <p className="page-subtitle">Paramètres globaux de la plateforme</p>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={reload}>
           Actualiser
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {allKeys.map(cle => {
          const meta = CONFIG_LABELS[cle] || { label: cle, desc: '', type: 'text' };
          const val  = config[cle] ?? '';

          return (
            <div key={cle} className="card" style={{
              borderColor: 'rgba(255,255,255,0.06)',
              transition: 'var(--transition)',
            }}>
              <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 2 }}>{meta.label}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{meta.desc}</div>
                </div>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  {meta.type === 'boolean' ? (
                    <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                      <div
                        onClick={() => setConfig(c => ({ ...c, [cle]: val === 'true' ? 'false' : 'true' }))}
                        style={{
                          width: 44, height: 24, borderRadius: 12, position: 'relative', cursor: 'pointer',
                          background: val === 'true' ? 'var(--primary-600)' : 'var(--bg-elevated)',
                          border: '1px solid var(--border-default)',
                          transition: 'var(--transition)',
                        }}
                      >
                        <div style={{
                          position: 'absolute', top: 2,
                          left: val === 'true' ? 22 : 2,
                          width: 18, height: 18, borderRadius: '50%',
                          background: '#fff', transition: 'left 0.2s',
                        }} />
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 600, color: val === 'true' ? 'var(--success-400)' : 'var(--text-muted)' }}>
                        {val === 'true' ? 'Activé' : 'Désactivé'}
                      </span>
                    </label>
                  ) : (
                    <input
                      type={meta.type}
                      className="form-input"
                      value={val}
                      onChange={e => setConfig(c => ({ ...c, [cle]: e.target.value }))}
                      style={{ width: 120, padding: '8px 12px' }}
                    />
                  )}
                  <button
                    id={`btn-save-${cle}`}
                    className="btn btn-primary btn-sm"
                    onClick={() => save(cle)}
                    disabled={saving[cle]}
                    style={{ whiteSpace: 'nowrap' }}
                  >
                     {saving[cle] ? 'Sauvegarde...' : 'Sauvegarder'}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Danger zone */}
      <div className="card" style={{ marginTop: 32, borderColor: 'rgba(239,68,68,0.2)', background: 'rgba(239,68,68,0.03)' }}>
        <div style={{ fontWeight: 700, fontSize: 15, color: '#f87171', marginBottom: 12 }}>
          Zone de danger
        </div>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
          Ces actions sont irréversibles. Procédez avec prudence.
        </p>
        <div style={{ display: 'flex', gap: 12 }}>
          <button className="btn btn-ghost btn-sm" style={{ borderColor: 'rgba(239,68,68,0.3)', color: '#f87171', fontWeight: 600 }}
            onClick={() => toast.error('Action désactivée en démonstration')}>
            Purger les logs anciens
          </button>
          <button className="btn btn-ghost btn-sm" style={{ borderColor: 'rgba(239,68,68,0.3)', color: '#f87171', fontWeight: 600 }}
            onClick={() => toast.error('Action désactivée en démonstration')}>
            Réinitialiser la configuration
          </button>
        </div>
      </div>
    </Layout>
  );
}