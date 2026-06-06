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
  Users
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
  } = useApp();

  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupDesc, setNewGroupDesc] = useState("");

  const [isJoiningGroup, setIsJoiningGroup] = useState(false);
  const [joinCode, setJoinCode] = useState("");

  const [isCreatingSub, setIsCreatingSub] = useState(false);
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
      setIsCreatingGroup(false);
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
      setIsJoiningGroup(false);
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
      setIsCreatingSub(false);
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
          <img src="/logo.svg" alt="TaskSync.io Logo" className="w-6 h-6 object-contain" />
          <h1 className="text-xl font-extrabold bg-gradient-to-r from-indigo-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent tracking-tight">
            TaskSync.io
          </h1>
        </div>
        {isMobile && (
          <button
            onClick={onCloseMobile}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-655 dark:hover:text-zinc-200 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-all cursor-pointer"
            title="Fechar menu"
          >
            <X className="w-5 h-5" />
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
      <div className="p-3 grid grid-cols-2 gap-2 border-b border-gray-100 dark:border-zinc-850">
        <button
          id="toggle-personal-tab"
          onClick={() => {
            setActiveTab("personal");
            if (isMobile && onCloseMobile) onCloseMobile();
          }}
          className={`px-3 py-2 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            activeTab === "personal"
              ? "bg-sky-600 text-white shadow-sm"
              : "text-gray-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
          }`}
        >
          <FolderLock className="w-4 h-4" />
          <span>Área Pessoal</span>
        </button>
        <button
          id="toggle-groups-tab"
          onClick={() => setActiveTab("groups")}
          className={`px-3 py-2 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            activeTab === "groups"
              ? "bg-sky-600 text-white shadow-sm"
              : "text-gray-650 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
          }`}
        >
          <Users2 className="w-4 h-4" />
          <span>Workspace Grupos</span>
        </button>
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
                  setIsCreatingSub(true);
                }}
                className="p-1 bg-sky-500/10 hover:bg-sky-500/20 dark:bg-sky-500/20 dark:hover:bg-sky-500/30 text-sky-600 dark:text-sky-400 rounded-md transition-all text-xs flex items-center gap-0.5"
                title="Novo Subgrupo Pessoal"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Subgrupo</span>
              </button>
            </div>

            {/* In-Line Info Card */}
            <div className="p-4 bg-linear-to-r from-sky-500/10 to-indigo-500/10 rounded-2xl border border-sky-500/20 text-xs text-sky-700 dark:text-sky-300">
              <span className="font-semibold block mb-1">Módulo Individual Ativo</span>
              Organize suas checklists, poste suas ideias no quadro e salve insights nos blocos de notas.
            </div>

            {/* Subgroup Creation in-line panel */}
            {isCreatingSub && (
              <form
                onSubmit={handleCreateSubSubmit}
                className="p-2.5 bg-zinc-50 dark:bg-zinc-800/40 border border-gray-150 dark:border-zinc-800 rounded-xl space-y-2 text-[11px] overflow-hidden"
              >
                <span className="font-semibold text-gray-700 dark:text-zinc-355 block">Novo Subgrupo Pessoal</span>
                <input
                  id="new-personal-subgroup-name-input"
                  type="text"
                  placeholder="Nome do subgrupo"
                  value={newSubName}
                  onChange={(e) => setNewSubName(e.target.value)}
                  className="w-full px-2 py-1 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg text-gray-900 dark:text-white focus:outline-none"
                  required
                />
                <div className="flex items-center gap-2">
                  <span className="opacity-80">Selecionar Cor:</span>
                  <input
                    id="new-personal-subgroup-color-input"
                    type="color"
                    value={newSubColor}
                    onChange={(e) => setNewSubColor(e.target.value)}
                    className="w-12 h-6 border-0 bg-transparent cursor-pointer rounded-lg overflow-hidden"
                  />
                </div>
                <div className="flex gap-2 justify-end">
                  <button
                    id="cancel-create-personal-subgroup"
                    type="button"
                    onClick={() => setIsCreatingSub(false)}
                    className="text-gray-500"
                  >
                    Cancelar
                  </button>
                  <button
                    id="submit-create-personal-subgroup"
                    type="submit"
                    className="px-2 py-0.5 bg-sky-600 hover:bg-sky-500 text-white font-semibold rounded-lg"
                  >
                    Criar
                  </button>
                </div>
              </form>
            )}

            {/* List of Personal Subgroups */}
            <div className="space-y-1">
              <span className="px-1 text-[9px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-widest block mb-2">
                Subgrupos Pessoais
              </span>

              {/* Main area item (root) */}
              <div
                id="personal-sub-main-item"
                className={`flex items-center justify-between px-2 py-1.5 rounded-lg text-[11px] font-medium transition-all cursor-pointer ${
                  !selectedSubgroup
                    ? "bg-sky-500/10 text-sky-600 dark:text-sky-300 font-semibold border-l-2 border-sky-500"
                    : "text-gray-600 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-850"
                }`}
                onClick={() => {
                  setSelectedSubgroup(null);
                  if (isMobile && onCloseMobile) onCloseMobile();
                }}
              >
                <div className="flex items-center gap-1.5 truncate">
                  <span className="w-2.5 h-2.5 rounded-xs shrink-0 bg-sky-650" />
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
                      className={`group flex items-center justify-between px-2 py-1.5 rounded-lg text-[11px] font-medium transition-all cursor-pointer ${
                        isCurSub
                          ? "bg-sky-500/10 text-sky-600 dark:text-sky-300 font-semibold border-l-2 border-sky-500"
                          : "text-gray-600 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-850"
                      }`}
                      onClick={() => {
                        setSelectedSubgroup(sub);
                        if (isMobile && onCloseMobile) onCloseMobile();
                      }}
                    >
                      <div className="flex-1 text-left flex items-center gap-1.5 truncate">
                        <span
                          className="w-2.5 h-2.5 rounded-xs shrink-0 shadow-xs"
                          style={{ backgroundColor: sub.color }}
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
                  onClick={() => {
                    setIsJoiningGroup(true);
                    setIsCreatingGroup(false);
                  }}
                  className="p-1 text-sky-600 dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-500/10 rounded-md transition-all text-xs flex items-center gap-1"
                  title="Entrar em um Grupo"
                >
                  <Compass className="w-3.5 h-3.5" />
                  <span>Entrar</span>
                </button>
                <button
                  id="action-create-group"
                  onClick={() => {
                    setIsCreatingGroup(true);
                    setIsJoiningGroup(false);
                  }}
                  className="p-1 bg-sky-500/10 hover:bg-sky-500/20 dark:bg-sky-500/20 dark:hover:bg-sky-500/30 text-sky-600 dark:text-sky-400 rounded-md transition-all text-xs flex items-center gap-0.5"
                  title="Novo Grupo"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Criar</span>
                </button>
              </div>
            </div>

            {/* In-Line Form: Join Group */}
            <AnimatePresence>
              {isJoiningGroup && (
                <motion.form
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  onSubmit={handleJoinGroupSubmit}
                  className="p-3 bg-gray-50 dark:bg-zinc-800/40 border border-gray-200 dark:border-zinc-800 rounded-2xl space-y-2 text-xs overflow-hidden"
                >
                  <span className="font-semibold text-gray-700 dark:text-zinc-200 block">Entrar via código de 6 dígitos</span>
                  <input
                    id="join-code-input"
                    type="text"
                    maxLength={6}
                    placeholder="EX: GF7Y4X"
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                    className="w-full px-3 py-1.5 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-sky-500 uppercase tracking-widest text-center text-gray-900 dark:text-zinc-100 text-sm font-semibold"
                    required
                  />
                  <div className="flex gap-2 justify-end">
                    <button
                      id="cancel-join-group"
                      type="button"
                      onClick={() => setIsJoiningGroup(false)}
                      className="px-2 py-1 text-gray-500 hover:text-gray-700 dark:hover:text-zinc-300"
                    >
                      Cancelar
                    </button>
                    <button
                      id="submit-join-group"
                      type="submit"
                      className="px-3 py-1 bg-sky-600 hover:bg-sky-500 text-white font-semibold rounded-lg"
                    >
                      Entrar
                    </button>
                  </div>
                </motion.form>
              )}
            </AnimatePresence>

            {/* In-Line Form: Create Group */}
            <AnimatePresence>
              {isCreatingGroup && (
                <motion.form
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  onSubmit={handleCreateGroupSubmit}
                  className="p-3 bg-gray-50 dark:bg-zinc-800/40 border border-gray-200 dark:border-zinc-800 rounded-2xl space-y-2 text-xs overflow-hidden"
                >
                  <span className="font-semibold text-gray-700 dark:text-zinc-200 block">Criar Novo Grupo</span>
                  <input
                    id="new-group-name-input"
                    type="text"
                    placeholder="Nome do grupo (ex: Empresa X, Faculdade)"
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg focus:outline-none text-gray-900 dark:text-zinc-100"
                    required
                  />
                  <textarea
                    id="new-group-desc-input"
                    placeholder="Descrição do grupo..."
                    value={newGroupDesc}
                    onChange={(e) => setNewGroupDesc(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg focus:outline-none text-gray-900 dark:text-zinc-100 h-16 resize-none"
                  />
                  <div className="flex gap-2 justify-end">
                    <button
                      id="cancel-create-group"
                      type="button"
                      onClick={() => setIsCreatingGroup(false)}
                      className="px-2 py-1 text-gray-500 hover:text-gray-700 dark:hover:text-zinc-300"
                    >
                      Cancelar
                    </button>
                    <button
                      id="submit-create-group"
                      type="submit"
                      className="px-3 py-1 bg-sky-600 hover:bg-sky-500 text-white font-semibold rounded-lg"
                    >
                      Salvar
                    </button>
                  </div>
                </motion.form>
              )}
            </AnimatePresence>

            {/* Groups list */}
            {groups.length === 0 ? (
              <div className="text-center p-6 bg-gray-50 dark:bg-zinc-800/10 rounded-2xl border border-dashed border-gray-200 dark:border-zinc-800">
                <Users2 className="w-8 h-8 text-gray-300 dark:text-zinc-750 mx-auto mb-2" />
                <p className="text-xs text-gray-500 dark:text-zinc-400">
                  Nenhum grupo ativo. Crie ou entre em um grupo utilizando o painel acima!
                </p>
              </div>
            ) : (
              <div className="space-y-2">
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
                      className={`border rounded-2xl transition-all duration-200 overflow-hidden ${
                        isCurGroup
                          ? "border-sky-500/60 bg-sky-500/5 dark:bg-sky-500/5 shadow-xs"
                          : "border-gray-200 dark:border-zinc-800 bg-zinc-50/20 dark:bg-zinc-900/10 hover:border-sky-500/20"
                      }`}
                    >
                      {/* Group Header info */}
                      <div className="p-3 flex items-center justify-between gap-2">
                        <div
                          className="flex-1 cursor-pointer overflow-hidden"
                          onClick={() => {
                            setSelectedGroup(group);
                            setSelectedSubgroup(null);
                            if (!expandedGroupIds[group.id]) {
                              toggleGroupExpand(group.id);
                            }
                          }}
                        >
                          <h3 className="text-xs font-bold text-gray-900 dark:text-zinc-100 truncate flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-sky-500 shadow-xs" />
                            {group.name}
                          </h3>
                          <p className="text-[10px] text-gray-400 dark:text-zinc-500 truncate mt-0.5">
                            {group.description || "Sem descrição"}
                          </p>
                        </div>

                        {/* Expand actions */}
                        <div className="flex items-center gap-0.5 shrink-0">
                          <button
                            id={`copy-code-${group.id}`}
                            onClick={() => handleCopyCode(group.code)}
                            className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-gray-400 hover:text-gray-600 dark:hover:text-zinc-300 rounded-md transition-all"
                            title="Copiar código de convite de 6 dígitos"
                          >
                            {copiedCode === group.code ? (
                              <Check className="w-3 h-3 text-emerald-500" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                          <button
                            id={`email-invite-${group.id}`}
                            onClick={() => setShowInviteModal(group.id)}
                            className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-gray-400 hover:text-gray-650 dark:hover:text-zinc-300 rounded-md transition-all"
                            title="Convidar via E-mail"
                          >
                            <Mail className="w-3 h-3" />
                          </button>
                          <button
                            id={`chat-group-${group.id}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedGroup(group);
                              setSelectedSubgroup(null);
                              setSelectedDmUserId(null);
                              setActiveModule("chat");
                              setChatMobileView("chat");
                              if (isMobile && onCloseMobile) onCloseMobile();
                            }}
                            className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-gray-400 hover:text-sky-505 rounded-md transition-all"
                            title="Abrir Chat do Grupo"
                          >
                            <MessageSquare className="w-3 h-3" />
                          </button>
                          <button
                            id={`expand-toggle-${group.id}`}
                            onClick={() => toggleGroupExpand(group.id)}
                            className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md transition-all text-gray-400"
                          >
                            <ChevronDown
                              className={`w-3.5 h-3.5 transition-all duration-200 ${
                                isExpanded ? "rotate-180 text-sky-500" : ""
                              }`}
                            />
                          </button>
                        </div>
                      </div>

                      {/* Expandable subgroups and configuration details */}
                      {isExpanded && (
                        <div className="border-t border-gray-250 dark:border-zinc-800/80 p-2 bg-white/70 dark:bg-zinc-900/60 text-xs space-y-2">
                          {/* Share Info Box */}
                          <div className="px-2 py-1.5 bg-gray-50 dark:bg-zinc-800/30 rounded-xl flex items-center justify-between gap-2 text-[10px] text-gray-500">
                            <span>Código: <strong className="text-gray-700 dark:text-zinc-300 font-mono text-xs">{group.code}</strong></span>
                            <span className="opacity-70">Convide seu time</span>
                          </div>

                          {/* Subgroups header section */}
                          <div className="flex items-center justify-between px-1 cursor-default mt-1">
                            <span className="text-[9px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-widest">
                              Subgrupos / Projetos
                            </span>
                            <button
                              id={`create-sub-btn-${group.id}`}
                              onClick={() => {
                                setSelectedGroup(group);
                                setIsCreatingSub(true);
                              }}
                              className="text-[10px] p-0.5 text-sky-500 hover:underline flex items-center gap-0.5"
                            >
                              <Plus className="w-2.5 h-2.5" />
                              <span>Subgrupo</span>
                            </button>
                          </div>

                          {/* Subgroup Creation in-line panel */}
                          {isCreatingSub && selectedGroup?.id === group.id && (
                            <form
                              onSubmit={handleCreateSubSubmit}
                              className="p-2 bg-zinc-50 dark:bg-zinc-800/60 border border-gray-150 dark:border-zinc-800 rounded-xl space-y-2 text-[11px] overflow-hidden"
                            >
                              <span className="font-semibold text-gray-700 dark:text-zinc-300 block">Novo Subgrupo</span>
                              <input
                                id="new-subgroup-name-input"
                                type="text"
                                placeholder="Nome do subgrupo"
                                value={newSubName}
                                onChange={(e) => setNewSubName(e.target.value)}
                                className="w-full px-2 py-1 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg text-gray-900 dark:text-white focus:outline-none"
                                required
                              />
                              <div className="flex items-center gap-2">
                                <span className="opacity-80">Selecionar Cor:</span>
                                <input
                                  id="new-subgroup-color-input"
                                  type="color"
                                  value={newSubColor}
                                  onChange={(e) => setNewSubColor(e.target.value)}
                                  className="w-12 h-6 border-0 bg-transparent cursor-pointer rounded-lg overflow-hidden"
                                />
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="opacity-80">Acesso:</span>
                                <select
                                  id="new-subgroup-private-select"
                                  value={newSubIsPrivate ? "private" : "public"}
                                  onChange={(e) => setNewSubIsPrivate(e.target.value === "private")}
                                  className="px-2 py-0.5 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg text-gray-950 dark:text-zinc-50"
                                >
                                  <option value="public">Público</option>
                                  <option value="private">Privado 🔒</option>
                                </select>
                              </div>
                              <div className="flex gap-2 justify-end">
                                <button
                                  id="cancel-create-subgroup"
                                  type="button"
                                  onClick={() => setIsCreatingSub(false)}
                                  className="text-gray-500"
                                >
                                  Cancelar
                                </button>
                                <button
                                  id="submit-create-subgroup"
                                  type="submit"
                                  className="px-2 py-0.5 bg-sky-600 hover:bg-sky-500 text-white font-semibold rounded-lg"
                                >
                                  OK
                                </button>
                              </div>
                            </form>
                          )}

                          {/* Subgroups Items list */}
                          <div className="space-y-1">
                            {groupSubs.length === 0 ? (
                              <p className="px-2 py-2 text-[10px] text-gray-450 dark:text-zinc-500 italic">
                                Sem subgrupos ainda. Clique em "+ Subgrupo" para projetar.
                              </p>
                            ) : (
                              groupSubs.map((sub) => {
                                const isCurSub = selectedSubgroup?.id === sub.id;
                                return (
                                  <div
                                    id={`sub-item-${sub.id}`}
                                    key={sub.id}
                                    className={`group flex items-center justify-between px-2 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
                                      isCurSub
                                        ? "bg-sky-500/10 text-sky-600 dark:text-sky-300"
                                        : "text-gray-600 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800"
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
                                      className="flex-1 text-left flex items-center gap-1.5 truncate"
                                    >
                                      <span
                                        className="w-2.5 h-2.5 rounded-xs shrink-0"
                                        style={{ backgroundColor: sub.color }}
                                      />
                                      <span className="truncate">{sub.name}</span>
                                    </button>

                                    {/* Subgroup Privacy & Joining Controls */}
                                    {sub.isPrivate ? (
                                      <Lock className="w-3 h-3 text-amber-500 dark:text-amber-400 shrink-0 mr-1.5" title="Subgrupo Privado" />
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
                                            className="text-[9px] text-zinc-400 dark:text-zinc-500 hover:text-red-500 hover:underline px-1 py-0.5 rounded shrink-0 cursor-pointer mr-1.5"
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
                                          className="text-[9px] bg-sky-500/10 hover:bg-sky-500 hover:text-white text-sky-600 dark:text-sky-400 px-1.5 py-0.5 rounded-md shrink-0 cursor-pointer mr-1.5 font-bold transition-all"
                                          title="Entrar no subgrupo público"
                                        >
                                          Entrar
                                        </button>
                                      )
                                    )}

                                    {/* Subgroup managers */}
                                    {(sub.creatorId === currentUser?.id || group.creatorId === currentUser?.id) && (
                                      <button
                                        id={`delete-sub-${sub.id}`}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          if (confirm("Tem certeza que deseja apagar o subgrupo?")) {
                                            deleteSubgroup(sub.id);
                                          }
                                        }}
                                        className="opacity-0 group-hover:opacity-100 p-0.5 rounded-md text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 mr-1 shrink-0 scroll-smooth cursor-pointer"
                                        title="Excluir Subgrupo"
                                      >
                                        <Trash2 className="w-3 h-3" />
                                      </button>
                                    )}
                                  </div>
                                );
                              })
                            )}
                          </div>

                          {/* Action button leave group */}
                          <div className="pt-2 border-t border-gray-100 dark:border-zinc-800 flex justify-between items-center px-1">
                            {currentUser?.id !== group.creatorId ? (
                              <button
                                id={`leave-group-${group.id}`}
                                onClick={() => {
                                  if (confirm("Deseja realmente sair deste grupo?")) {
                                    leaveGroup(group.id);
                                  }
                                }}
                                className="text-[10px] text-red-500 font-semibold hover:underline"
                              >
                                Sair do Grupo
                              </button>
                            ) : (
                               <span className="text-[9px] text-amber-600 dark:text-amber-400 font-bold flex items-center gap-0.5">
                                 <ShieldCheck className="w-3 h-3 inline" />
                                 Você é o Criador
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
    </aside>
  );
};
