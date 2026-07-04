'use client';

import React, { useState, useEffect } from 'react';
import { Ticket, Search, Filter, Lock, HelpCircle, User, RefreshCw, Server, AlertCircle } from 'lucide-react';

interface TicketData {
  id: number;
  guild_id: string;
  guild_name: string;
  channel_id: string;
  user_id: string;
  username: string | null;
  subject: string;
  status: 'open' | 'in_progress' | 'closed';
  assigned_to: string | null;
  closed_by: string | null;
  closed_at: string | null;
  created_at: string;
}

interface GuildItem {
  id: string;
  guild_name: string;
}

export default function TicketsPage() {
  const [tickets, setTickets] = useState<TicketData[]>([]);
  const [guilds, setGuilds] = useState<GuildItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState('');
  const [guildFilter, setGuildFilter] = useState('');

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
    }
  }, [statusFilter, guildFilter]);

  const handleUpdateStatus = async (ticketId: number, newStatus: string) => {
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

  const handleAssignTicket = async (ticketId: number, staffName: string) => {
    setActionLoading(ticketId);
    try {
      const res = await fetch(`/api/tickets/${ticketId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assigned_to: staffName }),
      });
      if (res.ok) {
        setTickets(tickets.map(t => t.id === ticketId ? { ...t, assigned_to: staffName, status: 'in_progress' } : t));
      }
    } catch (err) {
      console.error('Error assigning ticket:', err);
    } finally {
      setActionLoading(null);
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
    <div className="animate-fade-in">
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: 800 }}>Support Tickets</h1>
        <p style={{ color: '#94a3b8' }}>Monitor and assign help channels created by CTF participants</p>
      </div>

      {/* Filter Bar */}
      <div className="glass-panel" style={{ padding: '20px', marginBottom: '32px', display: 'flex', flexWrap: 'wrap', gap: '20px', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#38bdf8' }}>
          <Filter size={18} />
          <span style={{ fontSize: '15px', fontWeight: 600 }}>Filters:</span>
        </div>

        <div className="form-group" style={{ marginBottom: 0, minWidth: '200px' }}>
          <select 
            className="glass-input glass-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ padding: '8px 16px' }}
          >
            <option value="">All Statuses</option>
            <option value="open">🟢 Open</option>
            <option value="in_progress">🟡 In Progress</option>
            <option value="closed">🔴 Closed</option>
          </select>
        </div>

        <div className="form-group" style={{ marginBottom: 0, minWidth: '240px' }}>
          <select 
            className="glass-input glass-select"
            value={guildFilter}
            onChange={(e) => setGuildFilter(e.target.value)}
            style={{ padding: '8px 16px' }}
          >
            <option value="">All Servers</option>
            {guilds.map((g) => (
              <option key={g.id} value={g.id}>{g.guild_name}</option>
            ))}
          </select>
        </div>

        <button 
          onClick={() => { setStatusFilter(''); setGuildFilter(''); }}
          className="btn btn-secondary"
          style={{ padding: '8px 16px', fontSize: '14px', marginLeft: 'auto' }}
        >
          Reset Filters
        </button>
      </div>

      {/* Ticket List */}
      {tickets.length === 0 ? (
        <div className="glass-panel" style={{ padding: '60px', textAlign: 'center', color: '#94a3b8' }}>
          <HelpCircle size={48} style={{ marginBottom: '16px', opacity: 0.5, color: '#a855f7' }} />
          <h2 style={{ fontSize: '20px', color: '#f8fafc', marginBottom: '8px' }}>No Tickets Found</h2>
          <p>Support requests opened on Discord servers will list here in real time.</p>
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
                <th>Assignee</th>
                <th>Created At</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {tickets.map((t) => (
                <tr key={t.id}>
                  <td style={{ fontWeight: 700, color: '#38bdf8', fontFamily: 'var(--font-mono)' }}>
                    #{String(t.id).padStart(4, '0')}
                  </td>
                  <td>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}>
                      <Server size={14} style={{ color: '#94a3b8' }} />
                      {t.guild_name}
                    </span>
                  </td>
                  <td>
                    <span style={{ color: '#cbd5e1' }}>@{t.username || 'unknown'}</span>
                    <div style={{ fontSize: '11px', color: '#64748b', fontFamily: 'var(--font-mono)' }}>ID: {t.user_id}</div>
                  </td>
                  <td style={{ color: '#f8fafc', fontWeight: 500, maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
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
                  <td>
                    {t.status !== 'closed' ? (
                      <input 
                        type="text" 
                        className="glass-input" 
                        placeholder="Staff Name"
                        value={t.assigned_to || ''}
                        onChange={(e) => handleAssignTicket(t.id, e.target.value)}
                        style={{ padding: '6px 12px', fontSize: '13px', maxWidth: '140px' }}
                        disabled={actionLoading === t.id}
                      />
                    ) : (
                      <span style={{ color: '#64748b', fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <Lock size={12} /> Closed by @{t.closed_by || 'system'}
                      </span>
                    )}
                  </td>
                  <td style={{ color: '#94a3b8', fontSize: '13px' }}>
                    {new Date(t.created_at).toLocaleDateString()}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      {t.status !== 'closed' ? (
                        <button 
                          onClick={() => handleUpdateStatus(t.id, 'closed')}
                          className="btn btn-secondary"
                          style={{ padding: '6px 12px', fontSize: '13px', color: '#f43f5e', border: '1px solid rgba(244, 63, 94, 0.2)' }}
                          disabled={actionLoading === t.id}
                        >
                          Close Ticket
                        </button>
                      ) : (
                        <span style={{ color: '#64748b', fontSize: '13px' }}>Closed</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
