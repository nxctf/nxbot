import React from 'react';
import { RefreshCw } from 'lucide-react';

interface LoadingSpinnerProps {
  size?: number;
  message?: string;
}

export function LoadingSpinner({ size = 32, message }: LoadingSpinnerProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 gap-3 text-primary">
      <RefreshCw className="animate-spin" size={size} />
      {message && <span className="text-sm text-slate-400 font-medium">{message}</span>}
    </div>
  );
}
export default LoadingSpinner;
