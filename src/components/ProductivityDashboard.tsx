/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo } from "react";
import { AnimatePresence, motion } from "motion/react";
import { X, BarChart3, Download, CheckCircle2, Clock, AlertTriangle, ListTodo, TrendingUp } from "lucide-react";
import { useApp } from "../context/AppContext";
import { useToast } from "../context/ToastContext";
import type { Task } from "../types";

const todayISO = () => new Date().toISOString().slice(0, 10);

const csvCell = (v: string | undefined): string => {
  const s = (v ?? "").replace(/"/g, '""');
  return /[",\n;]/.test(s) ? `"${s}"` : s;
};

const STATUS_LABEL: Record<string, string> = {
  pending: "Pendente",
  in_progress: "Em progresso",
  review: "Em revisão",
  completed: "Concluída",
};

const PRIORITY_LABEL: Record<string, string> = { high: "Alta", medium: "Média", low: "Baixa" };

const Stat: React.FC<{ icon: React.ReactNode; label: string; value: string | number; tint: string }> = ({ icon, label, value, tint }) => (
  <div className="rounded-2xl border border-gray-100 dark:border-zinc-800 bg-gray-50/60 dark:bg-zinc-950/40 p-3.5">
    <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2 ${tint}`}>{icon}</div>
    <p className="text-2xl font-extrabold text-gray-900 dark:text-zinc-50 leading-none">{value}</p>
    <p className="text-[11px] text-gray-400 dark:text-zinc-500 mt-1">{label}</p>
  </div>
);

const Bar: React.FC<{ label: string; value: number; total: number; color: string }> = ({ label, value, total, color }) => {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[11px]">
        <span className="text-gray-600 dark:text-zinc-300">{label}</span>
        <span className="text-gray-400 dark:text-zinc-500">{value}</span>
      </div>
      <div className="h-2 rounded-full bg-gray-100 dark:bg-zinc-800 overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
};

const ProductivityDashboard: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const { activeTab, tasks, allGroupTasks, auditLogs, selectedGroup, selectedSubgroup } = useApp();
  const notify = useToast();

  const isGroupWide = activeTab === "groups" && !!selectedGroup && !selectedSubgroup;
  const data: Task[] = isGroupWide ? allGroupTasks : tasks;

  const scopeLabel = activeTab === "personal"
    ? selectedSubgroup ? `Pessoal · ${selectedSubgroup.name}` : "Área Pessoal"
    : isGroupWide
      ? `${selectedGroup?.name ?? "Grupo"} (todos os subgrupos)`
      : `${selectedGroup?.name ?? "Grupo"} · ${selectedSubgroup?.name ?? ""}`;

  const stats = useMemo(() => {
    const today = todayISO();
    const total = data.length;
    const byStatus = { pending: 0, in_progress: 0, review: 0, completed: 0 } as Record<string, number>;
    const byPriority = { high: 0, medium: 0, low: 0 } as Record<string, number>;
    let overdue = 0;
    for (const t of data) {
      byStatus[t.status] = (byStatus[t.status] || 0) + 1;
      byPriority[t.priority] = (byPriority[t.priority] || 0) + 1;
      if (t.dueDate && t.dueDate < today && t.status !== "completed") overdue++;
    }
    const completionRate = total > 0 ? Math.round((byStatus.completed / total) * 100) : 0;

    // Concluídas por membro (a partir da auditoria do grupo)
    const byMember = new Map<string, number>();
    for (const log of auditLogs) {
      if (log.action === "complete") byMember.set(log.performedBy, (byMember.get(log.performedBy) || 0) + 1);
    }
    const topMembers = [...byMember.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);

    return { total, byStatus, byPriority, overdue, completionRate, topMembers };
  }, [data, auditLogs]);

  const exportCsv = () => {
    const header = ["Título", "Status", "Prioridade", "Prazo", "Responsável", "Criada em"];
    const rows = data.map((t) => [
      csvCell(t.title),
      csvCell(STATUS_LABEL[t.status] || t.status),
      csvCell(PRIORITY_LABEL[t.priority] || t.priority),
      csvCell(t.dueDate || ""),
      csvCell(t.assignedToName || ""),
      csvCell(t.createdAt ? t.createdAt.slice(0, 10) : ""),
    ]);
    const csv = [header, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `worksync-tarefas-${todayISO()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    notify(`${data.length} tarefas exportadas em CSV.`, "success");
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: 30, scale: 0.98, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            exit={{ y: 30, scale: 0.98, opacity: 0 }}
            transition={{ type: "spring", damping: 26, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full sm:max-w-2xl bg-white dark:bg-zinc-900 rounded-t-3xl sm:rounded-3xl border border-gray-200 dark:border-zinc-800 shadow-2xl max-h-[92dvh] flex flex-col overflow-hidden"
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-zinc-800 shrink-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shrink-0">
                  <BarChart3 className="w-5 h-5 text-white" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-base font-bold text-gray-900 dark:text-zinc-50 leading-tight">Produtividade</h2>
                  <p className="text-[11px] text-gray-400 dark:text-zinc-500 truncate">{scopeLabel}</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={exportCsv}
                  disabled={data.length === 0}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-zinc-300 hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors cursor-pointer disabled:opacity-40"
                  title="Exportar tarefas em CSV"
                >
                  <Download className="w-4 h-4" /> <span className="hidden sm:inline">CSV</span>
                </button>
                <button onClick={onClose} className="p-1.5 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto scrollbar-thin p-5 space-y-5">
              {stats.total === 0 ? (
                <div className="h-48 flex flex-col items-center justify-center text-center gap-2">
                  <BarChart3 className="w-8 h-8 text-gray-300 dark:text-zinc-700" />
                  <p className="text-sm font-medium text-gray-500 dark:text-zinc-400">Sem tarefas para analisar ainda.</p>
                  <p className="text-xs text-gray-400 dark:text-zinc-500">Crie tarefas para ver suas métricas aqui.</p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    <Stat icon={<ListTodo className="w-4 h-4 text-white" />} label="Total" value={stats.total} tint="bg-sky-500" />
                    <Stat icon={<CheckCircle2 className="w-4 h-4 text-white" />} label="Concluídas" value={stats.byStatus.completed} tint="bg-emerald-500" />
                    <Stat icon={<Clock className="w-4 h-4 text-white" />} label="Em andamento" value={stats.byStatus.pending + stats.byStatus.in_progress + stats.byStatus.review} tint="bg-amber-500" />
                    <Stat icon={<AlertTriangle className="w-4 h-4 text-white" />} label="Atrasadas" value={stats.overdue} tint="bg-rose-500" />
                  </div>

                  <div className="rounded-2xl border border-gray-100 dark:border-zinc-800 p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-gray-600 dark:text-zinc-300 flex items-center gap-1.5">
                        <TrendingUp className="w-4 h-4 text-emerald-500" /> Taxa de conclusão
                      </span>
                      <span className="text-sm font-extrabold text-emerald-500">{stats.completionRate}%</span>
                    </div>
                    <div className="h-2.5 rounded-full bg-gray-100 dark:bg-zinc-800 overflow-hidden">
                      <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500" style={{ width: `${stats.completionRate}%` }} />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2.5">
                      <h3 className="text-[11px] font-bold uppercase tracking-wide text-gray-400 dark:text-zinc-500">Por status</h3>
                      <Bar label="Pendente" value={stats.byStatus.pending} total={stats.total} color="bg-gray-400" />
                      <Bar label="Em progresso" value={stats.byStatus.in_progress} total={stats.total} color="bg-sky-500" />
                      <Bar label="Em revisão" value={stats.byStatus.review} total={stats.total} color="bg-violet-500" />
                      <Bar label="Concluída" value={stats.byStatus.completed} total={stats.total} color="bg-emerald-500" />
                    </div>
                    <div className="space-y-2.5">
                      <h3 className="text-[11px] font-bold uppercase tracking-wide text-gray-400 dark:text-zinc-500">Por prioridade</h3>
                      <Bar label="Alta" value={stats.byPriority.high} total={stats.total} color="bg-red-500" />
                      <Bar label="Média" value={stats.byPriority.medium} total={stats.total} color="bg-amber-500" />
                      <Bar label="Baixa" value={stats.byPriority.low} total={stats.total} color="bg-emerald-500" />
                    </div>
                  </div>

                  {stats.topMembers.length > 0 && (
                    <div className="space-y-2.5">
                      <h3 className="text-[11px] font-bold uppercase tracking-wide text-gray-400 dark:text-zinc-500">Concluídas por membro</h3>
                      {stats.topMembers.map(([name, count]) => (
                        <Bar key={name} label={name} value={count} total={stats.topMembers[0][1]} color="bg-gradient-to-r from-violet-500 to-sky-500" />
                      ))}
                      <p className="text-[10px] text-gray-400 dark:text-zinc-600">Baseado no histórico de auditoria do grupo.</p>
                    </div>
                  )}
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ProductivityDashboard;
