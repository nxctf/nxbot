import React from 'react';

const variantStyles = {
  emerald: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  cyan: 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20',
  amber: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  violet: 'bg-violet-500/10 text-violet-400 border border-violet-500/20',
  purple: 'bg-purple-500/10 text-purple-400 border border-purple-500/20',
  rose: 'bg-rose-500/10 text-rose-400 border border-rose-500/20',
  slate: 'bg-slate-800/40 text-slate-500 border border-border-color',
};

interface TagProps {
  icon?: React.ReactNode;
  children: React.ReactNode;
  variant?: keyof typeof variantStyles;
  className?: string;
  size?: 'sm' | 'md';
}

export default function Tag({ icon, children, variant = 'slate', className = '', size = 'md' }: TagProps) {
  const sizeClasses = size === 'sm'
    ? 'px-1.5 py-0.5 text-[10px] font-bold'
    : 'px-2 py-0.5 text-xs font-semibold';

  return (
    <span className={`inline-flex items-center gap-1 ${sizeClasses} rounded ${variantStyles[variant]} ${className}`}>
      {icon}
      {children}
    </span>
  );
}
