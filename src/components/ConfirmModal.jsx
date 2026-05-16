'use client';

import { X, AlertTriangle, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function ConfirmModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title = 'Confirm Action',
  message = 'Are you sure you want to proceed?',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger', // 'danger' or 'warning'
  isLoading = false,
  disabled = false
}) {
  const [internalLoading, setInternalLoading] = useState(false);

  // Sync external isLoading with internal state
  useEffect(() => {
    setInternalLoading(isLoading);
  }, [isLoading]);

  if (!isOpen) return null;

  const showLoading = isLoading || internalLoading;

  const variantStyles = {
    danger: {
      button: 'bg-red-600 hover:bg-red-700 text-white',
      icon: 'text-red-600',
      border: 'border-red-200'
    },
    warning: {
      button: 'bg-yellow-600 hover:bg-yellow-700 text-white',
      icon: 'text-yellow-600',
      border: 'border-yellow-200'
    }
  };

  const styles = variantStyles[variant] || variantStyles.danger;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 transition-all duration-300">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={showLoading ? undefined : onClose} aria-hidden="true" />
      <div className="relative bg-white rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.2)] max-w-md w-full overflow-hidden transform transition-all duration-300 scale-100 border border-white/20 animate-in zoom-in-95">
        {/* Header */}
        <div className={`flex items-center justify-between px-8 py-5 border-b border-slate-100 ${variant === 'danger' ? 'bg-rose-50/50' : 'bg-amber-50/50'}`}>
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-2xl ${variant === 'danger' ? 'bg-rose-100 text-rose-600' : 'bg-amber-100 text-amber-600'} shadow-sm`}>
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div>
              <div className="text-lg font-bold text-slate-900 tracking-tight" role="heading" aria-level={1}>
                {title}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={showLoading || disabled}
            className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-all duration-200 disabled:opacity-50"
            aria-label="Close"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Body */}
        <div className="px-8 py-10 text-center">
          <p className="text-slate-600 font-medium leading-relaxed">
            {message}
          </p>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-center gap-4 px-8 py-6 border-t border-slate-50 bg-slate-50/30">
          <button
            onClick={onClose}
            disabled={showLoading || disabled}
            className="flex-1 px-6 py-3 text-sm font-bold text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-2xl transition-all duration-200 disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={async (e) => {
              e.preventDefault();
              if (showLoading || disabled) return;
              setInternalLoading(true);
              try {
                await onConfirm();
              } catch (error) {
                console.error('Error in onConfirm:', error);
                setInternalLoading(false);
              }
            }}
            disabled={showLoading || disabled}
            className={`flex-1 px-6 py-3 rounded-2xl transition-all duration-300 ${
              variant === 'danger' 
                ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-lg shadow-rose-200' 
                : 'bg-amber-500 hover:bg-amber-600 text-white shadow-lg shadow-amber-100'
            } disabled:opacity-50 disabled:scale-[0.98] font-bold text-sm flex items-center justify-center gap-2 active:scale-95`}
          >
            {showLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Processing...</span>
              </>
            ) : (
              <span>{confirmText}</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

