'use client';

import React, { use, useState, useEffect, useRef } from 'react';
import { ArrowLeft, ShieldCheck, KeyRound, ShieldAlert, ShieldOff, Cloud, Eye, EyeOff, Save, RefreshCw, AlertTriangle, Check, Trash2 } from 'lucide-react';
import Tag from '@/components/Tag';
import Script from 'next/script';
import { useRouter } from 'next/navigation';
import Button from '@/components/Button';
import GlassInput from '@/components/GlassInput';
import ConfirmDialog from '@/components/ConfirmDialog';
import { Connection } from '../_types';

export default function EditDatabasePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const [conn, setConn] = useState<Connection | null>(null);
  const [fetching, setFetching] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [name, setName] = useState('');
  const [supabaseUrl, setSupabaseUrl] = useState('');
  const [supabaseAnonKey, setSupabaseAnonKey] = useState('');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [turnstileSiteKey, setTurnstileSiteKey] = useState('');
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [showAnonKey, setShowAnonKey] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginStatus, setLoginStatus] = useState<{ success?: string; error?: string }>({});
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const turnstileRef = useRef<string | null>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') router.back(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [router]);

  useEffect(() => { fetchConnectionDetails(); }, [id]);

  const fetchConnectionDetails = async () => {
    try {
      const res = await fetch('/api/databases/' + id);
      if (res.ok) {
        const data = await res.json();
        setConn(data);
        setName(data.name); setSupabaseUrl(data.supabase_url); setSupabaseAnonKey(data.supabase_anon_key);
        setLoginEmail(data.supabase_login_email || ''); setLoginPassword(data.supabase_login_password || '');
        setTurnstileSiteKey(data.supabase_turnstile_site_key || '');
      } else { setError('Failed to fetch.'); }
    } catch { setError('Error fetching.'); }
    finally { setFetching(false); }
  };

  useEffect(() => {
    if (!turnstileSiteKey) return;
    let ci: NodeJS.Timeout;
    const render = () => {
      const w = window as any;
      if (w.turnstile) {
        try {
          const wid = w.turnstile.render('#turnstile-db-edit', {
            sitekey: turnstileSiteKey, callback: (t: string) => setCaptchaToken(t),
            'error-callback': () => console.error('Turnstile error'),
          });
          turnstileRef.current = wid;
        } catch (e) {}
      }
    };
    if ((window as any).turnstile) render();
    else ci = setInterval(() => { if ((window as any).turnstile) { render(); clearInterval(ci); } }, 500);
    return () => {
      if (ci) clearInterval(ci);
      const w = window as any;
      if (w.turnstile && turnstileRef.current) { try { w.turnstile.remove(turnstileRef.current); } catch (e) {} turnstileRef.current = null; }
      setCaptchaToken(null);
    };
  }, [turnstileSiteKey]);

  const handleLogin = async () => {
    if (!loginEmail || !loginPassword) { setLoginStatus({ error: 'Enter email & password' }); return; }
    setLoginLoading(true); setLoginStatus({});
    try {
      const res = await fetch('/api/servers/test-connection', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supabase_url: supabaseUrl, supabase_anon_key: supabaseAnonKey,
          supabase_login_email: loginEmail, supabase_login_password: loginPassword,
          captchaToken: captchaToken || null,
        }),
      });
      const data = await res.json();
      if (data.success) setLoginStatus({ success: 'Logged in as ' + loginEmail });
      else if (data.warning === 'captcha_required') setLoginStatus({ success: 'Captcha needed - save to auth' });
      else setLoginStatus({ error: data.error || 'Login failed' });
    } catch { setLoginStatus({ error: 'Network error' }); }
    finally { setLoginLoading(false); }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !supabaseUrl || !supabaseAnonKey) return;
    setError(''); setSuccess(''); setSaving(true);

    try {
      const res = await fetch('/api/databases/' + id, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, supabase_url: supabaseUrl, supabase_anon_key: supabaseAnonKey, supabase_login_email: loginEmail || null, supabase_login_password: loginPassword || null, supabase_turnstile_site_key: turnstileSiteKey || null, captchaToken: captchaToken || null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed.');
      setSuccess('Saved!');
      setTimeout(() => router.push('/dashboard/databases'), 1000);
    } catch (err: any) { setError(err.message); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    setDeleteLoading(true);
    try {
      const res = await fetch('/api/databases/' + id, { method: 'DELETE' });
      if (res.ok) router.push('/dashboard/databases');
      else { const d = await res.json(); alert(d.error || 'Delete failed'); }
    } catch { alert('Error'); }
    finally { setDeleteLoading(false); setDeleteConfirmOpen(false); }
  };

  const authChanged = conn ? (
    supabaseUrl !== conn.supabase_url ||
    supabaseAnonKey !== conn.supabase_anon_key ||
    loginEmail !== (conn.supabase_login_email || '') ||
    loginPassword !== (conn.supabase_login_password || '') ||
    turnstileSiteKey !== (conn.supabase_turnstile_site_key || '')
  ) : true;

  return (
    <>
      <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" strategy="afterInteractive" />
      <ConfirmDialog isOpen={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)} onConfirm={handleDelete}
        loading={deleteLoading} title="Delete Connection" message="Delete this Supabase connection?" confirmText="Delete" />
      <div className="page-container">
        <div className="page-container-content space-y-5">
          {error && <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm font-medium"><AlertTriangle size={16} /> {error}</div>}
          {success && <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-medium"><Check size={16} /> {success}</div>}

          {fetching ? (
            <div className="bg-bg-card rounded-xl py-16 text-center text-slate-400"><RefreshCw className="animate-spin h-8 w-8 mx-auto mb-4" /><p className="text-sm">Loading...</p></div>
          ) : conn ? (
            <div className="flex flex-col xl:flex-row gap-4">
              {/* Left Panel */}
              <div className="w-full xl:w-[260px] bg-bg-card rounded-xl p-4 flex flex-col shrink-0 gap-4 self-start">
                <div className="flex items-center gap-2">
                  <button onClick={() => router.back()}
                    className="flex items-center justify-center w-6 h-6 rounded-lg bg-slate-800/50 text-slate-400 hover:text-slate-200 transition-all shrink-0">
                    <ArrowLeft size={12} />
                  </button>
                  <h1 className="text-sm font-bold text-slate-100">Edit Connection</h1>
                </div>
                <div className="space-y-1">
                  <h2 className="text-sm font-bold text-slate-100 truncate">{conn.name}</h2>
                  <p className="text-[11px] text-slate-500 font-mono break-all">{conn.supabase_url}</p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {conn.supabase_login_email && <Tag icon={<ShieldCheck size={10} />} variant="emerald">{conn.supabase_login_email}</Tag>}
                  {conn.supabase_access_token
                    ? <Tag icon={<KeyRound size={10} />} variant="cyan">Token</Tag>
                    : conn.supabase_login_email
                      ? <Tag icon={<ShieldAlert size={10} />} variant="amber">Re-auth</Tag>
                      : <Tag icon={<ShieldOff size={10} />} variant="slate">Anon</Tag>}
                  {conn.supabase_turnstile_site_key
                    ? <Tag icon={<Cloud size={10} />} variant="violet">Turnstile</Tag>
                    : <Tag variant="slate">No Turnstile</Tag>}
                </div>
                <div className="space-y-2">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Login</span>
                  <Button variant="secondary" size="sm" onClick={handleLogin} loading={loginLoading}
                    className="text-xs w-full" disabled={!loginEmail || !loginPassword}>Login to Supabase</Button>
                  {loginStatus.success && <span className="text-xs text-emerald-400 font-semibold">✓ {loginStatus.success}</span>}
                  {loginStatus.error && <span className="text-xs text-rose-400 font-semibold">✗ {loginStatus.error}</span>}
                </div>
                <div className="flex-1" />
                <Button variant="secondary" size="sm" onClick={() => setDeleteConfirmOpen(true)}
                  className="text-xs w-full text-rose-400 border-rose-500/20 hover:bg-rose-500/10"><Trash2 size={12} className="mr-1" /> Delete</Button>
              </div>
              {/* Right Panel: Form */}
              <div className="flex-1 bg-bg-card rounded-xl p-5">
                <form onSubmit={handleSave} className="space-y-5">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Name</label>
                    <GlassInput type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Connection name" required disabled={saving} />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">URL</label>
                      <GlassInput type="url" value={supabaseUrl} onChange={(e) => setSupabaseUrl(e.target.value)} placeholder="https://project.supabase.co" required disabled={saving} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Anon Key</label>
                      <div className="relative">
                        <GlassInput type={showAnonKey ? 'text' : 'password'} value={supabaseAnonKey} onChange={(e) => setSupabaseAnonKey(e.target.value)} placeholder="eyJhbGciOi..." required disabled={saving} className="w-full pr-9" />
                        <button type="button" onClick={() => setShowAnonKey(!showAnonKey)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200">{showAnonKey ? <EyeOff size={15} /> : <Eye size={15} />}</button>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-4 border-t border-border-color/40">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Login Email</label>
                      <GlassInput type="email" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} placeholder="Anonymous" disabled={saving} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Login Password</label>
                      <div className="relative">
                        <GlassInput type={showPassword ? 'text' : 'password'} value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} placeholder="Anonymous" disabled={saving} className="w-full pr-9" />
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200">{showPassword ? <EyeOff size={15} /> : <Eye size={15} />}</button>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2 pt-4 border-t border-border-color/40">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Turnstile Site Key</label>
                    <p className="text-xs text-slate-500">Required if login uses Turnstile.</p>
                    <GlassInput type="text" value={turnstileSiteKey} onChange={(e) => setTurnstileSiteKey(e.target.value)} placeholder="0x4AAAAAADccg..." disabled={saving} />
                  </div>
                  {turnstileSiteKey && (
                    <div className="bg-slate-950/40 p-4 rounded-xl border border-border-color">
                      <label className="text-xs font-bold text-primary uppercase tracking-wider mb-3">Turnstile</label>
                      <div id="turnstile-db-edit" className="min-h-[65px]"></div>
                    </div>
                  )}
                  <div className="flex gap-3 justify-end pt-4 border-t border-border-color/40">
                    <Button type="button" variant="ghost" onClick={() => router.back()} disabled={saving}>Cancel</Button>
                    <Button type="submit" variant="primary" loading={saving} disabled={saving || (!!turnstileSiteKey && authChanged && !captchaToken)}>
                      <Save size={15} className="mr-1.5" /> Save Changes
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          ) : (
            <div className="bg-bg-card rounded-xl py-16 text-center text-slate-400"><p className="text-sm">Not found.</p></div>
          )}
        </div>
      </div>
    </>
  );
}
