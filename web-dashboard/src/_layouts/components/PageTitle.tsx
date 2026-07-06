import React from 'react';

interface PageTitleProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
}

export function PageTitle({ title, description, icon }: PageTitleProps) {
  return (
    <div className="mb-8">
      <div className="flex items-center gap-3">
        {icon && <div className="text-primary shrink-0">{icon}</div>}
        <h1 className="text-3xl font-extrabold text-slate-100 tracking-tight">{title}</h1>
      </div>
      {description && <p className="mt-2 text-sm text-slate-400 font-medium">{description}</p>}
    </div>
  );
}
export default PageTitle;
