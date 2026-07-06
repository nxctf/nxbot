import React from 'react';
import { RefreshCw } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  const baseStyle = "inline-flex items-center justify-center font-semibold rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shrink-0";
  
  const variants = {
    primary: "bg-primary text-slate-950 hover:bg-primary-hover shadow-lg shadow-primary/10 active:scale-[0.98]",
    secondary: "bg-slate-800 text-slate-200 border border-border-color hover:bg-slate-700/80 hover:border-border-hover active:scale-[0.98]",
    danger: "bg-accent-red text-slate-100 hover:bg-red-600 shadow-lg shadow-red-600/10 active:scale-[0.98]",
    ghost: "bg-transparent text-slate-400 hover:bg-slate-800/40 hover:text-slate-200",
  };

  const sizes = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-4 py-2.5 text-sm",
    lg: "px-6 py-3.5 text-base",
  };

  return (
    <button
      disabled={disabled || loading}
      className={`${baseStyle} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {loading && <RefreshCw className="animate-spin mr-2 h-4 w-4 shrink-0" />}
      {children}
    </button>
  );
}
export default Button;
