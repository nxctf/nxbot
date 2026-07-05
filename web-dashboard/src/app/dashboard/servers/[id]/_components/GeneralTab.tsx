import React from 'react';
import Toggle from '@/components/Toggle';
import GlassInput from '@/components/GlassInput';
import { Server } from 'lucide-react';
import { GuildConfig } from '../_types';

interface GeneralTabProps {
  formState: GuildConfig;
  setFormState: React.Dispatch<React.SetStateAction<GuildConfig | null>>;
}

export function GeneralTab({ formState, setFormState }: GeneralTabProps) {
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
    </div>
  );
}
export default GeneralTab;
