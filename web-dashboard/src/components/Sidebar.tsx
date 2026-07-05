'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, Server, Ticket, Settings, LogOut, Terminal, Database } from 'lucide-react';

interface SidebarProps {
  username: string;
}

export default function Sidebar({ username }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      const res = await fetch('/api/auth/logout', { method: 'POST' });
      if (res.ok) {
        router.push('/login');
      }
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const navItems = [
    { name: 'Overview', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Servers', href: '/dashboard/servers', icon: Server },
    { name: 'Supabase Configs', href: '/dashboard/databases', icon: Database },
    { name: 'Tickets', href: '/dashboard/tickets', icon: Ticket },
    { name: 'Settings & Logs', href: '/dashboard/settings', icon: Settings },
  ];

  return (
    <aside className="sidebar">
      <div>
        <div className="sidebar-logo" style={{ marginBottom: '40px' }}>
          <Terminal size={28} style={{ color: '#38bdf8' }} />
          <span>NXBot</span>
        </div>

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
                <Icon size={20} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div style={{ 
          padding: '12px 16px', 
          background: 'rgba(30, 41, 59, 0.3)', 
          border: '1px solid var(--border-color)', 
          borderRadius: '8px',
          fontSize: '14px',
          display: 'flex',
          flexDirection: 'column',
          gap: '2px'
        }}>
          <span style={{ color: 'var(--muted)', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase' }}>Admin User</span>
          <span style={{ color: '#38bdf8', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            @{username}
          </span>
        </div>

        <button 
          onClick={handleLogout} 
          className="btn btn-secondary" 
          style={{ justifyContent: 'flex-start', padding: '12px 16px', width: '100%' }}
        >
          <LogOut size={20} />
          <span>Disconnect</span>
        </button>
      </div>
    </aside>
  );
}
