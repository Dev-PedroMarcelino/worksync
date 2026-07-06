/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect, useCallback } from "react";
import { useApp } from "../context/AppContext";
import {
  Plus,
  Trash2,
  StickyNote,
  X,
  Link2,
  Link2Off,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Locate,
  LayoutGrid,
  Frame,
  Search,
  Copy,
  Pencil,
  Check,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useConfirm } from "../context/ConfirmContext";
import { useToast } from "../context/ToastContext";
import { WhiteboardItem } from "../types";

interface WhiteboardCanvasProps {
  canEdit: boolean;
}

/**
 * Post-it palette. `cls` is a Tailwind class string (kept in the exact legacy
 * format so notes created by older versions still map to a palette entry) and
 * `dot` is a solid colour used for the picker swatch and connection lines.
 */
const POST_IT_COLORS = [
  { name: "Amarelo", dot: "#f59e0b", cls: "bg-amber-100 dark:bg-amber-900 border-amber-300 dark:border-amber-750 text-amber-950 dark:text-amber-50" },
  { name: "Verde", dot: "#10b981", cls: "bg-emerald-100 dark:bg-emerald-900 border-emerald-300 dark:border-emerald-750 text-emerald-950 dark:text-emerald-50" },
  { name: "Azul", dot: "#0ea5e9", cls: "bg-sky-100 dark:bg-sky-900 border-sky-300 dark:border-sky-750 text-sky-950 dark:text-sky-50" },
  { name: "Lilás", dot: "#8b5cf6", cls: "bg-violet-100 dark:bg-violet-900 border-violet-300 dark:border-violet-750 text-violet-950 dark:text-violet-50" },
  { name: "Rosa", dot: "#f43f5e", cls: "bg-rose-100 dark:bg-rose-900 border-rose-300 dark:border-rose-750 text-rose-950 dark:text-rose-50" },
  { name: "Laranja", dot: "#f97316", cls: "bg-orange-100 dark:bg-orange-900 border-orange-300 dark:border-orange-750 text-orange-950 dark:text-orange-50" },
  { name: "Cinza", dot: "#64748b", cls: "bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-950 dark:text-slate-50" },
];

const NOTE_W = 224;
const NOTE_H = 168;
const MIN_SCALE = 0.35;
const MAX_SCALE = 2.2;

const dotForColor = (cls: string) => POST_IT_COLORS.find((c) => c.cls === cls)?.dot || "#0ea5e9";

