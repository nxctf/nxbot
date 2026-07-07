'use client';

import React, { use, useState, useEffect, useRef } from 'react';
import { 
  ArrowLeft, Server, User, KeyRound, Lock, 
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
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const [showConfirmClose, setShowConfirmClose] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll chats to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchTicketDetails = async () => {
    try {
      const res = await fetch(`/api/tickets/${id}`);
      if (res.ok) {
        const data = await res.json();
        setTicket(data);
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
    setMessagesLoading(true);
    try {
      const res = await fetch(`/api/tickets/${id}/messages`);
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
    fetchTicketDetails();
    fetchMessages();
  }, [id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Polling for new messages every 6 seconds to keep it live
  useEffect(() => {
    if (!ticket || ticket.status === 'closed') return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/tickets/${id}/messages`);
        if (res.ok) {
          const data = await res.json();
          // Only update state if message count changed
          if (data.length !== messages.length) {
            setMessages(data);
          }
        }
      } catch (err) {
        console.error('Error polling messages:', err);
      }
    }, 6000);
    return () => clearInterval(interval);
  }, [id, ticket, messages.length]);

  const handleSendReply = async () => {
    if (!replyText.trim() || !ticket) return;
    setSendingReply(true);
    try {
      const res = await fetch(`/api/tickets/${ticket.id}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: replyText }),
      });
      if (res.ok) {
        setReplyText('');
        // Fetch fresh messages
        const msgRes = await fetch(`/api/tickets/${id}/messages`);
        if (msgRes.ok) {
          const data = await msgRes.json();
          setMessages(data);
        }
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
        // Refresh details
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
      <div className="glass-panel p-16 text-center text-slate-400">
        <p>Ticket not found.</p>
      </div>
    );
  }

  const openerAvatar = ticket.user_avatar || messages.find(m => m.user_id === ticket.user_id && m.avatar_url)?.avatar_url;

  const statusBadge = ticket.status === 'open' ? 'bg-accent-green/10 text-accent-green' :
    ticket.status === 'in_progress' ? 'bg-accent-yellow/10 text-accent-yellow' : 'bg-accent-red/10 text-accent-red';
  const statusLabel = ticket.status === 'open' ? 'Open' : ticket.status === 'in_progress' ? 'In Progress' : 'Closed';

  return (
    <>
      {/* Sticky Header */}
      <div className="sticky top-[60px] z-40 bg-bg-dark/95 backdrop-blur-md border-b border-border-color -mx-10 mb-8 px-10 py-4 flex items-center justify-between shadow-lg shadow-black/30">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push('/dashboard/tickets')}
            className="flex items-center justify-center w-9 h-9 rounded-full bg-slate-800/50 border border-border-color text-slate-200 transition-all hover:bg-slate-700/60"
            title="Back to Tickets"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-extrabold text-slate-100">Ticket #{String(ticket.id).padStart(4, '0')}</h1>
              <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-bold ${statusBadge}`}>
                {statusLabel}
              </span>
            </div>
            <p className="text-slate-400 text-xs mt-0.5 truncate max-w-lg">{ticket.subject}</p>
          </div>
        </div>

        {ticket.status !== 'closed' && (
          showConfirmClose ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-accent-red font-bold">Are you sure?</span>
              <Button variant="danger" size="sm" onClick={handleCloseTicket} loading={actionLoading}>
                Yes, Close
              </Button>
              <Button variant="secondary" size="sm" onClick={() => setShowConfirmClose(false)}>
                No
              </Button>
            </div>
          ) : (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowConfirmClose(true)}
              className="text-accent-red border-accent-red/20 hover:bg-accent-red/10"
            >
              <Lock size={14} className="mr-1.5" />
              Close Ticket
            </Button>
          )
        )}
      </div>

      <div className="flex flex-col xl:flex-row gap-6 h-[calc(100vh-200px)] min-h-[500px]">
        {/* Left Column: Details panel */}
        <div className="w-full xl:w-[320px] bg-slate-950/40 border border-border-color rounded-2xl p-5 flex flex-col justify-between shrink-0 overflow-y-auto">
          <div className="space-y-6">
            {/* Status Info */}
            <div className="space-y-1.5">
              <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Status</span>
              <span className={`inline-flex items-center px-3 py-1 rounded-md text-xs font-bold ${statusBadge}`}>
                {statusLabel}
              </span>
            </div>

            {/* Opened By Info */}
            <div className="space-y-2">
              <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Opened By</span>
              <div className="flex items-center gap-3">
                {openerAvatar ? (
                  <img 
                    src={openerAvatar} 
                    alt="" 
                    className="w-9 h-9 rounded-full object-cover border border-white/10" 
                  />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                    <User size={18} />
                  </div>
                )}
                <div className="min-w-0">
                  <span className="font-bold text-slate-100 block text-sm truncate">@{ticket.username || 'unknown'}</span>
                  <span className="text-[10px] text-slate-500 font-mono block truncate">ID: {ticket.user_id}</span>
                </div>
              </div>
            </div>

            {/* Details list */}
            <div className="space-y-4 pt-4 border-t border-border-color/60 text-sm">
              <div className="space-y-1">
                <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Server / Guild</span>
                <span className="font-semibold text-slate-300 inline-flex items-center gap-1.5">
                  <Server size={14} className="text-slate-400" />
                  {ticket.guild_name}
                </span>
              </div>

              <div className="space-y-1">
                <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Opened Date</span>
                <span className="font-semibold text-slate-300 inline-flex items-center gap-1.5">
                  <Clock size={14} className="text-slate-400" />
                  {new Date(ticket.created_at).toLocaleString()}
                </span>
              </div>

              {ticket.assigned_to && (
                <div className="space-y-1">
                  <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Claimed Staff</span>
                  <span className="font-semibold text-accent-yellow inline-flex items-center gap-1.5">
                    {ticket.assigned_to_avatar ? (
                      <img 
                        src={ticket.assigned_to_avatar} 
                        alt="" 
                        className="w-[18px] h-[18px] rounded-full object-cover" 
                      />
                    ) : (
                      <span className="w-1.5 h-1.5 rounded-full bg-accent-yellow" />
                    )}
                    @{ticket.assigned_to_username || ticket.assigned_to}
                  </span>
                </div>
              )}

              {ticket.status === 'closed' && (
                <div className="space-y-1">
                  <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Closed By</span>
                  <span className="font-semibold text-accent-red inline-flex items-center gap-1.5">
                    {ticket.closed_by_avatar && (
                      <img 
                        src={ticket.closed_by_avatar} 
                        alt="" 
                        className="w-[18px] h-[18px] rounded-full object-cover" 
                      />
                    )}
                    @{ticket.closed_by_username || ticket.closed_by || 'system'}
                  </span>
                </div>
              )}
            </div>
          </div>

        </div>

        {/* Right Column: Chat Transcript container */}
        <div className="flex-1 bg-slate-950/60 border border-border-color rounded-2xl flex flex-col overflow-hidden">
          {/* Chat box messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4 min-h-0">
            {messagesLoading && messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-3 text-slate-400">
                <RefreshCw className="animate-spin" size={24} style={{ color: '#38bdf8' }} />
                <span className="text-sm">Loading ticket transcript...</span>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-4 text-slate-500 text-center p-8">
                <div className="flex items-center justify-center w-14 h-14 rounded-full bg-primary/5 border border-primary/10 text-primary">
                  <MessageSquare size={24} />
                </div>
                <div>
                  <span className="font-bold text-slate-100 block mb-1 text-sm">No messages logged</span>
                  <span className="text-xs text-slate-400 max-w-xs block mx-auto leading-relaxed">
                    Messages sent inside this ticket channel on Discord will appear here in real-time.
                  </span>
                </div>
              </div>
            ) : (
              messages.map((msg) => {
                const isUser = msg.user_id === ticket.user_id;
                const isBot = msg.user_id === 'bot' || msg.user_id === 'system_bot' || msg.username.toLowerCase().includes('bot');

                return (
                  <div key={msg.id} className="flex gap-3 items-start animate-fade-in">
                    {/* User Avatar */}
                    {msg.avatar_url ? (
                      <img 
                        src={msg.avatar_url} 
                        alt={msg.username}
                        className="w-9 h-9 rounded-full object-cover border border-white/10 shrink-0" 
                      />
                    ) : isBot ? (
                      <div className="w-9 h-9 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
                        <Bot size={18} />
                      </div>
                    ) : (
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm shrink-0 border ${
                        isUser 
                          ? 'bg-primary/10 border-primary/20 text-primary' 
                          : 'bg-purple-500/10 border-purple-500/20 text-purple-400'
                      }`}>
                        {msg.username.substring(0, 2).toUpperCase()}
                      </div>
                    )}

                    {/* Chat Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2 mb-1">
                        <span className={`font-bold text-sm ${isUser ? 'text-slate-100' : 'text-purple-300'}`}>
                          {msg.username}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {new Date(msg.created_at).toLocaleString()}
                        </span>
                      </div>
                      <div className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap break-words">
                        {msg.message_content}
                      </div>

                      {/* Attachments rendering */}
                      {msg.attachment_filename && (() => {
                        const downloadUrl = `/api/tickets/attachments/${msg.attachment_filename}`;
                        const sizeKb = msg.attachment_size ? Math.round(msg.attachment_size / 1024) : 0;
                        const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(msg.attachment_original_name || '');
                        
                        if (isImage) {
                          return (
                            <div className="mt-2 max-w-sm rounded-xl overflow-hidden border border-border-color bg-slate-950/20">
                              <a href={downloadUrl} target="_blank" rel="noopener noreferrer">
                                <img 
                                  src={downloadUrl} 
                                  alt={msg.attachment_original_name || 'Attachment'} 
                                  className="max-w-full max-h-60 object-contain block cursor-zoom-in" 
                                />
                              </a>
                            </div>
                          );
                        }
                        
                        return (
                          <div className="mt-2 p-3 bg-slate-900/40 border border-border-color rounded-xl flex items-center justify-between gap-4 max-w-md">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <File size={20} className="text-primary shrink-0" />
                              <div className="min-w-0">
                                <span className="text-xs font-bold text-slate-100 block truncate">
                                  {msg.attachment_original_name}
                                </span>
                                <span className="text-[10px] text-slate-500">{sizeKb} KB</span>
                              </div>
                            </div>
                            <a 
                              href={downloadUrl} 
                              download 
                              className="inline-flex items-center gap-1.5 text-[11px] font-bold text-slate-300 border border-border-color bg-slate-800/40 hover:bg-slate-700/60 px-3 py-1.5 rounded-lg transition-colors shrink-0"
                            >
                              <Download size={12} />
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

          {/* Reply input bar */}
          <div className="p-4 border-t border-border-color bg-slate-950/40 flex gap-3 items-center shrink-0">
            {ticket.status !== 'closed' ? (
              <>
                <div className="flex-1">
                  <GlassInput
                    type="text"
                    placeholder="Type a response to send to Discord ticket channel..."
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSendReply();
                    }}
                    className="text-sm"
                    disabled={sendingReply}
                  />
                </div>
                <Button
                  onClick={handleSendReply}
                  loading={sendingReply}
                  disabled={sendingReply || !replyText.trim()}
                  className="h-11 px-5 rounded-xl gap-2 font-semibold"
                >
                  <span>Send</span>
                  <Send size={15} />
                </Button>
              </>
            ) : (
              <div className="text-slate-500 text-xs text-center w-full italic py-2">
                This ticket is closed. Sending messages is disabled.
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
