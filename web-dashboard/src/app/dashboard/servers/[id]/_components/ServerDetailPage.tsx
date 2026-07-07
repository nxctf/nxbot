'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { ArrowLeft, Save, RefreshCw, Database, Ticket, AlertTriangle, CheckCircle } from 'lucide-react';
import TabSidebar from '@/components/TabSidebar';
import { GuildConfig, DatabaseConnection, EventItem, DiscordChannel, DiscordRole, DiscordGuildInfo } from '../_types';
import GeneralTab from './GeneralTab';
import IntegrationTab from './IntegrationTab';
import TicketsTab from './TicketsTab';
import Button from '@/components/Button';

interface ServerDetailPageProps {
  id: string;
  config: GuildConfig;
  setConfig: React.Dispatch<React.SetStateAction<GuildConfig | null>>;
  channels: DiscordChannel[];
  roles: DiscordRole[];
  databases: DatabaseConnection[];
  events: EventItem[];
  eventsLoading: boolean;
  botConnected: boolean;
  onSave: (e: React.FormEvent) => Promise<void>;
  isSaving: boolean;
  onTestConnection: () => Promise<void>;
  testConnLoading: boolean;
  testConnSuccess: string;
  testConnError: string;
  onTestFirstBlood: () => Promise<void>;
  testFbLoading: boolean;
  testFbSuccess: string;
  testFbError: string;
  onTestAnnouncement: () => Promise<void>;
  testAnnLoading: boolean;
  testAnnSuccess: string;
  testAnnError: string;
  onDeployScoreboard: () => Promise<void>;
  scoreLoading: boolean;
  scoreSuccess: string;
  scoreError: string;
  onDeployPanel: () => Promise<void>;
  deployLoading: boolean;
  deploySuccess: string;
  deployError: string;
  fetchEventsList: (url: string, key: string) => Promise<void>;
  discordGuildInfo: DiscordGuildInfo | null;
  error: string;
  success: string;
}

