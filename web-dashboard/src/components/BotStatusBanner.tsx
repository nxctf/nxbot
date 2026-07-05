'use client';

import React, { useEffect, useState } from 'react';
import { AlertTriangle, WifiOff, Loader2 } from 'lucide-react';

interface BotStatus {
  status: 'online' | 'offline' | 'error' | 'starting';
  error?: string | null;
  username?: string | null;
  guilds?: number;
  updatedAt?: string;
}

export default function BotStatusBanner() {
  const [status, setStatus] = useState<BotStatus | null>(null);

  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/settings/bot-status');
      if (res.ok) {
        const data = await res.json();
        setStatus(data);
      }
    } catch (err) {
      console.error('Failed to fetch bot status:', err);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 8000);
    return () => clearInterval(interval);
  }, []);

  if (!status) return null;
  if (status.status === 'online') return null;

  return (
    <div style={{
      marginBottom: '24px',
      padding: '16px 20px',
      background: status.status === 'error' 
        ? 'rgba(239, 68, 68, 0.08)' 
        : 'rgba(245, 158, 11, 0.08)',
      border: `1px solid ${status.status === 'error' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`,
      borderRadius: '12px',
      display: 'flex',
      alignItems: 'flex-start',
      gap: '16px',
      boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.25)',
      backdropFilter: 'blur(8px)',
    }}>
      <div style={{
        padding: '8px',
        borderRadius: '8px',
        background: status.status === 'error' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.15)',
        color: status.status === 'error' ? '#ef4444' : '#f59e0b',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        {status.status === 'error' && <AlertTriangle size={20} />}
        {status.status === 'offline' && <WifiOff size={20} />}
        {status.status === 'starting' && <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} />}
      </div>

      <div style={{ flex: 1 }}>
        <h4 style={{
          margin: 0,
          fontSize: '14px',
          fontWeight: 600,
          color: status.status === 'error' ? '#fca5a5' : '#fde047',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          {status.status === 'error' && 'Discord Bot Connection Error'}
          {status.status === 'offline' && 'Discord Bot is Offline'}
          {status.status === 'starting' && 'Discord Bot is Starting...'}
        </h4>
        <p style={{
          margin: '4px 0 0 0',
          fontSize: '13px',
          color: '#cbd5e1',
          lineHeight: '1.5'
        }}>
          {status.error || 'The bot process is not running. Please check the container logs or verify your credentials.'}
        </p>
      </div>

      {status.status === 'error' && status.error?.toLowerCase().includes('intents') && (
        <a 
          href="https://discord.com/developers/applications" 
          target="_blank" 
          rel="noopener noreferrer"
          className="btn btn-secondary"
          style={{
            fontSize: '12px',
            padding: '8px 14px',
            color: '#ef4444',
            borderColor: 'rgba(239, 68, 68, 0.3)',
            background: 'rgba(239, 68, 68, 0.05)',
            alignSelf: 'center',
            textDecoration: 'none',
            borderRadius: '6px',
            fontWeight: 500,
            display: 'inline-block'
          }}
        >
          Fix in Dev Portal
        </a>
      )}
    </div>
  );
}
