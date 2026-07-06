'use client';

import React, { useState, useEffect } from 'react';
import { Server, Ticket, ClipboardList, Cpu, RefreshCw, Clock, Database, Activity } from 'lucide-react';
import Link from 'next/link';
import PageContainer from '@/components/PageContainer';
import StatCard from '@/components/StatCard';

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
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    try {
      const statsRes = await fetch('/api/settings');
      const statsData = await statsRes.json();
      if (statsData.stats) {
        setStats(statsData.stats);
      }

      const logsRes = await fetch('/api/logs');
      const logsData = await logsRes.json();
      setLogs(logsData);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
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
    <PageContainer
      title="Dashboard Overview"
      subtitle="Realtime status and metrics of your NXBot instance"
      loading={loading}
      extra={
        <button onClick={handleRefresh} className="btn btn-secondary" disabled={refreshing} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <RefreshCw className={refreshing ? 'animate-spin' : ''} size={16} />
          Refresh
        </button>
      }
    >
      <div className="dashboard-grid">
        <StatCard icon={<Server size={24} />} title="Active CTF Servers" value={stats.servers} color="#38bdf8" link="/dashboard/servers" />
        <StatCard icon={<Database size={24} />} title="Saved DB Connections" value={stats.databases || 0} color="#38bdf8" link="/dashboard/databases" />
        <StatCard icon={<Ticket size={24} />} title="Total Support Tickets" value={stats.tickets} color="#a855f7" link="/dashboard/tickets" />
        <div className="glass-panel glass-card stat-card">
          <div className="stat-card-icon" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
            <Cpu size={24} />
          </div>
          <div className="stat-card-info">
            <span className="stat-card-label">Bot Engine Status</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
              <span className="badge badge-success">Online</span>
              <span style={{ color: '#64748b', fontSize: '13px' }}>
                <Activity size={13} style={{ marginRight: '4px', display: 'inline' }} />
                Running
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Sections */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '32px' }}>
        {/* Recent Bot Activity logs */}
        <div className="glass-panel" style={{ padding: '32px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <ClipboardList size={22} style={{ color: '#38bdf8' }} />
              <h2 style={{ fontSize: '20px', fontWeight: 700 }}>Recent Bot Activity Logs</h2>
            </div>
            <Link href="/dashboard/settings" style={{ fontSize: '14px', color: '#38bdf8', fontWeight: 600 }}>
              View Settings &rarr;
            </Link>
          </div>

          {logs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px', color: '#94a3b8' }}>
              <Clock size={36} style={{ margin: '0 auto 12px', opacity: 0.4, color: '#64748b' }} />
              <p style={{ fontSize: '14px' }}>No activity logs found yet. Active logs will appear here.</p>
            </div>
          ) : (
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>Server</th>
                    <th>Type</th>
                    <th>Level</th>
                    <th>Message</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.slice(0, 10).map((log) => (
                    <tr key={log.id}>
                      <td style={{ color: '#94a3b8', fontSize: '13px', fontFamily: 'var(--font-mono)' }}>
                        {new Date(log.created_at).toLocaleString()}
                      </td>
                      <td style={{ fontWeight: 600 }}>
                        {log.guild_name ? log.guild_name : <span style={{ color: '#64748b' }}>System</span>}
                      </td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: '14px' }}>
                        {log.event_type}
                      </td>
                      <td>
                        <span 
                          style={{ 
                            fontSize: '11px', 
                            fontWeight: 700, 
                            textTransform: 'uppercase', 
                            color: getLogLevelColor(log.level),
                            background: `${getLogLevelColor(log.level)}15`,
                            padding: '3px 8px',
                            borderRadius: '4px',
                            border: `1px solid ${getLogLevelColor(log.level)}25`
                          }}
                        >
                          {log.level}
                        </span>
                      </td>
                      <td style={{ color: '#cbd5e1' }}>
                        {log.message}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
      </PageContainer>
  );
}
