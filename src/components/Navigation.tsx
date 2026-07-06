/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from "react";
import { useApp } from "../context/AppContext";
import {
  FolderLock,
  Plus,
  Compass,
  Copy,
  Check,
  Mail,
  ChevronLeft,
  Trash2,
  Lock,
  Moon,
  Sun,
  ShieldCheck,
  Settings,
  X,
  MessageSquare,
  Users,
  Users2,
  Hash,
  LayoutGrid,
  LogOut,
  UserPlus,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Group } from "../types";

interface NavigationProps {
  onOpenProfile: (tab?: "profile" | "friends") => void;
  isMobile?: boolean;
  onCloseMobile?: () => void;
}

type BrowseSpace = "personal" | "groups" | "dms";

export const Navigation: React.FC<NavigationProps> = ({ onOpenProfile, isMobile, onCloseMobile }) => {
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

  // Which "space" the contextual panel is showing.
  const [browseSpace, setBrowseSpace] = useState<BrowseSpace>(
    activeTab === "groups" ? "groups" : "personal"
  );

  // Modals & popovers
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupDesc, setNewGroupDesc] = useState("");

  const [showJoinGroupModal, setShowJoinGroupModal] = useState(false);
  const [joinCode, setJoinCode] = useState("");

  const [creatingSubFor, setCreatingSubFor] = useState<Group | "personal" | null>(null);
  const [newSubName, setNewSubName] = useState("");
  const [newSubDesc, setNewSubDesc] = useState("");
  const [newSubColor, setNewSubColor] = useState("#6366f1");
  const [newSubIsPrivate, setNewSubIsPrivate] = useState(false);

  const [showAddMenu, setShowAddMenu] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Keep the browsed space roughly in sync with the actual selection so the
  // rail highlight and panel content follow navigations triggered elsewhere.
  useEffect(() => {
    if (activeTab === "personal") setBrowseSpace("personal");
  }, [activeTab]);
  useEffect(() => {
    if (selectedGroup) setBrowseSpace("groups");
  }, [selectedGroup]);
  useEffect(() => {
    if (selectedDmUserId) setBrowseSpace("dms");
  }, [selectedDmUserId]);

  const closeMobile = () => {
    if (isMobile && onCloseMobile) onCloseMobile();
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard?.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const openPersonal = () => {
    setBrowseSpace("personal");
    setActiveTab("personal");
    setSelectedGroup(null);
    setSelectedDmUserId(null);
  };

  const openGroup = (group: Group) => {
    setBrowseSpace("groups");
    setActiveTab("groups");
    setSelectedGroup(group);
    setSelectedSubgroup(null);
    setSelectedDmUserId(null);
  };

  const openGroupsDashboard = () => {
    setBrowseSpace("groups");
    setActiveTab("groups");
    setSelectedGroup(null);
    setSelectedSubgroup(null);
    setSelectedDmUserId(null);
    closeMobile();
  };

  const openDms = () => {
    setBrowseSpace("dms");
    if (selectedDmUserId) {
      setActiveModule("chat");
    }
  };

  const openDmThread = (friendId: string) => {
    setSelectedDmUserId(friendId);
    setActiveModule("chat");
    setChatMobileView("chat");
    closeMobile();
  };

  const handleCreateGroupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;
    try {
      const g = await createGroup(newGroupName, newGroupDesc);
      setNewGroupName("");
      setNewGroupDesc("");
      setShowCreateGroupModal(false);
      if (g) openGroup(g);
    } catch {
      alert("Erro ao criar grupo.");
    }
  };

  const handleJoinGroupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim()) return;
    try {
      const g = await joinGroup(joinCode);
      setJoinCode("");
      setShowJoinGroupModal(false);
      if (g) openGroup(g);
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
      setNewSubColor("#6366f1");
      setCreatingSubFor(null);
    } catch {
      alert("Erro ao criar subgrupo.");
    }
  };

  const sortedFriends = [...friends].sort((a, b) => {
    const lastA = latestDmMessages[a.id];
    const lastB = latestDmMessages[b.id];
    if (!lastA && !lastB) return 0;
    if (!lastA) return 1;
    if (!lastB) return -1;
    return new Date(lastB.timestamp).getTime() - new Date(lastA.timestamp).getTime();
  });

  const personalSubgroups = subgroups.filter((s) => s.groupId === "personal");
  const groupChannels = selectedGroup
    ? subgroups.filter((sub) => {
        if (sub.groupId !== selectedGroup.id) return false;
        if (sub.isPrivate) {
          const isMember = sub.members?.includes(currentUser?.id || "");
          const isCreator = sub.creatorId === currentUser?.id;
          return isCreator || isMember;
        }
        return true;
      })
    : [];

  const isDmActive = browseSpace === "dms";

  // ── Rail button ────────────────────────────────────────────────────────────
  // Full literal class strings per accent so Tailwind can statically detect them.
  const ACCENTS: Record<string, { activeBg: string; bar: string; ring: string }> = {
    sky: { activeBg: "bg-sky-500/15 text-sky-600 dark:text-sky-400", bar: "bg-sky-500", ring: "focus-visible:ring-sky-500" },
    emerald: { activeBg: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400", bar: "bg-emerald-500", ring: "focus-visible:ring-emerald-500" },
    indigo: { activeBg: "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400", bar: "bg-indigo-500", ring: "focus-visible:ring-indigo-500" },
  };

  const RailButton: React.FC<{
    active?: boolean;
    label: string;
    onClick: () => void;
    children: React.ReactNode;
    accent?: "sky" | "emerald" | "indigo";
  }> = ({ active, label, onClick, children, accent = "sky" }) => {
    const a = ACCENTS[accent];
    return (
      <button
        type="button"
        onClick={onClick}
        aria-label={label}
        aria-current={active ? "true" : undefined}
        title={label}
        className={`group relative w-11 h-11 rounded-2xl flex items-center justify-center transition-all cursor-pointer outline-none focus-visible:ring-2 ${a.ring} ${
          active
            ? a.activeBg
            : "text-gray-500 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800 hover:text-gray-900 dark:hover:text-zinc-100"
        }`}
      >
        <span
          className={`absolute left-0 top-1/2 -translate-y-1/2 w-1 rounded-r-full ${a.bar} transition-all ${
            active ? "h-6 opacity-100" : "h-0 opacity-0 group-hover:h-3 group-hover:opacity-60"
          }`}
        />
        {children}
      </button>
    );
  };

  return (
    <div className="flex h-full font-sans select-none">
      {/* ══════════════════ ICON RAIL ══════════════════ */}
      <nav
        aria-label="Espaços"
        className="w-16 shrink-0 h-full flex flex-col items-center gap-1.5 py-3 bg-gray-50 dark:bg-zinc-950 border-r border-gray-200 dark:border-zinc-800"
      >
        <img src="/logo.svg" alt="worksync" className="w-8 h-8 object-contain mb-1.5" />

        <RailButton active={browseSpace === "personal"} label="Área pessoal" onClick={openPersonal} accent="emerald">
          <FolderLock className="w-5 h-5" />
        </RailButton>

        <div className="w-8 h-px bg-gray-200 dark:bg-zinc-800 my-1" />

        {/* Group avatars */}
        <div className="flex-1 w-full flex flex-col items-center gap-1.5 overflow-y-auto scrollbar-none min-h-0">
          {groups.map((group) => {
            const active = browseSpace === "groups" && selectedGroup?.id === group.id;
            return (
              <button
                key={group.id}
                type="button"
                onClick={() => {
                  openGroup(group);
                  closeMobile();
                }}
                aria-label={group.name}
                aria-current={active ? "true" : undefined}
                title={group.name}
                className={`group relative w-11 h-11 rounded-2xl overflow-hidden flex items-center justify-center shrink-0 transition-all cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-sky-500 ${
                  active
                    ? "ring-2 ring-sky-500 ring-offset-2 ring-offset-gray-50 dark:ring-offset-zinc-950"
                    : "hover:rounded-xl"
                }`}
              >
                <span
                  className={`absolute left-0 top-1/2 -translate-y-1/2 w-1 rounded-r-full bg-sky-500 transition-all ${
                    active ? "h-6 opacity-100" : "h-0 opacity-0"
                  }`}
                />
                {group.backgroundImage ? (
                  <img src={group.backgroundImage} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="w-full h-full bg-gradient-to-br from-indigo-500 to-sky-500 text-white text-xs font-bold flex items-center justify-center">
                    {group.name.substring(0, 2).toUpperCase()}
                  </span>
                )}
              </button>
            );
          })}

          {/* Add group */}
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => setShowAddMenu((v) => !v)}
              aria-label="Adicionar grupo"
              title="Adicionar grupo"
              className="w-11 h-11 rounded-2xl flex items-center justify-center text-sky-600 dark:text-sky-400 bg-sky-500/10 hover:bg-sky-500/20 transition-all cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
            >
              <Plus className="w-5 h-5" />
            </button>
            <AnimatePresence>
              {showAddMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowAddMenu(false)} />
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, x: -8 }}
                    animate={{ opacity: 1, scale: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.95, x: -8 }}
                    transition={{ duration: 0.12 }}
                    className="absolute left-14 top-0 z-50 w-44 p-1.5 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl shadow-xl"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddMenu(false);
                        setShowCreateGroupModal(true);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium text-gray-700 dark:text-zinc-200 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-all cursor-pointer"
                    >
                      <Plus className="w-4 h-4 text-sky-500" /> Criar grupo
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddMenu(false);
                        setShowJoinGroupModal(true);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium text-gray-700 dark:text-zinc-200 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-all cursor-pointer"
                    >
                      <Compass className="w-4 h-4 text-sky-500" /> Entrar com código
                    </button>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>

          <RailButton active={browseSpace === "groups" && !selectedGroup} label="Todos os grupos" onClick={openGroupsDashboard}>
            <LayoutGrid className="w-5 h-5" />
          </RailButton>
        </div>

        <div className="w-8 h-px bg-gray-200 dark:bg-zinc-800 my-1" />

        <RailButton active={isDmActive} label="Mensagens diretas" onClick={openDms} accent="indigo">
          <MessageSquare className="w-5 h-5" />
        </RailButton>

        {/* Bottom cluster */}
        <div className="flex flex-col items-center gap-1.5 mt-1">
          <button
            type="button"
            onClick={toggleTheme}
            aria-label="Alternar tema"
            title="Alternar tema"
            className="w-11 h-11 rounded-2xl flex items-center justify-center text-gray-500 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-all cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
          >
            {theme === "light" ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
          </button>
          <button
            type="button"
            onClick={() => {
              onOpenProfile();
              closeMobile();
            }}
            aria-label="Meu perfil"
            title={currentUser?.name || "Perfil"}
            className="w-9 h-9 rounded-full overflow-hidden border border-gray-200 dark:border-zinc-700 hover:ring-2 hover:ring-sky-500 transition-all cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
          >
            {currentUser && (
              <img src={currentUser.photoUrl} alt="" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
            )}
          </button>
          <button
            type="button"
            onClick={signOut}
            aria-label="Sair"
            title="Sair"
            className="w-11 h-9 rounded-2xl flex items-center justify-center text-rose-500 hover:bg-rose-500/10 transition-all cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
          >
            <LogOut className="w-4.5 h-4.5" />
          </button>
        </div>
      </nav>

      {/* ══════════════════ CONTEXTUAL PANEL ══════════════════ */}
      <div
        className={`h-full flex flex-col bg-white dark:bg-zinc-900 border-r border-gray-200 dark:border-zinc-800 overflow-hidden transition-all duration-300 ${
          isMobile ? "flex-1" : isSidebarCollapsed ? "w-0 border-r-0" : "w-72"
        }`}
      >
        <div className={`${isMobile ? "w-full" : "w-72"} h-full flex flex-col`}>
          {/* Panel header */}
          <header className="px-4 h-16 shrink-0 flex items-center justify-between gap-2 border-b border-gray-100 dark:border-zinc-800">
            <div className="min-w-0">
              {browseSpace === "personal" && (
                <>
                  <h2 className="text-sm font-bold text-gray-900 dark:text-zinc-50 flex items-center gap-2">
                    <FolderLock className="w-4 h-4 text-emerald-500" /> Área Pessoal
                  </h2>
                  <p className="text-[11px] text-gray-400 dark:text-zinc-500 mt-0.5 truncate">Suas listas, ideias e notas</p>
                </>
              )}
              {browseSpace === "groups" && selectedGroup && (
                <>
                  <h2 className="text-sm font-bold text-gray-900 dark:text-zinc-50 truncate">{selectedGroup.name}</h2>
                  <button
                    type="button"
                    onClick={() => handleCopyCode(selectedGroup.code)}
                    className="text-[11px] text-gray-400 dark:text-zinc-500 mt-0.5 flex items-center gap-1 hover:text-sky-500 transition-all cursor-pointer"
                    title="Copiar código de convite"
                  >
                    Código: <strong>{selectedGroup.code}</strong>
                    {copiedCode === selectedGroup.code ? (
                      <Check className="w-3 h-3 text-emerald-500" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                  </button>
                </>
              )}
              {browseSpace === "groups" && !selectedGroup && (
                <>
                  <h2 className="text-sm font-bold text-gray-900 dark:text-zinc-50 flex items-center gap-2">
                    <Users2 className="w-4 h-4 text-sky-500" /> Grupos
                  </h2>
                  <p className="text-[11px] text-gray-400 dark:text-zinc-500 mt-0.5 truncate">Selecione um grupo no rail</p>
                </>
              )}
              {browseSpace === "dms" && (
                <>
                  <h2 className="text-sm font-bold text-gray-900 dark:text-zinc-50 flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-indigo-500" /> Mensagens
                  </h2>
                  <p className="text-[11px] text-gray-400 dark:text-zinc-500 mt-0.5 truncate">Conversas diretas com amigos</p>
                </>
              )}
            </div>

            {isMobile ? (
              <button
                type="button"
                onClick={onCloseMobile}
                aria-label="Fechar menu"
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-zinc-200 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-all cursor-pointer shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setIsSidebarCollapsed(true)}
                aria-label="Recolher painel"
                title="Recolher painel"
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-zinc-200 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-all cursor-pointer shrink-0"
              >
                <ChevronLeft className="w-4.5 h-4.5" />
              </button>
            )}
          </header>

          {/* Panel body */}
          <div className="flex-1 overflow-y-auto scrollbar-thin p-3">
            {/* ---------- PERSONAL ---------- */}
            {browseSpace === "personal" && (
              <div className="space-y-1">
                <div className="flex items-center justify-between px-2 mb-1">
                  <span className="text-[10px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-widest">
                    Subgrupos
                  </span>
                  <button
                    type="button"
                    onClick={() => setCreatingSubFor("personal")}
                    className="p-1 text-sky-600 dark:text-sky-400 hover:bg-sky-500/10 rounded-md transition-all cursor-pointer"
                    title="Novo subgrupo pessoal"
                    aria-label="Novo subgrupo pessoal"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedSubgroup(null);
                    closeMobile();
                  }}
                  className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer ${
                    !selectedSubgroup
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                      : "text-gray-600 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800"
                  }`}
                >
                  <Hash className="w-4 h-4 shrink-0 text-emerald-500" />
                  <span className="truncate">Área principal</span>
                </button>

                {personalSubgroups.map((sub) => {
                  const active = selectedSubgroup?.id === sub.id;
                  return (
                    <div
                      key={sub.id}
                      className={`group flex items-center gap-1 rounded-lg transition-all ${
                        active
                          ? "bg-sky-500/10 text-sky-600 dark:text-sky-300"
                          : "text-gray-600 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedSubgroup(sub);
                          closeMobile();
                        }}
                        className="flex-1 flex items-center gap-2 px-2.5 py-2 text-sm font-medium truncate cursor-pointer text-left"
                      >
                        <Hash className="w-4 h-4 shrink-0" style={{ color: sub.color }} />
                        <span className="truncate">{sub.name}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm(`Remover o subgrupo "${sub.name}"?`)) deleteSubgroup(sub.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1.5 mr-1 text-gray-400 hover:text-rose-500 rounded-md transition-all cursor-pointer"
                        title="Apagar subgrupo"
                        aria-label={`Apagar ${sub.name}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}

                {personalSubgroups.length === 0 && (
                  <p className="px-2.5 py-3 text-xs text-gray-400 dark:text-zinc-500 italic">
                    Nenhum subgrupo pessoal ainda.
                  </p>
                )}
              </div>
            )}

            {/* ---------- GROUPS ---------- */}
            {browseSpace === "groups" && (
              <>
                {!selectedGroup ? (
                  <div className="space-y-2">
                    {groups.length === 0 ? (
                      <div className="text-center p-5 mt-2 rounded-2xl border border-dashed border-gray-200 dark:border-zinc-800">
                        <Users2 className="w-7 h-7 text-gray-300 dark:text-zinc-700 mx-auto mb-2" />
                        <p className="text-xs text-gray-500 dark:text-zinc-400 mb-3">Você ainda não participa de grupos.</p>
                        <button
                          type="button"
                          onClick={() => setShowCreateGroupModal(true)}
                          className="text-xs font-bold text-sky-600 dark:text-sky-400 hover:underline cursor-pointer"
                        >
                          Criar seu primeiro grupo
                        </button>
                      </div>
                    ) : (
                      <>
                        <span className="px-2 text-[10px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-widest block mb-1">
                          Seus grupos
                        </span>
                        {groups.map((g) => (
                          <button
                            key={g.id}
                            type="button"
                            onClick={() => {
                              openGroup(g);
                              closeMobile();
                            }}
                            className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm font-medium text-gray-700 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-all cursor-pointer text-left"
                          >
                            <span className="w-7 h-7 rounded-lg overflow-hidden shrink-0 bg-gradient-to-br from-indigo-500 to-sky-500 text-white text-[10px] font-bold flex items-center justify-center">
                              {g.backgroundImage ? (
                                <img src={g.backgroundImage} alt="" className="w-full h-full object-cover" />
                              ) : (
                                g.name.substring(0, 2).toUpperCase()
                              )}
                            </span>
                            <span className="truncate">{g.name}</span>
                          </button>
                        ))}
                      </>
                    )}
                  </div>
                ) : (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between px-2 mb-1">
                      <span className="text-[10px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-widest">
                        Canais
                      </span>
                      <button
                        type="button"
                        onClick={() => setCreatingSubFor(selectedGroup)}
                        className="p-1 text-sky-600 dark:text-sky-400 hover:bg-sky-500/10 rounded-md transition-all cursor-pointer"
                        title="Novo canal"
                        aria-label="Novo canal"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Group chat (mural) */}
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedSubgroup(null);
                        setSelectedDmUserId(null);
                        setActiveModule("chat");
                        setChatMobileView("chat");
                        closeMobile();
                      }}
                      className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer ${
                        !selectedSubgroup && activeModule === "chat"
                          ? "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400"
                          : "text-gray-600 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800"
                      }`}
                    >
                      <MessageSquare className="w-4 h-4 shrink-0 text-indigo-500" />
                      <span className="truncate">Mural do grupo</span>
                    </button>

                    {groupChannels.length === 0 ? (
                      <p className="px-2.5 py-2 text-xs text-gray-400 dark:text-zinc-500 italic">Sem canais ainda.</p>
                    ) : (
                      groupChannels.map((sub) => {
                        const active = selectedSubgroup?.id === sub.id;
                        const isMember = sub.members?.includes(currentUser?.id || "");
                        const canDelete = sub.creatorId === currentUser?.id || selectedGroup.creatorId === currentUser?.id;
                        return (
                          <div
                            key={sub.id}
                            className={`group flex items-center gap-1 rounded-lg transition-all ${
                              active
                                ? "bg-sky-500/10 text-sky-600 dark:text-sky-300"
                                : "text-gray-600 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800"
                            }`}
                          >
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedSubgroup(sub);
                                closeMobile();
                              }}
                              className="flex-1 flex items-center gap-2 px-2.5 py-2 text-sm font-medium truncate cursor-pointer text-left"
                            >
                              <Hash className="w-4 h-4 shrink-0" style={{ color: sub.color }} />
                              <span className="truncate">{sub.name}</span>
                            </button>

                            <div className="flex items-center gap-0.5 pr-1 shrink-0">
                              {sub.isPrivate ? (
                                <Lock className="w-3.5 h-3.5 text-amber-500 shrink-0" aria-label="Canal privado" />
                              ) : isMember ? (
                                currentUser?.id !== sub.creatorId && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      toggleSubgroupMembership(sub.id, currentUser!.id);
                                      if (selectedSubgroup?.id === sub.id) setSelectedSubgroup(null);
                                    }}
                                    className="text-[10px] text-gray-400 dark:text-zinc-500 hover:text-rose-500 px-1 py-0.5 cursor-pointer"
                                    title="Sair do canal"
                                  >
                                    Sair
                                  </button>
                                )
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => toggleSubgroupMembership(sub.id, currentUser!.id)}
                                  className="text-[10px] bg-sky-500/10 hover:bg-sky-500 hover:text-white text-sky-600 dark:text-sky-400 px-1.5 py-0.5 rounded-md font-bold transition-all cursor-pointer"
                                  title="Entrar no canal"
                                >
                                  Entrar
                                </button>
                              )}
                              {canDelete && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (window.confirm(`Apagar o canal "${sub.name}"?`)) deleteSubgroup(sub.id);
                                  }}
                                  className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-rose-500 rounded-md transition-all cursor-pointer"
                                  title="Excluir canal"
                                  aria-label={`Excluir ${sub.name}`}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}

                    {/* Group footer actions */}
                    <div className="pt-3 mt-2 border-t border-gray-100 dark:border-zinc-800 flex items-center justify-between px-2">
                      {currentUser?.id !== selectedGroup.creatorId ? (
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm("Deseja realmente sair deste grupo?")) {
                              leaveGroup(selectedGroup.id);
                              openGroupsDashboard();
                            }
                          }}
                          className="text-[11px] text-rose-500 font-semibold hover:underline cursor-pointer"
                        >
                          Sair do grupo
                        </button>
                      ) : (
                        <span className="text-[11px] text-amber-600 dark:text-amber-400 font-bold flex items-center gap-1">
                          <ShieldCheck className="w-3.5 h-3.5" /> Criador
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => handleCopyCode(selectedGroup.code)}
                        className="text-[11px] text-gray-400 dark:text-zinc-500 hover:text-sky-500 flex items-center gap-1 cursor-pointer"
                        title="Convidar por código"
                      >
                        <UserPlus className="w-3.5 h-3.5" /> Convidar
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* ---------- DMs ---------- */}
            {browseSpace === "dms" && (
              <div className="space-y-1">
                <div className="flex items-center justify-between px-2 mb-1">
                  <span className="text-[10px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-widest">
                    Conversas
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      onOpenProfile("friends");
                      closeMobile();
                    }}
                    className="text-[11px] text-sky-600 dark:text-sky-400 font-semibold hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Users className="w-3.5 h-3.5" /> Amigos
                  </button>
                </div>

                {sortedFriends.map((friend) => {
                  const active = selectedDmUserId === friend.id && activeModule === "chat";
                  const lastMsg = latestDmMessages[friend.id];
                  return (
                    <button
                      key={friend.id}
                      type="button"
                      onClick={() => openDmThread(friend.id)}
                      className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg transition-all cursor-pointer text-left ${
                        active
                          ? "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400"
                          : "text-gray-700 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-800"
                      }`}
                    >
                      <img
                        src={friend.photoUrl}
                        alt=""
                        referrerPolicy="no-referrer"
                        className="w-8 h-8 rounded-full object-cover shrink-0 border border-black/5 dark:border-white/10"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">{friend.name}</p>
                        <p className="text-[11px] text-gray-400 dark:text-zinc-500 truncate">
                          {lastMsg ? lastMsg.text : "Nenhuma mensagem"}
                        </p>
                      </div>
                    </button>
                  );
                })}

                {friends.length === 0 && (
                  <div className="text-center p-5 mt-2 rounded-2xl border border-dashed border-gray-200 dark:border-zinc-800">
                    <MessageSquare className="w-7 h-7 text-gray-300 dark:text-zinc-700 mx-auto mb-2" />
                    <p className="text-xs text-gray-500 dark:text-zinc-400 mb-3">Nenhum amigo ainda.</p>
                    <button
                      type="button"
                      onClick={() => {
                        onOpenProfile("friends");
                        closeMobile();
                      }}
                      className="text-xs font-bold text-sky-600 dark:text-sky-400 hover:underline cursor-pointer"
                    >
                      Adicionar amigos
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ══════════════════ MODALS ══════════════════ */}
      <AnimatePresence>
        {showCreateGroupModal && (
          <ModalShell onClose={() => setShowCreateGroupModal(false)} icon={<Users2 className="w-5 h-5 text-sky-500" />} title="Criar novo grupo">
            <form onSubmit={handleCreateGroupSubmit} className="space-y-4">
              <Field label="Nome do grupo">
                <input
                  type="text"
                  placeholder="ex: Empresa X, Faculdade"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  className={inputCls}
                  required
                  autoFocus
                />
              </Field>
              <Field label="Descrição">
                <textarea
                  placeholder="Descrição do grupo..."
                  value={newGroupDesc}
                  onChange={(e) => setNewGroupDesc(e.target.value)}
                  className={`${inputCls} h-16 resize-none`}
                />
              </Field>
              <ModalActions onCancel={() => setShowCreateGroupModal(false)} submitLabel="Salvar grupo" />
            </form>
          </ModalShell>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showJoinGroupModal && (
          <ModalShell onClose={() => setShowJoinGroupModal(false)} icon={<Compass className="w-5 h-5 text-sky-500" />} title="Entrar em um grupo">
            <form onSubmit={handleJoinGroupSubmit} className="space-y-4">
              <Field label="Código do grupo (6 dígitos)">
                <input
                  type="text"
                  maxLength={6}
                  placeholder="EX: GF7Y4X"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  className={`${inputCls} text-center text-base font-bold uppercase tracking-[0.3em]`}
                  required
                  autoFocus
                />
              </Field>
              <ModalActions onCancel={() => setShowJoinGroupModal(false)} submitLabel="Entrar no grupo" />
            </form>
          </ModalShell>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {creatingSubFor && (
          <ModalShell
            onClose={() => setCreatingSubFor(null)}
            icon={<Hash className="w-5 h-5 text-sky-500" />}
            title={creatingSubFor === "personal" ? "Novo subgrupo pessoal" : `Novo canal em ${creatingSubFor.name}`}
          >
            <form onSubmit={handleCreateSubSubmit} className="space-y-4">
              <Field label="Nome">
                <input
                  type="text"
                  placeholder="ex: design, geral, back-end"
                  value={newSubName}
                  onChange={(e) => setNewSubName(e.target.value)}
                  className={inputCls}
                  required
                  autoFocus
                />
              </Field>
              <Field label="Descrição">
                <textarea
                  placeholder="Descrição opcional..."
                  value={newSubDesc}
                  onChange={(e) => setNewSubDesc(e.target.value)}
                  className={`${inputCls} h-14 resize-none`}
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Cor">
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={newSubColor}
                      onChange={(e) => setNewSubColor(e.target.value)}
                      className="w-9 h-9 p-0 border-0 bg-transparent cursor-pointer rounded-full overflow-hidden shrink-0"
                      aria-label="Cor temática"
                    />
                    <span className="font-mono text-[11px] uppercase text-gray-500 dark:text-zinc-400">{newSubColor}</span>
                  </div>
                </Field>
                {creatingSubFor !== "personal" && (
                  <Field label="Acesso">
                    <select
                      value={newSubIsPrivate ? "private" : "public"}
                      onChange={(e) => setNewSubIsPrivate(e.target.value === "private")}
                      className={inputCls}
                    >
                      <option value="public">Público</option>
                      <option value="private">Privado 🔒</option>
                    </select>
                  </Field>
                )}
              </div>
              <ModalActions onCancel={() => setCreatingSubFor(null)} submitLabel="Criar" />
            </form>
          </ModalShell>
        )}
      </AnimatePresence>
    </div>
  );
};

// ── Small shared modal primitives ────────────────────────────────────────────
const inputCls =
  "w-full px-3 py-2 text-sm bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500 transition-all";

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div>
    <label className="block text-[10px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-wide mb-1.5">{label}</label>
    {children}
  </div>
);

const ModalShell: React.FC<{
  onClose: () => void;
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}> = ({ onClose, icon, title, children }) => (
  <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[60]">
    <motion.div
      initial={{ scale: 0.96, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.96, opacity: 0 }}
      transition={{ duration: 0.15 }}
      className="bg-white dark:bg-zinc-900 rounded-3xl p-6 w-full max-w-sm border border-gray-200 dark:border-zinc-800 shadow-2xl relative max-h-[90dvh] overflow-y-auto scrollbar-thin"
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Fechar"
        className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-400 hover:text-gray-600 dark:hover:text-zinc-200 cursor-pointer transition-all"
      >
        <X className="w-4 h-4" />
      </button>
      <h3 className="text-base font-bold text-gray-900 dark:text-zinc-50 mb-4 flex items-center gap-2 pr-8">
        {icon}
        <span>{title}</span>
      </h3>
      {children}
    </motion.div>
  </div>
);

const ModalActions: React.FC<{ onCancel: () => void; submitLabel: string }> = ({ onCancel, submitLabel }) => (
  <div className="flex gap-2 justify-end font-semibold pt-1">
    <button
      type="button"
      onClick={onCancel}
      className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-zinc-200 cursor-pointer transition-all"
    >
      Cancelar
    </button>
    <button
      type="submit"
      className="px-4 py-2 text-sm bg-sky-600 hover:bg-sky-500 text-white rounded-lg cursor-pointer transition-all shadow-sm"
    >
      {submitLabel}
    </button>
  </div>
);
