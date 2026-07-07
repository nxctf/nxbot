import React, { useState, useEffect, useRef } from 'react';
import { Database, ArrowLeft, Save } from 'lucide-react';
import Button from '@/components/Button';
import GlassInput from '@/components/GlassInput';
import { Connection } from '../_types';

interface DatabaseFormProps {
  editingConn: Connection | null;
  onSave: (formData: any) => Promise<void>;
  onCancel: () => void;
  loading: boolean;
}

export function DatabaseForm({
  editingConn,
  onSave,
  onCancel,
  loading,
}: DatabaseFormProps) {
  const [name, setName] = useState('');
  const [supabaseUrl, setSupabaseUrl] = useState('');
  const [supabaseAnonKey, setSupabaseAnonKey] = useState('');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [turnstileSiteKey, setTurnstileSiteKey] = useState('');
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);

  const turnstileRef = useRef<string | null>(null);

  // Initialize fields on editingConn change
  useEffect(() => {
    if (editingConn) {
      setName(editingConn.name);
      setSupabaseUrl(editingConn.supabase_url);
      setSupabaseAnonKey(editingConn.supabase_anon_key);
      setLoginEmail(editingConn.supabase_login_email || '');
      setLoginPassword(editingConn.supabase_login_password || '');
      setTurnstileSiteKey(editingConn.supabase_turnstile_site_key || '');
      setCaptchaToken(null);
    } else {
      setName('');
      setSupabaseUrl('');
      setSupabaseAnonKey('');
      setLoginEmail('');
      setLoginPassword('');
      setTurnstileSiteKey('');
      setCaptchaToken(null);
    }
  }, [editingConn]);

  // Turnstile rendering
  useEffect(() => {
    if (!turnstileSiteKey) return;

    let checkInterval: NodeJS.Timeout;

    const renderTurnstile = () => {
      const w = window as any;
      if (w.turnstile) {
        try {
          const widgetId = w.turnstile.render('#turnstile-container-db', {
            sitekey: turnstileSiteKey,
            callback: (token: string) => {
              setCaptchaToken(token);
            },
            'error-callback': () => {
              console.error('Turnstile captcha failed to load inside DB Form');
            }
          });
          turnstileRef.current = widgetId;
        } catch (e) {
          // ignore duplicate render errors
        }
      }
    };

    if ((window as any).turnstile) {
      renderTurnstile();
    } else {
      checkInterval = setInterval(() => {
        if ((window as any).turnstile) {
          renderTurnstile();
          clearInterval(checkInterval);
        }
      }, 500);
    }

    return () => {
      if (checkInterval) clearInterval(checkInterval);
      const w = window as any;
      if (w.turnstile && turnstileRef.current) {
        try {
          w.turnstile.remove(turnstileRef.current);
        } catch (e) {}
        turnstileRef.current = null;
      }
      setCaptchaToken(null);
    };
  }, [turnstileSiteKey]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !supabaseUrl || !supabaseAnonKey) return;

    onSave({
      name,
      supabase_url: supabaseUrl,
      supabase_anon_key: supabaseAnonKey,
      supabase_login_email: loginEmail || null,
      supabase_login_password: loginPassword || null,
      supabase_turnstile_site_key: turnstileSiteKey || null,
      captchaToken: captchaToken || null,
    });
  };

  return (
    <div className="glass-panel p-8">
      {/* Back navigation */}
      <button 
        onClick={onCancel} 
        className="flex items-center gap-2 text-slate-400 hover:text-slate-200 transition-colors text-sm font-medium mb-6"
      >
        <ArrowLeft size={16} />
        <span>Back to list</span>
      </button>

      {/* Header */}
      <h2 className="text-lg font-bold text-primary flex items-center gap-2 mb-6">
        <Database size={20} />
        {editingConn ? 'Edit Supabase Connection' : 'Add New Supabase Connection'}
      </h2>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Connection Name */}
        <div className="space-y-2">
          <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
            Connection Name
          </label>
          <GlassInput
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Production CTF DB"
            required
            disabled={loading}
          />
        </div>

        {/* Supabase URL & Anon Key */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
              Supabase URL
            </label>
            <GlassInput
              type="url"
              value={supabaseUrl}
              onChange={(e) => setSupabaseUrl(e.target.value)}
              placeholder="https://your-project.supabase.co"
              required
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
              Supabase Anon Key
            </label>
            <GlassInput
              type="password"
              value={supabaseAnonKey}
              onChange={(e) => setSupabaseAnonKey(e.target.value)}
              placeholder="eyJhbGciOi..."
              required
              disabled={loading}
            />
          </div>
        </div>

        {/* Bypass RLS credentials */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2 border-t border-border-color/60">
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
              Bypass RLS Email (Optional)
            </label>
            <GlassInput
              type="email"
              value={loginEmail}
              onChange={(e) => setLoginEmail(e.target.value)}
              placeholder="No authentication (runs as Anonymous)"
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
              Bypass RLS Password (Optional)
            </label>
            <GlassInput
              type="password"
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
              placeholder="No authentication (runs as Anonymous)"
              disabled={loading}
            />
          </div>
        </div>

        {/* Cloudflare Turnstile */}
        <div className="space-y-2 pt-2 border-t border-border-color/60">
          <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
            Cloudflare Turnstile Site Key (Optional)
          </label>
          <p className="text-xs text-slate-400 leading-relaxed max-w-2xl">
            If this database utilizes Cloudflare Turnstile protection on user logins, paste your site key here. This allows the bot to securely store fresh session tokens.
          </p>
          <GlassInput
            type="text"
            value={turnstileSiteKey}
            onChange={(e) => setTurnstileSiteKey(e.target.value)}
            placeholder="e.g. 0x4AAAAAADccgBtUIa..."
            disabled={loading}
          />
        </div>

        {/* Captcha render box */}
        {turnstileSiteKey && (
          <div className="bg-slate-950/40 p-4 rounded-xl border border-border-color">
            <label className="block text-xs font-bold text-primary uppercase tracking-wider mb-3">
              Cloudflare Turnstile Verification
            </label>
            <div id="turnstile-container-db" className="min-h-[65px]"></div>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-3 justify-end pt-4 border-t border-border-color/60">
          <Button type="button" variant="ghost" onClick={onCancel} disabled={loading}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            loading={loading}
            disabled={loading || (!!turnstileSiteKey && !captchaToken)}
          >
            <Save size={16} className="mr-2" />
            {editingConn ? 'Save Changes' : 'Create Connection'}
          </Button>
        </div>
      </form>
    </div>
  );
}
export default DatabaseForm;
