'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { Ticket, Server, User, Lock, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Button from '@/components/Button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/Table';
import { FilterToolbar, FilterSelect } from '@/components/Filter';

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

const STATUS_OPTIONS = [
  { value: 'open', label: '🟢 Open' },
  { value: 'in_progress', label: '🟡 In Progress' },
  { value: 'closed', label: '🔴 Closed' },
];

function TicketsContent() {
  const router = useRouter();

  const [tickets, setTickets] = useState<TicketData[]>([]);
  const [guilds, setGuilds] = useState<GuildItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);

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
      const [guildsRes, ticketsRes] = await Promise.all([
        fetch('/api/servers'),
        fetch('/api/tickets'),
      ]);
      setGuilds(await guildsRes.json());
      setTickets(await ticketsRes.json());
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
    e.stopPropagation();
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
    <div className="space-y-5">
      <FilterToolbar
        actions={
          <>
            {guildFilter && (
              confirmResetAll ? (
                <div className="flex gap-2 items-center">
                  <span className="text-[10px] text-accent-red font-bold">Delete ALL tickets for this server?</span>
                  <Button variant="danger" size="sm" onClick={handleResetAll} className="py-1 px-2.5 text-xs font-semibold" disabled={resetLoading}>
                    {resetLoading ? 'Deleting...' : 'Yes, Reset All'}
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => setConfirmResetAll(false)} className="py-1 px-2.5 text-xs font-semibold">
                    Cancel
                  </Button>
                </div>
              ) : (
                <Button variant="danger" size="sm" onClick={() => setConfirmResetAll(true)}>
                  <Trash2 size={14} className="mr-1.5" />
                  Reset All Tickets
                </Button>
              )
            )}
            <Button variant="secondary" size="sm" onClick={() => { setStatusFilter(''); setGuildFilter(''); }}>
              Reset Filters
            </Button>
          </>
        }
      >
        <FilterSelect
          placeholder="All Statuses"
          options={STATUS_OPTIONS}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        />
        <FilterSelect
          placeholder="All Servers"
          options={guilds.map((g) => ({ value: g.id, label: g.guild_name }))}
          value={guildFilter}
          onChange={(e) => setGuildFilter(e.target.value)}
        />
      </FilterToolbar>

      {resetSuccess && (
        <div className="px-5 py-3 rounded-lg bg-green-500/10 border border-green-500/30 text-green-400 text-sm">
          {resetSuccess}
        </div>
      )}

      {tickets.length === 0 ? (
        <div className="bg-bg-card border border-border-color rounded-xl py-16 px-6 text-center text-slate-400 flex flex-col items-center justify-center">
          <div className="flex items-center justify-center w-16 h-16 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 mb-6">
            <Ticket size={28} />
          </div>
          <h2 className="text-lg text-slate-100 mb-2 font-bold">No Tickets Found</h2>
          <p className="text-sm max-w-md mx-auto leading-relaxed">
            Support requests opened on Discord servers will list here in real time.
          </p>
        </div>
      ) : (
        <div className="bg-bg-card border border-border-color rounded-xl overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ticket ID</TableHead>
                <TableHead>Server</TableHead>
                <TableHead>Opened By</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created At</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tickets.map((t) => (
                <TableRow
                  key={t.id}
                  onClick={() => handleRowClick(t)}
                  className="cursor-pointer"
                >
                  <TableCell className="font-bold text-primary font-mono">
                    #{String(t.id).padStart(4, '0')}
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center gap-1.5 font-semibold text-slate-200">
                      <Server size={14} className="text-slate-400" />
                      {t.guild_name}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {t.user_avatar ? (
                        <img src={t.user_avatar} alt="" className="w-6 h-6 rounded-full object-cover border border-white/5" />
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
                  </TableCell>
                  <TableCell className="text-slate-100 font-medium max-w-[240px] truncate">
                    {t.subject}
                  </TableCell>
                  <TableCell>
                    <span className={`badge ${
                      t.status === 'open' ? 'badge-success' :
                      t.status === 'in_progress' ? 'badge-warning' : 'badge-danger'
                    }`}>
                      {t.status === 'open' ? 'Open' : t.status === 'in_progress' ? 'In Progress' : 'Closed'}
                    </span>
                  </TableCell>
                  <TableCell className="text-slate-400 text-xs">
                    {new Date(t.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()} className="text-right">
                    <div className="flex gap-2 items-center justify-end">
                      {t.status !== 'closed' ? (
                        confirmCloseId === t.id ? (
                          <div className="flex gap-1.5 items-center">
                            <span className="text-[10px] text-accent-red font-bold">Sure?</span>
                            <Button variant="danger" size="sm" onClick={(e) => { handleUpdateStatus(e, t.id, 'closed'); setConfirmCloseId(null); }}
                              className="py-1 px-2.5 text-xs font-semibold" disabled={actionLoading === t.id}>
                              Yes
                            </Button>
                            <Button variant="secondary" size="sm" onClick={() => setConfirmCloseId(null)}
                              className="py-1 px-2.5 text-xs font-semibold">
                              No
                            </Button>
                          </div>
                        ) : (
                          <Button variant="secondary" size="sm" onClick={() => setConfirmCloseId(t.id)}
                            className="py-1 px-2.5 text-xs text-accent-red border-accent-red/20 hover:bg-accent-red/10"
                            disabled={actionLoading === t.id}>
                            Close
                          </Button>
                        )
                      ) : (
                        <span className="text-slate-400 text-xs inline-flex items-center gap-1.5">
                          <Lock size={12} className="text-accent-red" />
                          {t.closed_by_avatar && (
                            <img src={t.closed_by_avatar} alt="" className="w-4 h-4 rounded-full object-cover" />
                          )}
                          <span className="font-medium">Closed by @{t.closed_by_username || t.closed_by || 'system'}</span>
                        </span>
                      )}

                      <div className="w-px h-5 bg-white/5 mx-1" />

                      {confirmDeleteId === t.id ? (
                        <div className="flex gap-1.5 items-center">
                          <span className="text-[10px] text-accent-red font-bold">Delete?</span>
                          <Button variant="danger" size="sm" onClick={(e) => handleDelete(e, t.id)}
                            className="py-1 px-2 text-xs font-semibold" disabled={actionLoading === t.id}>
                            {actionLoading === t.id ? '...' : 'Yes'}
                          </Button>
                          <Button variant="secondary" size="sm" onClick={() => setConfirmDeleteId(null)}
                            className="py-1 px-2 text-xs font-semibold">
                            No
                          </Button>
                        </div>
                      ) : (
                        <Button variant="secondary" size="sm" onClick={() => setConfirmDeleteId(t.id)}
                          className="py-1 px-2 text-xs text-accent-red/70 border-accent-red/10 hover:bg-accent-red/10 hover:text-accent-red">
                          <Trash2 size={12} />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
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
