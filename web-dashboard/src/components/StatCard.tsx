'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import CountUp from 'react-countup';

interface StatCardProps {
  icon: React.ReactNode;
  title: string;
  value: number;
  color?: string;
  link?: string;
  loading?: boolean;
}

export default function StatCard({ icon, title, value, color = '#38bdf8', link, loading }: StatCardProps) {
  const router = useRouter();

  return (
    <div
      className="bg-bg-card rounded-xl stat-card"
      onClick={() => link && router.push(link)}
      style={{ cursor: link ? 'pointer' : 'default' }}
    >
      <div className="stat-card-icon" style={{ background: `${color}15`, color }}>
        {icon}
      </div>
      <div className="stat-card-info">
        <span className="stat-card-label">{title}</span>
        <h3 className="stat-card-value">
          {loading ? (
            <span className="stat-card-skeleton" />
          ) : (
            <CountUp start={0} end={value} duration={2.5} useEasing useGrouping />
          )}
        </h3>
      </div>
    </div>
  );
}
