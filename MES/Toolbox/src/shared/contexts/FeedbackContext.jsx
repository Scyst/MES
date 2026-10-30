import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react';
import { registerErrorNotifier } from '../services/apiClient';

/**
 * Global Toast + Confirm dialog system (replaces window.alert / window.confirm).
 *
 *   const toast = useToast();      toast.success('บันทึกสำเร็จ'); toast.error('...'); toast.warning('...'); toast.info('...');
 *   const confirm = useConfirm();  if (await confirm({ title, message, confirmText, danger })) { ... }
 */

const FeedbackContext = createContext(null);

const TOAST_DURATION_MS = 4500;
const MAX_VISIBLE_TOASTS = 4;

const TOAST_STYLES = {
  success: { icon: CheckCircle2, classes: 'border-green-500 bg-green-50 text-green-900 dark:bg-green-950 dark:text-green-100' },
  error: { icon: XCircle, classes: 'border-red-500 bg-red-50 text-red-900 dark:bg-red-950 dark:text-red-100' },
  warning: { icon: AlertTriangle, classes: 'border-amber-500 bg-amber-50 text-amber-900 dark:bg-amber-950 dark:text-amber-100' },
  info: { icon: Info, classes: 'border-blue-500 bg-blue-50 text-blue-900 dark:bg-blue-950 dark:text-blue-100' },
};

function ToastItem({ toast, onDismiss }) {
  const { icon: Icon, classes } = TOAST_STYLES[toast.type];
  return (
    <div
      role={toast.type === 'error' ? 'alert' : 'status'}
      className={`pointer-events-auto flex items-start gap-3 rounded-lg border-l-4 px-4 py-3 shadow-lg ${classes}`}
    >
      <Icon className="mt-0.5 h-5 w-5 flex-shrink-0" aria-hidden="true" />
      <p className="flex-1 text-sm font-medium break-words">{toast.message}</p>
      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
        className="-m-2 flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-md opacity-70 hover:opacity-100"
        aria-label="ปิดการแจ้งเตือน"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

function ConfirmDialog({ request, onResolve }) {
  const confirmButtonRef = useRef(null);

  useEffect(() => {
    confirmButtonRef.current?.focus();
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onResolve(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onResolve]);

  const confirmClasses = request.danger
    ? 'bg-red-600 hover:bg-red-700 focus-visible:ring-red-400'
    : 'bg-blue-600 hover:bg-blue-700 focus-visible:ring-blue-400';

  return (
    <div
      className="fixed inset-0 z-[110] flex items-end justify-center bg-black/50 p-4 sm:items-center"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onResolve(false);
      }}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl dark:bg-gray-800"
      >
        <h2 id="confirm-dialog-title" className="text-lg font-bold text-gray-900 dark:text-white">
          {request.title}
        </h2>
        {request.message && (
          <p className="mt-2 whitespace-pre-line text-sm text-gray-600 dark:text-gray-300">{request.message}</p>
        )}
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={() => onResolve(false)}
            className="min-h-[44px] rounded-lg border border-gray-300 px-5 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
          >
            {request.cancelText}
          </button>
          <button
            ref={confirmButtonRef}
            type="button"
            onClick={() => onResolve(true)}
            className={`min-h-[44px] rounded-lg px-5 text-sm font-semibold text-white focus-visible:outline-none focus-visible:ring-2 ${confirmClasses}`}
          >
            {request.confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

export function FeedbackProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const [confirmRequest, setConfirmRequest] = useState(null);
  const nextIdRef = useRef(1);
  const timersRef = useRef(new Map());
  const confirmResolverRef = useRef(null);

  const dismissToast = useCallback((id) => {
    clearTimeout(timersRef.current.get(id));
    timersRef.current.delete(id);
    setToasts((current) => current.filter((item) => item.id !== id));
  }, []);

  const pushToast = useCallback(
    (type, message) => {
      if (!message) return;
      const id = nextIdRef.current++;
      setToasts((current) => [...current, { id, type, message: String(message) }].slice(-MAX_VISIBLE_TOASTS));
      timersRef.current.set(id, setTimeout(() => dismissToast(id), TOAST_DURATION_MS));
    },
    [dismissToast]
  );

  const toast = useMemo(
    () => ({
      success: (message) => pushToast('success', message),
      error: (message) => pushToast('error', message),
      warning: (message) => pushToast('warning', message),
      info: (message) => pushToast('info', message),
    }),
    [pushToast]
  );

  const resolveConfirm = useCallback((accepted) => {
    confirmResolverRef.current?.(accepted);
    confirmResolverRef.current = null;
    setConfirmRequest(null);
  }, []);

  const confirm = useCallback(
    (options) =>
      new Promise((resolve) => {
        confirmResolverRef.current?.(false);
        confirmResolverRef.current = resolve;
        setConfirmRequest({
          title: 'กรุณายืนยันการดำเนินการ',
          confirmText: 'ยืนยัน',
          cancelText: 'ยกเลิก',
          danger: false,
          ...(typeof options === 'string' ? { message: options } : options),
        });
      }),
    []
  );

  useEffect(() => {
    registerErrorNotifier(toast.error);
    const timers = timersRef.current;
    return () => {
      registerErrorNotifier(null);
      timers.forEach((timerId) => clearTimeout(timerId));
      timers.clear();
    };
  }, [toast]);

  const contextValue = useMemo(() => ({ toast, confirm }), [toast, confirm]);

  return (
    <FeedbackContext.Provider value={contextValue}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 top-4 z-[120] mx-auto flex w-full max-w-md flex-col gap-2 px-4 sm:left-auto sm:right-4 sm:mx-0"
        aria-live="polite"
      >
        {toasts.map((item) => (
          <ToastItem key={item.id} toast={item} onDismiss={dismissToast} />
        ))}
      </div>
      {confirmRequest && <ConfirmDialog request={confirmRequest} onResolve={resolveConfirm} />}
    </FeedbackContext.Provider>
  );
}

const useFeedback = () => {
  const context = useContext(FeedbackContext);
  if (!context) throw new Error('useToast/useConfirm must be used inside <FeedbackProvider>');
  return context;
};

export const useToast = () => useFeedback().toast;
export const useConfirm = () => useFeedback().confirm;

