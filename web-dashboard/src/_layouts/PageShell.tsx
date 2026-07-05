import React from 'react';

interface PageShellProps {
  children: React.ReactNode;
}

export function PageShell({ children }: PageShellProps) {
  return (
    <div className="min-h-screen flex flex-col bg-bg-dark text-slate-100 antialiased font-sans">
      {children}
    </div>
  );
}
