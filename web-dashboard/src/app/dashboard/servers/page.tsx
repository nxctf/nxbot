'use client';

import React, { useState, useEffect } from 'react';
import { Server, Plus, Trash2, Edit, Check, AlertTriangle, ShieldCheck, HelpCircle } from 'lucide-react';
import Link from 'next/link';
import Script from 'next/script';

interface Guild {
  id: string;
  guild_name: string;
  supabase_url: string;
  supabase_anon_key: string;
  channel_firstblood: string | null;
  channel_scoreboard: string | null;
  enable_firstblood: number;
  enable_scoreboard: number;
  enable_tickets: number;
  is_active: number;
}

export default function ServersPage() {
  const [servers, setServers] = useState<Guild[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [btnLoading, setBtnLoading] = useState(false);

  // Form Fields
  const [guildId, setGuildId] = useState('');
  const [guildName, setGuildName] = useState('');
  const [supabaseUrl, setSupabaseUrl] = useState('');
  const [supabaseAnonKey, setSupabaseAnonKey] = useState('');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [turnstileSiteKey, setTurnstileSiteKey] = useState('');
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);

  // Turnstile widget rendering effect for server creation
  useEffect(() => {
    if (!turnstileSiteKey) return;

    let checkInterval: NodeJS.Timeout;
    
    const renderTurnstile = () => {
      const w = window as any;
      if (w.turnstile) {
        try {
          w.turnstile.render('#turnstile-container-add', {
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
          w.turnstile.remove('#turnstile-container-add');
        } catch (e) {}
      }
    };
  }, [turnstileSiteKey, showAddForm]);

  const fetchServers = async () => {
    try {
      const res = await fetch('/api/servers');
      const data = await res.json();
      setServers(data);
    } catch (err) {
      console.error('Error fetching servers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServers();
  }, []);

  const handleAddServer = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!guildId || !guildName || !supabaseUrl || !supabaseAnonKey) {
      setError('Please fill in all required fields.');
      return;
    }

    setBtnLoading(true);

    try {
      const res = await fetch('/api/servers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: guildId,
          guild_name: guildName,
          supabase_url: supabaseUrl,
          supabase_anon_key: supabaseAnonKey,
          supabase_login_email: loginEmail || null,
          supabase_login_password: loginPassword || null,
          supabase_turnstile_site_key: turnstileSiteKey || null,
          captchaToken: captchaToken || null,
          enable_firstblood: true,
          enable_scoreboard: true,
          enable_tickets: true,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to add server.');
      }

      setSuccess('Server added and validated successfully!');
      // Reset form
      setGuildId('');
      setGuildName('');
      setSupabaseUrl('');
      setSupabaseAnonKey('');
      setLoginEmail('');
      setLoginPassword('');
      setTurnstileSiteKey('');
      setCaptchaToken(null);
      setShowAddForm(false);
      
      // Reload
      fetchServers();
    } catch (err: any) {
      setError(err.message || 'Verification failed. Double check your Supabase credentials.');
    } finally {
      setBtnLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to remove this server config? Bot subscription will stop.')) return;

    try {
      const res = await fetch(`/api/servers/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setServers(servers.filter((s) => s.id !== id));
      }
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '32px', fontWeight: 800 }}>CTF Servers</h1>
          <p style={{ color: '#94a3b8' }}>Connect and manage multiple Discord servers</p>
        </div>
        <button 
          onClick={() => { setShowAddForm(!showAddForm); setError(''); setSuccess(''); }} 
          className="btn btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <Plus size={18} />
          {showAddForm ? 'Cancel' : 'Add Server'}
        </button>
      </div>

      {error && (
        <div style={{ 
          background: 'rgba(244, 63, 94, 0.1)', 
          border: '1px solid rgba(244, 63, 94, 0.2)', 
          color: '#f43f5e', 
          padding: '12px 16px', 
          borderRadius: '8px', 
          marginBottom: '24px',
          fontSize: '14px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <AlertTriangle size={18} />
          {error}
        </div>
      )}

      {success && (
        <div style={{ 
          background: 'rgba(16, 185, 129, 0.1)', 
          border: '1px solid rgba(16, 185, 129, 0.2)', 
          color: '#10b981', 
          padding: '12px 16px', 
          borderRadius: '8px', 
          marginBottom: '24px',
          fontSize: '14px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <Check size={18} />
          {success}
        </div>
      )}

      {/* Add Server Form */}
      {showAddForm && (
        <div className="glass-panel animate-fade-in" style={{ padding: '32px', marginBottom: '32px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '24px' }}>Register New Server</h2>
          <form onSubmit={handleAddServer}>
            <div className="form-row">
              <div className="form-group">
                <label>Discord Guild ID (Required)</label>
                <input 
                  type="text" 
                  className="glass-input" 
                  placeholder="e.g. 112233445566778899"
                  value={guildId}
                  onChange={(e) => setGuildId(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label>Guild/Server Name (Required)</label>
                <input 
                  type="text" 
                  className="glass-input" 
                  placeholder="e.g. My Awesome CTF"
                  value={guildName}
                  onChange={(e) => setGuildName(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Supabase Project URL (Required)</label>
                <input 
                  type="url" 
                  className="glass-input" 
                  placeholder="https://xyz.supabase.co"
                  value={supabaseUrl}
                  onChange={(e) => setSupabaseUrl(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label>Supabase Anon/Public Key (Required)</label>
                <input 
                  type="password" 
                  className="glass-input" 
                  placeholder="eyJhbGciOi..."
                  value={supabaseAnonKey}
                  onChange={(e) => setSupabaseAnonKey(e.target.value)}
                  required
                />
              </div>
            </div>

            <div style={{ 
              marginTop: '12px', 
              marginBottom: '24px', 
              padding: '16px', 
              background: 'rgba(30, 41, 59, 0.3)', 
              border: '1px solid var(--border-color)', 
              borderRadius: '8px' 
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <ShieldCheck size={18} style={{ color: '#38bdf8' }} />
                <span style={{ fontSize: '14px', fontWeight: 600 }}>Authenticated Access (Optional)</span>
              </div>
              <p style={{ color: '#94a3b8', fontSize: '13px', marginBottom: '16px' }}>
                If your NXCTF tables are restricted by Row Level Security (RLS) policies, input a tester login account so the bot can bypass RLS limits.
              </p>
              <div className="form-row" style={{ marginBottom: 0 }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Tester User Email</label>
                  <input 
                    type="email" 
                    className="glass-input" 
                    placeholder="bot-test@ctf.com"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Tester Password</label>
                  <input 
                    type="password" 
                    className="glass-input" 
                    placeholder="••••••••"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginTop: '16px', marginBottom: 0 }}>
                <label>Cloudflare Turnstile Site Key (Optional)</label>
                <p style={{ color: '#94a3b8', fontSize: '12px', marginBottom: '8px' }}>
                  If the target Supabase project enforces Cloudflare Turnstile captcha on login, enter the public site key.
                </p>
                <input
                  type="text"
                  className="glass-input"
                  placeholder="e.g. 0x4AAAAAADccgBtUIa17v76i"
                  value={turnstileSiteKey}
                  onChange={(e) => setTurnstileSiteKey(e.target.value)}
                />
              </div>

              {turnstileSiteKey && (
                <div style={{ marginTop: '16px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: 600, color: '#38bdf8' }}>
                    Cloudflare Turnstile Verification
                  </label>
                  <p style={{ color: '#94a3b8', fontSize: '12px', marginBottom: '12px' }}>
                    Turnstile verification is required to complete authentication check during validation.
                  </p>
                  <div id="turnstile-container-add" style={{ minHeight: '65px' }}></div>
                  <Script
                    src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
                    strategy="afterInteractive"
                  />
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '16px', justifyContent: 'flex-end' }}>
              <button 
                type="button" 
                onClick={() => setShowAddForm(false)} 
                className="btn btn-secondary"
                disabled={btnLoading}
              >
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={btnLoading}>
                {btnLoading ? 'Validating & Registering...' : 'Register Guild'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Connected Servers List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px' }}>Loading server details...</div>
      ) : servers.length === 0 ? (
        <div className="glass-panel" style={{ padding: '60px', textAlign: 'center', color: '#94a3b8' }}>
          <HelpCircle size={48} style={{ marginBottom: '16px', opacity: 0.5, color: '#38bdf8' }} />
          <h2 style={{ fontSize: '20px', color: '#f8fafc', marginBottom: '8px' }}>No Connected Discord Servers</h2>
          <p style={{ maxWidth: '460px', margin: '0 auto 24px' }}>
            Get started by registering a server. You will need your Discord Server ID and your NXCTF database project details.
          </p>
          <button onClick={() => setShowAddForm(true)} className="btn btn-primary">
            Register First Server
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '24px' }}>
          {servers.map((server) => (
            <div key={server.id} className="glass-panel glass-card" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ padding: '10px', borderRadius: '8px', background: 'rgba(56, 189, 248, 0.1)', color: '#38bdf8' }}>
                    <Server size={20} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '18px', fontWeight: 700 }}>{server.guild_name}</h3>
                    <span style={{ fontSize: '12px', color: '#94a3b8', fontFamily: 'var(--font-mono)' }}>ID: {server.id}</span>
                  </div>
                </div>
                <span className={`badge ${server.is_active ? 'badge-success' : 'badge-warning'}`}>
                  {server.is_active ? 'Active' : 'Disabled'}
                </span>
              </div>

              <div style={{ fontSize: '14px', borderTop: '1px solid var(--border-color)', borderBottom: '1px solid var(--border-color)', padding: '16px 0', margin: '16px 0', display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#94a3b8' }}>Supabase URL:</span>
                  <span style={{ color: '#cbd5e1', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '200px' }}>{server.supabase_url}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#94a3b8' }}>First Bloods:</span>
                  <span style={{ color: server.enable_firstblood ? '#10b981' : '#f43f5e', fontWeight: 600 }}>
                    {server.enable_firstblood ? '🟢 Enabled' : '🔴 Disabled'}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#94a3b8' }}>Ticketing System:</span>
                  <span style={{ color: server.enable_tickets ? '#10b981' : '#f43f5e', fontWeight: 600 }}>
                    {server.enable_tickets ? '🟢 Enabled' : '🔴 Disabled'}
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <Link href={`/dashboard/servers/${server.id}`} className="btn btn-secondary" style={{ flex: 1, gap: '6px' }}>
                  <Edit size={16} />
                  Configure
                </Link>
                <button 
                  onClick={() => handleDelete(server.id)} 
                  className="btn btn-secondary" 
                  style={{ color: '#f43f5e', border: '1px solid rgba(244, 63, 94, 0.2)' }}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
