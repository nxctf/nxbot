import React from 'react';

interface StatusBadgeProps {
  status: 'success' | 'danger' | 'warning' | 'info';
  children: React.ReactNode;
}

export function StatusBadge({ status, children }: StatusBadgeProps) {
  const styles = {
    success: "bg-accent-green/10 text-accent-green border border-accent-green/20",
    danger: "bg-accent-red/10 text-accent-red border border-accent-red/20",
    warning: "bg-accent-yellow/10 text-accent-yellow border border-accent-yellow/20",
    info: "bg-primary/10 text-primary border border-primary/20",
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-1.5 rounded-full text-xs font-bold ${styles[status]}`}>
      {children}
    </span>
  );
}
export default StatusBadge;
