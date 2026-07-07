import React from 'react';
import { Database, ShieldCheck, KeyRound, ShieldAlert, ShieldOff, Edit, Trash2 } from 'lucide-react';
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
        <div className="w-16 h-16 rounded-full bg-primary/10 border border-primary/20 text-primary flex items-center justify-center">
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
    <div className="grid grid-cols-1 gap-3">
      {conns.map((conn) => {
        const isTesting = testConnLoading[conn.id];
        const status = testConnStatus[conn.id] || {};

        return (
          <div
            key={conn.id}
            className="bg-bg-card rounded-xl p-5 flex items-center gap-4"
          >
            <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shrink-0">
              <Database size={20} />
            </div>

            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-bold text-slate-100 truncate">{conn.name}</h3>
              <p className="text-[11px] text-slate-500 font-mono truncate">{conn.supabase_url}</p>
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {conn.supabase_login_email && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                    <ShieldCheck size={10} /> {conn.supabase_login_email}
                  </span>
                )}
                {conn.supabase_access_token ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-cyan-400 bg-cyan-400/10 border border-cyan-400/20 px-2 py-0.5 rounded-full">
                    <KeyRound size={10} /> Token Active
                  </span>
                ) : conn.supabase_login_email ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
                    <ShieldAlert size={10} /> Re-auth Needed
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-500 bg-slate-800/40 border border-border-color px-2 py-0.5 rounded-full">
                    <ShieldOff size={10} /> Anonymous
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <div className="flex items-center gap-1.5">
                {status.success && <span className="text-[11px] text-emerald-400 font-bold">✓</span>}
                {status.error && <span className="text-[11px] text-rose-400 font-bold">✗</span>}
                <Button variant="secondary" size="sm" onClick={() => onTestClick(conn)} loading={isTesting}
                  className="text-[11px] px-2.5 py-1.5">Test</Button>
              </div>

              {conn.supabase_login_email && (
                <Button variant="secondary" size="sm" onClick={() => onReAuthClick(conn)}
                  className="text-[11px] px-2.5 py-1.5 border-cyan-400/20 text-cyan-400 hover:bg-cyan-400/10">
                  <KeyRound size={11} className="mr-1" />Auth
                </Button>
              )}

              <Button variant="secondary" size="sm" onClick={() => onEditClick(conn)}
                className="p-1.5 border-border-color text-slate-400 hover:text-slate-200">
                <Edit size={13} />
              </Button>
              <Button variant="secondary" size="sm" onClick={() => onDeleteClick(conn.id)}
                className="p-1.5 border-rose-500/20 text-rose-400/80 hover:bg-rose-500/10 hover:text-rose-400">
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
