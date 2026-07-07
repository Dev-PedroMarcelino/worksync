/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  Shield, Users, CreditCard, Crown, Megaphone, X, Search, Ban, Check,
  TrendingUp, CalendarClock, Plus, Trash2, Star, BarChart3, Percent, ShieldCheck, Unlock, Palette,
} from "lucide-react";
import { useApp } from "../context/AppContext";
import { useToast } from "../context/ToastContext";
import { isSuperAdmin } from "../config/admin";
import { PLANS, PLAN_ORDER, type PlanId } from "../config/plans";
import PlanAvatar from "./PlanAvatar";
import { THEME_PRESETS, DEFAULT_THEME, SURFACE_TONES, type SiteThemeConfig, type ThemePreset } from "../config/themes";
import { loadSiteTheme, saveSiteTheme, surfacePreviewColor } from "../services/siteTheme";
import {
  loadUsers, saveUsers, loadConfig, saveConfig, computeMetrics, planPrice, rid,
  fetchCloudUsers, persistUserPatch,
  type AdminUser, type AdminConfig, type Offer, type Campaign,
} from "../services/adminData";
import { isDemoMode } from "../db/firebase";

type Tab = "overview" | "users" | "billing" | "plans" | "campaigns" | "appearance";

const BRL = (n: number) => "R$ " + n.toLocaleString("pt-BR");
const fmtDate = (iso?: string) => (iso ? new Date(iso).toLocaleDateString("pt-BR") : "—");

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: "overview", label: "Visão geral", icon: <BarChart3 className="w-4 h-4" /> },
  { id: "users", label: "Usuários", icon: <Users className="w-4 h-4" /> },
  { id: "billing", label: "Faturamento", icon: <CreditCard className="w-4 h-4" /> },
  { id: "plans", label: "Planos & Ofertas", icon: <Crown className="w-4 h-4" /> },
  { id: "campaigns", label: "Campanhas", icon: <Megaphone className="w-4 h-4" /> },
  { id: "appearance", label: "Aparência", icon: <Palette className="w-4 h-4" /> },
];

