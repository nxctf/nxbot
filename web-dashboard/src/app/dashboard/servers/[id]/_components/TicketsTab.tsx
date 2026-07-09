import React from 'react';
import Toggle from '@/components/Toggle';
import GlassSelect from '@/components/GlassSelect';
import GlassInput from '@/components/GlassInput';
import Button from '@/components/Button';
import { Ticket, Send, ShieldAlert, AlertTriangle, CheckCircle, MessageSquare } from 'lucide-react';
import { GuildConfig, DiscordChannel, DiscordRole } from '../_types';
import RoleMultiPicker from './RoleMultiPicker';

interface TicketsTabProps {
  formState: GuildConfig;
  setFormState: React.Dispatch<React.SetStateAction<GuildConfig | null>>;
  channels: DiscordChannel[];
  roles: DiscordRole[];
  botConnected: boolean;
  onDeployPanel: () => Promise<void>;
  deployLoading: boolean;
  deploySuccess: string;
  deployError: string;
}

export function TicketsTab({
  formState,
  setFormState,
  channels,
  roles,
  botConnected,
  onDeployPanel,
  deployLoading,
  deploySuccess,
  deployError,
}: TicketsTabProps) {
  const updateField = (field: keyof GuildConfig, value: any) => {
    setFormState(prev => prev ? { ...prev, [field]: value } : null);
  };

  const isEnabled = formState.enable_tickets === 1;
  const textChannels = channels.filter(c => c.type === 0);
  const categories = channels.filter(c => c.type === 4);

  const pingRoles = formState.ticket_ping_roles ? formState.ticket_ping_roles.split(',').filter(Boolean) : [];
  const requiredRoles = formState.ticket_required_roles ? formState.ticket_required_roles.split(',').filter(Boolean) : [];

  return (
    <div className="bg-slate-900/40 backdrop-blur-md border border-border-color rounded-2xl p-6 shadow-xl space-y-6 animate-fade-in">
      <h2 className="text-lg font-bold text-primary flex items-center gap-2 mb-4">
        <Ticket size={18} /> Ticket System Configuration
      </h2>

      <div className="bg-slate-800/20 border border-border-color rounded-xl p-5">
        <Toggle
          checked={isEnabled}
          onChange={(checked) => updateField('enable_tickets', checked ? 1 : 0)}
          label="Enable Ticket System"
          description="Turn completely ON/OFF the support ticket listener and panel."
        />
      </div>

      <div className={`space-y-6 transition-all duration-300 ${isEnabled ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
        
        {/* Channel config fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-slate-300">Ticket Category (Category Channel)</label>
            {botConnected ? (
              <GlassSelect
                value={formState.channel_ticket_category || ''}
                onChange={(e) => updateField('channel_ticket_category', e.target.value || null)}
                disabled={!isEnabled}
              >
                <option value="">-- Select Category --</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </GlassSelect>
            ) : (
              <GlassInput
                type="text"
                className="font-mono text-sm"
                value={formState.channel_ticket_category || ''}
                onChange={(e) => updateField('channel_ticket_category', e.target.value || null)}
                placeholder="e.g. 112233445566778899"
                disabled={!isEnabled}
              />
            )}
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-semibold text-slate-300">Ticket Activity Logs Channel</label>
            {botConnected ? (
              <GlassSelect
                value={formState.channel_ticket_logs || ''}
                onChange={(e) => updateField('channel_ticket_logs', e.target.value || null)}
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
                value={formState.channel_ticket_logs || ''}
                onChange={(e) => updateField('channel_ticket_logs', e.target.value || null)}
                placeholder="e.g. 112233445566778899"
                disabled={!isEnabled}
              />
            )}
          </div>
        </div>

        <div className="space-y-2 border-t border-border-color pt-6">
          <label className="block text-sm font-semibold text-slate-300">Ticket Panel Channel (For Button Deploy)</label>
          {botConnected ? (
            <GlassSelect
              value={formState.channel_ticket_panel || ''}
              onChange={(e) => updateField('channel_ticket_panel', e.target.value || null)}
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
                value={formState.channel_ticket_panel || ''}
                onChange={(e) => updateField('channel_ticket_panel', e.target.value || null)}
                placeholder="e.g. 112233445566778899"
                disabled={!isEnabled}
              />
          )}

          {formState.channel_ticket_panel && (
            <div className="pt-3">
              <div className="flex items-center gap-3 flex-wrap">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={onDeployPanel}
                  loading={deployLoading}
                  disabled={!isEnabled}
                >
                  <Send size={13} className="mr-1.5" />
                  Deploy/Update Embed Panel
                </Button>
                {deploySuccess && <span className="text-xs text-accent-green font-semibold flex items-center gap-1"><CheckCircle size={14} /> {deploySuccess}</span>}
                {deployError && <span className="text-xs text-accent-red font-semibold flex items-center gap-1"><AlertTriangle size={14} /> {deployError}</span>}
              </div>
            </div>
          )}
        </div>

        {/* Roles selections */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t border-border-color pt-6">
          <RoleMultiPicker
            label="Roles to Ping"
            description="Discord roles notified when a new ticket is opened."
            allRoles={roles}
            selectedRoleIds={pingRoles}
            onChange={(ids) => updateField('ticket_ping_roles', ids.join(','))}
          />

          <RoleMultiPicker
            label="Required Roles"
            description="Discord roles required to see/open tickets (empty = anyone)."
            allRoles={roles}
            selectedRoleIds={requiredRoles}
            onChange={(ids) => updateField('ticket_required_roles', ids.join(','))}
          />
        </div>

        {/* Welcome message editor */}
        <div className="space-y-3 border-t border-border-color pt-6">
          <label className="block text-sm font-semibold text-slate-300 flex items-center gap-1.5">
            <MessageSquare size={16} /> Custom Welcome Message
          </label>
          <textarea
            className="w-full px-4 py-3 bg-slate-950/60 border border-border-color rounded-lg text-slate-100 font-sans text-sm min-h-[120px] outline-none transition-all duration-300 focus:border-primary focus:shadow-primary/10"
            value={formState.ticket_welcome_message || ''}
            onChange={(e) => updateField('ticket_welcome_message', e.target.value)}
            placeholder="e.g. Hello {user}, thank you for opening a ticket. Staff will assist you shortly."
            disabled={!isEnabled}
          />
          {formState.ticket_welcome_message && (
            <div className="bg-slate-950/20 border border-border-color rounded-xl p-4 mt-2">
              <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Live Preview (Rendered inside Embed)</span>
              <div className="bg-indigo-950/10 border-l-4 border-indigo-500 p-4 rounded-r-lg text-sm text-slate-200">
                {formState.ticket_welcome_message.replace('{user}', '@user_example')}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
export default TicketsTab;
