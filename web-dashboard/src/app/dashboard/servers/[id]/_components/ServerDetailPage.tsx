import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Save, RefreshCw, Database, MessageSquare, Ticket, AlertTriangle, CheckCircle } from 'lucide-react';
import { GuildConfig, DatabaseConnection, EventItem, DiscordChannel, DiscordRole } from '../_types';
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
  error,
  success,
}: ServerDetailPageProps) {
  const [activeTab, setActiveTab] = useState<'general' | 'supabase' | 'tickets'>('general');

  return (
    <div className="max-w-4xl mx-auto relative pb-16">
      <form onSubmit={onSave}>
        {/* Sticky Header Bar */}
        <div className="sticky top-0 z-50 bg-bg-dark/95 backdrop-blur-md border-b border-border-color -mx-4 md:-mx-8 mb-8 px-4 md:px-8 py-5 flex items-center justify-between shadow-lg shadow-black/20">
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard/servers"
              className="flex items-center justify-center w-9 h-9 rounded-full bg-slate-800/50 border border-border-color text-slate-200 transition-all hover:bg-slate-700/60"
              title="Back to Servers"
            >
              <ArrowLeft size={16} />
            </Link>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-extrabold text-slate-100">{config.guild_name || 'Configure Server'}</h1>
                <span className="text-[11px] font-mono bg-primary/5 text-primary border border-primary/20 px-2.5 py-0.5 rounded-full select-all">
                  {id}
                </span>
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold ${
                  config.is_active === 1 ? 'bg-accent-green/10 text-accent-green border border-accent-green/20' : 'bg-accent-red/10 text-accent-red border border-accent-red/20'
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

        {/* Tabs Bar */}
        <div className="flex gap-2 border-b border-border-color pb-3 mb-8 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('general')}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg border transition-all shrink-0 ${
              activeTab === 'general'
                ? 'bg-primary text-slate-950 border-primary shadow-lg shadow-primary/10'
                : 'bg-slate-800/30 border-border-color text-slate-400 hover:text-slate-200'
            }`}
          >
            <RefreshCw size={14} className={activeTab === 'general' ? '' : 'text-slate-500'} />
            General Settings
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('supabase')}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg border transition-all shrink-0 ${
              activeTab === 'supabase'
                ? 'bg-primary text-slate-950 border-primary shadow-lg shadow-primary/10'
                : 'bg-slate-800/30 border-border-color text-slate-400 hover:text-slate-200'
            }`}
          >
            <Database size={14} className={activeTab === 'supabase' ? '' : 'text-slate-500'} />
            Supabase & Integration
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('tickets')}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg border transition-all shrink-0 ${
              activeTab === 'tickets'
                ? 'bg-primary text-slate-950 border-primary shadow-lg shadow-primary/10'
                : 'bg-slate-800/30 border-border-color text-slate-400 hover:text-slate-200'
            }`}
          >
            <Ticket size={14} className={activeTab === 'tickets' ? '' : 'text-slate-500'} />
            Ticket System
          </button>
        </div>

        {/* Tab Contents */}
        {activeTab === 'general' && (
          <GeneralTab formState={config} setFormState={setConfig} />
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
      </form>
    </div>
  );
}
export default ServerDetailPage;
