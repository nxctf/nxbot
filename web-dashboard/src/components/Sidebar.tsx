'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Server, Ticket, Settings, Database, ChevronRight, Code2, Activity, WifiOff, Loader2 } from 'lucide-react';

interface BotStatus {
  status: 'online' | 'offline' | 'error' | 'starting';
  error?: string | null;
  username?: string | null;
  guilds?: number;
  updatedAt?: string;
}

export default function Sidebar() {
  const pathname = usePathname();
  const [bot, setBot] = useState<BotStatus | null>(null);

  useEffect(() => {
    const fetchBot = async () => {
      try {
        const res = await fetch('/api/settings/bot-status');
        if (res.ok) setBot(await res.json());
      } catch {}
    };
    fetchBot();
    const interval = setInterval(fetchBot, 10000);
    return () => clearInterval(interval);
  }, []);

  const navItems = [
    { name: 'Overview', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Servers', href: '/dashboard/servers', icon: Server },
    { name: 'Supabase Configs', href: '/dashboard/databases', icon: Database },
    { name: 'Tickets', href: '/dashboard/tickets', icon: Ticket },
    { name: 'Settings & Logs', href: '/dashboard/settings', icon: Settings },
  ];

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <img
          src="https://raw.githubusercontent.com/nxctf/assets/refs/heads/main/logo/logo-no-bg.svg"
          alt="NXCTF"
          className="sidebar-logo-img"
        />
        <span>NXBot</span>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`nav-link ${isActive ? 'active' : ''}`}
            >
              <span className="nav-link-icon">
                <Icon size={18} />
              </span>
              <span className="nav-link-label">{item.name}</span>
              {isActive && <ChevronRight size={14} className="nav-link-arrow" />}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="sidebar-footer">
        {bot && (
          <div className="sidebar-bot-card">
            <div className={`sidebar-bot-indicator ${bot.status}`} />
            <div className="sidebar-bot-card-info">
              <span className="sidebar-bot-card-name" title={bot.username || ''}>
                {bot.username || 'Unknown Bot'}
              </span>
              <span className="sidebar-bot-card-meta">
                {bot.status === 'online' ? (
                  <><Activity size={10} /> Online &middot; {bot.guilds ?? 0} guilds</>
                ) : bot.status === 'starting' ? (
                  <><Loader2 size={10} className="spin" /> Starting...</>
                ) : (
                  <><WifiOff size={10} /> {bot.status}</>
                )}
              </span>
            </div>
          </div>
        )}

        <div className="sidebar-links">
          <a href="https://github.com/nxctf" target="_blank" rel="noopener noreferrer" className="sidebar-link-item" title="GitHub Organization">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
            <span>nxctf org</span>
          </a>
          <a href="https://github.com/nxctf/nxbot" target="_blank" rel="noopener noreferrer" className="sidebar-link-item" title="Repository">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
            <span>nxbot repo</span>
          </a>
          <a href="https://github.com/ariafatah0711" target="_blank" rel="noopener noreferrer" className="sidebar-link-item" title="Creator">
            <Code2 size={14} />
            <span>Aria Fatah</span>
          </a>
        </div>
      </div>
    </aside>
  );
}
