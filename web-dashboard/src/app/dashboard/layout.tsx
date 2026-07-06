import { getSessionUser, isPlatformSetup } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import BotStatusBanner from '@/components/BotStatusBanner';
import React from 'react';

export const dynamic = 'force-dynamic';

export default async function DashboardLayout({

  children,
}: {
  children: React.ReactNode;
}) {
  // 1. Force setup if platform is not setup
  if (!isPlatformSetup()) {
    redirect('/setup');
  }

  // 2. Protect dashboard path with auth session
  const user = await getSessionUser();
  if (!user) {
    redirect('/login');
  }

  return (
    <div className="layout-container">
      <Sidebar username={user.username} />
      <main className="main-content">
        <BotStatusBanner />
        {children}
      </main>
    </div>
  );
}
