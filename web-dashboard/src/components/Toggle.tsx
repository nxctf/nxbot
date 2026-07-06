import React from 'react';

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  label?: string;
  description?: string;
}

export function Toggle({ checked, onChange, disabled = false, label, description }: ToggleProps) {
  return (
    <div className="flex items-center justify-between gap-4 py-1">
      {(label || description) && (
        <div className="flex flex-col gap-0.5 min-w-0">
          {label && (
            <span className="font-semibold text-sm text-slate-200 leading-snug">
              {label}
            </span>
          )}
          {description && (
            <span className="text-xs text-slate-400 leading-relaxed">
              {description}
            </span>
          )}
        </div>
      )}

      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={[
          'relative inline-flex shrink-0 cursor-pointer rounded-full',
          'transition-all duration-250 outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
          'disabled:opacity-40 disabled:cursor-not-allowed',
          checked
            ? 'bg-primary shadow-md shadow-primary/30 w-12 h-6'
            : 'bg-slate-700 border border-slate-600 w-12 h-6',
        ].join(' ')}
      >
        {/* Track label: ON/OFF */}
        <span className={[
          'absolute inset-0 flex items-center justify-end pr-1.5 text-[9px] font-bold leading-none tracking-wider transition-all duration-200',
          checked ? 'text-slate-900 opacity-80' : 'opacity-0'
        ].join(' ')}>
          ON
        </span>

        {/* Thumb */}
        <span
          className={[
            'absolute top-0.5 inline-block h-5 w-5 rounded-full shadow-md transition-all duration-200',
            checked
              ? 'translate-x-6 bg-slate-950'
              : 'translate-x-0.5 bg-slate-300',
          ].join(' ')}
        />
      </button>
    </div>
  );
}

export default Toggle;
