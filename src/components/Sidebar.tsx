/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { useApp } from "../context/AppContext";
import {
  User,
  LogOut,
  FolderLock,
  Users2,
  Plus,
  Compass,
  Copy,
  Check,
  Mail,
  ChevronRight,
  ChevronLeft,
  FolderPlus,
  Trash2,
  Lock,
  ChevronDown,
  Moon,
  Sun,
  ShieldCheck,
  Settings,
  X,
  MessageSquare,
  Users,
  Hash
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Group, Subgroup } from "../types";

interface SidebarProps {
  onOpenProfile: (tab?: "profile" | "friends") => void;
  isMobile?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ onOpenProfile, isMobile, onCloseMobile }) => {
  const {
    currentUser,
    groups,
    subgroups,
    activeTab,
    selectedGroup,
    selectedSubgroup,
    setActiveTab,
    setSelectedGroup,
    setSelectedSubgroup,
    createGroup,
    joinGroup,
    leaveGroup,
    createSubgroup,
    deleteSubgroup,
    toggleSubgroupMembership,
    signOut,
    theme,
    toggleTheme,
    friends,
    latestDmMessages,
    selectedDmUserId,
    activeModule,
    setActiveModule,
    setChatMobileView,
    setSelectedDmUserId,
    isSidebarCollapsed,
    setIsSidebarCollapsed,
  } = useApp();

  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupDesc, setNewGroupDesc] = useState("");

  const [showJoinGroupModal, setShowJoinGroupModal] = useState(false);
  const [joinCode, setJoinCode] = useState("");

  const [creatingSubgroupForGroup, setCreatingSubgroupForGroup] = useState<Group | "personal" | null>(null);
  const [newSubName, setNewSubName] = useState("");
  const [newSubDesc, setNewSubDesc] = useState("");
  const [newSubColor, setNewSubColor] = useState("#3b82f6");
  const [newSubIsPrivate, setNewSubIsPrivate] = useState(false);

  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [showInviteModal, setShowInviteModal] = useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState(false);

  const [expandedGroupIds, setExpandedGroupIds] = useState<{ [id: string]: boolean }>({});

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleCreateGroupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;
    try {
      await createGroup(newGroupName, newGroupDesc);
      setNewGroupName("");
      setNewGroupDesc("");
      setShowCreateGroupModal(false);
    } catch (err) {
      alert("Erro ao criar grupo.");
    }
  };

  const handleJoinGroupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim()) return;
    try {
      await joinGroup(joinCode);
      setJoinCode("");
      setShowJoinGroupModal(false);
    } catch (err: any) {
      alert(err.message || "Código inválido.");
    }
  };

  const handleCreateSubSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubName.trim()) return;
    try {
      await createSubgroup(newSubName, newSubDesc, newSubColor, newSubIsPrivate);
      setNewSubName("");
      setNewSubDesc("");
      setNewSubIsPrivate(false);
      setCreatingSubgroupForGroup(null);
    } catch (err) {
      alert("Erro ao criar subgrupo.");
    }
  };

  const handleSendEmailInvite = (e: React.FormEvent, group: Group) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setInviteSuccess(true);
    setTimeout(() => {
      setInviteSuccess(false);
      setInviteEmail("");
      setShowInviteModal(null);
    }, 2500);
  };  const toggleGroupExpand = (gId: string) => {
    setExpandedGroupIds((prev) => ({
      ...prev,
      [gId]: !prev[gId],
    }));
  };

  const handleManageFriends = () => {
    onOpenProfile("friends");
    if (isMobile && onCloseMobile) onCloseMobile();
  };

  const handleAccessChats = () => {
    setActiveTab("groups");
    setChatMobileView("list");
    setSelectedDmUserId(null);
    if (selectedGroup) {
      setActiveModule("chat");
    } else if (groups.length > 0) {
      setSelectedGroup(groups[0]);
      setActiveModule("chat");
    } else {
      setActiveModule("chat");
    }
    if (isMobile && onCloseMobile) onCloseMobile();
  };

  const sortedFriends = [...friends].sort((a, b) => {
    const lastA = latestDmMessages[a.id];
    const lastB = latestDmMessages[b.id];
    if (!lastA && !lastB) return 0;
    if (!lastA) return 1;
    if (!lastB) return -1;
    return new Date(lastB.timestamp).getTime() - new Date(lastA.timestamp).getTime();
  });

  return (
    <aside className="w-full h-full overflow-y-auto bg-white dark:bg-zinc-900 flex flex-col font-sans select-none select-secondary">
      {/* Brand logo header */}
      <div className="p-4 pb-2 border-b border-gray-100 dark:border-zinc-855 bg-gray-50/20 dark:bg-zinc-950/20 flex items-center justify-between">
        <div className="flex items-center gap-2 select-none">
          <img src="/logo.svg" alt="worksync Logo" className="w-6 h-6 object-contain" />
          <h1 className="text-xl font-extrabold bg-gradient-to-r from-indigo-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent tracking-tight">
            worksync
          </h1>
        </div>
        {isMobile ? (
          <button
            onClick={onCloseMobile}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-655 dark:hover:text-zinc-200 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-all cursor-pointer"
            title="Fechar menu"
          >
            <X className="w-5 h-5" />
          </button>
        ) : (
          <button
            onClick={() => setIsSidebarCollapsed(true)}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-655 dark:hover:text-zinc-200 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-all cursor-pointer flex items-center justify-center"
            title="Recolher menu"
          >
            <ChevronLeft className="w-4.5 h-4.5" />
          </button>
        )}
      </div>

      {/* Profiler Header section */}
      {currentUser && (
        <div className="p-4 border-b border-gray-100 dark:border-zinc-855 flex items-center justify-between gap-3 bg-gray-50/50 dark:bg-zinc-900/30">
          <div className="flex items-center gap-3 overflow-hidden">
            <button
              id="sidebar-profile-avatar-btn"
              onClick={() => {
                onOpenProfile();
                if (isMobile && onCloseMobile) onCloseMobile();
              }}
              className="w-10 h-10 rounded-full border border-gray-200 dark:border-zinc-755 bg-zinc-100 dark:bg-zinc-800 overflow-hidden relative shrink-0 group cursor-pointer"
            >
              <img
                src={currentUser.photoUrl}
                alt={currentUser.name}
                className="w-full h-full object-cover group-hover:scale-105 transition-all duration-250"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center text-white">
                <Settings className="w-4 h-4" />
              </div>
            </button>
            <div className="overflow-hidden">
              <h2 className="text-sm font-semibold text-gray-800 dark:text-zinc-100 truncate">
                {currentUser.name}
              </h2>
              <div className="flex flex-col gap-0.5">
                {currentUser.role && (
                  <p className="text-xs text-gray-500 dark:text-zinc-400 truncate">
                    {currentUser.role}
                  </p>
                )}
                {currentUser.friendCode && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCopyCode(currentUser.friendCode!);
                    }}
                    className="text-[10px] text-gray-450 dark:text-zinc-555 hover:text-sky-505 dark:hover:text-sky-400 flex items-center gap-1 transition-all text-left w-full outline-none focus:outline-none cursor-pointer"
                    title="Clique para copiar seu código de amigo"
                  >
                    <span>Cód: <strong>{currentUser.friendCode}</strong></span>
                    {copiedCode === currentUser.friendCode ? (
                      <Check className="w-3 h-3 text-emerald-500" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              id="theme-toggler-btn"
              onClick={toggleTheme}
              className="p-1.5 rounded-lg text-gray-400 dark:text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800/80 transition-all cursor-pointer"
              title="Trocar Tema"
            >
              {theme === "light" ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            </button>
            <button
              id="logout-btn"
              onClick={signOut}
              className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all cursor-pointer"
              title="Sair"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Main Mode Toggles */}
      <div className="p-3 border-b border-gray-100 dark:border-zinc-850 select-none">
        <div className="p-1 bg-gray-100 dark:bg-zinc-950/60 rounded-xl grid grid-cols-2 gap-1 border border-zinc-200/50 dark:border-zinc-800/80 relative">
          <button
            id="toggle-personal-tab"
            onClick={() => {
              setActiveTab("personal");
              if (isMobile && onCloseMobile) onCloseMobile();
            }}
            className={`py-1.5 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all duration-200 cursor-pointer ${
              activeTab === "personal"
                ? "bg-white dark:bg-zinc-800 text-sky-600 dark:text-sky-400 shadow-sm font-bold animate-fade-in"
                : "text-gray-500 hover:text-gray-900 dark:text-zinc-450 dark:hover:text-zinc-200"
            }`}
          >
            <FolderLock className="w-3.5 h-3.5" />
            <span>Pessoal</span>
          </button>
          <button
            id="toggle-groups-tab"
            onClick={() => {
              setActiveTab("groups");
            }}
            className={`py-1.5 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all duration-200 cursor-pointer ${
              activeTab === "groups"
                ? "bg-white dark:bg-zinc-800 text-sky-600 dark:text-sky-400 shadow-sm font-bold animate-fade-in"
                : "text-gray-500 hover:text-gray-900 dark:text-zinc-450 dark:hover:text-zinc-200"
            }`}
          >
            <Users2 className="w-3.5 h-3.5" />
            <span>Workspace</span>
          </button>
        </div>
      </div>

      {/* Fixed Sidebar Shortcuts */}
      <div className="px-3 py-2 border-b border-gray-100 dark:border-zinc-850 space-y-2 select-none">
        <button
          onClick={handleManageFriends}
          className="w-full px-3 py-2 text-xs font-semibold rounded-xl flex items-center justify-between transition-all duration-200 cursor-pointer bg-zinc-50 dark:bg-zinc-900 border border-gray-200/50 dark:border-zinc-800/80 hover:border-sky-505 dark:hover:border-sky-505 hover:bg-sky-50/20 dark:hover:bg-sky-955/20 text-gray-700 dark:text-zinc-300 hover:text-sky-655 dark:hover:text-sky-400 group"
        >
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-sky-500 shrink-0 group-hover:scale-110 transition-transform" />
            <span>Gerenciar Amigos</span>
          </div>
          <ChevronRight className="w-3.5 h-3.5 opacity-65 group-hover:translate-x-0.5 transition-transform" />
        </button>
      </div>

      {/* Chats Pessoais (DMs) Section in Sidebar */}
      <div className="px-3 py-2 border-b border-gray-100 dark:border-zinc-850 space-y-1 select-none">
        <span className="px-3 text-[10px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-widest block mb-2 flex items-center gap-1.5">
          <MessageSquare className="w-3.5 h-3.5 text-indigo-500" />
          <span>Chats Pessoais (DMs)</span>
        </span>
        <div className="space-y-1 max-h-52 overflow-y-auto pr-1 scrollbar-thin">
          {sortedFriends.map((friend) => {
            const isSelected = selectedDmUserId === friend.id && activeModule === "chat";
            const lastMsg = latestDmMessages[friend.id];
            
            return (
              <div
                key={friend.id}
                onClick={() => {
                  setSelectedDmUserId(friend.id);
                  setActiveModule("chat");
                  setChatMobileView("chat");
                  if (isMobile && onCloseMobile) onCloseMobile();
                }}
                className={`w-full text-left px-3 py-2 rounded-xl transition-all text-xs flex items-center justify-between border cursor-pointer group/chat-row ${
                  isSelected
                    ? "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-semibold border-indigo-500/20"
                    : "text-gray-650 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800/80 border-transparent"
                }`}
              >
                <div className="flex items-center gap-2.5 truncate flex-1 min-w-0">
                  <img
                    src={friend.photoUrl}
                    alt=""
                    referrerPolicy="no-referrer"
                    className="w-6.5 h-6.5 rounded-full object-cover shrink-0 border border-black/5 dark:border-white/5"
                  />
                  <div className="truncate flex-1 min-w-0">
                    <p className="font-bold truncate">{friend.name}</p>
                    <p className="text-[10px] text-gray-400 dark:text-zinc-500 truncate mt-0.5">
                      {lastMsg ? lastMsg.text : "Nenhuma mensagem"}
                    </p>
                  </div>
                </div>
                
                {/* Chat button with icon */}
                <button
                  type="button"
                  className={`p-1 rounded-lg shrink-0 transition-all ${
                    isSelected
                      ? "text-indigo-600 dark:text-indigo-400"
                      : "text-gray-400 hover:text-indigo-500 hover:bg-gray-250 dark:hover:bg-zinc-700/50"
                  }`}
                  title={`Conversar com ${friend.name}`}
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
          
          {friends.length === 0 && (
            <div className="p-3 text-center text-gray-450 dark:text-zinc-550 border border-dashed border-gray-200 dark:border-zinc-800 rounded-xl">
              <p className="text-[10px] font-medium">Nenhum amigo adicionado.</p>
              <button
                type="button"
                onClick={handleManageFriends}
                className="text-[10px] text-sky-500 dark:text-sky-400 font-bold underline mt-0.5 cursor-pointer block mx-auto hover:text-sky-600"
              >
                Gerenciar Amigos
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Workspace Listings */}
      <div className="flex-1 p-3 space-y-4">
        {activeTab === "personal" ? (
          <div className="space-y-4">
            {/* Header with actions */}
            <div className="flex items-center justify-between px-1">
              <span className="text-[10px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-widest">
                Seus Elementos Pessoais
              </span>
              <button
                id="action-create-personal-sub"
                onClick={() => {
                  setCreatingSubgroupForGroup("personal");
                }}
                className="p-1 bg-sky-500/10 hover:bg-sky-500/20 dark:bg-sky-500/20 dark:hover:bg-sky-500/30 text-sky-600 dark:text-sky-400 rounded-md transition-all text-xs flex items-center gap-0.5 cursor-pointer"
                title="Novo Subgrupo Pessoal"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Subgrupo</span>
              </button>
            </div>

            {/* In-Line Info Card */}
            <div className="p-3 bg-zinc-50 dark:bg-zinc-800/20 rounded-xl border border-gray-150 dark:border-zinc-800 text-[11px] text-gray-500 dark:text-zinc-400">
              <span className="font-bold text-gray-700 dark:text-zinc-300 block mb-1">Módulo Individual Ativo</span>
              Organize suas checklists, poste suas ideias no quadro e salve insights nos blocos de notas.
            </div>

            {/* List of Personal Subgroups */}
            <div className="space-y-1">
              <span className="px-1 text-[9px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-widest block mb-2">
                Subgrupos Pessoais
              </span>

              {/* Main area item (root) */}
              <div
                id="personal-sub-main-item"
                className={`flex items-center justify-between px-2 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  !selectedSubgroup
                    ? "bg-sky-500/10 text-sky-600 dark:text-sky-300 font-semibold animate-fade-in"
                    : "text-gray-600 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-850"
                }`}
                onClick={() => {
                  setSelectedSubgroup(null);
                  if (isMobile && onCloseMobile) onCloseMobile();
                }}
              >
                <div className="flex items-center gap-1.5 truncate">
                  <Hash className="w-3.5 h-3.5 shrink-0 text-sky-500" />
                  <span className="truncate">Área Principal (Sem subgrupo)</span>
                </div>
              </div>

              {/* Dynamic personal subgroups */}
              {subgroups
                .filter((sub) => sub.groupId === "personal")
                .map((sub) => {
                  const isCurSub = selectedSubgroup?.id === sub.id;
                  return (
                    <div
                      id={`personal-sub-item-${sub.id}`}
                      key={sub.id}
                      className={`group flex items-center justify-between px-2 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                        isCurSub
                          ? "bg-sky-500/10 text-sky-600 dark:text-sky-300 font-semibold animate-fade-in"
                          : "text-gray-600 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-850"
                      }`}
                      onClick={() => {
                        setSelectedSubgroup(sub);
                        if (isMobile && onCloseMobile) onCloseMobile();
                      }}
                    >
                      <div className="flex-1 text-left flex items-center gap-1.5 truncate">
                        <Hash
                          className="w-3.5 h-3.5 shrink-0"
                          style={{ color: sub.color }}
                        />
                        <span className="truncate">{sub.name}</span>
                      </div>

                      {/* Excluir personal subgroup */}
                      <button
                        id={`delete-personal-sub-${sub.id}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (window.confirm(`Tem certeza que deseja remover o subgrupo "${sub.name}"?`)) {
                            deleteSubgroup(sub.id);
                          }
                        }}
                        className="opacity-0 group-hover:opacity-100 p-0.5 text-zinc-400 hover:text-red-500 hover:bg-zinc-150 dark:hover:bg-zinc-800 rounded transition-all cursor-pointer"
                        title="Apagar Subgrupo"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Header with actions */}
            <div className="flex items-center justify-between px-1">
              <span className="text-[10px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-widest">
                Grupos Colaborativos
              </span>
              <div className="flex items-center gap-1">
                <button
                  id="action-join-group"
                  onClick={() => setShowJoinGroupModal(true)}
                  className="p-1 text-sky-600 dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-500/10 rounded-md transition-all text-xs flex items-center gap-1 cursor-pointer font-semibold"
                  title="Entrar em um Grupo"
                >
                  <Compass className="w-3.5 h-3.5" />
                  <span>Entrar</span>
                </button>
                <button
                  id="action-create-group"
                  onClick={() => setShowCreateGroupModal(true)}
                  className="p-1 bg-sky-500/10 hover:bg-sky-500/20 dark:bg-sky-500/20 dark:hover:bg-sky-500/30 text-sky-600 dark:text-sky-400 rounded-md transition-all text-xs flex items-center gap-0.5 cursor-pointer font-semibold"
                  title="Novo Grupo"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Criar</span>
                </button>
              </div>
            </div>

            {/* Groups list */}
            {groups.length === 0 ? (
              <div className="text-center p-6 bg-gray-50 dark:bg-zinc-800/10 rounded-2xl border border-dashed border-gray-200 dark:border-zinc-800 animate-fade-in">
                <Users2 className="w-8 h-8 text-gray-300 dark:text-zinc-750 mx-auto mb-2" />
                <p className="text-xs text-gray-500 dark:text-zinc-400">
                  Nenhum grupo ativo. Crie ou entre em um grupo utilizando o painel acima!
                </p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {groups.map((group) => {
                  const isCurGroup = selectedGroup?.id === group.id;
                  const isExpanded = !!expandedGroupIds[group.id] || isCurGroup;
                  const groupSubs = subgroups.filter((sub) => {
                    if (sub.groupId !== group.id) return false;
                    if (sub.isPrivate) {
                      const isMember = sub.members?.includes(currentUser?.id || "");
                      const isCreator = sub.creatorId === currentUser?.id;
                      return isCreator || isMember;
                    }
                    return true;
                  });

                  return (
                    <div
                      id={`group-item-${group.id}`}
                      key={group.id}
                      className="space-y-0.5"
                    >
                      {/* Group Header Row */}
                      <div
                        className={`group flex items-center justify-between px-2 py-1.5 rounded-xl transition-all select-none cursor-pointer ${
                          isCurGroup
                            ? "bg-sky-500/10 text-sky-600 dark:text-sky-300 font-semibold border-l-2 border-sky-500"
                            : "text-gray-700 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-850"
                        }`}
                        onClick={() => {
                          setSelectedGroup(group);
                          setSelectedSubgroup(null);
                          if (!expandedGroupIds[group.id]) {
                            toggleGroupExpand(group.id);
                          }
                        }}
                      >
                        <div className="flex items-center gap-2 truncate flex-1 min-w-0">
                          {/* Chevron for expand */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleGroupExpand(group.id);
                            }}
                            className="p-0.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-all text-gray-400 dark:text-zinc-500 cursor-pointer animate-fade-in"
                          >
                            <ChevronRight
                              className={`w-3.5 h-3.5 transition-all duration-200 ${
                                isExpanded ? "rotate-90 text-sky-500" : ""
                              }`}
                            />
                          </button>

                          {/* Circular Avatar */}
                          <div className="w-6.5 h-6.5 rounded-lg overflow-hidden shrink-0 bg-gradient-to-br from-indigo-500 to-sky-500 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center text-white text-[10px] font-bold relative">
                            {group.backgroundImage ? (
                              <img
                                src={group.backgroundImage}
                                alt=""
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <span>{group.name.substring(0, 2).toUpperCase()}</span>
                            )}
                          </div>

                          {/* Group Name */}
                          <span className="truncate text-xs font-semibold">{group.name}</span>
                        </div>

                        {/* Actions Container - Only visible on hover or if selected */}
                        <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                          <button
                            id={`copy-code-${group.id}`}
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCopyCode(group.code);
                            }}
                            className="p-1 hover:bg-zinc-200 dark:hover:bg-zinc-800 text-gray-400 hover:text-gray-600 dark:hover:text-zinc-300 rounded-md transition-all cursor-pointer"
                            title="Copiar código de convite"
                          >
                            {copiedCode === group.code ? (
                              <Check className="w-3.5 h-3.5 text-emerald-500" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                          <button
                            id={`email-invite-${group.id}`}
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowInviteModal(group.id);
                            }}
                            className="p-1 hover:bg-zinc-200 dark:hover:bg-zinc-800 text-gray-400 hover:text-gray-655 dark:hover:text-zinc-300 rounded-md transition-all cursor-pointer"
                            title="Convidar via E-mail"
                          >
                            <Mail className="w-3.5 h-3.5" />
                          </button>
                          <button
                            id={`chat-group-${group.id}`}
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedGroup(group);
                              setSelectedSubgroup(null);
                              setSelectedDmUserId(null);
                              setActiveModule("chat");
                              setChatMobileView("chat");
                              if (isMobile && onCloseMobile) onCloseMobile();
                            }}
                            className="p-1 hover:bg-zinc-200 dark:hover:bg-zinc-800 text-gray-400 hover:text-sky-505 rounded-md transition-all cursor-pointer"
                            title="Abrir Mural"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Expandable subgroups and settings */}
                      {isExpanded && (
                        <div className="pl-6.5 pr-1 py-1 space-y-1 relative border-l border-zinc-150 dark:border-zinc-800/85 ml-5.5 mt-0.5">
                          {/* Subgroups header section */}
                          <div className="flex items-center justify-between px-1 cursor-default py-0.5">
                            <span className="text-[9px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-widest">
                              Canais
                            </span>
                            <button
                              id={`create-sub-btn-${group.id}`}
                              type="button"
                              onClick={() => {
                                setSelectedGroup(group);
                                setCreatingSubgroupForGroup(group);
                              }}
                              className="text-[10px] p-0.5 text-sky-505 hover:underline flex items-center gap-0.5 cursor-pointer font-bold transition-all"
                            >
                              <Plus className="w-2.5 h-2.5" />
                              <span>Novo</span>
                            </button>
                          </div>

                          {/* Subgroups Items list */}
                          <div className="space-y-0.5">
                            {groupSubs.length === 0 ? (
                              <p className="px-1 py-1 text-[10px] text-gray-450 dark:text-zinc-550 italic">
                                Sem canais ainda.
                              </p>
                            ) : (
                              groupSubs.map((sub) => {
                                const isCurSub = selectedSubgroup?.id === sub.id;
                                return (
                                  <div
                                    id={`sub-item-${sub.id}`}
                                    key={sub.id}
                                    className={`group flex items-center justify-between px-2 py-1 rounded-lg text-xs transition-all ${
                                      isCurSub
                                        ? "bg-sky-500/10 text-sky-600 dark:text-sky-300 font-semibold animate-fade-in"
                                        : "text-gray-650 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-850"
                                    }`}
                                  >
                                    <button
                                      id={`sub-btn-${sub.id}`}
                                      type="button"
                                      onClick={() => {
                                        setSelectedGroup(group);
                                        setSelectedSubgroup(sub);
                                        if (isMobile && onCloseMobile) onCloseMobile();
                                      }}
                                      className="flex-1 text-left flex items-center gap-1.5 truncate cursor-pointer"
                                    >
                                      <Hash
                                        className="w-3.5 h-3.5 shrink-0"
                                        style={{ color: sub.color }}
                                      />
                                      <span className="truncate">{sub.name}</span>
                                    </button>

                                    {/* Subgroup Privacy & Joining Controls */}
                                    <div className="flex items-center gap-1">
                                      {sub.isPrivate ? (
                                        <Lock className="w-3 h-3 text-amber-500 dark:text-amber-400 shrink-0" title="Subgrupo Privado" />
                                      ) : (
                                        sub.members?.includes(currentUser?.id || "") ? (
                                          currentUser?.id !== sub.creatorId && (
                                            <button
                                              id={`leave-sub-btn-${sub.id}`}
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                toggleSubgroupMembership(sub.id, currentUser.id);
                                                if (selectedSubgroup?.id === sub.id) {
                                                  setSelectedSubgroup(null);
                                                }
                                              }}
                                              className="text-[9px] text-zinc-450 dark:text-zinc-550 hover:text-red-500 hover:underline px-1 py-0.5 rounded shrink-0 cursor-pointer"
                                              title="Sair do subgrupo"
                                            >
                                              Sair
                                            </button>
                                          )
                                        ) : (
                                          <button
                                            id={`join-sub-btn-${sub.id}`}
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              toggleSubgroupMembership(sub.id, currentUser.id);
                                            }}
                                            className="text-[9px] bg-sky-500/10 hover:bg-sky-500 hover:text-white text-sky-600 dark:text-sky-400 px-1.5 py-0.5 rounded-md shrink-0 cursor-pointer font-bold transition-all"
                                            title="Entrar no subgrupo público"
                                          >
                                            Entrar
                                          </button>
                                        )
                                      )}

                                      {/* Subgroup managers delete */}
                                      {(sub.creatorId === currentUser?.id || group.creatorId === currentUser?.id) && (
                                        <button
                                          id={`delete-sub-${sub.id}`}
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            if (confirm("Tem certeza que deseja apagar o subgrupo?")) {
                                              deleteSubgroup(sub.id);
                                            }
                                          }}
                                          className="opacity-0 group-hover:opacity-100 p-0.5 rounded-md text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 shrink-0 cursor-pointer transition-opacity"
                                          title="Excluir Subgrupo"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                );
                              })
                            )}
                          </div>

                          {/* Action button leave group / admin status badge */}
                          <div className="pt-1.5 border-t border-zinc-100 dark:border-zinc-800/80 flex justify-between items-center px-1">
                            {currentUser?.id !== group.creatorId ? (
                              <button
                                id={`leave-group-${group.id}`}
                                onClick={() => {
                                  if (confirm("Deseja realmente sair deste grupo?")) {
                                    leaveGroup(group.id);
                                  }
                                }}
                                className="text-[9px] text-red-500 font-semibold hover:underline cursor-pointer"
                              >
                                Sair do Grupo
                              </button>
                            ) : (
                              <span className="text-[9px] text-amber-600 dark:text-amber-400 font-bold flex items-center gap-0.5 opacity-80">
                                <ShieldCheck className="w-3 h-3 inline animate-pulse" />
                                Criador
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* FOOTER DIALOGS & OVERLAY FOR MAIL INVITE */}
      <AnimatePresence>
        {showInviteModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-zinc-900 rounded-3xl p-6 w-full max-w-sm border border-gray-200 dark:border-zinc-800 max-h-[90dvh] overflow-y-auto scrollbar-thin"
            >
              <h3 className="text-sm font-bold text-gray-950 dark:text-gray-50 flex items-center gap-2 mb-2">
                <Mail className="w-4 h-4 text-sky-500" />
                <span>Convidar membro via e-mail</span>
              </h3>
              <p className="text-xs text-gray-500 dark:text-zinc-400 mb-4">
                Enviaremos um link de convite personalizado diretamente para o e-mail do destinatário.
              </p>

              {inviteSuccess ? (
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-emerald-600 dark:text-emerald-400 text-xs font-semibold text-center py-6">
                  <Check className="w-8 h-8 mx-auto mb-2 text-emerald-500 animate-bounce" />
                  E-mail enviado com sucesso! Convite gerado.
                </div>
              ) : (
                <form
                  onSubmit={(e) => {
                    const groupObj = groups.find((g) => g.id === showInviteModal);
                    if (groupObj) handleSendEmailInvite(e, groupObj);
                  }}
                  className="space-y-4"
                >
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">E-mail do destinatário</label>
                    <input
                      id="invite-email-input"
                      type="email"
                      placeholder="parceiro@empresa.com"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      className="w-full text-xs px-3 py-2 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg focus:ring-1 focus:ring-sky-500 focus:outline-none text-gray-900 dark:text-white"
                      required
                    />
                  </div>
                  <div className="flex gap-2 justify-end text-xs font-semibold">
                    <button
                      id="cancel-invite-modal"
                      type="button"
                      onClick={() => setShowInviteModal(null)}
                      className="px-3 py-2 text-gray-500 hover:text-gray-700"
                    >
                      Fechar
                    </button>
                    <button
                      id="submit-invite-modal"
                      type="submit"
                      className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-lg"
                    >
                      Enviar Convite
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* OVERLAY DIALOG: CREATE NEW GROUP */}
      <AnimatePresence>
        {showCreateGroupModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-zinc-900 rounded-3xl p-6 w-full max-w-sm border border-gray-200 dark:border-zinc-800 shadow-2xl relative max-h-[90dvh] overflow-y-auto scrollbar-thin text-xs"
            >
              <button
                id="close-create-group-btn"
                onClick={() => setShowCreateGroupModal(false)}
                className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <h3 className="text-sm font-bold text-gray-900 dark:text-zinc-50 mb-3 flex items-center gap-2">
                <Users2 className="w-5 h-5 text-sky-500" />
                <span>Criar Novo Grupo</span>
              </h3>

              <form onSubmit={handleCreateGroupSubmit} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 dark:text-zinc-505 uppercase mb-1">Nome do Grupo</label>
                  <input
                    id="new-group-name-modal"
                    type="text"
                    placeholder="Nome do grupo (ex: Empresa X, Faculdade)"
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-sky-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 dark:text-zinc-550 uppercase mb-1">Descrição</label>
                  <textarea
                    id="new-group-desc-modal"
                    placeholder="Descrição do grupo..."
                    value={newGroupDesc}
                    onChange={(e) => setNewGroupDesc(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg text-gray-900 dark:text-white focus:outline-none h-16 resize-none"
                  />
                </div>
                <div className="flex gap-2 justify-end font-semibold">
                  <button
                    id="cancel-create-group-modal"
                    type="button"
                    onClick={() => setShowCreateGroupModal(false)}
                    className="px-3 py-2 text-gray-500 hover:text-gray-700 cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    id="submit-create-group-modal"
                    type="submit"
                    className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-lg cursor-pointer"
                  >
                    Salvar Grupo
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* OVERLAY DIALOG: JOIN EXISTING GROUP */}
      <AnimatePresence>
        {showJoinGroupModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-zinc-900 rounded-3xl p-6 w-full max-w-sm border border-gray-200 dark:border-zinc-800 shadow-2xl relative max-h-[90dvh] overflow-y-auto scrollbar-thin text-xs"
            >
              <button
                id="close-join-group-btn"
                onClick={() => setShowJoinGroupModal(false)}
                className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <h3 className="text-sm font-bold text-gray-900 dark:text-zinc-50 mb-3 flex items-center gap-2">
                <Compass className="w-5 h-5 text-sky-500" />
                <span>Entrar em um Grupo</span>
              </h3>

              <form onSubmit={handleJoinGroupSubmit} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 dark:text-zinc-550 uppercase mb-1">Código do Grupo (6 dígitos)</label>
                  <input
                    id="join-code-modal"
                    type="text"
                    maxLength={6}
                    placeholder="EX: GF7Y4X"
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg text-gray-900 dark:text-white text-center text-sm font-bold uppercase tracking-widest focus:outline-none focus:ring-1 focus:ring-sky-500"
                    required
                  />
                </div>
                <div className="flex gap-2 justify-end font-semibold">
                  <button
                    id="cancel-join-group-modal"
                    type="button"
                    onClick={() => setShowJoinGroupModal(false)}
                    className="px-3 py-2 text-gray-500 hover:text-gray-700 cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    id="submit-join-group-modal"
                    type="submit"
                    className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-lg cursor-pointer"
                  >
                    Entrar no Grupo
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* OVERLAY DIALOG: CREATE SUBGROUP (UNIFIED) */}
      <AnimatePresence>
        {creatingSubgroupForGroup && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-zinc-900 rounded-3xl p-6 w-full max-w-sm border border-gray-200 dark:border-zinc-800 shadow-2xl relative max-h-[90dvh] overflow-y-auto scrollbar-thin text-xs"
            >
              <button
                id="close-create-sub-btn"
                onClick={() => setCreatingSubgroupForGroup(null)}
                className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <h3 className="text-sm font-bold text-gray-900 dark:text-zinc-50 mb-3 flex items-center gap-2">
                <Hash className="w-5 h-5 text-sky-500" />
                <span>
                  {creatingSubgroupForGroup === "personal"
                    ? "Novo Subgrupo Pessoal"
                    : `Novo Canal em ${creatingSubgroupForGroup.name}`}
                </span>
              </h3>

              <form onSubmit={handleCreateSubSubmit} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 dark:text-zinc-550 uppercase mb-1">Nome do Canal/Subgrupo</label>
                  <input
                    id="new-sub-name-modal"
                    type="text"
                    placeholder="ex: design, geral, back-end"
                    value={newSubName}
                    onChange={(e) => setNewSubName(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-sky-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 dark:text-zinc-550 uppercase mb-1">Descrição</label>
                  <textarea
                    id="new-sub-desc-modal"
                    placeholder="Descrição opcional..."
                    value={newSubDesc}
                    onChange={(e) => setNewSubDesc(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg text-gray-900 dark:text-white focus:outline-none h-14 resize-none"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 dark:text-zinc-550 uppercase mb-1">Cor Temática</label>
                    <div className="flex items-center gap-2 mt-1">
                      <input
                        id="new-sub-color-modal"
                        type="color"
                        value={newSubColor}
                        onChange={(e) => setNewSubColor(e.target.value)}
                        className="w-8 h-8 p-0 border-0 bg-transparent cursor-pointer rounded-full overflow-hidden shrink-0"
                      />
                      <span className="font-mono text-[10px] uppercase text-gray-500">{newSubColor}</span>
                    </div>
                  </div>

                  {creatingSubgroupForGroup !== "personal" && (
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 dark:text-zinc-550 uppercase mb-1">Acesso do Canal</label>
                      <select
                        id="new-sub-private-modal"
                        value={newSubIsPrivate ? "private" : "public"}
                        onChange={(e) => setNewSubIsPrivate(e.target.value === "private")}
                        className="w-full px-3 py-2 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg text-gray-900 dark:text-white focus:outline-none mt-1"
                      >
                        <option value="public">Público</option>
                        <option value="private">Privado 🔒</option>
                      </select>
                    </div>
                  )}
                </div>

                <div className="flex gap-2 justify-end font-semibold pt-1">
                  <button
                    id="cancel-create-sub-modal"
                    type="button"
                    onClick={() => setCreatingSubgroupForGroup(null)}
                    className="px-3 py-2 text-gray-500 hover:text-gray-700 cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    id="submit-create-sub-modal"
                    type="submit"
                    className="px-4 py-2 bg-sky-600 hover:bg-sky-505 text-white rounded-lg cursor-pointer"
                  >
                    Criar Canal
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </aside>
  );
};
