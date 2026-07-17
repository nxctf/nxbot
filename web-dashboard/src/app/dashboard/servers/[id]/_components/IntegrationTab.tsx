import React from 'react';
import Toggle from '@/components/Toggle';
import GlassSelect from '@/components/GlassSelect';
import GlassInput from '@/components/GlassInput';
import Button from '@/components/Button';
import { Database, Radio, CheckCircle, AlertTriangle, Trophy, Volume2 } from 'lucide-react';
import RoleMultiPicker from './RoleMultiPicker';
import { GuildConfig, DatabaseConnection, EventItem, DiscordChannel, DiscordRole } from '../_types';

interface IntegrationTabProps {
  formState: GuildConfig;
  setFormState: React.Dispatch<React.SetStateAction<GuildConfig | null>>;
  databases: DatabaseConnection[];
  events: EventItem[];
  eventsLoading: boolean;
  channels: DiscordChannel[];
  roles: DiscordRole[];
  botConnected: boolean;
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
  fetchEventsList: (url: string, key: string) => Promise<void>;
}

export function IntegrationTab({
  formState,
  setFormState,
  databases,
  events,
  eventsLoading,
  channels,
  roles,
  botConnected,
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
  fetchEventsList,
}: IntegrationTabProps) {
  const updateField = <K extends keyof GuildConfig>(field: K, value: GuildConfig[K]) => {
    setFormState(prev => prev ? { ...prev, [field]: value } : null);
  };

  const isEnabled = formState.enable_realtime === 1;
  const textChannels = channels.filter(c => c.type === 0);
  const selectedDb = databases.find(d => d.id === formState.supabase_connection_id);
  const firstBloodPingMode = formState.firstblood_ping_everyone === 1
    ? 'everyone'
    : formState.firstblood_ping_roles
      ? 'roles'
      : 'none';
  const announcementPingMode = formState.announcement_ping_everyone === 1
    ? 'everyone'
    : formState.announcement_ping_roles
      ? 'roles'
      : 'none';
  const firstBloodPingRoles = formState.firstblood_ping_roles ? formState.firstblood_ping_roles.split(',').filter(Boolean) : [];
  const announcementPingRoles = formState.announcement_ping_roles ? formState.announcement_ping_roles.split(',').filter(Boolean) : [];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Credentials and Activation Card */}
      <div className="bg-slate-900/40 backdrop-blur-md border border-border-color rounded-2xl p-6 shadow-xl space-y-6">
        <h2 className="text-lg font-bold text-primary flex items-center gap-2 mb-4">
          <Database size={18} /> Credentials & Integration
        </h2>

        <div className="bg-slate-800/20 border border-border-color rounded-xl p-5">
          <Toggle
            checked={isEnabled}
            onChange={(checked) => updateField('enable_realtime', checked ? 1 : 0)}
            label="Enable Supabase Integration"
            description="Instantly track CTF solves, announcements, and challenges from Supabase."
          />
        </div>

        <div className={`space-y-6 transition-all duration-300 ${isEnabled ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-slate-300">Link Supabase Connection</label>
            {databases.length > 0 ? (
              <GlassSelect
                value={formState.supabase_connection_id || ''}
                onChange={(e) => {
                  const val = e.target.value;
                  updateField('supabase_connection_id', val || null);
                  const conn = databases.find(c => c.id === val);
                  if (conn) {
                    fetchEventsList(conn.supabase_url, conn.supabase_anon_key);
                  }
                }}
                disabled={!isEnabled}
              >
                <option value="">-- Select Connection --</option>
                {databases.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.supabase_url})
                  </option>
                ))}
              </GlassSelect>
            ) : (
              <div className="p-3.5 bg-accent-red/10 border border-accent-red/20 text-accent-red rounded-lg text-sm">
                No Supabase database connections configured. Create one in the sidebar first.
              </div>
            )}
          </div>

          {selectedDb && (
            <div className="bg-slate-950/40 border border-border-color p-5 rounded-xl text-sm space-y-2.5 font-sans">
              <div className="flex justify-between">
                <span className="text-slate-400">URL:</span>
                <span className="text-slate-300 font-mono select-all">{selectedDb.supabase_url}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Anon Key:</span>
                <span className="text-slate-500 font-mono">••••••••••••••••••••</span>
              </div>
              {selectedDb.supabase_login_email && (
                <div className="flex justify-between">
                  <span className="text-slate-400">Bypass Account:</span>
                  <span className="text-accent-green font-semibold">{selectedDb.supabase_login_email}</span>
                </div>
              )}
            </div>
          )}

          {formState.supabase_connection_id && (
            <div className="pt-4 border-t border-border-color">
              <div className="flex items-center gap-3 flex-wrap">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={onTestConnection}
                  loading={testConnLoading}
                  disabled={!isEnabled}
                >
                  Test Connection
                </Button>
                {testConnSuccess && <span className="text-sm font-semibold text-accent-green flex items-center gap-1.5"><CheckCircle size={15} /> {testConnSuccess}</span>}
                {testConnError && <span className="text-sm font-semibold text-accent-red flex items-center gap-1.5"><AlertTriangle size={15} /> {testConnError}</span>}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Discord Channels Integration Card */}
      <div className="bg-slate-900/40 backdrop-blur-md border border-border-color rounded-2xl shadow-xl">
        <div className={`p-6 space-y-6 transition-all duration-300 ${isEnabled ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
          <h2 className="text-lg font-bold text-primary flex items-center gap-2">
            <Radio size={18} /> Supabase Discord Channels
          </h2>

          {/* Event Selector */}
          <div className="space-y-2 pb-6 border-b border-border-color">
            <label className="block text-sm font-semibold text-slate-300">Select Active Event</label>
            {eventsLoading ? (
              <div className="text-sm text-slate-400">Querying Supabase events...</div>
            ) : events.length > 0 ? (
              <GlassSelect
                value={formState.active_event_id || ''}
                onChange={(e) => updateField('active_event_id', e.target.value || null)}
                disabled={!isEnabled}
              >
                <option value="">-- Direct Raw String / No specific Event --</option>
                {events.map((e) => (
                  <option key={e.id} value={e.id}>{e.name} ({e.id})</option>
                ))}
              </GlassSelect>
            ) : (
              <div className="space-y-2">
                <div className="p-3.5 bg-slate-800/20 border border-border-color rounded-lg text-sm text-slate-400 flex items-center gap-2">
                  <Radio size={16} className="shrink-0" />
                  <span>No events found from Supabase. You can paste an Event UUID directly below.</span>
                </div>
                <GlassInput
                  type="text"
                  className="font-mono text-sm"
                  value={formState.active_event_id || ''}
                  onChange={(e) => updateField('active_event_id', e.target.value || null)}
                  placeholder="Paste Event UUID (e.g. 550e8400-e29b-41d4-a716-446655440000)"
                  disabled={!isEnabled}
                />
              </div>
            )}
          </div>

          {/* Channels Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 1. First Blood alerts */}
            <div className="space-y-4">
              <Toggle
                checked={formState.enable_firstblood === 1}
                onChange={(checked) => updateField('enable_firstblood', checked ? 1 : 0)}
                disabled={!isEnabled}
                label="Enable First Blood Alerts"
                description="Notify when challenges are solved first."
              />
              <div className={`space-y-3 transition-opacity ${formState.enable_firstblood === 1 ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">First Blood Channel</label>
                {botConnected ? (
                  <GlassSelect
                    value={formState.channel_firstblood || ''}
                    onChange={(e) => updateField('channel_firstblood', e.target.value || null)}
                    disabled={!isEnabled || formState.enable_firstblood === 0}
                  >
                    <option value="">-- Select Channel --</option>
                    {textChannels.map(c => (
                      <option key={c.id} value={c.id}>#{c.name}</option>
                    ))}
                  </GlassSelect>
                ) : (
                  <GlassInput
                    type="text"
                    className="font-mono text-sm"
                    value={formState.channel_firstblood || ''}
                    onChange={(e) => updateField('channel_firstblood', e.target.value || null)}
                    placeholder="e.g. 112233445566778899"
                    disabled={!isEnabled || formState.enable_firstblood === 0}
                  />
                )}

                <div className="space-y-3">
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">First Blood Ping</label>
                  <GlassSelect
                    value={firstBloodPingMode}
                    onChange={(e) => {
                      const mode = e.target.value;
                      updateField('firstblood_ping_everyone', mode === 'everyone' ? 1 : 0);
                      if (mode !== 'roles') updateField('firstblood_ping_roles', null);
                    }}
                    disabled={!isEnabled || formState.enable_firstblood === 0}
                  >
                    <option value="none">Do not ping</option>
                    <option value="roles">Ping selected roles</option>
                    <option value="everyone">Ping @everyone</option>
                  </GlassSelect>
                  {firstBloodPingMode === 'roles' && (
                    <RoleMultiPicker
                      label="First Blood Roles"
                      description="Roles to mention when a new first blood is detected."
                      allRoles={roles}
                      selectedRoleIds={firstBloodPingRoles}
                      onChange={(ids) => updateField('firstblood_ping_roles', ids.join(','))}
                    />
                  )}
                  {firstBloodPingMode === 'everyone' && (
                    <p className="text-xs text-accent-yellow">Requires the bot to have permission to mention @everyone in this channel.</p>
                  )}
                </div>

                {formState.channel_firstblood && formState.enable_firstblood === 1 && (
                  <div className="flex items-center gap-3 flex-wrap">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={onTestFirstBlood}
                      loading={testFbLoading}
                      disabled={!isEnabled}
                    >
                      <Trophy size={14} className="mr-1.5" />
                      Test
                    </Button>
                    {testFbSuccess && <span className="text-xs text-accent-green font-semibold">✓ {testFbSuccess}</span>}
                    {testFbError && <span className="text-xs text-accent-red font-semibold">✗ {testFbError}</span>}
                  </div>
                )}
              </div>
            </div>

            {/* 2. Live Scoreboard */}
            <div className="space-y-4">
              <Toggle
                checked={formState.enable_scoreboard === 1}
                onChange={(checked) => updateField('enable_scoreboard', checked ? 1 : 0)}
                disabled={!isEnabled}
                label="Enable Live Scoreboard"
                description="Auto scoreboard embeds in channel."
              />
              <div className={`space-y-3 transition-opacity ${formState.enable_scoreboard === 1 ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Scoreboard Channel</label>
                {botConnected ? (
                  <GlassSelect
                    value={formState.channel_scoreboard || ''}
                    onChange={(e) => updateField('channel_scoreboard', e.target.value || null)}
                    disabled={!isEnabled || formState.enable_scoreboard === 0}
                  >
                    <option value="">-- Select Channel --</option>
                    {textChannels.map(c => (
                      <option key={c.id} value={c.id}>#{c.name}</option>
                    ))}
                  </GlassSelect>
                ) : (
                  <GlassInput
                    type="text"
                    className="font-mono text-sm"
                    value={formState.channel_scoreboard || ''}
                    onChange={(e) => updateField('channel_scoreboard', e.target.value || null)}
                    placeholder="e.g. 112233445566778899"
                    disabled={!isEnabled || formState.enable_scoreboard === 0}
                  />
                )}

                {formState.channel_scoreboard && formState.enable_scoreboard === 1 && (
                  <div className="flex items-center gap-3 flex-wrap">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={onDeployScoreboard}
                      loading={scoreLoading}
                      disabled={!isEnabled}
                      className="border-accent-yellow/20 text-accent-yellow hover:bg-accent-yellow/10"
                    >
                      Deploy
                    </Button>
                    {scoreSuccess && <span className="text-xs text-accent-green font-semibold">✓ {scoreSuccess}</span>}
                    {scoreError && <span className="text-xs text-accent-red font-semibold">✗ {scoreError}</span>}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 3. Announcements */}
          <div className="space-y-3 pt-4 border-t border-border-color">
            <label className="block text-sm font-semibold text-slate-300">CTF Announcements Channel</label>
            {botConnected ? (
              <GlassSelect
                value={formState.channel_announcements || ''}
                onChange={(e) => updateField('channel_announcements', e.target.value || null)}
                disabled={!isEnabled}
              >
                <option value="">-- Select Channel --</option>
                {textChannels.map(c => (
                  <option key={c.id} value={c.id}>#{c.name}</option>
                ))}
              </GlassSelect>
            ) : (
              <GlassInput
                type="text"
                className="font-mono text-sm"
                value={formState.channel_announcements || ''}
                onChange={(e) => updateField('channel_announcements', e.target.value || null)}
                placeholder="e.g. 112233445566778899"
                disabled={!isEnabled}
              />
            )}

            <div className="space-y-3">
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Announcement Ping</label>
              <GlassSelect
                value={announcementPingMode}
                onChange={(e) => {
                  const mode = e.target.value;
                  updateField('announcement_ping_everyone', mode === 'everyone' ? 1 : 0);
                  if (mode !== 'roles') updateField('announcement_ping_roles', null);
                }}
                disabled={!isEnabled}
              >
                <option value="none">Do not ping</option>
                <option value="roles">Ping selected roles</option>
                <option value="everyone">Ping @everyone</option>
              </GlassSelect>
              {announcementPingMode === 'roles' && (
                <RoleMultiPicker
                  label="Announcement Roles"
                  description="Roles to mention when CTF announcements are synced."
                  allRoles={roles}
                  selectedRoleIds={announcementPingRoles}
                  onChange={(ids) => updateField('announcement_ping_roles', ids.join(','))}
                />
              )}
              {announcementPingMode === 'everyone' && (
                <p className="text-xs text-accent-yellow">Requires the bot to have permission to mention @everyone in this channel.</p>
              )}
            </div>

            {formState.channel_announcements && (
              <div className="flex items-center gap-3 flex-wrap">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={onTestAnnouncement}
                  loading={testAnnLoading}
                  disabled={!isEnabled}
                >
                  <Volume2 size={14} className="mr-1.5" />
                  Test Announcement
                </Button>
                {testAnnSuccess && <span className="text-xs text-accent-green font-semibold">✓ {testAnnSuccess}</span>}
                {testAnnError && <span className="text-xs text-accent-red font-semibold">✗ {testAnnError}</span>}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
export default IntegrationTab;
