'use client';

import React, { useState, useEffect } from 'react';
import { Server, Plus, RefreshCw, AlertTriangle, Check, Database, Ticket } from 'lucide-react';
import Link from 'next/link';
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

  const [guildId, setGuildId] = useState('');
  const [guildName, setGuildName] = useState('');
  const [connections, setConnections] = useState<Connection[]>([]);
  const [supabaseConnectionId, setSupabaseConnectionId] = useState('');

  const [discordGuilds, setDiscordGuilds] = useState<{ id: string; name: string }[]>([]);
  const [isManualGuild, setIsManualGuild] = useState(false);
  const [guildsLoading, setGuildsLoading] = useState(false);

  const fetchServers = async () => {
    try {
      const res = await fetch('/api/servers');
      setServers(await res.json());
    } catch (err) {
      console.error('Error fetching servers:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchConnections = async () => {
    try {
      const res = await fetch('/api/databases');
      if (res.ok) setConnections(await res.json());
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
        setIsManualGuild(data.length === 0);
      } else {
        setIsManualGuild(true);
      }
    } catch (err) {
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
    if (!guildId || !guildName) { setError('Please fill in all required fields.'); return; }
    setBtnLoading(true);
    try {
      const res = await fetch('/api/servers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: guildId,
          guild_name: guildName,
          supabase_connection_id: supabaseConnectionId || null,
          enable_firstblood: true, enable_scoreboard: true, enable_tickets: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add server.');
      setSuccess('Server registered successfully!');
      setGuildId(''); setGuildName(''); setShowAddForm(false);
      fetchServers();
    } catch (err: any) {
      setError(err.message || 'Registration failed.');
    } finally {
      setBtnLoading(false);
    }
  };

  return (
    <div className="page-container">
      <div className="page-container-content space-y-5">
        <div className="flex items-center justify-between">
          <h1 className="text-base font-bold text-slate-100">Servers</h1>
          <Button
            onClick={() => { setShowAddForm(!showAddForm); setError(''); setSuccess(''); }}
            variant={showAddForm ? 'secondary' : 'primary'}
            className="gap-2"
          >
            <Plus size={18} />
            {showAddForm ? 'Cancel' : 'Add Server'}
          </Button>
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

        {showAddForm && (
          <div className="bg-bg-card rounded-xl p-5 animate-fade-in">
            <h2 className="text-sm font-bold text-primary mb-5">Register New Server</h2>
            <form onSubmit={handleAddServer} className="space-y-5">
              {discordGuilds.length > 0 && !isManualGuild ? (
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Select Discord Server</label>
                  <select
                    className="w-full px-4 py-2.5 bg-slate-950/60 border border-border-color rounded-lg text-slate-200 text-sm outline-none cursor-pointer focus:border-border-hover transition-colors"
                    value={guildId}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === 'manual') { setIsManualGuild(true); setGuildId(''); setGuildName(''); }
                      else { setGuildId(val); const found = discordGuilds.find(g => g.id === val); if (found) setGuildName(found.name); }
                    }}
                    required
                  >
                    <option value="">-- Select Server --</option>
                    {discordGuilds.filter(g => !servers.some(s => s.id === g.id)).map((g) => (
                      <option key={g.id} value={g.id}>{g.name} ({g.id})</option>
                    ))}
                    <option value="manual">➕ Enter Manually...</option>
                  </select>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Guild ID (Required)</label>
                      <GlassInput type="text" placeholder="e.g. 112233445566778899" value={guildId} onChange={(e) => setGuildId(e.target.value)} required />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Server Name (Required)</label>
                      <GlassInput type="text" placeholder="e.g. My Awesome CTF" value={guildName} onChange={(e) => setGuildName(e.target.value)} required />
                    </div>
                  </div>
                  {discordGuilds.length > 0 && (
                    <button type="button" onClick={() => { setIsManualGuild(false); setGuildId(''); setGuildName(''); }}
                      className="text-xs text-primary font-semibold hover:underline bg-transparent border-none cursor-pointer">
                      ← Select from Bot Guilds
                    </button>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Link Supabase Connection (Optional)</label>
                <select
                  className="w-full px-4 py-2.5 bg-slate-950/60 border border-border-color rounded-lg text-slate-200 text-sm outline-none cursor-pointer focus:border-border-hover transition-colors"
                  value={supabaseConnectionId}
                  onChange={(e) => setSupabaseConnectionId(e.target.value)}
                >
                  <option value="">-- None / Link Later --</option>
                  {connections.map((c) => (
                    <option key={c.id} value={c.id}>{c.name} ({c.supabase_url})</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3 justify-end pt-4 border-t border-border-color/60">
                <Button type="button" variant="ghost" onClick={() => setShowAddForm(false)} disabled={btnLoading}>Cancel</Button>
                <Button type="submit" variant="primary" loading={btnLoading} disabled={btnLoading}>Register Guild</Button>
              </div>
            </form>
          </div>
        )}

        {loading ? (
          <div className="bg-bg-card rounded-xl py-16 text-center text-slate-400">
            <RefreshCw className="animate-spin h-8 w-8 mx-auto mb-4" />
            <p className="text-sm">Loading servers...</p>
          </div>
        ) : servers.length === 0 ? (
          <div className="bg-bg-card rounded-xl py-16 text-center text-slate-400 flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center">
              <Server size={28} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100 mb-1">No Servers</h2>
              <p className="text-sm">Register a Discord server to get started.</p>
            </div>
            <Button onClick={() => setShowAddForm(true)} size="sm">Register Server</Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {servers.map((server) => {
              const conn = connections.find(c => c.id === server.supabase_connection_id);
              return (
                <Link key={server.id} href={`/dashboard/servers/${server.id}`}
                  className="bg-bg-card rounded-xl p-5 block cursor-pointer transition-all hover:bg-slate-800/30 duration-200">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                        <Server size={18} />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-sm font-bold text-slate-100 truncate">{server.guild_name}</h3>
                        <span className="text-[10px] text-slate-500 font-mono">ID: {server.id}</span>
                      </div>
                    </div>
                    <span className={`shrink-0 inline-flex px-1.5 py-0.5 rounded text-[10px] font-bold ${
                      server.is_active
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                    }`}>
                      {server.is_active ? 'Active' : 'Off'}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded font-semibold ${
                      conn ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' : 'bg-slate-800/40 text-slate-500 border border-border-color'
                    }`}>
                      <Database size={11} /> {conn ? conn.name : 'No DB'}
                    </span>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded font-semibold ${
                      server.enable_tickets === 1 ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' : 'bg-slate-800/40 text-slate-500 border border-border-color'
                    }`}>
                      <Ticket size={11} /> {server.enable_tickets === 1 ? 'Tickets On' : 'Tickets Off'}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
