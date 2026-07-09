import React from 'react';
import { Database, ShieldCheck, KeyRound, ShieldAlert, ShieldOff, Cloud } from 'lucide-react';
import Button from '@/components/Button';
import Tag from '@/components/Tag';
import { Connection } from '../_types';

interface DatabaseListProps {
  conns: Connection[];
  loading: boolean;
  onAddClick: () => void;
  onEditClick: (conn: Connection) => void;
  onDeleteClick: (id: string) => void;
}

export function DatabaseList({
  conns,
  loading,
  onAddClick,
  onEditClick,
  onDeleteClick,
}: DatabaseListProps) {
  if (loading) {
    return (
      <div className="bg-bg-card rounded-xl py-16 text-center text-slate-400">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-primary mx-auto mb-4" />
        <p className="text-sm">Loading connections...</p>
      </div>
    );
  }

  if (conns.length === 0) {
    return (
      <div className="bg-bg-card rounded-xl py-16 text-center text-slate-400 flex flex-col items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center">
          <Database size={28} />
        </div>
        <div>
          <h2 className="text-base font-bold text-slate-100 mb-1">No Connections</h2>
          <p className="text-sm">Add a Supabase connection to link with servers.</p>
        </div>
        <Button onClick={onAddClick} size="sm">Add Connection</Button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {conns.map((conn) => {
        return (
          <div
            key={conn.id}
            onClick={() => onEditClick(conn)}
            className="bg-bg-card rounded-xl p-5 flex flex-col gap-3 cursor-pointer transition-all hover:bg-slate-800/30 duration-200"
          >
            {/* Header: icon + name + url */}
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <Database size={18} />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-bold text-slate-100 truncate">{conn.name}</h3>
                <p className="text-[11px] text-slate-500 font-mono truncate">{conn.supabase_url}</p>
              </div>
            </div>

            {/* Tags compact row */}
            <div className="flex flex-wrap items-center gap-1.5 mt-auto">
              {conn.supabase_login_email ? (
                <Tag icon={<ShieldCheck size={10} />} variant="emerald">{conn.supabase_login_email}</Tag>
              ) : (
                <Tag icon={<ShieldOff size={10} />} variant="slate">Anon</Tag>
              )}
              {conn.supabase_access_token ? (
                <Tag icon={<KeyRound size={10} />} variant="cyan">Token</Tag>
              ) : conn.supabase_login_email ? (
                <Tag icon={<ShieldAlert size={10} />} variant="amber">Re-auth</Tag>
              ) : null}
              {conn.supabase_turnstile_site_key ? (
                <Tag icon={<Cloud size={10} />} variant="violet">Turnstile</Tag>
              ) : (
                <Tag variant="slate">No Turnstile</Tag>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
export default DatabaseList;
