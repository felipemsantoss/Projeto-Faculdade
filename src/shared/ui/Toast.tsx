import { AnimatePresence, motion } from 'framer-motion';
import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import { cx } from '../../lib/format';
import './toast.css';

type Tone = 'neutral' | 'accent' | 'warn';

interface Toast {
  id: number;
  message: string;
  tone: Tone;
}

interface ToastApi {
  push: (message: string, tone?: Tone) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

const LIFETIME_MS = 2400;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(0);

  const push = useCallback((message: string, tone: Tone = 'neutral') => {
    const id = (nextId.current += 1);
    setToasts((current) => [...current.slice(-2), { id, message, tone }]);
    window.setTimeout(() => setToasts((current) => current.filter((toast) => toast.id !== id)), LIFETIME_MS);
  }, []);

  const value = useMemo<ToastApi>(() => ({ push }), [push]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {/* aria-live discreto: o aviso é lido sem roubar o foco do usuário. */}
      <div className="toasts" role="status" aria-live="polite">
        <AnimatePresence initial={false}>
          {toasts.map((toast) => (
            <motion.p
              key={toast.id}
              className={cx('toast', `toast--${toast.tone}`)}
              initial={{ opacity: 0, y: 14, filter: 'blur(6px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: -8, filter: 'blur(4px)' }}
              transition={{ duration: 0.34, ease: [0.16, 1, 0.3, 1] }}
            >
              {toast.message}
            </motion.p>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast precisa estar dentro de <ToastProvider>.');
  return context;
}
