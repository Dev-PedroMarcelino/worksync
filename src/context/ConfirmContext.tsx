/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useCallback, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { AlertTriangle, X } from "lucide-react";

interface ConfirmOptions {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "danger" | "default";
}

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | undefined>(undefined);

/**
 * In-app replacement for window.confirm(). Returns a promise that resolves to
 * true/false so call sites can `if (await confirm({...}))` just like before.
 */
export const ConfirmProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const resolverRef = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback<ConfirmFn>((opts) => {
    setOptions(opts);
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
    });
  }, []);

  const close = (value: boolean) => {
    resolverRef.current?.(value);
    resolverRef.current = null;
    setOptions(null);
  };

  const isDanger = options?.tone === "danger";

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <AnimatePresence>
        {options && (
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[80]"
            role="alertdialog"
            aria-modal="true"
            onClick={() => close(false)}
          >
            <motion.div
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              transition={{ duration: 0.15 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-zinc-900 rounded-3xl p-6 w-full max-w-sm border border-gray-200 dark:border-zinc-800 shadow-2xl relative"
            >
              <button
                type="button"
                onClick={() => close(false)}
                aria-label="Fechar"
                className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-400 hover:text-gray-600 dark:hover:text-zinc-200 cursor-pointer transition-all"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-start gap-3 pr-8">
                <div
                  className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                    isDanger ? "bg-rose-500/10 text-rose-500" : "bg-sky-500/10 text-sky-500"
                  }`}
                >
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-base font-bold text-gray-900 dark:text-zinc-50">{options.title}</h3>
                  {options.message && (
                    <p className="text-sm text-gray-500 dark:text-zinc-400 mt-1 leading-relaxed">{options.message}</p>
                  )}
                </div>
              </div>

              <div className="flex gap-2 justify-end font-semibold mt-6">
                <button
                  type="button"
                  onClick={() => close(false)}
                  autoFocus
                  className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-zinc-200 rounded-lg cursor-pointer transition-all outline-none focus-visible:ring-2 focus-visible:ring-gray-400"
                >
                  {options.cancelLabel ?? "Cancelar"}
                </button>
                <button
                  type="button"
                  onClick={() => close(true)}
                  className={`px-4 py-2 text-sm text-white rounded-lg cursor-pointer transition-all shadow-sm outline-none focus-visible:ring-2 ${
                    isDanger
                      ? "bg-rose-600 hover:bg-rose-500 focus-visible:ring-rose-500"
                      : "bg-sky-600 hover:bg-sky-500 focus-visible:ring-sky-500"
                  }`}
                >
                  {options.confirmLabel ?? "Confirmar"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </ConfirmContext.Provider>
  );
};

export const useConfirm = (): ConfirmFn => {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm must be used within a ConfirmProvider");
  return ctx;
};
