'use client';

import React, { use, useState, useEffect, useRef } from 'react';
import { ArrowLeft, Database, ShieldCheck, KeyRound, ShieldAlert, ShieldOff, Eye, EyeOff, Save, RefreshCw, AlertTriangle, Check } from 'lucide-react';
import Script from 'next/script';
import { useRouter } from 'next/navigation';
import Button from '@/components/Button';
import GlassInput from '@/components/GlassInput';
import { Connection } from '../_types';

export default function EditDatabasePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const [conn, setConn] = useState<Connection | null>(null);
  const [fetching, setFetching] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form fields
  const [name, setName] = useState('');
  const [supabaseUrl, setSupabaseUrl] = useState('');
  const [supabaseAnonKey, setSupabaseAnonKey] = useState('');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [turnstileSiteKey, setTurnstileSiteKey] = useState('');
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);

  // Reveal toggles
  const [showAnonKey, setShowAnonKey] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Test connection
  const [testLoading, setTestLoading] = useState(false);
  const [testStatus, setTestStatus] = useState<{ success?: string; error?: string }>({});

  const turnstileRef = useRef<string | null>(null);

  useEffect(() => {
    fetchConnectionDetails();
  }, [id]);

  const fetchConnectionDetails = async () => {
    try {
      const res = await fetch(`/api/databases/${id}`);
      if (res.ok) {
        const data = await res.json();
        setConn(data);
        setName(data.name);
        setSupabaseUrl(data.supabase_url);
        setSupabaseAnonKey(data.supabase_anon_key);
        setLoginEmail(data.supabase_login_email || '');
        setLoginPassword(data.supabase_login_password || '');
        setTurnstileSiteKey(data.supabase_turnstile_site_key || '');
      } else {
        setError('Failed to fetch connection details.');
      }
    } catch (err) {
      setError('An error occurred while fetching details.');
    } finally {
      setFetching(false);
    }
  };

  // Escape key to go back
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') router.back(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [router]);

  // Turnstile rendering
  useEffect(() => {
    if (!turnstileSiteKey) return;
    let checkInterval: NodeJS.Timeout;
    const renderTurnstile = () => {
      const w = window as any;
      if (w.turnstile) {
        try {
          const widgetId = w.turnstile.render('#turnstile-container-db-edit', {
            sitekey: turnstileSiteKey,
            callback: (token: string) => setCaptchaToken(token),
            'error-callback': () => console.error('Turnstile captcha failed'),
          });
          turnstileRef.current = widgetId;
        } catch (e) {}
      }
    };
    if ((window as any).turnstile) {
      renderTurnstile();
    } else {
      checkInterval = setInterval(() => {
        if ((window as any).turnstile) { renderTurnstile(); clearInterval(checkInterval); }
      }, 500);
    }
    return () => {
      if (checkInterval) clearInterval(checkInterval);
      const w = window as any;
      if (w.turnstile && turnstileRef.current) {
        try { w.turnstile.remove(turnstileRef.current); } catch (e) {}
        turnstileRef.current = null;
      }
      setCaptchaToken(null);
    };
  }, [turnstileSiteKey]);

  const handleTestConnection = async () => {
    if (!conn) return;
    setTestLoading(true);
    setTestStatus({});
    try {
      const res = await fetch('/api/servers/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supabase_url: supabaseUrl,
          supabase_anon_key: supabaseAnonKey,
          supabase_login_email: loginEmail || null,
          supabase_login_password: loginPassword || null,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setTestStatus({ success: 'Connected!' });
      } else {
        setTestStatus({ error: data.error || 'Failed' });
      }
    } catch (err) {
      setTestStatus({ error: 'Network error' });
    } finally {
      setTestLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !supabaseUrl || !supabaseAnonKey) return;
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const res = await fetch(`/api/databases/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name, supabase_url: supabaseUrl, supabase_anon_key: supabaseAnonKey,
          supabase_login_email: loginEmail || null, supabase_login_password: loginPassword || null,
          supabase_turnstile_site_key: turnstileSiteKey || null,
          captchaToken: captchaToken || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save.');
      setSuccess('Saved!');
      setTimeout(() => router.push('/dashboard/databases'), 1000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" strategy="afterInteractive" />
      <div className="page-container">
        <div className="page-container-content space-y-5">

          <div className="flex items-center gap-3">
            <button onClick={() => router.back()}
              className="flex items-center justify-center w-7 h-7 rounded-lg bg-slate-800/50 text-slate-400 hover:text-slate-200 hover:bg-slate-700/60 transition-all shrink-0">
              <ArrowLeft size={14} />
            </button>
            <h1 className="text-sm font-bold text-slate-200">Edit Connection</h1>
          </div>

          {error && (
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm font-medium">
              <AlertTriangle size={16} className="shrink-0" /> {error}
            </div>
          )}
          {success && (
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-medium">
              <Check size={16} className="shrink-0" /> {success}
            </div>
          )}

          {fetching ? (
            <div className="bg-bg-card rounded-xl py-16 text-center text-slate-400">
              <RefreshCw className="animate-spin h-8 w-8 mx-auto mb-4" />
              <p className="text-sm">Loading...</p>
            </div>
          ) : conn ? (
            <div className="flex flex-col xl:flex-row gap-4">
              {/* Left: Connection Info */}
              <div className="w-full xl:w-[280px] bg-bg-card rounded-xl p-4 flex flex-col shrink-0 space-y-4">
                <div className="space-y-1">
                  <h2 className="text-base font-bold text-slate-100 truncate">{conn.name}</h2>
                  <p className="text-xs text-slate-500 font-mono break-all">{conn.supabase_url}</p>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {conn.supabase_login_email && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                      <ShieldCheck size={10} /> {conn.supabase_login_email}
                    </span>
                  )}
                  {conn.supabase_access_token ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-cyan-400 bg-cyan-400/10 px-2 py-0.5 rounded-full">
                      <KeyRound size={10} /> Token Active
                    </span>
                  ) : conn.supabase_login_email ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full">
                      <ShieldAlert size={10} /> Re-auth Needed
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-500 bg-slate-800/40 px-2 py-0.5 rounded-full">
                      <ShieldOff size={10} /> Anonymous
                    </span>
                  )}
                </div>

                <div className="border-t border-border-color/40 pt-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <Button variant="secondary" size="sm" onClick={handleTestConnection} loading={testLoading}
                      className="text-xs flex-1">
                      Test Connection
                    </Button>
                    {testStatus.success && <span className="text-xs text-emerald-400 font-bold">✓</span>}
                    {testStatus.error && <span className="text-xs text-rose-400 font-bold" title={testStatus.error}>✗</span>}
                  </div>

                  {conn.supabase_login_email && !conn.supabase_access_token && (
                    <Button variant="secondary" size="sm"
                      className="w-full text-xs text-cyan-400 border-cyan-400/20 hover:bg-cyan-400/10"
                      onClick={() => {
                        if (turnstileSiteKey) {
                          const w = window as any;
                          if (w.turnstile) w.turnstile.execute();
                        } else {
                          alert('Set a Turnstile Site Key in the form to enable re-authentication.');
                        }
                      }}>
                      <KeyRound size={12} className="mr-1" /> Re-auth
                    </Button>
                  )}
                </div>

                {turnstileSiteKey && (
                  <div className="border-t border-border-color/40 pt-4 space-y-2">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Turnstile</span>
                    <div id="turnstile-container-db-edit" className="min-h-[65px]"></div>
                    {captchaToken && <span className="text-[10px] text-emerald-400 font-semibold">✓ Verified</span>}
                  </div>
                )}
              </div>

              {/* Right: Form */}
              <div className="flex-1 bg-bg-card rounded-xl p-5">
                <form onSubmit={handleSave} className="space-y-5">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Connection Name</label>
                    <GlassInput type="text" value={name} onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Production CTF DB" required disabled={loading} />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Supabase URL</label>
                      <GlassInput type="url" value={supabaseUrl} onChange={(e) => setSupabaseUrl(e.target.value)}
                        placeholder="https://your-project.supabase.co" required disabled={loading} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Anon Key</label>
                      <div className="relative">
                        <GlassInput type={showAnonKey ? 'text' : 'password'} value={supabaseAnonKey}
                          onChange={(e) => setSupabaseAnonKey(e.target.value)}
                          placeholder="eyJhbGciOi..." required disabled={loading}
                          className="w-full pr-9" />
                        <button type="button" onClick={() => setShowAnonKey(!showAnonKey)}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200">
                          {showAnonKey ? <EyeOff size={15} /> : <Eye size={15} />}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-4 border-t border-border-color/40">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Login Email (Optional)</label>
                      <GlassInput type="email" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)}
                        placeholder="No auth (Anonymous)" disabled={loading} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Login Password (Optional)</label>
                      <div className="relative">
                        <GlassInput type={showPassword ? 'text' : 'password'} value={loginPassword}
                          onChange={(e) => setLoginPassword(e.target.value)}
                          placeholder="No auth (Anonymous)" disabled={loading}
                          className="w-full pr-9" />
                        <button type="button" onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200">
                          {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 pt-4 border-t border-border-color/40">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Cloudflare Turnstile Site Key (Optional)</label>
                    <p className="text-xs text-slate-500">Required if this Supabase project uses Turnstile protection on login.</p>
                    <GlassInput type="text" value={turnstileSiteKey} onChange={(e) => setTurnstileSiteKey(e.target.value)}
                      placeholder="0x4AAAAAADccgBtUIa..." disabled={loading} />
                  </div>

                  <div className="flex gap-3 justify-end pt-4 border-t border-border-color/40">
                    <Button type="button" variant="ghost" onClick={() => router.back()} disabled={loading}>
                      Cancel
                    </Button>
                    <Button type="submit" variant="primary" loading={loading}
                      disabled={loading || (!!turnstileSiteKey && !captchaToken)}>
                      <Save size={15} className="mr-1.5" /> Save Changes
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          ) : (
            <div className="bg-bg-card rounded-xl py-16 text-center text-slate-400">
              <p className="text-sm">Connection not found.</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
