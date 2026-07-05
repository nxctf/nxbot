'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, Server, Ticket, Settings, LogOut, Terminal, Database, ChevronRight } from 'lucide-react';

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
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">
          <Terminal size={20} />
        </div>
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
        <div className="sidebar-user">
          <div className="sidebar-user-avatar">
            {username.charAt(0).toUpperCase()}
          </div>
          <div className="sidebar-user-info">
            <span className="sidebar-user-role">Administrator</span>
            <span className="sidebar-user-name">@{username}</span>
          </div>
        </div>

        <button onClick={handleLogout} className="sidebar-logout-btn">
          <LogOut size={16} />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
