/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Definição central dos planos do worksync. Serve de fonte única para a página
 * de planos, as molduras de avatar e o futuro painel de admin.
 *
 * Tiers: Free (base) · Prata · Ouro · Diamante (individuais) · Esmeralda (grupos).
 */

export type PlanId = "free" | "prata" | "ouro" | "diamante" | "esmeralda";

export interface PlanFrame {
  /** Gradiente da moldura (classes Tailwind para bg-gradient). */
  ring: string;
  /** Brilho/sombra da moldura (classe arbitrária Tailwind). */
  glow: string;
  /** Cores do selo do plano. */
  badge: string;
}

export interface PlanDef {
  id: PlanId;
  name: string;
  price: string;
  period: string;
  tagline: string;
  paid: boolean;
  group?: boolean;
  highlight?: boolean;
  frame: PlanFrame | null; // null = sem moldura (Free)
  features: string[];
}

export const PLANS: Record<PlanId, PlanDef> = {
  free: {
    id: "free",
    name: "Free",
    price: "R$ 0",
    period: "para sempre",
    tagline: "Para organizar o dia a dia pessoal.",
    paid: false,
    frame: null,
    features: [
      "Até 3 grupos ativos",
      "Assistente IA: 10 organizações/mês",
      "Tarefas, quadro, notas e calendário",
      "Histórico dos últimos 30 dias",
    ],
  },
  prata: {
    id: "prata",
    name: "Prata",
    price: "R$ 12",
    period: "/mês",
    tagline: "Para dar o primeiro passo além do básico.",
    paid: true,
    frame: {
      ring: "from-slate-200 via-gray-100 to-slate-400",
      glow: "shadow-[0_0_8px_rgba(148,163,184,0.55)]",
      badge: "bg-slate-400/15 text-slate-500 dark:text-slate-300",
    },
    features: [
      "Moldura Prata no seu avatar",
      "Assistente IA: 50 organizações/mês",
      "Grupos ilimitados",
      "Histórico completo",
    ],
  },
  ouro: {
    id: "ouro",
    name: "Ouro",
    price: "R$ 24",
    period: "/mês",
    tagline: "Para quem leva a produtividade a sério.",
    paid: true,
    highlight: true,
    frame: {
      ring: "from-amber-300 via-yellow-400 to-amber-600",
      glow: "shadow-[0_0_10px_rgba(245,158,11,0.6)]",
      badge: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
    },
    features: [
      "Moldura Ouro (brilhante) no avatar",
      "Assistente IA ilimitado",
      "Dashboard de produtividade",
      "Templates de quadro",
      "Exportar em CSV",
    ],
  },
  diamante: {
    id: "diamante",
    name: "Diamante",
    price: "R$ 49",
    period: "/mês",
    tagline: "O topo — todos os recursos, sem limites.",
    paid: true,
    frame: {
      ring: "from-cyan-200 via-sky-300 to-violet-300",
      glow: "shadow-[0_0_14px_rgba(56,189,248,0.7)]",
      badge: "bg-sky-500/15 text-sky-600 dark:text-sky-300",
    },
    features: [
      "Moldura Diamante (cintilante) no avatar",
      "Tudo do Ouro, sem limites",
      "Prioridade máxima de IA",
      "Selo de destaque no perfil",
      "Suporte prioritário",
    ],
  },
  esmeralda: {
    id: "esmeralda",
    name: "Esmeralda",
    price: "R$ 18",
    period: "/membro/mês",
    tagline: "Para equipes que trabalham juntas.",
    paid: true,
    group: true,
    frame: {
      ring: "from-emerald-300 via-green-400 to-emerald-600",
      glow: "shadow-[0_0_12px_rgba(16,185,129,0.65)]",
      badge: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
    },
    features: [
      "Moldura Esmeralda para todo o time",
      "Membros ilimitados por grupo",
      "Papéis e permissões avançadas",
      "Relatórios da equipe",
      "Cobrança por membro",
    ],
  },
};

export const PLAN_ORDER: PlanId[] = ["free", "prata", "ouro", "diamante", "esmeralda"];

export const getPlan = (id?: string | null): PlanDef => PLANS[(id as PlanId) || "free"] || PLANS.free;

export const isPaidPlan = (id?: string | null): boolean => getPlan(id).paid;
