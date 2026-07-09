'use client';

import React, { useState, useEffect } from 'react';
import { Server, Ticket, ClipboardList, Cpu, RefreshCw, Clock, Database, Activity } from 'lucide-react';
import Link from 'next/link';
import StatCard from '@/components/StatCard';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/Table';

interface Log {
  id: number;
  guild_id: string | null;
  guild_name: string | null;
  level: string;
  event_type: string;
  message: string;
  created_at: string;
}

interface Stats {
  servers: number;
  tickets: number;
  logs: number;
  databases?: number;
}

export default function OverviewPage() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [stats, setStats] = useState<Stats>({ servers: 0, tickets: 0, logs: 0, databases: 0 });
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const [statsRes, logsRes] = await Promise.all([
        fetch('/api/settings'),
        fetch('/api/logs'),
      ]);
      const statsData = await statsRes.json();
      if (statsData.stats) setStats(statsData.stats);
      setLogs(await logsRes.json());
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

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
        <div className="dashboard-grid">
          <StatCard icon={<Server size={20} />} title="Servers" value={stats.servers} color="#38bdf8" link="/dashboard/servers" />
          <StatCard icon={<Database size={20} />} title="Databases" value={stats.databases || 0} color="#38bdf8" link="/dashboard/databases" />
          <StatCard icon={<Ticket size={20} />} title="Tickets" value={stats.tickets} color="#a855f7" link="/dashboard/tickets" />
          <div className="bg-bg-card rounded-xl p-5 stat-card">
            <div className="stat-card-icon" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
              <Cpu size={20} />
            </div>
            <div className="stat-card-info">
              <span className="stat-card-label">Bot</span>
              <div className="flex items-center gap-2 mt-1.5">
                <span className="badge badge-success">Online</span>
                <span className="text-xs text-slate-400 flex items-center gap-1">
                  <Activity size={11} />
                  Running
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-bg-card rounded-xl">
          <div className="flex items-center justify-between px-5 pt-5 pb-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-300">
              <ClipboardList size={16} className="text-primary" />
              Recent Activity
            </div>
            <Link href="/dashboard/settings" className="text-xs text-primary font-semibold hover:underline">
              View All &rarr;
            </Link>
          </div>

          {logs.length === 0 ? (
            <div className="px-5 pb-8 pt-4 text-center text-slate-500 text-sm flex flex-col items-center gap-2">
              <Clock size={20} className="text-slate-600" />
              <span>No activity logs yet.</span>
            </div>
          ) : (
            <div className="px-5 pb-5">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>Server</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Level</TableHead>
                    <TableHead>Message</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.slice(0, 10).map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="text-xs text-slate-400 font-mono">
                        {new Date(log.created_at).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-xs font-semibold">
                        {log.guild_name || <span className="text-slate-500">System</span>}
                      </TableCell>
                      <TableCell className="text-xs font-mono text-slate-300">
                        {log.event_type}
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold`}
                          style={{ color: getLogLevelColor(log.level), background: `${getLogLevelColor(log.level)}15` }}>
                          {log.level.toUpperCase()}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs text-slate-400 max-w-xs truncate">
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
