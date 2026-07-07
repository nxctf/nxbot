'use client';

import React from 'react';

export interface TabItem {
  value: string;
  label: string;
  icon: React.ReactNode;
}

interface TabSidebarProps {
  tabs: TabItem[];
  activeTab: string;
  onTabChange: (value: string) => void;
  className?: string;
}

export default function TabSidebar({ tabs, activeTab, onTabChange, className }: TabSidebarProps) {
  return (
    <div
      className={
        'sticky top-[120px] z-30 w-48 shrink-0 flex flex-col gap-1.5 bg-slate-900/40 backdrop-blur-md border border-border-color rounded-2xl p-2.5 shadow-xl' +
        (className ? ' ' + className : '')
      }
    >
      {tabs.map((tab) => (
        <button
          key={tab.value}
          type="button"
          onClick={() => onTabChange(tab.value)}
          className={`flex items-center gap-3 px-3.5 py-2.5 text-sm font-semibold rounded-xl border transition-all ${
            activeTab === tab.value
              ? 'bg-primary text-slate-950 border-primary shadow-lg shadow-primary/10'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
          }`}
        >
          <span className={activeTab === tab.value ? '' : 'text-slate-500'}>
            {tab.icon}
          </span>
          {tab.label}
        </button>
      ))}
    </div>
  );
}
