/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { X, LayoutTemplate, Check, Loader2, ArrowLeft, Rocket, UserPlus, PenLine, CalendarClock, Plane, ClipboardList } from "lucide-react";
import { useApp } from "../context/AppContext";
import { useToast } from "../context/ToastContext";

type Priority = "low" | "medium" | "high";

interface TemplateTask {
  title: string;
  priority: Priority;
  checklist?: string[];
}

interface BoardTemplate {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  accent: string;
  tasks: TemplateTask[];
}

const TEMPLATES: BoardTemplate[] = [
  {
    id: "sprint",
    name: "Sprint / Semana",
    description: "Organize a semana de trabalho com ritual ágil.",
    icon: <Rocket className="w-5 h-5" />,
    accent: "from-violet-500 to-sky-500",
    tasks: [
      { title: "Planejar a semana", priority: "high", checklist: ["Definir prioridades", "Estimar esforço"] },
      { title: "Reunião de alinhamento", priority: "medium" },
      { title: "Executar tarefas principais", priority: "high" },
      { title: "Revisar pendências", priority: "medium" },
      { title: "Retrospectiva da semana", priority: "low" },
    ],
  },
  {
    id: "onboarding",
    name: "Onboarding de Cliente",
    description: "Do contrato à primeira entrega, sem esquecer nada.",
    icon: <UserPlus className="w-5 h-5" />,
    accent: "from-emerald-500 to-teal-500",
    tasks: [
      { title: "Enviar e assinar contrato", priority: "high" },
      { title: "Reunião de kickoff", priority: "high", checklist: ["Apresentar equipe", "Alinhar expectativas"] },
      { title: "Coletar acessos e materiais", priority: "medium" },
      { title: "Configurar ambiente do cliente", priority: "medium" },
      { title: "Apresentar cronograma", priority: "medium" },
      { title: "Follow-up pós-entrega", priority: "low" },
    ],
  },
  {
    id: "content",
    name: "Planejamento de Conteúdo",
    description: "Da pauta à publicação e análise de métricas.",
    icon: <PenLine className="w-5 h-5" />,
    accent: "from-rose-500 to-pink-500",
    tasks: [
      { title: "Definir pautas", priority: "high" },
      { title: "Escrever roteiro / briefing", priority: "medium" },
      { title: "Produção (texto, vídeo, arte)", priority: "medium" },
      { title: "Revisão e aprovação", priority: "medium" },
      { title: "Publicar", priority: "medium" },
      { title: "Analisar métricas", priority: "low" },
    ],
  },
  {
    id: "meeting",
    name: "Reunião",
    description: "Prepare, conduza e faça o follow-up de uma reunião.",
    icon: <CalendarClock className="w-5 h-5" />,
    accent: "from-amber-500 to-orange-500",
    tasks: [
      { title: "Definir pauta", priority: "high" },
      { title: "Convidar participantes", priority: "medium" },
      { title: "Preparar materiais", priority: "medium" },
      { title: "Registrar ata", priority: "medium" },
      { title: "Enviar follow-up", priority: "low" },
    ],
  },
  {
    id: "trip",
    name: "Viagem / Evento",
    description: "Checklist completo para não esquecer nada.",
    icon: <Plane className="w-5 h-5" />,
    accent: "from-sky-500 to-cyan-500",
    tasks: [
      { title: "Reservar passagens", priority: "high" },
      { title: "Reservar hospedagem", priority: "high" },
      { title: "Montar roteiro", priority: "medium" },
      { title: "Confirmar reservas", priority: "medium" },
      { title: "Fazer as malas", priority: "low", checklist: ["Documentos", "Carregadores", "Roupas"] },
    ],
  },
];

const PRIORITY_LABEL: Record<Priority, string> = { high: "Alta", medium: "Média", low: "Baixa" };
const PRIORITY_DOT: Record<Priority, string> = { high: "bg-red-500", medium: "bg-amber-500", low: "bg-emerald-500" };

