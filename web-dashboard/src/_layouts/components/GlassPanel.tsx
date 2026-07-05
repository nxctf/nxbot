import React from 'react';
import { SURFACE_GLASS_PANEL } from '@/lib/styles/surfaces';

interface GlassPanelProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function GlassPanel({ children, className = '', ...props }: GlassPanelProps) {
  return (
    <div className={`${SURFACE_GLASS_PANEL} ${className}`} {...props}>
      {children}
    </div>
  );
}
export default GlassPanel;
