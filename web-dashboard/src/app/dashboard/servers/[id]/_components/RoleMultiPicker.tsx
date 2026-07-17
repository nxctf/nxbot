import React, { useState } from 'react';
import { DiscordRole } from '../_types';
import GlassSelect from '@/components/GlassSelect';
import { X } from 'lucide-react';

interface RoleMultiPickerProps {
  label: string;
  description?: string;
  allRoles: DiscordRole[];
  selectedRoleIds: string[];
  onChange: (selectedIds: string[]) => void;
}

export function RoleMultiPicker({
  label,
  description,
  allRoles,
  selectedRoleIds,
  onChange,
}: RoleMultiPickerProps) {
  const [pendingRoleId, setPendingRoleId] = useState('');

  const addRole = (roleId: string) => {
    if (!roleId || selectedRoleIds.includes(roleId)) return;
    onChange([...selectedRoleIds, roleId]);
    setPendingRoleId('');
  };

  const removeRole = (roleId: string) => {
    onChange(selectedRoleIds.filter(id => id !== roleId));
  };

  const selectableRoles = allRoles.filter(role => role.name !== '@everyone');
  const availableRoles = selectableRoles.filter(role => !selectedRoleIds.includes(role.id));
  const selectedRoles = selectedRoleIds
    .map(id => selectableRoles.find(role => role.id === id))
    .filter((role): role is DiscordRole => Boolean(role));

  const roleColorHex = (color: number) => color === 0 ? '#94a3b8' : `#${color.toString(16).padStart(6, '0')}`;

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-sm font-semibold text-slate-300">{label}</label>
        {description && <p className="text-xs text-slate-400 mt-0.5">{description}</p>}
      </div>

      <GlassSelect
        value={pendingRoleId}
        onChange={(e) => addRole(e.target.value)}
        disabled={availableRoles.length === 0}
        className="text-sm"
      >
        <option value="">{availableRoles.length === 0 ? 'All roles selected' : 'Add a role...'}</option>
        {availableRoles.map(role => (
          <option key={role.id} value={role.id}>{role.name}</option>
        ))}
      </GlassSelect>

      <div className="flex flex-wrap gap-2 min-h-11 p-2 bg-slate-950/30 border border-border-color rounded-lg">
        {selectedRoles.length === 0 ? (
          <span className="text-xs text-slate-500 p-1.5">No roles selected</span>
        ) : (
          selectedRoles.map((role) => {
            const color = roleColorHex(role.color);
            return (
              <button
                key={role.id}
                type="button"
                onClick={() => removeRole(role.id)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-semibold border border-primary/50 bg-slate-800/80 text-primary shadow-sm shadow-primary/10 transition-all hover:border-accent-red/60 hover:text-accent-red"
              >
                <span 
                  className="w-2 h-2 rounded-full shrink-0" 
                  style={{ backgroundColor: color }}
                />
                {role.name}
                <X size={12} />
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
export default RoleMultiPicker;
