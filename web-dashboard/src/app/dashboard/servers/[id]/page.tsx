'use client';

import React, { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { Server, Save, ArrowLeft, RefreshCw, AlertTriangle, CheckCircle, Database, Ticket, Users, MessageSquare, FolderOpen } from 'lucide-react';
import Link from 'next/link';
import Script from 'next/script';

interface GuildConfig {
  id: string;
  guild_name: string;
  supabase_url: string;
  supabase_anon_key: string;
  supabase_login_email: string | null;
  supabase_login_password: string | null;
  supabase_turnstile_site_key: string | null;
  channel_firstblood: string | null;
  channel_scoreboard: string | null;
  channel_announcements: string | null;
  channel_ticket_category: string | null;
  channel_ticket_logs: string | null;
  channel_ticket_panel: string | null;
  ticket_ping_roles: string | null;
  ticket_required_roles: string | null;
  ticket_welcome_message: string | null;
  enable_firstblood: number;
  enable_scoreboard: number;
  enable_tickets: number;
  enable_realtime: number;
  active_event_id: string | null;
  is_active: number;
}

interface EventItem {
  id: string;
  name: string;
}

export default function ServerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);

  const [loading, setLoading] = useState(true);
  const [btnLoading, setBtnLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [deployLoading, setDeployLoading] = useState(false);
  const [deploySuccess, setDeploySuccess] = useState('');
  const [deployError, setDeployError] = useState('');
  const [testFbLoading, setTestFbLoading] = useState(false);
  const [testFbSuccess, setTestFbSuccess] = useState('');
  const [testFbError, setTestFbError] = useState('');
  const [testAnnLoading, setTestAnnLoading] = useState(false);
  const [testAnnSuccess, setTestAnnSuccess] = useState('');
  const [testAnnError, setTestAnnError] = useState('');
  const [scoreLoading, setScoreLoading] = useState(false);
  const [scoreSuccess, setScoreSuccess] = useState('');
  const [scoreError, setScoreError] = useState('');
  // Dynamic Events list from Supabase
  const [events, setEvents] = useState<EventItem[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);

  // Dynamic Channels list from Discord API
  const [discordChannels, setDiscordChannels] = useState<{ id: string; name: string; type: number; parentId: string | null }[]>([]);
  const [botConnected, setBotConnected] = useState(false);

  // Dynamic Roles list from Discord API
  const [discordRoles, setDiscordRoles] = useState<{ id: string; name: string; color: number }[]>([]);
  const [channelsLoading, setChannelsLoading] = useState(false);

  // Form Fields state
  const [guildName, setGuildName] = useState('');
  const [supabaseUrl, setSupabaseUrl] = useState('');
  const [supabaseAnonKey, setSupabaseAnonKey] = useState('');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [chanFirstBlood, setChanFirstBlood] = useState('');
  const [chanScoreboard, setChanScoreboard] = useState('');
  const [chanAnnouncements, setChanAnnouncements] = useState('');
  const [chanTicketCategory, setChanTicketCategory] = useState('');
  const [chanTicketLogs, setChanTicketLogs] = useState('');
  const [chanTicketPanel, setChanTicketPanel] = useState('');
  const [ticketPingRoles, setTicketPingRoles] = useState<string[]>([]);
  const [ticketRequiredRoles, setTicketRequiredRoles] = useState<string[]>([]);
  const [ticketWelcomeMessage, setTicketWelcomeMessage] = useState('');
  const [enableFirstBlood, setEnableFirstBlood] = useState(true);
  const [enableScoreboard, setEnableScoreboard] = useState(true);
  const [enableTickets, setEnableTickets] = useState(true);
  const [enableRealtime, setEnableRealtime] = useState(true);
  const [activeEventId, setActiveEventId] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [turnstileSiteKey, setTurnstileSiteKey] = useState('');
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);

  // Turnstile widget rendering effect
  useEffect(() => {
    if (!turnstileSiteKey) return;

    let checkInterval: NodeJS.Timeout;

    const renderTurnstile = () => {
      const w = window as any;
      if (w.turnstile) {
        try {
          w.turnstile.render('#turnstile-container', {
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
          w.turnstile.remove('#turnstile-container');
        } catch (e) { }
      }
    };
  }, [turnstileSiteKey]);

  // Fetch Server details & channels
  useEffect(() => {
    async function fetchServer() {
      try {
        const res = await fetch(`/api/servers/${id}`);
        if (!res.ok) {
          throw new Error('Failed to load server configuration.');
        }
        const data = await res.json() as GuildConfig;

        setGuildName(data.guild_name);
        setSupabaseUrl(data.supabase_url);
        setSupabaseAnonKey(data.supabase_anon_key);
        setLoginEmail(data.supabase_login_email || '');
        setLoginPassword(data.supabase_login_password || '');
        setChanFirstBlood(data.channel_firstblood || '');
        setChanScoreboard(data.channel_scoreboard || '');
        setChanAnnouncements(data.channel_announcements || '');
        setChanTicketCategory(data.channel_ticket_category || '');
        setChanTicketLogs(data.channel_ticket_logs || '');
        setChanTicketPanel(data.channel_ticket_panel || '');
        setTicketPingRoles(data.ticket_ping_roles ? data.ticket_ping_roles.split(',') : []);
        setTicketRequiredRoles(data.ticket_required_roles ? data.ticket_required_roles.split(',') : []);
        setTicketWelcomeMessage(data.ticket_welcome_message || '');
        setEnableFirstBlood(data.enable_firstblood === 1);
        setEnableScoreboard(data.enable_scoreboard === 1);
        setEnableTickets(data.enable_tickets === 1);
        setEnableRealtime(data.enable_realtime === 1);
        setActiveEventId(data.active_event_id || '');
        setIsActive(data.is_active === 1);
        setTurnstileSiteKey(data.supabase_turnstile_site_key || '');

        // Fetch events list from Supabase
        fetchEventsList(data.supabase_url, data.supabase_anon_key);
        // Fetch channels + roles list from Discord API
        fetchDiscordChannels();
        fetchDiscordRoles();
      } catch (err: any) {
        setError(err.message || 'Error occurred.');
      } finally {
        setLoading(false);
      }
    }

    fetchServer();
  }, [id]);

  // Load events from external Supabase
  const fetchEventsList = async (url: string, key: string) => {
    if (!url || !key) return;
    setEventsLoading(true);
    try {
      const cleanUrl = url.replace(/\/$/, '');
      const res = await fetch(`${cleanUrl}/rest/v1/events?select=id,name`, {
        method: 'GET',
        headers: {
          'apikey': key,
          'Authorization': `Bearer ${key}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        setEvents(data);
      }
    } catch (err) {
      console.warn('Could not fetch events from Supabase connection:', err);
    } finally {
      setEventsLoading(false);
    }
  };

  // Load channels from Discord API via Web Dashboard
  const fetchDiscordChannels = async () => {
    setChannelsLoading(true);
    try {
      const res = await fetch(`/api/servers/${id}/channels`);
      if (res.ok) {
        const data = await res.json();
        setDiscordChannels(data);
        setBotConnected(true);
      } else {
        setBotConnected(false);
      }
    } catch (err) {
      setBotConnected(false);
    } finally {
      setChannelsLoading(false);
    }
  };

  // Load roles from Discord API
  const fetchDiscordRoles = async () => {
    try {
      const res = await fetch(`/api/servers/${id}/roles`);
      if (res.ok) {
        const data = await res.json();
        setDiscordRoles(data);
      }
    } catch (err) {
      console.warn('Could not fetch Discord roles:', err);
    }
  };

  // Toggle role in/out of a list
  const toggleRole = (roleId: string, list: string[], setList: React.Dispatch<React.SetStateAction<string[]>>) => {
    if (list.includes(roleId)) {
      setList(list.filter(r => r !== roleId));
    } else {
      setList([...list, roleId]);
    }
  };

  // Helper: get role name by ID
  const getRoleName = (roleId: string) => {
    const role = discordRoles.find(r => r.id === roleId);
    return role ? `@${role.name}` : roleId;
  };

  // Helper: convert Discord int color to hex CSS
  const roleColorHex = (color: number) => color === 0 ? '#94a3b8' : `#${color.toString(16).padStart(6, '0')}`;


  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setBtnLoading(true);

    try {
      const res = await fetch(`/api/servers/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guild_name: guildName,
          supabase_url: supabaseUrl,
          supabase_anon_key: supabaseAnonKey,
          supabase_login_email: loginEmail || null,
          supabase_login_password: loginPassword || null,
          supabase_turnstile_site_key: turnstileSiteKey || null,
          captchaToken: captchaToken || null,
          channel_firstblood: chanFirstBlood || null,
          channel_scoreboard: chanScoreboard || null,
          channel_announcements: chanAnnouncements || null,
          channel_ticket_category: chanTicketCategory || null,
          channel_ticket_logs: chanTicketLogs || null,
          channel_ticket_panel: chanTicketPanel || null,
          ticket_ping_roles: ticketPingRoles.length > 0 ? ticketPingRoles.join(',') : null,
          ticket_required_roles: ticketRequiredRoles.length > 0 ? ticketRequiredRoles.join(',') : null,
          ticket_welcome_message: ticketWelcomeMessage || null,
          enable_firstblood: enableFirstBlood,
          enable_scoreboard: enableScoreboard,
          enable_tickets: enableTickets,
          enable_realtime: enableRealtime,
          active_event_id: activeEventId || null,
          is_active: isActive,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to save configuration.');
      }

      setSuccess('Configuration updated successfully!');
      // Re-trigger event fetch in case Supabase credentials changed
      fetchEventsList(supabaseUrl, supabaseAnonKey);
    } catch (err: any) {
      setError(err.message || 'Verification or save failed.');
    } finally {
      setBtnLoading(false);
    }
  };

  const handleDeployPanel = async () => {
    setDeployLoading(true);
    setDeployError('');
    setDeploySuccess('');
    try {
      const res = await fetch(`/api/servers/${id}/deploy-panel`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to deploy panel.');
      }
      setDeploySuccess('Embed panel deployed successfully!');
    } catch (err: any) {
      setDeployError(err.message || 'Error occurred.');
    } finally {
      setDeployLoading(false);
    }
  };

  const handleTestFirstBlood = async () => {
    setTestFbLoading(true);
    setTestFbError('');
    setTestFbSuccess('');
    try {
      const res = await fetch(`/api/servers/${id}/test-firstblood`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to send test First Blood alert.');
      }
      setTestFbSuccess('Test alert sent successfully to First Blood channel!');
    } catch (err: any) {
      setTestFbError(err.message || 'Error occurred.');
    } finally {
      setTestFbLoading(false);
    }
  };

  const handleTestAnnouncement = async () => {
    setTestAnnLoading(true);
    setTestAnnError('');
    setTestAnnSuccess('');
    try {
      const res = await fetch(`/api/servers/${id}/test-announcement`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to send test CTF announcement.');
      }
      setTestAnnSuccess('Test announcement sent successfully to channel!');
    } catch (err: any) {
      setTestAnnError(err.message || 'Error occurred.');
    } finally {
      setTestAnnLoading(false);
    }
  };

  const handleDeployScoreboard = async () => {
    setScoreLoading(true);
    setScoreError('');
    setScoreSuccess('');
    try {
      const res = await fetch(`/api/servers/${id}/deploy-scoreboard`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to deploy/update live scoreboard.');
      }
      setScoreSuccess(data.message || 'Scoreboard deployed/updated successfully!');
    } catch (err: any) {
      setScoreError(err.message || 'Error occurred.');
    } finally {
      setScoreLoading(false);
    }
  };



  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <RefreshCw className="animate-spin" size={32} style={{ color: '#38bdf8' }} />
      </div>
    );
  }

  return (
    <div className="animate-fade-in" style={{ maxWidth: '960px', margin: '0 auto' }}>
      <div style={{ marginBottom: '24px' }}>
        <Link href="/dashboard/servers" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: 'var(--muted)', fontWeight: 600, fontSize: '15px' }}>
          <ArrowLeft size={16} /> Back to Servers
        </Link>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <h1 style={{ fontSize: '32px', fontWeight: 800 }}>Configure Bot</h1>
            <span style={{ fontSize: '13px', background: 'rgba(56, 189, 248, 0.08)', color: '#38bdf8', padding: '4px 10px', borderRadius: '12px', border: '1px solid rgba(56, 189, 248, 0.2)', fontFamily: 'var(--font-mono)' }}>{id}</span>
          </div>
          <p style={{ color: '#94a3b8' }}>Adjust webhook channels, database connection rules, and active status</p>
        </div>
      </div>

      {error && (
        <div style={{ background: 'rgba(244, 63, 94, 0.1)', border: '1px solid rgba(244, 63, 94, 0.2)', color: '#f43f5e', padding: '12px 16px', borderRadius: '8px', marginBottom: '24px', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <AlertTriangle size={18} />
          {error}
        </div>
      )}

      {success && (
        <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)', color: '#10b981', padding: '12px 16px', borderRadius: '8px', marginBottom: '24px', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CheckCircle size={18} style={{ color: '#10b981' }} />
          {success}
        </div>
      )}

      <form onSubmit={handleSave}>
        {/* Section 1: Server Info & Credentials */}
        <div className="glass-panel" style={{ padding: '32px', marginBottom: '32px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '24px', color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Server size={18} /> Credentials & Integration
          </h2>

          <div className="form-group">
            <label>Server/Guild Name (Display only)</label>
            <input
              type="text"
              className="glass-input"
              value={guildName}
              onChange={(e) => setGuildName(e.target.value)}
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
                required
              />
            </div>
          </div>

          <div className="form-row" style={{ marginBottom: 0 }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Bypass RLS Email (Optional)</label>
              <input
                type="email"
                className="glass-input"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                placeholder="No authentication"
              />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
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

          {turnstileSiteKey && (
            <div style={{ marginTop: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: 600, color: '#38bdf8' }}>
                Cloudflare Turnstile Verification
              </label>
              <p style={{ color: '#94a3b8', fontSize: '12px', marginBottom: '12px' }}>
                This server&apos;s Supabase login is protected by Cloudflare Turnstile. Please verify you are human before saving.
              </p>
              <div id="turnstile-container" style={{ minHeight: '65px' }}></div>
              <Script
                src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
                strategy="afterInteractive"
              />
            </div>
          )}

          <div className="form-group" style={{ marginTop: '20px', marginBottom: 0 }}>
            <label>Cloudflare Turnstile Site Key (Optional)</label>
            <p style={{ color: '#94a3b8', fontSize: '12px', marginBottom: '8px' }}>
              If this server&apos;s Supabase enforces Cloudflare Turnstile captcha on login, paste the public site key here.
            </p>
            <input
              type="text"
              className="glass-input"
              value={turnstileSiteKey}
              onChange={(e) => setTurnstileSiteKey(e.target.value)}
              placeholder="e.g. 0x4AAAAAADccgBtUIa17v76i"
            />
          </div>
        </div>

        {/* Section 3: Supabase Channel Configurations */}
        <div className="glass-panel" style={{ padding: '32px', marginBottom: '32px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '24px', color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '10px' }}>
            Supabase Discord Channel Settings
          </h2>

          <div className="form-group" style={{ marginBottom: '24px', borderBottom: '1px solid var(--border-color)', paddingBottom: '24px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Database size={16} /> Select Active Event ID
            </label>
            <p style={{ color: '#94a3b8', fontSize: '12px', marginBottom: '8px' }}>
              Select the specific CTF event from the database that this Discord Server will track and pull challenges/scores from.
            </p>
            {eventsLoading ? (
              <div style={{ color: '#94a3b8', fontSize: '14px' }}>Querying Supabase events...</div>
            ) : events.length > 0 ? (
              <select
                className="glass-input glass-select"
                value={activeEventId}
                onChange={(e) => setActiveEventId(e.target.value)}
              >
                <option value="">-- Direct Raw String / No specific Event --</option>
                {events.map((e) => (
                  <option key={e.id} value={e.id}>{e.name} ({e.id})</option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                className="glass-input"
                value={activeEventId}
                onChange={(e) => setActiveEventId(e.target.value)}
                placeholder="Paste Event UUID (e.g. 550e8400-e29b-41d4-a716-446655440000)"
              />
            )}
          </div>

          {channelsLoading && (
            <div style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '16px' }}>Fetching guild channels from Discord...</div>
          )}

          <div className="form-row">
            <div className="form-group">
              <label>First Blood Channel ID</label>
              {botConnected ? (
                <select
                  className="glass-input glass-select"
                  value={chanFirstBlood}
                  onChange={(e) => setChanFirstBlood(e.target.value)}
                >
                  <option value="">-- Select Channel --</option>
                  {discordChannels.filter(c => c.type === 0).map(c => (
                    <option key={c.id} value={c.id}>#{c.name}</option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  className="glass-input"
                  value={chanFirstBlood}
                  onChange={(e) => setChanFirstBlood(e.target.value)}
                  placeholder="e.g. 112233445566778899"
                />
              )}

              {chanFirstBlood && (
                <div style={{ marginTop: '8px' }}>
                  <button
                    type="button"
                    onClick={handleTestFirstBlood}
                    disabled={testFbLoading}
                    className="btn btn-secondary"
                    style={{ fontSize: '11px', padding: '4px 10px', height: 'auto', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                  >
                    {testFbLoading ? <RefreshCw className="animate-spin" size={10} /> : null}
                    Test First Blood
                  </button>
                  {testFbSuccess && <span style={{ color: '#10b981', fontSize: '11px', marginLeft: '8px' }}>✓ {testFbSuccess}</span>}
                  {testFbError && <span style={{ color: '#ef4444', fontSize: '11px', marginLeft: '8px' }}>✗ {testFbError}</span>}
                </div>
              )}
            </div>
            <div className="form-group">
              <label>Live Scoreboard Channel ID</label>
              {botConnected ? (
                <select
                  className="glass-input glass-select"
                  value={chanScoreboard}
                  onChange={(e) => setChanScoreboard(e.target.value)}
                >
                  <option value="">-- Select Channel --</option>
                  {discordChannels.filter(c => c.type === 0).map(c => (
                    <option key={c.id} value={c.id}>#{c.name}</option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  className="glass-input"
                  value={chanScoreboard}
                  onChange={(e) => setChanScoreboard(e.target.value)}
                  placeholder="e.g. 112233445566778899"
                />
              )}

              {chanScoreboard && (
                <div style={{ marginTop: '8px' }}>
                  <button
                    type="button"
                    onClick={handleDeployScoreboard}
                    disabled={scoreLoading}
                    className="btn btn-secondary"
                    style={{ fontSize: '11px', padding: '4px 10px', height: 'auto', display: 'inline-flex', alignItems: 'center', gap: '4px', borderColor: '#f59e0b', color: '#fbbf24', background: 'rgba(245, 158, 11, 0.03)' }}
                  >
                    {scoreLoading ? <RefreshCw className="animate-spin" size={10} /> : null}
                    Deploy / Update Scoreboard
                  </button>
                  {scoreSuccess && <span style={{ color: '#10b981', fontSize: '11px', marginLeft: '8px' }}>✓ {scoreSuccess}</span>}
                  {scoreError && <span style={{ color: '#ef4444', fontSize: '11px', marginLeft: '8px' }}>✗ {scoreError}</span>}
                </div>
              )}
            </div>
          </div>

          <div className="form-group">
            <label>CTF Announcements Channel ID</label>
            {botConnected ? (
              <select
                className="glass-input glass-select"
                value={chanAnnouncements}
                onChange={(e) => setChanAnnouncements(e.target.value)}
              >
                <option value="">-- Select Channel --</option>
                {discordChannels.filter(c => c.type === 0).map(c => (
                  <option key={c.id} value={c.id}>#{c.name}</option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                className="glass-input"
                value={chanAnnouncements}
                onChange={(e) => setChanAnnouncements(e.target.value)}
                placeholder="e.g. 112233445566778899"
              />
            )}

            {chanAnnouncements && (
              <div style={{ marginTop: '8px' }}>
                <button
                  type="button"
                  onClick={handleTestAnnouncement}
                  disabled={testAnnLoading}
                  className="btn btn-secondary"
                  style={{ fontSize: '11px', padding: '4px 10px', height: 'auto', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                >
                  {testAnnLoading ? <RefreshCw className="animate-spin" size={10} /> : null}
                  Test Announcement
                </button>
                {testAnnSuccess && <span style={{ color: '#10b981', fontSize: '11px', marginLeft: '8px' }}>✓ {testAnnSuccess}</span>}
                {testAnnError && <span style={{ color: '#ef4444', fontSize: '11px', marginLeft: '8px' }}>✗ {testAnnError}</span>}
              </div>
            )}
          </div>
        </div>

        {/* Section 3.5: Ticket System Configuration */}
        <div className="glass-panel" style={{ padding: '32px', marginBottom: '32px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px', color: '#a78bfa', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Ticket size={20} />
            Ticket System Configuration
          </h2>
          <p style={{ color: '#94a3b8', fontSize: '13px', marginBottom: '24px' }}>
            Configure how the support ticket system works in your Discord server. Set the panel channel, roles, and custom messages.
          </p>

          {/* Ticket Panel Channel */}
          <div className="form-group" style={{ marginBottom: '24px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <MessageSquare size={16} />
              Ticket Panel Channel
            </label>
            <p style={{ color: '#94a3b8', fontSize: '12px', marginBottom: '8px' }}>
              The channel where the &quot;Open a Ticket&quot; embed panel will be posted. Users click a button here to create tickets.
            </p>
            {botConnected ? (
              <select
                className="glass-input glass-select"
                value={chanTicketPanel}
                onChange={(e) => setChanTicketPanel(e.target.value)}
              >
                <option value="">-- Select Channel --</option>
                {discordChannels.filter(c => c.type === 0).map(c => (
                  <option key={c.id} value={c.id}>#{c.name}</option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                className="glass-input"
                value={chanTicketPanel}
                onChange={(e) => setChanTicketPanel(e.target.value)}
                placeholder="e.g. 112233445566778899"
              />
            )}

            {chanTicketPanel && (
              <div style={{ marginTop: '12px' }}>
                <button
                  type="button"
                  onClick={handleDeployPanel}
                  disabled={deployLoading}
                  className="btn btn-secondary"
                  style={{
                    fontSize: '13px',
                    padding: '8px 16px',
                    borderColor: '#a78bfa',
                    color: '#c084fc',
                    background: 'rgba(167, 139, 250, 0.05)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  {deployLoading ? <RefreshCw className="animate-spin" size={14} /> : <Ticket size={14} />}
                  {deployLoading ? 'Deploying...' : 'Deploy Panel Embed'}
                </button>
                <p style={{ color: '#94a3b8', fontSize: '11px', marginTop: '6px' }}>
                  ⚠️ Make sure to save the configuration changes first before deploying the panel.
                </p>
                {deploySuccess && (
                  <p style={{ color: '#10b981', fontSize: '12px', marginTop: '6px' }}>✓ {deploySuccess}</p>
                )}
                {deployError && (
                  <p style={{ color: '#ef4444', fontSize: '12px', marginTop: '6px' }}>✗ {deployError}</p>
                )}
              </div>
            )}
          </div>

          {/* Support Ticket Logs Channel */}
          <div className="form-group" style={{ marginBottom: '24px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <MessageSquare size={16} />
              Support Ticket Logs Channel ID
            </label>
            <p style={{ color: '#94a3b8', fontSize: '12px', marginBottom: '8px' }}>
              The channel where all ticket logs (creation, closure, assignments) will be sent.
            </p>
            {botConnected ? (
              <select
                className="glass-input glass-select"
                value={chanTicketLogs}
                onChange={(e) => setChanTicketLogs(e.target.value)}
              >
                <option value="">-- Select Channel --</option>
                {discordChannels.filter(c => c.type === 0).map(c => (
                  <option key={c.id} value={c.id}>#{c.name}</option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                className="glass-input"
                value={chanTicketLogs}
                onChange={(e) => setChanTicketLogs(e.target.value)}
                placeholder="e.g. 112233445566778899"
              />
            )}
          </div>

          {/* Support Ticket Parent Category */}
          <div className="form-group" style={{ marginBottom: '24px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FolderOpen size={16} />
              Support Ticket Parent Category ID
            </label>
            <p style={{ color: '#94a3b8', fontSize: '12px', marginBottom: '8px' }}>
              The Discord category under which all new private ticket channels will be created.
            </p>
            {botConnected ? (
              <select
                className="glass-input glass-select"
                value={chanTicketCategory}
                onChange={(e) => setChanTicketCategory(e.target.value)}
              >
                <option value="">-- Select Category --</option>
                {discordChannels.filter(c => c.type === 4).map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                className="glass-input"
                value={chanTicketCategory}
                onChange={(e) => setChanTicketCategory(e.target.value)}
                placeholder="e.g. 112233445566778899"
              />
            )}
          </div>

          {/* Ping Roles on Ticket Open */}
          <div className="form-group" style={{ marginBottom: '24px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Users size={16} />
              Roles to Ping When a Ticket Opens
            </label>
            <p style={{ color: '#94a3b8', fontSize: '12px', marginBottom: '8px' }}>
              These roles will be mentioned/pinged inside every new ticket channel so staff gets notified.
            </p>
            {discordRoles.length > 0 ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {discordRoles.map(role => {
                  const isSelected = ticketPingRoles.includes(role.id);
                  return (
                    <button
                      key={role.id}
                      type="button"
                      onClick={() => toggleRole(role.id, ticketPingRoles, setTicketPingRoles)}
                      style={{
                        padding: '6px 14px',
                        borderRadius: '20px',
                        fontSize: '13px',
                        fontWeight: 600,
                        border: isSelected ? `2px solid ${roleColorHex(role.color)}` : '1px solid var(--border-color)',
                        background: isSelected ? `${roleColorHex(role.color)}22` : 'transparent',
                        color: isSelected ? roleColorHex(role.color) : '#94a3b8',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {isSelected ? '✓ ' : ''}@{role.name}
                    </button>
                  );
                })}
              </div>
            ) : (
              <input
                type="text"
                className="glass-input"
                value={ticketPingRoles.join(',')}
                onChange={(e) => setTicketPingRoles(e.target.value ? e.target.value.split(',') : [])}
                placeholder="Comma-separated Role IDs (e.g. 123456,789012)"
              />
            )}
            {ticketPingRoles.length > 0 && (
              <div style={{ marginTop: '8px', fontSize: '12px', color: '#64748b' }}>
                Selected: {ticketPingRoles.map(id => getRoleName(id)).join(', ')}
              </div>
            )}
          </div>

          {/* Required Roles to Open Ticket */}
          <div className="form-group" style={{ marginBottom: '24px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Users size={16} />
              Required Roles to Open a Ticket
            </label>
            <p style={{ color: '#94a3b8', fontSize: '12px', marginBottom: '8px' }}>
              Only members with at least one of these roles can open a ticket. Leave empty to allow all members.
            </p>
            {discordRoles.length > 0 ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {discordRoles.map(role => {
                  const isSelected = ticketRequiredRoles.includes(role.id);
                  return (
                    <button
                      key={role.id}
                      type="button"
                      onClick={() => toggleRole(role.id, ticketRequiredRoles, setTicketRequiredRoles)}
                      style={{
                        padding: '6px 14px',
                        borderRadius: '20px',
                        fontSize: '13px',
                        fontWeight: 600,
                        border: isSelected ? `2px solid ${roleColorHex(role.color)}` : '1px solid var(--border-color)',
                        background: isSelected ? `${roleColorHex(role.color)}22` : 'transparent',
                        color: isSelected ? roleColorHex(role.color) : '#94a3b8',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {isSelected ? '✓ ' : ''}@{role.name}
                    </button>
                  );
                })}
              </div>
            ) : (
              <input
                type="text"
                className="glass-input"
                value={ticketRequiredRoles.join(',')}
                onChange={(e) => setTicketRequiredRoles(e.target.value ? e.target.value.split(',') : [])}
                placeholder="Comma-separated Role IDs (leave empty = everyone)"
              />
            )}
            {ticketRequiredRoles.length > 0 && (
              <div style={{ marginTop: '8px', fontSize: '12px', color: '#64748b' }}>
                Selected: {ticketRequiredRoles.map(id => getRoleName(id)).join(', ')}
              </div>
            )}
          </div>

          {/* Custom Welcome Message */}
          <div className="form-group">
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <MessageSquare size={16} />
              Custom Ticket Welcome Message
            </label>
            <p style={{ color: '#94a3b8', fontSize: '12px', marginBottom: '8px' }}>
              This message will be posted inside every new ticket channel. Use <code style={{ background: 'rgba(56,189,248,0.1)', padding: '2px 6px', borderRadius: '4px', fontSize: '12px' }}>{'{{user}}'}</code> to mention the ticket opener.
            </p>
            <textarea
              className="glass-input"
              value={ticketWelcomeMessage}
              onChange={(e) => setTicketWelcomeMessage(e.target.value)}
              placeholder={"Hello {{user}}! 👋\n\nA staff member will assist you shortly.\nPlease describe your issue in detail."}
              rows={5}
              style={{ resize: 'vertical', minHeight: '100px', fontFamily: 'inherit' }}
            />
          </div>
        </div>

        {/* Section 4: Feature Toggles */}
        <div className="glass-panel" style={{ padding: '32px', marginBottom: '32px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '24px', color: '#38bdf8' }}>Feature Toggles</h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <span style={{ fontWeight: 600 }}>Enable First Blood Alerts</span>
                <p style={{ color: '#94a3b8', fontSize: '13px' }}>Notify Discord server immediately when challenges are solved the first time.</p>
              </div>
              <input
                type="checkbox"
                checked={enableFirstBlood}
                onChange={(e) => setEnableFirstBlood(e.target.checked)}
                style={{ width: '20px', height: '20px', cursor: 'pointer' }}
              />
            </div>


            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--border-color)', paddingTop: '20px' }}>
              <div>
                <span style={{ fontWeight: 600 }}>Enable Support Ticket System</span>
                <p style={{ color: '#94a3b8', fontSize: '13px' }}>Allow opening support ticket channels dynamically via /ticket create.</p>
              </div>
              <input
                type="checkbox"
                checked={enableTickets}
                onChange={(e) => setEnableTickets(e.target.checked)}
                style={{ width: '20px', height: '20px', cursor: 'pointer' }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--border-color)', paddingTop: '20px' }}>
              <div>
                <span style={{ fontWeight: 600 }}>Active Status</span>
                <p style={{ color: '#94a3b8', fontSize: '13px' }}>Turn completely ON/OFF the bot listeners for this guild.</p>
              </div>
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                style={{ width: '20px', height: '20px', cursor: 'pointer' }}
              />
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '16px', justifyContent: 'flex-end', marginBottom: '48px' }}>
          <Link href="/dashboard/servers" className="btn btn-secondary">
            Cancel
          </Link>
          <button type="submit" className="btn btn-primary" disabled={btnLoading} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Save size={18} />
            {btnLoading ? 'Saving changes...' : 'Save Configuration'}
          </button>
        </div>
      </form>
    </div>
  );
}
