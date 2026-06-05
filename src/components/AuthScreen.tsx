/**
 * @license
 * SPDX-License-Identifier: Apache-2.5
 */

import React, { useState } from "react";
import { useApp } from "../context/AppContext";
import { Sparkles, CloudAlert, Info } from "lucide-react";
import { motion } from "motion/react";

export const AuthScreen: React.FC = () => {
  const { signInWithGoogle, authError, isFirebaseCloud } = useApp();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    setLocalError(null);
    setIsSubmitting(true);
    try {
      await signInWithGoogle();
    } catch (err: any) {
      console.error(err);
      setLocalError(err.message || "Erro ao conectar com Google.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-zinc-950 p-6 font-sans transition-colors duration-200">
      <div className="absolute inset-0 bg-linear-to-b from-blue-500/5 to-transparent dark:from-zinc-900/50 pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md bg-white dark:bg-zinc-900 border border-gray-200/80 dark:border-zinc-800/80 shadow-2xl rounded-3xl p-8 relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 right-0 h-[4px] bg-linear-to-r from-emerald-500 via-sky-500 to-indigo-500" />

        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-3">
            <img src="/logo.svg" alt="TaskSync.io Logo" className="w-16 h-16 object-contain" />
          </div>
          <h1 id="auth-title" className="text-2xl font-bold font-sans tracking-tight text-gray-900 dark:text-zinc-55">
            Acessar o TaskSync.io
          </h1>
          <p className="text-sm text-gray-500 dark:text-zinc-400 mt-1">
            Entre para gerenciar seus grupos, quadros, notas e tarefas colaborativas.
          </p>
        </div>

        {/* Mode Indicator */}
        <div className="mb-6 p-3 bg-zinc-100 dark:bg-zinc-800/40 rounded-2xl border border-gray-200/50 dark:border-zinc-800/40 text-xs flex gap-3 text-gray-600 dark:text-zinc-300">
          <Info className="w-4 h-4 text-sky-500 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold text-gray-800 dark:text-zinc-200">
              {isFirebaseCloud ? "Modo Cloud (Firebase Ativo)" : "Modo Demonstração (Local)"}
            </span>
            <p className="mt-0.5 text-gray-500 dark:text-zinc-400">
              {isFirebaseCloud
                ? "Conexões em tempo real seguras com autenticação oficial do Firebase."
                : "Seus dados estão sendo salvos com segurança no seu Navegador local."}
            </p>
          </div>
        </div>

        {/* Error States */}
         {(localError || authError) && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 rounded-2xl text-xs flex gap-3">
            <CloudAlert className="w-4 h-4 shrink-0" />
            <span>{localError || authError}</span>
          </div>
        )}

        {/* Authentication Options */}
        <div className="mb-2">
          <button
            id="google-signin-btn"
            type="button"
            onClick={handleGoogleSignIn}
            disabled={isSubmitting}
            className="w-full py-3 px-4 border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-gray-700 dark:text-zinc-200 text-sm font-semibold rounded-xl flex items-center justify-center gap-3 transition-all duration-200 shadow-xs cursor-pointer select-none"
          >
            <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.47 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                fill="#EA4335"
              />
            </svg>
            <span>Entrar com o Google</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
};
