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
    <div className="flex items-center justify-between py-2.5">
      {(label || description) && (
        <div className="flex flex-col gap-0.5 pr-4 flex-1">
          {label && <span className="font-semibold text-[15px] text-slate-100">{label}</span>}
          {description && <span className="text-xs text-slate-400">{description}</span>}
        </div>
      )}
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`
          relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent 
          transition-colors duration-200 cubic-bezier(0.4, 0, 0.2, 1) outline-none
          ${checked ? 'bg-primary shadow-lg shadow-primary/30' : 'bg-slate-700/60'}
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'opacity-100'}
        `}
      >
        <span
          className={`
            pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-md
            transform transition-transform duration-200 cubic-bezier(0.4, 0, 0.2, 1)
            ${checked ? 'translate-x-5' : 'translate-x-0'}
          `}
        />
      </button>
    </div>
  );
}

export default Toggle;
