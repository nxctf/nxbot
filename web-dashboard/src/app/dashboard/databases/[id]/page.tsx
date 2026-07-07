'use client';

import React, { use, useState, useEffect } from 'react';
import { ArrowLeft, AlertTriangle, Check } from 'lucide-react';
import Script from 'next/script';
import { useRouter } from 'next/navigation';
import Button from '@/components/Button';
import DatabaseForm from '../_components/DatabaseForm';
import { Connection } from '../_types';

export default function EditDatabasePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const [conn, setConn] = useState<Connection | null>(null);
  const [fetching, setFetching] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchConnectionDetails();
  }, [id]);

  const fetchConnectionDetails = async () => {
    try {
      const res = await fetch(`/api/databases/${id}`);
      if (res.ok) {
        const data = await res.json();
        setConn(data);
      } else {
        setError('Failed to fetch connection details.');
      }
    } catch (err) {
      console.error('Error fetching connection details:', err);
      setError('An error occurred while fetching details.');
    } finally {
      setFetching(false);
    }
  };

  const handleSaveConnection = async (formData: any) => {
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const res = await fetch(`/api/databases/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to save database connection.');
      }

      setSuccess('Connection updated successfully!');
      setTimeout(() => {
        router.push('/dashboard/databases');
      }, 1000);
    } catch (err: any) {
      setError(err.message || 'Verification failed. Double check your Supabase credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Script for Cloudflare Turnstile inside components */}
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        strategy="afterInteractive"
      />

      {/* Sticky Header */}
      <div className="sticky top-[60px] z-40 bg-bg-dark/95 backdrop-blur-md border-b border-border-color -mx-10 mb-8 px-10 py-4 flex items-center justify-between shadow-lg shadow-black/30">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push('/dashboard/databases')}
            className="flex items-center justify-center w-9 h-9 rounded-full bg-slate-800/50 border border-border-color text-slate-200 transition-all hover:bg-slate-700/60"
            title="Back to Connections"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 className="text-xl font-extrabold text-slate-100">Edit Database Connection</h1>
            <p className="text-slate-400 text-xs mt-0.5">Modify settings and Turnstile captcha configuration.</p>
          </div>
        </div>
      </div>

      {/* Error notification */}
      {error && (
        <div className="alert bg-accent-red/10 border border-accent-red/20 text-accent-red p-4 rounded-xl mb-6 flex items-center gap-3">
          <AlertTriangle size={18} className="shrink-0" />
          <span className="text-sm font-medium">{error}</span>
        </div>
      )}

      {/* Success notification */}
      {success && (
        <div className="alert bg-accent-green/10 border border-accent-green/20 text-accent-green p-4 rounded-xl mb-6 flex items-center gap-3">
          <Check size={18} className="shrink-0" />
          <span className="text-sm font-medium">{success}</span>
        </div>
      )}

      {fetching ? (
        <div className="glass-panel p-16 text-center text-slate-400">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-primary mx-auto mb-4" />
          <p>Fetching connection details...</p>
        </div>
      ) : conn ? (
        <DatabaseForm
          editingConn={conn}
          onSave={handleSaveConnection}
          onCancel={() => router.push('/dashboard/databases')}
          loading={loading}
        />
      ) : (
        <div className="glass-panel p-16 text-center text-slate-400">
          <p>Connection not found.</p>
        </div>
      )}
    </>
  );
}
