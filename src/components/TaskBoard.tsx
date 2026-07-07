/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState } from "react";
import { useApp } from "../context/AppContext";
import {
  Plus,
  Trash2,
  Calendar,
  AlertTriangle,
  CheckCircle,
  User,
  CheckSquare,
  Square,
  Search,
  X,
  Pencil,
  LayoutGrid,
  Columns3,
  Tag,
  Clock,
  ArrowUpDown,
  Repeat,
  Sparkles,
  Loader2,
  MessageSquare,
  Send,
  AtSign,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Task, ChecklistItem, TaskStatus, TaskComment, GroupMember } from "../types";
import { useToast } from "../context/ToastContext";
import { useConfirm } from "../context/ConfirmContext";
import { generateChecklist } from "../services/aiAssistant";

const RECURRENCE_LABEL: Record<string, string> = {
  none: "Não repete",
  daily: "Diária",
  weekly: "Semanal",
  monthly: "Mensal",
};

const MENTION_RE = /@[\wÀ-ÿ]+/g;

const matchMember = (name: string, members: GroupMember[]) => {
  const n = name.toLowerCase();
  return members.find((m) => m.name.toLowerCase() === n || m.name.toLowerCase().split(" ")[0] === n);
};

const detectMentions = (text: string, members: GroupMember[]): string[] => {
  const ids: string[] = [];
  for (const tok of text.match(MENTION_RE) || []) {
    const hit = matchMember(tok.slice(1), members);
    if (hit) ids.push(hit.userId);
  }
  return Array.from(new Set(ids));
};

const renderWithMentions = (text: string, members: GroupMember[]) =>
  text.split(/(@[\wÀ-ÿ]+)/g).map((part, i) => {
    if (part.startsWith("@") && matchMember(part.slice(1), members)) {
      return (
        <span key={i} className="text-sky-600 dark:text-sky-400 font-semibold bg-sky-500/10 rounded px-0.5">
          {part}
        </span>
      );
    }
    return <React.Fragment key={i}>{part}</React.Fragment>;
  });

