import React from 'react';
import { Search, X, ChevronDown } from 'lucide-react';
import { FORM_SELECT_CLASS, FORM_INPUT_CLASS } from '@/lib/styles/surfaces';

interface FilterToolbarProps {
  children?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

export function FilterToolbar({ children, actions, className = '' }: FilterToolbarProps) {
  return (
    <div className={`glass-panel p-5 flex flex-wrap gap-4 items-center ${className}`}>
      {children && <div className="flex flex-wrap items-center gap-4 flex-1">{children}</div>}
      {actions && <div className="flex items-center gap-3 ml-auto">{actions}</div>}
    </div>
  );
}

interface FilterSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  options: { value: string; label: string }[];
  placeholder?: string;
}

export function FilterSelect({ options, placeholder, className = '', value, ...props }: FilterSelectProps) {
  const isActive = value && value !== '';
  return (
    <div className="relative min-w-[160px]">
      <select
        className={`${FORM_SELECT_CLASS} ${isActive ? 'border-primary/50' : ''} text-sm ${className}`}
        value={value}
        {...props}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
        <ChevronDown size={16} />
      </div>
    </div>
  );
}

interface FilterInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  onClear?: () => void;
  className?: string;
}

export function FilterInput({ value, onChange, placeholder = 'Search...', onClear, className = '' }: FilterInputProps) {
  const isActive = value && value !== '';
  return (
    <div className="relative min-w-[200px]">
      <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
        <Search size={16} />
      </div>
      <input
        className={`${FORM_INPUT_CLASS} ${isActive ? 'border-primary/50' : ''} pl-10 pr-8 text-sm ${className}`}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {isActive && onClear && (
        <button
          onClick={onClear}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}
