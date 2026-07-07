/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef } from "react";
import { useApp } from "../context/AppContext";
import { useToast } from "../context/ToastContext";
import type { Task } from "../types";

/**
 * Vigia headless de prazos: avisa (toast + notificação nativa quando permitida)
 * sobre tarefas com prazo para hoje ou já atrasadas. Roda ao carregar, a cada
 * 30 min e sempre que a lista de tarefas muda. Evita spam: cada tarefa só gera
 * um aviso por dia (dedup em localStorage por usuário/data).
 */

const CHECK_INTERVAL_MS = 30 * 60 * 1000;
const todayISO = () => new Date().toISOString().slice(0, 10);

const DeadlineReminders: React.FC = () => {
  const { currentUser, tasks, allGroupTasks } = useApp();
  const notify = useToast();
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!currentUser) return;

    const run = () => {
      const today = todayISO();
      const key = `worksync_reminded_${currentUser.id}_${today}`;
      let reminded: string[] = [];
      try {
        reminded = JSON.parse(localStorage.getItem(key) || "[]");
      } catch {
        reminded = [];
      }

      // Considera as tarefas do contexto atual + as do grupo, sem duplicar por id.
      const seen = new Set<string>();
      const pool: Task[] = [];
      for (const t of [...tasks, ...allGroupTasks]) {
        if (t.id && !seen.has(t.id)) {
          seen.add(t.id);
          pool.push(t);
        }
      }

      const due = pool.filter(
        (t) => t.dueDate && t.dueDate <= today && t.status !== "completed" && !reminded.includes(t.id)
      );
      if (due.length === 0) return;

      const overdue = due.filter((t) => (t.dueDate as string) < today).length;
      const forToday = due.length - overdue;

      let msg: string;
      if (overdue && forToday) {
        msg = `${forToday} tarefa(s) vencem hoje e ${overdue} está(ão) atrasada(s).`;
      } else if (overdue) {
        msg = overdue === 1 ? "Você tem 1 tarefa atrasada." : `Você tem ${overdue} tarefas atrasadas.`;
      } else {
        msg = forToday === 1 ? "1 tarefa vence hoje." : `${forToday} tarefas vencem hoje.`;
      }

      notify(`⏰ ${msg}`, "info");

      if (typeof Notification !== "undefined" && Notification.permission === "granted") {
        try {
          new Notification("worksync · Lembrete de prazo", { body: msg, icon: "/icon-192.png" });
        } catch {
          /* alguns navegadores exigem service worker; toast já cobre */
        }
      }

      try {
        localStorage.setItem(key, JSON.stringify([...reminded, ...due.map((t) => t.id)]));
      } catch {
        /* noop */
      }
    };

    // pequeno atraso no primeiro run para não competir com o carregamento inicial
    const initial = setTimeout(run, 4000);
    timerRef.current = setInterval(run, CHECK_INTERVAL_MS);

    return () => {
      clearTimeout(initial);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [currentUser, tasks, allGroupTasks, notify]);

  return null;
};

export default DeadlineReminders;
