/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { X, Check, Crown, Sparkles, Users, Zap, Loader2 } from "lucide-react";
import { useApp } from "../context/AppContext";
import { useToast } from "../context/ToastContext";
import { startCheckout, type PaidPlan } from "../services/billing";

interface Plan {
  id: "free" | "pro" | "team";
  name: string;
  price: string;
  period: string;
  tagline: string;
  icon: React.ReactNode;
  accent: string;
  highlight?: boolean;
  features: string[];
}

const PLANS: Plan[] = [
  {
    id: "free",
    name: "Free",
    price: "R$ 0",
    period: "para sempre",
    tagline: "Para organizar o dia a dia pessoal.",
    icon: <Sparkles className="w-5 h-5" />,
    accent: "from-gray-400 to-gray-500",
    features: [
      "Até 3 grupos ativos",
      "Até 5 membros por grupo",
      "Assistente IA: 10 organizações/mês",
      "Tarefas, quadro, notas e calendário",
      "Histórico dos últimos 30 dias",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    price: "R$ 19",
    period: "/mês",
    tagline: "Para quem leva a produtividade a sério.",
    icon: <Crown className="w-5 h-5" />,
    accent: "from-violet-500 to-sky-500",
    highlight: true,
    features: [
      "Grupos ilimitados",
      "Assistente IA por voz ilimitado",
      "Dashboard de produtividade",
      "Templates de quadro",
      "Histórico e auditoria completos",
      "Exportar em CSV",
    ],
  },
  {
    id: "team",
    name: "Team",
    price: "R$ 15",
    period: "/membro/mês",
    tagline: "Para equipes que trabalham juntas.",
    icon: <Users className="w-5 h-5" />,
    accent: "from-amber-500 to-orange-500",
    features: [
      "Tudo do Pro para cada membro",
      "Membros ilimitados por grupo",
      "Papéis e permissões avançadas",
      "Relatórios da equipe",
      "Suporte prioritário",
    ],
  },
];

const PlansModal: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const { currentUser } = useApp();
  const notify = useToast();
  const currentPlan = currentUser?.plan ?? "free";
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  const handleSubscribe = async (planId: "free" | "pro" | "team") => {
    if (planId === "free" || !currentUser) return;
    setLoadingPlan(planId);
    try {
      await startCheckout(planId as PaidPlan, currentUser.id, currentUser.email);
      // Em caso de sucesso o navegador é redirecionado para o Stripe.
    } catch (e: any) {
      notify(e?.message || "Não foi possível iniciar o pagamento.", "error");
      setLoadingPlan(null);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-6"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: 30, scale: 0.98, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            exit={{ y: 30, scale: 0.98, opacity: 0 }}
            transition={{ type: "spring", damping: 26, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-4xl bg-white dark:bg-zinc-900 rounded-3xl border border-gray-200 dark:border-zinc-800 shadow-2xl max-h-[92dvh] flex flex-col overflow-hidden"
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-zinc-800 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-sky-500 flex items-center justify-center">
                  <Zap className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-gray-900 dark:text-zinc-50">Escolha seu plano</h2>
                  <p className="text-[11px] text-gray-400 dark:text-zinc-500">Faça mais com o worksync</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto scrollbar-thin p-5 sm:p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {PLANS.map((plan) => {
                  const isCurrent = plan.id === currentPlan;
                  return (
                    <div
                      key={plan.id}
                      className={`relative rounded-2xl border p-5 flex flex-col ${
                        plan.highlight
                          ? "border-sky-500/50 dark:border-sky-500/40 shadow-lg shadow-sky-500/10 bg-sky-500/[0.03]"
                          : "border-gray-200 dark:border-zinc-800"
                      }`}
                    >
                      {plan.highlight && (
                        <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-violet-500 to-sky-500 text-white text-[10px] font-bold uppercase tracking-wide shadow-sm">
                          Mais popular
                        </span>
                      )}
                      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${plan.accent} flex items-center justify-center text-white mb-3`}>
                        {plan.icon}
                      </div>
                      <h3 className="text-lg font-bold text-gray-900 dark:text-zinc-50">{plan.name}</h3>
                      <p className="text-[11px] text-gray-400 dark:text-zinc-500 mb-3 min-h-[2rem]">{plan.tagline}</p>
                      <div className="flex items-baseline gap-1 mb-4">
                        <span className="text-2xl font-extrabold text-gray-900 dark:text-zinc-50">{plan.price}</span>
                        <span className="text-xs text-gray-400 dark:text-zinc-500">{plan.period}</span>
                      </div>
                      <ul className="space-y-2 flex-1 mb-4">
                        {plan.features.map((f) => (
                          <li key={f} className="flex items-start gap-2 text-xs text-gray-600 dark:text-zinc-300">
                            <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" /> {f}
                          </li>
                        ))}
                      </ul>
                      <button
                        disabled={isCurrent || loadingPlan !== null}
                        onClick={() => handleSubscribe(plan.id)}
                        className={`w-full px-4 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer disabled:cursor-default disabled:opacity-60 flex items-center justify-center gap-2 ${
                          isCurrent
                            ? "bg-gray-100 dark:bg-zinc-800 text-gray-400 dark:text-zinc-500"
                            : plan.highlight
                              ? "bg-gradient-to-r from-violet-500 to-sky-500 text-white hover:opacity-95 shadow-sm"
                              : "bg-gray-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:opacity-90"
                        }`}
                      >
                        {loadingPlan === plan.id && <Loader2 className="w-4 h-4 animate-spin" />}
                        {isCurrent ? "Plano atual" : plan.id === "free" ? "Começar grátis" : `Assinar ${plan.name}`}
                      </button>
                    </div>
                  );
                })}
              </div>
              <p className="text-center text-[11px] text-gray-400 dark:text-zinc-600 mt-5">
                Preços de lançamento. Cancele quando quiser. Cobrança via Stripe em breve.
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default PlansModal;
