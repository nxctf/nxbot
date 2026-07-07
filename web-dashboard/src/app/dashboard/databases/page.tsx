'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { Plus, AlertTriangle, Check } from 'lucide-react';
import Script from 'next/script';
import { useRouter, useSearchParams } from 'next/navigation';
import PageContainer from '@/components/PageContainer';
import ConfirmDialog from '@/components/ConfirmDialog';
import { Connection } from './_types';
import DatabaseList from './_components/DatabaseList';
import DatabaseForm from './_components/DatabaseForm';
import ReAuthModal from './_components/ReAuthModal';

function DatabasesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tab = searchParams.get('tab');
  const id = searchParams.get('id');

  const [conns, setConns] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingConn, setEditingConn] = useState<Connection | null>(null);
  
  // Alert/Status states
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [btnLoading, setBtnLoading] = useState(false);

  // Connection testing states
  const [testConnLoading, setTestConnLoading] = useState<Record<string, boolean>>({});
  const [testConnStatus, setTestConnStatus] = useState<Record<string, { success?: string; error?: string }>>({});

  // Re-auth states
  const [reAuthConn, setReAuthConn] = useState<Connection | null>(null);
  const [reAuthLoading, setReAuthLoading] = useState(false);
  const [reAuthCaptchaToken, setReAuthCaptchaToken] = useState<string | null>(null);

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

  // Sync query parameters with local view states
  useEffect(() => {
    if (tab === 'add') {
      setShowForm(true);
      setEditingConn(null);
      setError('');
      setSuccess('');
    } else if (tab === 'edit' && id) {
      const conn = conns.find(c => c.id === id);
      if (conn) {
        setEditingConn(conn);
        setShowForm(true);
        setError('');
        setSuccess('');
      } else if (conns.length > 0) {
        // Redirect if connection doesn't exist
        router.push('/dashboard/databases');
      }
    } else {
      setShowForm(false);
      setEditingConn(null);
    }
  }, [tab, id, conns, router]);

  const resetForm = () => {
    router.push('/dashboard/databases');
  };

  const handleSaveConnection = async (formData: any) => {
    setError('');
    setSuccess('');
    setBtnLoading(true);

    try {
      const url = editingConn ? `/api/databases/${editingConn.id}` : '/api/databases';
      const method = editingConn ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to save database connection.');
      }

      setSuccess(editingConn ? 'Connection updated successfully!' : 'Connection added successfully!');
      resetForm();
      fetchConnections();
    } catch (err: any) {
      setError(err.message || 'Verification failed. Double check your Supabase credentials.');
    } finally {
      setBtnLoading(false);
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

  const handleTestConnection = async (conn: Connection) => {
    const id = conn.id;
    setTestConnLoading(prev => ({ ...prev, [id]: true }));
    setTestConnStatus(prev => ({ ...prev, [id]: {} }));

    try {
      const res = await fetch('/api/servers/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supabase_url: conn.supabase_url,
          supabase_anon_key: conn.supabase_anon_key,
          supabase_login_email: conn.supabase_login_email,
          supabase_login_password: conn.supabase_login_password,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setTestConnStatus(prev => ({ ...prev, [id]: { success: 'Connected' } }));
      } else {
        setTestConnStatus(prev => ({ ...prev, [id]: { error: data.error || 'Failed' } }));
      }
    } catch (err) {
      setTestConnStatus(prev => ({ ...prev, [id]: { error: 'Network Error' } }));
    } finally {
      setTestConnLoading(prev => ({ ...prev, [id]: false }));
    }
  };

  const handleConfirmReAuth = async () => {
    if (!reAuthConn) return;
    setReAuthLoading(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch(`/api/databases/${reAuthConn.id}/re-auth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ captchaToken: reAuthCaptchaToken }),
      });
      
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Re-authentication failed.');
      }

      setSuccess(`✅ Re-authenticated as ${data.user_email}. Bot will sync within 10s.`);
      setReAuthConn(null);
      fetchConnections();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setReAuthLoading(false);
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
        title="Supabase DB Connections"
        subtitle="Configure and verify saved Supabase database credentials to map to your Discord CTF servers."
        extra={!showForm && (
          <button 
            onClick={() => router.push('/dashboard/databases?tab=add')} 
            className="inline-flex items-center justify-center font-semibold rounded-lg transition-all duration-200 active:scale-[0.98] bg-primary text-slate-950 hover:bg-primary-hover shadow-lg shadow-primary/10 px-4 py-2.5 text-sm gap-2"
          >
            <Plus size={18} />
            Add Connection
          </button>
        )}
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

        {/* Dynamic List or Form view */}
        {showForm ? (
          <DatabaseForm
            editingConn={editingConn}
            onSave={handleSaveConnection}
            onCancel={resetForm}
            loading={btnLoading}
          />
        ) : (
          <DatabaseList
            conns={conns}
            loading={loading}
            testConnLoading={testConnLoading}
            testConnStatus={testConnStatus}
            onAddClick={() => router.push('/dashboard/databases?tab=add')}
            onEditClick={(conn) => router.push(`/dashboard/databases?tab=edit&id=${conn.id}`)}
            onDeleteClick={(id) => setDeleteConnId(id)}
            onTestClick={handleTestConnection}
            onReAuthClick={(conn) => setReAuthConn(conn)}
          />
        )}

        {/* Re-Auth modal */}
        {reAuthConn && (
          <ReAuthModal
            conn={reAuthConn}
            isOpen={!!reAuthConn}
            onClose={() => setReAuthConn(null)}
            onConfirm={handleConfirmReAuth}
            loading={reAuthLoading}
            captchaToken={reAuthCaptchaToken}
            setCaptchaToken={setReAuthCaptchaToken}
          />
        )}

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
      </PageContainer>
    </>
  );
}

export default function DatabasesPage() {
  return (
    <Suspense fallback={
      <div className="flex justify-center items-center h-[80vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-primary" />
      </div>
    }>
      <DatabasesContent />
    </Suspense>
  );
}
