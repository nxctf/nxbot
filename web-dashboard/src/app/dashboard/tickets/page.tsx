'use client';

import React, { useState, useEffect } from 'react';
import { Ticket, Search, Filter, Lock, HelpCircle, User, RefreshCw, Server, AlertCircle, MessageSquare, X, ShieldAlert } from 'lucide-react';

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

interface TicketMessage {
  id: number;
  ticket_id: number;
  user_id: string;
  username: string;
  avatar_url: string | null;
  message_content: string;
  created_at: string;
}

export default function TicketsPage() {
  const [tickets, setTickets] = useState<TicketData[]>([]);
  const [guilds, setGuilds] = useState<GuildItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState('');
  const [guildFilter, setGuildFilter] = useState('');

  // Transcripts Drawer
  const [selectedTicket, setSelectedTicket] = useState<TicketData | null>(null);
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [confirmCloseId, setConfirmCloseId] = useState<number | null>(null);

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

  const fetchMessages = async (ticketId: number) => {
    setMessagesLoading(true);
    try {
      const res = await fetch(`/api/tickets/${ticketId}/messages`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data);
      }
    } catch (err) {
      console.error('Error fetching ticket messages:', err);
    } finally {
      setMessagesLoading(false);
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

  const handleUpdateStatus = async (e: React.MouseEvent, ticketId: number, newStatus: string) => {
    e.stopPropagation(); // Avoid opening drawer
    setActionLoading(ticketId);
    try {
      const res = await fetch(`/api/tickets/${ticketId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setTickets(tickets.map(t => t.id === ticketId ? { ...t, status: newStatus as any } : t));
        if (selectedTicket && selectedTicket.id === ticketId) {
          setSelectedTicket({ ...selectedTicket, status: newStatus as any });
        }
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
        if (selectedTicket && selectedTicket.id === ticketId) {
          setSelectedTicket({ ...selectedTicket, assigned_to: staffName, status: 'in_progress' });
        }
      }
    } catch (err) {
      console.error('Error assigning ticket:', err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleRowClick = (ticket: TicketData) => {
    setSelectedTicket(ticket);
    fetchMessages(ticket.id);
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <RefreshCw className="animate-spin" size={32} style={{ color: '#38bdf8' }} />
      </div>
    );
  }

  return (
    <div className="animate-fade-in" style={{ position: 'relative', minHeight: '80vh' }}>
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: 800 }}>Support Tickets</h1>
        <p style={{ color: '#94a3b8' }}>Monitor and view chat transcripts for ticket channels created by CTF participants</p>
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
                <th>Created At</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {tickets.map((t) => (
                <tr 
                  key={t.id} 
                  onClick={() => handleRowClick(t)} 
                  style={{ cursor: 'pointer' }}
                  className={selectedTicket?.id === t.id ? 'active-row' : ''}
                >
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
                  <td style={{ color: '#f8fafc', fontWeight: 500, maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
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
                  <td style={{ color: '#94a3b8', fontSize: '13px' }}>
                    {new Date(t.created_at).toLocaleDateString()}
                  </td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      {t.status !== 'closed' ? (
                        confirmCloseId === t.id ? (
                          <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                            <span style={{ fontSize: '11px', color: '#f43f5e', marginRight: '4px', fontWeight: 600 }}>Sure?</span>
                            <button
                              onClick={(e) => {
                                handleUpdateStatus(e, t.id, 'closed');
                                setConfirmCloseId(null);
                              }}
                              className="btn"
                              style={{ padding: '4px 8px', fontSize: '11px', background: '#f43f5e', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                              disabled={actionLoading === t.id}
                            >
                              Yes
                            </button>
                            <button
                              onClick={() => setConfirmCloseId(null)}
                              className="btn btn-secondary"
                              style={{ padding: '4px 8px', fontSize: '11px', borderRadius: '4px', cursor: 'pointer' }}
                            >
                              No
                            </button>
                          </div>
                        ) : (
                          <button 
                            onClick={() => setConfirmCloseId(t.id)}
                            className="btn btn-secondary"
                            style={{ padding: '6px 12px', fontSize: '13px', color: '#f43f5e', border: '1px solid rgba(244, 63, 94, 0.2)' }}
                            disabled={actionLoading === t.id}
                          >
                            Close
                          </button>
                        )
                      ) : (
                        <span style={{ color: '#64748b', fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <Lock size={12} /> Closed by @{t.closed_by || 'system'}
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Transcript Drawer Overlay */}
      {selectedTicket && (
        <>
          <div 
            onClick={() => setSelectedTicket(null)}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.6)',
              backdropFilter: 'blur(4px)',
              zIndex: 900,
              transition: 'opacity 0.3s ease',
            }}
          />
          <div 
            style={{
              position: 'fixed',
              top: 0,
              right: 0,
              bottom: 0,
              width: '100%',
              maxWidth: '550px',
              backgroundColor: '#0c0f17',
              borderLeft: '1px solid var(--border-color)',
              boxShadow: '-10px 0 40px rgba(0, 0, 0, 0.6)',
              zIndex: 1000,
              display: 'flex',
              flexDirection: 'column',
              animation: 'slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards',
            }}
          >
            {/* Drawer Header */}
            <div style={{ padding: '24px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(22, 28, 45, 0.2)' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <span style={{ fontSize: '20px', fontWeight: 800, color: '#f8fafc' }}>
                    Ticket #{String(selectedTicket.id).padStart(4, '0')}
                  </span>
                  <span className={`badge ${
                    selectedTicket.status === 'open' ? 'badge-success' : 
                    selectedTicket.status === 'in_progress' ? 'badge-warning' : 'badge-danger'
                  }`}>
                    {selectedTicket.status === 'open' ? 'Open' : selectedTicket.status === 'in_progress' ? 'In Progress' : 'Closed'}
                  </span>
                </div>
                <p style={{ color: '#94a3b8', fontSize: '13px', margin: 0 }}>
                  Subject: <span style={{ color: '#38bdf8', fontWeight: 500 }}>{selectedTicket.subject}</span>
                </p>
              </div>
              <button 
                onClick={() => setSelectedTicket(null)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                onMouseEnter={(e) => e.currentTarget.style.color = '#f8fafc'}
                onMouseLeave={(e) => e.currentTarget.style.color = '#94a3b8'}
              >
                <X size={24} />
              </button>
                       {/* Ticket Info Section */}
            <div style={{ padding: '16px 24px', background: 'rgba(13, 17, 28, 0.4)', borderBottom: '1px solid var(--border-color)', display: 'grid', gridTemplateColumns: '1fr 1fr 1.2fr', gap: '12px', fontSize: '13px' }}>
              <div>
                <span style={{ color: '#64748b', display: 'block', marginBottom: '2px' }}>Opened By</span>
                <span style={{ fontWeight: 600, color: '#cbd5e1' }}>@{selectedTicket.username || 'unknown'}</span>
                <span style={{ color: '#64748b', display: 'block', fontSize: '11px' }}>ID: {selectedTicket.user_id}</span>
              </div>
              <div>
                <span style={{ color: '#64748b', display: 'block', marginBottom: '2px' }}>Server / Guild</span>
                <span style={{ fontWeight: 600, color: '#cbd5e1', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <Server size={12} style={{ color: '#94a3b8' }} />
                  {selectedTicket.guild_name}
                </span>
              </div>
              <div>
                <span style={{ color: '#64748b', display: 'block', marginBottom: '2px' }}>Opened Date</span>
                <span style={{ fontWeight: 600, color: '#cbd5e1' }}>
                  {new Date(selectedTicket.created_at).toLocaleString()}
                </span>
              </div>
            </div>

            {/* Transcript Messages Area */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', background: '#080a0f' }}>
              {messagesLoading ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '12px', color: '#94a3b8' }}>
                  <RefreshCw className="animate-spin" size={24} style={{ color: '#38bdf8' }} />
                  <span>Loading ticket transcript...</span>
                </div>
              ) : messages.length === 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '12px', color: '#64748b', textAlign: 'center', padding: '32px' }}>
                  <MessageSquare size={32} style={{ opacity: 0.3 }} />
                  <div>
                    <span style={{ fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: '4px' }}>No messages logged</span>
                    <span style={{ fontSize: '12px' }}>Messages sent inside this ticket channel on Discord will appear here.</span>
                  </div>
                </div>
              ) : (
                messages.map((msg, index) => {
                  const isUser = msg.user_id === selectedTicket.user_id;
                  return (
                    <div 
                      key={msg.id}
                      style={{
                        display: 'flex',
                        gap: '12px',
                        alignItems: 'flex-start',
                        animation: 'fadeIn 0.25s ease forwards',
                        animationDelay: `${index * 0.03}s`,
                      }}
                    >
                      {/* Avatar */}
                      {msg.avatar_url ? (
                        <img 
                          src={msg.avatar_url} 
                          alt={msg.username}
                          style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover', border: '1px solid rgba(255,255,255,0.1)' }}
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <div style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '50%',
                          backgroundColor: isUser ? '#1e293b' : '#312e81',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 700,
                          fontSize: '13px',
                          color: '#f8fafc',
                          border: '1px solid rgba(255,255,255,0.1)',
                          flexShrink: 0,
                        }}>
                          {msg.username.substring(0, 2).toUpperCase()}
                        </div>
                      )}

                      {/* Content */}
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '2px' }}>
                          <span style={{ fontWeight: 700, fontSize: '14px', color: isUser ? '#f8fafc' : '#a78bfa' }}>
                            {msg.username}
                          </span>
                          {isUser && (
                            <span style={{ fontSize: '10px', background: 'rgba(56, 189, 248, 0.1)', color: '#38bdf8', padding: '1px 5px', borderRadius: '4px', fontWeight: 600 }}>
                              Creator
                            </span>
                          )}
                          <span style={{ fontSize: '11px', color: '#64748b' }}>
                            {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <div style={{
                          color: '#e2e8f0',
                          fontSize: '14px',
                          lineHeight: '1.5',
                          whiteSpace: 'pre-wrap',
                          background: 'rgba(22, 28, 45, 0.3)',
                          padding: '10px 14px',
                          borderRadius: '0 12px 12px 12px',
                          border: '1px solid rgba(255,255,255,0.03)',
                        }}>
                          {msg.message_content}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Drawer Footer Actions */}
            <div style={{ padding: '20px 24px', borderTop: '1px solid var(--border-color)', display: 'flex', gap: '12px', background: 'rgba(13, 17, 28, 0.6)' }}>
              {selectedTicket.status !== 'closed' ? (
                confirmCloseId === selectedTicket.id ? (
                  <div style={{ display: 'flex', width: '100%', gap: '12px' }}>
                    <button 
                      onClick={(e) => {
                        handleUpdateStatus(e as any, selectedTicket.id, 'closed');
                        setConfirmCloseId(null);
                      }}
                      className="btn btn-danger"
                      style={{ flex: 1, height: '40px', padding: 0, background: '#f43f5e', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}
                      disabled={actionLoading === selectedTicket.id}
                    >
                      Confirm Close (Yes)
                    </button>
                    <button 
                      onClick={() => setConfirmCloseId(null)}
                      className="btn btn-secondary"
                      style={{ flex: 1, height: '40px', padding: 0, borderRadius: '6px', cursor: 'pointer' }}
                    >
                      Cancel (No)
                    </button>
                  </div>
                ) : (
                  <button 
                    onClick={() => setConfirmCloseId(selectedTicket.id)}
                    className="btn btn-danger"
                    style={{ flex: 1, height: '40px', padding: 0 }}
                    disabled={actionLoading === selectedTicket.id}
                  >
                    Close Support Ticket
                  </button>
                )
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#94a3b8', fontSize: '13px', margin: '0 auto' }}>
                  <Lock size={14} /> Closed at {selectedTicket.closed_at ? new Date(selectedTicket.closed_at).toLocaleString() : 'N/A'} by @{selectedTicket.closed_by || 'system'}
                </div>
              )}
            </div>   </div>
          </div>

          {/* Slide & Fade Keyframe Styling */}
          <style jsx global>{`
            @keyframes slideIn {
              from { transform: translateX(100%); }
              to { transform: translateX(0); }
            }
            .active-row td {
              background-color: rgba(56, 189, 248, 0.06) !important;
            }
          `}</style>
        </>
      )}
    </div>
  );
}
