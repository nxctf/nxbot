'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { Ticket, Filter, Server, User, Lock, RefreshCw, ChevronRight, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import PageContainer from '@/components/PageContainer';
import Button from '@/components/Button';

interface TicketData {
  id: number;
  guild_id: string;
  guild_name: string;
  channel_id: string;
  user_id: string;
  username: string;
  user_avatar: string | null;
  subject: string;
  status: 'open' | 'in_progress' | 'closed';
  assigned_to: string | null;
  assigned_to_username: string | null;
  assigned_to_avatar: string | null;
  closed_by: string | null;
  closed_by_username: string | null;
  closed_by_avatar: string | null;
  closed_at: string | null;
  created_at: string;
  updated_at: string;
}

interface GuildItem {
  id: string;
  guild_name: string;
}

function TicketsContent() {
  const router = useRouter();

  const [tickets, setTickets] = useState<TicketData[]>([]);
  const [guilds, setGuilds] = useState<GuildItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState('');
  const [guildFilter, setGuildFilter] = useState('');
  const [confirmCloseId, setConfirmCloseId] = useState<number | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [confirmResetAll, setConfirmResetAll] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSuccess, setResetSuccess] = useState('');

  const fetchTickets = async () => {
    try {
      const url = new URL('/api/tickets', window.location.origin);
      if (statusFilter) url.searchParams.append('status', statusFilter);
      if (guildFilter) url.searchParams.append('guildId', guildFilter);

      const res = await fetch(url.toString());
      const data = await res.json();
      setTickets(data);
    } catch (err) {
      console.error('Error fetching tickets:', err);
    }
  };

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const guildsRes = await fetch('/api/servers');
      const guildsData = await guildsRes.json();
      setGuilds(guildsData);
      
      const ticketsRes = await fetch('/api/tickets');
      const ticketsData = await ticketsRes.json();
      setTickets(ticketsData);
    } catch (err) {
      console.error('Error fetching tickets initial data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (!loading) {
      fetchTickets();
      setResetSuccess('');
    }
  }, [statusFilter, guildFilter]);

  const handleUpdateStatus = async (e: React.MouseEvent, ticketId: number, newStatus: string) => {
    e.stopPropagation(); // Avoid opening page
    setActionLoading(ticketId);
    try {
      const res = await fetch(`/api/tickets/${ticketId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setTickets(tickets.map(t => t.id === ticketId ? { ...t, status: newStatus as any } : t));
      }
    } catch (err) {
      console.error('Error updating ticket status:', err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (e: React.MouseEvent, ticketId: number) => {
    e.stopPropagation();
    setActionLoading(ticketId);
    try {
      const res = await fetch(`/api/tickets/${ticketId}`, { method: 'DELETE' });
      if (res.ok) {
        setTickets(tickets.filter(t => t.id !== ticketId));
      }
    } catch (err) {
      console.error('Error deleting ticket:', err);
    } finally {
      setActionLoading(null);
      setConfirmDeleteId(null);
    }
  };

  const handleResetAll = async () => {
    if (!guildFilter) return;
    setResetLoading(true);
    setResetSuccess('');
    try {
      const res = await fetch(`/api/tickets/batch?guildId=${encodeURIComponent(guildFilter)}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok) {
        setTickets([]);
        setResetSuccess(data.message || 'All tickets deleted successfully.');
        setConfirmResetAll(false);
      }
    } catch (err) {
      console.error('Error resetting tickets:', err);
    } finally {
      setResetLoading(false);
    }
  };

  const handleRowClick = (ticket: TicketData) => {
    router.push(`/dashboard/tickets/${ticket.id}`);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[80vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-primary" />
      </div>
    );
  }

  return (
    <PageContainer
      title="Support Tickets"
      subtitle="Monitor and view chat transcripts for ticket channels created by CTF participants"
    >
      {/* Filter Bar */}
      <div className="glass-panel p-5 mb-8 flex flex-wrap gap-5 items-center">
        <div className="flex items-center gap-2 text-primary">
          <Filter size={18} />
          <span className="text-sm font-semibold">Filters:</span>
        </div>

        <div className="form-group mb-0 min-w-[200px]">
          <select 
            className="w-full px-4 py-2 bg-slate-950/60 border border-border-color rounded-lg text-slate-200 text-sm outline-none cursor-pointer"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="open">🟢 Open</option>
            <option value="in_progress">🟡 In Progress</option>
            <option value="closed">🔴 Closed</option>
          </select>
        </div>

        <div className="form-group mb-0 min-w-[240px]">
          <select 
            className="w-full px-4 py-2 bg-slate-950/60 border border-border-color rounded-lg text-slate-200 text-sm outline-none cursor-pointer"
            value={guildFilter}
            onChange={(e) => setGuildFilter(e.target.value)}
          >
            <option value="">All Servers</option>
            {guilds.map((g) => (
              <option key={g.id} value={g.id}>{g.guild_name}</option>
            ))}
          </select>
        </div>

        {guildFilter && (
          confirmResetAll ? (
            <div className="flex gap-2 items-center ml-auto">
              <span className="text-[10px] text-accent-red font-bold mr-1">Delete ALL tickets for this server?</span>
              <Button
                variant="danger"
                size="sm"
                onClick={handleResetAll}
                className="py-1 px-2.5 text-xs font-semibold"
                disabled={resetLoading}
              >
                {resetLoading ? 'Deleting...' : 'Yes, Reset All'}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setConfirmResetAll(false)}
                className="py-1 px-2.5 text-xs font-semibold"
              >
                Cancel
              </Button>
            </div>
          ) : (
            <Button
              variant="danger"
              size="sm"
              onClick={() => setConfirmResetAll(true)}
            >
              <Trash2 size={14} className="mr-1.5" />
              Reset All Tickets
            </Button>
          )
        )}
        <Button
          variant="secondary"
          size="sm"
          onClick={() => { setStatusFilter(''); setGuildFilter(''); }}
          className="ml-auto"
        >
          Reset Filters
        </Button>
      </div>
      {resetSuccess && (
        <div className="mb-6 px-5 py-3 rounded-lg bg-green-500/10 border border-green-500/30 text-green-400 text-sm">
          {resetSuccess}
        </div>
      )}

      {/* Ticket List */}
      {tickets.length === 0 ? (
        <div className="glass-panel py-16 px-6 text-center text-slate-400 flex flex-col items-center justify-center">
          <div className="flex items-center justify-center w-16 h-16 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 mb-6 shadow-[0_0_15px_rgba(168,85,247,0.15)]">
            <Ticket size={28} />
          </div>
          <h2 className="text-lg text-slate-100 mb-2 font-bold">No Tickets Found</h2>
          <p className="text-sm max-w-md mx-auto leading-relaxed">
            Support requests opened on Discord servers will list here in real time.
          </p>
        </div>
      ) : (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Ticket ID</th>
                <th>Server</th>
                <th>Opened By</th>
                <th>Subject</th>
                <th>Status</th>
                <th>Created At</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {tickets.map((t) => (
                <tr 
                  key={t.id} 
                  onClick={() => handleRowClick(t)} 
                  className="cursor-pointer hover:bg-slate-800/10 transition-colors"
                >
                  <td className="font-bold text-primary font-mono">
                    #{String(t.id).padStart(4, '0')}
                  </td>
                  <td>
                    <span className="inline-flex items-center gap-1.5 font-semibold text-slate-200">
                      <Server size={14} className="text-slate-400" />
                      {t.guild_name}
                    </span>
                  </td>
                  <td>
                    <div className="flex items-center gap-2">
                      {t.user_avatar ? (
                        <img 
                          src={t.user_avatar} 
                          alt="" 
                          className="w-6 h-6 rounded-full object-cover border border-white/5" 
                        />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                          <User size={12} />
                        </div>
                      )}
                      <div>
                        <span className="text-slate-200 font-semibold block text-sm">@{t.username || 'unknown'}</span>
                        <div className="text-[10px] text-slate-500 font-mono">ID: {t.user_id}</div>
                      </div>
                    </div>
                  </td>
                  <td className="text-slate-100 font-medium max-w-[240px] truncate">
                    {t.subject}
                  </td>
                  <td>
                    <span className={`badge ${
                      t.status === 'open' ? 'badge-success' : 
                      t.status === 'in_progress' ? 'badge-warning' : 'badge-danger'
                    }`}>
                      {t.status === 'open' ? 'Open' : t.status === 'in_progress' ? 'In Progress' : 'Closed'}
                    </span>
                  </td>
                  <td className="text-slate-400 text-xs">
                    {new Date(t.created_at).toLocaleDateString()}
                  </td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <div className="flex gap-2 items-center">
                      {t.status !== 'closed' ? (
                        confirmCloseId === t.id ? (
                          <div className="flex gap-1.5 items-center">
                            <span className="text-[10px] text-accent-red font-bold mr-1">Sure?</span>
                            <Button
                              variant="danger"
                              size="sm"
                              onClick={(e) => {
                                handleUpdateStatus(e, t.id, 'closed');
                                setConfirmCloseId(null);
                              }}
                              className="py-1 px-2.5 text-xs font-semibold"
                              disabled={actionLoading === t.id}
                            >
                              Yes
                            </Button>
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => setConfirmCloseId(null)}
                              className="py-1 px-2.5 text-xs font-semibold"
                            >
                              No
                            </Button>
                          </div>
                        ) : (
                          <Button 
                            variant="secondary"
                            size="sm"
                            onClick={() => setConfirmCloseId(t.id)}
                            className="py-1 px-2.5 text-xs text-accent-red border-accent-red/20 hover:bg-accent-red/10"
                            disabled={actionLoading === t.id}
                          >
                            Close
                          </Button>
                        )
                      ) : (
                        <span className="text-slate-400 text-xs inline-flex items-center gap-1.5">
                          <Lock size={12} className="text-accent-red" />
                          {t.closed_by_avatar && (
                            <img 
                              src={t.closed_by_avatar} 
                              alt="" 
                              className="w-4 h-4 rounded-full object-cover" 
                            />
                          )}
                          <span className="font-medium">Closed by @{t.closed_by_username || t.closed_by || 'system'}</span>
                        </span>
                      )}

                      <div className="w-px h-5 bg-white/5 mx-1" />

                      {confirmDeleteId === t.id ? (
                        <div className="flex gap-1.5 items-center">
                          <span className="text-[10px] text-accent-red font-bold">Delete?</span>
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={(e) => handleDelete(e, t.id)}
                            className="py-1 px-2 text-xs font-semibold"
                            disabled={actionLoading === t.id}
                          >
                            {actionLoading === t.id ? '...' : 'Yes'}
                          </Button>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => setConfirmDeleteId(null)}
                            className="py-1 px-2 text-xs font-semibold"
                          >
                            No
                          </Button>
                        </div>
                      ) : (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => setConfirmDeleteId(t.id)}
                          className="py-1 px-2 text-xs text-accent-red/70 border-accent-red/10 hover:bg-accent-red/10 hover:text-accent-red"
                        >
                          <Trash2 size={12} />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </PageContainer>
  );
}

export default function TicketsPage() {
  return (
    <Suspense fallback={
      <div className="flex justify-center items-center h-[80vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-primary" />
      </div>
    }>
      <TicketsContent />
    </Suspense>
  );
}
