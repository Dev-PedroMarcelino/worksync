/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from "react";
import { useApp } from "../context/AppContext";
import { Plus, Trash2, StickyNote, Info, Move, X, Link } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface WhiteboardCanvasProps {
  canEdit: boolean;
}

const POST_IT_COLORS = [
  { name: "Amarelo", bg: "bg-amber-100 dark:bg-amber-900 border-amber-300 dark:border-amber-750 text-amber-950 dark:text-amber-50" },
  { name: "Verde", bg: "bg-emerald-100 dark:bg-emerald-900 border-emerald-300 dark:border-emerald-750 text-emerald-950 dark:text-emerald-50" },
  { name: "Azul", bg: "bg-sky-100 dark:bg-sky-900 border-sky-300 dark:border-sky-750 text-sky-950 dark:text-sky-50" },
  { name: "Lilás", bg: "bg-violet-100 dark:bg-violet-900 border-violet-300 dark:border-violet-750 text-violet-950 dark:text-violet-50" },
  { name: "Salmão", bg: "bg-rose-100 dark:bg-rose-900 border-rose-300 dark:border-rose-750 text-rose-950 dark:text-rose-50" },
];

export const WhiteboardCanvas: React.FC<WhiteboardCanvasProps> = ({ canEdit }) => {
  const {
    whiteboardItems,
    addWhiteboardItem,
    updateWhiteboardItemPosition,
    deleteWhiteboardItem,
    toggleWhiteboardConnection,
    whiteboardBoards,
    activeBoardId,
    setActiveBoardId,
    createWhiteboardBoard,
    deleteWhiteboardBoard,
  } = useApp();

  const [noteInput, setNoteInput] = useState("");
  const [selectedColorIdx, setSelectedColorIdx] = useState(0);
  const [showAddForm, setShowAddForm] = useState(false);
  const [connectingFromId, setConnectingFromId] = useState<string | null>(null);

  const [isCreatingBoard, setIsCreatingBoard] = useState(false);
  const [newBoardName, setNewBoardName] = useState("");
  const [viewMode, setViewMode] = useState<"canvas" | "grid">("canvas");

  const containerRef = useRef<HTMLDivElement>(null);
  const dragInfoRef = useRef<{ id: string; startX: number; startY: number; itemX: number; itemY: number } | null>(null);

  // Quick insertion submit
  const handleAddPostIt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteInput.trim()) return;

    try {
      // Find a random coordinates offset to prevent overlapping
      const randomX = 50 + Math.floor(Math.random() * 150);
      const randomY = 60 + Math.floor(Math.random() * 120);

      await addWhiteboardItem(noteInput.trim(), POST_IT_COLORS[selectedColorIdx].bg, randomX, randomY);
      setNoteInput("");
      setShowAddForm(false);
    } catch (err) {
      alert("Erro ao adicionar post-it");
    }
  };

  const handleCreateBoardSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBoardName.trim()) return;
    try {
      await createWhiteboardBoard(newBoardName.trim());
      setNewBoardName("");
      setIsCreatingBoard(false);
    } catch (err) {
      alert("Erro ao criar quadro");
    }
  };

  // --- Handlers for dragging elements ---

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>, itemId: string, itemX: number, itemY: number) => {
    if (!canEdit) return;
    e.stopPropagation();

    // Trigger capture to handle dragging out of bounds safely
    (e.target as HTMLDivElement).setPointerCapture(e.pointerId);

    dragInfoRef.current = {
      id: itemId,
      startX: e.clientX,
      startY: e.clientY,
      itemX,
      itemY,
    };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragInfoRef.current || !containerRef.current) return;
    e.stopPropagation();

    const drag = dragInfoRef.current;
    const deltaX = e.clientX - drag.startX;
    const deltaY = e.clientY - drag.startY;

    // Boundary constraints within parent div
    const containerBounds = containerRef.current.getBoundingClientRect();
    let newX = drag.itemX + deltaX;
    let newY = drag.itemY + deltaY;

    // Bound limits check
    if (newX < 10) newX = 10;
    if (newX > containerBounds.width - 190) newX = containerBounds.width - 190;
    if (newY < 10) newY = 10;
    if (newY > containerBounds.height - 190) newY = containerBounds.height - 190;

    // Optimistically update positions locally inside DOM element
    const element = document.getElementById(`postit-${drag.id}`);
    if (element) {
      element.style.transform = `translate(${newX}px, ${newY}px)`;
    }
  };

  const handlePointerUp = async (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragInfoRef.current || !containerRef.current) return;
    e.stopPropagation();

    const drag = dragInfoRef.current;
    dragInfoRef.current = null;

    (e.target as HTMLDivElement).releasePointerCapture(e.pointerId);

    const deltaX = e.clientX - drag.startX;
    const deltaY = e.clientY - drag.startY;

    const containerBounds = containerRef.current.getBoundingClientRect();
    let finalX = drag.itemX + deltaX;
    let finalY = drag.itemY + deltaY;

    if (finalX < 10) finalX = 10;
    if (finalX > containerBounds.width - 190) finalX = containerBounds.width - 190;
    if (finalY < 10) finalY = 10;
    if (finalY > containerBounds.height - 190) finalY = containerBounds.height - 190;

    try {
      await updateWhiteboardItemPosition(drag.id, Math.round(finalX), Math.round(finalY));
    } catch (err) {
      console.error("Erro ao sincronizar localização", err);
    }
  };

  const handleStartConnection = async (id: string) => {
    if (!connectingFromId) {
      setConnectingFromId(id);
    } else {
      if (connectingFromId === id) {
        setConnectingFromId(null);
        return;
      }
      try {
        await toggleWhiteboardConnection(connectingFromId, id);
      } catch (err) {
        console.error("Erro ao conectar", err);
      } finally {
        setConnectingFromId(null);
      }
    }
  };

  const currentBoardId = activeBoardId || "default";
  const filteredItems = whiteboardItems.filter((item) => {
    const itemBoardId = item.boardId || "default";
    return itemBoardId === currentBoardId;
  });

  const renderedConnections: any[] = [];
  const processedPairs = new Set<string>();

  filteredItems.forEach((item) => {
    if (item.connections) {
      item.connections.forEach((targetId) => {
        const targetItem = filteredItems.find((i) => i.id === targetId);
        if (targetItem) {
          const pairKey = [item.id, targetId].sort().join("-");
          if (!processedPairs.has(pairKey)) {
            processedPairs.add(pairKey);
            renderedConnections.push({
              id: pairKey,
              x1: item.x + 88,
              y1: item.y + 88,
              x2: targetItem.x + 88,
              y2: targetItem.y + 88,
            });
          }
        }
      });
    }
  });

  return (
    <div className="h-full flex flex-col min-h-0 font-sans" id="whiteboard-module-container">
      {/* HEADER CONTROLS */}
      <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shrink-0 select-none">
        <div className="flex items-center gap-2">
          <span className="p-1 px-2.5 bg-sky-500/10 text-sky-600 rounded-lg text-xs font-bold leading-relaxed">
            Painel Visual
          </span>
          <p className="text-xs text-gray-500 dark:text-zinc-400 hidden lg:inline-block">
            Agrupe ideias e organize conceitos em notas autoadesivas dinâmicas.
          </p>
        </div>

        {/* View Mode & Add Button Control Bar */}
        <div className="flex flex-row items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
          <div className="flex items-center p-1 bg-gray-150/80 dark:bg-zinc-800/80 rounded-xl border border-gray-200/50 dark:border-zinc-850 text-xs">
            <button
              id="viewmode-canvas-btn"
              type="button"
              onClick={() => setViewMode("canvas")}
              className={`px-3 py-1.5 font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                viewMode === "canvas"
                  ? "bg-white dark:bg-zinc-700 text-gray-900 dark:text-white shadow-xs"
                  : "text-gray-500 dark:text-zinc-400 hover:text-gray-800 dark:hover:text-zinc-200"
              }`}
            >
              Quadro Visual
            </button>
            <button
              id="viewmode-grid-btn"
              type="button"
              onClick={() => setViewMode("grid")}
              className={`px-3 py-1.5 font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                viewMode === "grid"
                  ? "bg-white dark:bg-zinc-700 text-gray-900 dark:text-white shadow-xs"
                  : "text-gray-500 dark:text-zinc-400 hover:text-gray-800 dark:hover:text-zinc-200"
              }`}
            >
              Lista Organizada
            </button>
          </div>

          {canEdit && (
            <button
              id="action-add-postit"
              onClick={() => setShowAddForm(true)}
              className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Inserir Post-it</span>
            </button>
          )}
        </div>
      </div>

      {/* BOARDS WRAPPER / LIST */}
      <div className="mb-4 bg-zinc-50 dark:bg-zinc-900/60 p-2.5 rounded-2xl border border-gray-150 dark:border-zinc-800 shrink-0 text-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 overflow-x-auto max-w-full no-scrollbar">
          <span className="font-bold text-[10px] text-gray-400 uppercase tracking-wider block mr-1 shrink-0">
            Seus Quadros:
          </span>

          {/* Root/Default board pill */}
          <button
            id="board-tab-default"
            type="button"
            onClick={() => setActiveBoardId(null)}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all whitespace-nowrap cursor-pointer ${
              !activeBoardId
                ? "bg-sky-600 text-white shadow-xs scale-102"
                : "bg-white dark:bg-zinc-800 text-gray-650 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-750 border border-gray-150 dark:border-zinc-750"
            }`}
          >
            Quadro Principal
          </button>

          {/* Dynamic whiteboard boards pills */}
          {whiteboardBoards.map((board) => {
            const isActive = activeBoardId === board.id;
            return (
              <div
                id={`board-tab-wrapper-${board.id}`}
                key={board.id}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-xl font-bold transition-all whitespace-nowrap ${
                  isActive
                    ? "bg-sky-600 text-white shadow-xs scale-102"
                    : "bg-white dark:bg-zinc-800 text-gray-650 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-750 border border-gray-150 dark:border-zinc-750"
                }`}
              >
                <button
                  id={`board-tab-btn-${board.id}`}
                  type="button"
                  onClick={() => setActiveBoardId(board.id)}
                  className="cursor-pointer"
                >
                  {board.name}
                </button>
                {canEdit && (
                  <button
                    id={`board-tab-delete-btn-${board.id}`}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (window.confirm(`Quer mesmo apagar o quadro "${board.name}" e todos os seus post-its?`)) {
                        deleteWhiteboardBoard(board.id);
                        if (isActive) setActiveBoardId(null);
                      }
                    }}
                    className={`p-0.5 rounded-md hover:bg-black/10 transition-all cursor-pointer ml-1 text-xs shrink-0 ${
                      isActive ? "text-white/80 hover:text-white" : "text-gray-400 hover:text-red-500"
                    }`}
                    title="Excluir Quadro"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Board Creation / Trigger */}
        {canEdit && (
          <div className="shrink-0 flex items-center">
            {isCreatingBoard ? (
              <form onSubmit={handleCreateBoardSubmit} className="flex items-center gap-1">
                <input
                  id="new-board-name-input"
                  type="text"
                  placeholder="Nome do quadro..."
                  value={newBoardName}
                  onChange={(e) => setNewBoardName(e.target.value)}
                  className="px-2 py-1 bg-white dark:bg-zinc-850 border border-gray-200 dark:border-zinc-700 rounded-lg text-xs leading-none text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-sky-500 w-36"
                  required
                  autoFocus
                />
                <button
                  id="submit-new-board-btn"
                  type="submit"
                  className="p-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg cursor-pointer"
                  title="Criar Quadro"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
                <button
                  id="cancel-new-board-btn"
                  type="button"
                  onClick={() => {
                    setIsCreatingBoard(false);
                    setNewBoardName("");
                  }}
                  className="p-1.5 bg-gray-250 dark:bg-zinc-750 text-gray-600 dark:text-zinc-350 rounded-lg cursor-pointer"
                  title="Cancelar"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </form>
            ) : (
              <button
                id="trigger-create-board"
                type="button"
                onClick={() => setIsCreatingBoard(true)}
                className="px-2.5 py-1.5 bg-sky-500/10 hover:bg-sky-500/20 text-sky-600 dark:text-sky-400 rounded-xl font-bold transition-all flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Novo Quadro</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* CONNECTION ACTIVE BANNER */}
      {connectingFromId && (
        <div className="mb-3 px-4 py-2 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-700 dark:text-amber-400 text-xs font-semibold flex items-center justify-between shadow-xs">
          <span>Modo de Conexão Ativo: Selecione outro post-it para criar ou remover a linha de conexão pontilhada.</span>
          <button
            onClick={() => setConnectingFromId(null)}
            className="text-[10px] uppercase font-bold text-amber-600 dark:text-amber-300 hover:underline cursor-pointer"
          >
            Cancelar
          </button>
        </div>
      )}

      {/* VIEW CONDITIONAL RENDERING */}
      {viewMode === "grid" ? (
        <div className="flex-1 overflow-y-auto select-none min-h-0 pb-8" id="postits-grid-layout">
          {filteredItems.length === 0 ? (
            <div className="text-center p-12 bg-white dark:bg-zinc-900 rounded-3xl border border-gray-150 dark:border-zinc-850 py-16">
              <StickyNote className="w-12 h-12 text-gray-300 dark:text-zinc-750 mx-auto mb-3" />
              <p className="text-sm font-semibold text-gray-800 dark:text-zinc-100">Não há post-its criados no quadro atual</p>
              <p className="text-xs text-gray-500 dark:text-zinc-400 mt-1">
                Adicione lembretes de tarefas, blocos de post-its de ideias, avisos ou metas rápidas.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4" id="postits-grid-items">
              {filteredItems.map((item) => {
                return (
                  <div
                    id={`grid-postit-${item.id}`}
                    key={item.id}
                    className={`relative border p-5 rounded-2xl flex flex-col justify-between shadow-xs hover:shadow-md transition-all gap-4 min-h-[170px] ${item.color}`}
                  >
                    {/* Top Bar with actions */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-sky-500 shrink-0 animate-pulse" />
                        <span className="text-[10px] font-bold uppercase tracking-wider opacity-60">Post-it</span>
                      </div>
                      {canEdit && (
                        <div className="flex items-center gap-1">
                          <button
                            id={`grid-connect-btn-${item.id}`}
                            onClick={() => handleStartConnection(item.id)}
                            className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                              connectingFromId === item.id
                                ? "bg-amber-500 text-white"
                                : "hover:bg-black/5 text-gray-500"
                            }`}
                            title="Conectar com outro post-it"
                          >
                            <Link className="w-3.5 h-3.5" />
                          </button>
                          <button
                            id={`grid-delete-btn-${item.id}`}
                            onClick={() => {
                              if (window.confirm("Deseja apagar este post-it do quadro?")) {
                                deleteWhiteboardItem(item.id);
                              }
                            }}
                            className="p-1.5 rounded-lg hover:bg-black/5 hover:text-red-500 text-gray-500 transition-all cursor-pointer"
                            title="Excluir post-it"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Content text */}
                    <p className="text-xs font-semibold leading-relaxed break-words" style={{ wordBreak: "break-word" }}>
                      {item.text}
                    </p>

                    {/* Footer creator and links */}
                    <div className="border-t border-black/5 dark:border-white/5 pt-3 flex items-center justify-between gap-2 text-[10px]">
                      <div className="flex items-center gap-1.5 overflow-hidden">
                        <span
                          className={`w-5 h-5 rounded-full shrink-0 flex items-center justify-center font-bold text-[9px] uppercase border ${
                            item.creatorColor || "text-sky-500 bg-sky-500/10 border-sky-500/30"
                          }`}
                        >
                          {item.creatorName.charAt(0)}
                        </span>
                        <span className="truncate font-semibold opacity-75">{item.creatorName}</span>
                      </div>
                      {item.connections && item.connections.length > 0 && (
                        <div className="flex items-center gap-1 bg-black/5 dark:bg-white/5 px-1.5 py-0.5 rounded-md font-bold opacity-75 shrink-0 select-none">
                          <Link className="w-2.5 h-2.5 text-sky-600 dark:text-sky-400" />
                          <span>{item.connections.length}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* CANVAS STAGE (SCROLLABLE ON MOBILE, SPACIOUS CANVAS DIMENSIONS) */
        <>
          <div
            id="whiteboard-scroll-wrapper"
            className="flex-1 overflow-auto border border-gray-250 dark:border-zinc-800 rounded-3xl bg-gray-50/50 dark:bg-zinc-950 p-0 relative min-h-[350px]"
          >
            <div
              id="whiteboard-canvas-stage"
              ref={containerRef}
              className="relative w-[1300px] h-[850px] shrink-0"
              style={{
                backgroundImage: "radial-gradient(#cbd5e1 1.2px, transparent 1.2px)",
                backgroundSize: "24px 24px"
              }}
            >
              {/* Render Connection Lines vector layer */}
              <svg className="absolute inset-0 pointer-events-none select-none w-full h-full z-0 overflow-visible">
                {renderedConnections.map((conn) => (
                  <line
                    key={conn.id}
                    x1={conn.x1}
                    y1={conn.y1}
                    x2={conn.x2}
                    y2={conn.y2}
                    className="stroke-sky-500/80 dark:stroke-sky-400/80 stroke-2"
                    strokeDasharray="4 4"
                  />
                ))}
              </svg>
              {/* Render Post-its */}
              {filteredItems.map((item) => {
                const isConnectingSource = connectingFromId === item.id;
                return (
                  <div
                    id={`postit-${item.id}`}
                    key={item.id}
                    onClick={(e) => {
                      if (connectingFromId && connectingFromId !== item.id) {
                        e.stopPropagation();
                        handleStartConnection(item.id);
                      }
                    }}
                    style={{
                      position: "absolute",
                      transform: `translate(${item.x}px, ${item.y}px)`,
                      touchAction: "none",
                    }}
                    className={`w-44 h-44 border p-4.5 rounded-2xl flex flex-col justify-between shadow-md group transition-all hover:shadow-lg select-none ${
                      isConnectingSource
                        ? "ring-4 ring-amber-500 dark:ring-amber-400 border-amber-500 scale-[1.02] shadow-xl z-20"
                        : "z-10"
                    } ${item.color} ${connectingFromId && connectingFromId !== item.id ? "cursor-pointer hover:ring-2 hover:ring-sky-405" : ""}`}
                  >
                    {/* Drag Handle Top Banner */}
                    <div
                      onPointerDown={(e) => handlePointerDown(e, item.id, item.x, item.y)}
                      onPointerMove={handlePointerMove}
                      onPointerUp={handlePointerUp}
                      className="absolute top-0 left-0 right-0 h-8 flex items-center justify-between px-3 cursor-grab active:cursor-grabbing text-gray-400 group-hover:text-gray-500 rounded-t-2xl bg-black/5 dark:bg-white/5 active:bg-black/10"
                      title="Arraste para mover"
                    >
                      <Move className="w-3.5 h-3.5" />
                      {canEdit && (
                        <div className="flex items-center gap-1.5 ml-auto pointer-events-auto">
                          <button
                            id={`connect-postit-btn-${item.id}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStartConnection(item.id);
                            }}
                            className={`p-1 rounded transition-all cursor-pointer ${
                              isConnectingSource
                                ? "bg-amber-500 hover:bg-amber-400 text-white shadow-xs"
                                : "hover:bg-black/10 hover:text-sky-500 text-gray-400"
                            }`}
                            title={connectingFromId ? "Clique aqui para finalizar a conexão" : "Conectar com outro post-it"}
                          >
                            <Link className="w-3.5 h-3.5" />
                          </button>

                          <button
                            id={`delete-postit-btn-${item.id}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteWhiteboardItem(item.id);
                            }}
                            className="p-1 rounded hover:bg-black/10 hover:text-red-500 text-gray-400 transition-all cursor-pointer"
                            title="Excluir post-it"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Note Text content */}
                    <div className="flex-1 pt-6 overflow-y-auto leading-normal text-xs font-semibold select-text" style={{ wordBreak: "break-word" }}>
                      {item.text}
                    </div>

                    {/* Sticky bottom branding (identifying user color and initials) */}
                    <div className="border-t border-black/5 dark:border-white/5 pt-1.5 mt-2 flex items-center justify-between gap-1.5 shrink-0 text-[10px]">
                      <div className="flex items-center gap-1.5 overflow-hidden">
                        <span
                          title={item.creatorName}
                          className={`w-5 h-5 rounded-full shrink-0 flex items-center justify-center font-bold text-[9px] uppercase border ${
                            item.creatorColor || "text-sky-500 bg-sky-500/10 border-sky-500/30"
                          }`}
                        >
                          {item.creatorName.charAt(0)}
                        </span>
                        <span className="truncate opacity-75 font-semibold">{item.creatorName}</span>
                      </div>
                    </div>
                  </div>
                );
              })}

              {filteredItems.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
                  <div className="text-center p-8 bg-white/40 dark:bg-zinc-900/40 rounded-3xl max-w-xs border border-gray-150 dark:border-zinc-850">
                    <StickyNote className="w-10 h-10 text-gray-300 dark:text-zinc-750 mx-auto mb-2" />
                    <p className="text-xs text-gray-500 dark:text-zinc-400 font-medium">
                      O quadro branco colaborativo está sem post-its. Clique em "Inserir Post-it" para iniciar.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Touch Screen Help alert indicator */}
          <div className="md:hidden mt-2 p-3 bg-sky-50/80 dark:bg-sky-950/20 border border-sky-100 dark:border-sky-900/30 rounded-2xl text-[11px] text-sky-700 dark:text-sky-350 flex items-start gap-2 select-none shadow-xs">
            <Info className="w-4 h-4 text-sky-500 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Dica mobile:</span> Se preferir, troque para o modo <span className="font-bold">"Lista Organizada"</span> no topo para gerenciar os post-its em formato de cartões limpos e totalmente responsivos.
            </div>
          </div>
        </>
      )}

      {/* DIALOG OVERLAY: CREATE NOTE */}
      <AnimatePresence>
        {showAddForm && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-zinc-900 rounded-3xl p-6 w-full max-w-sm border border-gray-200 dark:border-zinc-800 shadow-2xl relative"
            >
              <button
                id="close-add-postit-btn"
                onClick={() => setShowAddForm(false)}
                className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>

              <h3 className="text-sm font-bold text-gray-900 dark:text-zinc-50 mb-4 flex items-center gap-2">
                <StickyNote className="w-5 h-5 text-sky-500" />
                <span>Adicionar Post-it</span>
              </h3>

              <form onSubmit={handleAddPostIt} className="space-y-4 text-xs">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Texto da nota</label>
                  <textarea
                    id="new-postit-text"
                    value={noteInput}
                    onChange={(e) => setNoteInput(e.target.value)}
                    maxLength={140}
                    placeholder="Escreva sua ideia (Máximo 140 caracteres)..."
                    className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-zinc-850 border border-gray-205 dark:border-zinc-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-sky-500 text-gray-900 dark:text-white h-24 resize-none"
                    required
                  />
                  <div className="text-right text-[10px] text-gray-400 mt-1">
                    {140 - noteInput.length} caracteres restantes
                  </div>
                </div>

                {/* Color Selection grids */}
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-2">Tema da Nota</label>
                  <div className="grid grid-cols-5 gap-1.5">
                    {POST_IT_COLORS.map((colorObj, index) => (
                      <button
                        id={`postit-color-btn-${index}`}
                        key={index}
                        type="button"
                        onClick={() => setSelectedColorIdx(index)}
                        className={`aspect-square rounded-xl border-2 transition-all p-0.5 ${
                          selectedColorIdx === index
                            ? "border-sky-500 scale-95"
                            : "border-transparent"
                        }`}
                      >
                        <div className={`w-full h-full rounded-lg ${colorObj.bg.split(" ")[0]} border ${colorObj.bg.split(" ")[2]}`} />
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2 justify-end font-semibold pt-2">
                  <button
                    id="cancel-create-postit"
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    className="px-3 py-2 hover:bg-zinc-105 dark:hover:bg-zinc-800 text-gray-500 rounded-lg"
                  >
                    Fechar
                  </button>
                  <button
                    id="submit-create-postit"
                    type="submit"
                    className="px-5 py-2.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl shadow-xs transition-all"
                  >
                    Postar no Quadro
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
