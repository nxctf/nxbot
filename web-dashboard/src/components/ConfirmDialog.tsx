import React from 'react';
import { Button } from './Button';
import { AlertCircle } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  loading?: boolean;
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  loading = false,
}: ConfirmDialogProps) {
  if (!isOpen) return null;

  return (
    <>
      <div 
        onClick={onClose}
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[9990] transition-opacity duration-300"
      />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-slate-900/95 backdrop-blur-md border border-border-color rounded-2xl shadow-2xl p-6 z-[9999] animate-fade-in">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-accent-red/10 text-accent-red rounded-xl shrink-0">
            <AlertCircle size={24} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-100 mb-2">{title}</h3>
            <p className="text-sm text-slate-400 leading-relaxed mb-6">{message}</p>
            <div className="flex justify-end gap-3">
              <Button variant="ghost" onClick={onClose} disabled={loading}>
                {cancelText}
              </Button>
              <Button variant="danger" onClick={onConfirm} loading={loading}>
                {confirmText}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
export default ConfirmDialog;
