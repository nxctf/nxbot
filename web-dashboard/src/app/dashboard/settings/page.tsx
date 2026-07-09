'use client';

import React, { useState, useEffect } from 'react';
import { Database, Terminal, RefreshCw, Trash2, KeyRound } from 'lucide-react';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/Table';

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

  // Messages
  const [errorDb, setErrorDb] = useState('');
  const [successDb, setSuccessDb] = useState('');

  const fetchLogs = async () => {
    setLoadingLogs(true);
    try {
      const res = await fetch('/api/logs');
      setLogs(await res.json());
    } catch (err) {
      console.error('Error fetching logs:', err);
    } finally {
      setLoadingLogs(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const handleDbAction = async (action: 'clear_cache' | 'clear_logs') => {
    const confirmMsg = action === 'clear_cache'
      ? 'Clear first blood cache? Solves will re-trigger bot notifications.'
      : 'Clear all bot activity logs? This cannot be undone.';

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
        throw new Error(data.error || 'Failed.');
      }

      setSuccessDb(data.message || 'Success.');
      if (action === 'clear_logs') setLogs([]);
    } catch (err: any) {
      setErrorDb(err.message || 'Error.');
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
    <div className="page-container">
      <div className="page-container-content space-y-5">

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

          {/* Password */}
          <div className="bg-bg-card rounded-xl p-5 flex flex-col items-center text-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'rgba(56, 189, 248, 0.1)', color: '#38bdf8' }}>
              <KeyRound size={20} />
            </div>
            <h2 className="text-sm font-bold text-primary">Update Password</h2>
            <p className="text-xs text-slate-400 max-w-xs">
              Password changes are restricted to the CLI for security.
            </p>
            <code className="text-xs bg-white/5 px-3 py-1.5 rounded font-mono text-slate-200">
              nxbot reset-password
            </code>
          </div>

          {/* DB Tools */}
          <div className="bg-bg-card rounded-xl p-5 flex flex-col gap-4">
            <h2 className="text-sm font-bold text-purple-400 flex items-center gap-2">
              <Database size={16} /> DB Maintenance
            </h2>

            {errorDb && (
              <div className="text-xs px-3 py-2 rounded bg-rose-500/10 border border-rose-500/20 text-rose-400">{errorDb}</div>
            )}
            {successDb && (
              <div className="text-xs px-3 py-2 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center gap-1.5">{successDb}</div>
            )}

            <div className="flex flex-col gap-3">
              <div className="pb-3 border-b border-border-color">
                <h3 className="text-xs font-semibold">Reset First Blood Cache</h3>
                <p className="text-xs text-slate-400 mt-0.5 mb-2">
                  Re-trigger bot notifications on next solves.
                </p>
                <button
                  onClick={() => handleDbAction('clear_cache')}
                  className="btn btn-secondary text-xs w-full"
                  style={{ color: '#f59e0b', borderColor: 'rgba(245, 158, 11, 0.2)' }}
                >
                  Clear Cache
                </button>
              </div>
              <div>
                <h3 className="text-xs font-semibold">Wipe Activity Logs</h3>
                <p className="text-xs text-slate-400 mt-0.5 mb-2">
                  Delete all event logs permanently.
                </p>
                <button
                  onClick={() => handleDbAction('clear_logs')}
                  className="btn btn-secondary text-xs w-full flex items-center justify-center gap-1.5"
                  style={{ color: '#f43f5e', borderColor: 'rgba(244, 63, 94, 0.2)' }}
                >
                  <Trash2 size={14} /> Wipe Logs
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Console Logs */}
        <div className="bg-bg-card rounded-xl">
          <div className="flex items-center justify-between px-5 pt-5 pb-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-300">
              <Terminal size={16} className="text-primary" />
              Console Logs
            </div>
            <button
              onClick={fetchLogs}
              className="btn btn-secondary text-xs flex items-center gap-1.5"
              style={{ padding: '6px 14px' }}
              disabled={loadingLogs}
            >
              <RefreshCw size={12} className={loadingLogs ? 'animate-spin' : ''} /> Refresh
            </button>
          </div>

          {loadingLogs && logs.length === 0 ? (
            <div className="px-5 pb-8 pt-3 text-center text-slate-500 text-sm">
              <RefreshCw className="animate-spin inline mr-2" size={14} /> Loading logs...
            </div>
          ) : logs.length === 0 ? (
            <div className="px-5 pb-8 pt-4 text-center text-slate-500 text-sm flex flex-col items-center gap-2">
              <Terminal size={18} className="text-slate-600" />
              <span>No logs yet.</span>
            </div>
          ) : (
            <div className="px-5 pb-5">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Level</TableHead>
                    <TableHead>Message</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="text-xs text-slate-400 font-mono">
                        {new Date(log.created_at).toLocaleTimeString()}
                      </TableCell>
                      <TableCell className="text-xs font-semibold text-sky-400">
                        {log.guild_name ? `@${log.guild_name}` : '@system'}
                      </TableCell>
                      <TableCell className="text-xs font-mono text-purple-400">
                        [{log.event_type}]
                      </TableCell>
                      <TableCell>
                        <span className="text-[10px] font-bold"
                          style={{ color: getLogLevelColor(log.level) }}>
                          [{log.level.toUpperCase()}]
                        </span>
                      </TableCell>
                      <TableCell className="text-xs text-slate-300 max-w-xs truncate">
                        {log.message}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