const AdminPanel: React.FC = () => {
  const { currentUser } = useApp();
  const notify = useToast();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("overview");
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [config, setConfig] = useState<AdminConfig>({ offers: [], campaigns: [], bestOffer: "ouro" });
  const [search, setSearch] = useState("");

  const allowed = isSuperAdmin(currentUser?.email);

  useEffect(() => {
    const onOpen = async () => {
      if (!isSuperAdmin(currentUser?.email)) return;
      setConfig(loadConfig());
      setOpen(true);
      if (isDemoMode) {
        setUsers(loadUsers());
      } else {
        try {
          setUsers(await fetchCloudUsers());
        } catch (e) {
          console.error("[admin] falha ao carregar usuários", e);
          setUsers([]);
        }
      }
    };
    window.addEventListener("open-admin", onOpen);
    return () => window.removeEventListener("open-admin", onOpen);
  }, [currentUser]);

  // Em demo, persiste a lista em localStorage; em cloud, cada ação grava no doc do usuário.
  const updateUsers = (next: AdminUser[]) => { setUsers(next); if (isDemoMode) saveUsers(next); };
  const updateConfig = (next: AdminConfig) => { setConfig(next); saveConfig(next); };
  const persist = (id: string, patch: Partial<AdminUser>) => { if (!isDemoMode) persistUserPatch(id, patch).catch((e) => console.error("[admin] persist", e)); };

  const metrics = useMemo(() => computeMetrics(users), [users]);

  if (!allowed) return null;

  const setUserPlan = (id: string, plan: PlanId) => {
    updateUsers(users.map((u) => (u.id === id ? { ...u, plan } : u)));
    persist(id, { plan });
  };
  const toggleBlock = (id: string) => {
    const u = users.find((x) => x.id === id);
    const nextBlocked = !u?.blocked;
    updateUsers(users.map((x) => (x.id === id ? { ...x, blocked: nextBlocked } : x)));
    persist(id, { blocked: nextBlocked });
    if (u) notify(nextBlocked ? `${u.name} bloqueado.` : `${u.name} desbloqueado.`, nextBlocked ? "info" : "success");
  };

  const filteredUsers = users.filter((u) =>
    !search.trim() || (u.name + " " + u.email).toLowerCase().includes(search.trim().toLowerCase())
  );

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[80] flex items-stretch justify-center bg-black/70 backdrop-blur-sm p-0 sm:p-4"
          onClick={() => setOpen(false)}
        >
          <motion.div
            initial={{ y: 20, scale: 0.99, opacity: 0 }} animate={{ y: 0, scale: 1, opacity: 1 }} exit={{ y: 20, scale: 0.99, opacity: 0 }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-5xl bg-gray-50 dark:bg-zinc-950 sm:rounded-3xl border border-gray-200 dark:border-zinc-800 shadow-2xl flex flex-col overflow-hidden max-h-[100dvh] sm:max-h-[94dvh]"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3.5 bg-white dark:bg-zinc-900 border-b border-gray-100 dark:border-zinc-800 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-rose-500 to-orange-500 flex items-center justify-center">
                  <Shield className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-gray-900 dark:text-zinc-50 leading-tight">Painel de Administração</h2>
                  <p className="text-[11px] text-gray-400 dark:text-zinc-500">Controle total do sistema · {currentUser?.email}</p>
                </div>
              </div>
              <button onClick={() => setOpen(false)} className="p-1.5 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-zinc-800 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-1 px-3 py-2 bg-white dark:bg-zinc-900 border-b border-gray-100 dark:border-zinc-800 overflow-x-auto scrollbar-none shrink-0">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                    tab === t.id ? "bg-gray-900 dark:bg-zinc-100 text-white dark:text-zinc-900" : "text-gray-500 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800"
                  }`}
                >
                  {t.icon} {t.label}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto scrollbar-thin p-4 sm:p-5">
              {tab === "overview" && <Overview metrics={metrics} />}
              {tab === "users" && (
                <UsersTab
                  users={filteredUsers} search={search} setSearch={setSearch}
                  onPlan={setUserPlan} onBlock={toggleBlock}
                  onExtend={(id, days) => { const iso = new Date(Date.now() + days * 86400000).toISOString(); updateUsers(users.map((u) => u.id === id ? { ...u, planExpiresAt: iso } : u)); persist(id, { planExpiresAt: iso }); }}
                />
              )}
              {tab === "billing" && <Billing users={users} metrics={metrics} />}
              {tab === "plans" && <PlansOffers config={config} onChange={updateConfig} notify={notify} />}
              {tab === "campaigns" && <Campaigns config={config} onChange={updateConfig} notify={notify} />}
              {tab === "appearance" && <Appearance notify={notify} />}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

/* ------------------------------ Overview ------------------------------ */
const Stat: React.FC<{ icon: React.ReactNode; label: string; value: string; tint: string }> = ({ icon, label, value, tint }) => (
  <div className="rounded-2xl border border-gray-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-3.5">
    <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2 ${tint}`}>{icon}</div>
    <p className="text-xl font-extrabold text-gray-900 dark:text-zinc-50 leading-none">{value}</p>
    <p className="text-[11px] text-gray-400 dark:text-zinc-500 mt-1">{label}</p>
  </div>
);

