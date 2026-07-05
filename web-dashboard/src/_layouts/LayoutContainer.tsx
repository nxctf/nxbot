import React from 'react';

interface LayoutContainerProps {
  children: React.ReactNode;
  className?: string;
}

export function LayoutContainer({ children, className = '' }: LayoutContainerProps) {
  return (
    <div className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full ${className}`}>
      {children}
    </div>
  );
}
