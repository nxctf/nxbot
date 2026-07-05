import React from 'react';
import { FORM_INPUT_CLASS } from '@/lib/styles/surfaces';

interface GlassInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
}

export const GlassInput = React.forwardRef<HTMLInputElement, GlassInputProps>(
  ({ className = '', error, ...props }, ref) => {
    return (
      <div className="w-full">
        <input
          ref={ref}
          className={`${FORM_INPUT_CLASS} ${error ? 'border-accent-red focus:border-accent-red focus:shadow-red-500/10' : ''} ${className}`}
          {...props}
        />
        {error && <span className="text-xs text-accent-red mt-1.5 block">{error}</span>}
      </div>
    );
  }
);

GlassInput.displayName = 'GlassInput';
export default GlassInput;
