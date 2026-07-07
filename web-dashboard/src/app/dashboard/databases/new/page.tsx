'use client';

import React, { useState } from 'react';
import { ArrowLeft, AlertTriangle, Check } from 'lucide-react';
import Script from 'next/script';
import { useRouter } from 'next/navigation';
import Button from '@/components/Button';
import DatabaseForm from '../_components/DatabaseForm';

export default function NewDatabasePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSaveConnection = async (formData: any) => {
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const res = await fetch('/api/databases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create database connection.');
      }

      setSuccess('Connection added successfully!');
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
            <h1 className="text-xl font-extrabold text-slate-100">Add Database Connection</h1>
            <p className="text-slate-400 text-xs mt-0.5">Configure a new Supabase database connection.</p>
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

      <DatabaseForm
        editingConn={null}
        onSave={handleSaveConnection}
        onCancel={() => router.push('/dashboard/databases')}
        loading={loading}
      />
    </>
  );
}
