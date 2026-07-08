'use client';

import React, { useState, useEffect } from 'react';
import { Plus, AlertTriangle, Check } from 'lucide-react';
import Script from 'next/script';
import { useRouter } from 'next/navigation';
import ConfirmDialog from '@/components/ConfirmDialog';
import { Connection } from './_types';
import DatabaseList from './_components/DatabaseList';


export default function DatabasesPage() {
  const router = useRouter();

  const [conns, setConns] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Alert/Status states
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Delete confirmation states
  const [deleteConnId, setDeleteConnId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    fetchConnections();
  }, []);

  const fetchConnections = async () => {
    try {
      const res = await fetch('/api/databases');
      if (res.ok) {
        const data = await res.json();
        setConns(data);
      }
    } catch (err) {
      console.error('Failed to fetch connections:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteConnection = async () => {
    if (!deleteConnId) return;
    setDeleteLoading(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch(`/api/databases/${deleteConnId}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete connection.');
      }

      setSuccess('Connection deleted successfully.');
      setDeleteConnId(null);
      fetchConnections();
    } catch (err: any) {
      setError(err.message || 'An error occurred during deletion.');
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <>
      {/* Script for Cloudflare Turnstile inside components */}
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        strategy="afterInteractive"
      />

      <div className="page-container">
        <div className="page-container-content space-y-5">
          <div className="flex items-center justify-between">
            <h1 className="text-base font-bold text-slate-100">Databases</h1>
            <button 
              onClick={() => router.push('/dashboard/databases/new')} 
              className="inline-flex items-center justify-center font-semibold rounded-lg transition-all duration-200 active:scale-[0.98] bg-primary text-slate-950 hover:bg-primary-hover shadow-lg shadow-primary/10 px-4 py-2.5 text-sm gap-2"
            >
              <Plus size={18} />
              Add Connection
            </button>
          </div>

          {error && (
            <div className="alert bg-accent-red/10 border border-accent-red/20 text-accent-red p-4 rounded-xl flex items-center gap-3">
              <AlertTriangle size={18} className="shrink-0" />
              <span className="text-sm font-medium">{error}</span>
            </div>
          )}

          {success && (
            <div className="alert bg-accent-green/10 border border-accent-green/20 text-accent-green p-4 rounded-xl flex items-center gap-3">
              <Check size={18} className="shrink-0" />
              <span className="text-sm font-medium">{success}</span>
            </div>
          )}

          <DatabaseList
          conns={conns}
          loading={loading}
          onAddClick={() => router.push('/dashboard/databases/new')}
          onEditClick={(conn) => router.push(`/dashboard/databases/${conn.id}`)}
          onDeleteClick={(id) => setDeleteConnId(id)}
        />

        {/* Delete confirmation modal */}
        <ConfirmDialog
          isOpen={!!deleteConnId}
          onClose={() => setDeleteConnId(null)}
          onConfirm={handleDeleteConnection}
          loading={deleteLoading}
          title="Delete Database Connection"
          message="Are you sure you want to delete this Supabase connection? Any Discord servers mapped to this connection will have their Supabase credentials unlinked."
          confirmText="Delete"
        />
        </div>
      </div>
    </>
  );
}
