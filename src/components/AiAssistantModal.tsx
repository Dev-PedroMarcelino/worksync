/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  Sparkles,
  Mic,
  Square,
  Loader2,
  X,
  Check,
  Calendar as CalendarIcon,
  CheckSquare,
  Flag,
  Crown,
  Wand2,
  Trash2,
  ArrowLeft,
  Clock,
} from "lucide-react";
import { useApp } from "@/src/context/AppContext";
import { useSpeechRecognition } from "@/src/hooks/useSpeechRecognition";
import {
  generatePlanFromText,
  isAiConfigured,
  type AiExtractedTask,
  type AiExtractedEvent,
  type AiPriority,
} from "@/src/services/aiAssistant";

/** Tarefas de IA gratuitas por mês no plano Free. */
const FREE_MONTHLY_LIMIT = 10;

const usageKey = (userId: string) => {
  const now = new Date();
  return `worksync_ai_usage_${userId}_${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
};

const getUsage = (userId: string): number => {
  try {
    return parseInt(localStorage.getItem(usageKey(userId)) || "0", 10) || 0;
  } catch {
    return 0;
  }
};

const bumpUsage = (userId: string): number => {
  const next = getUsage(userId) + 1;
  try {
    localStorage.setItem(usageKey(userId), String(next));
  } catch {
    /* noop */
  }
  return next;
};

const PRIORITY_META: Record<AiPriority, { label: string; chip: string }> = {
  high: { label: "Alta", chip: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30" },
  medium: { label: "Média", chip: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30" },
  low: { label: "Baixa", chip: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30" },
};

const EXAMPLES = [
  "Preciso terminar o relatório até sexta, é urgente...",
  "Marcar reunião com o cliente terça às 15h...",
  "Comprar material, ligar pro fornecedor e revisar o orçamento...",
];

type Step = "input" | "review" | "upgrade";

interface ReviewTask extends AiExtractedTask {
  _id: string;
  _include: boolean;
}
interface ReviewEvent extends AiExtractedEvent {
  _id: string;
  _include: boolean;
}

const rid = () => Math.random().toString(36).slice(2, 9);

const AiAssistantModal: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const {
    currentUser,
    activeTab,
    selectedGroup,
    selectedSubgroup,
    createTask,
    createCalendarEvent,
  } = useApp();

  const { supported, listening, transcript, interim, error, start, stop, reset } = useSpeechRecognition("pt-BR");

  const [step, setStep] = useState<Step>("input");
  const [text, setText] = useState("");
  const [generating, setGenerating] = useState(false);
  const [creating, setCreating] = useState(false);
  const [source, setSource] = useState<"ai" | "local">("local");
  const [summary, setSummary] = useState("");
  const [reviewTasks, setReviewTasks] = useState<ReviewTask[]>([]);
  const [reviewEvents, setReviewEvents] = useState<ReviewEvent[]>([]);

  const isPro = !!currentUser?.plan && currentUser.plan !== "free";
  const usage = currentUser ? getUsage(currentUser.id) : 0;
  const remaining = Math.max(0, FREE_MONTHLY_LIMIT - usage);

  // Onde as tarefas/eventos serão criados (mesma regra do contexto).
  const canCreate = activeTab === "personal" || (!!selectedGroup && !!selectedSubgroup);
  const targetLabel = activeTab === "personal"
    ? selectedSubgroup ? `Pessoal · ${selectedSubgroup.name}` : "Área Pessoal"
    : `${selectedGroup?.name ?? "Grupo"} · ${selectedSubgroup?.name ?? ""}`;

  // Texto efetivo = digitado + transcrição de voz + parcial ao vivo.
  const liveText = useMemo(() => {
    const parts = [text.trim(), transcript.trim()].filter(Boolean);
    let combined = parts.join(text.trim() && transcript.trim() ? " " : "");
    if (listening && interim) combined = (combined ? combined + " " : "") + interim;
    return combined;
  }, [text, transcript, interim, listening]);

  const resetAll = () => {
    setStep("input");
    setText("");
    setGenerating(false);
    setCreating(false);
    setReviewTasks([]);
    setReviewEvents([]);
    setSummary("");
    if (listening) stop();
    reset();
  };

  const handleClose = () => {
    resetAll();
    onClose();
  };

  const handleMic = () => {
    if (listening) {
      stop();
    } else {
      // move a transcrição atual para o texto editável antes de reiniciar
      start();
    }
  };

  const handleGenerate = async () => {
    if (listening) stop();
    const input = liveText.trim();
    if (!input) return;

    if (!isPro && currentUser && remaining <= 0) {
      setStep("upgrade");
      return;
    }

    setGenerating(true);
    try {
      const plan = await generatePlanFromText(input);
      setSource(plan.source);
      setSummary(plan.summary);
      setReviewTasks(plan.tasks.map((t) => ({ ...t, _id: rid(), _include: true })));
      setReviewEvents(plan.events.map((e) => ({ ...e, _id: rid(), _include: true })));
      if (!isPro && currentUser) bumpUsage(currentUser.id);
      setStep("review");
    } catch (e) {
      console.error("[AiAssistant] erro ao gerar plano", e);
      setSummary("Não foi possível organizar agora. Tente novamente.");
    } finally {
      setGenerating(false);
    }
  };

  const handleCreateAll = async () => {
    const tasks = reviewTasks.filter((t) => t._include);
    const events = reviewEvents.filter((e) => e._include);
    if (!tasks.length && !events.length) {
      handleClose();
      return;
    }
    setCreating(true);
    try {
      for (const t of tasks) {
        await createTask(
          t.title,
          t.description || "",
          t.priority,
          t.dueDate || "",
          activeTab === "groups" ? "" : undefined,
          t.checklist || [],
          t.tags || [],
          "pending"
        );
      }
      for (const e of events) {
        await createCalendarEvent({
          title: e.title,
          description: e.description || "",
          date: e.date,
          endDate: e.date,
          startTime: e.startTime || "",
          endTime: e.endTime || "",
          allDay: !e.startTime,
          location: e.location || "",
          color: "#0ea5e9",
        });
      }
      handleClose();
    } catch (e) {
      console.error("[AiAssistant] erro ao criar itens", e);
      setCreating(false);
    }
  };

  const includedCount = reviewTasks.filter((t) => t._include).length + reviewEvents.filter((e) => e._include).length;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4"
          onClick={handleClose}
        >
          <motion.div
            initial={{ y: 40, scale: 0.98, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            exit={{ y: 40, scale: 0.98, opacity: 0 }}
            transition={{ type: "spring", damping: 26, stiffness: 300 }}
            onClick={(ev) => ev.stopPropagation()}
            className="w-full sm:max-w-lg bg-white dark:bg-zinc-900 rounded-t-3xl sm:rounded-3xl border border-gray-200 dark:border-zinc-800 shadow-2xl max-h-[92dvh] flex flex-col overflow-hidden"
          >
            {/* HEADER */}
            <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-gray-100 dark:border-zinc-800 shrink-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-sky-500 flex items-center justify-center shadow-sm shrink-0">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-base font-bold text-gray-900 dark:text-zinc-50 tracking-tight leading-tight">
                    Assistente IA
                  </h2>
                  <p className="text-[11px] text-gray-400 dark:text-zinc-500 truncate">
                    {step === "review" ? "Revise antes de criar" : `Criar em: ${targetLabel}`}
                  </p>
                </div>
              </div>
              <button
                onClick={handleClose}
                className="p-1.5 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer shrink-0"
                title="Fechar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* BODY */}
            <div className="flex-1 overflow-y-auto scrollbar-thin px-5 py-4">
              {!canCreate ? (
                <div className="h-56 flex flex-col items-center justify-center text-center gap-2 px-4">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center">
                    <CheckSquare className="w-6 h-6 text-amber-500" />
                  </div>
                  <p className="text-sm font-semibold text-gray-700 dark:text-zinc-200">
                    Escolha onde criar
                  </p>
                  <p className="text-xs text-gray-400 dark:text-zinc-500 max-w-xs">
                    Entre na sua Área Pessoal ou selecione um subgrupo dentro de um grupo para o assistente criar tarefas e compromissos ali.
                  </p>
                </div>
              ) : step === "upgrade" ? (
                <UpgradePanel used={usage} limit={FREE_MONTHLY_LIMIT} />
              ) : step === "input" ? (
                <div className="space-y-4">
                  {/* Mic + estado */}
                  <div className="flex flex-col items-center gap-3 pt-2">
                    <button
                      onClick={handleMic}
                      disabled={!supported}
                      className={`relative w-20 h-20 rounded-full flex items-center justify-center transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                        listening
                          ? "bg-red-500 text-white shadow-lg shadow-red-500/30"
                          : "bg-gradient-to-br from-violet-500 to-sky-500 text-white shadow-lg shadow-sky-500/20 hover:scale-105"
                      }`}
                      title={supported ? (listening ? "Parar" : "Falar") : "Navegador sem suporte a voz"}
                    >
                      {listening && (
                        <motion.span
                          className="absolute inset-0 rounded-full bg-red-500/40"
                          animate={{ scale: [1, 1.35, 1], opacity: [0.6, 0, 0.6] }}
                          transition={{ duration: 1.6, repeat: Infinity }}
                        />
                      )}
                      {listening ? <Square className="w-7 h-7 relative z-10" /> : <Mic className="w-8 h-8 relative z-10" />}
                    </button>
                    <p className="text-xs font-medium text-gray-500 dark:text-zinc-400 h-4">
                      {!supported
                        ? "Digite abaixo (voz indisponível neste navegador)"
                        : listening
                          ? "Ouvindo… fale naturalmente"
                          : "Toque para falar ou digite abaixo"}
                    </p>
                  </div>

                  {/* Área de texto (digitado + transcrito) */}
                  <textarea
                    value={listening ? liveText : text || transcript}
                    onChange={(e) => {
                      setText(e.target.value);
                      if (transcript) reset();
                    }}
                    readOnly={listening}
                    placeholder={EXAMPLES[0]}
                    rows={5}
                    className="w-full resize-none rounded-2xl border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-950/50 px-4 py-3 text-sm text-gray-800 dark:text-zinc-100 placeholder-gray-400 dark:placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                  />

                  {error && <p className="text-xs text-red-500 text-center">{error}</p>}

                  <div className="flex flex-wrap gap-1.5">
                    {EXAMPLES.map((ex) => (
                      <button
                        key={ex}
                        onClick={() => {
                          if (listening) stop();
                          reset();
                          setText(ex);
                        }}
                        className="text-[11px] px-2.5 py-1 rounded-full bg-gray-100 dark:bg-zinc-800 text-gray-500 dark:text-zinc-400 hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
                      >
                        {ex.length > 34 ? ex.slice(0, 34) + "…" : ex}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                /* STEP REVIEW */
                <div className="space-y-4">
                  <div className="flex items-start gap-2 p-3 rounded-2xl bg-sky-500/5 border border-sky-500/20">
                    <Wand2 className="w-4 h-4 text-sky-500 mt-0.5 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs text-gray-600 dark:text-zinc-300">{summary}</p>
                      <p className="text-[10px] text-gray-400 dark:text-zinc-500 mt-0.5">
                        {source === "ai" ? "Organizado por IA" : "Organizado no dispositivo"} · desmarque o que não quiser
                      </p>
                    </div>
                  </div>

                  {reviewTasks.length > 0 && (
                    <div className="space-y-2">
                      <h3 className="text-[11px] font-bold uppercase tracking-wide text-gray-400 dark:text-zinc-500 flex items-center gap-1.5">
                        <CheckSquare className="w-3.5 h-3.5" /> Tarefas ({reviewTasks.length})
                      </h3>
                      {reviewTasks.map((t) => (
                        <ReviewTaskRow
                          key={t._id}
                          task={t}
                          onToggle={() => setReviewTasks((p) => p.map((x) => (x._id === t._id ? { ...x, _include: !x._include } : x)))}
                          onTitle={(v) => setReviewTasks((p) => p.map((x) => (x._id === t._id ? { ...x, title: v } : x)))}
                          onPriority={(v) => setReviewTasks((p) => p.map((x) => (x._id === t._id ? { ...x, priority: v } : x)))}
                          onRemove={() => setReviewTasks((p) => p.filter((x) => x._id !== t._id))}
                        />
                      ))}
                    </div>
                  )}

                  {reviewEvents.length > 0 && (
                    <div className="space-y-2">
                      <h3 className="text-[11px] font-bold uppercase tracking-wide text-gray-400 dark:text-zinc-500 flex items-center gap-1.5">
                        <CalendarIcon className="w-3.5 h-3.5" /> Compromissos ({reviewEvents.length})
                      </h3>
                      {reviewEvents.map((e) => (
                        <ReviewEventRow
                          key={e._id}
                          event={e}
                          onToggle={() => setReviewEvents((p) => p.map((x) => (x._id === e._id ? { ...x, _include: !x._include } : x)))}
                          onTitle={(v) => setReviewEvents((p) => p.map((x) => (x._id === e._id ? { ...x, title: v } : x)))}
                          onRemove={() => setReviewEvents((p) => p.filter((x) => x._id !== e._id))}
                        />
                      ))}
                    </div>
                  )}

                  {reviewTasks.length === 0 && reviewEvents.length === 0 && (
                    <p className="text-center text-sm text-gray-400 dark:text-zinc-500 py-8">
                      Nada identificado. Volte e descreva com mais detalhes.
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* FOOTER */}
            {canCreate && step !== "upgrade" && (
              <div className="px-5 py-3.5 border-t border-gray-100 dark:border-zinc-800 shrink-0 flex items-center gap-2.5">
                {step === "review" ? (
                  <>
                    <button
                      onClick={() => setStep("input")}
                      className="px-3 py-2.5 rounded-xl text-sm font-medium text-gray-500 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer flex items-center gap-1.5"
                    >
                      <ArrowLeft className="w-4 h-4" /> Voltar
                    </button>
                    <button
                      onClick={handleCreateAll}
                      disabled={creating || includedCount === 0}
                      className="flex-1 px-4 py-2.5 rounded-xl bg-gradient-to-r from-violet-500 to-sky-500 text-white text-sm font-semibold shadow-sm hover:opacity-95 transition-opacity cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                      {creating ? "Criando…" : `Criar tudo (${includedCount})`}
                    </button>
                  </>
                ) : (
                  <>
                    {!isPro && (
                      <span className="text-[11px] text-gray-400 dark:text-zinc-500 whitespace-nowrap">
                        {remaining}/{FREE_MONTHLY_LIMIT} grátis
                      </span>
                    )}
                    <button
                      onClick={handleGenerate}
                      disabled={generating || !liveText.trim()}
                      className="flex-1 px-4 py-2.5 rounded-xl bg-gradient-to-r from-violet-500 to-sky-500 text-white text-sm font-semibold shadow-sm hover:opacity-95 transition-opacity cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                      {generating ? "Organizando…" : "Gerar tarefas e compromissos"}
                    </button>
                  </>
                )}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

/* ------------------------------------------------------------------ */
/*  Linhas de revisão                                                  */
/* ------------------------------------------------------------------ */

const ReviewTaskRow: React.FC<{
  task: ReviewTask;
  onToggle: () => void;
  onTitle: (v: string) => void;
  onPriority: (v: AiPriority) => void;
  onRemove: () => void;
}> = ({ task, onToggle, onTitle, onPriority, onRemove }) => {
  const priorities: AiPriority[] = ["low", "medium", "high"];
  return (
    <div className={`group flex items-start gap-2.5 p-3 rounded-2xl border transition-colors ${task._include ? "border-gray-200 dark:border-zinc-800 bg-gray-50/60 dark:bg-zinc-950/40" : "border-dashed border-gray-200 dark:border-zinc-800 opacity-50"}`}>
      <button
        onClick={onToggle}
        className={`mt-0.5 w-5 h-5 rounded-md border flex items-center justify-center shrink-0 cursor-pointer transition-colors ${task._include ? "bg-sky-500 border-sky-500 text-white" : "border-gray-300 dark:border-zinc-600"}`}
      >
        {task._include && <Check className="w-3.5 h-3.5" />}
      </button>
      <div className="flex-1 min-w-0 space-y-1.5">
        <input
          value={task.title}
          onChange={(e) => onTitle(e.target.value)}
          className="w-full bg-transparent text-sm font-medium text-gray-800 dark:text-zinc-100 focus:outline-none"
        />
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="inline-flex items-center gap-1 text-[10px] text-gray-400 dark:text-zinc-500">
            <Flag className="w-3 h-3" />
          </span>
          {priorities.map((p) => (
            <button
              key={p}
              onClick={() => onPriority(p)}
              className={`text-[10px] px-2 py-0.5 rounded-full border font-medium cursor-pointer transition-all ${
                task.priority === p ? PRIORITY_META[p].chip : "border-transparent text-gray-400 dark:text-zinc-600 hover:text-gray-600"
              }`}
            >
              {PRIORITY_META[p].label}
            </button>
          ))}
          {task.dueDate && (
            <span className="inline-flex items-center gap-1 text-[10px] text-gray-500 dark:text-zinc-400 ml-1">
              <CalendarIcon className="w-3 h-3" /> {formatBR(task.dueDate)}
            </span>
          )}
          {(task.checklist?.length ?? 0) > 0 && (
            <span className="text-[10px] text-gray-400 dark:text-zinc-500">· {task.checklist!.length} passos</span>
          )}
        </div>
      </div>
      <button onClick={onRemove} className="opacity-0 group-hover:opacity-100 p-1 text-gray-300 hover:text-red-500 transition-all cursor-pointer shrink-0">
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
};

const ReviewEventRow: React.FC<{
  event: ReviewEvent;
  onToggle: () => void;
  onTitle: (v: string) => void;
  onRemove: () => void;
}> = ({ event, onToggle, onTitle, onRemove }) => {
  return (
    <div className={`group flex items-start gap-2.5 p-3 rounded-2xl border transition-colors ${event._include ? "border-gray-200 dark:border-zinc-800 bg-gray-50/60 dark:bg-zinc-950/40" : "border-dashed border-gray-200 dark:border-zinc-800 opacity-50"}`}>
      <button
        onClick={onToggle}
        className={`mt-0.5 w-5 h-5 rounded-md border flex items-center justify-center shrink-0 cursor-pointer transition-colors ${event._include ? "bg-sky-500 border-sky-500 text-white" : "border-gray-300 dark:border-zinc-600"}`}
      >
        {event._include && <Check className="w-3.5 h-3.5" />}
      </button>
      <div className="flex-1 min-w-0 space-y-1.5">
        <input
          value={event.title}
          onChange={(e) => onTitle(e.target.value)}
          className="w-full bg-transparent text-sm font-medium text-gray-800 dark:text-zinc-100 focus:outline-none"
        />
        <div className="flex flex-wrap items-center gap-2 text-[10px] text-gray-500 dark:text-zinc-400">
          <span className="inline-flex items-center gap-1">
            <CalendarIcon className="w-3 h-3" /> {formatBR(event.date)}
          </span>
          {event.startTime && (
            <span className="inline-flex items-center gap-1">
              <Clock className="w-3 h-3" /> {event.startTime}
              {event.endTime ? `–${event.endTime}` : ""}
            </span>
          )}
          {event.location && <span className="truncate">📍 {event.location}</span>}
        </div>
      </div>
      <button onClick={onRemove} className="opacity-0 group-hover:opacity-100 p-1 text-gray-300 hover:text-red-500 transition-all cursor-pointer shrink-0">
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  Painel de upgrade (gancho de monetização)                          */
/* ------------------------------------------------------------------ */

const UpgradePanel: React.FC<{ used: number; limit: number }> = ({ used, limit }) => (
  <div className="py-4 text-center space-y-4">
    <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-orange-500/20">
      <Crown className="w-7 h-7 text-white" />
    </div>
    <div>
      <h3 className="text-lg font-bold text-gray-900 dark:text-zinc-50">Você usou suas {limit} organizações grátis do mês</h3>
      <p className="text-xs text-gray-400 dark:text-zinc-500 mt-1">
        No <strong className="text-gray-600 dark:text-zinc-300">Pro</strong> o Assistente IA é ilimitado — organize por voz quantas vezes quiser.
      </p>
    </div>
    <ul className="text-left text-sm text-gray-600 dark:text-zinc-300 space-y-2 max-w-xs mx-auto">
      {["Assistente IA por voz ilimitado", "Grupos e membros ilimitados", "Histórico e auditoria completos", "Suporte prioritário"].map((f) => (
        <li key={f} className="flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-500 shrink-0" /> {f}
        </li>
      ))}
    </ul>
    <button
      onClick={() => window.dispatchEvent(new Event("open-plans"))}
      className="w-full max-w-xs mx-auto px-4 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-bold shadow-sm hover:opacity-95 transition-opacity cursor-pointer flex items-center justify-center gap-2"
    >
      <Crown className="w-4 h-4" /> Ver planos
    </button>
    <p className="text-[10px] text-gray-400 dark:text-zinc-600">Seu limite gratuito renova no próximo mês ({used}/{limit} usados).</p>
  </div>
);

const formatBR = (iso: string): string => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y.slice(2)}`;
};

export default AiAssistantModal;
