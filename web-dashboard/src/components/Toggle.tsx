import React from 'react';

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  label?: string;
  description?: string;
}

export function Toggle({ checked, onChange, disabled = false, label, description }: ToggleProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0' }}>
      {(label || description) && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', paddingRight: '16px', flex: 1 }}>
          {label && <span style={{ fontWeight: 600, fontSize: '15px', color: '#f8fafc' }}>{label}</span>}
          {description && <span style={{ fontSize: '13px', color: '#94a3b8' }}>{description}</span>}
        </div>
      )}
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange(!checked)}
        style={{
          position: 'relative',
          display: 'inline-flex',
          height: '24px',
          width: '46px',
          flexShrink: 0,
          cursor: disabled ? 'not-allowed' : 'pointer',
          borderRadius: '9999px',
          border: '2px solid transparent',
          transition: 'background-color 0.2s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.2s ease',
          outline: 'none',
          backgroundColor: checked ? 'var(--primary, #38bdf8)' : 'rgba(148, 163, 184, 0.2)',
          opacity: disabled ? 0.5 : 1,
          boxShadow: checked ? '0 0 12px rgba(56, 189, 248, 0.4)' : 'none',
        }}
      >
        <span
          style={{
            pointerEvents: 'none',
            display: 'inline-block',
            height: '20px',
            width: '20px',
            borderRadius: '9999px',
            backgroundColor: '#ffffff',
            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.4)',
            transform: checked ? 'translateX(22px)' : 'translateX(0px)',
            transition: 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        />
      </button>
    </div>
  );
}
export default Toggle;
