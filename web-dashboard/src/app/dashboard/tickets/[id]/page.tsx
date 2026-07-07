'use client';

import React, { use, useState, useEffect, useRef } from 'react';
import {
  ArrowLeft, Server, User, Lock,
  MessageSquare, Bot, File, Download, Send, RefreshCw, Clock
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import Button from '@/components/Button';
import GlassInput from '@/components/GlassInput';

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

interface TicketMessage {
  id: number;
  user_id: string;
  username: string;
  avatar_url: string | null;
  message_content: string | null;
  attachment_filename: string | null;
  attachment_original_name: string | null;
  attachment_size: number | null;
  created_at: string;
}

export default function TicketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const [ticket, setTicket] = useState<TicketData | null>(null);
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const [showConfirmClose, setShowConfirmClose] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchTicketDetails = async () => {
    try {
      const res = await fetch(`/api/tickets/${id}`);
      if (res.ok) {
        setTicket(await res.json());
      } else {
        router.push('/dashboard/tickets');
      }
    } catch (err) {
      console.error('Error fetching ticket details:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async () => {
    try {
      const res = await fetch(`/api/tickets/${id}/messages`);
      if (res.ok) setMessages(await res.json());
    } catch (err) {
      console.error('Error fetching ticket messages:', err);
    }
  };

  useEffect(() => {
    fetchTicketDetails();
    fetchMessages();
  }, [id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Escape key to go back
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') router.back(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [router]);

  // Real-time: poll messages + ticket detail every 6s
  useEffect(() => {
    if (!ticket || ticket.status === 'closed') return;
    const interval = setInterval(async () => {
      await Promise.all([fetchMessages(), fetchTicketDetails()]);
    }, 6000);
    return () => clearInterval(interval);
  }, [id, ticket?.status]);

  const handleSendReply = async () => {
    if (!replyText.trim() || !ticket) return;
    setSendingReply(true);
    try {
      const res = await fetch(`/api/tickets/${ticket.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: replyText }),
      });
      if (res.ok) {
        setReplyText('');
        await fetchMessages();
      } else {
        const errData = await res.json().catch(() => ({}));
        alert(`Failed to send message: ${errData.error || 'Unknown error'}`);
      }
    } catch (err) {
      console.error('Error sending reply:', err);
      alert('Error sending message. Please try again.');
    } finally {
      setSendingReply(false);
    }
  };

  const handleCloseTicket = async () => {
    if (!ticket) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/tickets/${ticket.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'closed' }),
      });
      if (res.ok) {
        setShowConfirmClose(false);
        await fetchTicketDetails();
      }
    } catch (err) {
      console.error('Error closing ticket:', err);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[80vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-primary" />
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="bg-bg-card rounded-xl p-16 text-center text-slate-400">
        <p>Ticket not found.</p>
      </div>
    );
  }

  const openerAvatar = ticket.user_avatar || messages.find(m => m.user_id === ticket.user_id && m.avatar_url)?.avatar_url;

  const statusBadge = ticket.status === 'open' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
    ticket.status === 'in_progress' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20';
  const statusLabel = ticket.status === 'open' ? 'Open' : ticket.status === 'in_progress' ? 'In Progress' : 'Closed';

  // First message = description (strip the "📝 **Initial Description:**" prefix if present)
  const firstMsg = messages.find(m => m.user_id === ticket.user_id);
  const rawDesc = firstMsg?.message_content || '';
  const description = rawDesc.replace(/^📝\s*\*\*Initial Description:\*\*\s*/i, '');

  return (
    <div className="page-container">
      <div className="page-container-content h-[calc(100vh-60px-40px-28px)] flex flex-col">
        <div className="flex flex-col xl:flex-row gap-4 flex-1 min-h-0">

          {/* Left: Compact Ticket Info */}
          <div className="w-full xl:w-[280px] bg-bg-card rounded-xl p-4 flex flex-col shrink-0 overflow-y-auto">
            {/* Header: back + ticket ID | status */}
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2 min-w-0">
                <button onClick={() => router.back()}
                  className="flex items-center justify-center w-6 h-6 rounded-lg bg-slate-800/50 text-slate-400 hover:text-slate-200 hover:bg-slate-700/60 transition-all shrink-0">
                  <ArrowLeft size={12} />
                </button>
                <h1 className="text-sm font-bold text-slate-100 font-mono truncate">Ticket #{String(ticket.id).padStart(4, '0')}</h1>
              </div>
              <span className={`shrink-0 inline-flex px-1.5 py-0.5 rounded text-[10px] font-bold ${statusBadge}`}>
                {statusLabel}
              </span>
            </div>

            {/* Server name */}
            <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-3">
              <Server size={12} className="shrink-0" />
              <span className="truncate">{ticket.guild_name}</span>
            </div>

            {/* Subject + Description */}
            <div className="space-y-1 mb-4">
              <h2 className="text-sm font-bold text-slate-100 leading-snug">{ticket.subject}</h2>
              {description && (
                <p className="text-xs text-slate-400 leading-relaxed line-clamp-4">{description}</p>
              )}
            </div>

            {/* Bottom spacer */}
            <div className="flex-1" />

            {/* Dates */}
            <div className="space-y-2 text-xs border-t border-border-color/40 pt-4">
              <div className="flex justify-between">
                <span className="text-slate-500">Opened</span>
                <span className="text-slate-300 font-medium">{new Date(ticket.created_at).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Closed</span>
                <span className="text-slate-300 font-medium">{ticket.closed_at ? new Date(ticket.closed_at).toLocaleString() : '-'}</span>
              </div>
            </div>

            {/* People */}
            <div className="space-y-2 text-xs border-t border-border-color/40 pt-4">
              <div className="flex justify-between">
                <span className="text-slate-500">Opened by</span>
                <span className="font-semibold text-slate-200 inline-flex items-center gap-1.5">
                  {openerAvatar ? (
                    <img src={openerAvatar} alt="" className="w-4 h-4 rounded-full object-cover" />
                  ) : (
                    <div className="w-4 h-4 rounded-full bg-purple-500/10 flex items-center justify-center text-purple-400">
                      <User size={8} />
                    </div>
                  )}
                  @{ticket.username}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Assigned to</span>
                <span className="font-semibold text-slate-200 inline-flex items-center gap-1.5">
                  {ticket.assigned_to ? (
                    <>
                      {ticket.assigned_to_avatar && (
                        <img src={ticket.assigned_to_avatar} alt="" className="w-4 h-4 rounded-full object-cover" />
                      )}
                      @{ticket.assigned_to_username || ticket.assigned_to}
                    </>
                  ) : <span className="text-slate-500">-</span>}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Closed by</span>
                <span className="font-semibold text-slate-200 inline-flex items-center gap-1.5">
                  {ticket.status === 'closed' && ticket.closed_by ? (
                    <>
                      {ticket.closed_by_avatar && (
                        <img src={ticket.closed_by_avatar} alt="" className="w-4 h-4 rounded-full object-cover" />
                      )}
                      @{ticket.closed_by_username || ticket.closed_by || 'system'}
                    </>
                  ) : <span className="text-slate-500">-</span>}
                </span>
              </div>
            </div>

            {ticket.status !== 'closed' && (
              <div className="pt-4 border-t border-border-color/40">
                {showConfirmClose ? (
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-rose-400 font-bold">Close this ticket?</span>
                    <Button variant="danger" size="sm" onClick={handleCloseTicket} loading={actionLoading} className="py-1 px-2.5 text-xs">Yes</Button>
                    <Button variant="secondary" size="sm" onClick={() => setShowConfirmClose(false)} className="py-1 px-2.5 text-xs">No</Button>
                  </div>
                ) : (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setShowConfirmClose(true)}
                    className="w-full text-xs text-rose-400 border-rose-500/20 hover:bg-rose-500/10"
                  >
                    <Lock size={12} className="mr-1" /> Close Ticket
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Right: Chat */}
          <div className="flex-1 bg-bg-card rounded-xl flex flex-col overflow-hidden min-h-0">
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-3 text-slate-500 text-center p-6">
                  <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/5 text-primary">
                    <MessageSquare size={22} />
                  </div>
                  <div>
                    <span className="font-bold text-slate-100 block mb-0.5 text-sm">No messages yet</span>
                    <span className="text-xs text-slate-400 max-w-xs block mx-auto leading-relaxed">
                      Messages appear here in real-time as they are sent on Discord.
                    </span>
                  </div>
                </div>
              ) : (
                messages.map((msg) => {
                  const isUser = msg.user_id === ticket.user_id;
                  const isBot = msg.user_id === 'bot' || msg.user_id === 'system_bot' || msg.username.toLowerCase().includes('bot');

                  return (
                    <div key={msg.id} className="flex gap-3 items-start">
                      {msg.avatar_url ? (
                        <img src={msg.avatar_url} alt={msg.username} className="w-8 h-8 rounded-full object-cover shrink-0" />
                      ) : isBot ? (
                        <div className="w-8 h-8 rounded-full bg-blue-500/10 text-blue-400 flex items-center justify-center shrink-0">
                          <Bot size={16} />
                        </div>
                      ) : (
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                          isUser ? 'bg-primary/10 text-primary' : 'bg-purple-500/10 text-purple-400'
                        }`}>
                          {msg.username.substring(0, 2).toUpperCase()}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-2 mb-0.5">
                          <span className={`font-semibold text-sm ${isUser ? 'text-slate-100' : 'text-purple-300'}`}>
                            {msg.username}
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono">
                            {new Date(msg.created_at).toLocaleString()}
                          </span>
                        </div>
                        <div className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap break-words">
                          {msg.message_content}
                        </div>
                        {msg.attachment_filename && (() => {
                          const downloadUrl = `/api/tickets/attachments/${msg.attachment_filename}`;
                          const sizeKb = msg.attachment_size ? Math.round(msg.attachment_size / 1024) : 0;
                          const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(msg.attachment_original_name || '');
                          if (isImage) {
                            return (
                              <div className="mt-2 max-w-sm rounded-xl overflow-hidden bg-slate-950/20">
                                <a href={downloadUrl} target="_blank" rel="noopener noreferrer">
                                  <img src={downloadUrl} alt={msg.attachment_original_name || 'Attachment'} className="max-w-full max-h-56 object-contain block cursor-zoom-in" />
                                </a>
                              </div>
                            );
                          }
                          return (
                            <div className="mt-2 p-2.5 bg-slate-900/40 rounded-xl flex items-center justify-between gap-3 max-w-md">
                              <div className="flex items-center gap-2 min-w-0">
                                <File size={18} className="text-primary shrink-0" />
                                <div className="min-w-0">
                                  <span className="text-xs font-semibold text-slate-100 block truncate">{msg.attachment_original_name}</span>
                                  <span className="text-[10px] text-slate-500">{sizeKb} KB</span>
                                </div>
                              </div>
                              <a href={downloadUrl} download className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-300 bg-slate-800/40 hover:bg-slate-700/60 px-2.5 py-1.5 rounded-lg transition-colors shrink-0">
                                <Download size={11} />
                                Download
                              </a>
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-3 border-t border-border-color/40 flex gap-2.5 items-center shrink-0">
              {ticket.status !== 'closed' ? (
                <>
                  <div className="flex-1">
                    <GlassInput
                      type="text"
                      placeholder="Type a response..."
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleSendReply(); }}
                      className="text-sm"
                      disabled={sendingReply}
                    />
                  </div>
                  <Button
                    onClick={handleSendReply}
                    loading={sendingReply}
                    disabled={sendingReply || !replyText.trim()}
                    className="h-9 px-4 rounded-xl gap-1.5 text-sm"
                  >
                    <span>Send</span>
                    <Send size={14} />
                  </Button>
                </>
              ) : (
                <div className="text-slate-500 text-xs text-center w-full italic py-1">
                  This ticket is closed.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
