'use client';

import React, { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { Server, Save, ArrowLeft, RefreshCw, AlertTriangle, CheckCircle, Database, Ticket, Users, MessageSquare, FolderOpen } from 'lucide-react';
import Link from 'next/link';
import Script from 'next/script';

interface GuildConfig {
  id: string;
  guild_name: string;
  supabase_connection_id: string | null;
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
  const [connections, setConnections] = useState<any[]>([]);
  const [supabaseConnectionId, setSupabaseConnectionId] = useState('');
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

  // Tab State
  const [activeTab, setActiveTab] = useState<'supabase' | 'channels' | 'tickets'>('supabase');

  // Test Connection State
  const [testConnLoading, setTestConnLoading] = useState(false);
  const [testConnSuccess, setTestConnSuccess] = useState('');
  const [testConnError, setTestConnError] = useState('');

  // Fetch Server details & channels
  useEffect(() => {
    async function fetchServer() {
      try {
        // Fetch saved connections first
        const connRes = await fetch('/api/databases');
        let dbConns: any[] = [];
        if (connRes.ok) {
          dbConns = await connRes.json();
          setConnections(dbConns);
        }

        const res = await fetch(`/api/servers/${id}`);
        if (!res.ok) {
          throw new Error('Failed to load server configuration.');
        }
        const data = await res.json() as GuildConfig;

        setGuildName(data.guild_name);
        setSupabaseConnectionId(data.supabase_connection_id || '');
        setSupabaseUrl(data.supabase_url || '');
        setSupabaseAnonKey(data.supabase_anon_key || '');
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

        // Fetch events list from Supabase using linked credentials
        if (data.supabase_url && data.supabase_anon_key) {
          fetchEventsList(data.supabase_url, data.supabase_anon_key);
        }
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
          supabase_connection_id: supabaseConnectionId || null,
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
      // Re-trigger event fetch using current linked connection credentials
      if (supabaseUrl && supabaseAnonKey) {
        fetchEventsList(supabaseUrl, supabaseAnonKey);
      }
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

  const handleTestConnection = async () => {
    setTestConnLoading(true);
    setTestConnSuccess('');
    setTestConnError('');
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
      if (!res.ok) {
        throw new Error(data.error || 'Failed to verify connection.');
      }
      setTestConnSuccess(data.message || 'Verification successful!');
    } catch (err: any) {
      setTestConnError(err.message || 'Error testing connection.');
    } finally {
      setTestConnLoading(false);
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
    <div className="animate-fade-in" style={{ maxWidth: '960px', margin: '0 auto', position: 'relative' }}>
      <form onSubmit={handleSave}>
        {/* Sticky Header Bar */}
        <div style={{
          position: 'sticky',
          top: 0,
          zIndex: 50,
          background: 'rgba(7, 9, 14, 0.95)',
          backdropFilter: 'blur(16px)',
          borderBottom: '1px solid var(--border-color)',
          margin: '-40px -40px 32px -40px',
          padding: '20px 40px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxShadow: '0 4px 20px 0 rgba(0, 0, 0, 0.3)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <Link href="/dashboard/servers" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(30, 41, 59, 0.5)', border: '1px solid var(--border-color)', color: 'var(--foreground)', transition: 'all 0.2s ease' }} title="Back to Servers">
              <ArrowLeft size={16} />
            </Link>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <h1 style={{ fontSize: '20px', fontWeight: 800, margin: 0 }}>Configure {guildName || 'Bot'}</h1>
                <span style={{ fontSize: '11px', background: 'rgba(56, 189, 248, 0.08)', color: '#38bdf8', padding: '3px 8px', borderRadius: '8px', border: '1px solid rgba(56, 189, 248, 0.2)', fontFamily: 'var(--font-mono)' }}>{id}</span>
                <span className={`badge ${isActive ? 'badge-success' : 'badge-danger'}`} style={{ fontSize: '11px' }}>
                  {isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
              <p style={{ color: '#64748b', fontSize: '12px', margin: 0 }}>Manage settings and live integration channels</p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <button type="submit" className="btn btn-primary" disabled={btnLoading} style={{ padding: '10px 20px', fontSize: '14px' }}>
              {btnLoading ? <RefreshCw className="animate-spin" size={16} /> : <Save size={16} />}
              {btnLoading ? 'Saving...' : 'Save Configuration'}
            </button>
          </div>
        </div>

        {/* Global Notifications */}
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

        {/* Tabs Bar */}
        <div style={{
          display: 'flex',
          gap: '8px',
          borderBottom: '1px solid var(--border-color)',
          paddingBottom: '12px',
          marginBottom: '32px',
          overflowX: 'auto'
        }}>
          <button
            type="button"
            onClick={() => { setActiveTab('supabase'); setSuccess(''); setError(''); }}
            className={`btn ${activeTab === 'supabase' ? 'btn-primary' : 'btn-secondary'}`}
            style={{
              padding: '8px 16px',
              fontSize: '14px',
              background: activeTab === 'supabase' ? 'var(--primary)' : 'rgba(30, 41, 59, 0.3)',
              color: activeTab === 'supabase' ? '#030712' : '#94a3b8',
              borderColor: activeTab === 'supabase' ? 'var(--primary)' : 'var(--border-color)',
            }}
          >
            <Database size={16} />
            Supabase & Integration
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('channels'); setSuccess(''); setError(''); }}
            className={`btn ${activeTab === 'channels' ? 'btn-primary' : 'btn-secondary'}`}
            style={{
              padding: '8px 16px',
              fontSize: '14px',
              background: activeTab === 'channels' ? 'var(--primary)' : 'rgba(30, 41, 59, 0.3)',
              color: activeTab === 'channels' ? '#030712' : '#94a3b8',
              borderColor: activeTab === 'channels' ? 'var(--primary)' : 'var(--border-color)',
            }}
          >
            <MessageSquare size={16} />
            Discord Channels
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('tickets'); setSuccess(''); setError(''); }}
            className={`btn ${activeTab === 'tickets' ? 'btn-primary' : 'btn-secondary'}`}
            style={{
              padding: '8px 16px',
              fontSize: '14px',
              background: activeTab === 'tickets' ? 'var(--primary)' : 'rgba(30, 41, 59, 0.3)',
              color: activeTab === 'tickets' ? '#030712' : '#94a3b8',
              borderColor: activeTab === 'tickets' ? 'var(--primary)' : 'var(--border-color)',
            }}
          >
            <Ticket size={16} />
            Ticket System
          </button>
        </div>

        {activeTab === 'supabase' && (
          <div className="glass-panel" style={{ padding: '32px', marginBottom: '32px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '24px', color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Server size={18} /> Credentials & Integration
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px', background: 'rgba(30, 41, 59, 0.2)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <span style={{ fontWeight: 600, fontSize: '15px' }}>Active Status</span>
                  <p style={{ color: '#94a3b8', fontSize: '12px', margin: 0 }}>Turn completely ON/OFF the bot listeners for this server configuration.</p>
                </div>
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
                <div>
                  <span style={{ fontWeight: 600, fontSize: '15px' }}>Enable Supabase Realtime synchronization</span>
                  <p style={{ color: '#94a3b8', fontSize: '12px', margin: 0 }}>Instantly track CTF solves, announcements, and challenges from Supabase.</p>
                </div>
                <input
                  type="checkbox"
                  checked={enableRealtime}
                  onChange={(e) => setEnableRealtime(e.target.checked)}
                  style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                />
              </div>
            </div>

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

            <div className="form-group" style={{ marginBottom: '24px' }}>
              <label>Link Supabase Connection</label>
              {connections.length > 0 ? (
                <select
                  className="glass-input glass-select"
                  value={supabaseConnectionId}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSupabaseConnectionId(val);
                    const conn = connections.find(c => c.id === val);
                    if (conn) {
                      setSupabaseUrl(conn.supabase_url);
                      setSupabaseAnonKey(conn.supabase_anon_key);
                      setLoginEmail(conn.supabase_login_email || '');
                      setLoginPassword(conn.supabase_login_password || '');
                      fetchEventsList(conn.supabase_url, conn.supabase_anon_key);
                    }
                  }}
                  required
                >
                  <option value="">-- Select Connection --</option>
                  {connections.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.supabase_url})
                    </option>
                  ))}
                </select>
              ) : (
                <div style={{ padding: '12px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', color: '#f87171', borderRadius: '8px', fontSize: '13px' }}>
                  No Supabase database connections configured. Create one in the sidebar first.
                </div>
              )}
            </div>

            {supabaseConnectionId && supabaseUrl && (
              <div style={{
                background: 'rgba(30, 41, 59, 0.3)',
                border: '1px solid var(--border-color)',
                padding: '20px',
                borderRadius: '8px',
                marginBottom: '24px',
                fontSize: '13px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#94a3b8' }}>URL:</span>
                  <span style={{ color: '#cbd5e1', fontWeight: 500, fontFamily: 'monospace' }}>{supabaseUrl}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#94a3b8' }}>Anon Key:</span>
                  <span style={{ color: '#cbd5e1', fontWeight: 500, fontFamily: 'monospace' }}>••••••••••••••••••••</span>
                </div>
                {loginEmail && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#94a3b8' }}>Bypass account:</span>
                    <span style={{ color: '#10b981', fontWeight: 500 }}>{loginEmail}</span>
                  </div>
                )}
              </div>
            )}

            <div style={{ marginTop: '24px', borderTop: '1px solid var(--border-color)', paddingTop: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 600 }}>Test Connection</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={handleTestConnection}
                  disabled={testConnLoading || !supabaseConnectionId}
                  className="btn btn-secondary"
                  style={{ padding: '8px 16px', fontSize: '13px' }}
                >
                  {testConnLoading ? <RefreshCw className="animate-spin" size={14} /> : <Database size={14} />}
                  {testConnLoading ? 'Testing connection...' : 'Test Connection'}
                </button>
                {testConnSuccess && <span style={{ color: '#10b981', fontSize: '13px', fontWeight: 500 }}>✓ {testConnSuccess}</span>}
                {testConnError && <span style={{ color: '#ef4444', fontSize: '13px', fontWeight: 500 }}>✗ {testConnError}</span>}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'channels' && (
          <div className="glass-panel" style={{ padding: '32px', marginBottom: '32px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '24px', color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '10px' }}>
              Supabase Discord Channel Settings
            </h2>

            <div className="form-group" style={{ marginBottom: '24px', borderBottom: '1px solid var(--border-color)', paddingBottom: '24px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Database size={16} /> Select Active Event ID
              </label>
              {eventsLoading ? (
                <div style={{ color: '#94a3b8', fontSize: '14px' }}>Querying Supabase events...</div>
              ) : events.length > 0 ? (
                <select
                  className="glass-input glass-select"
                  value={activeEventId}
                  onChange={(e) => setActiveEventId(e.target.value)}
                  disabled={!enableRealtime}
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
                  disabled={!enableRealtime}
                />
              )}
            </div>

            {channelsLoading && (
              <div style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '16px' }}>Fetching guild channels from Discord...</div>
            )}

            <div style={{ marginBottom: '24px', borderBottom: '1px solid var(--border-color)', paddingBottom: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <div>
                  <span style={{ fontWeight: 600, fontSize: '15px' }}>Enable First Blood Alerts</span>
                  <p style={{ color: '#94a3b8', fontSize: '12px', margin: 0 }}>Notify Discord server immediately when challenges are solved the first time.</p>
                </div>
                <input
                  type="checkbox"
                  checked={enableFirstBlood}
                  onChange={(e) => setEnableFirstBlood(e.target.checked)}
                  disabled={!enableRealtime}
                  style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                />
              </div>

              <div className="form-group" style={{ opacity: enableFirstBlood && enableRealtime ? 1 : 0.5 }}>
                <label>First Blood Channel ID</label>
                {botConnected ? (
                  <select
                    className="glass-input glass-select"
                    value={chanFirstBlood}
                    onChange={(e) => setChanFirstBlood(e.target.value)}
                    disabled={!enableFirstBlood || !enableRealtime}
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
                    disabled={!enableFirstBlood || !enableRealtime}
                  />
                )}

                {chanFirstBlood && enableFirstBlood && enableRealtime && (
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
            </div>

            <div style={{ marginBottom: '24px', borderBottom: '1px solid var(--border-color)', paddingBottom: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <div>
                  <span style={{ fontWeight: 600, fontSize: '15px' }}>Enable Live Scoreboard</span>
                  <p style={{ color: '#94a3b8', fontSize: '12px', margin: 0 }}>Allow users to execute `/scoreboard` command inside the server.</p>
                </div>
                <input
                  type="checkbox"
                  checked={enableScoreboard}
                  onChange={(e) => setEnableScoreboard(e.target.checked)}
                  disabled={!enableRealtime}
                  style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                />
              </div>

              <div className="form-group" style={{ opacity: enableScoreboard && enableRealtime ? 1 : 0.5 }}>
                <label>Live Scoreboard Channel ID</label>
                {botConnected ? (
                  <select
                    className="glass-input glass-select"
                    value={chanScoreboard}
                    onChange={(e) => setChanScoreboard(e.target.value)}
                    disabled={!enableScoreboard || !enableRealtime}
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
                    disabled={!enableScoreboard || !enableRealtime}
                  />
                )}

                {chanScoreboard && enableScoreboard && enableRealtime && (
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

            <div className="form-group" style={{ opacity: enableRealtime ? 1 : 0.5 }}>
              <label>CTF Announcements Channel ID</label>
              {botConnected ? (
                <select
                  className="glass-input glass-select"
                  value={chanAnnouncements}
                  onChange={(e) => setChanAnnouncements(e.target.value)}
                  disabled={!enableRealtime}
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
                  disabled={!enableRealtime}
                />
              )}

              {chanAnnouncements && enableRealtime && (
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
        )}

        {activeTab === 'tickets' && (
          <div className="glass-panel" style={{ padding: '32px', marginBottom: '32px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', borderBottom: '1px solid var(--border-color)', paddingBottom: '20px' }}>
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: 700, margin: 0, color: '#a78bfa', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Ticket size={20} />
                  Ticket System Configuration
                </h2>
                <p style={{ color: '#94a3b8', fontSize: '12px', margin: 0, marginTop: '4px' }}>
                  Configure the support ticket channels, pingable moderator roles, and custom greeting templates.
                </p>
              </div>
              <input
                type="checkbox"
                checked={enableTickets}
                onChange={(e) => setEnableTickets(e.target.checked)}
                style={{ width: '20px', height: '20px', cursor: 'pointer' }}
              />
            </div>

            <div style={{ opacity: enableTickets ? 1 : 0.5, pointerEvents: enableTickets ? 'auto' : 'none' }}>
              <div className="form-group" style={{ marginBottom: '24px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <MessageSquare size={16} />
                  Ticket Panel Channel
                </label>
                {botConnected ? (
                  <select
                    className="glass-input glass-select"
                    value={chanTicketPanel}
                    onChange={(e) => setChanTicketPanel(e.target.value)}
                    disabled={!enableTickets}
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
                    disabled={!enableTickets}
                  />
                )}

                {chanTicketPanel && enableTickets && (
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
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}
                    >
                      {deployLoading ? <RefreshCw className="animate-spin" size={14} /> : <Ticket size={14} />}
                      {deployLoading ? 'Deploying...' : 'Deploy Panel Embed'}
                    </button>
                    {deploySuccess && <p style={{ color: '#10b981', fontSize: '12px', marginTop: '6px' }}>✓ {deploySuccess}</p>}
                    {deployError && <p style={{ color: '#ef4444', fontSize: '12px', marginTop: '6px' }}>✗ {deployError}</p>}
                  </div>
                )}
              </div>

              <div className="form-group" style={{ marginBottom: '24px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <MessageSquare size={16} />
                  Support Ticket Logs Channel ID
                </label>
                {botConnected ? (
                  <select
                    className="glass-input glass-select"
                    value={chanTicketLogs}
                    onChange={(e) => setChanTicketLogs(e.target.value)}
                    disabled={!enableTickets}
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
                    disabled={!enableTickets}
                  />
                )}
              </div>

              <div className="form-group" style={{ marginBottom: '24px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <FolderOpen size={16} />
                  Support Ticket Parent Category ID
                </label>
                {botConnected ? (
                  <select
                    className="glass-input glass-select"
                    value={chanTicketCategory}
                    onChange={(e) => setChanTicketCategory(e.target.value)}
                    disabled={!enableTickets}
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
                    disabled={!enableTickets}
                  />
                )}
              </div>

              <div className="form-group" style={{ marginBottom: '24px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Users size={16} />
                  Roles to Ping When a Ticket Opens
                </label>
                {discordRoles.length > 0 ? (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {discordRoles.map(role => {
                      const isSelected = ticketPingRoles.includes(role.id);
                      return (
                        <button
                          key={role.id}
                          type="button"
                          onClick={() => toggleRole(role.id, ticketPingRoles, setTicketPingRoles)}
                          disabled={!enableTickets}
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
                    disabled={!enableTickets}
                  />
                )}
              </div>

              <div className="form-group" style={{ marginBottom: '24px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Users size={16} />
                  Required Roles to Open a Ticket
                </label>
                {discordRoles.length > 0 ? (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {discordRoles.map(role => {
                      const isSelected = ticketRequiredRoles.includes(role.id);
                      return (
                        <button
                          key={role.id}
                          type="button"
                          onClick={() => toggleRole(role.id, ticketRequiredRoles, setTicketRequiredRoles)}
                          disabled={!enableTickets}
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
                    disabled={!enableTickets}
                  />
                )}
              </div>

              <div className="form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <MessageSquare size={16} />
                  Custom Ticket Welcome Message
                </label>
                <textarea
                  className="glass-input"
                  value={ticketWelcomeMessage}
                  onChange={(e) => setTicketWelcomeMessage(e.target.value)}
                  placeholder={"Hello {{user}}! 👋\n\nA staff member will assist you shortly.\nPlease describe your issue in detail."}
                  rows={5}
                  disabled={!enableTickets}
                  style={{ resize: 'vertical', minHeight: '100px', fontFamily: 'inherit' }}
                />
              </div>
            </div>
          </div>
        )}

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
