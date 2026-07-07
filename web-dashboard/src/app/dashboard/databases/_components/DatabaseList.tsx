import React from 'react';
import { Database, ShieldCheck, KeyRound, ShieldAlert, ShieldOff, Cloud, Trash2 } from 'lucide-react';
import Button from '@/components/Button';
import { Connection } from '../_types';

interface DatabaseListProps {
  conns: Connection[];
  loading: boolean;
  testConnLoading: Record<string, boolean>;
  testConnStatus: Record<string, { success?: string; error?: string }>;
  onAddClick: () => void;
  onEditClick: (conn: Connection) => void;
  onDeleteClick: (id: string) => void;
  onTestClick: (conn: Connection) => void;
  onReAuthClick: (conn: Connection) => void;
}

export function DatabaseList({
  conns,
  loading,
  testConnLoading,
  testConnStatus,
  onAddClick,
  onEditClick,
  onDeleteClick,
  onTestClick,
  onReAuthClick,
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
        const status = testConnStatus[conn.id] || {};

        return (
          <div
            key={conn.id}
            onClick={() => onEditClick(conn)}
            className="bg-bg-card rounded-xl p-5 flex flex-col gap-4 cursor-pointer transition-all hover:bg-slate-800/30 duration-200"
          >
            {/* Header: icon + name + url */}
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <Database size={20} />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-bold text-slate-100 truncate">{conn.name}</h3>
                <p className="text-[11px] text-slate-500 font-mono truncate">{conn.supabase_url}</p>
              </div>
            </div>

            {/* Tags */}
            <div className="flex flex-wrap gap-1.5">
              {conn.supabase_login_email && (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                  <ShieldCheck size={10} /> {conn.supabase_login_email}
                </span>
              )}
              {conn.supabase_access_token ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-cyan-400 bg-cyan-400/10 px-2 py-0.5 rounded-full">
                  <KeyRound size={10} /> Token Active
                </span>
              ) : conn.supabase_login_email ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full">
                  <ShieldAlert size={10} /> Re-auth
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-500 bg-slate-800/40 px-2 py-0.5 rounded-full">
                  <ShieldOff size={10} /> Anon
                </span>
              )}
              {conn.supabase_turnstile_site_key ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-violet-400 bg-violet-500/10 px-2 py-0.5 rounded-full">
                  <Cloud size={10} /> Turnstile
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-600 bg-slate-800/30 px-2 py-0.5 rounded-full">
                  No Turnstile
                </span>
              )}
            </div>

            {/* Actions row */}
            <div className="flex items-center gap-2 pt-2 border-t border-border-color/30">
              <div className="flex items-center gap-1.5">
                {status.success && <span className="text-[11px] text-emerald-400 font-bold">✓</span>}
                {status.error && <span className="text-[11px] text-rose-400 font-bold">✗</span>}
                <Button variant="secondary" size="sm" onClick={(e) => { e.stopPropagation(); onTestClick(conn); }}
                  className="text-[11px] px-2.5 py-1.5">Test</Button>
              </div>
              {conn.supabase_login_email && !conn.supabase_access_token && (
                <Button variant="secondary" size="sm" onClick={(e) => { e.stopPropagation(); onReAuthClick(conn); }}
                  className="text-[11px] px-2.5 py-1.5 border-cyan-400/20 text-cyan-400 hover:bg-cyan-400/10">
                  <KeyRound size={11} className="mr-1" />Auth
                </Button>
              )}
              <Button variant="secondary" size="sm" onClick={(e) => { e.stopPropagation(); onDeleteClick(conn.id); }}
                className="ml-auto p-1.5 border-rose-500/20 text-rose-400/80 hover:bg-rose-500/10 hover:text-rose-400">
                <Trash2 size={13} />
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
export default DatabaseList;