const BoardTemplatesModal: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const { activeTab, selectedGroup, selectedSubgroup, createTask } = useApp();
  const notify = useToast();
  const [selected, setSelected] = useState<BoardTemplate | null>(null);
  const [applying, setApplying] = useState(false);

  const canCreate = activeTab === "personal" || (!!selectedGroup && !!selectedSubgroup);
  const targetLabel = activeTab === "personal"
    ? selectedSubgroup ? `Pessoal · ${selectedSubgroup.name}` : "Área Pessoal"
    : `${selectedGroup?.name ?? "Grupo"} · ${selectedSubgroup?.name ?? ""}`;

  const close = () => {
    setSelected(null);
    setApplying(false);
    onClose();
  };

  const applyTemplate = async () => {
    if (!selected) return;
    setApplying(true);
    try {
      for (const t of selected.tasks) {
        await createTask(t.title, "", t.priority, "", activeTab === "groups" ? "" : undefined, t.checklist || [], [selected.name], "pending");
      }
      notify(`Template "${selected.name}" aplicado: ${selected.tasks.length} tarefas criadas.`, "success");
      close();
    } catch (e) {
      console.error("[Templates] erro ao aplicar", e);
      notify("Não foi possível aplicar o template.", "error");
      setApplying(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4"
          onClick={close}
        >
          <motion.div
            initial={{ y: 30, scale: 0.98, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            exit={{ y: 30, scale: 0.98, opacity: 0 }}
            transition={{ type: "spring", damping: 26, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full sm:max-w-lg bg-white dark:bg-zinc-900 rounded-t-3xl sm:rounded-3xl border border-gray-200 dark:border-zinc-800 shadow-2xl max-h-[92dvh] flex flex-col overflow-hidden"
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-zinc-800 shrink-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-sky-500 flex items-center justify-center shrink-0">
                  <LayoutTemplate className="w-5 h-5 text-white" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-base font-bold text-gray-900 dark:text-zinc-50 leading-tight">Templates de quadro</h2>
                  <p className="text-[11px] text-gray-400 dark:text-zinc-500 truncate">Criar em: {targetLabel}</p>
                </div>
              </div>
              <button onClick={close} className="p-1.5 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer shrink-0">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto scrollbar-thin px-5 py-4">
              {!canCreate ? (
                <div className="h-48 flex flex-col items-center justify-center text-center gap-2">
                  <ClipboardList className="w-8 h-8 text-amber-500" />
                  <p className="text-sm font-semibold text-gray-700 dark:text-zinc-200">Escolha onde aplicar</p>
                  <p className="text-xs text-gray-400 dark:text-zinc-500 max-w-xs">
                    Entre na sua Área Pessoal ou em um subgrupo para aplicar um template de tarefas.
                  </p>
                </div>
              ) : !selected ? (
                <div className="space-y-2">
                  {TEMPLATES.map((tpl) => (
                    <button
                      key={tpl.id}
                      onClick={() => setSelected(tpl)}
                      className="w-full flex items-center gap-3 p-3 rounded-2xl border border-gray-200 dark:border-zinc-800 hover:border-sky-500/40 hover:bg-sky-500/[0.03] transition-colors text-left cursor-pointer"
                    >
                      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${tpl.accent} flex items-center justify-center text-white shrink-0`}>
                        {tpl.icon}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-gray-800 dark:text-zinc-100">{tpl.name}</p>
                        <p className="text-[11px] text-gray-400 dark:text-zinc-500 truncate">{tpl.description}</p>
                      </div>
                      <span className="text-[10px] text-gray-400 dark:text-zinc-500 shrink-0">{tpl.tasks.length} tarefas</span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs text-gray-500 dark:text-zinc-400 mb-2">{selected.description}</p>
                  {selected.tasks.map((t, i) => (
                    <div key={i} className="flex items-center gap-2.5 p-2.5 rounded-xl bg-gray-50 dark:bg-zinc-950/40 border border-gray-100 dark:border-zinc-800">
                      <span className={`w-2 h-2 rounded-full ${PRIORITY_DOT[t.priority]} shrink-0`} />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-gray-800 dark:text-zinc-100 truncate">{t.title}</p>
                        {t.checklist && t.checklist.length > 0 && (
                          <p className="text-[10px] text-gray-400 dark:text-zinc-500">{t.checklist.length} sub-itens</p>
                        )}
                      </div>
                      <span className="text-[10px] text-gray-400 dark:text-zinc-500 shrink-0">{PRIORITY_LABEL[t.priority]}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {canCreate && selected && (
              <div className="px-5 py-3.5 border-t border-gray-100 dark:border-zinc-800 shrink-0 flex items-center gap-2.5">
                <button
                  onClick={() => setSelected(null)}
                  className="px-3 py-2.5 rounded-xl text-sm font-medium text-gray-500 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <ArrowLeft className="w-4 h-4" /> Voltar
                </button>
                <button
                  onClick={applyTemplate}
                  disabled={applying}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-gradient-to-r from-violet-500 to-sky-500 text-white text-sm font-semibold shadow-sm hover:opacity-95 transition-opacity cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {applying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  {applying ? "Aplicando…" : `Criar ${selected.tasks.length} tarefas`}
                </button>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default BoardTemplatesModal;
