/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { useApp } from "../context/AppContext";
import {
  Plus,
  Trash2,
  Calendar,
  AlertTriangle,
  CheckCircle,
  Clock,
  User,
  CheckSquare,
  Square,
  Search,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Info,
  X,
  Pencil
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Task, ChecklistItem } from "../types";

interface TaskBoardProps {
  canEdit: boolean;
}

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
  } = useApp();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "completed">("all");
  const [priorityFilter, setPriorityFilter] = useState<"all" | "low" | "medium" | "high">("all");

  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newPriority, setNewPriority] = useState<"low" | "medium" | "high">("medium");
  const [newDueDate, setNewDueDate] = useState("");
  const [newAssignedTo, setNewAssignedTo] = useState("");

  const [checklistInput, setChecklistInput] = useState("");
  const [newChecklistTextList, setNewChecklistTextList] = useState<string[]>([]);

  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
  const [newSubTaskTextMap, setNewSubTaskTextMap] = useState<{ [taskId: string]: string }>({});

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmRequestDeleteId, setConfirmRequestDeleteId] = useState<string | null>(null);
  const [confirmApproveDeleteId, setConfirmApproveDeleteId] = useState<string | null>(null);

  // Task Editing state
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editPriority, setEditPriority] = useState<"low" | "medium" | "high">("medium");
  const [editDueDate, setEditDueDate] = useState("");
  const [editAssignedTo, setEditAssignedTo] = useState("");

  // Subtask Editing state
  const [editingSubTaskId, setEditingSubTaskId] = useState<string | null>(null);
  const [editingSubTaskText, setEditingSubTaskText] = useState("");

  const handleOpenEditModal = (task: Task) => {
    setEditingTask(task);
    setEditTitle(task.title);
    setEditDesc(task.description || "");
    setEditPriority(task.priority);
    setEditDueDate(task.dueDate || "");
    setEditAssignedTo(task.assignedTo || "");
  };

  const handleEditTaskSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTask || !editTitle.trim()) return;

    let assignedToName = "";
    if (editAssignedTo === "all") {
      assignedToName = "Geral / Todos";
    } else if (editAssignedTo) {
      const mem = groupMembers.find((m) => m.userId === editAssignedTo);
      assignedToName = mem ? mem.name : "";
    }

    try {
      await updateTaskFields(editingTask.id, {
        title: editTitle.trim(),
        description: editDesc.trim(),
        priority: editPriority,
        dueDate: editDueDate,
        assignedTo: editAssignedTo,
        assignedToName: assignedToName,
      });
      setEditingTask(null);
    } catch (err) {
      alert("Erro ao salvar alterações da tarefa.");
    }
  };

  const handleSaveSubTaskText = async (task: Task, itemId: string) => {
    if (!editingSubTaskText.trim()) return;
    const nextChecklist = task.checklist.map((item) =>
      item.id === itemId ? { ...item, text: editingSubTaskText.trim() } : item
    );
    await updateTaskFields(task.id, { checklist: nextChecklist });
    setEditingSubTaskId(null);
  };

  const handleMoveSubTask = async (task: Task, index: number, direction: -1 | 1) => {
    if (!canEdit) return;
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= task.checklist.length) return;

    const nextChecklist = [...task.checklist];
    const temp = nextChecklist[index];
    nextChecklist[index] = nextChecklist[nextIndex];
    nextChecklist[nextIndex] = temp;

    await updateTaskFields(task.id, { checklist: nextChecklist });
  };

  const isPersonal = activeTab === "personal";
  const isGroupLeader = selectedGroup && currentUser && selectedGroup.creatorId === currentUser.id;

  const handleAddChecklistText = () => {
    if (!checklistInput.trim()) return;
    setNewChecklistTextList([...newChecklistTextList, checklistInput.trim()]);
    setChecklistInput("");
  };

  const handleRemoveChecklistText = (idx: number) => {
    setNewChecklistTextList(newChecklistTextList.filter((_, i) => i !== idx));
  };

  const handleCreateTaskSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    try {
      await createTask(
        newTitle.trim(),
        newDesc.trim(),
        newPriority,
        newDueDate,
        newAssignedTo === "" ? undefined : newAssignedTo,
        newChecklistTextList
      );

      // Clear Form state
      setNewTitle("");
      setNewDesc("");
      setNewPriority("medium");
      setNewDueDate("");
      setNewAssignedTo("");
      setNewChecklistTextList([]);
      setShowAddForm(false);
    } catch (e) {
      alert("Erro ao salvar tarefa.");
    }
  };

  // Toggle individual checklist item inside active tasks
  const handleToggleCheckItem = async (task: Task, itemToToggle: ChecklistItem) => {
    if (!canEdit) return;
    const nextChecklist = task.checklist.map((item) =>
      item.id === itemToToggle.id ? { ...item, done: !item.done } : item
    );
    await updateTaskFields(task.id, { checklist: nextChecklist });
  };

  // Add individual checklist item inside existing task
  const handleAddSubTask = async (task: Task) => {
    if (!canEdit) return;
    const cleanText = newSubTaskTextMap[task.id]?.trim();
    if (!cleanText) return;

    const newSubItem: ChecklistItem = {
      id: "chk_" + Math.random().toString(36).substring(2, 6),
      text: cleanText,
      done: false,
    };

    const nextChecklist = [...task.checklist, newSubItem];
    await updateTaskFields(task.id, { checklist: nextChecklist });
    setNewSubTaskTextMap({ ...newSubTaskTextMap, [task.id]: "" });
  };

  const handleDeleteSubTask = async (task: Task, itemToDelete: ChecklistItem) => {
    if (!canEdit) return;
    const nextChecklist = task.checklist.filter((item) => item.id !== itemToDelete.id);
    await updateTaskFields(task.id, { checklist: nextChecklist });
  };

  // Filters calculation
  const filteredTasks = tasks.filter((task) => {
    const matchSearch =
      task.title.toLowerCase().includes(search.toLowerCase()) ||
      task.description.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" ? true : task.status === statusFilter;
    const matchPriority = priorityFilter === "all" ? true : task.priority === priorityFilter;
    return matchSearch && matchStatus && matchPriority;
  });

  return (
    <div className="h-full flex flex-col min-h-0 font-sans" id="tasks-module-container">
      {/* FILTER SEARCH BAR & ADD ACTION */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4 select-none shrink-0" id="tasks-search-filter">
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
          {/* Searching */}
          <div className="relative flex-1 max-w-xs">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              id="search-tasks-input"
              type="text"
              placeholder="Buscar tarefas..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full text-xs pl-9 pr-4 py-2 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-sky-500 text-gray-900 dark:text-zinc-50"
            />
          </div>

          {/* Filtering options */}
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <select
              id="filter-tasks-status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-2.5 py-1.5 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-lg text-gray-700 dark:text-zinc-300 focus:outline-xs"
            >
              <option value="all">Todas</option>
              <option value="pending">Pendentes</option>
              <option value="completed">Concluídas</option>
            </select>

            <select
              id="filter-tasks-priority"
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value as any)}
              className="px-2.5 py-1.5 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-lg text-gray-700 dark:text-zinc-300 focus:outline-xs"
            >
              <option value="all">Filtro Prioridade</option>
              <option value="high">Alta</option>
              <option value="medium">Média</option>
              <option value="low">Baixa</option>
            </select>
          </div>
        </div>

        {canEdit && (
          <button
            id="action-add-task-btn"
            onClick={() => setShowAddForm(true)}
            className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Criar Tarefa</span>
          </button>
        )}
      </div>

      {/* RENDER TASKS GRID / LIST */}
      <div className="flex-1 overflow-y-auto min-h-0 select-none pb-8" id="tasks-list">
        {filteredTasks.length === 0 ? (
          <div className="text-center p-12 bg-white dark:bg-zinc-900 rounded-3xl border border-gray-150 dark:border-zinc-850 py-16">
            <CheckCircle className="w-12 h-12 text-gray-300 dark:text-zinc-750 mx-auto mb-3" />
            <p className="text-sm font-semibold text-gray-800 dark:text-zinc-100">Sem tarefas nesta lista</p>
            <p className="text-xs text-gray-500 dark:text-zinc-400 mt-1">
              Crie uma tarefa utilizando o botão "+" para estruturar suas listas.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" id="tasks-grid">
            {filteredTasks.map((task) => {
              const isDone = task.status === "completed";
              const totalItems = task.checklist.length;
              const completedItems = task.checklist.filter((i) => i.done).length;
              const hasChecklist = totalItems > 0;
              const isExpanded = expandedTaskId === task.id;

              const priorityMeta =
                task.priority === "high"
                  ? "bg-rose-500/10 text-rose-500 border-rose-500/30"
                  : task.priority === "medium"
                  ? "bg-amber-500/10 text-amber-500 border-amber-500/30"
                  : "bg-emerald-500/10 text-emerald-500 border-emerald-500/30";

              return (
                <div
                  id={`task-card-${task.id}`}
                  key={task.id}
                  className={`border rounded-2xl bg-white dark:bg-zinc-900 p-4 transition-all flex flex-col justify-between relative overflow-hidden ${
                    isDone
                      ? "border-emerald-500/30 bg-emerald-500/5 dark:bg-emerald-500/5 shadow-xs opacity-85"
                      : "border-gray-200 dark:border-zinc-800 hover:border-gray-300 dark:hover:border-zinc-750"
                  }`}
                >
                  {/* Card decoration priority border tap */}
                  <div
                    className={`absolute top-0 left-0 right-0 h-[3.5px] ${
                      task.priority === "high"
                        ? "bg-rose-500"
                        : task.priority === "medium"
                        ? "bg-amber-500"
                        : "bg-emerald-500"
                    }`}
                  />

                  {/* Top content header */}
                  <div className="space-y-2 mb-4">
                    <div className="flex items-start justify-between gap-2">
                      <button
                        id={`toggle-task-btn-${task.id}`}
                        onClick={() => canEdit && toggleTaskStatus(task.id)}
                        className={`text-gray-400 hover:text-sky-500 transition-all focus:outline-none shrink-0 ${
                          !canEdit ? "cursor-default" : ""
                        }`}
                      >
                        {isDone ? (
                          <CheckCircle className="w-5 h-5 text-emerald-500" />
                        ) : (
                          <div className="w-5 h-5 rounded-full border-2 border-gray-300 dark:border-zinc-700 hover:border-sky-500" />
                        )}
                      </button>

                      <div className="flex-1 overflow-hidden">
                        <h4
                          className={`text-sm font-semibold truncate ${
                            isDone ? "line-through text-gray-500 decoration-gray-400" : "text-gray-900 dark:text-zinc-50"
                          }`}
                        >
                          {task.title}
                        </h4>
                        {task.description && (
                          <p className="text-xs text-gray-500 dark:text-zinc-400 truncate mt-0.5" title={task.description}>
                            {task.description}
                          </p>
                        )}
                      </div>

                      {canEdit && (
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            id={`edit-task-btn-${task.id}`}
                            onClick={() => handleOpenEditModal(task)}
                            className="p-1.5 bg-sky-500/10 hover:bg-sky-500/25 text-sky-600 dark:text-sky-400 rounded-lg transition-all shrink-0 cursor-pointer"
                            title="Editar Tarefa"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          {isPersonal || isGroupLeader ? (
                            confirmDeleteId === task.id ? (
                              <div className="flex items-center gap-1 bg-red-500/10 dark:bg-red-950/20 p-1 rounded-lg border border-red-200 dark:border-red-900/40">
                                <button
                                  onClick={() => {
                                    deleteTask(task.id);
                                    setConfirmDeleteId(null);
                                  }}
                                  className="px-2 py-1 text-[10px] bg-red-600 hover:bg-red-500 text-white rounded font-bold cursor-pointer transition-all"
                                >
                                  Apagar
                                </button>
                                <button
                                  onClick={() => setConfirmDeleteId(null)}
                                  className="px-2 py-1 text-[10px] bg-gray-200 dark:bg-zinc-800 text-gray-700 dark:text-zinc-300 rounded cursor-pointer transition-all"
                                >
                                  Cancelar
                                </button>
                              </div>
                            ) : (
                              <button
                                id={`delete-task-btn-${task.id}`}
                                onClick={() => {
                                  setConfirmDeleteId(task.id);
                                }}
                                className="p-1.5 bg-red-500/10 hover:bg-red-500/25 text-red-600 dark:text-red-400 rounded-lg transition-all shrink-0 cursor-pointer"
                                title="Apagar Tarefa"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )
                          ) : (
                            (!task.deletionRequest || task.deletionRequest.status !== "pending") && (
                              confirmRequestDeleteId === task.id ? (
                                <div className="flex items-center gap-1 bg-orange-500/10 dark:bg-orange-950/20 p-1 rounded-lg border border-orange-200 dark:border-orange-900/40">
                                  <button
                                    onClick={() => {
                                      updateTaskFields(task.id, {
                                        deletionRequest: {
                                          requestedBy: currentUser?.id || "",
                                          requestedByName: currentUser?.name || "",
                                          requestedAt: new Date().toISOString(),
                                          status: "pending"
                                        }
                                      });
                                      setConfirmRequestDeleteId(null);
                                    }}
                                    className="px-2 py-1 text-[10px] bg-orange-600 hover:bg-orange-500 text-white rounded font-bold cursor-pointer transition-all"
                                  >
                                    Solicitar
                                  </button>
                                  <button
                                    onClick={() => setConfirmRequestDeleteId(null)}
                                    className="px-2 py-1 text-[10px] bg-gray-200 dark:bg-zinc-800 text-gray-700 dark:text-zinc-300 rounded cursor-pointer transition-all"
                                  >
                                    Voltar
                                  </button>
                                </div>
                              ) : (
                                <button
                                  id={`request-delete-task-btn-${task.id}`}
                                  onClick={() => {
                                    setConfirmRequestDeleteId(task.id);
                                  }}
                                  className="p-1.5 bg-orange-500/10 hover:bg-orange-500/25 text-orange-600 dark:text-orange-400 rounded-lg transition-all shrink-0 cursor-pointer"
                                  title="Solicitar Exclusão ao Líder"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )
                            )
                          )}
                        </div>
                      )}
                    </div>
 
                    {/* Deletion Request Status Block */}
                    {!isPersonal && task.deletionRequest && task.deletionRequest.status === "pending" && (
                      <div className="p-2.5 border rounded-xl space-y-1.5 transition-all text-xs bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/60 mt-1">
                        <div className="flex items-center gap-1.5 text-rose-800 dark:text-rose-250 font-semibold">
                          <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />
                          <span>Exclusão solicitada por {task.deletionRequest.requestedByName}</span>
                        </div>
                        {isGroupLeader ? (
                          <div className="flex items-center gap-1.5 pt-0.5">
                            {confirmApproveDeleteId === task.id ? (
                              <div className="flex items-center gap-1.5">
                                <button
                                  onClick={() => {
                                    deleteTask(task.id);
                                    setConfirmApproveDeleteId(null);
                                  }}
                                  className="px-2.5 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-[10px] font-bold cursor-pointer"
                                >
                                  Sim, Aprovar
                                </button>
                                <button
                                  onClick={() => setConfirmApproveDeleteId(null)}
                                  className="px-2.5 py-1 bg-gray-200 dark:bg-zinc-800 text-gray-700 dark:text-zinc-300 rounded-lg text-[10px] font-bold cursor-pointer"
                                >
                                  Voltar
                                </button>
                              </div>
                            ) : (
                              <>
                                <button
                                  id={`approve-delete-${task.id}`}
                                  onClick={() => {
                                    setConfirmApproveDeleteId(task.id);
                                  }}
                                  className="px-2.5 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer"
                                >
                                  Aprovar Exclusão
                                </button>
                                <button
                                  id={`reject-delete-${task.id}`}
                                  onClick={() => updateTaskFields(task.id, { deletionRequest: null as any })}
                                  className="px-2.5 py-1 bg-gray-200 dark:bg-zinc-850 hover:bg-gray-300 dark:hover:bg-zinc-800 text-gray-700 dark:text-zinc-300 rounded-lg text-[10px] font-bold transition-all cursor-pointer"
                                >
                                  Rejeitar
                                </button>
                              </>
                            )}
                          </div>
                        ) : (
                          <div className="flex items-center justify-between gap-1 pl-5.5 text-[10px] text-gray-500 dark:text-zinc-400">
                            <span>Aguardando autorização do líder...</span>
                            {task.deletionRequest.requestedBy === currentUser?.id && (
                              <button
                                id={`cancel-request-delete-${task.id}`}
                                onClick={() => updateTaskFields(task.id, { deletionRequest: null as any })}
                                className="text-red-500 dark:text-red-400 hover:underline font-semibold cursor-pointer"
                              >
                                Cancelar solicitação
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Metadata tags line (Priority, Assignee and Date) */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-1.5">
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase border ${priorityMeta}`}>
                        {task.priority === "high" ? "Alta" : task.priority === "medium" ? "Média" : "Baixa"}
                      </span>

                      {task.dueDate && (
                        <span className="text-[10px] text-gray-400 dark:text-zinc-400 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          <span>{task.dueDate}</span>
                        </span>
                      )}

                      {!isPersonal && task.assignedToName && (
                        <span className="text-[10px] text-sky-600 bg-sky-500/10 border border-sky-500/20 rounded-full px-2 py-0.5 flex items-center gap-1 max-w-[124px] truncate">
                          <User className="w-3 h-3 shrink-0" />
                          <span className="truncate">{task.assignedToName}</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Checklist Summary details */}
                  <div className="border-t border-gray-150 dark:border-zinc-850 pt-2.5 mt-auto">
                    <button
                      id={`expand-checklist-btn-${task.id}`}
                      onClick={() => setExpandedTaskId(isExpanded ? null : task.id)}
                      className="w-full flex items-center justify-between text-xs text-gray-500 hover:text-gray-800 dark:text-zinc-400 dark:hover:text-zinc-200"
                    >
                      <span className="font-semibold flex items-center gap-1.5">
                        <CheckSquare className="w-3.5 h-3.5 text-sky-500" />
                        <span>Subtarefas ({hasChecklist ? `${completedItems}/${totalItems}` : "Nenhuma"})</span>
                      </span>
                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>

                    {/* Expand checklist area */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="mt-3 space-y-2 border-t border-gray-100 dark:border-zinc-850 pt-3 text-[11px] overflow-hidden"
                        >
                          {/* List items */}
                          <div className="space-y-1.5">
                            {task.checklist.map((item, idx) => {
                              const isFirst = idx === 0;
                              const isLast = idx === task.checklist.length - 1;
                              const isEditing = editingSubTaskId === item.id;

                              return (
                                <div
                                  id={`subtask-row-${item.id}`}
                                  key={item.id}
                                  className="flex items-center justify-between gap-2 p-1.5 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-850"
                                >
                                  {isEditing ? (
                                    <input
                                      id={`edit-subtask-input-${item.id}`}
                                      type="text"
                                      value={editingSubTaskText}
                                      onChange={(e) => setEditingSubTaskText(e.target.value)}
                                      onBlur={() => handleSaveSubTaskText(task, item.id)}
                                      onKeyDown={(e) => {
                                        if (e.key === "Enter") handleSaveSubTaskText(task, item.id);
                                        if (e.key === "Escape") setEditingSubTaskId(null);
                                      }}
                                      className="flex-1 px-2 py-1 text-xs bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-md text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-sky-500"
                                      autoFocus
                                    />
                                  ) : (
                                    <button
                                      id={`toggle-subitem-btn-${item.id}`}
                                      type="button"
                                      onClick={() => handleToggleCheckItem(task, item)}
                                      onDoubleClick={() => {
                                        if (canEdit) {
                                          setEditingSubTaskId(item.id);
                                          setEditingSubTaskText(item.text);
                                        }
                                      }}
                                      className="flex-1 text-left flex items-start gap-1.5 text-gray-700 dark:text-zinc-300"
                                    >
                                      {item.done ? (
                                        <CheckSquare className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                                      ) : (
                                        <Square className="w-3.5 h-3.5 text-gray-300 hover:text-sky-500 shrink-0 mt-0.5" />
                                      )}
                                      <span className={`leading-relaxed ${item.done ? "line-through text-gray-400 decoration-gray-300" : ""}`}>
                                        {item.text}
                                      </span>
                                    </button>
                                  )}

                                  {canEdit && !isEditing && (
                                    <div className="flex items-center gap-0.5 shrink-0">
                                      <button
                                        id={`move-up-subtask-${item.id}`}
                                        type="button"
                                        disabled={isFirst}
                                        onClick={() => handleMoveSubTask(task, idx, -1)}
                                        className={`p-1 rounded text-gray-400 hover:text-sky-500 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-all ${
                                          isFirst ? "opacity-30 cursor-not-allowed" : "cursor-pointer"
                                        }`}
                                        title="Mover para cima"
                                      >
                                        <ChevronUp className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        id={`move-down-subtask-${item.id}`}
                                        type="button"
                                        disabled={isLast}
                                        onClick={() => handleMoveSubTask(task, idx, 1)}
                                        className={`p-1 rounded text-gray-400 hover:text-sky-500 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-all ${
                                          isLast ? "opacity-30 cursor-not-allowed" : "cursor-pointer"
                                        }`}
                                        title="Mover para baixo"
                                      >
                                        <ChevronDown className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        id={`edit-subtask-${item.id}`}
                                        type="button"
                                        onClick={() => {
                                          setEditingSubTaskId(item.id);
                                          setEditingSubTaskText(item.text);
                                        }}
                                        className="p-1 rounded text-gray-400 hover:text-sky-500 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-all cursor-pointer"
                                        title="Editar subtarefa"
                                      >
                                        <Pencil className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        id={`delete-subitem-btn-${item.id}`}
                                        type="button"
                                        onClick={() => handleDeleteSubTask(task, item)}
                                        className="p-1 hover:bg-red-50 hover:text-red-500 rounded text-gray-400 shrink-0 cursor-pointer"
                                        title="Excluir subtarefa"
                                      >
                                        <X className="w-3 h-3" />
                                      </button>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                            {totalItems === 0 && (
                              <p className="p-1 italic text-gray-400 dark:text-zinc-500 text-[10px]">
                                Sem subtarefas associadas. Crie uma abaixo!
                              </p>
                            )}
                          </div>

                          {/* Quick checklist add input */}
                          {canEdit && (
                            <div className="flex gap-1.5 pt-1 border-t border-gray-50 dark:border-zinc-850">
                              <input
                                id={`quick-subtask-input-${task.id}`}
                                type="text"
                                placeholder="Nova subtarefa..."
                                value={newSubTaskTextMap[task.id] || ""}
                                onChange={(e) =>
                                  setNewSubTaskTextMap({
                                    ...newSubTaskTextMap,
                                    [task.id]: e.target.value,
                                  })
                                }
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") handleAddSubTask(task);
                                }}
                                className="flex-1 px-2.5 py-1.5 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-sky-500"
                              />
                              <button
                                id={`quick-subtask-submit-${task.id}`}
                                onClick={() => handleAddSubTask(task)}
                                className="px-2 bg-zinc-100 hover:bg-sky-600 hover:text-white dark:bg-zinc-800 dark:hover:bg-sky-500 p-1 rounded-lg text-gray-500"
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* OVERLAY DIALOG: CREATE NEW TASK */}
      <AnimatePresence>
        {showAddForm && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-zinc-900 rounded-3xl p-6 w-full max-w-md border border-gray-200 dark:border-zinc-800 shadow-2xl relative max-h-[90dvh] overflow-y-auto scrollbar-thin"
            >
              <button
                id="close-add-task-btn"
                onClick={() => setShowAddForm(false)}
                className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>

              <h3 className="text-sm font-bold text-gray-900 dark:text-zinc-50 mb-4 flex items-center gap-2">
                <CheckSquare className="w-5 h-5 text-sky-500" />
                <span>Nova Tarefa</span>
              </h3>

              <form onSubmit={handleCreateTaskSubmit} className="space-y-4 text-xs">
                {/* Title */}
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 dark:text-zinc-505 uppercase mb-1">Título da Tarefa</label>
                  <input
                    id="new-task-title"
                    type="text"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="Ex: Protótipo de Design, Revisão teórica"
                    className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-sky-500 text-gray-900 dark:text-white"
                    required
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 dark:text-zinc-505 uppercase mb-1">Descrição</label>
                  <textarea
                    id="new-task-desc"
                    value={newDesc}
                    onChange={(e) => setNewDesc(e.target.value)}
                    placeholder="Detalhes adicionais..."
                    className="w-full px-3.5 py-2 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl focus:outline-none text-gray-900 dark:text-white h-16 resize-none"
                  />
                </div>

                {/* Priority Selection badges */}
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 dark:text-zinc-505 uppercase mb-2">Prioridade</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(["low", "medium", "high"] as const).map((pType) => (
                      <button
                        id={`priority-btn-${pType}`}
                        key={pType}
                        type="button"
                        onClick={() => setNewPriority(pType)}
                        className={`py-2 px-3 border rounded-xl font-bold uppercase text-[9px] transition-all tracking-wider ${
                          newPriority === pType
                            ? pType === "high"
                              ? "bg-rose-500 text-white border-rose-500 shadow-xs"
                              : pType === "medium"
                              ? "bg-amber-500 text-white border-amber-500 shadow-xs"
                              : "bg-emerald-500 text-white border-emerald-500 shadow-xs"
                            : "bg-gray-50 border-gray-200 dark:bg-zinc-800 dark:border-zinc-700 text-gray-500 dark:text-zinc-400"
                        }`}
                      >
                        {pType === "high" ? "Alta" : pType === "medium" ? "Média" : "Baixa"}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {/* Due Date */}
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 dark:text-zinc-505 uppercase mb-1">Data Limite (Prazo)</label>
                    <input
                      id="new-task-due-date"
                      type="date"
                      value={newDueDate}
                      onChange={(e) => setNewDueDate(e.target.value)}
                      className="w-full px-3 py-2 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-sky-500 text-gray-950 dark:text-gray-50"
                    />
                  </div>

                  {/* Representative asignee selector */}
                  {!isPersonal && (
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 dark:text-zinc-505 uppercase mb-1">Atribuir a</label>
                      <select
                        id="new-task-assigned-to"
                        value={newAssignedTo}
                        onChange={(e) => setNewAssignedTo(e.target.value)}
                        className="w-full px-3 py-2.5 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-sky-500 text-gray-800 dark:text-zinc-200"
                      >
                        <option value="">Ninguém / Solo</option>
                        <option value="all">Fazer Geral (Todos)</option>
                        {groupMembers.map((m) => (
                          <option key={m.userId} value={m.userId}>
                            {m.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                {/* Subtasks design box */}
                <div className="border border-gray-150 dark:border-zinc-800 rounded-xl p-3 bg-zinc-50/50 dark:bg-zinc-900/40">
                  <span className="block font-semibold text-gray-700 dark:text-zinc-300 mb-1.5 text-[11px]">Subtarefas iniciais</span>
                  <div className="flex gap-1.5 mb-2">
                    <input
                      id="subtask-add-input"
                      type="text"
                      placeholder="Adicionar subtarefa..."
                      value={checklistInput}
                      onChange={(e) => setChecklistInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddChecklistText();
                        }
                      }}
                      className="flex-1 px-3 py-1.5 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg text-gray-900 dark:text-white focus:outline-none"
                    />
                    <button
                      id="subtask-add-submit"
                      type="button"
                      onClick={handleAddChecklistText}
                      className="px-2.5 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-gray-500 rounded-lg"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {newChecklistTextList.map((strText, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1 px-2 py-1.5 bg-sky-500/10 border border-sky-500/20 text-sky-600 dark:text-sky-300 rounded-lg font-medium"
                      >
                        <span className="truncate max-w-[120px]">{strText}</span>
                        <button
                          id={`newsubtask-remove-${idx}`}
                          type="button"
                          onClick={() => handleRemoveChecklistText(idx)}
                          className="hover:text-red-500"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                    {newChecklistTextList.length === 0 && (
                      <span className="text-[10px] text-gray-400 italic">Nenhuma subtarefa adicionada nesta lista.</span>
                    )}
                  </div>
                </div>

                {/* Submitting Actions */}
                <div className="flex gap-2 justify-end font-semibold pt-2">
                  <button
                    id="cancel-create-task"
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    className="px-4 py-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-gray-500 rounded-lg"
                  >
                    Fechar
                  </button>
                  <button
                    id="submit-create-task"
                    type="submit"
                    className="px-5 py-2.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl shadow-xs transition-all"
                  >
                    Salvar Tarefa
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* OVERLAY DIALOG: EDIT EXISTING TASK */}
      <AnimatePresence>
        {editingTask && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-zinc-900 rounded-3xl p-6 w-full max-w-md border border-gray-200 dark:border-zinc-800 shadow-2xl relative max-h-[90dvh] overflow-y-auto scrollbar-thin"
            >
              <button
                id="close-edit-task-btn"
                onClick={() => setEditingTask(null)}
                className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>

              <h3 className="text-sm font-bold text-gray-900 dark:text-zinc-50 mb-4 flex items-center gap-2">
                <Pencil className="w-5 h-5 text-sky-500" />
                <span>Editar Tarefa</span>
              </h3>

              <form onSubmit={handleEditTaskSubmit} className="space-y-4 text-xs">
                {/* Title */}
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 dark:text-zinc-505 uppercase mb-1">Título da Tarefa</label>
                  <input
                    id="edit-task-title"
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    placeholder="Ex: Protótipo de Design, Revisão teórica"
                    className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-sky-500 text-gray-900 dark:text-white"
                    required
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 dark:text-zinc-505 uppercase mb-1">Descrição</label>
                  <textarea
                    id="edit-task-desc"
                    value={editDesc}
                    onChange={(e) => setEditDesc(e.target.value)}
                    placeholder="Detalhes adicionais..."
                    className="w-full px-3.5 py-2 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl focus:outline-none text-gray-900 dark:text-white h-16 resize-none"
                  />
                </div>

                {/* Priority Selection badges */}
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 dark:text-zinc-505 uppercase mb-2">Prioridade</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(["low", "medium", "high"] as const).map((pType) => (
                      <button
                        id={`edit-priority-btn-${pType}`}
                        key={pType}
                        type="button"
                        onClick={() => setEditPriority(pType)}
                        className={`py-2 px-3 border rounded-xl font-bold uppercase text-[9px] transition-all tracking-wider ${
                          editPriority === pType
                            ? pType === "high"
                              ? "bg-rose-500 text-white border-rose-500 shadow-xs"
                              : pType === "medium"
                              ? "bg-amber-500 text-white border-amber-500 shadow-xs"
                              : "bg-emerald-500 text-white border-emerald-500 shadow-xs"
                            : "bg-gray-50 border-gray-200 dark:bg-zinc-800 dark:border-zinc-700 text-gray-500 dark:text-zinc-400"
                        }`}
                      >
                        {pType === "high" ? "Alta" : pType === "medium" ? "Média" : "Baixa"}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {/* Due Date */}
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 dark:text-zinc-505 uppercase mb-1">Data Limite (Prazo)</label>
                    <input
                      id="edit-task-due-date"
                      type="date"
                      value={editDueDate}
                      onChange={(e) => setEditDueDate(e.target.value)}
                      className="w-full px-3 py-2 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-sky-500 text-gray-950 dark:text-gray-50"
                    />
                  </div>

                  {/* Representative assignee selector */}
                  {!isPersonal && (
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 dark:text-zinc-505 uppercase mb-1">Atribuir a</label>
                      <select
                        id="edit-task-assigned-to"
                        value={editAssignedTo}
                        onChange={(e) => setEditAssignedTo(e.target.value)}
                        className="w-full px-3 py-2.5 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-sky-500 text-gray-800 dark:text-zinc-200"
                      >
                        <option value="">Ninguém / Solo</option>
                        <option value="all">Fazer Geral (Todos)</option>
                        {groupMembers.map((m) => (
                          <option key={m.userId} value={m.userId}>
                            {m.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                {/* Submitting Actions */}
                <div className="flex gap-2 justify-end font-semibold pt-2">
                  <button
                    id="cancel-edit-task"
                    type="button"
                    onClick={() => setEditingTask(null)}
                    className="px-4 py-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-gray-500 rounded-lg"
                  >
                    Cancelar
                  </button>
                  <button
                    id="submit-edit-task"
                    type="submit"
                    className="px-5 py-2.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl shadow-xs transition-all"
                  >
                    Salvar Alterações
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
