import React from 'react';
import Toggle from '@/components/Toggle';
import GlassInput from '@/components/GlassInput';
import { Server } from 'lucide-react';
import { GuildConfig, DiscordGuildInfo } from '../_types';

interface GeneralTabProps {
  formState: GuildConfig;
  setFormState: React.Dispatch<React.SetStateAction<GuildConfig | null>>;
  discordGuildInfo: DiscordGuildInfo | null;
  onDeleteClick: () => void;
}

export function GeneralTab({ formState, setFormState, discordGuildInfo, onDeleteClick }: GeneralTabProps) {
  const updateField = (field: keyof GuildConfig, value: any) => {
    setFormState(prev => prev ? { ...prev, [field]: value } : null);
  };

  return (
    <div className="bg-slate-900/40 backdrop-blur-md border border-border-color rounded-2xl p-6 shadow-xl space-y-6 animate-fade-in">
      <h2 className="text-lg font-bold text-primary flex items-center gap-2 mb-4">
        <Server size={18} /> General Settings
      </h2>

      <div className="bg-slate-800/20 border border-border-color rounded-xl p-5">
        <Toggle
          checked={formState.is_active === 1}
          onChange={(checked) => updateField('is_active', checked ? 1 : 0)}
          label="Active Status"
          description="Turn completely ON/OFF the bot listeners for this server configuration."
        />
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-semibold text-slate-300">Server/Guild Name (Display only)</label>
        <GlassInput
          type="text"
          value={formState.guild_name}
          onChange={(e) => updateField('guild_name', e.target.value)}
          required
        />
      </div>

      {discordGuildInfo && (
        <div className="bg-slate-800/20 border border-border-color rounded-xl p-4 flex items-center gap-4">
          {discordGuildInfo.iconUrl && (
            <img
              src={discordGuildInfo.iconUrl}
              alt={discordGuildInfo.name}
              className="w-11 h-11 rounded-full shrink-0"
            />
          )}
          <div className="min-w-0">
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Discord Server</p>
            <p className="text-sm font-semibold text-slate-200 truncate">{discordGuildInfo.name}</p>
            <p className="text-[11px] font-mono text-slate-500 truncate">{discordGuildInfo.id}</p>
          </div>
        </div>
      )}

      {/* Danger Zone */}
      <div className="bg-accent-red/5 border border-accent-red/20 rounded-xl p-5 mt-8 space-y-4">
        <h3 className="text-sm font-bold text-accent-red uppercase tracking-wider">
          Danger Zone
        </h3>
        <p className="text-xs text-slate-400 leading-relaxed">
          Permanently delete this server configuration from the database. The bot will immediately stop responding to CTF events and tickets in this Discord server.
        </p>
        <button
          type="button"
          onClick={onDeleteClick}
          className="inline-flex items-center justify-center font-semibold rounded-lg transition-all duration-200 bg-accent-red text-slate-100 hover:bg-red-600 shadow-lg shadow-red-600/10 px-4 py-2.5 text-xs"
        >
          Delete Server Configuration
        </button>
      </div>
    </div>
  );
}
export default GeneralTab;
