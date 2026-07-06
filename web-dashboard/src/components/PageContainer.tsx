import React from 'react';
import { RefreshCw } from 'lucide-react';

interface PageContainerProps {
  title: string;
  subtitle?: string;
  extra?: React.ReactNode;
  loading?: boolean;
  children: React.ReactNode;
}

export default function PageContainer({ title, subtitle, extra, loading, children }: PageContainerProps) {
  if (loading) {
    return (
      <div className="page-container">
        <div className="page-container-content">
          <div className="page-loading">
            <RefreshCw className="animate-spin" size={32} style={{ color: '#38bdf8' }} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">{title}</h1>
          {subtitle && <p className="page-subtitle">{subtitle}</p>}
        </div>
        {extra && <div className="page-extra">{extra}</div>}
      </div>
      <div className="page-container-content">
        {children}
      </div>
    </div>
  );
}
