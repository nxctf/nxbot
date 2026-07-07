'use client';

import React, { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { Database, Plus, Trash2, Edit, Check, AlertTriangle, ShieldCheck, RefreshCw, Save, ArrowLeft, KeyRound, ShieldAlert, ShieldOff } from 'lucide-react';
import Script from 'next/script';
import { useRouter, useSearchParams } from 'next/navigation';
import PageContainer from '@/components/PageContainer';

interface Connection {
  id: string;
  name: string;
  supabase_url: string;
  supabase_anon_key: string;
  supabase_login_email: string | null;
  supabase_login_password: string | null;
  supabase_turnstile_site_key: string | null;
  supabase_access_token?: string | null;
  supabase_refresh_token?: string | null;
  created_at: string;
}

function DatabasesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tab = searchParams.get('tab');
  const id = searchParams.get('id');

  const [conns, setConns] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [btnLoading, setBtnLoading] = useState(false);

  // Form Fields
  const [name, setName] = useState('');
  const [supabaseUrl, setSupabaseUrl] = useState('');
  const [supabaseAnonKey, setSupabaseAnonKey] = useState('');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [turnstileSiteKey, setTurnstileSiteKey] = useState('');
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);

  // Connection testing states
  const [testConnLoading, setTestConnLoading] = useState<Record<string, boolean>>({});
  const [testConnStatus, setTestConnStatus] = useState<Record<string, { success?: string; error?: string }>>({});

  // Re-auth states
  const [reAuthConnId, setReAuthConnId] = useState<string | null>(null);
  const [reAuthLoading, setReAuthLoading] = useState(false);
  const [reAuthCaptchaToken, setReAuthCaptchaToken] = useState<string | null>(null);
  const reAuthTurnstileRef = useRef<string | null>(null);

  useEffect(() => {
    fetchConnections();
  }, []);

  const fetchConnections = async () => {
    try {
      const res = await fetch('/api/databases');
      if (res.ok) {
        const data = await res.json();
        setConns(data);
      }
    } catch (err) {
      console.error('Failed to fetch connections:', err);
    } finally {
      setLoading(false);
    }
  };

  // Sync tab & id query params with form state
  useEffect(() => {
    if (tab === 'add') {
      setShowForm(true);
      setEditingId(null);
      setName('');
      setSupabaseUrl('');
      setSupabaseAnonKey('');
      setLoginEmail('');
      setLoginPassword('');
      setTurnstileSiteKey('');
      setCaptchaToken(null);
      setError('');
      setSuccess('');
    } else if (tab === 'edit' && id) {
      const conn = conns.find(c => c.id === id);
      if (conn) {
        setEditingId(conn.id);
        setName(conn.name);
        setSupabaseUrl(conn.supabase_url);
        setSupabaseAnonKey(conn.supabase_anon_key);
        setLoginEmail(conn.supabase_login_email || '');
        setLoginPassword(conn.supabase_login_password || '');
        setTurnstileSiteKey(conn.supabase_turnstile_site_key || '');
        setCaptchaToken(null);
        setShowForm(true);
        setError('');
        setSuccess('');
      } else {
        if (conns.length > 0) {
          router.push('/dashboard/databases');
        }
      }
    } else {
      setShowForm(false);
      setEditingId(null);
    }
  }, [tab, id, conns, router]);

  // Turnstile widget rendering effect for connection creation
  useEffect(() => {
    if (!turnstileSiteKey || !showForm) return;

    let checkInterval: NodeJS.Timeout;

    const renderTurnstile = () => {
      const w = window as any;
      if (w.turnstile) {
        try {
          w.turnstile.render('#turnstile-container-db', {
            sitekey: turnstileSiteKey,
            callback: (token: string) => {
              setCaptchaToken(token);
            },
            'error-callback': () => {
              console.error('Turnstile captcha failed to load');
            }
          });
        } catch (e) {
          // ignore duplicate render errors
        }
      }
    };

    if ((window as any).turnstile) {
      renderTurnstile();
    } else {
      checkInterval = setInterval(() => {
        if ((window as any).turnstile) {
          renderTurnstile();
          clearInterval(checkInterval);
        }
      }, 500);
    }

    return () => {
      if (checkInterval) clearInterval(checkInterval);
      const w = window as any;
      if (w.turnstile) {
        try {
          w.turnstile.remove('#turnstile-container-db');
        } catch (e) {}
      }
      setCaptchaToken(null);
    };
  }, [turnstileSiteKey, showForm]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!name || !supabaseUrl || !supabaseAnonKey) {
      setError('Please fill in all required fields.');
      return;
    }

    setBtnLoading(true);

    try {
      const url = editingId ? `/api/databases/${editingId}` : '/api/databases';
      const method = editingId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          supabase_url: supabaseUrl,
          supabase_anon_key: supabaseAnonKey,
          supabase_login_email: loginEmail || null,
          supabase_login_password: loginPassword || null,
          supabase_turnstile_site_key: turnstileSiteKey || null,
          captchaToken: captchaToken || null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to save database connection.');
      }

      setSuccess(editingId ? 'Connection updated successfully!' : 'Connection added successfully!');
      
      // Reset form
      resetForm();
      fetchConnections();
    } catch (err: any) {
      setError(err.message || 'Verification failed. Double check your Supabase credentials.');
    } finally {
      setBtnLoading(false);
    }
  };

  const handleEdit = (conn: Connection) => {
    router.push(`/dashboard/databases?tab=edit&id=${conn.id}`);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this Supabase connection?\n\nAny Discord servers mapped to this connection will have their Supabase credentials unlinked.')) {
      return;
    }

    setError('');
    setSuccess('');

    try {
      const res = await fetch(`/api/databases/${id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete connection.');
      }

      setSuccess('Connection deleted successfully.');
      fetchConnections();
    } catch (err: any) {
      setError(err.message || 'Error occurred.');
    }
  };

  const handleTestConnection = async (conn: Connection) => {
    const id = conn.id;
    setTestConnLoading(prev => ({ ...prev, [id]: true }));
    setTestConnStatus(prev => ({ ...prev, [id]: {} }));

    try {
      const res = await fetch('/api/servers/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supabase_url: conn.supabase_url,
          supabase_anon_key: conn.supabase_anon_key,
          supabase_login_email: conn.supabase_login_email,
          supabase_login_password: conn.supabase_login_password,
          supabase_access_token: conn.supabase_access_token || null,
          supabase_refresh_token: conn.supabase_refresh_token || null,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        const msg = data.warning === 'captcha_required' ? 'Connected (Auth Needs Edit/Save)' : 'Connected';
        setTestConnStatus(prev => ({ ...prev, [id]: { success: msg } }));
      } else {
        setTestConnStatus(prev => ({ ...prev, [id]: { error: data.error || 'Failed' } }));
      }
    } catch (err: any) {
      setTestConnStatus(prev => ({ ...prev, [id]: { error: 'Network Error' } }));
    } finally {
      setTestConnLoading(prev => ({ ...prev, [id]: false }));
    }
  };

  const resetForm = () => {
    router.push('/dashboard/databases');
  };

  // Re-auth modal open handler — render Turnstile widget
  const openReAuthModal = useCallback((conn: Connection) => {
    setReAuthConnId(conn.id);
    setReAuthCaptchaToken(null);
    setError('');
    setSuccess('');

    // Render Turnstile widget after DOM is ready
    setTimeout(() => {
      const w = window as any;
      if (w.turnstile && conn.supabase_turnstile_site_key) {
        try {
          if (reAuthTurnstileRef.current) {
            w.turnstile.remove(reAuthTurnstileRef.current);
          }
          reAuthTurnstileRef.current = w.turnstile.render('#turnstile-container-reauth', {
            sitekey: conn.supabase_turnstile_site_key,
            theme: 'dark',
            callback: (token: string) => setReAuthCaptchaToken(token),
          });
        } catch (e) { /* ignore */ }
      }
    }, 300);
  }, []);

  const closeReAuthModal = () => {
    setReAuthConnId(null);
    setReAuthCaptchaToken(null);
    const w = window as any;
    if (w.turnstile && reAuthTurnstileRef.current) {
      try { w.turnstile.remove(reAuthTurnstileRef.current); } catch (e) {}
      reAuthTurnstileRef.current = null;
    }
  };

  const handleReAuth = async () => {
    if (!reAuthConnId) return;
    setReAuthLoading(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch(`/api/databases/${reAuthConnId}/re-auth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ captchaToken: reAuthCaptchaToken }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Re-authentication failed.');

      setSuccess(`✅ Re-authenticated as ${data.user_email}. Bot will reload within 10s.`);
      closeReAuthModal();
      fetchConnections();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setReAuthLoading(false);
    }
  };

  return (
    <>
      {/* Script for Cloudflare Turnstile inside form */}
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        strategy="afterInteractive"
      />

      <PageContainer
        title="Supabase DB Connections"
        subtitle="Configure and verify saved Supabase database credentials to map to your Discord CTF servers."
        extra={!showForm && (
          <button onClick={() => router.push('/dashboard/databases?tab=add')} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Plus size={18} />
            Add Connection
          </button>
        )}
      >

      {error && (
        <div className="alert alert-error" style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <AlertTriangle size={18} />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="alert alert-success" style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Check size={18} />
          <span>{success}</span>
        </div>
      )}

      {showForm ? (
        <div className="glass-panel" style={{ padding: '32px', marginBottom: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px', cursor: 'pointer', color: '#94a3b8' }} onClick={resetForm}>
            <ArrowLeft size={16} />
            <span style={{ fontSize: '14px', fontWeight: 500 }}>Back to list</span>
          </div>

          <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '24px', color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Database size={18} />
            {editingId ? 'Edit Supabase Connection' : 'Add New Supabase Connection'}
          </h2>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Connection Name</label>
              <input
                type="text"
                className="glass-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Production CTF DB"
                required
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Supabase URL</label>
                <input
                  type="url"
                  className="glass-input"
                  value={supabaseUrl}
                  onChange={(e) => setSupabaseUrl(e.target.value)}
                  placeholder="https://your-project.supabase.co"
                  required
                />
              </div>
              <div className="form-group">
                <label>Supabase Anon Key</label>
                <input
                  type="password"
                  className="glass-input"
                  value={supabaseAnonKey}
                  onChange={(e) => setSupabaseAnonKey(e.target.value)}
                  placeholder="eyJhbGciOi..."
                  required
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Bypass RLS Email (Optional)</label>
                <input
                  type="email"
                  className="glass-input"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="No authentication"
                />
              </div>
              <div className="form-group">
                <label>Bypass RLS Password (Optional)</label>
                <input
                  type="password"
                  className="glass-input"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="No authentication"
                />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: '24px' }}>
              <label>Cloudflare Turnstile Site Key (Optional)</label>
              <p style={{ color: '#94a3b8', fontSize: '12px', marginBottom: '8px' }}>
                If this database uses Turnstile protection on login, paste the site key here.
              </p>
              <input
                type="text"
                className="glass-input"
                value={turnstileSiteKey}
                onChange={(e) => setTurnstileSiteKey(e.target.value)}
                placeholder="e.g. 0x4AAAAAADccgBtUIa..."
              />
            </div>

            {turnstileSiteKey && (
              <div style={{ marginBottom: '24px', background: 'rgba(30, 41, 59, 0.3)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: 600, color: '#38bdf8' }}>
                  Cloudflare Turnstile Verification
                </label>
                <div id="turnstile-container-db" style={{ minHeight: '65px' }}></div>
              </div>
            )}

            <div style={{ display: 'flex', gap: '16px', justifyContent: 'flex-end' }}>
              <button type="button" onClick={resetForm} className="btn btn-secondary">
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={btnLoading} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Save size={18} />
                {btnLoading ? 'Saving...' : 'Save Connection'}
              </button>
            </div>
          </form>
        </div>
      ) : (
        <>
          {loading ? (
            <div className="glass-panel" style={{ padding: '60px', textAlign: 'center', color: '#94a3b8' }}>
              <RefreshCw className="animate-spin" size={32} style={{ margin: '0 auto 16px' }} />
              <p>Fetching saved database connections...</p>
            </div>
          ) : conns.length === 0 ? (
            <div className="glass-panel" style={{ padding: '60px 40px', textAlign: 'center', color: '#94a3b8', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '80px',
                height: '80px',
                borderRadius: '50%',
                background: 'rgba(56, 189, 248, 0.1)',
                border: '1px solid rgba(56, 189, 248, 0.2)',
                color: '#38bdf8',
                marginBottom: '24px',
                boxShadow: '0 0 20px rgba(56, 189, 248, 0.15)'
              }}>
                <Database size={36} />
              </div>
              <h2 style={{ fontSize: '20px', color: '#f8fafc', marginBottom: '8px', fontWeight: 700 }}>No Database Connections Configured</h2>
              <p style={{ fontSize: '14px', maxWidth: '460px', margin: '0 auto 24px', lineHeight: '1.6' }}>
                Create a database connection first so you can link it to your Discord servers.
              </p>
              <button onClick={() => router.push('/dashboard/databases?tab=add')} className="btn btn-primary">
                Add Connection Now
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px' }}>
              {conns.map((conn) => {
                const isTesting = testConnLoading[conn.id];
                const status = testConnStatus[conn.id] || {};
                return (
                  <div key={conn.id} className="glass-panel hover-card" style={{ padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <div style={{
                        padding: '12px',
                        background: 'rgba(56, 189, 248, 0.1)',
                        border: '1px solid rgba(56, 189, 248, 0.2)',
                        borderRadius: '10px',
                        color: '#38bdf8'
                      }}>
                        <Database size={24} />
                      </div>
                      <div>
                        <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#f8fafc', marginBottom: '4px' }}>
                          {conn.name}
                        </h3>
                        <p style={{ color: '#94a3b8', fontSize: '13px', fontFamily: 'monospace', wordBreak: 'break-all' }}>
                          {conn.supabase_url}
                        </p>
                        {conn.supabase_login_email && (
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#10b981', background: 'rgba(16, 185, 129, 0.1)', padding: '2px 8px', borderRadius: '20px', marginTop: '6px' }}>
                            <ShieldCheck size={10} />
                            <span>Auth User: {conn.supabase_login_email}</span>
                          </div>
                        )}
                        {/* Session Token Status */}
                        {conn.supabase_access_token ? (
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#22d3ee', background: 'rgba(34, 211, 238, 0.1)', padding: '2px 8px', borderRadius: '20px', marginTop: '6px', marginLeft: '6px' }}>
                            <KeyRound size={10} />
                            <span>Session Token Active</span>
                          </div>
                        ) : conn.supabase_login_email ? (
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#f59e0b', background: 'rgba(245, 158, 11, 0.1)', padding: '2px 8px', borderRadius: '20px', marginTop: '6px', marginLeft: '6px' }}>
                            <ShieldAlert size={10} />
                            <span>No Session Token — Re-auth Required</span>
                          </div>
                        ) : (
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#64748b', background: 'rgba(100, 116, 139, 0.1)', padding: '2px 8px', borderRadius: '20px', marginTop: '6px', marginLeft: '6px' }}>
                            <ShieldOff size={10} />
                            <span>Anonymous Mode</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      {/* Test Connection Button */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {status.success && <span style={{ color: '#10b981', fontSize: '13px', fontWeight: 600 }}>✓ {status.success}</span>}
                        {status.error && <span style={{ color: '#ef4444', fontSize: '13px', fontWeight: 600 }}>✗ {status.error}</span>}
                        <button
                          onClick={() => handleTestConnection(conn)}
                          disabled={isTesting}
                          className="btn btn-secondary"
                          style={{ padding: '6px 12px', fontSize: '12px', height: 'auto' }}
                        >
                          {isTesting ? <RefreshCw className="animate-spin" size={12} /> : null}
                          {isTesting ? 'Testing...' : 'Test Connection'}
                        </button>
                      </div>

                      {/* Re-Authenticate Button */}
                      {conn.supabase_login_email && (
                        <button
                          onClick={() => openReAuthModal(conn)}
                          className="btn btn-secondary"
                          style={{ padding: '6px 12px', fontSize: '12px', height: 'auto', borderColor: 'rgba(34, 211, 238, 0.3)', color: '#22d3ee' }}
                          title="Re-authenticate to get fresh session tokens"
                        >
                          <KeyRound size={12} style={{ marginRight: '4px' }} />
                          Re-auth
                        </button>
                      )}

                      <button
                        onClick={() => handleEdit(conn)}
                        className="btn btn-secondary"
                        style={{ padding: '8px', height: 'auto', color: '#94a3b8' }}
                        title="Edit Connection"
                      >
                        <Edit size={16} />
                      </button>

                      <button
                        onClick={() => handleDelete(conn.id)}
                        className="btn btn-secondary"
                        style={{ padding: '8px', height: 'auto', borderColor: 'rgba(239, 68, 68, 0.2)', color: '#f87171', background: 'rgba(239, 68, 68, 0.02)' }}
                        title="Delete Connection"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Re-Auth Modal */}
      {reAuthConnId && (() => {
        const conn = conns.find(c => c.id === reAuthConnId);
        if (!conn) return null;
        return (
          <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }} onClick={closeReAuthModal}>
            <div className="glass-panel" style={{ padding: '32px', maxWidth: '480px', width: '90%' }} onClick={e => e.stopPropagation()}>
              <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#22d3ee', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <KeyRound size={20} />
                Re-authenticate: {conn.name}
              </h3>
              <p style={{ color: '#94a3b8', fontSize: '13px', marginBottom: '20px' }}>
                This will log in as <strong style={{ color: '#f8fafc' }}>{conn.supabase_login_email}</strong> to get fresh session tokens for the bot.
              </p>

              {conn.supabase_turnstile_site_key ? (
                <div style={{ marginBottom: '20px', background: 'rgba(30, 41, 59, 0.3)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: 600, color: '#38bdf8' }}>
                    Solve Captcha to Continue
                  </label>
                  <div id="turnstile-container-reauth" style={{ minHeight: '65px' }}></div>
                </div>
              ) : (
                <div style={{ marginBottom: '20px', padding: '12px 16px', background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.2)', borderRadius: '8px', fontSize: '13px', color: '#f59e0b' }}>
                  ⚠️ No Turnstile Site Key configured. If Supabase requires captcha, this will fail. Edit the connection to add the key first.
                </div>
              )}

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button onClick={closeReAuthModal} className="btn btn-secondary" style={{ fontSize: '13px' }}>
                  Cancel
                </button>
                <button
                  onClick={handleReAuth}
                  disabled={reAuthLoading || (!!conn.supabase_turnstile_site_key && !reAuthCaptchaToken)}
                  className="btn btn-primary"
                  style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  {reAuthLoading ? <RefreshCw className="animate-spin" size={14} /> : <KeyRound size={14} />}
                  {reAuthLoading ? 'Authenticating...' : 'Login & Save Tokens'}
                </button>
              </div>
            </div>
          </div>
        );
      })()}
      </PageContainer>
    </>
  );
}

export default function DatabasesPage() {
  return (
    <Suspense fallback={
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <RefreshCw className="animate-spin" size={32} style={{ color: '#38bdf8' }} />
      </div>
    }>
      <DatabasesContent />
    </Suspense>
  );
}
