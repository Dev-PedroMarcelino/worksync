/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { useApp } from "../context/AppContext";
import {
  CheckSquare,
  StickyNote,
  BookOpen,
  Calendar,
  Lock,
  UserCheck,
  ShieldAlert,
  ArrowLeft,
  Settings2,
  Users,
  Check,
  X,
  MessageSquare,
  Mail,
  User2,
  Menu,
  Bell
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { TaskBoard } from "./TaskBoard";
import { WhiteboardCanvas } from "./WhiteboardCanvas";
import { NotebooksList } from "./NotebooksList";
import { GroupChatModule } from "./GroupChatModule";
import { GroupMember } from "../types";

interface WorkspaceProps {
  onOpenMobileSidebar: () => void;
  onOpenProfile: (tab: "profile" | "friends") => void;
}

export const Workspace: React.FC<WorkspaceProps> = ({ onOpenMobileSidebar, onOpenProfile }) => {
  const {
    activeTab,
    selectedGroup,
    selectedSubgroup,
    groupMembers,
    currentUser,
    checkSubgroupPermission,
    grantSubgroupPermission,
    getSubgroupPermissions,
    toggleSubgroupMembership,
    setSelectedGroup,
    setSelectedSubgroup,
    auditLogs,
    friendRequests,
    acceptFriendRequest,
    rejectFriendRequest,
    tasks,
    groupNotifications,
    dismissGroupNotification,
    setActiveTab,
    groups,
    allGroupTasks,
    activeModule,
    setActiveModule,
    chatMobileView,
    setChatMobileView,
    selectedDmUserId,
    setSelectedDmUserId,
  } = useApp();
  const [showManagePermissions, setShowManagePermissions] = useState(false);
  const [showSubgroupMembers, setShowSubgroupMembers] = useState(false);
  const [subPermissions, setSubPermissions] = useState<{ [uId: string]: boolean }>({});
  const [isUpdatingPerm, setIsUpdatingPerm] = useState<string | null>(null);

  // States and hooks for visual notification bell
  const [showNotifications, setShowNotifications] = useState(false);
  const [showGroupNotifs, setShowGroupNotifs] = useState(false);
  const [dismissedTaskIds, setDismissedTaskIds] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(`dismissed_tasks_${currentUser?.id}`) || "[]");
    } catch {
      return [];
    }
  });

  const dismissTaskNotification = (taskId: string) => {
    const updated = [...dismissedTaskIds, taskId];
    setDismissedTaskIds(updated);
    localStorage.setItem(`dismissed_tasks_${currentUser?.id}`, JSON.stringify(updated));
  };

  // Helper to format today YYYY-MM-DD in local time
  const getTodayStr = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getTomorrowStr = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const todayStr = getTodayStr();
  const tomorrowStr = getTomorrowStr();

  // Filter tasks: due today and pending
  const activeDueTasks = tasks.filter(
    (t) => t.dueDate === todayStr && t.status === "pending" && !dismissedTaskIds.includes(t.id)
  );

  // Pending Friend Requests:
  const pendingRequests = friendRequests.filter((r) => r.status === "pending");

  const totalNotifications = activeDueTasks.length + pendingRequests.length;

  // Visible group notifications (not read by user)
  const visibleGroupAlerts = groupNotifications.filter(
    (n) => !n.readBy.includes(currentUser?.id || "")
  );

  // Group tasks deadlines ending today/tomorrow (across all subgroups)
  const groupTasksAlerts = allGroupTasks.filter(
    (t) =>
      t.status === "pending" &&
      (t.dueDate === todayStr || t.dueDate === tomorrowStr) &&
      !dismissedTaskIds.includes(t.id)
  );

  const totalGroupNotifications = visibleGroupAlerts.length + groupTasksAlerts.length;

  // States for user profile and chat DM
  const [selectedProfileMember, setSelectedProfileMember] = useState<GroupMember | null>(null);

  const isPersonal = activeTab === "personal";
  const isGroupLeader = !isPersonal && selectedGroup && currentUser && selectedGroup.creatorId === currentUser.id;

  // Check subgroup editing permission
  const canEditSubgroup = isPersonal || (selectedSubgroup ? checkSubgroupPermission(selectedSubgroup.id) : false);

  // Determine if current user is the creator of subgroup or main group to show permissions manager button
  const isWorkspaceAdmin =
    !isPersonal &&
    selectedGroup &&
    selectedSubgroup &&
    (selectedGroup.creatorId === currentUser?.id || selectedSubgroup.creatorId === currentUser?.id);

  // Load permissions
  useEffect(() => {
    if (selectedSubgroup && isWorkspaceAdmin) {
      getSubgroupPermissions(selectedSubgroup.id).then((perms) => {
        setSubPermissions(perms);
      });
    }
  }, [selectedSubgroup, isWorkspaceAdmin]);

  // Reset selected DM user when active group or subgroup changes
  useEffect(() => {
    setSelectedDmUserId(null);
  }, [selectedGroup, selectedSubgroup, setSelectedDmUserId]);

  const handleTogglePermission = async (targetUserId: string, currentVal: boolean) => {
    if (!selectedSubgroup) return;
    setIsUpdatingPerm(targetUserId);
    try {
      const nextVal = !currentVal;
      await grantSubgroupPermission(selectedSubgroup.id, targetUserId, nextVal);
      setSubPermissions((prev) => ({ ...prev, [targetUserId]: nextVal }));
    } catch (e) {
      alert("Erro ao aplicar permissão.");
    } finally {
      setIsUpdatingPerm(null);
    }
  };

  // Back button for mobile/tablet responsive layout
  const handleGoBack = () => {
    if (isPersonal) {
      if (selectedSubgroup) {
        setSelectedSubgroup(null);
      }
    } else {
      if (selectedSubgroup) {
        setSelectedSubgroup(null);
      } else if (selectedGroup) {
        setSelectedGroup(null);
      }
    }
  };

  // Render when nothing is selected in Group Mode
  if (!isPersonal && !selectedGroup) {
    return (
      <div className="flex-1 min-h-screen flex items-center justify-center bg-gray-50 dark:bg-zinc-950 p-8 font-sans">
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center max-w-md p-8 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-3xl shadow-xl"
        >
          <div className="w-16 h-16 rounded-full bg-sky-500/10 text-sky-500 flex items-center justify-center mx-auto mb-4 border border-sky-500/20">
            <Users className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-zinc-50 mb-2">
            Nenhum Grupo Selecionado
          </h2>
          <p className="text-sm text-gray-500 dark:text-zinc-400">
            Selecione um grupo colaborativo ou crie um novo na aba esquerda. Ou navegue pela sua Área Pessoal de organização individual.
          </p>
          <div className="mt-6 flex flex-col gap-2.5">
            <button
              onClick={() => onOpenProfile("friends")}
              className="w-full py-2.5 px-4 bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer font-semibold"
            >
              <Users className="w-4 h-4" />
              <span>Gerenciar Amigos</span>
            </button>
            <button
               onClick={() => {
                 setActiveTab("groups");
                 setChatMobileView("list");
                 setSelectedDmUserId(null);
                 if (groups.length > 0) {
                   setSelectedGroup(groups[0]);
                   setActiveModule("chat");
                 } else {
                   alert("Você precisa criar ou entrar em um grupo primeiro para acessar os chats.");
                 }
               }}
              className="w-full py-2.5 px-4 bg-sky-600 hover:bg-sky-500 dark:bg-sky-600/20 dark:hover:bg-sky-600/30 text-white dark:text-sky-400 text-xs font-bold rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer font-semibold"
            >
              <MessageSquare className="w-4 h-4" />
              <span>Acessar Chats & DMs</span>
            </button>
            <button
              onClick={() => setActiveTab("personal")}
              className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer font-semibold"
            >
              <CheckSquare className="w-4 h-4" />
              <span>Ir para Área Pessoal</span>
            </button>
            <button
              onClick={onOpenMobileSidebar}
              className="md:hidden w-full py-2.5 px-4 bg-gray-100 dark:bg-zinc-850 hover:bg-gray-200 dark:hover:bg-zinc-800 text-gray-700 dark:text-zinc-200 text-xs font-bold rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
            >
              <Menu className="w-4 h-4" />
              <span>Abrir Menu de Navegação</span>
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex-1 h-[100dvh] flex flex-col bg-gray-50 dark:bg-zinc-950 overflow-hidden font-sans relative transition-colors duration-200">
      {/* HEADER BAR */}
      <header className="px-4 sm:px-6 py-3 sm:py-4 bg-white dark:bg-zinc-900 border-b border-gray-200 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-4 select-none shrink-0" id="workspace-header">
        <div className="flex items-center gap-2">
          {/* Mobile open-menu drawer button */}
          {((isPersonal && !selectedSubgroup) || (!isPersonal && !selectedGroup)) && (
            <button
              id="workspace-menu-toggle-btn"
              onClick={onOpenMobileSidebar}
              className="md:hidden p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-500 hover:text-gray-700 dark:text-zinc-400 dark:hover:text-zinc-200 cursor-pointer"
              title="Abrir Menu"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}

          {/* Back responsive trigger button */}
          {((isPersonal && selectedSubgroup) || (!isPersonal && selectedGroup)) && (
            <button
              id="workspace-back-btn"
              onClick={handleGoBack}
              className="md:hidden p-1.5 rounded-lg hover:bg-gray-150 dark:hover:bg-zinc-800 text-gray-405 hover:text-gray-600 cursor-pointer"
              title="Voltar"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}

          <div>
            <div className="flex items-center gap-2">
              <span className={`w-3 h-3 rounded-full ${isPersonal ? "bg-emerald-500" : "bg-sky-500"}`} />
              <h1 id="workspace-title" className="text-base font-bold text-gray-900 dark:text-zinc-50 tracking-tight">
                {isPersonal ? "Minha Área Pessoal" : selectedSubgroup?.name}
              </h1>
            </div>
            <p className="text-xs text-gray-400 dark:text-zinc-500 mt-0.5">
              {isPersonal
                ? "Organização solo de listas, pensamentos e notas do dia."
                : `Projeto vinculado ao grupo: ${selectedGroup?.name}`}
            </p>
          </div>
        </div>

        {/* Tab Module Selectors */}
        <div className="flex flex-row flex-nowrap items-center p-1 bg-gray-100 dark:bg-zinc-800/80 rounded-xl border border-gray-200/50 dark:border-zinc-800/20 text-xs overflow-x-auto max-w-full shrink-0 scrollbar-none">
          <button
            id="module-tasks-btn"
            onClick={() => setActiveModule("tasks")}
            title="Fluxo de Tarefas"
            className={`p-2.5 font-semibold rounded-lg flex items-center justify-center transition-all cursor-pointer ${
              activeModule === "tasks"
                ? "bg-white dark:bg-zinc-700 text-gray-900 dark:text-white shadow-xs"
                : "text-gray-500 hover:text-gray-800 dark:text-zinc-400 dark:hover:text-zinc-200"
            }`}
          >
            <CheckSquare className="w-4 h-4" />
          </button>
          <button
            id="module-whiteboard-btn"
            onClick={() => setActiveModule("whiteboard")}
            title="Quadro Branco"
            className={`p-2.5 font-semibold rounded-lg flex items-center justify-center transition-all cursor-pointer ${
              activeModule === "whiteboard"
                ? "bg-white dark:bg-zinc-700 text-gray-900 dark:text-white shadow-xs"
                : "text-gray-500 hover:text-gray-800 dark:text-zinc-400 dark:hover:text-zinc-200"
            }`}
          >
            <StickyNote className="w-4 h-4" />
          </button>
          <button
            id="module-notes-btn"
            onClick={() => setActiveModule("notes")}
            title="Blocos de Notas"
            className={`p-2.5 font-semibold rounded-lg flex items-center justify-center transition-all cursor-pointer ${
              activeModule === "notes"
                ? "bg-white dark:bg-zinc-700 text-gray-900 dark:text-white shadow-xs"
                : "text-gray-500 hover:text-gray-800 dark:text-zinc-400 dark:hover:text-zinc-200"
            }`}
          >
            <BookOpen className="w-4 h-4" />
          </button>
          {!isPersonal && (
            <button
              id="module-chat-btn"
              onClick={() => {
                setActiveModule("chat");
                setChatMobileView("list");
                setSelectedDmUserId(null);
              }}
              title="Chat & DMs"
              className={`p-2.5 font-semibold rounded-lg flex items-center justify-center transition-all cursor-pointer relative ${
                activeModule === "chat"
                  ? "bg-white dark:bg-zinc-700 text-gray-900 dark:text-white shadow-xs"
                  : "text-gray-500 hover:text-gray-800 dark:text-zinc-400 dark:hover:text-zinc-200"
              }`}
            >
              <MessageSquare className="w-4 h-4" />
            </button>
          )}
          {!isPersonal && (
            <button
              id="module-audit-btn"
              onClick={() => setActiveModule("audit")}
              title="Histórico do Grupo"
              className={`p-2.5 font-semibold rounded-lg flex items-center justify-center transition-all cursor-pointer relative ${
                activeModule === "audit"
                  ? "bg-white dark:bg-zinc-700 text-gray-900 dark:text-white shadow-xs"
                  : "text-gray-500 hover:text-gray-800 dark:text-zinc-400 dark:hover:text-zinc-200"
              }`}
            >
              <ShieldAlert className="w-4 h-4 text-sky-500 dark:text-sky-400" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* PERSONAL NOTIFICATION BELL */}
          <div className="relative">
            <button
              id="notifications-bell-btn"
              onClick={() => setShowNotifications(!showNotifications)}
              className={`p-2.5 rounded-xl border transition-all cursor-pointer relative ${
                showNotifications
                  ? "bg-sky-500/10 border-sky-500/35 text-sky-500"
                  : "bg-gray-50 hover:bg-gray-100 dark:bg-zinc-800 dark:hover:bg-zinc-755 border-gray-200 dark:border-zinc-800 text-gray-500 dark:text-zinc-400"
              }`}
              title="Notificações Pessoais"
            >
              <Bell className="w-4.5 h-4.5" />
              {totalNotifications > 0 && (
                <span id="bell-badge" className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 bg-rose-500 text-white rounded-full text-[9px] font-bold flex items-center justify-center border border-white dark:border-zinc-900 shadow-sm animate-pulse">
                  {totalNotifications}
                </span>
              )}
            </button>

            {/* NOTIFICATIONS DROPDOWN PANEL */}
            <AnimatePresence>
              {showNotifications && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowNotifications(false)}
                  />
                  
                  <motion.div
                    initial={{ opacity: 0, y: 12, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95, y: 12 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 mt-2.5 w-80 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md border border-gray-200/60 dark:border-zinc-800/60 rounded-2xl shadow-xl z-50 overflow-hidden text-xs max-h-[360px] flex flex-col font-sans"
                  >
                    <div className="p-3.5 border-b border-gray-150 dark:border-zinc-800/80 bg-gray-50/50 dark:bg-zinc-900/50 flex justify-between items-center shrink-0">
                      <span className="font-extrabold text-gray-900 dark:text-white flex items-center gap-1.5">
                        <Bell className="w-3.5 h-3.5 text-sky-500" /> Notificações
                      </span>
                      {totalNotifications > 0 && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 font-bold">
                          {totalNotifications} novas
                        </span>
                      )}
                    </div>

                    <div className="flex-1 overflow-y-auto divide-y divide-gray-100 dark:divide-zinc-800/80">
                      {/* Section: Friend requests */}
                      {pendingRequests.length > 0 && (
                        <div className="p-1">
                          <span className="px-3 py-2 text-[9px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-wider block">
                            Pedidos de Amizade
                          </span>
                          <div className="space-y-1">
                            {pendingRequests.map((req) => (
                              <div
                                key={req.id}
                                className="p-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-zinc-800/40 flex items-center gap-2.5"
                              >
                                <img
                                  src={req.senderPhoto}
                                  alt=""
                                  className="w-8 h-8 rounded-full border border-black/5 dark:border-white/5 shrink-0 object-cover"
                                />
                                <div className="min-w-0 flex-1">
                                  <p className="font-bold text-gray-900 dark:text-white truncate">{req.senderName}</p>
                                  <p className="text-[10px] text-gray-400 truncate">Quer ser seu amigo</p>
                                </div>
                                <div className="flex gap-1 shrink-0">
                                  <button
                                    onClick={async () => {
                                      await acceptFriendRequest(req.id);
                                    }}
                                    className="p-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white transition-all cursor-pointer"
                                    title="Aceitar"
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={async () => {
                                      await rejectFriendRequest(req.id);
                                    }}
                                    className="p-1.5 rounded-lg bg-rose-500 hover:bg-rose-600 text-white transition-all cursor-pointer"
                                    title="Recusar"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Section: Due tasks */}
                      {activeDueTasks.length > 0 && (
                        <div className="p-1">
                          <span className="px-3 py-2 text-[9px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-wider block">
                            Tarefas para Hoje 📅
                          </span>
                          <div className="space-y-1">
                            {activeDueTasks.map((t) => (
                              <div
                                key={t.id}
                                className="p-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-zinc-800/40 flex items-start justify-between gap-2.5"
                              >
                                <div className="min-w-0 flex-1">
                                  <p className="font-bold text-gray-900 dark:text-white truncate">{t.title}</p>
                                  <p className="text-[10px] text-gray-450 leading-normal mt-0.5 line-clamp-2">{t.description || "Sem descrição"}</p>
                                </div>
                                <button
                                  onClick={() => dismissTaskNotification(t.id)}
                                  className="p-1.5 rounded-lg hover:bg-gray-150 dark:hover:bg-zinc-800 text-gray-400 hover:text-gray-600 dark:hover:text-zinc-300 transition-all cursor-pointer shrink-0"
                                  title="Dispensar"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {totalNotifications === 0 && (
                        <div className="p-8 text-center text-gray-400/80 pointer-events-none select-none">
                          <Check className="w-8 h-8 text-gray-200 dark:text-zinc-800 mx-auto mb-2" />
                          <p className="font-semibold text-xs text-gray-600 dark:text-zinc-400">Você está em dia!</p>
                          <p className="text-[10px] mt-0.5 opacity-85">Nenhuma notificação nova no momento.</p>
                        </div>
                      )}
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>

          {/* GROUP NOTIFICATION BELL (Only visible in Group tab when a group is active) */}
          {!isPersonal && selectedGroup && (
            <div className="relative">
              <button
                id="group-notifications-bell-btn"
                onClick={() => setShowGroupNotifs(!showGroupNotifs)}
                className={`p-2.5 rounded-xl border transition-all cursor-pointer relative ${
                  showGroupNotifs
                    ? "bg-sky-600/10 border-sky-500/35 text-sky-600 dark:text-sky-400"
                    : "bg-gray-50 hover:bg-gray-100 dark:bg-zinc-800 dark:hover:bg-zinc-755 border-gray-200 dark:border-zinc-800 text-gray-600 dark:text-zinc-300"
                }`}
                title={`Notificações de: ${selectedGroup.name}`}
              >
                <Bell className="w-4.5 h-4.5 text-sky-500 dark:text-sky-400" />
                <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-sky-500" />
                {totalGroupNotifications > 0 && (
                  <span id="group-bell-badge" className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 bg-sky-600 text-white rounded-full text-[9px] font-bold flex items-center justify-center border border-white dark:border-zinc-900 shadow-sm animate-pulse">
                    {totalGroupNotifications}
                  </span>
                )}
              </button>

              <AnimatePresence>
                {showGroupNotifs && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setShowGroupNotifs(false)}
                    />
                    
                    <motion.div
                      initial={{ opacity: 0, y: 12, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95, y: 12 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 mt-2.5 w-80 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md border border-gray-200/60 dark:border-zinc-800/60 rounded-2xl shadow-xl z-50 overflow-hidden text-xs max-h-[360px] flex flex-col font-sans"
                    >
                      <div className="p-3.5 border-b border-gray-150 dark:border-zinc-800/80 bg-gray-50/50 dark:bg-zinc-900/50 flex justify-between items-center shrink-0">
                        <span className="font-extrabold text-gray-900 dark:text-white flex items-center gap-1.5">
                          <Bell className="w-3.5 h-3.5 text-sky-500" /> Notificações de Grupo
                        </span>
                        {totalGroupNotifications > 0 && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-600 dark:text-sky-400 font-bold">
                            {totalGroupNotifications} novas
                          </span>
                        )}
                      </div>

                      <div className="flex-1 overflow-y-auto divide-y divide-gray-100 dark:divide-zinc-800/80">
                        {/* Section: Group alerts */}
                        {visibleGroupAlerts.length > 0 && (
                          <div className="p-1">
                            <span className="px-3 py-2 text-[9px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-wider block">
                              Atualizações de Atividades
                            </span>
                            <div className="space-y-1">
                              {visibleGroupAlerts.map((notif) => (
                                <div
                                  key={notif.id}
                                  className="p-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-zinc-800/40 flex items-start justify-between gap-2.5"
                                >
                                  <div className="min-w-0 flex-1">
                                    <p className="font-bold text-gray-950 dark:text-white leading-normal">{notif.text}</p>
                                    <p className="text-[8px] text-gray-400 dark:text-zinc-500 mt-1">
                                      {new Date(notif.timestamp).toLocaleString("pt-BR")}
                                    </p>
                                  </div>
                                  <button
                                    onClick={async () => {
                                      await dismissGroupNotification(notif.id);
                                    }}
                                    className="p-1 rounded-lg hover:bg-gray-150 dark:hover:bg-zinc-800 text-gray-400 hover:text-gray-650 transition-all cursor-pointer shrink-0"
                                    title="Dispensar"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Section: Deadlines ending today/tomorrow */}
                        {groupTasksAlerts.length > 0 && (
                          <div className="p-1">
                            <span className="px-3 py-2 text-[9px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-wider block">
                              Prazos do Grupo 📅
                            </span>
                            <div className="space-y-1">
                              {groupTasksAlerts.map((t) => (
                                <div
                                  key={t.id}
                                  className="p-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-zinc-800/40 flex items-start justify-between gap-2.5"
                                >
                                  <div className="min-w-0 flex-1">
                                    <p className="font-bold text-gray-900 dark:text-white truncate">{t.title}</p>
                                    <p className="text-[10px] text-gray-450 mt-0.5">
                                      Prazo: <span className="text-rose-500 font-semibold">{t.dueDate === todayStr ? "Hoje" : "Amanhã"}</span>
                                    </p>
                                  </div>
                                  <button
                                    onClick={() => dismissTaskNotification(t.id)}
                                    className="p-1 rounded-lg hover:bg-gray-150 dark:hover:bg-zinc-850 text-gray-400 hover:text-gray-600 transition-all cursor-pointer shrink-0"
                                    title="Dispensar"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {totalGroupNotifications === 0 && (
                          <div className="p-8 text-center text-gray-400/80 pointer-events-none select-none">
                            <Check className="w-8 h-8 text-gray-200 dark:text-zinc-800 mx-auto mb-2" />
                            <p className="font-semibold text-xs text-gray-600 dark:text-zinc-400">Grupo sem alertas!</p>
                            <p className="text-[10px] mt-0.5 opacity-85">Tudo em ordem por aqui.</p>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Group members colors / Permission admin key */}
          {!isPersonal && selectedGroup && (
            <>
              {/* User colors legend row */}
              <div className="hidden lg:flex items-center -space-x-2 overflow-hidden" title="Membros do Grupo e Tons de Cores">
                {groupMembers.map((m) => (
                  <button
                    id={`legend-member-${m.userId}`}
                    key={m.userId}
                    onClick={() => setSelectedProfileMember(m)}
                    className={`w-7 h-7 rounded-full border border-white dark:border-zinc-900 flex items-center justify-center text-[10px] font-bold ${m.color.split(" ")[0] || ""} ${m.color.split(" ")[1] || ""} cursor-pointer hover:scale-115 active:scale-90 transition-all outline-none focus:outline-none shrink-0`}
                    title={`${m.name} (${m.role || "Membro"}) - Ver Perfil`}
                  >
                    <img src={m.photoUrl} alt="" className="w-full h-full object-cover rounded-full" referrerPolicy="no-referrer" />
                  </button>
                ))}
              </div>

              {/* Private subgroup members managing button */}
              {!isPersonal && selectedSubgroup?.isPrivate && selectedSubgroup.creatorId === currentUser?.id && (
                <button
                  id="manage-sub-members-btn"
                  onClick={() => {
                    setShowSubgroupMembers(!showSubgroupMembers);
                    setShowManagePermissions(false);
                  }}
                  className={`p-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                    showSubgroupMembers
                      ? "bg-violet-500/10 border-violet-500/30 text-violet-500"
                      : "bg-gray-50 hover:bg-zinc-100 dark:bg-zinc-800 dark:hover:bg-zinc-755 border-gray-200 dark:border-zinc-800 text-gray-600 dark:text-zinc-300"
                  }`}
                  title="Adicionar ou remover participantes deste subgrupo privado"
                >
                  <Users className="w-4 h-4" />
                  <span className="hidden sm:inline">Participantes 🔒</span>
                </button>
              )}

              {/* Admin permissions key trigger button */}
              {isWorkspaceAdmin && (
                <button
                  id="manage-permissions-btn"
                  onClick={() => {
                    setShowManagePermissions(!showManagePermissions);
                    setShowSubgroupMembers(false);
                  }}
                  className={`p-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                    showManagePermissions
                      ? "bg-amber-500/10 border-amber-500/30 text-amber-500"
                      : "bg-gray-50 hover:bg-zinc-100 dark:bg-zinc-800 dark:hover:bg-zinc-755 border-gray-200 dark:border-zinc-800 text-gray-600 dark:text-zinc-300"
                  }`}
                  title="Quem por exemplo pode criar listas ou post-its no subgrupo"
                >
                  <Settings2 className="w-4 h-4" />
                  <span className="hidden sm:inline">Permissões</span>
                </button>
              )}
            </>
          )}
        </div>
      </header>

      {/* SUBGROUP PERMISSIONS MODAL ACCORDION */}
      <AnimatePresence>
        {showManagePermissions && !isPersonal && selectedSubgroup && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="px-6 py-4 bg-amber-500/5 border-b border-amber-500/10 flex flex-col sm:flex-row justify-between gap-4 shrink-0 select-none"
          >
            <div className="max-w-md">
              <span className="text-xs font-bold text-amber-700 dark:text-amber-400 block mb-1">
                Definir Controle de Permissões para: {selectedSubgroup.name}
              </span>
              <p className="text-[11px] text-gray-500 dark:text-zinc-400">
                Como criador, você pode permitir ou bloquear a criação/modificação de listas, post-its e notas por membros específicos do time. Ativo por padrão se não configurado.
              </p>
            </div>

            <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto p-1 bg-white dark:bg-zinc-900 rounded-xl border border-gray-200 dark:border-zinc-800">
              {groupMembers
                .filter((member) => member.userId !== currentUser?.id && member.userId !== selectedGroup?.creatorId)
                .map((member) => {
                  const hasPerm = subPermissions[member.userId] !== false;
                  return (
                    <div
                      id={`perm-row-${member.userId}`}
                      key={member.userId}
                      className="px-2.5 py-1.5 flex items-center gap-2 text-xs border border-gray-100 dark:border-zinc-800 rounded-lg bg-zinc-50 dark:bg-zinc-900/40"
                    >
                      <span className="font-semibold text-gray-800 dark:text-zinc-200 truncate max-w-[80px]">
                        {member.name}
                      </span>
                      <button
                        id={`toggle-perm-btn-${member.userId}`}
                        type="button"
                        onClick={() => handleTogglePermission(member.userId, hasPerm)}
                        disabled={isUpdatingPerm === member.userId}
                        className={`px-2 py-0.5 rounded-md font-bold text-[10px] transition-all ${
                          hasPerm
                            ? "bg-emerald-500/15 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400"
                            : "bg-red-500/15 text-red-600 dark:bg-red-500/20 dark:text-red-400"
                        }`}
                      >
                        {isUpdatingPerm === member.userId ? (
                          <span className="w-2.5 h-2.5 border border-zinc-400 border-t-transparent rounded-full animate-spin inline-block" />
                        ) : hasPerm ? (
                          "Pode Editar"
                        ) : (
                          "Bloqueado"
                        )}
                      </button>
                    </div>
                  );
                })}
              {groupMembers.filter((m) => m.userId !== currentUser?.id).length === 0 && (
                <span className="text-[11px] p-2 italic text-gray-400">
                  Nenhum outro membro no grupo para gerenciar permissões. Compartilhe o código!
                </span>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* PRIVATE SUBGROUP PARTICIPANTS ACCORDION */}
      <AnimatePresence>
        {showSubgroupMembers && !isPersonal && selectedSubgroup?.isPrivate && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="px-6 py-4 bg-violet-500/5 border-b border-violet-500/10 flex flex-col sm:flex-row justify-between gap-4 shrink-0 select-none"
          >
            <div className="max-w-md">
              <span className="text-xs font-bold text-violet-700 dark:text-violet-400 block mb-1">
                Participantes do Subgrupo Privado: {selectedSubgroup.name}
              </span>
              <p className="text-[11px] text-gray-500 dark:text-zinc-400">
                Como criador do subgrupo, você pode adicionar ou remover membros do grupo principal para participarem deste espaço de trabalho privado.
              </p>
            </div>

            <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-2 bg-white dark:bg-zinc-900 rounded-xl border border-gray-200 dark:border-zinc-800">
              {groupMembers.map((member) => {
                const isCreator = member.userId === selectedSubgroup.creatorId;
                const isJoined = selectedSubgroup.members?.includes(member.userId) || isCreator;
                return (
                  <div
                    id={`member-manage-row-${member.userId}`}
                    key={member.userId}
                    className="px-2.5 py-1.5 flex items-center gap-2 text-xs border border-gray-100 dark:border-zinc-800 rounded-lg bg-zinc-50 dark:bg-zinc-900/40"
                  >
                    <span className="font-semibold text-gray-800 dark:text-zinc-200 truncate max-w-[100px]">
                      {member.name}
                    </span>
                    {isCreator ? (
                      <span className="text-[10px] bg-sky-500/10 text-sky-600 dark:text-sky-400 font-bold px-2 py-0.5 rounded-md">
                        Criador Sub
                      </span>
                    ) : (
                      <button
                        id={`toggle-sub-member-${member.userId}`}
                        type="button"
                        onClick={() => toggleSubgroupMembership(selectedSubgroup.id, member.userId)}
                        className={`px-2 py-0.5 rounded-md font-bold text-[10px] transition-all cursor-pointer ${
                          isJoined
                            ? "bg-violet-500/15 text-violet-600 dark:bg-violet-500/20 dark:text-violet-400"
                            : "bg-zinc-200/50 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-500"
                        }`}
                      >
                        {isJoined ? "Participa" : "Convidar"}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CORE WORKSPACE CONTENT PANEL */}
      <main className={`flex-1 w-full max-w-full overflow-hidden relative flex flex-col ${activeModule === "chat" ? "p-0 md:p-6" : "p-2 sm:p-6"} min-h-0`} id="workspace-main-panel">
        {/* Permission restriction header warn (Read-Only safeguard list) */}
        {!isPersonal && selectedSubgroup && !canEditSubgroup && (
          <div className="mb-4 px-4 py-3 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center gap-3 text-xs text-amber-700 dark:text-amber-400 scale-98 select-none shrink-0">
            <Lock className="w-4 h-4 shrink-0" />
            <span className="font-medium">
              Acesso de Leitura Ativo: O criador deste subgrupo removeu temporariamente suas permissões de escrita para novas tarefas, post-its ou notas.
            </span>
          </div>
        )}

        <div className="flex-1 min-h-0 w-full max-w-full relative flex flex-col overflow-hidden">
          {!isPersonal && !selectedSubgroup && (activeModule === "tasks" || activeModule === "whiteboard" || activeModule === "notes") ? (
            <div className="flex-1 flex items-center justify-center p-8 bg-gray-50/50 dark:bg-zinc-950/20 text-gray-550">
              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center max-w-md p-8 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-3xl shadow-xl"
              >
                <div className="w-16 h-16 rounded-full bg-sky-500/10 text-sky-500 flex items-center justify-center mx-auto mb-4 border border-sky-500/20">
                  <Users className="w-8 h-8" />
                </div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-zinc-50 mb-2">
                  Workspace: {selectedGroup?.name}
                </h2>
                <p className="text-sm text-gray-500 dark:text-zinc-400">
                  Selecione ou crie um Subgrupo/Projeto na barra lateral esquerda para gerenciar listas de tarefas, quadro visual de post-its ou bloco de notas deste grupo.
                </p>
                <div className="mt-6 flex flex-col gap-2.5">
                  <button
                    onClick={() => {
                      setActiveModule("chat");
                      setChatMobileView("list");
                      setSelectedDmUserId(null);
                    }}
                    className="w-full py-2.5 px-4 bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer font-semibold"
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span>Abrir Chat do Grupo</span>
                  </button>
                  <button
                    onClick={() => onOpenProfile("friends")}
                    className="w-full py-2.5 px-4 bg-gray-100 dark:bg-zinc-850 hover:bg-gray-200 dark:hover:bg-zinc-800 text-gray-700 dark:text-zinc-200 text-xs font-bold rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer font-semibold"
                  >
                    <Users className="w-4 h-4" />
                    <span>Gerenciar Amigos</span>
                  </button>
                  <button
                    onClick={onOpenMobileSidebar}
                    className="md:hidden w-full py-2.5 px-4 bg-zinc-200 hover:bg-zinc-300 dark:bg-zinc-700 dark:hover:bg-zinc-650 text-gray-800 dark:text-zinc-100 text-xs font-bold rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
                  >
                    <Menu className="w-4 h-4" />
                    <span>Abrir Barra Lateral</span>
                  </button>
                </div>
              </motion.div>
            </div>
          ) : (
            <>
              {activeModule === "tasks" && <TaskBoard canEdit={canEditSubgroup} />}
              {activeModule === "whiteboard" && <WhiteboardCanvas canEdit={canEditSubgroup} />}
              {activeModule === "notes" && <NotebooksList canEdit={canEditSubgroup} />}
              {activeModule === "chat" && (
                <GroupChatModule
                  onOpenProfile={(member) => setSelectedProfileMember(member)}
                  selectedDmUserId={selectedDmUserId}
                  onSelectDmUser={(id) => setSelectedDmUserId(id)}
                />
              )}
              {activeModule === "audit" && !isPersonal && (
            <div className="flex-1 flex flex-col min-h-0 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-850 rounded-3xl p-6 overflow-hidden shadow-sm">
              <div className="flex items-center justify-between mb-6 shrink-0">
                <div>
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
                    <ShieldAlert className="w-5 h-5 text-sky-500" />
                    Histórico do Grupo
                  </h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Histórico de tarefas criadas, alteradas e concluídas no grupo por todos os membros.
                  </p>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto pr-1 space-y-3 scrollbar-thin scrollbar-thumb-zinc-300 dark:scrollbar-thumb-zinc-700">
                {auditLogs.length === 0 ? (
                  <div className="h-48 flex flex-col items-center justify-center text-center p-6 border border-dashed border-gray-200 dark:border-zinc-800 rounded-2xl">
                    <ShieldAlert className="w-8 h-8 text-gray-300 dark:text-zinc-700 mb-2" />
                    <p className="text-sm font-medium text-gray-500 dark:text-zinc-400">Nenhum registro de histórico encontrado.</p>
                    <p className="text-xs text-gray-400 mt-0.5">Ações em tarefas feitas por membros do grupo aparecerão aqui.</p>
                  </div>
                ) : (
                  auditLogs.map((log) => {
                    let actionText = "";
                    let actionBadgeColor = "";
                    if (log.action === "create") {
                      actionText = "Criou a tarefa";
                      actionBadgeColor = "bg-green-500/10 text-green-600 dark:text-green-400";
                    } else if (log.action === "complete") {
                      actionText = "Concluiu a tarefa";
                      actionBadgeColor = "bg-blue-500/10 text-blue-600 dark:text-blue-400";
                    } else if (log.action === "delete") {
                      actionText = "Deletou a tarefa";
                      actionBadgeColor = "bg-red-500/10 text-red-600 dark:text-red-400";
                    } else if (log.action === "update") {
                      actionText = "Alterou a tarefa";
                      actionBadgeColor = "bg-amber-500/10 text-amber-600 dark:text-amber-400";
                    }

                    return (
                      <div
                        id={`audit-log-item-${log.id}`}
                        key={log.id}
                        className="p-4 border border-gray-100 dark:border-zinc-800/60 rounded-2xl bg-zinc-50/50 dark:bg-zinc-905/30 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs"
                      >
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-semibold text-gray-900 dark:text-white">
                              {log.performedBy}
                            </span>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${actionBadgeColor}`}>
                              {actionText}
                            </span>
                            <span className="font-semibold font-mono text-gray-800 dark:text-zinc-100 truncate max-w-[200px]" title={log.taskTitle}>
                              "{log.taskTitle}"
                            </span>
                          </div>
                          <div className="text-gray-400 dark:text-zinc-500 flex items-center gap-1.5 flex-wrap">
                            <span>Subgrupo: <strong className="text-gray-600 dark:text-zinc-300">{log.subgroupName}</strong></span>
                            <span>•</span>
                            <span>ID da Tarefa: <code className="bg-gray-100 dark:bg-zinc-800 px-1 py-0.5 rounded text-[10px]">{log.taskId}</code></span>
                          </div>
                        </div>
                        <div className="text-[10px] text-gray-400 dark:text-zinc-500 sm:text-right shrink-0">
                          {new Date(log.timestamp).toLocaleString("pt-BR")}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
      </main>

      {/* USER PROFILE MODAL */}
      <AnimatePresence>
        {selectedProfileMember && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-zinc-900 rounded-3xl p-6 w-full max-w-sm border border-gray-200 dark:border-zinc-800 shadow-2xl relative max-h-[90dvh] overflow-y-auto scrollbar-thin"
            >
              <button
                id="close-profile-modal-btn"
                onClick={() => setSelectedProfileMember(null)}
                className="absolute top-4 right-4 p-1 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="text-center pt-4">
                {/* Large Avatar */}
                <div className="relative inline-block mb-3.5">
                  <img
                    src={selectedProfileMember.photoUrl}
                    alt=""
                    referrerPolicy="no-referrer"
                    className="w-20 h-20 rounded-2xl object-cover border-2 border-sky-500 shadow-md mx-auto"
                  />
                  <span
                    className={`absolute -bottom-1.5 -right-1.5 px-2 py-0.5 text-[8px] font-bold uppercase rounded-md shadow-sm border border-white dark:border-zinc-900 ${
                      selectedProfileMember.color.split(" ")[0] || "bg-sky-500 text-white"
                    } ${selectedProfileMember.color.split(" ")[1] || ""}`}
                  >
                    Tom do Quadro
                  </span>
                </div>

                {/* Name & Role */}
                <h4 className="text-base font-extrabold text-gray-900 dark:text-zinc-50 tracking-tight text-center">
                  {selectedProfileMember.name}
                </h4>
                <p className="text-xs text-gray-400 dark:text-zinc-500 font-medium mb-4 mt-0.5 text-center">
                  {selectedProfileMember.role || "Membro do Grupo"}
                </p>

                {/* Info Card Grid */}
                <div className="bg-gray-50 dark:bg-zinc-950/50 rounded-2xl p-4 text-left space-y-2.5 border border-gray-100 dark:border-zinc-850/30 mb-5">
                  <div className="flex items-center gap-2.5 text-xs text-gray-650 dark:text-zinc-400">
                    <Mail className="w-4 h-4 text-gray-400 shrink-0" />
                    <span className="truncate select-all text-xs">Acesso rápido por Chat local</span>
                  </div>
                  <p className="text-[10px] text-gray-400 dark:text-zinc-500 leading-normal">
                    Este membro colabora de forma ativa no quadro visual, notas de projetos e discussões deste grupo.
                  </p>
                </div>

                {/* Direct Action buttons */}
                {selectedProfileMember.userId !== currentUser?.id ? (
                  <button
                    id="profile-dm-btn"
                    onClick={() => {
                      setSelectedDmUserId(selectedProfileMember.userId);
                      setActiveModule("chat");
                      setSelectedProfileMember(null);
                    }}
                    className="w-full py-2.5 bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer"
                  >
                    <Mail className="w-4 h-4" />
                    <span>Mandar Mensagem Direta (DM)</span>
                  </button>
                ) : (
                  <p className="text-[10px] text-gray-400 italic">Visualização do seu perfil público.</p>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