export function ServerDetailPage({
  id,
  config,
  setConfig,
  channels,
  roles,
  databases,
  events,
  eventsLoading,
  botConnected,
  onSave,
  isSaving,
  onTestConnection,
  testConnLoading,
  testConnSuccess,
  testConnError,
  onTestFirstBlood,
  testFbLoading,
  testFbSuccess,
  testFbError,
  onTestAnnouncement,
  testAnnLoading,
  testAnnSuccess,
  testAnnError,
  onDeployScoreboard,
  scoreLoading,
  scoreSuccess,
  scoreError,
  onDeployPanel,
  deployLoading,
  deploySuccess,
  deployError,
  fetchEventsList,
  discordGuildInfo,
  error,
  success,
}: ServerDetailPageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  // URL-driven Tab State (?tab=general|supabase|tickets)
  const activeTab = (searchParams.get('tab') || 'general') as 'general' | 'supabase' | 'tickets';

  // Escape key to go back
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') router.back(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [router]);

  // Delete Server Confirmation states
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [confirmServerName, setConfirmServerName] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);

  const handleTabChange = (tab: string) => {
    router.replace(`${pathname}?tab=${tab}`, { scroll: false });
  };

  const handleDeleteConfirm = async () => {
    if (confirmServerName !== config.guild_name) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/servers/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setDeleteConfirmOpen(false);
        router.push('/dashboard/servers');
      } else {
        alert('Failed to delete server configuration.');
      }
    } catch (err) {
      console.error('Delete server error:', err);
      alert('An error occurred during deletion.');
    } finally {
      setDeleteLoading(false);
    }
  };

  // Reset confirmation name on modal close
  useEffect(() => {
    if (!deleteConfirmOpen) {
      setConfirmServerName('');
    }
  }, [deleteConfirmOpen]);

  return (
    <div className="relative pb-16">
      <form onSubmit={onSave}>
        {/* Fixed Header Bar at top-[60px] */}
        <div className="sticky top-[60px] z-40 bg-bg-dark/95 backdrop-blur-md border-b border-border-color -mx-10 mb-8 px-10 py-4 flex items-center justify-between shadow-lg shadow-black/30">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="flex items-center justify-center w-9 h-9 rounded-full bg-slate-800/50 border border-border-color text-slate-200 transition-all hover:bg-slate-700/60"
              title="Back"
            >
              <ArrowLeft size={16} />
            </button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-extrabold text-slate-100">{config.guild_name || 'Configure Server'}</h1>
                {/* Fixed ID badge - no buggy border */}
                <span className="text-[10px] font-mono bg-slate-800 text-slate-400 px-2.5 py-1 rounded-md select-all">
                  {id}
                </span>
                {/* Fixed Active status badge - no buggy border */}
                <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-bold ${
                  config.is_active === 1 
                    ? 'bg-accent-green/10 text-accent-green' 
                    : 'bg-accent-red/10 text-accent-red'
                }`}>
                  {config.is_active === 1 ? 'Active' : 'Inactive'}
                </span>
              </div>
              <p className="text-slate-400 text-xs mt-0.5">Manage credentials, channels and welcome panels</p>
            </div>
          </div>

          <Button type="submit" variant="primary" loading={isSaving}>
            {!isSaving && <Save size={16} className="mr-1.5" />}
            Save Configuration
          </Button>
        </div>

        {/* Global Notifications */}
        {error && (
          <div className="bg-accent-red/10 border border-accent-red/20 text-accent-red px-4 py-3.5 rounded-xl text-sm flex items-center gap-2 mb-6">
            <AlertTriangle size={18} />
            {error}
          </div>
        )}

        {success && (
          <div className="bg-accent-green/10 border border-accent-green/20 text-accent-green px-4 py-3.5 rounded-xl text-sm flex items-center gap-2 mb-6">
            <CheckCircle size={18} />
            {success}
          </div>
        )}

        <div className="flex gap-6 items-start">
          <TabSidebar
            tabs={[
              { value: 'general', label: 'General', icon: <RefreshCw size={15} /> },
              { value: 'supabase', label: 'Integration', icon: <Database size={15} /> },
              { value: 'tickets', label: 'Tickets', icon: <Ticket size={15} /> },
            ]}
            activeTab={activeTab}
            onTabChange={handleTabChange}
          />

          {/* Tab Contents */}
          <div className="flex-1 min-w-0">
            {activeTab === 'general' && (
              <GeneralTab 
                formState={config} 
                setFormState={setConfig} 
                discordGuildInfo={discordGuildInfo}
                onDeleteClick={() => setDeleteConfirmOpen(true)}
              />
            )}

            {activeTab === 'supabase' && (
              <IntegrationTab
                formState={config}
                setFormState={setConfig}
                databases={databases}
                events={events}
                eventsLoading={eventsLoading}
                channels={channels}
                botConnected={botConnected}
                onTestConnection={onTestConnection}
                testConnLoading={testConnLoading}
                testConnSuccess={testConnSuccess}
                testConnError={testConnError}
                onTestFirstBlood={onTestFirstBlood}
                testFbLoading={testFbLoading}
                testFbSuccess={testFbSuccess}
                testFbError={testFbError}
                onTestAnnouncement={onTestAnnouncement}
                testAnnLoading={testAnnLoading}
                testAnnSuccess={testAnnSuccess}
                testAnnError={testAnnError}
                onDeployScoreboard={onDeployScoreboard}
                scoreLoading={scoreLoading}
                scoreSuccess={scoreSuccess}
                scoreError={scoreError}
                fetchEventsList={fetchEventsList}
              />
            )}

            {activeTab === 'tickets' && (
              <TicketsTab
                formState={config}
                setFormState={setConfig}
                channels={channels}
                roles={roles}
                botConnected={botConnected}
                onDeployPanel={onDeployPanel}
                deployLoading={deployLoading}
                deploySuccess={deploySuccess}
                deployError={deployError}
              />
            )}
          </div>
        </div>
      </form>

      {/* Name-verification Delete Confirmation Modal */}
      {deleteConfirmOpen && (
        <>
          <div 
            onClick={() => setDeleteConfirmOpen(false)}
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[9990] transition-opacity duration-300"
          />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-slate-900/95 backdrop-blur-md border border-border-color rounded-2xl shadow-2xl p-6 z-[9999] animate-fade-in">
            <h3 className="text-lg font-bold text-accent-red mb-3">Delete Server Configuration</h3>
            <p className="text-sm text-slate-400 leading-relaxed mb-4">
              Are you sure you want to permanently delete the configuration for <strong className="text-slate-200">{config.guild_name}</strong>? All dashboard settings for this server will be lost. This action is irreversible.
            </p>
            <p className="text-xs text-slate-400 mb-3">
              Please type <strong className="text-slate-100 select-all">{config.guild_name}</strong> to confirm.
            </p>
            <input
              type="text"
              className="w-full px-4 py-2.5 bg-slate-950/60 border border-border-color rounded-lg text-slate-100 text-sm outline-none mb-6 focus:border-accent-red transition-colors font-semibold"
              placeholder="Type server name"
              value={confirmServerName}
              onChange={(e) => setConfirmServerName(e.target.value)}
            />
            <div className="flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setDeleteConfirmOpen(false)} disabled={deleteLoading}>
                Cancel
              </Button>
              <Button
                variant="danger"
                disabled={confirmServerName !== config.guild_name || deleteLoading}
                onClick={handleDeleteConfirm}
                loading={deleteLoading}
              >
                Permanently Delete
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
export default ServerDetailPage;
