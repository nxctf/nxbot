'use client';

import React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { LogOut, ChevronRight, Home } from 'lucide-react';

const breadcrumbMap: Record<string, string> = {
  '/dashboard': 'Overview',
  '/dashboard/servers': 'Servers',
  '/dashboard/databases': 'Supabase Configs',
  '/dashboard/tickets': 'Tickets',
  '/dashboard/settings': 'Settings & Logs',
};

function getBreadcrumbs(pathname: string): { label: string; href: string }[] {
  const crumbs: { label: string; href: string }[] = [];
  const parts = pathname.split('/').filter(Boolean);

  if (parts.length === 0) return [{ label: 'Dashboard', href: '/dashboard' }];

  let accumulated = '';
  for (const part of parts) {
    accumulated += '/' + part;
    const label = breadcrumbMap[accumulated] || part.charAt(0).toUpperCase() + part.slice(1);
    crumbs.push({ label, href: accumulated });
  }

  return crumbs;
}

interface HeaderProps {
  username: string;
}

export default function Header({ username }: HeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const breadcrumbs = getBreadcrumbs(pathname);
  const [dropdownOpen, setDropdownOpen] = React.useState(false);

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

  return (
    <header className="dashboard-header">
      <div className="header-left">
        <nav className="header-breadcrumb">
          {breadcrumbs.map((crumb, i) => (
            <React.Fragment key={crumb.href}>
              {i > 0 && <ChevronRight size={14} className="breadcrumb-sep" />}
              <button
                onClick={() => router.push(crumb.href)}
                className={`breadcrumb-item ${i === breadcrumbs.length - 1 ? 'active' : ''}`}
              >
                {i === 0 && <Home size={14} style={{ marginRight: '4px' }} />}
                {crumb.label}
              </button>
            </React.Fragment>
          ))}
        </nav>
      </div>

      <div className="header-right">
        <div className="header-avatar-wrapper">
          <button
            className="header-avatar-btn"
            onClick={() => setDropdownOpen(!dropdownOpen)}
            onBlur={() => setTimeout(() => setDropdownOpen(false), 150)}
          >
            <div className="header-avatar">
              <img
                src="https://raw.githubusercontent.com/nxctf/assets/refs/heads/main/logo/logo-no-bg.svg"
                alt="NXCTF"
                className="header-avatar-img"
              />
            </div>
          </button>

          {dropdownOpen && (
            <div className="header-dropdown">
              <div className="header-dropdown-header">
                <div className="header-avatar small">
                  <img
                    src="https://raw.githubusercontent.com/nxctf/assets/refs/heads/main/logo/logo-no-bg.svg"
                    alt="NXCTF"
                    className="header-avatar-img"
                  />
                </div>
                <div>
                  <div className="header-dropdown-name">NXBot Dashboard</div>
                  <div className="header-dropdown-role">v0.1.0</div>
                </div>
              </div>
              <div className="header-dropdown-divider" />
              <button onClick={handleLogout} className="header-dropdown-item danger">
                <LogOut size={15} />
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
