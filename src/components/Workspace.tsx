/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { useApp } from "../context/AppContext";
import { db, isDemoMode } from "../db/firebase";
import { collection, getDocs } from "firebase/firestore";
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
  Bell,
  Trash2,
  Plus,
  ChevronDown,
  ChevronUp,
  LogOut,
  Upload,
  Image,
  Settings,
  Download,
  Sparkles,
  Search,
  LayoutTemplate,
  BarChart3,
  Crown,
  Lightbulb
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import AiAssistantModal from "./AiAssistantModal";
import PlanAvatar from "./PlanAvatar";
import { isSuperAdmin } from "../config/admin";
import { TaskBoard } from "./TaskBoard";
import { WhiteboardCanvas } from "./WhiteboardCanvas";
import { NotebooksList } from "./NotebooksList";
import { CalendarView } from "./CalendarView";
import { GroupChatModule } from "./GroupChatModule";
import { GroupMember } from "../types";
import { useConfirm } from "../context/ConfirmContext";
import { useToast } from "../context/ToastContext";

interface WorkspaceProps {
  onOpenMobileSidebar: () => void;
  onOpenProfile: (tab: "profile" | "friends") => void;
}

const ModuleTab: React.FC<{
  active: boolean;
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
}> = ({ active, label, icon, onClick }) => (
  <button
    type="button"
    role="tab"
    aria-selected={active}
    aria-label={label}
    onClick={onClick}
    className={`px-3 py-2 text-xs font-semibold rounded-lg flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap outline-none focus-visible:ring-2 focus-visible:ring-sky-500 ${
      active
        ? "bg-white dark:bg-zinc-700 text-gray-900 dark:text-white shadow-sm"
        : "text-gray-500 hover:text-gray-800 dark:text-zinc-400 dark:hover:text-zinc-200"
    }`}
  >
    {icon}
    <span className="hidden sm:inline">{label}</span>
  </button>
);

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
    createGroup,
    joinGroup,
    leaveGroup,
    updateGroup,
    deleteGroup,
    deleteSubgroup,
    isGroupAdmin,
    setMemberRole,
    isSidebarCollapsed,
    setIsSidebarCollapsed,
    deferredPrompt,
    promptInstall,
    requestNotificationPermission,
  } = useApp();
  const confirm = useConfirm();
  const toast = useToast();
  const [showManagePermissions, setShowManagePermissions] = useState(false);
  const [showSubgroupMembers, setShowSubgroupMembers] = useState(false);
  const [subPermissions, setSubPermissions] = useState<{ [uId: string]: boolean }>({});
  const [isUpdatingPerm, setIsUpdatingPerm] = useState<string | null>(null);

  // Dashboard & group branding state variables
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [createGroupName, setCreateGroupName] = useState("");
  const [createGroupDesc, setCreateGroupDesc] = useState("");
  const [createGroupBg, setCreateGroupBg] = useState("");
  const [isCreatingGroupLoading, setIsCreatingGroupLoading] = useState(false);

  const [showJoinGroupModal, setShowJoinGroupModal] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [isJoiningGroupLoading, setIsJoiningGroupLoading] = useState(false);

  const [showManageGroupModal, setShowManageGroupModal] = useState(false);
  const [manageGroupObj, setManageGroupObj] = useState<any>(null);
  const [manageGroupName, setManageGroupName] = useState("");
  const [manageGroupDesc, setManageGroupDesc] = useState("");
  const [manageGroupBg, setManageGroupBg] = useState("");
  const [isManagingGroupLoading, setIsManagingGroupLoading] = useState(false);

  const [expandedGroupIds, setExpandedGroupIds] = useState<{ [id: string]: boolean }>({});
  const [loadedSubgroups, setLoadedSubgroups] = useState<{ [groupId: string]: any[] }>({});
  const [loadingSubgroups, setLoadingSubgroups] = useState<{ [groupId: string]: boolean }>({});

  // Members modal for group cards states
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [activeMembersGroupId, setActiveMembersGroupId] = useState<string | null>(null);
  const [loadedGroupMembers, setLoadedGroupMembers] = useState<{ [groupId: string]: GroupMember[] }>({});
  const [loadingGroupMembers, setLoadingGroupMembers] = useState<{ [groupId: string]: boolean }>({});

  const fetchMembersForGroup = async (groupId: string) => {
    if (loadingGroupMembers[groupId]) return;
    setLoadingGroupMembers((prev) => ({ ...prev, [groupId]: true }));
    try {
      if (isDemoMode) {
        const key = `demo_group_members_${groupId}`;
        const mems = JSON.parse(localStorage.getItem(key) || "[]") as GroupMember[];
        setLoadedGroupMembers((prev) => ({ ...prev, [groupId]: mems }));
      } else {
        const membersRef = collection(db, "groups", groupId, "members");
        const snap = await getDocs(membersRef);
        const arr: GroupMember[] = [];
        snap.forEach((doc) => arr.push({ ...doc.data(), userId: doc.id } as GroupMember));
        setLoadedGroupMembers((prev) => ({ ...prev, [groupId]: arr }));
      }
    } catch (e) {
      console.error("Error loading members for card", e);
    } finally {
      setLoadingGroupMembers((prev) => ({ ...prev, [groupId]: false }));
    }
  };

  const handleOpenMembersList = async (groupId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveMembersGroupId(groupId);
    setShowMembersModal(true);
    if (!loadedGroupMembers[groupId]) {
      await fetchMembersForGroup(groupId);
    }
  };

  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new window.Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          let width = img.width;
          let height = img.height;

          // Target dimensions: fit inside 1024x1024
          const MAX_DIM = 1024;
          if (width > MAX_DIM || height > MAX_DIM) {
            if (width > height) {
              height = Math.round((height * MAX_DIM) / width);
              width = MAX_DIM;
            } else {
              width = Math.round((width * MAX_DIM) / height);
              height = MAX_DIM;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
            resolve(dataUrl);
          } else {
            reject(new Error("Erro ao desenhar imagem no canvas."));
          }
        };
        img.onerror = () => reject(new Error("Formato de imagem inválido."));
        img.src = event.target?.result as string;
      };
      reader.onerror = () => reject(new Error("Erro ao ler o arquivo."));
      reader.readAsDataURL(file);
    });
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Validate size limit (max 5MB input file, we will compress to < 500KB)
    if (file.size > 5 * 1024 * 1024) {
      toast("Por favor, selecione um arquivo de imagem menor que 5MB.", "info");
      return;
    }

    try {
      const base64Compressed = await compressImage(file);
      setManageGroupBg(base64Compressed);
    } catch (err: any) {
      toast(err.message || "Erro ao processar a imagem.");
    }
  };

  const fetchSubgroupsForGroup = async (groupId: string) => {
    if (loadingSubgroups[groupId]) return;
    setLoadingSubgroups((prev) => ({ ...prev, [groupId]: true }));
    try {
      if (isDemoMode) {
        const key = `demo_group_subgroups_${groupId}`;
        const subs = JSON.parse(localStorage.getItem(key) || "[]");
        setLoadedSubgroups((prev) => ({ ...prev, [groupId]: subs }));
      } else {
        const subsRef = collection(db, "groups", groupId, "subgroups");
        const snap = await getDocs(subsRef);
        const arr: any[] = [];
        snap.forEach((doc) => arr.push({ ...doc.data(), id: doc.id }));
        setLoadedSubgroups((prev) => ({ ...prev, [groupId]: arr }));
      }
    } catch (e) {
      console.error("Error loading subgroups for card", e);
    } finally {
      setLoadingSubgroups((prev) => ({ ...prev, [groupId]: false }));
    }
  };

  const toggleGroupExpand = async (groupId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const isExpanded = !!expandedGroupIds[groupId];
    setExpandedGroupIds((prev) => ({ ...prev, [groupId]: !isExpanded }));
    
    // If we're expanding and haven't loaded yet, fetch them
    if (!isExpanded && !loadedSubgroups[groupId]) {
      await fetchSubgroupsForGroup(groupId);
    }
  };

  const handleDeleteSubgroup = async (groupId: string, subgroupId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!(await confirm({
      title: "Excluir subgrupo",
      message: "Todas as tarefas e arquivos dele serão perdidos permanentemente.",
      confirmLabel: "Excluir",
      tone: "danger",
    }))) return;
    try {
      await deleteSubgroup(subgroupId);
      setLoadedSubgroups((prev) => ({
        ...prev,
        [groupId]: (prev[groupId] || []).filter((s) => s.id !== subgroupId)
      }));
    } catch (err) {
      toast("Erro ao excluir subgrupo.");
    }
  };

  const handleDeleteGroup = async (groupId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!(await confirm({
      title: "Excluir grupo",
      message: "Esta ação é irreversível e excluirá todos os dados do grupo.",
      confirmLabel: "Excluir grupo",
      tone: "danger",
    }))) return;
    try {
      await deleteGroup(groupId);
    } catch (err) {
      toast("Erro ao excluir grupo.");
    }
  };

  const handleLeaveGroup = async (groupId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!(await confirm({
      title: "Sair do grupo",
      message: "Tem certeza de que deseja sair deste grupo?",
      confirmLabel: "Sair",
      tone: "danger",
    }))) return;
    try {
      await leaveGroup(groupId);
    } catch (err) {
      toast("Erro ao sair do grupo.");
    }
  };

  const handleOpenManageGroup = (group: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setManageGroupObj(group);
    setManageGroupName(group.name);
    setManageGroupDesc(group.description || "");
    setManageGroupBg(group.backgroundImage || "");
    setShowManageGroupModal(true);
  };

  const handleManageGroupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manageGroupName.trim() || !manageGroupObj) return;
    setIsManagingGroupLoading(true);
    try {
      await updateGroup(manageGroupObj.id, manageGroupName, manageGroupDesc, manageGroupBg);
      setShowManageGroupModal(false);
      setManageGroupObj(null);
    } catch (err) {
      toast("Erro ao atualizar o grupo.");
    } finally {
      setIsManagingGroupLoading(false);
    }
  };

  const handleCreateGroupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createGroupName.trim()) return;
    setIsCreatingGroupLoading(true);
    try {
      await createGroup(createGroupName, createGroupDesc, createGroupBg);
      setCreateGroupName("");
      setCreateGroupDesc("");
      setCreateGroupBg("");
      setShowCreateGroupModal(false);
    } catch (err) {
      toast("Erro ao criar o grupo.");
    } finally {
      setIsCreatingGroupLoading(false);
    }
  };

  const handleJoinGroupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim()) return;
    setIsJoiningGroupLoading(true);
    try {
      await joinGroup(joinCode);
      setJoinCode("");
      setShowJoinGroupModal(false);
    } catch (err: any) {
      toast(err.message || "Código inválido.");
    } finally {
      setIsJoiningGroupLoading(false);
    }
  };

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

  // Filter tasks: due today and not yet completed
  const activeDueTasks = tasks.filter(
    (t) => t.dueDate === todayStr && t.status !== "completed" && !dismissedTaskIds.includes(t.id)
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
      t.status !== "completed" &&
      (t.dueDate === todayStr || t.dueDate === tomorrowStr) &&
      !dismissedTaskIds.includes(t.id)
  );

  const totalGroupNotifications = visibleGroupAlerts.length + groupTasksAlerts.length;

  // States for user profile and chat DM
  const [selectedProfileMember, setSelectedProfileMember] = useState<GroupMember | null>(null);
  const [aiOpen, setAiOpen] = useState(false);

  // Permite abrir o Assistente IA a partir da paleta de comandos (Cmd+K)
  useEffect(() => {
    const onOpenAi = () => setAiOpen(true);
    window.addEventListener("open-ai-assistant", onOpenAi);
    return () => window.removeEventListener("open-ai-assistant", onOpenAi);
  }, []);

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

  // Force active module to chat if no subgroup is selected in group workspace mode
  useEffect(() => {
    if (!isPersonal && selectedGroup && !selectedSubgroup) {
      if (activeModule === "tasks" || activeModule === "whiteboard" || activeModule === "notes" || activeModule === "calendar") {
        setActiveModule("chat");
      }
    }
    // Inside a channel the group-level chat is not available, so leave the chat
    // module (its header tab is hidden there) and land on tasks — but NOT when a
    // direct-message thread is open, since DMs render through the chat module and
    // must stay reachable from anywhere (including while a channel is selected).
    if (!isPersonal && selectedSubgroup && activeModule === "chat" && !selectedDmUserId) {
      setActiveModule("tasks");
    }
  }, [isPersonal, selectedGroup, selectedSubgroup, activeModule, selectedDmUserId, setActiveModule]);

  const handleTogglePermission = async (targetUserId: string, currentVal: boolean) => {
    if (!selectedSubgroup) return;
    setIsUpdatingPerm(targetUserId);
    try {
      const nextVal = !currentVal;
      await grantSubgroupPermission(selectedSubgroup.id, targetUserId, nextVal);
      setSubPermissions((prev) => ({ ...prev, [targetUserId]: nextVal }));
    } catch (e) {
      toast("Erro ao aplicar permissão.");
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
      <div className="flex-1 min-h-screen flex flex-col bg-gray-50 dark:bg-zinc-950 p-4 sm:p-8 font-sans overflow-y-auto select-none">
        {/* Dashboard Header */}
        <div className="max-w-6xl mx-auto w-full flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
              <Users className="w-8 h-8 text-sky-500" />
              Painel de Grupos
            </h1>
            <p className="text-sm text-gray-500 dark:text-zinc-400 mt-1">
              Visualize, personalize e gerencie os workspaces colaborativos que você participa.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setShowCreateGroupModal(true)}
              className="py-2 px-4 bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-md hover:shadow-lg transition-all cursor-pointer font-semibold"
            >
              <Plus className="w-4 h-4" />
              Criar Grupo
            </button>
            <button
              onClick={() => setShowJoinGroupModal(true)}
              className="py-2 px-4 bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-zinc-850 dark:text-zinc-200 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer font-semibold"
            >
              <Users className="w-4 h-4" />
              Entrar em Grupo
            </button>
            <button
              onClick={() => setActiveTab("personal")}
              className="py-2 px-4 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-md hover:shadow-lg transition-all cursor-pointer font-semibold"
            >
              <CheckSquare className="w-4 h-4" />
              Área Pessoal
            </button>
            {(isSidebarCollapsed || window.innerWidth < 768) && (
              <button
                onClick={() => {
                  if (window.innerWidth < 768) {
                    onOpenMobileSidebar();
                  } else {
                    setIsSidebarCollapsed(false);
                  }
                }}
                className="py-2 px-4 bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer font-semibold"
              >
                <Menu className="w-4 h-4" />
                Menu
              </button>
            )}
          </div>
        </div>

        {/* Groups Grid */}
        <div className="max-w-6xl mx-auto w-full flex-1">
          {groups.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-16 px-4 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-3xl shadow-sm"
            >
              <div className="w-16 h-16 rounded-full bg-sky-500/10 text-sky-500 flex items-center justify-center mx-auto mb-4 border border-sky-500/20">
                <Users className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-zinc-100 mb-1">Você não participa de nenhum grupo</h3>
              <p className="text-sm text-gray-500 dark:text-zinc-400 max-w-sm mx-auto mb-6">
                Crie um novo grupo para colaborar com sua equipe ou insira um código de convite para participar de um existente.
              </p>
              <div className="flex justify-center gap-3">
                <button
                  onClick={() => setShowCreateGroupModal(true)}
                  className="py-2.5 px-5 bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer"
                >
                  Criar Primeiro Grupo
                </button>
                <button
                  onClick={() => setShowJoinGroupModal(true)}
                  className="py-2.5 px-5 bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-xs font-bold rounded-xl shadow-sm transition-all cursor-pointer"
                >
                  Inserir Código
                </button>
              </div>
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {groups.map((group) => {
                const isCreator = group.creatorId === currentUser?.id;
                const isExpanded = !!expandedGroupIds[group.id];
                const bgImage = group.backgroundImage;

                return (
                  <motion.div
                    key={group.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    whileHover={{ y: -4, transition: { duration: 0.2 } }}
                    onClick={() => {
                      setSelectedGroup(group);
                      setSelectedSubgroup(null);
                      setActiveModule("chat");
                    }}
                    style={{
                      backgroundImage: bgImage ? `url("${bgImage}")` : undefined,
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                    }}
                    className={`relative overflow-hidden rounded-2xl border border-gray-200 dark:border-zinc-800 shadow-md hover:shadow-xl cursor-pointer transition-all duration-300 flex flex-col justify-between min-h-[220px] ${
                      !bgImage ? "bg-gradient-to-br from-zinc-900/90 via-zinc-950/95 to-slate-900/90" : ""
                    }`}
                  >
                    {/* Background darkening overlay/scrim for legibility */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/60 to-black/45 z-0" />

                    {/* Card Content - Top area */}
                    <div className="relative z-10 p-5 flex flex-col justify-between h-full flex-1">
                      <div className="w-full">
                        <div className="flex items-start justify-between gap-2 w-full">
                          <span className="text-[10px] uppercase font-bold tracking-widest text-sky-400 bg-sky-950/60 px-2.5 py-1 rounded-full border border-sky-850/40 backdrop-blur-xs">
                            CÓD: {group.code}
                          </span>
                          <div className="flex items-center gap-1.5">
                            {isCreator ? (
                              <button
                                onClick={(e) => handleOpenManageGroup(group, e)}
                                title="Gerenciar grupo"
                                className="p-1.5 rounded-lg bg-zinc-900/60 hover:bg-zinc-800/80 text-gray-300 hover:text-white border border-zinc-700/30 transition-all cursor-pointer"
                              >
                                <Settings className="w-3.5 h-3.5" />
                              </button>
                            ) : null}
                          </div>
                        </div>

                        <h3 className="text-lg font-bold text-white mt-3 leading-snug drop-shadow-sm select-all">
                          {group.name}
                        </h3>
                        <p className="text-xs text-zinc-300 mt-1.5 line-clamp-2 leading-relaxed drop-shadow-xs">
                          {group.description || "Sem descrição definida para este grupo."}
                        </p>
                      </div>

                      {/* Card Actions / Subgroup expandable section */}
                      <div className="mt-5 relative z-10 w-full">
                        {/* Subgroups display list (Expanded) */}
                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: "auto" }}
                              exit={{ opacity: 0, height: 0 }}
                              onClick={(e) => e.stopPropagation()} // Prevent card navigation when interacting inside sub list
                              className="mb-4 pt-3 border-t border-zinc-800/60 flex flex-col gap-1.5 max-h-48 overflow-y-auto scrollbar-none"
                            >
                              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block mb-1">
                                Subgrupos
                              </span>
                              {loadingSubgroups[group.id] ? (
                                <span className="text-xs text-zinc-500 italic">Carregando subgrupos...</span>
                              ) : !loadedSubgroups[group.id] || loadedSubgroups[group.id].length === 0 ? (
                                <span className="text-xs text-zinc-500 italic">Nenhum subgrupo criado.</span>
                              ) : (
                                loadedSubgroups[group.id].map((sub) => {
                                  const canDeleteSub = isCreator || sub.creatorId === currentUser?.id;
                                  return (
                                    <div
                                      key={sub.id}
                                      onClick={() => {
                                        setSelectedGroup(group);
                                        setSelectedSubgroup(sub);
                                      }}
                                      className="flex items-center justify-between p-2 rounded-xl bg-zinc-900/60 hover:bg-zinc-800/80 border border-zinc-800/30 transition-all hover:scale-[1.01] cursor-pointer"
                                    >
                                      <div className="flex items-center gap-2 overflow-hidden">
                                        <span
                                          style={{ backgroundColor: sub.color || "#3b82f6" }}
                                          className="w-2.5 h-2.5 rounded-full shrink-0"
                                        />
                                        <span className="text-xs font-medium text-zinc-200 truncate">
                                          {sub.name}
                                        </span>
                                        {sub.isPrivate && <Lock className="w-3 h-3 text-zinc-400 shrink-0" />}
                                      </div>
                                      {canDeleteSub && (
                                        <button
                                          onClick={(e) => handleDeleteSubgroup(group.id, sub.id, e)}
                                          title="Excluir subgrupo"
                                          className="p-1 rounded-md text-zinc-400 hover:text-rose-450 hover:bg-rose-500/10 transition-all cursor-pointer"
                                        >
                                          <Trash2 className="w-3 h-3" />
                                        </button>
                                      )}
                                    </div>
                                  );
                                })
                              )}
                            </motion.div>
                          )}
                        </AnimatePresence>

                        {/* Bottom Actions Row */}
                        <div className="flex items-center justify-between gap-2 pt-3 border-t border-zinc-800/40">
                          <button
                            onClick={(e) => toggleGroupExpand(group.id, e)}
                            className="py-1.5 px-3 rounded-lg bg-zinc-900/50 hover:bg-zinc-800/80 text-zinc-300 hover:text-white border border-zinc-800/45 text-[11px] font-semibold transition-all flex items-center gap-1 cursor-pointer"
                          >
                            {isExpanded ? (
                              <>
                                <ChevronUp className="w-3.5 h-3.5" />
                                Recolher
                              </>
                            ) : (
                              <>
                                <ChevronDown className="w-3.5 h-3.5" />
                                Subgrupos
                              </>
                            )}
                          </button>

                          <button
                            onClick={(e) => handleOpenMembersList(group.id, e)}
                            className="py-1.5 px-3 rounded-lg bg-zinc-900/50 hover:bg-zinc-800/80 text-zinc-300 hover:text-white border border-zinc-800/45 text-[11px] font-semibold transition-all flex items-center gap-1 cursor-pointer"
                          >
                            <Users className="w-3.5 h-3.5" />
                            Membros
                          </button>

                          {isCreator ? (
                            <button
                              onClick={(e) => handleDeleteGroup(group.id, e)}
                              className="py-1.5 px-3 rounded-lg bg-rose-500/10 hover:bg-rose-500/25 text-rose-400 hover:text-rose-300 text-[11px] font-semibold transition-all flex items-center gap-1 cursor-pointer border border-rose-500/20"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              Excluir
                            </button>
                          ) : (
                            <button
                              onClick={(e) => handleLeaveGroup(group.id, e)}
                              className="py-1.5 px-3 rounded-lg bg-zinc-900/50 hover:bg-zinc-800/80 text-zinc-300 hover:text-rose-400 text-[11px] font-semibold transition-all flex items-center gap-1 cursor-pointer border border-zinc-800/40"
                            >
                              <LogOut className="w-3.5 h-3.5" />
                              Sair
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>

        {/* MODAL: CREATE GROUP */}
        <AnimatePresence>
          {showCreateGroupModal && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-[100] p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full max-w-md bg-white dark:bg-zinc-900 border border-gray-250 dark:border-zinc-850 rounded-2xl shadow-2xl overflow-hidden p-6 text-gray-900 dark:text-zinc-100"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold">Criar Novo Grupo</h3>
                  <button
                    onClick={() => setShowCreateGroupModal(false)}
                    className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-400 hover:text-gray-600 transition-all cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <form onSubmit={handleCreateGroupSubmit} className="flex flex-col gap-4">
                  <div>
                    <label className="text-xs font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider block mb-1">
                      Nome do Grupo
                    </label>
                    <input
                      type="text"
                      required
                      value={createGroupName}
                      onChange={(e) => setCreateGroupName(e.target.value)}
                      placeholder="Ex: Equipe de Engenharia"
                      className="w-full px-3 py-2 bg-gray-50 dark:bg-zinc-850 border border-gray-350 dark:border-zinc-700 rounded-xl focus:outline-none focus:border-sky-500 text-sm text-gray-900 dark:text-zinc-100"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider block mb-1">
                      Descrição
                    </label>
                    <textarea
                      value={createGroupDesc}
                      onChange={(e) => setCreateGroupDesc(e.target.value)}
                      placeholder="Ex: Desenvolvimento e sprint das novas features"
                      rows={3}
                      className="w-full px-3 py-2 bg-gray-50 dark:bg-zinc-850 border border-gray-350 dark:border-zinc-700 rounded-xl focus:outline-none focus:border-sky-500 text-sm resize-none text-gray-900 dark:text-zinc-100"
                    />
                  </div>

                  {/* Custom Background Image Branding */}
                  <div>
                    <label className="text-xs font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider block mb-1">
                      Imagem de Fundo Personalizada
                    </label>
                    
                    <div className="flex flex-col gap-3">
                      {createGroupBg ? (
                        <div className="relative h-28 rounded-xl overflow-hidden border border-zinc-700 shadow-inner flex items-center justify-center bg-zinc-950">
                          <img
                            src={createGroupBg}
                            alt="Background Preview"
                            className="w-full h-full object-cover opacity-70"
                          />
                          <button
                            type="button"
                            onClick={() => setCreateGroupBg("")}
                            className="absolute top-2 right-2 p-1.5 rounded-lg bg-zinc-900/80 hover:bg-rose-500/80 text-white transition-all cursor-pointer shadow-md"
                            title="Remover Imagem"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="h-28 rounded-xl border-2 border-dashed border-zinc-700 bg-gray-50 dark:bg-zinc-800/40 flex flex-col items-center justify-center text-center p-4">
                          <Image className="w-6 h-6 text-zinc-500 mb-1" />
                          <span className="text-xs font-medium text-zinc-400">Sem imagem de fundo</span>
                          <span className="text-[10px] text-zinc-500">Usará o gradiente premium padrão</span>
                        </div>
                      )}

                      <label className="w-full py-2.5 px-4 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-850 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 border border-zinc-200 dark:border-zinc-750 transition-all cursor-pointer">
                        <Upload className="w-3.5 h-3.5" />
                        <span>Carregar Imagem (Máx 5MB)</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            if (file.size > 5 * 1024 * 1024) {
                              toast("Por favor, selecione um arquivo de imagem menor que 5MB.", "info");
                              return;
                            }
                            try {
                              const base64 = await compressImage(file);
                              setCreateGroupBg(base64);
                            } catch (err: any) {
                              toast(err.message || "Erro ao processar a imagem.");
                            }
                          }}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 mt-2">
                    <button
                      type="button"
                      onClick={() => setShowCreateGroupModal(false)}
                      className="py-2 px-4 bg-zinc-150 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 text-xs font-bold rounded-xl transition-all cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={isCreatingGroupLoading}
                      className="py-2 px-4 bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
                    >
                      {isCreatingGroupLoading ? "Criando..." : "Criar"}
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* MODAL: JOIN GROUP */}
        <AnimatePresence>
          {showJoinGroupModal && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-[100] p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full max-w-sm bg-white dark:bg-zinc-900 border border-gray-255 dark:border-zinc-850 rounded-2xl shadow-2xl overflow-hidden p-6 text-gray-900 dark:text-zinc-100"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold">Entrar em um Grupo</h3>
                  <button
                    onClick={() => setShowJoinGroupModal(false)}
                    className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-400 hover:text-gray-600 transition-all cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <form onSubmit={handleJoinGroupSubmit} className="flex flex-col gap-4">
                  <div>
                    <label className="text-xs font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider block mb-1">
                      Código de Acesso (6 dígitos)
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={6}
                      value={joinCode}
                      onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                      placeholder="Ex: AB3D9E"
                      className="w-full px-3 py-2 bg-gray-50 dark:bg-zinc-850 border border-gray-350 dark:border-zinc-700 rounded-xl focus:outline-none focus:border-sky-500 text-sm text-center font-mono font-bold tracking-widest text-gray-900 dark:text-zinc-100"
                    />
                  </div>
                  <div className="flex justify-end gap-2 mt-2">
                    <button
                      type="button"
                      onClick={() => setShowJoinGroupModal(false)}
                      className="py-2 px-4 bg-zinc-150 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 text-xs font-bold rounded-xl transition-all cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={isJoiningGroupLoading}
                      className="py-2 px-4 bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-sm font-semibold"
                    >
                      {isJoiningGroupLoading ? "Acessando..." : "Entrar"}
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* MODAL: MANAGE GROUP SETTINGS / BRANDING */}
        <AnimatePresence>
          {showManageGroupModal && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-[100] p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full max-w-md bg-white dark:bg-zinc-900 border border-gray-255 dark:border-zinc-850 rounded-2xl shadow-2xl overflow-hidden p-6 text-gray-900 dark:text-zinc-100"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold">Personalizar Grupo</h3>
                  <button
                    onClick={() => {
                      setShowManageGroupModal(false);
                      setManageGroupObj(null);
                    }}
                    className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-400 hover:text-gray-600 transition-all cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <form onSubmit={handleManageGroupSubmit} className="flex flex-col gap-4">
                  <div>
                    <label className="text-xs font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider block mb-1">
                      Nome do Grupo
                    </label>
                    <input
                      type="text"
                      required
                      value={manageGroupName}
                      onChange={(e) => setManageGroupName(e.target.value)}
                      placeholder="Ex: Equipe de Engenharia"
                      className="w-full px-3 py-2 bg-gray-50 dark:bg-zinc-850 border border-gray-350 dark:border-zinc-700 rounded-xl focus:outline-none focus:border-sky-500 text-sm text-gray-900 dark:text-zinc-100"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider block mb-1">
                      Descrição
                    </label>
                    <textarea
                      value={manageGroupDesc}
                      onChange={(e) => setManageGroupDesc(e.target.value)}
                      placeholder="Ex: Desenvolvimento e sprint das novas features"
                      rows={2}
                      className="w-full px-3 py-2 bg-gray-50 dark:bg-zinc-850 border border-gray-350 dark:border-zinc-700 rounded-xl focus:outline-none focus:border-sky-500 text-sm resize-none text-gray-900 dark:text-zinc-100"
                    />
                  </div>

                  {/* Custom Background Image Branding */}
                  <div>
                    <label className="text-xs font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider block mb-1">
                      Imagem de Fundo Personalizada
                    </label>
                    
                    <div className="flex flex-col gap-3">
                      {manageGroupBg ? (
                        <div className="relative h-28 rounded-xl overflow-hidden border border-zinc-700 shadow-inner flex items-center justify-center bg-zinc-950">
                          <img
                            src={manageGroupBg}
                            alt="Background Preview"
                            className="w-full h-full object-cover opacity-70"
                          />
                          <button
                            type="button"
                            onClick={() => setManageGroupBg("")}
                            className="absolute top-2 right-2 p-1.5 rounded-lg bg-zinc-900/80 hover:bg-rose-500/80 text-white transition-all cursor-pointer shadow-md"
                            title="Remover Imagem"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="h-28 rounded-xl border-2 border-dashed border-zinc-700 bg-gray-50 dark:bg-zinc-800/40 flex flex-col items-center justify-center text-center p-4">
                          <Image className="w-6 h-6 text-zinc-500 mb-1" />
                          <span className="text-xs font-medium text-zinc-400">Sem imagem de fundo</span>
                          <span className="text-[10px] text-zinc-500">Usará o gradiente premium padrão</span>
                        </div>
                      )}

                      <label className="w-full py-2.5 px-4 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-850 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 border border-zinc-200 dark:border-zinc-750 transition-all cursor-pointer">
                        <Upload className="w-3.5 h-3.5" />
                        <span>Carregar Imagem (Máx 5MB)</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageChange}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 mt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setShowManageGroupModal(false);
                        setManageGroupObj(null);
                      }}
                      className="py-2 px-4 bg-zinc-150 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 text-xs font-bold rounded-xl transition-all cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={isManagingGroupLoading}
                      className="py-2 px-4 bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-sm font-semibold"
                    >
                      {isManagingGroupLoading ? "Salvando..." : "Salvar Alterações"}
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* MODAL: VIEW GROUP MEMBERS */}
        <AnimatePresence>
          {showMembersModal && activeMembersGroupId && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-[100] p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full max-w-sm bg-white dark:bg-zinc-900 border border-gray-255 dark:border-zinc-850 rounded-2xl shadow-2xl overflow-hidden p-6 text-gray-900 dark:text-zinc-100 font-sans"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold flex items-center gap-2">
                    <Users className="w-5 h-5 text-sky-500" />
                    Membros do Grupo
                  </h3>
                  <button
                    onClick={() => {
                      setShowMembersModal(false);
                      setActiveMembersGroupId(null);
                    }}
                    className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-400 hover:text-gray-600 transition-all cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="mt-2 space-y-3 max-h-64 overflow-y-auto pr-1">
                  {loadingGroupMembers[activeMembersGroupId] ? (
                    <div className="py-8 text-center text-xs text-zinc-500 italic">Carregando membros...</div>
                  ) : !loadedGroupMembers[activeMembersGroupId] || loadedGroupMembers[activeMembersGroupId].length === 0 ? (
                    <div className="py-8 text-center text-xs text-zinc-500 italic">Nenhum membro encontrado.</div>
                  ) : (
                    loadedGroupMembers[activeMembersGroupId].map((m) => (
                      <div
                        key={m.userId}
                        className="flex items-center gap-3 p-2 rounded-xl bg-gray-50 dark:bg-zinc-850/40 border border-gray-150 dark:border-zinc-800/40 animate-fade-in"
                      >
                        <span className="shrink-0">
                          <PlanAvatar photoUrl={m.photoUrl} plan={m.plan} galaxy={isSuperAdmin(m.email)} size={36} showGem={false} />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-gray-900 dark:text-white truncate">{m.name}</p>
                          <p className="text-[10px] text-gray-400 truncate">{m.role || "Membro"}</p>
                        </div>
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full shrink-0 ${m.color.split(" ")[0] || ""} ${m.color.split(" ")[1] || ""}`}>
                          {m.role === "Criador" ? "Criador" : "Time"}
                        </span>
                      </div>
                    ))
                  )}
                </div>

                <div className="flex justify-end mt-4">
                  <button
                    onClick={() => {
                      setShowMembersModal(false);
                      setActiveMembersGroupId(null);
                    }}
                    className="py-2 px-4 bg-zinc-150 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 text-xs font-bold rounded-xl transition-all cursor-pointer font-semibold"
                  >
                    Fechar
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className="flex-1 h-[100dvh] flex flex-col bg-gray-50 dark:bg-zinc-950 overflow-hidden font-sans relative transition-colors duration-200">
      {/* HEADER BAR */}
      <header className="px-4 sm:px-6 py-3 sm:py-4 bg-white dark:bg-zinc-900 border-b border-gray-200 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-4 select-none shrink-0" id="workspace-header">
        <div className="flex items-center gap-2">
          {/* Sidebar Toggle Button for all screen sizes */}
          {(isSidebarCollapsed || window.innerWidth < 768) && (
            <button
              id="workspace-menu-toggle-btn"
              onClick={() => {
                if (window.innerWidth < 768) {
                  onOpenMobileSidebar();
                } else {
                  setIsSidebarCollapsed(false);
                }
              }}
              className="p-1.5 rounded-lg bg-gray-50 hover:bg-gray-100 dark:bg-zinc-800 dark:hover:bg-zinc-750 border border-gray-200 dark:border-zinc-750 text-gray-500 hover:text-gray-700 dark:text-zinc-400 dark:hover:text-zinc-200 cursor-pointer flex items-center justify-center mr-1"
              title="Expandir Menu"
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

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${isPersonal ? "bg-emerald-500" : "bg-sky-500"}`} />
              <h1 id="workspace-title" className="text-base font-bold text-gray-900 dark:text-zinc-50 tracking-tight truncate">
                {isPersonal
                  ? selectedSubgroup
                    ? selectedSubgroup.name
                    : "Área Pessoal"
                  : selectedSubgroup
                    ? selectedSubgroup.name
                    : selectedGroup?.name ?? "Grupo"}
              </h1>
            </div>
            <p className="text-xs text-gray-400 dark:text-zinc-500 mt-0.5 truncate">
              {isPersonal
                ? selectedSubgroup
                  ? "Subgrupo pessoal"
                  : "Organização pessoal de listas, ideias e notas"
                : selectedSubgroup
                  ? `Canal · ${selectedGroup?.name}`
                  : "Mural do grupo"}
            </p>
          </div>

          {/* Busca global / paleta de comandos (Cmd+K) */}
          <button
            id="workspace-command-btn"
            onClick={() => window.dispatchEvent(new Event("open-command-palette"))}
            className="ml-1 flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-lg bg-gray-50 hover:bg-gray-100 dark:bg-zinc-800 dark:hover:bg-zinc-750 border border-gray-200 dark:border-zinc-750 text-gray-500 hover:text-gray-700 dark:text-zinc-400 dark:hover:text-zinc-200 cursor-pointer"
            title="Buscar (Ctrl/Cmd + K)"
          >
            <Search className="w-4 h-4" />
            <kbd className="hidden lg:inline text-[10px] font-mono border border-gray-200 dark:border-zinc-700 rounded px-1 py-0.5">⌘K</kbd>
          </button>
        </div>

        {/* Module selector (icon + label, accessible tablist) */}
        <div
          role="tablist"
          aria-label="Módulos do workspace"
          className="flex flex-row flex-nowrap items-center gap-0.5 p-1 bg-gray-100 dark:bg-zinc-800/80 rounded-xl border border-gray-200/60 dark:border-zinc-800 overflow-x-auto max-w-full shrink-0 scrollbar-none"
        >
          {(isPersonal || selectedSubgroup) && (
            <>
              <ModuleTab
                active={activeModule === "tasks"}
                label="Tarefas"
                icon={<CheckSquare className="w-4 h-4" />}
                onClick={() => setActiveModule("tasks")}
              />
              <ModuleTab
                active={activeModule === "whiteboard"}
                label="Quadro"
                icon={<StickyNote className="w-4 h-4" />}
                onClick={() => setActiveModule("whiteboard")}
              />
              <ModuleTab
                active={activeModule === "notes"}
                label="Notas"
                icon={<BookOpen className="w-4 h-4" />}
                onClick={() => setActiveModule("notes")}
              />
              <ModuleTab
                active={activeModule === "calendar"}
                label="Calendário"
                icon={<Calendar className="w-4 h-4" />}
                onClick={() => setActiveModule("calendar")}
              />
            </>
          )}
          {!isPersonal && !selectedSubgroup && (
            <ModuleTab
              active={activeModule === "chat"}
              label="Chat"
              icon={<MessageSquare className="w-4 h-4" />}
              onClick={() => {
                setActiveModule("chat");
                setChatMobileView("list");
                setSelectedDmUserId(null);
              }}
            />
          )}
          {!isPersonal && (
            <ModuleTab
              active={activeModule === "audit"}
              label="Histórico"
              icon={<ShieldAlert className="w-4 h-4" />}
              onClick={() => setActiveModule("audit")}
            />
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
                      {typeof window !== "undefined" && "Notification" in window && Notification.permission !== "granted" && (
                        <div className="p-3 bg-sky-500/10 border-b border-sky-500/20 text-[10px] text-sky-600 dark:text-sky-455 flex flex-col gap-2 shrink-0">
                          <p className="font-semibold leading-normal">Ative as notificações do sistema para receber avisos sobre novas tarefas e mensagens!</p>
                          <button
                            onClick={async () => {
                              const granted = await requestNotificationPermission();
                              if (granted) {
                                toast("Notificações do sistema ativadas!", "success");
                              } else {
                                toast("Por favor, ative as notificações nas configurações do seu navegador.", "info");
                              }
                            }}
                            className="py-1 px-2.5 bg-sky-600 hover:bg-sky-505 text-white rounded-md font-bold self-start transition-all cursor-pointer shadow-sm hover:shadow"
                          >
                            Ativar Notificações
                          </button>
                        </div>
                      )}
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
                            Tarefas para hoje
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
                              Prazos do grupo
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
                    className="rounded-full cursor-pointer hover:scale-115 active:scale-90 transition-all outline-none focus:outline-none shrink-0"
                    title={`${m.name} (${m.role || "Membro"}) - Ver Perfil`}
                  >
                    <PlanAvatar photoUrl={m.photoUrl} plan={m.plan} galaxy={isSuperAdmin(m.email)} size={28} showGem={false} />
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
                  <span className="hidden sm:inline">Participantes</span>
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
        {/* Barra de ações dedicada (Assistente IA, Templates, Produtividade, Planos) */}
        {(isPersonal || selectedSubgroup) && activeModule !== "chat" && (
          <div id="workspace-quick-actions" className="shrink-0 mb-3 flex items-center gap-2 overflow-x-auto scrollbar-none">
            <button
              onClick={() => window.dispatchEvent(new Event("open-ai-assistant"))}
              className="shrink-0 flex items-center gap-1.5 pl-2.5 pr-3.5 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-violet-500 to-sky-500 shadow-sm hover:opacity-95 transition-opacity cursor-pointer"
              title="Organizar por voz com IA"
            >
              <Sparkles className="w-4 h-4" /> Assistente IA
            </button>
            <button
              onClick={() => window.dispatchEvent(new Event("open-templates"))}
              className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 text-gray-600 dark:text-zinc-300 hover:border-sky-400/50 hover:text-sky-600 dark:hover:text-sky-400 transition-colors cursor-pointer"
              title="Templates de quadro"
            >
              <LayoutTemplate className="w-4 h-4" /> Templates
            </button>
            <button
              onClick={() => window.dispatchEvent(new Event("open-dashboard"))}
              className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 text-gray-600 dark:text-zinc-300 hover:border-emerald-400/50 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors cursor-pointer"
              title="Dashboard de produtividade"
            >
              <BarChart3 className="w-4 h-4" /> Produtividade
            </button>
            <button
              onClick={() => window.dispatchEvent(new Event("open-plans"))}
              className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 text-gray-600 dark:text-zinc-300 hover:border-amber-400/50 hover:text-amber-600 dark:hover:text-amber-400 transition-colors cursor-pointer"
              title="Planos e assinatura"
            >
              <Crown className="w-4 h-4" /> Planos
            </button>
          </div>
        )}
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
          {!isPersonal && !selectedSubgroup && (activeModule === "tasks" || activeModule === "whiteboard" || activeModule === "notes" || activeModule === "calendar") ? (
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
              {activeModule === "calendar" && <CalendarView canEdit={canEditSubgroup} />}
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

      <AiAssistantModal open={aiOpen} onClose={() => setAiOpen(false)} />

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
                  <PlanAvatar
                    photoUrl={selectedProfileMember.photoUrl}
                    plan={selectedProfileMember.plan}
                    galaxy={isSuperAdmin(selectedProfileMember.email)}
                    size={84}
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
                <p className="text-xs text-gray-400 dark:text-zinc-500 font-medium mb-3 mt-0.5 text-center">
                  {selectedProfileMember.role || "Membro do Grupo"}
                </p>

                {!isPersonal && selectedGroup && (
                  <div className="flex justify-center mb-4">
                    {selectedGroup.creatorId === selectedProfileMember.userId ? (
                      <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center gap-1">
                        <Settings2 className="w-3 h-3" /> Criador
                      </span>
                    ) : isGroupAdmin(selectedProfileMember.userId) ? (
                      <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-violet-500/15 text-violet-600 dark:text-violet-400 flex items-center gap-1">
                        <Settings2 className="w-3 h-3" /> Admin
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-gray-150 dark:bg-zinc-800 text-gray-500 dark:text-zinc-400">
                        Membro
                      </span>
                    )}
                  </div>
                )}

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

                {/* Gestão de papel (somente o criador do grupo) */}
                {!isPersonal &&
                  selectedGroup &&
                  selectedGroup.creatorId === currentUser?.id &&
                  selectedProfileMember.userId !== selectedGroup.creatorId && (
                    <button
                      onClick={() => setMemberRole(selectedProfileMember.userId, isGroupAdmin(selectedProfileMember.userId) ? "member" : "admin")}
                      className="w-full mt-2 py-2.5 bg-violet-500/10 hover:bg-violet-500/20 text-violet-600 dark:text-violet-400 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                    >
                      <Settings2 className="w-4 h-4" />
                      {isGroupAdmin(selectedProfileMember.userId) ? "Rebaixar a membro" : "Promover a admin"}
                    </button>
                  )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      
      {/* PWA Mobile Install Banner */}
      <InstallPWABanner />
    </div>
  );
};

// PWA Mobile Install Banner component
const InstallPWABanner: React.FC = () => {
  const { deferredPrompt, promptInstall, requestNotificationPermission } = useApp();
  const [showBanner, setShowBanner] = useState(false);
  const [showiOSInstructions, setShowiOSInstructions] = useState(false);

  useEffect(() => {
    // Check if on mobile device (width < 768 or userAgent contains mobile/iphone/android)
    const isMobile = window.innerWidth < 768 || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    
    // Check if not already running in standalone PWA mode
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone;
    
    // Check if user dismissed the prompt previously
    const isDismissed = localStorage.getItem("dismiss_install_prompt_v1") === "true";

    if (isMobile && !isStandalone && !isDismissed) {
      setShowBanner(true);
    }
  }, []);

  const handleDismiss = () => {
    localStorage.setItem("dismiss_install_prompt_v1", "true");
    setShowBanner(false);
  };

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      // Chrome / Android native prompt
      await promptInstall();
      handleDismiss();
    } else {
      // iOS / other browsers - show instructions dialog
      setShowiOSInstructions(true);
    }
  };

  if (!showBanner) return null;

  return (
    <>
      <div className="fixed bottom-4 left-4 right-4 z-[999] p-4 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md border border-gray-200/50 dark:border-zinc-800/50 rounded-2xl shadow-xl flex items-center justify-between gap-3 animate-slide-up">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-500 to-cyan-500 flex items-center justify-center shrink-0 border border-white/20 shadow-md">
            <img src="/logo.svg" alt="worksync logo" className="w-6 h-6 object-contain" />
          </div>
          <div className="min-w-0">
            <h4 className="text-xs font-bold text-gray-900 dark:text-zinc-50 leading-tight">Instalar worksync</h4>
            <p className="text-[10px] text-gray-500 dark:text-zinc-400 mt-0.5 leading-normal">
              Baixe como app para acesso rápido e notificações nativas!
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleInstallClick}
            className="py-1.5 px-3 bg-sky-600 hover:bg-sky-500 text-white text-[11px] font-bold rounded-lg transition-all shadow-sm cursor-pointer"
          >
            Baixar
          </button>
          <button
            onClick={handleDismiss}
            className="p-1.5 rounded-lg hover:bg-gray-150 dark:hover:bg-zinc-800 text-gray-400 hover:text-gray-600 transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <AnimatePresence>
        {showiOSInstructions && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-[1000] p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-sm bg-white dark:bg-zinc-900 border border-gray-250 dark:border-zinc-850 rounded-2xl shadow-2xl p-5 text-gray-900 dark:text-zinc-100 font-sans"
            >
              <div className="flex justify-between items-start mb-3">
                <h3 className="text-sm font-extrabold flex items-center gap-2">
                  <Download className="w-4 h-4 text-sky-500" />
                  Instalar no iPhone/iPad
                </h3>
                <button
                  onClick={() => setShowiOSInstructions(false)}
                  className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-400 transition-all cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-xs text-gray-600 dark:text-zinc-355 leading-relaxed mb-4">
                Siga os passos abaixo para adicionar o <strong>worksync</strong> à sua tela de início:
              </p>
              <ol className="text-xs text-gray-700 dark:text-zinc-300 space-y-2.5 list-decimal pl-4 mb-4 leading-normal">
                <li>Abra esta página no navegador <strong>Safari</strong> do seu celular.</li>
                <li>Toque no botão de <strong>Compartilhar</strong> (ícone de um quadrado com uma seta para cima <span className="inline-block px-1 border rounded text-[10px]">↑</span> na barra inferior).</li>
                <li>Role para baixo e selecione <strong>Adicionar à Tela de Início</strong>.</li>
                <li>Toque em <strong>Adicionar</strong> no canto superior direito do Safari.</li>
              </ol>
              <div className="bg-sky-500/10 border border-sky-500/20 rounded-xl p-3 text-[10px] text-sky-600 dark:text-sky-400 leading-normal flex items-start gap-2 mb-4">
                <Lightbulb className="w-3.5 h-3.5 shrink-0 mt-px" />
                <span><strong>Atenção:</strong> No iOS, as notificações do sistema só funcionarão após adicionar o aplicativo à sua Tela de Início e abri-lo por lá!</span>
              </div>
              <div className="flex justify-end">
                <button
                  onClick={() => {
                    setShowiOSInstructions(false);
                    handleDismiss();
                  }}
                  className="py-2 px-4 bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer"
                >
                  Entendi
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
