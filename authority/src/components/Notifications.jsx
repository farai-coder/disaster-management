import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { CheckCircle, AlertTriangle, Info, XCircle, X } from 'lucide-react';

const ToastCtx = createContext(null);
const ConfirmCtx = createContext(null);

const TONE_META = {
  success: { Icon: CheckCircle, cls: 'toast-success' },
  error:   { Icon: XCircle,     cls: 'toast-error'   },
  warning: { Icon: AlertTriangle, cls: 'toast-warning' },
  info:    { Icon: Info,        cls: 'toast-info'    },
};

export function NotificationsProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const [confirmState, setConfirmState] = useState(null);
  const seq = useRef(0);

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback((tone, message, opts = {}) => {
    const id = ++seq.current;
    const duration = opts.duration ?? (tone === 'error' ? 5500 : 3200);
    setToasts((prev) => [...prev, { id, tone, message, title: opts.title }]);
    if (duration > 0) setTimeout(() => dismiss(id), duration);
    return id;
  }, [dismiss]);

  const toastApi = useRef({
    success: (m, o) => push('success', m, o),
    error:   (m, o) => push('error',   m, o),
    warning: (m, o) => push('warning', m, o),
    info:    (m, o) => push('info',    m, o),
  });

  const confirm = useCallback(({ title = 'Confirm', message, confirmLabel = 'Confirm', cancelLabel = 'Cancel', tone = 'danger' } = {}) => {
    return new Promise((resolve) => {
      setConfirmState({ title, message, confirmLabel, cancelLabel, tone, resolve });
    });
  }, []);

  const handleConfirm = (result) => {
    confirmState?.resolve?.(result);
    setConfirmState(null);
  };

  useEffect(() => {
    if (!confirmState) return;
    const onKey = (e) => {
      if (e.key === 'Escape') handleConfirm(false);
      if (e.key === 'Enter')  handleConfirm(true);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [confirmState]);

  return (
    <ToastCtx.Provider value={toastApi.current}>
      <ConfirmCtx.Provider value={confirm}>
        {children}
        <div className="toast-stack" aria-live="polite">
          {toasts.map((t) => {
            const meta = TONE_META[t.tone] || TONE_META.info;
            const Icon = meta.Icon;
            return (
              <div key={t.id} className={`toast ${meta.cls}`} role="status">
                <Icon size={18} className="toast-icon" />
                <div className="toast-body">
                  {t.title && <div className="toast-title">{t.title}</div>}
                  <div className="toast-message">{t.message}</div>
                </div>
                <button className="toast-close" onClick={() => dismiss(t.id)} aria-label="Dismiss">
                  <X size={14} />
                </button>
              </div>
            );
          })}
        </div>

        {confirmState && (
          <div className="confirm-backdrop" onClick={() => handleConfirm(false)}>
            <div className={`confirm-modal confirm-${confirmState.tone}`} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
              <div className="confirm-header">
                <AlertTriangle size={20} />
                <h3>{confirmState.title}</h3>
              </div>
              <p className="confirm-message">{confirmState.message}</p>
              <div className="confirm-actions">
                <button className="btn btn-outline" onClick={() => handleConfirm(false)}>
                  {confirmState.cancelLabel}
                </button>
                <button
                  className={`btn ${confirmState.tone === 'danger' ? 'btn-danger' : 'btn-primary'}`}
                  onClick={() => handleConfirm(true)}
                  autoFocus
                >
                  {confirmState.confirmLabel}
                </button>
              </div>
            </div>
          </div>
        )}
      </ConfirmCtx.Provider>
    </ToastCtx.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastCtx);
  if (!ctx) throw new Error('useToast must be used inside NotificationsProvider');
  return ctx;
}

export function useConfirm() {
  const ctx = useContext(ConfirmCtx);
  if (!ctx) throw new Error('useConfirm must be used inside NotificationsProvider');
  return ctx;
}
