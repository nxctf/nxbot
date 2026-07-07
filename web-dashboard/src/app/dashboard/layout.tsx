import { getSessionUser, isPlatformSetup } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import BotStatusBanner from '@/components/BotStatusBanner';
import React from 'react';

export const dynamic = 'force-dynamic';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!isPlatformSetup()) {
    redirect('/login');
  }

  const user = await getSessionUser();
  if (!user) {
    redirect('/login');
  }

  return (
    <div className="layout-container">
      <Sidebar username={user.username} />
      <Header username={user.username} />
      <main className="main-content">
        <BotStatusBanner />
        {children}
      </main>
    </div>
  );
}
