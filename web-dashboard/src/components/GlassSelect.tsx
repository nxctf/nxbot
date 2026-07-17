import React from 'react';
import { FORM_SELECT_CLASS } from '@/lib/styles/surfaces';
import { ChevronDown } from 'lucide-react';

interface GlassSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  error?: string;
}

export const GlassSelect = React.forwardRef<HTMLSelectElement, GlassSelectProps>(
  ({ children, className = '', error, style, ...props }, ref) => {
    return (
      <div className="w-full relative">
        <select
          ref={ref}
          className={`${FORM_SELECT_CLASS} pr-11 ${error ? 'border-accent-red focus:border-accent-red' : ''} ${className}`}
          style={{ WebkitAppearance: 'none', MozAppearance: 'none', appearance: 'none', ...style }}
          {...props}
        >
          {children}
        </select>
        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
          <ChevronDown size={18} />
        </div>
        {error && <span className="text-xs text-accent-red mt-1.5 block">{error}</span>}
      </div>
    );
  }
);

GlassSelect.displayName = 'GlassSelect';
export default GlassSelect;
