'use client';

import React, { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { Server, Save, ArrowLeft, RefreshCw, AlertTriangle, CheckCircle, Database } from 'lucide-react';
import Link from 'next/link';

interface GuildConfig {
  id: string;
  guild_name: string;
  supabase_url: string;
  supabase_anon_key: string;
  supabase_login_email: string | null;
  supabase_login_password: string | null;
  channel_firstblood: string | null;
  channel_scoreboard: string | null;
  channel_announcements: string | null;
  channel_ticket_category: string | null;
  channel_ticket_logs: string | null;
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
  // Dynamic Events list from Supabase
  const [events, setEvents] = useState<EventItem[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);

  // Dynamic Channels list from Discord API
  const [discordChannels, setDiscordChannels] = useState<{ id: string; name: string; type: number; parentId: string | null }[]>([]);
  const [botConnected, setBotConnected] = useState(false);
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
  const [enableFirstBlood, setEnableFirstBlood] = useState(true);
  const [enableScoreboard, setEnableScoreboard] = useState(true);
  const [enableTickets, setEnableTickets] = useState(true);
  const [enableRealtime, setEnableRealtime] = useState(true);
  const [activeEventId, setActiveEventId] = useState('');
  const [isActive, setIsActive] = useState(true);

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
        setEnableFirstBlood(data.enable_firstblood === 1);
        setEnableScoreboard(data.enable_scoreboard === 1);
        setEnableTickets(data.enable_tickets === 1);
        setEnableRealtime(data.enable_realtime === 1);
        setActiveEventId(data.active_event_id || '');
        setIsActive(data.is_active === 1);

        // Fetch events list from Supabase
        fetchEventsList(data.supabase_url, data.supabase_anon_key);
        // Fetch channels list from Discord API
        fetchDiscordChannels();
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
          channel_firstblood: chanFirstBlood || null,
          channel_scoreboard: chanScoreboard || null,
          channel_announcements: chanAnnouncements || null,
          channel_ticket_category: chanTicketCategory || null,
          channel_ticket_logs: chanTicketLogs || null,
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
        </div>

        {/* Section 2: Active CTF Event selector */}
        <div className="glass-panel" style={{ padding: '32px', marginBottom: '32px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '24px', color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Database size={18} /> Active CTF Event
          </h2>
          <p style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '16px' }}>
            Select the specific CTF event from the database that this Discord Server will track and pull challenges from.
          </p>

          <div className="form-group">
            <label>Select Active Event ID</label>
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
        </div>

        {/* Section 3: Channel Configurations */}
        <div className="glass-panel" style={{ padding: '32px', marginBottom: '32px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '24px', color: '#38bdf8' }}>Discord Channels Settings</h2>

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
            </div>
          </div>

          <div className="form-row">
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
            </div>
            <div className="form-group">
              <label>Support Ticket Logs Channel ID</label>
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
          </div>

          <div className="form-group">
            <label>Support Ticket Parent Category ID</label>
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
                <span style={{ fontWeight: 600 }}>Enable Scoreboards updates</span>
                <p style={{ color: '#94a3b8', fontSize: '13px' }}>Allow users to execute /scoreboard inside the server.</p>
              </div>
              <input 
                type="checkbox" 
                checked={enableScoreboard} 
                onChange={(e) => setEnableScoreboard(e.target.checked)} 
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