export const WhiteboardCanvas: React.FC<WhiteboardCanvasProps> = ({ canEdit }) => {
  const {
    whiteboardItems,
    addWhiteboardItem,
    updateWhiteboardItemPosition,
    updateWhiteboardItem,
    deleteWhiteboardItem,
    toggleWhiteboardConnection,
    whiteboardBoards,
    activeBoardId,
    setActiveBoardId,
    createWhiteboardBoard,
    deleteWhiteboardBoard,
  } = useApp();
  const confirm = useConfirm();
  const toast = useToast();

  // ── View state ──────────────────────────────────────────────────────────
  const [viewMode, setViewMode] = useState<"canvas" | "list">("canvas");
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 40, y: 40 });

  // ── Interaction state ───────────────────────────────────────────────────
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");
  const [connectingFromId, setConnectingFromId] = useState<string | null>(null);
  const [colorIdx, setColorIdx] = useState(0);
  const [search, setSearch] = useState("");

  // ── Board mgmt state ────────────────────────────────────────────────────
  const [isCreatingBoard, setIsCreatingBoard] = useState(false);
  const [newBoardName, setNewBoardName] = useState("");

  // ── Refs ────────────────────────────────────────────────────────────────
  const viewportRef = useRef<HTMLDivElement>(null);
  const worldRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ id: string; sx: number; sy: number; ox: number; oy: number; moved: boolean } | null>(null);
  const panRef = useRef<{ sx: number; sy: number; px: number; py: number; active: boolean } | null>(null);
  const justCreatedRef = useRef<string | null>(null);
  const didInitRef = useRef(false);

  const currentBoardId = activeBoardId || "default";
  const boardItems = whiteboardItems.filter((it) => (it.boardId || "default") === currentBoardId);

  const matchesSearch = (it: WhiteboardItem) =>
    !search.trim() || it.text.toLowerCase().includes(search.trim().toLowerCase());

  // ── Coordinate helpers ──────────────────────────────────────────────────
  const screenToWorld = useCallback(
    (clientX: number, clientY: number) => {
      const rect = viewportRef.current?.getBoundingClientRect();
      if (!rect) return { x: 0, y: 0 };
      return {
        x: (clientX - rect.left - pan.x) / scale,
        y: (clientY - rect.top - pan.y) / scale,
      };
    },
    [pan, scale]
  );

  const applyWorldTransform = (px: number, py: number, s: number) => {
    if (worldRef.current) worldRef.current.style.transform = `translate(${px}px, ${py}px) scale(${s})`;
  };

  // ── Fit / reset ─────────────────────────────────────────────────────────
  const fitView = useCallback(() => {
    const rect = viewportRef.current?.getBoundingClientRect();
    if (!rect) return;
    if (boardItems.length === 0) {
      setScale(1);
      setPan({ x: 40, y: 40 });
      return;
    }
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    boardItems.forEach((it) => {
      minX = Math.min(minX, it.x);
      minY = Math.min(minY, it.y);
      maxX = Math.max(maxX, it.x + NOTE_W);
      maxY = Math.max(maxY, it.y + NOTE_H);
    });
    const pad = 80;
    const contentW = maxX - minX + pad * 2;
    const contentH = maxY - minY + pad * 2;
    const s = Math.max(MIN_SCALE, Math.min(MAX_SCALE, Math.min(rect.width / contentW, rect.height / contentH, 1.2)));
    const nx = (rect.width - (maxX - minX) * s) / 2 - minX * s;
    const ny = (rect.height - (maxY - minY) * s) / 2 - minY * s;
    setScale(s);
    setPan({ x: nx, y: ny });
  }, [boardItems]);

  // Fit once when the board first has content.
  useEffect(() => {
    if (didInitRef.current) return;
    if (boardItems.length > 0) {
      didInitRef.current = true;
      // defer so the viewport has a measured size
      requestAnimationFrame(() => fitView());
    }
  }, [boardItems.length, fitView]);

  // Re-fit view baseline whenever the active board changes.
  useEffect(() => {
    didInitRef.current = false;
    setSelectedId(null);
    setEditingId(null);
    setConnectingFromId(null);
  }, [currentBoardId]);

  const zoomTo = useCallback(
    (nextScale: number, centerX?: number, centerY?: number) => {
      const rect = viewportRef.current?.getBoundingClientRect();
      if (!rect) return;
      const s = Math.max(MIN_SCALE, Math.min(MAX_SCALE, nextScale));
      const cx = centerX ?? rect.width / 2;
      const cy = centerY ?? rect.height / 2;
      // keep the point under (cx,cy) stable
      const wx = (cx - pan.x) / scale;
      const wy = (cy - pan.y) / scale;
      setPan({ x: cx - wx * s, y: cy - wy * s });
      setScale(s);
    },
    [pan, scale]
  );

  // Native, non-passive wheel handler for zoom (ctrl/⌘ + wheel) and pan.
  useEffect(() => {
    const el = viewportRef.current;
    if (!el || viewMode !== "canvas") return;
    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const rect = el.getBoundingClientRect();
        const factor = Math.exp(-e.deltaY * 0.0015);
        zoomTo(scale * factor, e.clientX - rect.left, e.clientY - rect.top);
      } else {
        e.preventDefault();
        setPan((p) => ({ x: p.x - e.deltaX, y: p.y - e.deltaY }));
      }
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [viewMode, scale, zoomTo]);

  // ── Note creation ───────────────────────────────────────────────────────
  const createNoteAt = async (wx: number, wy: number) => {
    if (!canEdit) return;
    const id = await addWhiteboardItem("", POST_IT_COLORS[colorIdx].cls, Math.round(wx - NOTE_W / 2), Math.round(wy - NOTE_H / 2));
    if (typeof id === "string") {
      justCreatedRef.current = id;
      setSelectedId(id);
      setEditingId(id);
      setEditingText("");
    }
  };

  const handleCanvasDoubleClick = (e: React.MouseEvent) => {
    if (!canEdit || connectingFromId) return;
    // ignore double clicks that originate on a note
    if ((e.target as HTMLElement).closest("[data-note]")) return;
    const w = screenToWorld(e.clientX, e.clientY);
    createNoteAt(w.x, w.y);
  };

  const handleAddButton = async () => {
    const rect = viewportRef.current?.getBoundingClientRect();
    if (!rect) return;
    const w = screenToWorld(rect.left + rect.width / 2, rect.top + rect.height / 3);
    await createNoteAt(w.x, w.y);
  };

  // ── Editing ─────────────────────────────────────────────────────────────
  const startEditing = (it: WhiteboardItem) => {
    if (!canEdit) return;
    setEditingId(it.id);
    setEditingText(it.text);
    setSelectedId(it.id);
  };

  const commitEditing = async () => {
    const id = editingId;
    if (!id) return;
    const text = editingText;
    const wasJustCreated = justCreatedRef.current === id;
    justCreatedRef.current = null;
    setEditingId(null);
    if (!text.trim()) {
      // Drop empty freshly-created notes so double-click + click-away leaves nothing behind.
      if (wasJustCreated) {
        await deleteWhiteboardItem(id);
        setSelectedId(null);
      }
      return;
    }
    await updateWhiteboardItem(id, { text: text.trim() });
  };

  const cancelEditing = async () => {
    const id = editingId;
    const wasJustCreated = justCreatedRef.current === id;
    justCreatedRef.current = null;
    setEditingId(null);
    if (wasJustCreated && id) {
      await deleteWhiteboardItem(id);
      setSelectedId(null);
    }
  };

  // ── Recolour (acts on the selected note, else sets the default) ──────────
  const pickColor = (idx: number) => {
    if (selectedId && canEdit) {
      updateWhiteboardItem(selectedId, { color: POST_IT_COLORS[idx].cls });
    }
    setColorIdx(idx);
  };

  // ── Duplicate ───────────────────────────────────────────────────────────
  const duplicateNote = async (it: WhiteboardItem) => {
    if (!canEdit) return;
    const id = await addWhiteboardItem(it.text, it.color, it.x + 28, it.y + 28);
    if (typeof id === "string") setSelectedId(id);
  };

  // ── Connections ─────────────────────────────────────────────────────────
  const handleConnectClick = async (id: string) => {
    if (!connectingFromId) {
      setConnectingFromId(id);
      return;
    }
    if (connectingFromId === id) {
      setConnectingFromId(null);
      return;
    }
    await toggleWhiteboardConnection(connectingFromId, id);
    setConnectingFromId(null);
  };

  // ── Pointer: pan on background, drag on notes ───────────────────────────
  const onViewportPointerDown = (e: React.PointerEvent) => {
    if (viewMode !== "canvas") return;
    const target = e.target as HTMLElement;
    if (target.closest("[data-note]") || target.closest("[data-toolbar]")) return;
    // Clicking empty canvas: deselect + begin panning.
    setSelectedId(null);
    if (editingId) commitEditing();
    panRef.current = { sx: e.clientX, sy: e.clientY, px: pan.x, py: pan.y, active: true };
    viewportRef.current?.setPointerCapture(e.pointerId);
  };

  const onNotePointerDown = (e: React.PointerEvent, it: WhiteboardItem) => {
    if (viewMode !== "canvas") return;
    e.stopPropagation();
    if (connectingFromId) return; // in connect mode a click connects, no drag
    setSelectedId(it.id);
    if (editingId && editingId !== it.id) commitEditing();
    if (!canEdit || editingId === it.id) return;
    dragRef.current = { id: it.id, sx: e.clientX, sy: e.clientY, ox: it.x, oy: it.y, moved: false };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (panRef.current?.active) {
      const p = panRef.current;
      const nx = p.px + (e.clientX - p.sx);
      const ny = p.py + (e.clientY - p.sy);
      applyWorldTransform(nx, ny, scale);
      if (viewportRef.current) viewportRef.current.style.backgroundPosition = `${nx}px ${ny}px`;
      return;
    }
    const d = dragRef.current;
    if (d) {
      const dx = (e.clientX - d.sx) / scale;
      const dy = (e.clientY - d.sy) / scale;
      if (Math.abs(e.clientX - d.sx) > 3 || Math.abs(e.clientY - d.sy) > 3) d.moved = true;
      const el = document.getElementById(`note-${d.id}`);
      if (el) el.style.transform = `translate(${d.ox + dx}px, ${d.oy + dy}px)`;
    }
  };

  const onPointerUp = async (e: React.PointerEvent) => {
    if (panRef.current?.active) {
      const p = panRef.current;
      panRef.current = null;
      setPan({ x: p.px + (e.clientX - p.sx), y: p.py + (e.clientY - p.sy) });
      return;
    }
    const d = dragRef.current;
    if (d) {
      dragRef.current = null;
      if (d.moved) {
        const dx = (e.clientX - d.sx) / scale;
        const dy = (e.clientY - d.sy) / scale;
        await updateWhiteboardItemPosition(d.id, Math.round(d.ox + dx), Math.round(d.oy + dy));
      }
    }
  };

  // ── Keyboard shortcuts ──────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const ae = document.activeElement as HTMLElement | null;
      const typing = ae && (ae.tagName === "INPUT" || ae.tagName === "TEXTAREA" || ae.isContentEditable);
      if (e.key === "Escape") {
        if (connectingFromId) setConnectingFromId(null);
        else if (editingId) cancelEditing();
        else setSelectedId(null);
        return;
      }
      if (typing || editingId) return;
      if ((e.key === "Delete" || e.key === "Backspace") && selectedId && canEdit) {
        e.preventDefault();
        deleteWhiteboardItem(selectedId);
        setSelectedId(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, editingId, connectingFromId, canEdit]);

  // ── Connection segments (world coords) ──────────────────────────────────
  const connections: { id: string; x1: number; y1: number; x2: number; y2: number; color: string }[] = [];
  const seen = new Set<string>();
  boardItems.forEach((it) => {
    (it.connections || []).forEach((tid) => {
      const t = boardItems.find((i) => i.id === tid);
      if (!t) return;
      const key = [it.id, tid].sort().join("-");
      if (seen.has(key)) return;
      seen.add(key);
      connections.push({
        id: key,
        x1: it.x + NOTE_W / 2,
        y1: it.y + NOTE_H / 2,
        x2: t.x + NOTE_W / 2,
        y2: t.y + NOTE_H / 2,
        color: dotForColor(it.color),
      });
    });
  });

  const selectedItem = boardItems.find((i) => i.id === selectedId) || null;

  // ═══════════════════════════════════════════════════════════════════════
  return (
    <div className="h-full flex flex-col min-h-0 font-sans select-none" id="whiteboard-module-container">
      {/* HEADER: title + search + view toggle */}
      <div className="mb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <span className="p-1 px-2.5 bg-sky-500/10 text-sky-600 rounded-lg text-xs font-bold leading-relaxed shrink-0">
            Quadro Branco
          </span>
          <p className="text-xs text-gray-500 dark:text-zinc-400 hidden lg:inline-block truncate">
            Dê dois cliques no quadro para criar um post-it. Arraste para mover, clique para editar.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              id="whiteboard-search"
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Localizar..."
              className="w-32 sm:w-40 text-xs pl-8 pr-3 py-2 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-sky-500 text-gray-900 dark:text-zinc-50"
            />
          </div>
          <div className="flex items-center p-1 bg-gray-150/80 dark:bg-zinc-800/80 rounded-xl border border-gray-200/50 dark:border-zinc-850 text-xs">
            <button
              id="viewmode-canvas-btn"
              type="button"
              onClick={() => setViewMode("canvas")}
              className={`px-2.5 py-1.5 font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                viewMode === "canvas"
                  ? "bg-white dark:bg-zinc-700 text-gray-900 dark:text-white shadow-xs"
                  : "text-gray-500 dark:text-zinc-400 hover:text-gray-800 dark:hover:text-zinc-200"
              }`}
              title="Quadro visual"
            >
              <Frame className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Quadro</span>
            </button>
            <button
              id="viewmode-list-btn"
              type="button"
              onClick={() => setViewMode("list")}
              className={`px-2.5 py-1.5 font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                viewMode === "list"
                  ? "bg-white dark:bg-zinc-700 text-gray-900 dark:text-white shadow-xs"
                  : "text-gray-500 dark:text-zinc-400 hover:text-gray-800 dark:hover:text-zinc-200"
              }`}
              title="Lista"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Lista</span>
            </button>
          </div>
        </div>
      </div>

      {/* BOARDS BAR */}
      <div className="mb-3 flex flex-wrap items-center gap-2 shrink-0 text-xs">
        <span className="font-bold text-[10px] text-gray-400 uppercase tracking-wider shrink-0">Quadros</span>
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          <button
            id="board-tab-default"
            type="button"
            onClick={() => setActiveBoardId(null)}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all whitespace-nowrap cursor-pointer ${
              !activeBoardId
                ? "bg-sky-600 text-white shadow-xs"
                : "bg-white dark:bg-zinc-800 text-gray-650 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-750 border border-gray-150 dark:border-zinc-750"
            }`}
          >
            Principal
          </button>
          {whiteboardBoards.map((board) => {
            const isActive = activeBoardId === board.id;
            return (
              <div
                key={board.id}
                className={`flex items-center gap-1 pl-3 pr-2 py-1.5 rounded-lg font-bold transition-all whitespace-nowrap ${
                  isActive
                    ? "bg-sky-600 text-white shadow-xs"
                    : "bg-white dark:bg-zinc-800 text-gray-650 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-750 border border-gray-150 dark:border-zinc-750"
                }`}
              >
                <button type="button" onClick={() => setActiveBoardId(board.id)} className="cursor-pointer">
                  {board.name}
                </button>
                {canEdit && (
                  <button
                    type="button"
                    onClick={async (e) => {
                      e.stopPropagation();
                      if (
                        await confirm({
                          title: "Apagar quadro",
                          message: `Apagar o quadro "${board.name}" e todos os seus post-its?`,
                          confirmLabel: "Apagar",
                          tone: "danger",
                        })
                      ) {
                        deleteWhiteboardBoard(board.id);
                        if (isActive) setActiveBoardId(null);
                      }
                    }}
                    className={`p-0.5 rounded hover:bg-black/10 transition-all cursor-pointer ${
                      isActive ? "text-white/80 hover:text-white" : "text-gray-400 hover:text-red-500"
                    }`}
                    title="Excluir quadro"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
        {canEdit &&
          (isCreatingBoard ? (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!newBoardName.trim()) return;
                try {
                  await createWhiteboardBoard(newBoardName.trim());
                  setNewBoardName("");
                  setIsCreatingBoard(false);
                } catch {
                  toast("Erro ao criar quadro");
                }
              }}
              className="flex items-center gap-1"
            >
              <input
                type="text"
                placeholder="Nome do quadro..."
                value={newBoardName}
                onChange={(e) => setNewBoardName(e.target.value)}
                className="px-2 py-1 bg-white dark:bg-zinc-850 border border-gray-200 dark:border-zinc-700 rounded-lg text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-sky-500 w-32"
                required
                autoFocus
              />
              <button type="submit" className="p-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg cursor-pointer" title="Criar">
                <Check className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsCreatingBoard(false);
                  setNewBoardName("");
                }}
                className="p-1.5 bg-gray-250 dark:bg-zinc-750 text-gray-600 dark:text-zinc-350 rounded-lg cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => setIsCreatingBoard(true)}
              className="px-2.5 py-1.5 bg-sky-500/10 hover:bg-sky-500/20 text-sky-600 dark:text-sky-400 rounded-lg font-bold transition-all flex items-center gap-1 cursor-pointer shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Novo</span>
            </button>
          ))}
      </div>

      {/* ══════════════ CANVAS VIEW ══════════════ */}
      {viewMode === "canvas" ? (
        <div
          ref={viewportRef}
          id="whiteboard-viewport"
          onPointerDown={onViewportPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onDoubleClick={handleCanvasDoubleClick}
          className={`flex-1 relative overflow-hidden rounded-3xl border border-gray-250 dark:border-zinc-800 bg-gray-50/60 dark:bg-zinc-950 min-h-[340px] ${
            panRef.current?.active ? "cursor-grabbing" : "cursor-grab"
          }`}
          style={{
            backgroundImage:
              "radial-gradient(circle, rgba(100,116,139,0.28) 1px, transparent 1px)",
            backgroundSize: `${24 * scale}px ${24 * scale}px`,
            backgroundPosition: `${pan.x}px ${pan.y}px`,
            touchAction: "none",
          }}
        >
          {/* World layer (panned & zoomed) */}
          <div
            ref={worldRef}
            className="absolute top-0 left-0 origin-top-left"
            style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})` }}
          >
            {/* Connections */}
            <svg className="absolute overflow-visible pointer-events-none" style={{ left: 0, top: 0, width: 1, height: 1, zIndex: 0 }}>
              {connections.map((c) => {
                const mx = (c.x1 + c.x2) / 2;
                const my = (c.y1 + c.y2) / 2;
                return (
                  <path
                    key={c.id}
                    d={`M ${c.x1} ${c.y1} Q ${mx} ${my} ${c.x2} ${c.y2}`}
                    fill="none"
                    stroke={c.color}
                    strokeWidth={2.5}
                    strokeLinecap="round"
                    strokeDasharray="1 7"
                    opacity={0.75}
                  />
                );
              })}
            </svg>

            {/* Notes */}
            {boardItems.map((it) => {
              const isSelected = selectedId === it.id;
              const isEditing = editingId === it.id;
              const isConnectSource = connectingFromId === it.id;
              const dim = !matchesSearch(it);
              return (
                <div
                  key={it.id}
                  id={`note-${it.id}`}
                  data-note
                  onPointerDown={(e) => onNotePointerDown(e, it)}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (connectingFromId) handleConnectClick(it.id);
                  }}
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    if (!connectingFromId) startEditing(it);
                  }}
                  style={{ transform: `translate(${it.x}px, ${it.y}px)`, width: NOTE_W, minHeight: NOTE_H }}
                  className={`absolute rounded-2xl border shadow-md flex flex-col transition-shadow ${it.color} ${
                    isSelected ? "ring-2 ring-sky-500 dark:ring-sky-400 z-30 shadow-xl" : "z-10"
                  } ${isConnectSource ? "ring-2 ring-amber-500 dark:ring-amber-400" : ""} ${
                    connectingFromId && !isConnectSource ? "cursor-pointer hover:ring-2 hover:ring-amber-400" : "cursor-grab active:cursor-grabbing"
                  } ${dim ? "opacity-25" : "opacity-100"}`}
                >
                  {/* Selected note action bar */}
                  {isSelected && !isEditing && canEdit && (
                    <div
                      data-toolbar
                      className="absolute -top-9 left-1/2 -translate-x-1/2 flex items-center gap-0.5 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-xl shadow-lg px-1 py-1 z-40"
                      onPointerDown={(e) => e.stopPropagation()}
                    >
                      <button onClick={(e) => { e.stopPropagation(); startEditing(it); }} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-500 hover:text-sky-500" title="Editar (duplo clique)">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); handleConnectClick(it.id); }} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-500 hover:text-amber-500" title="Conectar">
                        <Link2 className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); duplicateNote(it); }} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-500 hover:text-emerald-500" title="Duplicar">
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      <div className="w-px h-4 bg-gray-200 dark:bg-zinc-700 mx-0.5" />
                      <button onClick={(e) => { e.stopPropagation(); deleteWhiteboardItem(it.id); setSelectedId(null); }} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 text-gray-500 hover:text-red-500" title="Excluir (Del)">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  {/* Body */}
                  {isEditing ? (
                    <textarea
                      autoFocus
                      value={editingText}
                      onChange={(e) => setEditingText(e.target.value)}
                      onPointerDown={(e) => e.stopPropagation()}
                      onBlur={commitEditing}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          commitEditing();
                        }
                        if (e.key === "Escape") {
                          e.preventDefault();
                          cancelEditing();
                        }
                      }}
                      placeholder="Escreva aqui..."
                      className="flex-1 w-full bg-transparent resize-none outline-none p-3.5 text-sm font-semibold leading-snug placeholder:opacity-50"
                      style={{ minHeight: NOTE_H - 24 }}
                    />
                  ) : (
                    <div className="flex-1 p-3.5 text-sm font-semibold leading-snug whitespace-pre-wrap break-words overflow-hidden">
                      {it.text || <span className="opacity-40 italic font-normal">Post-it vazio — duplo clique para escrever</span>}
                    </div>
                  )}

                  {/* Footer */}
                  <div className="flex items-center justify-between gap-1.5 px-3 pb-2 pt-1 text-[10px] border-t border-black/5 dark:border-white/10">
                    <div className="flex items-center gap-1.5 overflow-hidden">
                      <span
                        className={`w-4 h-4 rounded-full shrink-0 flex items-center justify-center font-bold text-[8px] uppercase border ${
                          it.creatorColor || "text-sky-500 bg-sky-500/10 border-sky-500/30"
                        }`}
                      >
                        {it.creatorName?.charAt(0) || "?"}
                      </span>
                      <span className="truncate opacity-70 font-semibold">{it.creatorName}</span>
                    </div>
                    {it.connections && it.connections.length > 0 && (
                      <span className="flex items-center gap-0.5 opacity-70 font-bold">
                        <Link2 className="w-2.5 h-2.5" />
                        {it.connections.length}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Empty state */}
          {boardItems.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center px-8 py-7 bg-white/70 dark:bg-zinc-900/70 backdrop-blur-sm rounded-3xl border border-gray-200 dark:border-zinc-800 max-w-xs">
                <StickyNote className="w-10 h-10 text-sky-400 mx-auto mb-2.5" />
                <p className="text-sm font-bold text-gray-800 dark:text-zinc-100">Quadro em branco</p>
                <p className="text-xs text-gray-500 dark:text-zinc-400 mt-1">
                  Dê dois cliques em qualquer lugar (ou use o botão <span className="font-bold text-sky-500">＋ Post-it</span>) para começar.
                </p>
              </div>
            </div>
          )}

          {/* Floating toolbar: add + colours */}
          <div data-toolbar className="absolute top-3 left-3 flex flex-col gap-2" onPointerDown={(e) => e.stopPropagation()}>
            {canEdit && (
              <button
                onClick={handleAddButton}
                className="px-3.5 py-2 bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-lg transition-all cursor-pointer"
                title="Adicionar post-it"
              >
                <Plus className="w-4 h-4" /> Post-it
              </button>
            )}
            {canEdit && (
              <div className="flex items-center gap-1 bg-white/90 dark:bg-zinc-900/90 backdrop-blur border border-gray-200 dark:border-zinc-800 rounded-xl p-1.5 shadow-md">
                {POST_IT_COLORS.map((c, idx) => {
                  const active = selectedItem ? selectedItem.color === c.cls : colorIdx === idx;
                  return (
                    <button
                      key={c.name}
                      onClick={() => pickColor(idx)}
                      title={selectedItem ? `Pintar de ${c.name}` : c.name}
                      className={`w-5 h-5 rounded-full transition-all cursor-pointer border-2 ${active ? "scale-110 border-sky-500" : "border-transparent hover:scale-105"}`}
                      style={{ backgroundColor: c.dot }}
                    />
                  );
                })}
              </div>
            )}
          </div>

          {/* Floating zoom controls */}
          <div data-toolbar className="absolute bottom-3 right-3 flex items-center gap-1 bg-white/90 dark:bg-zinc-900/90 backdrop-blur border border-gray-200 dark:border-zinc-800 rounded-xl p-1 shadow-md" onPointerDown={(e) => e.stopPropagation()}>
            <button onClick={() => zoomTo(scale - 0.2)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-600 dark:text-zinc-300 cursor-pointer" title="Diminuir zoom">
              <ZoomOut className="w-4 h-4" />
            </button>
            <button onClick={() => zoomTo(1)} className="px-1.5 text-[11px] font-bold text-gray-600 dark:text-zinc-300 tabular-nums cursor-pointer w-11" title="Redefinir zoom">
              {Math.round(scale * 100)}%
            </button>
            <button onClick={() => zoomTo(scale + 0.2)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-600 dark:text-zinc-300 cursor-pointer" title="Aumentar zoom">
              <ZoomIn className="w-4 h-4" />
            </button>
            <div className="w-px h-4 bg-gray-200 dark:bg-zinc-700 mx-0.5" />
            <button onClick={fitView} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-600 dark:text-zinc-300 cursor-pointer" title="Enquadrar tudo">
              <Maximize2 className="w-4 h-4" />
            </button>
            <button onClick={() => { setScale(1); setPan({ x: 40, y: 40 }); }} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-600 dark:text-zinc-300 cursor-pointer" title="Ir para o início">
              <Locate className="w-4 h-4" />
            </button>
          </div>

          {/* Connect-mode banner */}
          <AnimatePresence>
            {connectingFromId && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                data-toolbar
                onPointerDown={(e) => e.stopPropagation()}
                className="absolute top-3 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-amber-500 text-white text-xs font-bold px-3.5 py-2 rounded-xl shadow-lg"
              >
                <Link2 className="w-4 h-4" />
                <span>Clique em outro post-it para conectar</span>
                <button onClick={() => setConnectingFromId(null)} className="ml-1 hover:bg-white/20 rounded p-0.5 cursor-pointer">
                  <Link2Off className="w-3.5 h-3.5" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ) : (
        /* ══════════════ LIST VIEW ══════════════ */
        <div className="flex-1 overflow-y-auto min-h-0 pb-6" id="whiteboard-list">
          {canEdit && (
            <button
              onClick={handleAddButton}
              className="mb-4 px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Novo Post-it
            </button>
          )}
          {boardItems.filter(matchesSearch).length === 0 ? (
            <div className="text-center p-12 bg-white dark:bg-zinc-900 rounded-3xl border border-gray-150 dark:border-zinc-850 py-16">
              <StickyNote className="w-12 h-12 text-gray-300 dark:text-zinc-750 mx-auto mb-3" />
              <p className="text-sm font-semibold text-gray-800 dark:text-zinc-100">Nenhum post-it neste quadro</p>
              <p className="text-xs text-gray-500 dark:text-zinc-400 mt-1">Crie post-its com o botão acima ou no modo Quadro.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {boardItems.filter(matchesSearch).map((it) => (
                <ListCard
                  key={it.id}
                  item={it}
                  canEdit={canEdit}
                  onSave={(text) => updateWhiteboardItem(it.id, { text })}
                  onColor={(cls) => updateWhiteboardItem(it.id, { color: cls })}
                  onDelete={async () => {
                    if (
                      await confirm({ title: "Excluir post-it", message: "Deseja apagar este post-it?", confirmLabel: "Excluir", tone: "danger" })
                    ) {
                      deleteWhiteboardItem(it.id);
                    }
                  }}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ── List-view card with inline editing ─────────────────────────────────────
const ListCard: React.FC<{
  item: WhiteboardItem;
  canEdit: boolean;
  onSave: (text: string) => void;
  onColor: (cls: string) => void;
  onDelete: () => void;
}> = ({ item, canEdit, onSave, onColor, onDelete }) => {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(item.text);

  useEffect(() => {
    if (!editing) setText(item.text);
  }, [item.text, editing]);

  return (
    <div className={`relative border rounded-2xl p-4 flex flex-col justify-between gap-3 min-h-[168px] shadow-xs hover:shadow-md transition-all ${item.color}`}>
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-wider opacity-50">Post-it</span>
        {canEdit && (
          <div className="flex items-center gap-1">
            <button onClick={() => setEditing((v) => !v)} className="p-1.5 rounded-lg hover:bg-black/5 text-gray-600 hover:text-sky-500 cursor-pointer" title="Editar">
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button onClick={onDelete} className="p-1.5 rounded-lg hover:bg-black/5 hover:text-red-500 text-gray-600 cursor-pointer" title="Excluir">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {editing ? (
        <textarea
          autoFocus
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={() => {
            setEditing(false);
            if (text.trim()) onSave(text.trim());
          }}
          className="flex-1 w-full bg-white/50 dark:bg-black/20 rounded-lg resize-none outline-none p-2 text-xs font-semibold leading-relaxed"
        />
      ) : (
        <p className="flex-1 text-xs font-semibold leading-relaxed break-words whitespace-pre-wrap">
          {item.text || <span className="opacity-40 italic font-normal">Vazio</span>}
        </p>
      )}

      {canEdit && editing && (
        <div className="flex items-center gap-1 flex-wrap">
          {POST_IT_COLORS.map((c) => (
            <button
              key={c.name}
              onClick={() => onColor(c.cls)}
              className={`w-4 h-4 rounded-full border-2 cursor-pointer ${item.color === c.cls ? "border-sky-500 scale-110" : "border-transparent"}`}
              style={{ backgroundColor: c.dot }}
              title={c.name}
            />
          ))}
        </div>
      )}

      <div className="flex items-center justify-between gap-1.5 text-[10px] border-t border-black/5 dark:border-white/10 pt-2">
        <div className="flex items-center gap-1.5 overflow-hidden">
          <span className={`w-4 h-4 rounded-full shrink-0 flex items-center justify-center font-bold text-[8px] uppercase border ${item.creatorColor || "text-sky-500 bg-sky-500/10 border-sky-500/30"}`}>
            {item.creatorName?.charAt(0) || "?"}
          </span>
          <span className="truncate opacity-70 font-semibold">{item.creatorName}</span>
        </div>
        {item.connections && item.connections.length > 0 && (
          <span className="flex items-center gap-0.5 opacity-70 font-bold">
            <Link2 className="w-2.5 h-2.5" />
            {item.connections.length}
          </span>
        )}
      </div>
    </div>
  );
};