const fmtCommentTime = (iso: string) => {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

interface TaskBoardProps {
  canEdit: boolean;
}

const STAGES: { id: TaskStatus; name: string; color: string; soft: string; text: string }[] = [
  { id: "pending", name: "A Fazer", color: "#64748b", soft: "bg-slate-500/10 border-slate-500/30", text: "text-slate-600 dark:text-slate-300" },
  { id: "in_progress", name: "Em Progresso", color: "#0ea5e9", soft: "bg-sky-500/10 border-sky-500/30", text: "text-sky-600 dark:text-sky-400" },
  { id: "review", name: "Em Revisão", color: "#f59e0b", soft: "bg-amber-500/10 border-amber-500/30", text: "text-amber-600 dark:text-amber-400" },
  { id: "completed", name: "Concluído", color: "#10b981", soft: "bg-emerald-500/10 border-emerald-500/30", text: "text-emerald-600 dark:text-emerald-400" },
];

const PRIORITY_RANK: Record<string, number> = { high: 0, medium: 1, low: 2 };
const todayStr = () => new Date().toISOString().slice(0, 10);
const isOverdue = (t: Task) => !!t.dueDate && t.dueDate < todayStr() && t.status !== "completed";
const fmtDate = (d: string) => {
  const dt = new Date(d + "T00:00:00");
  return `${String(dt.getDate()).padStart(2, "0")}/${String(dt.getMonth() + 1).padStart(2, "0")}`;
};

export const TaskBoard: React.FC<TaskBoardProps> = ({ canEdit }) => {
  const {
    tasks,
    groupMembers,
    activeTab,
    currentUser,
    selectedGroup,
    createTask,
    toggleTaskStatus,
    updateTaskFields,
    deleteTask,
    isGroupAdmin,
  } = useApp();
  const toast = useToast();
  const confirm = useConfirm();

  const isPersonal = activeTab === "personal";
  // Criador do grupo e admins têm poderes de gestão (excluir/aprovar direto).
  const isGroupLeader = !!(selectedGroup && currentUser && (selectedGroup.creatorId === currentUser.id || isGroupAdmin()));

  const [view, setView] = useState<"kanban" | "list">("kanban");
  const [search, setSearch] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<"all" | "low" | "medium" | "high">("all");
  const [assigneeFilter, setAssigneeFilter] = useState<string>("all");
  const [tagFilter, setTagFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"priority" | "due" | "recent" | "alpha">("priority");

  // ── Create / edit modal ─────────────────────────────────────────────────
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const [fTitle, setFTitle] = useState("");
  const [fDesc, setFDesc] = useState("");
  const [fPriority, setFPriority] = useState<"low" | "medium" | "high">("medium");
  const [fDue, setFDue] = useState("");
  const [fAssigned, setFAssigned] = useState("");
  const [fStatus, setFStatus] = useState<TaskStatus>("pending");
  const [fTags, setFTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [fChecklist, setFChecklist] = useState<ChecklistItem[]>([]);
  const [checkInput, setCheckInput] = useState("");
  const [fRecur, setFRecur] = useState<NonNullable<Task["recurrence"]>>("none");
  const [aiLoading, setAiLoading] = useState(false);
  const [fComments, setFComments] = useState<TaskComment[]>([]);
  const [commentInput, setCommentInput] = useState("");

  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<TaskStatus | null>(null);

  const allTags = useMemo(() => {
    const s = new Set<string>();
    tasks.forEach((t) => (t.tags || []).forEach((tag) => s.add(tag)));
    return Array.from(s).sort();
  }, [tasks]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tasks.filter((t) => {
      const matchSearch = !q || t.title.toLowerCase().includes(q) || (t.description || "").toLowerCase().includes(q);
      const matchPriority = priorityFilter === "all" || t.priority === priorityFilter;
      const matchAssignee =
        assigneeFilter === "all" ||
        (assigneeFilter === "none" ? !t.assignedTo : t.assignedTo === assigneeFilter);
      const matchTag = tagFilter === "all" || (t.tags || []).includes(tagFilter);
      return matchSearch && matchPriority && matchAssignee && matchTag;
    });
  }, [tasks, search, priorityFilter, assigneeFilter, tagFilter]);

  const sortTasks = (arr: Task[]) => {
    const s = [...arr];
    if (sortBy === "priority") s.sort((a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] || (a.dueDate || "9999").localeCompare(b.dueDate || "9999"));
    else if (sortBy === "due") s.sort((a, b) => (a.dueDate || "9999").localeCompare(b.dueDate || "9999"));
    else if (sortBy === "alpha") s.sort((a, b) => a.title.localeCompare(b.title));
    else s.sort((a, b) => (b.order || 0) - (a.order || 0));
    return s;
  };

  const stats = useMemo(() => {
    const byStage: Record<string, number> = { pending: 0, in_progress: 0, review: 0, completed: 0 };
    let overdue = 0;
    tasks.forEach((t) => {
      byStage[t.status] = (byStage[t.status] || 0) + 1;
      if (isOverdue(t)) overdue++;
    });
    const total = tasks.length;
    const pct = total ? Math.round((byStage.completed / total) * 100) : 0;
    return { byStage, overdue, total, pct };
  }, [tasks]);

  // ── Modal helpers ───────────────────────────────────────────────────────
  const openCreate = (status: TaskStatus = "pending") => {
    setEditing(null);
    setFTitle(""); setFDesc(""); setFPriority("medium"); setFDue(""); setFAssigned("");
    setFStatus(status); setFTags([]); setTagInput(""); setFChecklist([]); setCheckInput("");
    setFRecur("none"); setFComments([]); setCommentInput("");
    setModalOpen(true);
  };
  const openEdit = (t: Task) => {
    setEditing(t);
    setFTitle(t.title); setFDesc(t.description || ""); setFPriority(t.priority);
    setFDue(t.dueDate || ""); setFAssigned(t.assignedTo || ""); setFStatus(t.status);
    setFTags(t.tags || []); setTagInput(""); setFChecklist(t.checklist || []); setCheckInput("");
    setFRecur(t.recurrence || "none"); setFComments(t.comments || []); setCommentInput("");
    setModalOpen(true);
  };

  const addComment = async () => {
    const v = commentInput.trim();
    if (!v || !editing) return;
    const c: TaskComment = {
      id: "cmt_" + Math.random().toString(36).slice(2, 8),
      authorId: currentUser?.id || "",
      authorName: currentUser?.name || "Você",
      text: v,
      createdAt: new Date().toISOString(),
      mentions: detectMentions(v, groupMembers),
    };
    const next = [...fComments, c];
    setFComments(next);
    setCommentInput("");
    try {
      await updateTaskFields(editing.id, { comments: next });
    } catch {
      toast("Erro ao enviar comentário.");
    }
  };

  const removeComment = async (id: string) => {
    if (!editing) return;
    const next = fComments.filter((c) => c.id !== id);
    setFComments(next);
    try {
      await updateTaskFields(editing.id, { comments: next });
    } catch {
      toast("Erro ao remover comentário.");
    }
  };

  const generateAiSubtasks = async () => {
    if (!fTitle.trim() || aiLoading) return;
    setAiLoading(true);
    try {
      const steps = await generateChecklist(fTitle.trim(), fDesc.trim());
      const existing = new Set(fChecklist.map((c) => c.text.toLowerCase()));
      const fresh = steps
        .filter((s) => !existing.has(s.toLowerCase()))
        .map((text) => ({ id: "chk_" + Math.random().toString(36).slice(2, 7), text, done: false }));
      if (fresh.length) setFChecklist((prev) => [...prev, ...fresh]);
      else toast("Nenhuma subtarefa nova gerada.", "info");
    } catch {
      toast("Não foi possível gerar subtarefas.");
    } finally {
      setAiLoading(false);
    }
  };

  const addTag = () => {
    const v = tagInput.trim().toLowerCase();
    if (v && !fTags.includes(v)) setFTags([...fTags, v]);
    setTagInput("");
  };
  const addCheck = () => {
    const v = checkInput.trim();
    if (!v) return;
    setFChecklist([...fChecklist, { id: "chk_" + Math.random().toString(36).slice(2, 7), text: v, done: false }]);
    setCheckInput("");
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fTitle.trim()) return;
    let assignedToName = "";
    if (fAssigned === "all") assignedToName = "Geral / Todos";
    else if (fAssigned) assignedToName = groupMembers.find((m) => m.userId === fAssigned)?.name || "";
    try {
      if (editing) {
        await updateTaskFields(editing.id, {
          title: fTitle.trim(), description: fDesc.trim(), priority: fPriority,
          dueDate: fDue, assignedTo: fAssigned, assignedToName, status: fStatus,
          tags: fTags, checklist: fChecklist, recurrence: fRecur,
        });
      } else {
        await createTask(fTitle.trim(), fDesc.trim(), fPriority, fDue, fAssigned || undefined, fChecklist.map((c) => c.text), fTags, fStatus, fRecur);
      }
      setModalOpen(false);
    } catch {
      toast("Erro ao salvar tarefa.");
    }
  };

  const handleDelete = async (t: Task) => {
    if (isPersonal || isGroupLeader) {
      if (await confirm({ title: "Excluir tarefa", message: `Excluir "${t.title}"?`, confirmLabel: "Excluir", tone: "danger" })) {
        deleteTask(t.id);
      }
    } else {
      // group member without leadership -> request deletion
      await updateTaskFields(t.id, {
        deletionRequest: { requestedBy: currentUser?.id || "", requestedByName: currentUser?.name || "", requestedAt: new Date().toISOString(), status: "pending" },
      });
      toast("Solicitação de exclusão enviada ao líder.", "info");
    }
  };

  // ── Drag & drop ─────────────────────────────────────────────────────────
  const onDrop = async (stage: TaskStatus) => {
    setDragOver(null);
    const id = dragId;
    setDragId(null);
    if (!id || !canEdit) return;
    const t = tasks.find((x) => x.id === id);
    if (!t || t.status === stage) return;
    await updateTaskFields(id, { status: stage });
  };

  const cardProps = { canEdit, isPersonal, isGroupLeader, currentUser, toggleTaskStatus, updateTaskFields, openEdit, handleDelete, setDragId, dragId };

  return (
    <div className="h-full flex flex-col min-h-0 font-sans" id="tasks-module-container">
      {/* STATS STRIP */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 mb-3 shrink-0">
        <StatCard label="Total" value={stats.total} color="#6366f1" />
        <StatCard label="A Fazer" value={stats.byStage.pending} color="#64748b" />
        <StatCard label="Em Progresso" value={stats.byStage.in_progress} color="#0ea5e9" />
        <StatCard label="Em Revisão" value={stats.byStage.review} color="#f59e0b" />
        <StatCard label="Atrasadas" value={stats.overdue} color="#f43f5e" alert={stats.overdue > 0} />
        <div className="rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-2.5 flex flex-col justify-center">
          <div className="flex items-center justify-between text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
            <span>Concluído</span><span className="text-emerald-500">{stats.pct}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-gray-100 dark:bg-zinc-800 overflow-hidden">
            <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${stats.pct}%` }} />
          </div>
        </div>
      </div>

      {/* TOOLBAR */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 mb-3 shrink-0">
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[240px]">
          <div className="relative flex-1 max-w-xs min-w-[140px]">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar tarefas..." className="w-full text-xs pl-9 pr-3 py-2 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-sky-500 text-gray-900 dark:text-zinc-50" />
          </div>
          <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value as any)} className="px-2.5 py-2 text-xs bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-lg text-gray-700 dark:text-zinc-300 cursor-pointer">
            <option value="all">Prioridade</option>
            <option value="high">Alta</option>
            <option value="medium">Média</option>
            <option value="low">Baixa</option>
          </select>
          {!isPersonal && (
            <select value={assigneeFilter} onChange={(e) => setAssigneeFilter(e.target.value)} className="px-2.5 py-2 text-xs bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-lg text-gray-700 dark:text-zinc-300 cursor-pointer max-w-[130px]">
              <option value="all">Responsável</option>
              <option value="none">Sem responsável</option>
              {groupMembers.map((m) => <option key={m.userId} value={m.userId}>{m.name}</option>)}
            </select>
          )}
          {allTags.length > 0 && (
            <select value={tagFilter} onChange={(e) => setTagFilter(e.target.value)} className="px-2.5 py-2 text-xs bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-lg text-gray-700 dark:text-zinc-300 cursor-pointer max-w-[120px]">
              <option value="all">Tags</option>
              {allTags.map((t) => <option key={t} value={t}>#{t}</option>)}
            </select>
          )}
          {view === "list" && (
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <ArrowUpDown className="w-3.5 h-3.5" />
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value as any)} className="px-2 py-2 text-xs bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-lg text-gray-700 dark:text-zinc-300 cursor-pointer">
                <option value="priority">Prioridade</option>
                <option value="due">Prazo</option>
                <option value="recent">Recentes</option>
                <option value="alpha">A-Z</option>
              </select>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center p-1 bg-gray-150/80 dark:bg-zinc-800/80 rounded-xl border border-gray-200/50 dark:border-zinc-850 text-xs">
            <button onClick={() => setView("kanban")} className={`px-2.5 py-1.5 font-bold rounded-lg flex items-center gap-1.5 cursor-pointer ${view === "kanban" ? "bg-white dark:bg-zinc-700 text-gray-900 dark:text-white shadow-xs" : "text-gray-500 dark:text-zinc-400"}`}>
              <Columns3 className="w-3.5 h-3.5" /><span className="hidden sm:inline">Quadro</span>
            </button>
            <button onClick={() => setView("list")} className={`px-2.5 py-1.5 font-bold rounded-lg flex items-center gap-1.5 cursor-pointer ${view === "list" ? "bg-white dark:bg-zinc-700 text-gray-900 dark:text-white shadow-xs" : "text-gray-500 dark:text-zinc-400"}`}>
              <LayoutGrid className="w-3.5 h-3.5" /><span className="hidden sm:inline">Lista</span>
            </button>
          </div>
          {canEdit && (
            <button onClick={() => openCreate()} className="px-3.5 py-2 bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-sm transition-all cursor-pointer">
              <Plus className="w-4 h-4" /><span className="hidden sm:inline">Criar Tarefa</span>
            </button>
          )}
        </div>
      </div>

      {/* ══════ KANBAN ══════ */}
      {view === "kanban" ? (
        <div className="flex-1 min-h-0 overflow-x-auto overflow-y-hidden pb-2">
          <div className="flex gap-3 h-full min-h-0" style={{ minWidth: "min-content" }}>
            {STAGES.map((stage) => {
              const colTasks = sortTasks(filtered.filter((t) => t.status === stage.id));
              const isOver = dragOver === stage.id;
              return (
                <div
                  key={stage.id}
                  onDragOver={(e) => { e.preventDefault(); setDragOver(stage.id); }}
                  onDragLeave={() => setDragOver((s) => (s === stage.id ? null : s))}
                  onDrop={() => onDrop(stage.id)}
                  className={`w-[290px] shrink-0 flex flex-col min-h-0 rounded-2xl border transition-all ${isOver ? "border-sky-400 bg-sky-50/40 dark:bg-sky-500/5" : "border-gray-200 dark:border-zinc-800 bg-gray-50/60 dark:bg-zinc-900/40"}`}
                >
                  <div className="flex items-center justify-between px-3 py-2.5 shrink-0">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: stage.color }} />
                      <span className="text-xs font-bold text-gray-800 dark:text-zinc-100">{stage.name}</span>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-gray-200/70 dark:bg-zinc-800 text-gray-500 dark:text-zinc-400">{colTasks.length}</span>
                    </div>
                    {canEdit && (
                      <button onClick={() => openCreate(stage.id)} className="p-1 rounded-lg hover:bg-gray-200 dark:hover:bg-zinc-800 text-gray-400 hover:text-sky-500 cursor-pointer" title="Adicionar nesta etapa">
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <div className="flex-1 min-h-0 overflow-y-auto px-2 pb-2 space-y-2">
                    {colTasks.length === 0 ? (
                      <div className="text-center text-[10px] text-gray-400 dark:text-zinc-600 py-6 border-2 border-dashed border-gray-150 dark:border-zinc-800 rounded-xl">
                        {canEdit ? "Arraste tarefas aqui" : "Vazio"}
                      </div>
                    ) : (
                      colTasks.map((t) => <TaskCard key={t.id} task={t} compact {...cardProps} />)
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* ══════ LIST ══════ */
        <div className="flex-1 overflow-y-auto min-h-0 pb-6">
          {sortTasks(filtered).length === 0 ? (
            <EmptyState />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {sortTasks(filtered).map((t) => <TaskCard key={t.id} task={t} {...cardProps} />)}
            </div>
          )}
        </div>
      )}

      {/* ══════ MODAL ══════ */}
      <AnimatePresence>
        {modalOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <motion.div initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.96, opacity: 0 }} className="bg-white dark:bg-zinc-900 rounded-3xl p-6 w-full max-w-md border border-gray-200 dark:border-zinc-800 shadow-2xl relative max-h-[92dvh] overflow-y-auto scrollbar-thin">
              <button onClick={() => setModalOpen(false)} className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-400"><X className="w-5 h-5" /></button>
              <h3 className="text-sm font-bold text-gray-900 dark:text-zinc-50 mb-4 flex items-center gap-2">
                {editing ? <Pencil className="w-5 h-5 text-sky-500" /> : <CheckSquare className="w-5 h-5 text-sky-500" />}
                {editing ? "Editar Tarefa" : "Nova Tarefa"}
              </h3>
              <form onSubmit={submit} className="space-y-3.5 text-xs">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Título</label>
                  <input value={fTitle} onChange={(e) => setFTitle(e.target.value)} required autoFocus placeholder="Ex: Protótipo de design" className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-sky-500 text-gray-900 dark:text-white font-semibold" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Descrição</label>
                  <textarea value={fDesc} onChange={(e) => setFDesc(e.target.value)} placeholder="Detalhes..." className="w-full px-3.5 py-2 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl focus:outline-none text-gray-900 dark:text-white h-14 resize-none" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Etapa</label>
                    <select value={fStatus} onChange={(e) => setFStatus(e.target.value as TaskStatus)} className="w-full px-3 py-2.5 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-sky-500 text-gray-800 dark:text-zinc-200">
                      {STAGES.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Prazo</label>
                    <input type="date" value={fDue} onChange={(e) => setFDue(e.target.value)} className="w-full px-3 py-2 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-sky-500 text-gray-950 dark:text-gray-50" />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-2">Prioridade</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(["low", "medium", "high"] as const).map((p) => (
                      <button key={p} type="button" onClick={() => setFPriority(p)} className={`py-2 border rounded-xl font-bold uppercase text-[9px] tracking-wider transition-all ${fPriority === p ? (p === "high" ? "bg-rose-500 text-white border-rose-500" : p === "medium" ? "bg-amber-500 text-white border-amber-500" : "bg-emerald-500 text-white border-emerald-500") : "bg-gray-50 border-gray-200 dark:bg-zinc-800 dark:border-zinc-700 text-gray-500 dark:text-zinc-400"}`}>
                        {p === "high" ? "Alta" : p === "medium" ? "Média" : "Baixa"}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1 flex items-center gap-1"><Repeat className="w-3 h-3" /> Repetição</label>
                  <select value={fRecur} onChange={(e) => setFRecur(e.target.value as NonNullable<Task["recurrence"]>)} className="w-full px-3 py-2.5 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-sky-500 text-gray-800 dark:text-zinc-200">
                    <option value="none">Não repete</option>
                    <option value="daily">Diária</option>
                    <option value="weekly">Semanal</option>
                    <option value="monthly">Mensal</option>
                  </select>
                  {fRecur !== "none" && (
                    <p className="text-[10px] text-gray-400 dark:text-zinc-500 mt-1">Ao concluir, uma nova ocorrência é criada automaticamente.</p>
                  )}
                </div>
                {!isPersonal && (
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Atribuir a</label>
                    <select value={fAssigned} onChange={(e) => setFAssigned(e.target.value)} className="w-full px-3 py-2.5 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-sky-500 text-gray-800 dark:text-zinc-200">
                      <option value="">Ninguém / Solo</option>
                      <option value="all">Geral (Todos)</option>
                      {groupMembers.map((m) => <option key={m.userId} value={m.userId}>{m.name}</option>)}
                    </select>
                  </div>
                )}
                {/* Tags */}
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Etiquetas</label>
                  <div className="flex gap-1.5 mb-1.5">
                    <input value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }} placeholder="Adicionar etiqueta..." className="flex-1 px-3 py-1.5 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg text-gray-900 dark:text-white focus:outline-none" />
                    <button type="button" onClick={addTag} className="px-2.5 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-gray-500 rounded-lg"><Plus className="w-4 h-4" /></button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {fTags.map((tag) => (
                      <span key={tag} className="inline-flex items-center gap-1 px-2 py-1 bg-sky-500/10 border border-sky-500/20 text-sky-600 dark:text-sky-300 rounded-lg font-medium">
                        #{tag}
                        <button type="button" onClick={() => setFTags(fTags.filter((x) => x !== tag))} className="hover:text-red-500"><X className="w-3 h-3" /></button>
                      </span>
                    ))}
                    {fTags.length === 0 && <span className="text-[10px] text-gray-400 italic">Nenhuma etiqueta.</span>}
                  </div>
                </div>
                {/* Checklist */}
                <div className="border border-gray-150 dark:border-zinc-800 rounded-xl p-3 bg-zinc-50/50 dark:bg-zinc-900/40">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-semibold text-gray-700 dark:text-zinc-300 text-[11px]">Subtarefas ({fChecklist.filter((c) => c.done).length}/{fChecklist.length})</span>
                    <button
                      type="button"
                      onClick={generateAiSubtasks}
                      disabled={!fTitle.trim() || aiLoading}
                      title="Gerar subtarefas com IA a partir do título"
                      className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold bg-gradient-to-r from-violet-500 to-sky-500 text-white shadow-xs hover:opacity-95 transition-opacity cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {aiLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                      {aiLoading ? "Gerando…" : "Gerar com IA"}
                    </button>
                  </div>
                  <div className="space-y-1 mb-2 max-h-32 overflow-y-auto">
                    {fChecklist.map((c) => (
                      <div key={c.id} className="flex items-center gap-1.5 group">
                        <button type="button" onClick={() => setFChecklist(fChecklist.map((x) => x.id === c.id ? { ...x, done: !x.done } : x))}>
                          {c.done ? <CheckSquare className="w-3.5 h-3.5 text-emerald-500" /> : <Square className="w-3.5 h-3.5 text-gray-300" />}
                        </button>
                        <span className={`flex-1 text-[11px] ${c.done ? "line-through text-gray-400" : "text-gray-700 dark:text-zinc-300"}`}>{c.text}</span>
                        <button type="button" onClick={() => setFChecklist(fChecklist.filter((x) => x.id !== c.id))} className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500"><X className="w-3 h-3" /></button>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-1.5">
                    <input value={checkInput} onChange={(e) => setCheckInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCheck(); } }} placeholder="Nova subtarefa..." className="flex-1 px-3 py-1.5 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg text-gray-900 dark:text-white focus:outline-none" />
                    <button type="button" onClick={addCheck} className="px-2.5 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-gray-500 rounded-lg"><Plus className="w-4 h-4" /></button>
                  </div>
                </div>
                {/* Comentários (somente em tarefa existente) */}
                {editing ? (
                  <div className="border border-gray-150 dark:border-zinc-800 rounded-xl p-3 bg-zinc-50/50 dark:bg-zinc-900/40">
                    <span className="flex items-center gap-1.5 font-semibold text-gray-700 dark:text-zinc-300 mb-2 text-[11px]">
                      <MessageSquare className="w-3.5 h-3.5" /> Comentários ({fComments.length})
                    </span>
                    <div className="space-y-2 mb-2 max-h-40 overflow-y-auto scrollbar-thin">
                      {fComments.length === 0 ? (
                        <p className="text-[10px] text-gray-400 italic">Nenhum comentário. {!isPersonal && "Use @ para mencionar um membro."}</p>
                      ) : (
                        fComments.map((c) => (
                          <div key={c.id} className="group/cmt flex gap-2 text-[11px]">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-gray-800 dark:text-zinc-200">{c.authorName}</span>
                                <span className="text-[9px] text-gray-400">{fmtCommentTime(c.createdAt)}</span>
                              </div>
                              <p className="text-gray-600 dark:text-zinc-400 break-words whitespace-pre-wrap">{renderWithMentions(c.text, groupMembers)}</p>
                            </div>
                            {c.authorId === currentUser?.id && (
                              <button type="button" onClick={() => removeComment(c.id)} className="opacity-0 group-hover/cmt:opacity-100 text-gray-400 hover:text-red-500 shrink-0 self-start"><X className="w-3 h-3" /></button>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                    {!isPersonal && groupMembers.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-1.5">
                        {groupMembers.slice(0, 6).map((m) => (
                          <button
                            key={m.userId}
                            type="button"
                            onClick={() => setCommentInput((prev) => `${prev}${prev && !prev.endsWith(" ") ? " " : ""}@${m.name.split(" ")[0]} `)}
                            className="inline-flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 rounded-md bg-sky-500/10 text-sky-600 dark:text-sky-400 hover:bg-sky-500/20 cursor-pointer"
                          >
                            <AtSign className="w-2.5 h-2.5" />{m.name.split(" ")[0]}
                          </button>
                        ))}
                      </div>
                    )}
                    <div className="flex gap-1.5">
                      <input value={commentInput} onChange={(e) => setCommentInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addComment(); } }} placeholder="Escreva um comentário..." className="flex-1 px-3 py-1.5 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg text-gray-900 dark:text-white focus:outline-none text-[11px]" />
                      <button type="button" onClick={addComment} disabled={!commentInput.trim()} className="px-2.5 bg-sky-600 hover:bg-sky-500 disabled:opacity-40 text-white rounded-lg cursor-pointer"><Send className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                ) : (
                  <p className="text-[10px] text-gray-400 italic px-1">Salve a tarefa para adicionar comentários.</p>
                )}
                <div className="flex gap-2 justify-end pt-1">
                  <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-gray-500 rounded-lg font-semibold cursor-pointer">Cancelar</button>
                  <button type="submit" className="px-5 py-2.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl shadow-xs font-semibold cursor-pointer">{editing ? "Salvar" : "Criar Tarefa"}</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ── Stat card ───────────────────────────────────────────────────────────────
const StatCard: React.FC<{ label: string; value: number; color: string; alert?: boolean }> = ({ label, value, color, alert }) => (
  <div className={`rounded-xl border p-2.5 bg-white dark:bg-zinc-900 ${alert ? "border-rose-500/40" : "border-gray-200 dark:border-zinc-800"}`}>
    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider truncate">{label}</div>
    <div className="text-xl font-extrabold mt-0.5" style={{ color }}>{value}</div>
  </div>
);

const EmptyState: React.FC = () => (
  <div className="text-center p-12 bg-white dark:bg-zinc-900 rounded-3xl border border-gray-150 dark:border-zinc-850 py-16">
    <CheckCircle className="w-12 h-12 text-gray-300 dark:text-zinc-750 mx-auto mb-3" />
    <p className="text-sm font-semibold text-gray-800 dark:text-zinc-100">Nenhuma tarefa encontrada</p>
    <p className="text-xs text-gray-500 dark:text-zinc-400 mt-1">Ajuste os filtros ou crie uma nova tarefa.</p>
  </div>
);

// ── Task card ─────────────────────────────────────────────────────────────
interface CardProps {
  task: Task;
  compact?: boolean;
  canEdit: boolean;
  isPersonal: boolean;
  isGroupLeader: boolean;
  currentUser: any;
  toggleTaskStatus: (id: string) => Promise<void>;
  updateTaskFields: (id: string, f: Partial<Task>) => Promise<void>;
  openEdit: (t: Task) => void;
  handleDelete: (t: Task) => void;
  setDragId: (id: string | null) => void;
  dragId: string | null;
}

const TaskCard: React.FC<CardProps> = ({ task, compact, canEdit, isPersonal, isGroupLeader, currentUser, toggleTaskStatus, updateTaskFields, openEdit, handleDelete, setDragId, dragId }) => {
  const isDone = task.status === "completed";
  const total = task.checklist.length;
  const done = task.checklist.filter((c) => c.done).length;
  const pct = total ? Math.round((done / total) * 100) : 0;
  const overdue = isOverdue(task);
  const priorityColor = task.priority === "high" ? "#f43f5e" : task.priority === "medium" ? "#f59e0b" : "#10b981";
  const pendingDeletion = task.deletionRequest && task.deletionRequest.status === "pending";

  return (
    <div
      id={`task-card-${task.id}`}
      draggable={canEdit}
      onDragStart={(e) => { if (!canEdit) return; setDragId(task.id); e.dataTransfer.effectAllowed = "move"; }}
      onDragEnd={() => setDragId(null)}
      onClick={() => canEdit && openEdit(task)}
      className={`group relative rounded-xl border bg-white dark:bg-zinc-900 p-3 transition-all cursor-pointer overflow-hidden ${
        dragId === task.id ? "opacity-40" : ""
      } ${isDone ? "border-emerald-500/30" : overdue ? "border-rose-400/50" : "border-gray-200 dark:border-zinc-800 hover:border-sky-400/50 hover:shadow-sm"}`}
    >
      <div className="absolute top-0 left-0 bottom-0 w-1" style={{ backgroundColor: priorityColor }} />

      <div className="flex items-start gap-2 pl-1.5">
        <button
          onClick={(e) => { e.stopPropagation(); if (canEdit) toggleTaskStatus(task.id); }}
          className="shrink-0 mt-0.5"
          title={isDone ? "Reabrir" : "Concluir"}
        >
          {isDone ? <CheckCircle className="w-4.5 h-4.5 text-emerald-500" /> : <div className="w-4.5 h-4.5 rounded-full border-2 border-gray-300 dark:border-zinc-700 hover:border-sky-500" />}
        </button>
        <div className="flex-1 min-w-0">
          <h4 className={`text-xs font-bold leading-snug ${isDone ? "line-through text-gray-400" : "text-gray-900 dark:text-zinc-50"}`}>{task.title}</h4>
          {task.description && !compact && <p className="text-[11px] text-gray-500 dark:text-zinc-400 mt-0.5 line-clamp-2">{task.description}</p>}
        </div>
        {canEdit && (
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => openEdit(task)} className="p-1 rounded hover:bg-sky-500/10 text-gray-400 hover:text-sky-500" title="Editar"><Pencil className="w-3.5 h-3.5" /></button>
            {!pendingDeletion && (
              <button onClick={() => handleDelete(task)} className="p-1 rounded hover:bg-red-500/10 text-gray-400 hover:text-red-500" title={isPersonal || isGroupLeader ? "Excluir" : "Solicitar exclusão"}>
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Deletion request (leader view) */}
      {pendingDeletion && (
        <div className="mt-2 ml-1.5 p-2 rounded-lg bg-rose-50/60 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/50 text-[10px]" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center gap-1 text-rose-700 dark:text-rose-300 font-semibold mb-1">
            <AlertTriangle className="w-3 h-3" /> Exclusão pedida por {task.deletionRequest!.requestedByName}
          </div>
          {isGroupLeader ? (
            <div className="flex gap-1.5">
              <button onClick={() => handleDelete(task)} className="px-2 py-0.5 bg-rose-600 text-white rounded font-bold">Aprovar</button>
              <button onClick={() => updateTaskFields(task.id, { deletionRequest: null as any })} className="px-2 py-0.5 bg-gray-200 dark:bg-zinc-800 text-gray-600 dark:text-zinc-300 rounded font-bold">Rejeitar</button>
            </div>
          ) : task.deletionRequest!.requestedBy === currentUser?.id ? (
            <button onClick={() => updateTaskFields(task.id, { deletionRequest: null as any })} className="text-red-500 hover:underline font-semibold">Cancelar solicitação</button>
          ) : <span className="text-gray-400">Aguardando o líder...</span>}
        </div>
      )}

      {/* Meta row */}
      <div className="flex flex-wrap items-center gap-1.5 mt-2 pl-1.5">
        {(task.tags || []).map((tag) => (
          <span key={tag} className="text-[9px] font-semibold px-1.5 py-0.5 rounded-md bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center gap-0.5"><Tag className="w-2 h-2" />{tag}</span>
        ))}
        {task.dueDate && (
          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md flex items-center gap-1 ${overdue ? "bg-rose-500/15 text-rose-600 dark:text-rose-400" : "bg-gray-100 dark:bg-zinc-800 text-gray-500 dark:text-zinc-400"}`}>
            {overdue ? <Clock className="w-2.5 h-2.5" /> : <Calendar className="w-2.5 h-2.5" />}{fmtDate(task.dueDate)}
          </span>
        )}
        {task.recurrence && task.recurrence !== "none" && (
          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md flex items-center gap-1 bg-violet-500/10 text-violet-600 dark:text-violet-400" title={`Repete: ${RECURRENCE_LABEL[task.recurrence]}`}>
            <Repeat className="w-2.5 h-2.5" />{RECURRENCE_LABEL[task.recurrence]}
          </span>
        )}
        {(task.comments?.length ?? 0) > 0 && (
          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md flex items-center gap-1 bg-gray-100 dark:bg-zinc-800 text-gray-500 dark:text-zinc-400" title={`${task.comments!.length} comentário(s)`}>
            <MessageSquare className="w-2.5 h-2.5" />{task.comments!.length}
          </span>
        )}
        {!isPersonal && task.assignedToName && (
          <span className="text-[9px] font-medium px-1.5 py-0.5 rounded-md bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center gap-1 max-w-[110px] truncate"><User className="w-2.5 h-2.5 shrink-0" /><span className="truncate">{task.assignedToName}</span></span>
        )}
      </div>

      {/* Checklist progress */}
      {total > 0 && (
        <div className="mt-2 pl-1.5">
          <div className="flex items-center justify-between text-[9px] text-gray-400 mb-0.5">
            <span className="flex items-center gap-1"><CheckSquare className="w-2.5 h-2.5" />{done}/{total}</span>
            <span>{pct}%</span>
          </div>
          <div className="h-1 rounded-full bg-gray-100 dark:bg-zinc-800 overflow-hidden">
            <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: pct === 100 ? "#10b981" : "#0ea5e9" }} />
          </div>
        </div>
      )}
    </div>
  );
};
