import type { Metadata } from 'next';
import './globals.css';
import React from 'react';

export const metadata: Metadata = {
  title: 'NXBot Dashboard — Platform Manager',
  description: 'Cybersecurity CTF Discord Bot & Supabase Integration Panel',
  icons: {
    icon: 'https://raw.githubusercontent.com/nxctf/assets/refs/heads/main/logo/logo-no-bg.svg',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}
