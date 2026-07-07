'use client';

import React, { useState, useEffect } from 'react';
import { Server, Plus, RefreshCw, AlertTriangle, Check } from 'lucide-react';
import Link from 'next/link';
import PageContainer from '@/components/PageContainer';
import Button from '@/components/Button';
import GlassInput from '@/components/GlassInput';

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

interface Connection {
  id: string;
  name: string;
  supabase_url: string;
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
  const [connections, setConnections] = useState<Connection[]>([]);
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
      setGuildId('');
      setGuildName('');
      setShowAddForm(false);
      fetchServers();
    } catch (err: any) {
      setError(err.message || 'Registration failed.');
    } finally {
      setBtnLoading(false);
    }
  };

  return (
    <PageContainer
      title="CTF Servers"
      subtitle="Connect and manage multiple Discord servers"
      extra={
        <Button
          onClick={() => { setShowAddForm(!showAddForm); setError(''); setSuccess(''); }}
          variant={showAddForm ? 'secondary' : 'primary'}
          className="gap-2"
        >
          <Plus size={18} />
          {showAddForm ? 'Cancel' : 'Add Server'}
        </Button>
      }
    >
      {/* Error notification */}
      {error && (
        <div className="alert bg-accent-red/10 border border-accent-red/20 text-accent-red p-4 rounded-xl mb-6 flex items-center gap-3">
          <AlertTriangle size={18} className="shrink-0" />
          <span className="text-sm font-medium">{error}</span>
        </div>
      )}

      {/* Success notification */}
      {success && (
        <div className="alert bg-accent-green/10 border border-accent-green/20 text-accent-green p-4 rounded-xl mb-6 flex items-center gap-3">
          <Check size={18} className="shrink-0" />
          <span className="text-sm font-medium">{success}</span>
        </div>
      )}

      {/* Add Server Form */}
      {showAddForm && (
        <div className="glass-panel p-8 mb-8 animate-fade-in">
          <h2 className="text-lg font-bold text-primary mb-6">Register New Server</h2>
          <form onSubmit={handleAddServer} className="space-y-6">
            {discordGuilds.length > 0 && !isManualGuild ? (
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Select Discord Server (Bot is joined to these)
                </label>
                <select
                  className="w-full px-4 py-2.5 bg-slate-950/60 border border-border-color rounded-lg text-slate-200 text-sm outline-none cursor-pointer focus:border-border-hover transition-colors"
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
                      Discord Guild ID (Required)
                    </label>
                    <GlassInput
                      type="text"
                      placeholder="e.g. 112233445566778899"
                      value={guildId}
                      onChange={(e) => setGuildId(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
                      Guild/Server Name (Required)
                    </label>
                    <GlassInput
                      type="text"
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

            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
                Link Supabase Connection (Optional)
              </label>
              <select
                className="w-full px-4 py-2.5 bg-slate-950/60 border border-border-color rounded-lg text-slate-200 text-sm outline-none cursor-pointer focus:border-border-hover transition-colors"
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

            <div className="flex gap-3 justify-end pt-4 border-t border-border-color/60">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setShowAddForm(false)}
                disabled={btnLoading}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                variant="primary"
                loading={btnLoading}
                disabled={btnLoading || connections.length === 0}
              >
                Register Guild
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Connected Servers List */}
      {loading ? (
        <div className="glass-panel p-16 text-center text-slate-400">
          <RefreshCw className="animate-spin h-8 w-8 mx-auto mb-4 border-t-2 border-primary rounded-full" />
          <p>Loading server details...</p>
        </div>
      ) : servers.length === 0 ? (
        <div className="glass-panel py-16 px-6 text-center text-slate-400 flex flex-col items-center justify-center">
          <div className="flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 border border-primary/20 text-primary mb-6 shadow-[0_0_20px_rgba(56,189,248,0.15)]">
            <Server size={36} />
          </div>
          <h2 className="text-xl text-slate-100 mb-2 font-bold">No Connected Discord Servers</h2>
          <p className="text-sm max-w-md mx-auto mb-6 leading-relaxed">
            Get started by registering a server. You will need your Discord Server ID and your NXCTF database project details.
          </p>
          <Button onClick={() => setShowAddForm(true)}>
            Register First Server
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {servers.map((server) => {
            // Find connection details
            const conn = connections.find(c => c.id === server.supabase_connection_id);
            const isSupabaseEnabled = server.enable_firstblood === 1 || server.enable_scoreboard === 1;

            return (
              <Link 
                key={server.id} 
                href={`/dashboard/servers/${server.id}`} 
                className="glass-panel glass-card block cursor-pointer transition-all hover:border-primary hover:shadow-primary/5 hover:translate-y-[-2px] duration-200"
              >
                {/* Card Header */}
                <div className="flex justify-between items-start mb-5">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-lg bg-primary/10 border border-primary/20 text-primary shrink-0">
                      <Server size={20} />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-base font-bold text-slate-100 truncate">{server.guild_name}</h3>
                      <span className="text-[10px] text-slate-400 font-mono">ID: {server.id}</span>
                    </div>
                  </div>
                  <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold ${
                    server.is_active 
                      ? 'bg-accent-green/10 text-accent-green border border-accent-green/20' 
                      : 'bg-accent-yellow/10 text-accent-yellow border border-accent-yellow/20'
                  }`}>
                    {server.is_active ? 'Active' : 'Disabled'}
                  </span>
                </div>

                {/* Card Info List */}
                <div className="text-xs border-t border-b border-border-color/60 py-4 my-4 space-y-3 font-medium">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Supabase Connection:</span>
                    <span className="text-slate-200 font-bold truncate max-w-[160px]" title={conn?.name || 'None'}>
                      {conn ? conn.name : 'Not Connected'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Supabase Integration:</span>
                    <span className={`font-semibold ${isSupabaseEnabled ? 'text-accent-green' : 'text-accent-red'}`}>
                      {isSupabaseEnabled ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Ticketing System:</span>
                    <span className={`font-semibold ${server.enable_tickets === 1 ? 'text-accent-green' : 'text-accent-red'}`}>
                      {server.enable_tickets === 1 ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                </div>

                {/* Hint Footer */}
                <div className="text-[11px] text-slate-500 text-right font-semibold">
                  Click card to configure →
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </PageContainer>
  );
}
