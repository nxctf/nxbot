'use client';

import React, { useState, useEffect } from 'react';
import { Server, Plus, Trash2, Edit, Check, AlertTriangle, ShieldCheck, HelpCircle, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import Script from 'next/script';

interface Guild {
  id: string;
  guild_name: string;
  supabase_connection_id: string | null;
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
  const [connections, setConnections] = useState<any[]>([]);
  const [supabaseConnectionId, setSupabaseConnectionId] = useState('');

  // Discord guilds available to the bot
  const [discordGuilds, setDiscordGuilds] = useState<{ id: string; name: string }[]>([]);
  const [isManualGuild, setIsManualGuild] = useState(false);
  const [guildsLoading, setGuildsLoading] = useState(false);

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

  const fetchConnections = async () => {
    try {
      const res = await fetch('/api/databases');
      if (res.ok) {
        const data = await res.json();
        setConnections(data);
      }
    } catch (err) {
      console.error('Error fetching connections:', err);
    }
  };

  const fetchDiscordGuilds = async () => {
    setGuildsLoading(true);
    try {
      const res = await fetch('/api/servers/discord-guilds');
      if (res.ok) {
        const data = await res.json();
        setDiscordGuilds(data);
        if (data.length > 0) {
          setIsManualGuild(false);
        } else {
          setIsManualGuild(true);
        }
      } else {
        setIsManualGuild(true);
      }
    } catch (err) {
      console.error('Error fetching Discord guilds:', err);
      setIsManualGuild(true);
    } finally {
      setGuildsLoading(false);
    }
  };

  useEffect(() => {
    fetchServers();
    fetchConnections();
    fetchDiscordGuilds();
  }, []);

  const handleAddServer = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!guildId || !guildName) {
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
          supabase_connection_id: supabaseConnectionId || null,
          enable_firstblood: true,
          enable_scoreboard: true,
          enable_tickets: true,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to add server.');
      }

      setSuccess('Server registered successfully!');
      // Reset form
      setGuildId('');
      setGuildName('');
      setShowAddForm(false);
      
      // Reload
      fetchServers();
    } catch (err: any) {
      setError(err.message || 'Registration failed.');
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
            {/* Bot Guild List Selector or Manual Entry */}
            {discordGuilds.length > 0 && !isManualGuild ? (
              <div className="form-group" style={{ marginBottom: '20px' }}>
                <label>Select Discord Server (Bot is joined to these)</label>
                <select
                  className="glass-input glass-select"
                  value={guildId}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === 'manual') {
                      setIsManualGuild(true);
                      setGuildId('');
                      setGuildName('');
                    } else {
                      setGuildId(val);
                      const found = discordGuilds.find(g => g.id === val);
                      if (found) {
                        setGuildName(found.name);
                      }
                    }
                  }}
                  required
                >
                  <option value="">-- Select Server --</option>
                  {discordGuilds
                    .filter(g => !servers.some(s => s.id === g.id))
                    .map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name} ({g.id})
                      </option>
                    ))}
                  <option value="manual">➕ Enter Guild ID Manually...</option>
                </select>
              </div>
            ) : (
              <div className="space-y-4">
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
                {discordGuilds.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsManualGuild(false);
                      setGuildId('');
                      setGuildName('');
                    }}
                    className="text-xs text-primary font-semibold hover:underline bg-transparent border-none cursor-pointer"
                  >
                    ← Select from Bot Guilds list instead
                  </button>
                )}
              </div>
            )}

            <div className="form-group" style={{ marginBottom: '24px' }}>
              <label>Link Supabase Connection (Optional)</label>
              <select
                className="glass-input glass-select"
                value={supabaseConnectionId}
                onChange={(e) => setSupabaseConnectionId(e.target.value)}
              >
                <option value="">-- None / Link Later --</option>
                {connections.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.supabase_url})
                  </option>
                ))}
              </select>
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
              <button 
                type="submit" 
                className="btn btn-primary" 
                disabled={btnLoading || connections.length === 0}
              >
                {btnLoading ? 'Registering...' : 'Register Guild'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Connected Servers List */}
      {loading ? (
        <div className="glass-panel" style={{ padding: '60px', textAlign: 'center', color: '#94a3b8' }}>
          <RefreshCw className="animate-spin" size={32} style={{ margin: '0 auto 16px' }} />
          <p>Loading server details...</p>
        </div>
      ) : servers.length === 0 ? (
        <div className="glass-panel" style={{ padding: '60px', textAlign: 'center', color: '#94a3b8' }}>
          <div style={{ marginBottom: '16px' }}>
            <HelpCircle size={48} style={{ opacity: 0.4, color: '#64748b' }} />
          </div>
          <h2 style={{ fontSize: '20px', color: '#f8fafc', marginBottom: '8px' }}>No Connected Discord Servers</h2>
          <p style={{ fontSize: '14px', maxWidth: '460px', margin: '0 auto 24px' }}>
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