const Overview: React.FC<{ metrics: ReturnType<typeof computeMetrics> }> = ({ metrics }) => {
  const maxPlan = Math.max(1, ...PLAN_ORDER.map((p) => metrics.byPlan[p]));
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        <Stat icon={<Users className="w-4 h-4 text-white" />} label="Usuários" value={String(metrics.totalUsers)} tint="bg-sky-500" />
        <Stat icon={<Crown className="w-4 h-4 text-white" />} label="Pagantes" value={String(metrics.paidUsers)} tint="bg-amber-500" />
        <Stat icon={<TrendingUp className="w-4 h-4 text-white" />} label="MRR" value={BRL(metrics.mrr)} tint="bg-emerald-500" />
        <Stat icon={<BarChart3 className="w-4 h-4 text-white" />} label="Uso de IA (mês)" value={String(metrics.totalAiUsage)} tint="bg-violet-500" />
        <Stat icon={<Users className="w-4 h-4 text-white" />} label="Grupos ativos" value={String(metrics.activeGroups)} tint="bg-teal-500" />
        <Stat icon={<Ban className="w-4 h-4 text-white" />} label="Bloqueados" value={String(metrics.blockedUsers)} tint="bg-rose-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-gray-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
          <h3 className="text-[11px] font-bold uppercase tracking-wide text-gray-400 dark:text-zinc-500 mb-3">Distribuição por plano</h3>
          <div className="space-y-2.5">
            {PLAN_ORDER.map((p) => (
              <div key={p} className="space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-gray-600 dark:text-zinc-300 flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full bg-gradient-to-br ${PLANS[p].frame?.ring || "from-gray-300 to-gray-400"}`} />
                    {PLANS[p].name}
                  </span>
                  <span className="text-gray-400">{metrics.byPlan[p]}</span>
                </div>
                <div className="h-2 rounded-full bg-gray-100 dark:bg-zinc-800 overflow-hidden">
                  <div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-sky-500" style={{ width: `${(metrics.byPlan[p] / maxPlan) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-gray-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
          <h3 className="text-[11px] font-bold uppercase tracking-wide text-gray-400 dark:text-zinc-500 mb-3">Quem mais movimenta</h3>
          <div className="space-y-2">
            {metrics.topMovers.map((u, i) => (
              <div key={u.id} className="flex items-center gap-2.5">
                <span className="text-[10px] font-bold text-gray-400 w-4">{i + 1}</span>
                <PlanAvatar photoUrl={undefined} plan={u.plan} size={28} showGem={false} />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-gray-800 dark:text-zinc-100 truncate">{u.name}</p>
                  <p className="text-[10px] text-gray-400 truncate">{u.aiUsage} IA · {u.tasksCount} tarefas</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

/* ------------------------------ Users ------------------------------ */
const UsersTab: React.FC<{
  users: AdminUser[]; search: string; setSearch: (v: string) => void;
  onPlan: (id: string, plan: PlanId) => void; onBlock: (id: string) => void; onExtend: (id: string, days: number) => void;
}> = ({ users, search, setSearch, onPlan, onBlock, onExtend }) => (
  <div className="space-y-3">
    <div className="relative max-w-sm">
      <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
      <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por nome ou e-mail..."
        className="w-full text-xs pl-9 pr-3 py-2 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-sky-500 text-gray-900 dark:text-zinc-50" />
    </div>
    <div className="rounded-2xl border border-gray-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 divide-y divide-gray-100 dark:divide-zinc-800 overflow-hidden">
      {users.length === 0 ? (
        <p className="text-center text-sm text-gray-400 py-10">Nenhum usuário encontrado.</p>
      ) : users.map((u) => (
        <div key={u.id} className={`flex flex-wrap items-center gap-3 p-3 ${u.blocked ? "opacity-60" : ""}`}>
          <PlanAvatar photoUrl={undefined} plan={u.plan} size={34} />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-gray-800 dark:text-zinc-100 truncate flex items-center gap-1.5">
              {u.name}
              {u.isAdmin && <ShieldCheck className="w-3.5 h-3.5 text-rose-500" />}
              {u.blocked && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-rose-500/15 text-rose-500">BLOQUEADO</span>}
            </p>
            <p className="text-[11px] text-gray-400 truncate">{u.email}</p>
          </div>
          <div className="text-[10px] text-gray-400 hidden md:block">
            <p>Vence: {fmtDate(u.planExpiresAt)}</p>
            <p>{u.aiUsage} IA · {u.groupsCount} grupos</p>
          </div>
          <select value={u.plan} onChange={(e) => onPlan(u.id, e.target.value as PlanId)}
            className="text-xs px-2 py-1.5 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg text-gray-700 dark:text-zinc-200 cursor-pointer">
            {PLAN_ORDER.map((p) => <option key={p} value={p}>{PLANS[p].name}</option>)}
          </select>
          <button onClick={() => onExtend(u.id, 30)} title="Estender 30 dias"
            className="p-1.5 rounded-lg text-gray-400 hover:text-sky-500 hover:bg-sky-500/10 cursor-pointer">
            <CalendarClock className="w-4 h-4" />
          </button>
          <button onClick={() => onBlock(u.id)} title={u.blocked ? "Desbloquear" : "Bloquear"}
            className={`p-1.5 rounded-lg cursor-pointer ${u.blocked ? "text-emerald-500 hover:bg-emerald-500/10" : "text-rose-500 hover:bg-rose-500/10"}`}>
            {u.blocked ? <Unlock className="w-4 h-4" /> : <Ban className="w-4 h-4" />}
          </button>
        </div>
      ))}
    </div>
  </div>
);

/* ------------------------------ Billing ------------------------------ */
const Billing: React.FC<{ users: AdminUser[]; metrics: ReturnType<typeof computeMetrics> }> = ({ metrics }) => {
  const revenueByPlan = PLAN_ORDER.filter((p) => PLANS[p].paid).map((p) => ({ p, total: metrics.byPlan[p] * planPrice(p) }));
  const maxRev = Math.max(1, ...revenueByPlan.map((r) => r.total));
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <Stat icon={<TrendingUp className="w-4 h-4 text-white" />} label="MRR" value={BRL(metrics.mrr)} tint="bg-emerald-500" />
        <Stat icon={<TrendingUp className="w-4 h-4 text-white" />} label="ARR estimado" value={BRL(metrics.mrr * 12)} tint="bg-teal-500" />
        <Stat icon={<Crown className="w-4 h-4 text-white" />} label="Assinantes" value={String(metrics.paidUsers)} tint="bg-amber-500" />
        <Stat icon={<CalendarClock className="w-4 h-4 text-white" />} label="Vencendo (7d)" value={String(metrics.expiringSoon.length)} tint="bg-rose-500" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-gray-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
          <h3 className="text-[11px] font-bold uppercase tracking-wide text-gray-400 mb-3">Receita por plano (mensal)</h3>
          <div className="space-y-2.5">
            {revenueByPlan.map(({ p, total }) => (
              <div key={p} className="space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-gray-600 dark:text-zinc-300 flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full bg-gradient-to-br ${PLANS[p].frame?.ring || "from-gray-300 to-gray-400"}`} />
                    {PLANS[p].name}
                  </span>
                  <span className="text-gray-500 font-semibold">{BRL(total)}</span>
                </div>
                <div className="h-2 rounded-full bg-gray-100 dark:bg-zinc-800 overflow-hidden">
                  <div className="h-full rounded-full bg-emerald-500" style={{ width: `${(total / maxRev) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-2xl border border-gray-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
          <h3 className="text-[11px] font-bold uppercase tracking-wide text-gray-400 mb-3">Próximos vencimentos</h3>
          {metrics.expiringSoon.length === 0 ? (
            <p className="text-xs text-gray-400 py-6 text-center">Nada vencendo nos próximos 7 dias.</p>
          ) : (
            <div className="space-y-2">
              {metrics.expiringSoon.map((u) => (
                <div key={u.id} className="flex items-center justify-between text-xs">
                  <span className="text-gray-700 dark:text-zinc-200 truncate">{u.name}</span>
                  <span className="text-rose-500 font-semibold shrink-0">{fmtDate(u.planExpiresAt)} · {PLANS[u.plan].name}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <p className="text-[10px] text-gray-400 dark:text-zinc-600">Valores estimados a partir dos planos ativos. Faturamento real virá do Stripe quando a cobrança estiver configurada (ver BILLING.md).</p>
    </div>
  );
};

/* ------------------------------ Plans & Offers ------------------------------ */
const PlansOffers: React.FC<{ config: AdminConfig; onChange: (c: AdminConfig) => void; notify: (m: string, t?: any) => void }> = ({ config, onChange, notify }) => {
  const [planId, setPlanId] = useState<PlanId>("ouro");
  const [pct, setPct] = useState(20);
  const [label, setLabel] = useState("");

  const addOffer = () => {
    if (pct <= 0 || pct > 90) { notify("Desconto inválido.", "error"); return; }
    const offer: Offer = { id: rid("of"), planId, discountPct: pct, label: label.trim() || `${pct}% no ${PLANS[planId].name}`, active: true };
    onChange({ ...config, offers: [offer, ...config.offers] });
    setLabel(""); notify("Oferta criada.", "success");
  };
  const toggleOffer = (id: string) => onChange({ ...config, offers: config.offers.map((o) => o.id === id ? { ...o, active: !o.active } : o) });
  const delOffer = (id: string) => onChange({ ...config, offers: config.offers.filter((o) => o.id !== id) });
  const setBest = (p: PlanId) => { onChange({ ...config, bestOffer: p }); notify(`${PLANS[p].name} marcado como melhor oferta.`, "success"); };

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-[11px] font-bold uppercase tracking-wide text-gray-400 mb-2">Planos · defina a "melhor oferta"</h3>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {PLAN_ORDER.map((p) => (
            <button key={p} onClick={() => setBest(p)}
              className={`rounded-xl border p-3 text-center cursor-pointer transition-all ${config.bestOffer === p ? "border-amber-400 bg-amber-500/10" : "border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-amber-300"}`}>
              <div className={`w-6 h-6 mx-auto rounded-full bg-gradient-to-br ${PLANS[p].frame?.ring || "from-gray-200 to-gray-400"} ${PLANS[p].frame?.glow || ""}`} />
              <p className="text-xs font-bold text-gray-800 dark:text-zinc-100">{PLANS[p].name}</p>
              <p className="text-[10px] text-gray-400">{PLANS[p].price}</p>
              {config.bestOffer === p && <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-amber-600 mt-1"><Star className="w-2.5 h-2.5" />Destaque</span>}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-gray-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
        <h3 className="text-[11px] font-bold uppercase tracking-wide text-gray-400 mb-3">Criar oferta / desconto</h3>
        <div className="flex flex-wrap items-end gap-2">
          <div>
            <label className="block text-[10px] text-gray-400 mb-1">Plano</label>
            <select value={planId} onChange={(e) => setPlanId(e.target.value as PlanId)} className="text-xs px-2 py-2 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg cursor-pointer">
              {PLAN_ORDER.filter((p) => PLANS[p].paid).map((p) => <option key={p} value={p}>{PLANS[p].name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[10px] text-gray-400 mb-1">Desconto %</label>
            <input type="number" value={pct} min={1} max={90} onChange={(e) => setPct(parseInt(e.target.value) || 0)} className="w-20 text-xs px-2 py-2 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg" />
          </div>
          <div className="flex-1 min-w-[140px]">
            <label className="block text-[10px] text-gray-400 mb-1">Rótulo (opcional)</label>
            <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Ex: Black Friday" className="w-full text-xs px-2 py-2 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg" />
          </div>
          <button onClick={addOffer} className="flex items-center gap-1 px-3 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold cursor-pointer">
            <Plus className="w-4 h-4" /> Criar
          </button>
        </div>
      </div>

      <div className="space-y-2">
        {config.offers.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-4">Nenhuma oferta criada.</p>
        ) : config.offers.map((o) => (
          <div key={o.id} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 dark:border-zinc-800 bg-white dark:bg-zinc-900">
            <Percent className="w-4 h-4 text-emerald-500 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-gray-800 dark:text-zinc-100 truncate">{o.label}</p>
              <p className="text-[10px] text-gray-400">{PLANS[o.planId].name} · {o.discountPct}% off</p>
            </div>
            <button onClick={() => toggleOffer(o.id)} className={`text-[10px] font-bold px-2 py-1 rounded-lg cursor-pointer ${o.active ? "bg-emerald-500/15 text-emerald-600" : "bg-gray-100 dark:bg-zinc-800 text-gray-400"}`}>
              {o.active ? "Ativa" : "Inativa"}
            </button>
            <button onClick={() => delOffer(o.id)} className="p-1 text-gray-400 hover:text-rose-500 cursor-pointer"><Trash2 className="w-4 h-4" /></button>
          </div>
        ))}
      </div>
    </div>
  );
};

/* ------------------------------ Campaigns ------------------------------ */
const Campaigns: React.FC<{ config: AdminConfig; onChange: (c: AdminConfig) => void; notify: (m: string, t?: any) => void }> = ({ config, onChange, notify }) => {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");

  const add = () => {
    if (!title.trim()) { notify("Dê um título à campanha.", "error"); return; }
    const c: Campaign = { id: rid("cmp"), title: title.trim(), message: message.trim(), active: true, startedAt: new Date().toISOString() };
    onChange({ ...config, campaigns: [c, ...config.campaigns] });
    setTitle(""); setMessage(""); notify("Campanha iniciada.", "success");
  };
  const toggle = (id: string) => onChange({ ...config, campaigns: config.campaigns.map((c) => c.id === id ? { ...c, active: !c.active } : c) });
  const del = (id: string) => onChange({ ...config, campaigns: config.campaigns.filter((c) => c.id !== id) });

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-gray-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 space-y-2">
        <h3 className="text-[11px] font-bold uppercase tracking-wide text-gray-400">Nova campanha</h3>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Título (ex: Volta às aulas)" className="w-full text-sm px-3 py-2 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg" />
        <textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Mensagem exibida aos usuários..." rows={2} className="w-full text-xs px-3 py-2 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg resize-none" />
        <button onClick={add} className="flex items-center gap-1 px-3 py-2 rounded-lg bg-gradient-to-r from-violet-500 to-sky-500 text-white text-xs font-bold cursor-pointer">
          <Megaphone className="w-4 h-4" /> Iniciar campanha
        </button>
      </div>
      <div className="space-y-2">
        {config.campaigns.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-4">Nenhuma campanha ainda.</p>
        ) : config.campaigns.map((c) => (
          <div key={c.id} className="flex items-start gap-3 p-3 rounded-xl border border-gray-100 dark:border-zinc-800 bg-white dark:bg-zinc-900">
            <Megaphone className="w-4 h-4 text-violet-500 shrink-0 mt-0.5" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-gray-800 dark:text-zinc-100">{c.title}</p>
              {c.message && <p className="text-[11px] text-gray-500 dark:text-zinc-400">{c.message}</p>}
              <p className="text-[10px] text-gray-400 mt-0.5">Início: {fmtDate(c.startedAt)}</p>
            </div>
            <button onClick={() => toggle(c.id)} className={`text-[10px] font-bold px-2 py-1 rounded-lg cursor-pointer shrink-0 ${c.active ? "bg-emerald-500/15 text-emerald-600" : "bg-gray-100 dark:bg-zinc-800 text-gray-400"}`}>
              {c.active ? "Ativa" : "Pausada"}
            </button>
            <button onClick={() => del(c.id)} className="p-1 text-gray-400 hover:text-rose-500 cursor-pointer shrink-0"><Trash2 className="w-4 h-4" /></button>
          </div>
        ))}
      </div>
    </div>
  );
};

/* ------------------------------ Appearance / Temas ------------------------------ */

/** Prévia em miniatura da interface com os tokens do tema. */
const ThemePreview: React.FC<{ accent: string; hue: number; sat: number; from: string; to: string }> = ({ accent, hue, sat, from, to }) => {
  const bg = surfacePreviewColor(hue, sat, "950");
  const panel = surfacePreviewColor(hue, sat, "900");
  const line = surfacePreviewColor(hue, sat, "800");
  return (
    <div className="h-20 w-full flex overflow-hidden" style={{ background: bg }} aria-hidden>
      {/* rail lateral */}
      <div className="w-8 h-full shrink-0 flex flex-col items-center gap-1.5 pt-2" style={{ background: panel }}>
        <span className="w-3.5 h-3.5 rounded-md" style={{ background: accent }} />
        <span className="w-3.5 h-3.5 rounded-md" style={{ background: line }} />
        <span className="w-3.5 h-3.5 rounded-md" style={{ background: line }} />
      </div>
      {/* conteúdo */}
      <div className="flex-1 p-2.5 space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="block w-16 h-1.5 rounded-full" style={{ background: line }} />
          <span className="block w-8 h-3 rounded-md" style={{ background: accent }} />
        </div>
        <span className="block w-full h-6 rounded-lg" style={{ background: panel }} />
        <span
          className="block w-2/3 h-1.5 rounded-full"
          style={{ background: `linear-gradient(90deg, ${from}, ${to})` }}
        />
      </div>
    </div>
  );
};

const Appearance: React.FC<{ notify: (m: string, t?: any) => void }> = ({ notify }) => {
  const [cfg, setCfg] = useState<SiteThemeConfig>(() => loadSiteTheme());

  const apply = (next: SiteThemeConfig) => {
    setCfg(next);
    saveSiteTheme(next);
  };
  const applyPreset = (p: ThemePreset) => {
    const { id: _i, name: _n, description: _d, ...conf } = p;
    apply(conf);
    notify(`Tema "${p.name}" aplicado.`, "success");
  };
  const set = (patch: Partial<SiteThemeConfig>) => setCfg((c) => ({ ...c, preset: "custom", ...patch }));

  const currentTone = SURFACE_TONES.find((t) => t.hue === cfg.surfaceHue && t.sat === cfg.surfaceSat);
  const field = "w-full text-xs px-2.5 py-2 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg text-gray-800 dark:text-zinc-100";

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-[11px] font-bold uppercase tracking-wide text-gray-400 mb-0.5">Edições sazonais</h3>
        <p className="text-[11px] text-gray-400 dark:text-zinc-500 mb-2.5">
          Cada edição redefine a paleta completa da interface — cor de destaque e tom das superfícies — mantendo contraste e hierarquia.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {THEME_PRESETS.map((p) => (
            <button
              key={p.id}
              onClick={() => applyPreset(p)}
              className={`rounded-2xl border text-left overflow-hidden cursor-pointer transition-all ${
                cfg.preset === p.id
                  ? "border-sky-500 ring-2 ring-sky-500/25"
                  : "border-gray-200 dark:border-zinc-800 hover:border-sky-400/60"
              }`}
            >
              <ThemePreview accent={p.accent} hue={p.surfaceHue} sat={p.surfaceSat} from={p.bannerFrom} to={p.bannerTo} />
              <div className="p-3 bg-white dark:bg-zinc-900">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-bold text-gray-800 dark:text-zinc-100">{p.name}</p>
                  {cfg.preset === p.id && (
                    <span className="shrink-0 w-4 h-4 rounded-full bg-sky-500 flex items-center justify-center">
                      <Check className="w-2.5 h-2.5 text-white" />
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-gray-400 dark:text-zinc-500 mt-0.5 leading-snug">{p.description}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-gray-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 space-y-3">
        <h3 className="text-[11px] font-bold uppercase tracking-wide text-gray-400">Personalizado</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-[10px] text-gray-400 mb-1">Título do site</label>
            <input value={cfg.title} onChange={(e) => set({ title: e.target.value })} className={field} />
          </div>
          <div>
            <label className="block text-[10px] text-gray-400 mb-1">Tom das superfícies</label>
            <select
              value={currentTone?.id ?? "custom"}
              onChange={(e) => {
                const tone = SURFACE_TONES.find((t) => t.id === e.target.value);
                if (tone) set({ surfaceHue: tone.hue, surfaceSat: tone.sat });
              }}
              className={field + " cursor-pointer"}
            >
              {!currentTone && <option value="custom">Personalizado</option>}
              {SURFACE_TONES.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="block text-[10px] text-gray-400 mb-1">Mensagem do banner (vazio = sem banner)</label>
            <input value={cfg.banner} onChange={(e) => set({ banner: e.target.value })} placeholder="Ex: Novidades chegando esta semana." className={field} />
          </div>
          <div>
            <label className="block text-[10px] text-gray-400 mb-1">Cor de destaque (retinge toda a interface)</label>
            <input type="color" value={cfg.accent} onChange={(e) => set({ accent: e.target.value })} className="w-full h-9 rounded-lg border border-gray-200 dark:border-zinc-700 bg-transparent cursor-pointer" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] text-gray-400 mb-1">Banner: cor inicial</label>
              <input type="color" value={cfg.bannerFrom} onChange={(e) => set({ bannerFrom: e.target.value })} className="w-full h-9 rounded-lg border border-gray-200 dark:border-zinc-700 bg-transparent cursor-pointer" />
            </div>
            <div>
              <label className="block text-[10px] text-gray-400 mb-1">Banner: cor final</label>
              <input type="color" value={cfg.bannerTo} onChange={(e) => set({ bannerTo: e.target.value })} className="w-full h-9 rounded-lg border border-gray-200 dark:border-zinc-700 bg-transparent cursor-pointer" />
            </div>
          </div>
        </div>

        {/* Prévia ao vivo da personalização */}
        <div className="pt-1">
          <p className="text-[10px] text-gray-400 mb-1.5">Prévia</p>
          <div className="rounded-xl border border-gray-200 dark:border-zinc-800 overflow-hidden max-w-sm">
            <ThemePreview accent={cfg.accent} hue={cfg.surfaceHue} sat={cfg.surfaceSat} from={cfg.bannerFrom} to={cfg.bannerTo} />
          </div>
        </div>

        <div className="flex items-center gap-2 pt-1">
          <button onClick={() => { apply({ ...cfg, preset: "custom" }); notify("Personalização aplicada.", "success"); }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold cursor-pointer transition-colors">
            <Check className="w-4 h-4" /> Aplicar
          </button>
          <button onClick={() => { apply({ ...DEFAULT_THEME }); notify("Tema restaurado ao padrão.", "info"); }}
            className="px-3 py-2 rounded-lg text-xs font-semibold text-gray-500 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800 cursor-pointer">
            Restaurar padrão
          </button>
        </div>
      </div>
      <p className="text-[10px] text-gray-400 dark:text-zinc-600">Em modo cloud, o tema aplicado aqui é sincronizado para todos os usuários; em modo demo, vale apenas neste navegador.</p>
    </div>
  );
};

export default AdminPanel;
