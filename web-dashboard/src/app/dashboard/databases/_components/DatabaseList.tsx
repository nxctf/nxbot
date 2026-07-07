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
      <div className="glass-panel p-16 text-center text-slate-400">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-primary mx-auto mb-4" />
        <p>Fetching saved database connections...</p>
      </div>
    );
  }

  if (conns.length === 0) {
    return (
      <div className="glass-panel py-16 px-6 text-center text-slate-400 flex flex-col items-center justify-center">
        <div className="flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 border border-primary/20 text-primary mb-6 shadow-[0_0_20px_rgba(56,189,248,0.15)]">
          <Database size={36} />
        </div>
        <h2 className="text-xl text-slate-100 mb-2 font-bold">No Database Connections Configured</h2>
        <p className="text-sm max-w-md mx-auto mb-6 leading-relaxed">
          Create a database connection first so you can link it to your Discord servers.
        </p>
        <Button onClick={onAddClick}>
          Add Connection Now
        </Button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4">
      {conns.map((conn) => {
        const isTesting = testConnLoading[conn.id];
        const status = testConnStatus[conn.id] || {};

        return (
          <div 
            key={conn.id} 
            className="glass-panel p-6 flex flex-col md:flex-row md:justify-between md:items-center gap-6"
          >
            <div className="flex items-start gap-4">
              <div className="p-3 bg-primary/10 border border-primary/20 rounded-xl text-primary shrink-0">
                <Database size={24} />
              </div>
              <div className="space-y-1.5 min-w-0">
                <h3 className="text-base font-bold text-slate-100 truncate">
                  {conn.name}
                </h3>
                <p className="text-xs text-slate-400 font-mono break-all leading-relaxed">
                  {conn.supabase_url}
                </p>
                
                <div className="flex flex-wrap gap-2 pt-1">
                  {conn.supabase_login_email && (
                    <div className="inline-flex items-center gap-1 text-[10px] font-bold text-accent-green bg-accent-green/10 border border-accent-green/20 px-2.5 py-0.5 rounded-full">
                      <ShieldCheck size={11} />
                      <span>Auth: {conn.supabase_login_email}</span>
                    </div>
                  )}

                  {conn.supabase_access_token ? (
                    <div className="inline-flex items-center gap-1 text-[10px] font-bold text-cyan-400 bg-cyan-400/10 border border-cyan-400/20 px-2.5 py-0.5 rounded-full">
                      <KeyRound size={11} />
                      <span>Session Token Active</span>
                    </div>
                  ) : conn.supabase_login_email ? (
                    <div className="inline-flex items-center gap-1 text-[10px] font-bold text-accent-yellow bg-accent-yellow/10 border border-accent-yellow/20 px-2.5 py-0.5 rounded-full">
                      <ShieldAlert size={11} />
                      <span>Re-auth Required</span>
                    </div>
                  ) : (
                    <div className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-400 bg-slate-800/40 border border-border-color px-2.5 py-0.5 rounded-full">
                      <ShieldOff size={11} />
                      <span>Anonymous Mode</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 justify-end md:justify-start">
              {/* Test Connection Actions */}
              <div className="flex items-center gap-2">
                {status.success && <span className="text-xs text-accent-green font-bold mr-1">✓ {status.success}</span>}
                {status.error && <span className="text-xs text-accent-red font-bold mr-1">✗ {status.error}</span>}
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => onTestClick(conn)}
                  loading={isTesting}
                  className="text-xs py-1.5"
                >
                  Test Connection
                </Button>
              </div>

              {/* Re-Auth Action */}
              {conn.supabase_login_email && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => onReAuthClick(conn)}
                  className="text-xs py-1.5 border-cyan-400/20 text-cyan-400 hover:bg-cyan-400/10 hover:text-cyan-300"
                  title="Re-authenticate to generate fresh session tokens"
                >
                  <KeyRound size={12} className="mr-1.5" />
                  Re-auth
                </Button>
              )}

              {/* Edit Action */}
              <Button
                variant="secondary"
                size="sm"
                onClick={() => onEditClick(conn)}
                className="p-2 border-border-color text-slate-400 hover:text-slate-200"
                title="Edit Connection"
              >
                <Edit size={14} />
              </Button>

              {/* Delete Action */}
              <Button
                variant="secondary"
                size="sm"
                onClick={() => onDeleteClick(conn.id)}
                className="p-2 border-accent-red/20 text-accent-red/80 hover:bg-accent-red/10 hover:text-accent-red"
                title="Delete Connection"
              >
                <Trash2 size={14} />
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
export default DatabaseList;
