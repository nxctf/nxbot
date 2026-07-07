import React, { useEffect, useRef } from 'react';
import { KeyRound, RefreshCw, X } from 'lucide-react';
import Button from '@/components/Button';
import { Connection } from '../_types';

interface ReAuthModalProps {
  conn: Connection;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  loading: boolean;
  captchaToken: string | null;
  setCaptchaToken: (token: string | null) => void;
}

export function ReAuthModal({
  conn,
  isOpen,
  onClose,
  onConfirm,
  loading,
  captchaToken,
  setCaptchaToken,
}: ReAuthModalProps) {
  const turnstileRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isOpen || !conn.supabase_turnstile_site_key) return;

    let checkInterval: NodeJS.Timeout;

    const renderTurnstile = () => {
      const w = window as any;
      if (w.turnstile) {
        try {
          const widgetId = w.turnstile.render('#turnstile-container-reauth', {
            sitekey: conn.supabase_turnstile_site_key,
            callback: (token: string) => {
              setCaptchaToken(token);
            },
            'error-callback': () => {
              console.error('Turnstile captcha failed to load inside Re-auth Modal');
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
  }, [isOpen, conn, setCaptchaToken]);

  if (!isOpen) return null;

  return (
    <>
      <div 
        onClick={onClose}
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[9990] transition-opacity duration-300"
      />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-slate-900/95 backdrop-blur-md border border-border-color rounded-2xl shadow-2xl p-6 z-[9999] animate-fade-in">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-cyan-400 flex items-center gap-2">
            <KeyRound size={20} />
            Re-authenticate: {conn.name}
          </h3>
          <button 
            onClick={onClose} 
            className="text-slate-400 hover:text-slate-200 transition-colors p-1 rounded-lg hover:bg-slate-800/40"
            disabled={loading}
          >
            <X size={18} />
          </button>
        </div>

        <p className="text-sm text-slate-400 leading-relaxed mb-6">
          This will log in as <strong className="text-slate-200">{conn.supabase_login_email}</strong> to get fresh session tokens for the bot to bypass CAPTCHA.
        </p>

        {conn.supabase_turnstile_site_key ? (
          <div className="mb-6 bg-slate-950/40 p-4 rounded-xl border border-border-color">
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
              Solve Captcha to Continue
            </label>
            <div id="turnstile-container-reauth" className="min-h-[65px]"></div>
          </div>
        ) : (
          <div className="mb-6 p-4 bg-accent-yellow/10 border border-accent-yellow/20 rounded-xl text-xs text-accent-yellow leading-relaxed">
            ⚠️ No Turnstile Site Key configured. If Supabase requires captcha authentication, this login attempt will fail. Edit the connection to configure the Turnstile key first.
          </div>
        )}

        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={onConfirm}
            loading={loading}
            disabled={loading || (!!conn.supabase_turnstile_site_key && !captchaToken)}
            className="border-cyan-400/20 text-cyan-400 hover:bg-cyan-400/10 hover:text-cyan-300"
          >
            Login & Save Tokens
          </Button>
        </div>
      </div>
    </>
  );
}
export default ReAuthModal;
