/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Camada de dados do painel de administração.
 *
 * - Modo demo: usuários/ofertas/campanhas ficam em localStorage (com uma
 *   semente de exemplo para o painel já nascer populado e demonstrável).
 * - Modo cloud: os usuários são lidos da coleção `users` do Firestore; as
 *   configurações de admin (ofertas/campanhas) ficam em `admin/config`.
 *
 * IMPORTANTE (segurança): num app client-side, as ações abaixo são de UI.
 * Para controle real (bloquear, mudar plano de terceiros, faturamento),
 * as escritas precisam ser validadas por security rules / função no servidor
 * restritas ao super-admin. Ver firestore.rules.
 */

import { PLANS, type PlanId } from "../config/plans";

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  plan: PlanId;
  planExpiresAt?: string; // ISO
  blocked?: boolean;
  isAdmin?: boolean;
  aiUsage: number; // organizações de IA no mês
  groupsCount: number;
  tasksCount: number;
  lastActive: string; // ISO
  createdAt: string; // ISO
}

export interface Offer {
  id: string;
  planId: PlanId;
  label: string;
  discountPct: number;
  active: boolean;
  until?: string; // ISO
}

export interface Campaign {
  id: string;
  title: string;
  message: string;
  active: boolean;
  startedAt: string;
}

export interface AdminConfig {
  offers: Offer[];
  campaigns: Campaign[];
  bestOffer: PlanId | null; // plano marcado como "melhor oferta"
}

const USERS_KEY = "worksync_admin_users";
const CONFIG_KEY = "worksync_admin_config";

const daysAgo = (n: number) => new Date(Date.now() - n * 86400000).toISOString();
const daysAhead = (n: number) => new Date(Date.now() + n * 86400000).toISOString();

/** Semente de exemplo para o painel nascer populado (modo demo / preview). */
function seedUsers(): AdminUser[] {
  const rows: Array<[string, string, PlanId, number, number, number, number, boolean?]> = [
    // name, email, plan, aiUsage, groups, tasks, lastActiveDaysAgo, blocked
    ["Pedro Marcelino", "pedromarcelinoh7@gmail.com", "diamante", 142, 8, 96, 0],
    ["Ana Souza", "ana.souza@exemplo.com", "ouro", 61, 4, 54, 1],
    ["Bruno Lima", "bruno.lima@exemplo.com", "prata", 22, 2, 31, 2],
    ["Carla Dias", "carla.dias@exemplo.com", "esmeralda", 88, 6, 73, 0],
    ["Diego Reis", "diego.reis@exemplo.com", "free", 9, 1, 12, 5],
    ["Elisa Nunes", "elisa.nunes@exemplo.com", "ouro", 47, 3, 40, 1],
    ["Felipe Alves", "felipe.alves@exemplo.com", "free", 3, 1, 4, 14],
    ["Gabriela Rocha", "gabriela.rocha@exemplo.com", "diamante", 190, 11, 120, 0],
    ["Heitor Campos", "heitor.campos@exemplo.com", "prata", 15, 2, 19, 3, true],
    ["Isabela Freitas", "isabela.freitas@exemplo.com", "esmeralda", 55, 5, 61, 0],
    ["João Pereira", "joao.pereira@exemplo.com", "free", 1, 1, 2, 30],
    ["Karina Melo", "karina.melo@exemplo.com", "ouro", 38, 3, 44, 2],
  ];
  return rows.map(([name, email, plan, aiUsage, groups, tasks, lastDays, blocked], i) => ({
    id: "u_" + (i + 1),
    name,
    email,
    plan,
    planExpiresAt: PLANS[plan].paid ? daysAhead([30, 12, 3, 45, 0, 9, 0, 20, 5, 27, 0, 15][i] || 30) : undefined,
    blocked: !!blocked,
    isAdmin: email === "pedromarcelinoh7@gmail.com",
    aiUsage,
    groupsCount: groups,
    tasksCount: tasks,
    lastActive: daysAgo(lastDays),
    createdAt: daysAgo(90 - i * 5),
  }));
}

function defaultConfig(): AdminConfig {
  return { offers: [], campaigns: [], bestOffer: "ouro" };
}

/* ---------------- Persistência (demo/local) ---------------- */

export function loadUsers(): AdminUser[] {
  try {
    const raw = localStorage.getItem(USERS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    /* noop */
  }
  const seeded = seedUsers();
  saveUsers(seeded);
  return seeded;
}

export function saveUsers(users: AdminUser[]): void {
  try {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  } catch {
    /* noop */
  }
}

export function loadConfig(): AdminConfig {
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    if (raw) return { ...defaultConfig(), ...JSON.parse(raw) };
  } catch {
    /* noop */
  }
  return defaultConfig();
}

export function saveConfig(cfg: AdminConfig): void {
  try {
    localStorage.setItem(CONFIG_KEY, JSON.stringify(cfg));
  } catch {
    /* noop */
  }
}

/* ---------------- Métricas ---------------- */

/** Preço mensal numérico de um plano (para MRR/faturamento). */
export function planPrice(plan: PlanId): number {
  const map: Record<PlanId, number> = { free: 0, prata: 12, ouro: 24, diamante: 49, esmeralda: 18 };
  return map[plan] ?? 0;
}

export interface AdminMetrics {
  totalUsers: number;
  paidUsers: number;
  blockedUsers: number;
  byPlan: Record<PlanId, number>;
  mrr: number;
  totalAiUsage: number;
  activeGroups: number;
  expiringSoon: AdminUser[]; // vencendo em <= 7 dias
  topMovers: AdminUser[]; // maior atividade (aiUsage + tasks)
}

export function computeMetrics(users: AdminUser[]): AdminMetrics {
  const byPlan: Record<PlanId, number> = { free: 0, prata: 0, ouro: 0, diamante: 0, esmeralda: 0 };
  let mrr = 0;
  let totalAiUsage = 0;
  let activeGroups = 0;
  let paidUsers = 0;
  let blockedUsers = 0;
  const soonMs = Date.now() + 7 * 86400000;

  for (const u of users) {
    byPlan[u.plan] = (byPlan[u.plan] || 0) + 1;
    totalAiUsage += u.aiUsage;
    activeGroups += u.groupsCount;
    if (u.blocked) blockedUsers++;
    if (PLANS[u.plan].paid && !u.blocked) {
      paidUsers++;
      mrr += planPrice(u.plan);
    }
  }

  const expiringSoon = users
    .filter((u) => u.planExpiresAt && new Date(u.planExpiresAt).getTime() <= soonMs && PLANS[u.plan].paid)
    .sort((a, b) => new Date(a.planExpiresAt!).getTime() - new Date(b.planExpiresAt!).getTime());

  const topMovers = [...users]
    .sort((a, b) => b.aiUsage + b.tasksCount - (a.aiUsage + a.tasksCount))
    .slice(0, 6);

  return {
    totalUsers: users.length,
    paidUsers,
    blockedUsers,
    byPlan,
    mrr,
    totalAiUsage,
    activeGroups,
    expiringSoon,
    topMovers,
  };
}

export function rid(prefix: string): string {
  return prefix + "_" + Math.random().toString(36).slice(2, 9);
}
