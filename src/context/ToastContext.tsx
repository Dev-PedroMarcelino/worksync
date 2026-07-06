/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useCallback, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";

type ToastType = "error" | "success" | "info";

interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
}

type NotifyFn = (message: string, type?: ToastType) => void;

const ToastContext = createContext<NotifyFn | undefined>(undefined);

const STYLES: Record<ToastType, { icon: React.ReactNode; ring: string; accent: string }> = {
  error: {
    icon: <AlertCircle className="w-5 h-5" />,
    ring: "text-rose-500",
    accent: "bg-rose-500",
  },
  success: {
    icon: <CheckCircle2 className="w-5 h-5" />,
    ring: "text-emerald-500",
    accent: "bg-emerald-500",
  },
  info: {
    icon: <Info className="w-5 h-5" />,
    ring: "text-sky-500",
    accent: "bg-sky-500",
  },
};

/**
 * Lightweight, self-contained feedback toasts — the in-app replacement for
 * window.alert(). Feedback is transient (auto-dismisses) and dismissible.
 */
export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const remove = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const notify = useCallback<NotifyFn>((message, type = "error") => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  return (
    <ToastContext.Provider value={notify}>
      {children}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[90] flex flex-col gap-2 items-center w-full max-w-sm px-4 pointer-events-none">
        <AnimatePresence>
          {toasts.map((t) => {
            const s = STYLES[t.type];
            return (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, y: -16, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.15 } }}
                role="status"
                aria-live="polite"
                className="pointer-events-auto w-full flex items-start gap-3 p-3.5 pl-4 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md border border-gray-200/70 dark:border-zinc-800/70 rounded-2xl shadow-xl relative overflow-hidden"
              >
                <div className={`absolute top-0 bottom-0 left-0 w-1 ${s.accent}`} />
                <div className={`shrink-0 ${s.ring}`}>{s.icon}</div>
                <p className="flex-1 text-sm font-medium text-gray-800 dark:text-zinc-100 leading-snug pr-5">{t.message}</p>
                <button
                  type="button"
                  onClick={() => remove(t.id)}
                  aria-label="Fechar"
                  className="absolute top-2.5 right-2.5 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-400 hover:text-gray-600 dark:hover:text-zinc-300 transition-all cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = (): NotifyFn => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within a ToastProvider");
  return ctx;
};
