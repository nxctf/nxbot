import React, { useState } from 'react';
import { DiscordRole } from '../_types';
import GlassInput from '@/components/GlassInput';
import { Search } from 'lucide-react';

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
  const [search, setSearch] = useState('');

  const toggleRole = (roleId: string) => {
    if (selectedRoleIds.includes(roleId)) {
      onChange(selectedRoleIds.filter(id => id !== roleId));
    } else {
      onChange([...selectedRoleIds, roleId]);
    }
  };

  const filteredRoles = allRoles.filter(role => 
    role.name.toLowerCase().includes(search.toLowerCase()) && role.name !== '@everyone'
  );

  const roleColorHex = (color: number) => color === 0 ? '#94a3b8' : `#${color.toString(16).padStart(6, '0')}`;

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-sm font-semibold text-slate-300">{label}</label>
        {description && <p className="text-xs text-slate-400 mt-0.5">{description}</p>}
      </div>

      <div className="relative">
        <GlassInput
          type="text"
          placeholder="Search roles..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10 py-2 text-sm"
        />
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
      </div>

      <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto p-2 bg-slate-950/30 border border-border-color rounded-lg">
        {filteredRoles.length === 0 ? (
          <span className="text-xs text-slate-500 p-2">No roles found</span>
        ) : (
          filteredRoles.map((role) => {
            const isSelected = selectedRoleIds.includes(role.id);
            const color = roleColorHex(role.color);
            return (
              <button
                key={role.id}
                type="button"
                onClick={() => toggleRole(role.id)}
                className={`
                  inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all duration-150
                  ${isSelected 
                    ? 'bg-slate-800/80 border-primary text-primary shadow-sm shadow-primary/10' 
                    : 'bg-slate-900/40 border-border-color text-slate-300 hover:border-slate-700'}
                `}
              >
                <span 
                  className="w-2 h-2 rounded-full shrink-0" 
                  style={{ backgroundColor: color }}
                />
                {role.name}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
export default RoleMultiPicker;
