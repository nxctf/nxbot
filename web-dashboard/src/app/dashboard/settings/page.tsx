'use client';

import React, { useState, useEffect } from 'react';
import { Settings, KeyRound, Database, Terminal, ShieldAlert, CheckCircle, RefreshCw, Trash2 } from 'lucide-react';

interface Log {
  id: number;
  guild_name: string | null;
  level: string;
  event_type: string;
  message: string;
  created_at: string;
}

export default function SettingsPage() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [btnLoading, setBtnLoading] = useState(false);
  
  // Password Fields
  const [currPassword, setCurrPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // Messages
  const [errorPass, setErrorPass] = useState('');
  const [successPass, setSuccessPass] = useState('');
  const [errorDb, setErrorDb] = useState('');
  const [successDb, setSuccessDb] = useState('');

  const fetchLogs = async () => {
    setLoadingLogs(true);
    try {
      const res = await fetch('/api/logs');
      const data = await res.json();
      setLogs(data);
    } catch (err) {
      console.error('Error fetching logs:', err);
    } finally {
      setLoadingLogs(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorPass('');
    setSuccessPass('');

    if (newPassword.length < 6) {
      setErrorPass('New password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorPass('New passwords do not match.');
      return;
    }

    setBtnLoading(true);

    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'change_password',
          currentPassword: currPassword,
          newPassword: newPassword,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to update password.');
      }

      setSuccessPass('Password updated successfully!');
      setCurrPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setErrorPass(err.message || 'Error occurred.');
    } finally {
      setBtnLoading(false);
    }
  };

  const handleDbAction = async (action: 'clear_cache' | 'clear_logs') => {
    const confirmMsg = action === 'clear_cache' 
      ? 'Are you sure you want to clear the first blood cache? This will cause bot notifications to fire again for already-solved challenges.'
      : 'Are you sure you want to clear all bot activity logs? This cannot be undone.';
    
    if (!confirm(confirmMsg)) return;

    setErrorDb('');
    setSuccessDb('');

    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to execute DB utility action.');
      }

      setSuccessDb(data.message || 'Success.');
      if (action === 'clear_logs') {
        setLogs([]);
      }
    } catch (err: any) {
      setErrorDb(err.message || 'Error executing action.');
    }
  };

  const getLogLevelColor = (level: string) => {
    switch (level.toLowerCase()) {
      case 'error': return '#f43f5e';
      case 'warn': return '#f59e0b';
      case 'debug': return '#38bdf8';
      default: return '#94a3b8';
    }
  };

  return (
    <div className="animate-fade-in" style={{ maxWidth: '1080px', margin: '0 auto' }}>
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: 800 }}>Settings & Database</h1>
        <p style={{ color: '#94a3b8' }}>Manage admin credentials, logs, and first blood caches</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px', marginBottom: '32px' }}>
        
        {/* CLI Password Change Note */}
        <div className="glass-panel" style={{ padding: '32px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
          <div style={{
            display: 'inline-flex',
            padding: '12px',
            borderRadius: '12px',
            background: 'rgba(56, 189, 248, 0.1)',
            color: '#38bdf8',
            marginBottom: '16px'
          }}>
            <KeyRound size={32} />
          </div>
          <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '12px', color: '#38bdf8' }}>
            Update Password
          </h2>
          <p style={{ color: '#94a3b8', fontSize: '15px', lineHeight: '1.6', maxWidth: '340px' }}>
            For security, admin password changes are restricted to the Command Line Interface.
          </p>
          <p style={{ color: '#e2e8f0', fontSize: '15px', fontWeight: 500, marginTop: '16px', background: 'rgba(255, 255, 255, 0.05)', padding: '10px 20px', borderRadius: '6px', fontFamily: 'monospace' }}>
            nxbot reset-password
          </p>
          <p style={{ color: '#94a3b8', fontSize: '14px', marginTop: '12px' }}>
            Run this command on your host server to update credentials.
          </p>
        </div>

        {/* Database Utilities */}
        <div className="glass-panel" style={{ padding: '32px', display: 'flex', flexDirection: 'column' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px', color: '#a855f7' }}>
            <Database size={20} /> DB Maintenance Tools
          </h2>

          {errorDb && (
            <div style={{ background: 'rgba(244, 63, 94, 0.1)', border: '1px solid rgba(244, 63, 94, 0.2)', color: '#f43f5e', padding: '12px 16px', borderRadius: '8px', marginBottom: '20px', fontSize: '14px' }}>
              {errorDb}
            </div>
          )}

          {successDb && (
            <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)', color: '#10b981', padding: '12px 16px', borderRadius: '8px', marginBottom: '20px', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckCircle size={18} style={{ color: '#10b981' }} /> {successDb}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', flex: 1 }}>
            <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '20px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '4px' }}>Reset First Blood Cache</h3>
              <p style={{ color: '#94a3b8', fontSize: '13px', marginBottom: '16px' }}>
                Clears the local memory tracking first solves. The bot will trigger alerts on the next solves as if they were new.
              </p>
              <button 
                onClick={() => handleDbAction('clear_cache')}
                className="btn btn-secondary"
                style={{ width: '100%', color: '#f59e0b', border: '1px solid rgba(245, 158, 11, 0.2)' }}
              >
                Clear First Blood Cache
              </button>
            </div>

            <div>
              <h3 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '4px' }}>Wipe System Activity Logs</h3>
              <p style={{ color: '#94a3b8', fontSize: '13px', marginBottom: '16px' }}>
                Deletes all event log outputs from the database to clean up disk space. Action is immediate and permanent.
              </p>
              <button 
                onClick={() => handleDbAction('clear_logs')}
                className="btn btn-secondary"
                style={{ width: '100%', color: '#f43f5e', border: '1px solid rgba(244, 63, 94, 0.2)' }}
              >
                <Trash2 size={16} /> Wipe Logs Database
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Live System Logs Console */}
      <div className="glass-panel" style={{ padding: '32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Terminal size={22} style={{ color: '#38bdf8' }} />
            <h2 style={{ fontSize: '20px', fontWeight: 700 }}>System Console Logs</h2>
          </div>
          <button 
            onClick={fetchLogs} 
            className="btn btn-secondary"
            style={{ padding: '8px 16px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}
            disabled={loadingLogs}
          >
            <RefreshCw size={14} className={loadingLogs ? 'animate-spin' : ''} /> Refresh Logs
          </button>
        </div>

        {loadingLogs && logs.length === 0 ? (
          <div className="glass-panel" style={{ padding: '60px', textAlign: 'center', color: '#94a3b8' }}>
            <RefreshCw className="animate-spin" size={32} style={{ margin: '0 auto 16px' }} />
            <p>Querying SQLite DB...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="glass-panel" style={{ padding: '60px', textAlign: 'center', color: '#94a3b8' }}>
            <Terminal size={40} style={{ margin: '0 auto 16px', opacity: 0.4, color: '#64748b' }} />
            <h3 style={{ fontSize: '18px', color: '#f8fafc', marginBottom: '8px' }}>Console Log is Empty</h3>
            <p style={{ fontSize: '14px', maxWidth: '400px', margin: '0 auto' }}>
              Bot and dashboard activity logs will appear here once services are running.
            </p>
          </div>
        ) : (
          <div style={{ 
            background: '#030712', 
            borderRadius: '12px', 
            padding: '24px', 
            fontFamily: 'var(--font-mono)', 
            fontSize: '13px', 
            lineHeight: '1.6', 
            maxHeight: '400px', 
            overflowY: 'auto', 
            border: '1px solid var(--border-color)',
            boxShadow: 'inset 0 4px 12px 0 rgba(0,0,0,0.8)'
          }}>
            {logs.map((log) => (
              <div key={log.id} style={{ marginBottom: '10px', display: 'flex', gap: '12px', borderBottom: '1px solid rgba(255,255,255,0.02)', paddingBottom: '8px' }}>
                <span style={{ color: '#64748b' }}>[{new Date(log.created_at).toLocaleTimeString()}]</span>
                <span style={{ color: '#38bdf8', fontWeight: 600 }}>{log.guild_name ? `@${log.guild_name}` : '@system'}</span>
                <span style={{ color: '#a855f7' }}>[{log.event_type}]</span>
                <span style={{ color: getLogLevelColor(log.level), fontWeight: 700 }}>[{log.level.toUpperCase()}]</span>
                <span style={{ color: '#e2e8f0', flex: 1 }}>{log.message}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
