/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  Search,
  Sparkles,
  LayoutTemplate,
  BarChart3,
  Crown,
  SunMoon,
  CheckSquare,
  StickyNote,
  Calendar as CalendarIcon,
  Users,
  User2,
  CornerDownLeft,
  FolderOpen,
  Link2,
} from "lucide-react";
import { useApp } from "../context/AppContext";
import { useToast } from "../context/ToastContext";
import { readBillingReturn, clearBillingParam } from "../services/billing";
import BoardTemplatesModal from "./BoardTemplatesModal";
import ProductivityDashboard from "./ProductivityDashboard";
import PlansModal from "./PlansModal";

const stripAccents = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

interface CommandItem {
  id: string;
  section: string;
  label: string;
  sub?: string;
  icon: React.ReactNode;
  keywords?: string;
  run: () => void;
}

/**
 * Paleta de comandos global (Cmd/Ctrl+K): ações rápidas, navegação e busca
 * sobre os dados já carregados (tarefas, notas, compromissos, grupos).
 * Abre via atalho de teclado ou pelo evento window "open-command-palette".
 * Hospeda os modais de Templates, Dashboard e Planos.
 */
const CommandPalette: React.FC = () => {
  const {
    activeTab,
    setActiveTab,
    setActiveModule,
    groups,
    subgroups,
    setSelectedGroup,
    setSelectedSubgroup,
    tasks,
    notebooks,
    calendarEvents,
    toggleTheme,
    selectedGroup,
  } = useApp();
  const notify = useToast();

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);
  const [tplOpen, setTplOpen] = useState(false);
  const [dashOpen, setDashOpen] = useState(false);
  const [plansOpen, setPlansOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Abertura por atalho e por eventos externos
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    const onOpen = () => setOpen(true);
    const onPlans = () => setPlansOpen(true);
    const onTemplates = () => setTplOpen(true);
    const onDashboard = () => setDashOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener("open-command-palette", onOpen);
    window.addEventListener("open-plans", onPlans);
    window.addEventListener("open-templates", onTemplates);
    window.addEventListener("open-dashboard", onDashboard);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("open-command-palette", onOpen);
      window.removeEventListener("open-plans", onPlans);
      window.removeEventListener("open-templates", onTemplates);
      window.removeEventListener("open-dashboard", onDashboard);
    };
  }, []);

  useEffect(() => {
    if (open) {
      setQuery("");
      setCursor(0);
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [open]);

  // Feedback ao voltar do checkout do Stripe (?billing=success|cancel)
  useEffect(() => {
    const r = readBillingReturn();
    if (r === "success") notify("Pagamento concluído! Seu plano será ativado em instantes.", "success");
    else if (r === "cancel") notify("Pagamento cancelado.", "info");
    if (r) clearBillingParam();
  }, [notify]);

  const close = () => setOpen(false);

  const items = useMemo<CommandItem[]>(() => {
    const list: CommandItem[] = [];
    const goModule = (m: "tasks" | "whiteboard" | "notes" | "calendar" | "chat") => () => {
      setActiveModule(m);
      close();
    };

    // Ações
    list.push({
      id: "ai",
      section: "Ações",
      label: "Assistente IA",
      sub: "Organizar por voz",
      icon: <Sparkles className="w-4 h-4 text-violet-500" />,
      keywords: "ia voz falar tarefa audio",
      run: () => {
        close();
        window.dispatchEvent(new Event("open-ai-assistant"));
      },
    });
    list.push({
      id: "templates",
      section: "Ações",
      label: "Templates de quadro",
      sub: "Sprint, onboarding, conteúdo…",
      icon: <LayoutTemplate className="w-4 h-4 text-sky-500" />,
      keywords: "template modelo quadro sprint",
      run: () => {
        close();
        setTplOpen(true);
      },
    });
    list.push({
      id: "dashboard",
      section: "Ações",
      label: "Dashboard de produtividade",
      sub: "Métricas e exportar CSV",
      icon: <BarChart3 className="w-4 h-4 text-emerald-500" />,
      keywords: "dashboard metrica relatorio csv produtividade",
      run: () => {
        close();
        setDashOpen(true);
      },
    });
    list.push({
      id: "plans",
      section: "Ações",
      label: "Ver planos",
      sub: "Free, Pro e Team",
      icon: <Crown className="w-4 h-4 text-amber-500" />,
      keywords: "plano pro assinar upgrade pagar",
      run: () => {
        close();
        setPlansOpen(true);
      },
    });
    list.push({
      id: "theme",
      section: "Ações",
      label: "Alternar tema claro/escuro",
      icon: <SunMoon className="w-4 h-4 text-gray-400" />,
      keywords: "tema dark light escuro claro",
      run: () => {
        toggleTheme();
        close();
      },
    });
    if (selectedGroup && !selectedGroup.id.startsWith("dm_")) {
      list.push({
        id: "invite",
        section: "Ações",
        label: "Copiar link de convite do grupo",
        sub: selectedGroup.name,
        icon: <Link2 className="w-4 h-4 text-teal-500" />,
        keywords: "convite convidar link compartilhar entrar codigo",
        run: () => {
          const link = `${window.location.origin}${window.location.pathname}?join=${selectedGroup.code}`;
          const done = () => notify("Link de convite copiado!", "success");
          if (navigator.clipboard?.writeText) {
            navigator.clipboard.writeText(link).then(done, () => notify(link, "info"));
          } else {
            notify(link, "info");
          }
          close();
        },
      });
    }

    // Navegação
    list.push({
      id: "nav-personal",
      section: "Ir para",
      label: "Área Pessoal",
      icon: <User2 className="w-4 h-4 text-emerald-500" />,
      keywords: "pessoal home",
      run: () => {
        setActiveTab("personal");
        setSelectedGroup(null);
        setSelectedSubgroup(null);
        close();
      },
    });
    list.push({ id: "nav-tasks", section: "Ir para", label: "Tarefas", icon: <CheckSquare className="w-4 h-4 text-sky-500" />, run: goModule("tasks") });
    list.push({ id: "nav-notes", section: "Ir para", label: "Notas", icon: <StickyNote className="w-4 h-4 text-amber-500" />, run: goModule("notes") });
    list.push({ id: "nav-cal", section: "Ir para", label: "Calendário", icon: <CalendarIcon className="w-4 h-4 text-violet-500" />, run: goModule("calendar") });

    // Grupos
    for (const g of groups) {
      if (g.id.startsWith("dm_")) continue;
      list.push({
        id: "grp-" + g.id,
        section: "Grupos",
        label: g.name,
        sub: g.description,
        icon: <Users className="w-4 h-4 text-sky-500" />,
        keywords: "grupo " + g.name,
        run: () => {
          setActiveTab("groups");
          setSelectedGroup(g);
          setSelectedSubgroup(null);
          close();
        },
      });
    }

    // Subgrupos do grupo atual
    for (const s of subgroups) {
      list.push({
        id: "sub-" + s.id,
        section: "Subgrupos",
        label: s.name,
        sub: s.description,
        icon: <FolderOpen className="w-4 h-4 text-teal-500" />,
        keywords: "subgrupo canal " + s.name,
        run: () => {
          setSelectedSubgroup(s);
          setActiveModule("tasks");
          close();
        },
      });
    }

    // Dados carregados (contexto atual)
    for (const t of tasks) {
      list.push({
        id: "task-" + t.id,
        section: "Tarefas",
        label: t.title,
        sub: t.dueDate ? `Prazo ${t.dueDate}` : undefined,
        icon: <CheckSquare className="w-4 h-4 text-gray-400" />,
        keywords: "tarefa " + (t.tags || []).join(" "),
        run: goModule("tasks"),
      });
    }
    for (const n of notebooks) {
      list.push({
        id: "note-" + n.id,
        section: "Notas",
        label: n.title || "(sem título)",
        icon: <StickyNote className="w-4 h-4 text-gray-400" />,
        keywords: "nota",
        run: goModule("notes"),
      });
    }
    for (const ev of calendarEvents) {
      list.push({
        id: "ev-" + ev.id,
        section: "Compromissos",
        label: ev.title,
        sub: ev.date,
        icon: <CalendarIcon className="w-4 h-4 text-gray-400" />,
        keywords: "compromisso evento",
        run: goModule("calendar"),
      });
    }

    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groups, subgroups, tasks, notebooks, calendarEvents, activeTab, selectedGroup]);

  const filtered = useMemo(() => {
    const q = stripAccents(query.trim());
    if (!q) return items.slice(0, 40);
    return items
      .filter((it) => stripAccents(it.label + " " + (it.sub || "") + " " + (it.keywords || "")).includes(q))
      .slice(0, 40);
  }, [query, items]);

  useEffect(() => {
    setCursor(0);
  }, [query]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setCursor((c) => Math.min(c + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setCursor((c) => Math.max(c - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      filtered[cursor]?.run();
    } else if (e.key === "Escape") {
      e.preventDefault();
      close();
    }
  };

  // mantém o item selecionado visível
  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-idx="${cursor}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [cursor]);

  // agrupa por seção preservando a ordem filtrada
  const grouped = useMemo(() => {
    const map = new Map<string, { item: CommandItem; idx: number }[]>();
    filtered.forEach((item, idx) => {
      const arr = map.get(item.section) || [];
      arr.push({ item, idx });
      map.set(item.section, arr);
    });
    return [...map.entries()];
  }, [filtered]);

  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-start justify-center bg-black/50 backdrop-blur-sm p-3 pt-[12vh]"
            onClick={close}
          >
            <motion.div
              initial={{ y: -16, scale: 0.98, opacity: 0 }}
              animate={{ y: 0, scale: 1, opacity: 1 }}
              exit={{ y: -16, scale: 0.98, opacity: 0 }}
              transition={{ type: "spring", damping: 26, stiffness: 320 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-xl bg-white dark:bg-zinc-900 rounded-2xl border border-gray-200 dark:border-zinc-800 shadow-2xl overflow-hidden flex flex-col max-h-[70dvh]"
            >
              <div className="flex items-center gap-2.5 px-4 py-3 border-b border-gray-100 dark:border-zinc-800">
                <Search className="w-4 h-4 text-gray-400 shrink-0" />
                <input
                  ref={inputRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={onKeyDown}
                  placeholder="Buscar tarefas, ações, grupos…"
                  className="flex-1 bg-transparent text-sm text-gray-800 dark:text-zinc-100 placeholder-gray-400 dark:placeholder-zinc-600 focus:outline-none"
                />
                <kbd className="hidden sm:inline text-[10px] font-mono text-gray-400 dark:text-zinc-600 border border-gray-200 dark:border-zinc-700 rounded px-1.5 py-0.5">esc</kbd>
              </div>

              <div ref={listRef} className="flex-1 overflow-y-auto scrollbar-thin py-2">
                {filtered.length === 0 ? (
                  <p className="text-center text-sm text-gray-400 dark:text-zinc-500 py-10">Nenhum resultado.</p>
                ) : (
                  grouped.map(([section, entries]) => (
                    <div key={section} className="px-2">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400 dark:text-zinc-600 px-2 py-1.5">{section}</p>
                      {entries.map(({ item, idx }) => (
                        <button
                          key={item.id}
                          data-idx={idx}
                          onMouseEnter={() => setCursor(idx)}
                          onClick={item.run}
                          className={`w-full flex items-center gap-3 px-2.5 py-2 rounded-lg text-left transition-colors ${
                            idx === cursor ? "bg-gray-100 dark:bg-zinc-800" : "hover:bg-gray-50 dark:hover:bg-zinc-800/50"
                          }`}
                        >
                          <span className="shrink-0">{item.icon}</span>
                          <span className="min-w-0 flex-1">
                            <span className="block text-sm text-gray-800 dark:text-zinc-100 truncate">{item.label}</span>
                            {item.sub && <span className="block text-[11px] text-gray-400 dark:text-zinc-500 truncate">{item.sub}</span>}
                          </span>
                          {idx === cursor && <CornerDownLeft className="w-3.5 h-3.5 text-gray-300 dark:text-zinc-600 shrink-0" />}
                        </button>
                      ))}
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <BoardTemplatesModal open={tplOpen} onClose={() => setTplOpen(false)} />
      <ProductivityDashboard open={dashOpen} onClose={() => setDashOpen(false)} />
      <PlansModal open={plansOpen} onClose={() => setPlansOpen(false)} />
    </>
  );
};

export default CommandPalette;
