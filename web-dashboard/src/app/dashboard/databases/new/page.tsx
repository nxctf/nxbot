'use client';

import React, { useState } from 'react';
import { AlertTriangle, Check } from 'lucide-react';
import Script from 'next/script';
import { useRouter } from 'next/navigation';
import PageContainer from '@/components/PageContainer';
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

      <PageContainer
        title="Add Database Connection"
        subtitle="Configure a new Supabase database connection for your CTF servers."
      >
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
      </PageContainer>
    </>
  );
}
