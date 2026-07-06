/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState } from "react";
import { useApp } from "../context/AppContext";
import {
  Plus,
  Trash2,
  BookOpen,
  Calendar,
  Check,
  X,
  Search,
  Pin,
  PinOff,
  Tag,
  Pencil,
  Eye,
  Copy,
  ArrowUpDown,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Notebook } from "../types";
import { useConfirm } from "../context/ConfirmContext";
import { useToast } from "../context/ToastContext";

interface NotebooksListProps {
  canEdit: boolean;
}

const NOTE_THEMES = [
  { name: "Slate", color: "#64748b" },
  { name: "Emerald", color: "#10b981" },
  { name: "Sky", color: "#0ea5e9" },
  { name: "Amber", color: "#f59e0b" },
  { name: "Rose", color: "#f43f5e" },
  { name: "Violet", color: "#8b5cf6" },
];

// ── Minimal, XSS-safe Markdown renderer ─────────────────────────────────────
const escapeHtml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const inlineMd = (s: string) =>
  escapeHtml(s)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[^*])\*(?!\s)(.+?)\*/g, "$1<em>$2</em>")
    .replace(/~~(.+?)~~/g, "<del>$1</del>")
    .replace(/`([^`]+?)`/g, '<code class="px-1 py-0.5 rounded bg-gray-200/70 dark:bg-zinc-700/70 text-[0.85em]">$1</code>')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer" class="text-sky-500 underline">$1</a>');

const renderMarkdown = (src: string): string => {
  const lines = (src || "").split("\n");
  let html = "";
  let listType: "ul" | "ol" | null = null;
  const closeList = () => { if (listType) { html += `</${listType}>`; listType = null; } };
  for (const raw of lines) {
    const line = raw.trimEnd();
    if (/^\s*[-*]\s+/.test(line)) {
      if (listType !== "ul") { closeList(); html += '<ul class="list-disc pl-5 space-y-0.5 my-1.5">'; listType = "ul"; }
      html += `<li>${inlineMd(line.replace(/^\s*[-*]\s+/, ""))}</li>`;
      continue;
    }
    if (/^\s*\d+\.\s+/.test(line)) {
      if (listType !== "ol") { closeList(); html += '<ol class="list-decimal pl-5 space-y-0.5 my-1.5">'; listType = "ol"; }
      html += `<li>${inlineMd(line.replace(/^\s*\d+\.\s+/, ""))}</li>`;
      continue;
    }
    closeList();
    if (/^###\s+/.test(line)) html += `<h3 class="text-sm font-bold mt-3 mb-1">${inlineMd(line.replace(/^###\s+/, ""))}</h3>`;
    else if (/^##\s+/.test(line)) html += `<h2 class="text-base font-bold mt-3 mb-1">${inlineMd(line.replace(/^##\s+/, ""))}</h2>`;
    else if (/^#\s+/.test(line)) html += `<h1 class="text-lg font-extrabold mt-3 mb-1.5">${inlineMd(line.replace(/^#\s+/, ""))}</h1>`;
    else if (/^>\s?/.test(line)) html += `<blockquote class="border-l-2 border-sky-400 pl-3 my-1.5 italic opacity-80">${inlineMd(line.replace(/^>\s?/, ""))}</blockquote>`;
    else if (/^(-{3,}|\*{3,})$/.test(line)) html += '<hr class="my-3 border-gray-200 dark:border-zinc-700" />';
    else if (line.trim() === "") html += '<div class="h-2"></div>';
    else html += `<p class="my-1 leading-relaxed">${inlineMd(line)}</p>`;
  }
  closeList();
  return html;
};

const countWords = (s: string) => (s.trim() ? s.trim().split(/\s+/).length : 0);

export const NotebooksList: React.FC<NotebooksListProps> = ({ canEdit }) => {
  const { notebooks, createNotebook, updateNotebookFields, deleteNotebook } = useApp();
  const confirm = useConfirm();
  const toast = useToast();

  const [search, setSearch] = useState("");
  const [tagFilter, setTagFilter] = useState("all");
  const [sortBy, setSortBy] = useState<"recent" | "alpha">("recent");

  // Editor modal
  const [showEditor, setShowEditor] = useState(false);
  const [editingNote, setEditingNote] = useState<Notebook | null>(null);
  const [noteTitle, setNoteTitle] = useState("");
  const [noteContent, setNoteContent] = useState("");
  const [noteColor, setNoteColor] = useState(NOTE_THEMES[2].color);
  const [noteTags, setNoteTags] = useState<string[]>([]);
  const [notePinned, setNotePinned] = useState(false);
  const [tagInput, setTagInput] = useState("");
  const [editorTab, setEditorTab] = useState<"edit" | "preview">("edit");

  // Reader modal
  const [reading, setReading] = useState<Notebook | null>(null);

  const allTags = useMemo(() => {
    const s = new Set<string>();
    notebooks.forEach((n) => (n.tags || []).forEach((t) => s.add(t)));
    return Array.from(s).sort();
  }, [notebooks]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    let arr = notebooks.filter((n) => {
      const matchQ = !q || n.title.toLowerCase().includes(q) || (n.content || "").toLowerCase().includes(q) || (n.tags || []).some((t) => t.includes(q));
      const matchTag = tagFilter === "all" || (n.tags || []).includes(tagFilter);
      return matchQ && matchTag;
    });
    arr = arr.sort((a, b) => {
      if (!!a.pinned !== !!b.pinned) return a.pinned ? -1 : 1;
      if (sortBy === "alpha") return a.title.localeCompare(b.title);
      return new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime();
    });
    return arr;
  }, [notebooks, search, tagFilter, sortBy]);

  const openCreate = () => {
    setEditingNote(null);
    setNoteTitle(""); setNoteContent(""); setNoteColor(NOTE_THEMES[2].color);
    setNoteTags([]); setNotePinned(false); setTagInput(""); setEditorTab("edit");
    setShowEditor(true);
  };
  const openEdit = (n: Notebook) => {
    setEditingNote(n);
    setNoteTitle(n.title); setNoteContent(n.content); setNoteColor(n.color);
    setNoteTags(n.tags || []); setNotePinned(!!n.pinned); setTagInput(""); setEditorTab("edit");
    setReading(null);
    setShowEditor(true);
  };

  const addTag = () => {
    const v = tagInput.trim().toLowerCase();
    if (v && !noteTags.includes(v)) setNoteTags([...noteTags, v]);
    setTagInput("");
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteTitle.trim()) return;
    try {
      if (editingNote) {
        await updateNotebookFields(editingNote.id, { title: noteTitle.trim(), content: noteContent, color: noteColor, tags: noteTags, pinned: notePinned });
      } else {
        await createNotebook(noteTitle.trim(), noteContent, noteColor, { tags: noteTags, pinned: notePinned });
      }
      setShowEditor(false);
      setEditingNote(null);
    } catch {
      toast("Erro ao salvar anotação.");
    }
  };

  const togglePin = async (e: React.MouseEvent, n: Notebook) => {
    e.stopPropagation();
    await updateNotebookFields(n.id, { pinned: !n.pinned });
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (await confirm({ title: "Excluir bloco de notas", message: "Deseja mesmo excluir este bloco?", confirmLabel: "Excluir", tone: "danger" })) {
      try { await deleteNotebook(id); if (reading?.id === id) setReading(null); } catch { toast("Erro ao excluir"); }
    }
  };

  const copyContent = (e: React.MouseEvent, n: Notebook) => {
    e.stopPropagation();
    navigator.clipboard?.writeText(`${n.title}\n\n${n.content}`);
    toast("Anotação copiada!", "success");
  };

  return (
    <div className="h-full flex flex-col min-h-0 font-sans" id="notes-module-container">
      {/* TOOLBAR */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2.5 shrink-0">
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[220px]">
          <div className="relative flex-1 max-w-xs min-w-[150px]">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar anotações..." className="w-full text-xs pl-9 pr-3 py-2 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-sky-500 text-gray-900 dark:text-zinc-50" />
          </div>
          {allTags.length > 0 && (
            <select value={tagFilter} onChange={(e) => setTagFilter(e.target.value)} className="px-2.5 py-2 text-xs bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-lg text-gray-700 dark:text-zinc-300 cursor-pointer max-w-[130px]">
              <option value="all">Todas as tags</option>
              {allTags.map((t) => <option key={t} value={t}>#{t}</option>)}
            </select>
          )}
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <ArrowUpDown className="w-3.5 h-3.5" />
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value as any)} className="px-2 py-2 text-xs bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-lg text-gray-700 dark:text-zinc-300 cursor-pointer">
              <option value="recent">Recentes</option>
              <option value="alpha">A-Z</option>
            </select>
          </div>
        </div>
        {canEdit && (
          <button onClick={openCreate} className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-sm transition-all cursor-pointer">
            <Plus className="w-4 h-4" /><span>Criar Bloco</span>
          </button>
        )}
      </div>

      {/* GRID */}
      <div className="flex-1 overflow-y-auto min-h-0 pb-8">
        {visible.length === 0 ? (
          <div className="text-center p-12 bg-white dark:bg-zinc-900 rounded-3xl border border-gray-150 dark:border-zinc-850 py-16">
            <BookOpen className="w-12 h-12 text-gray-300 dark:text-zinc-750 mx-auto mb-3" />
            <p className="text-sm font-semibold text-gray-800 dark:text-zinc-100">{search || tagFilter !== "all" ? "Nada encontrado" : "Não há blocos de notas"}</p>
            <p className="text-xs text-gray-500 dark:text-zinc-400 mt-1">Escreva atas, pautas, resumos e diários. Suporta Markdown.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {visible.map((note) => {
              const theme = NOTE_THEMES.find((t) => t.color === note.color) || NOTE_THEMES[0];
              const dateStr = note.updatedAt ? new Date(note.updatedAt).toLocaleDateString("pt-BR") : "";
              return (
                <div
                  key={note.id}
                  onClick={() => setReading(note)}
                  className="min-h-[168px] border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-2xl p-4 pl-5 hover:border-sky-500/40 hover:shadow-sm transition-all relative flex flex-col justify-between group cursor-pointer overflow-hidden"
                >
                  <div className="absolute top-0 bottom-0 left-0 w-2.5" style={{ backgroundColor: note.color }} />
                  {note.pinned && <Pin className="absolute top-3 right-3 w-3.5 h-3.5 text-amber-500 fill-amber-500/30" />}
                  <div className="space-y-1.5">
                    <div className="flex items-start justify-between gap-2 pr-4">
                      <h4 className="text-sm font-bold text-gray-900 dark:text-zinc-50 truncate">{note.title}</h4>
                      {canEdit && (
                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 relative z-10">
                          <button onClick={(e) => togglePin(e, note)} className="p-1.5 rounded-lg hover:bg-amber-500/10 text-gray-400 hover:text-amber-500" title={note.pinned ? "Desafixar" : "Fixar"}>
                            {note.pinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); openEdit(note); }} className="p-1.5 rounded-lg hover:bg-sky-500/10 text-gray-400 hover:text-sky-500" title="Editar"><Pencil className="w-3.5 h-3.5" /></button>
                          <button onClick={(e) => handleDelete(e, note.id)} className="p-1.5 rounded-lg hover:bg-red-500/10 text-gray-400 hover:text-red-500" title="Excluir"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-zinc-400 line-clamp-4 leading-relaxed whitespace-pre-wrap">{note.content || "Sem conteúdo..."}</p>
                  </div>
                  <div className="mt-3">
                    {(note.tags || []).length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-2">
                        {(note.tags || []).slice(0, 3).map((t) => (
                          <span key={t} className="text-[9px] font-semibold px-1.5 py-0.5 rounded-md bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center gap-0.5"><Tag className="w-2 h-2" />{t}</span>
                        ))}
                      </div>
                    )}
                    <div className="pt-2 border-t border-gray-100 dark:border-zinc-850 flex items-center justify-between text-[10px] text-gray-400 dark:text-zinc-500">
                      <span className="flex items-center gap-1.5 font-medium uppercase tracking-wider">
                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: note.color }} />{theme.name}
                      </span>
                      <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{dateStr}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ══════ READER ══════ */}
      <AnimatePresence>
        {reading && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50" onClick={() => setReading(null)}>
            <motion.div initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.96, opacity: 0 }} onClick={(e) => e.stopPropagation()} className="bg-white dark:bg-zinc-900 rounded-3xl w-full max-w-2xl border border-gray-200 dark:border-zinc-800 shadow-2xl relative max-h-[90dvh] flex flex-col overflow-hidden">
              <div className="h-1.5 shrink-0" style={{ backgroundColor: reading.color }} />
              <div className="flex items-start justify-between gap-3 px-6 pt-5 pb-3 shrink-0">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    {reading.pinned && <Pin className="w-4 h-4 text-amber-500 fill-amber-500/30 shrink-0" />}
                    <h2 className="text-lg font-extrabold text-gray-900 dark:text-zinc-50 truncate">{reading.title}</h2>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                    {(reading.tags || []).map((t) => <span key={t} className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center gap-0.5"><Tag className="w-2.5 h-2.5" />{t}</span>)}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={(e) => copyContent(e, reading)} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-400 hover:text-sky-500" title="Copiar"><Copy className="w-4 h-4" /></button>
                  {canEdit && <button onClick={() => openEdit(reading)} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-400 hover:text-sky-500" title="Editar"><Pencil className="w-4 h-4" /></button>}
                  <button onClick={() => setReading(null)} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-400"><X className="w-4 h-4" /></button>
                </div>
              </div>
              <div className="px-6 pb-6 overflow-y-auto text-sm text-gray-700 dark:text-zinc-300">
                {reading.content.trim() ? (
                  <div className="markdown-body" dangerouslySetInnerHTML={{ __html: renderMarkdown(reading.content) }} />
                ) : (
                  <p className="italic text-gray-400">Sem conteúdo.</p>
                )}
              </div>
              <div className="px-6 py-3 border-t border-gray-100 dark:border-zinc-850 text-[10px] text-gray-400 flex items-center justify-between shrink-0">
                <span>{countWords(reading.content)} palavras · {reading.content.length} caracteres</span>
                <span>Atualizado {reading.updatedAt ? new Date(reading.updatedAt).toLocaleDateString("pt-BR") : ""}</span>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ══════ EDITOR ══════ */}
      <AnimatePresence>
        {showEditor && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <motion.div initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.96, opacity: 0 }} className="bg-white dark:bg-zinc-900 rounded-3xl p-6 w-full max-w-lg border border-gray-200 dark:border-zinc-800 shadow-2xl relative max-h-[92dvh] overflow-y-auto scrollbar-thin">
              <button onClick={() => { setShowEditor(false); setEditingNote(null); }} className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-400"><X className="w-5 h-5" /></button>
              <h3 className="text-sm font-bold text-gray-900 dark:text-zinc-50 mb-4 flex items-center gap-2"><BookOpen className="w-4 h-4 text-sky-500" />{editingNote ? "Editar Anotação" : "Nova Anotação"}</h3>
              <form onSubmit={submit} className="space-y-3.5 text-xs">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Título</label>
                  <input value={noteTitle} onChange={(e) => setNoteTitle(e.target.value)} required placeholder="Ex: Ata de reunião" className="w-full text-xs px-3.5 py-2.5 bg-gray-50 dark:bg-zinc-850 border border-gray-200 dark:border-zinc-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-sky-500 text-gray-900 dark:text-white font-semibold" />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase">Conteúdo (Markdown)</label>
                    <div className="flex items-center p-0.5 bg-gray-100 dark:bg-zinc-800 rounded-lg">
                      <button type="button" onClick={() => setEditorTab("edit")} className={`px-2 py-0.5 rounded-md font-bold flex items-center gap-1 ${editorTab === "edit" ? "bg-white dark:bg-zinc-700 text-gray-900 dark:text-white" : "text-gray-500"}`}><Pencil className="w-3 h-3" />Editar</button>
                      <button type="button" onClick={() => setEditorTab("preview")} className={`px-2 py-0.5 rounded-md font-bold flex items-center gap-1 ${editorTab === "preview" ? "bg-white dark:bg-zinc-700 text-gray-900 dark:text-white" : "text-gray-500"}`}><Eye className="w-3 h-3" />Prévia</button>
                    </div>
                  </div>
                  {editorTab === "edit" ? (
                    <textarea value={noteContent} onChange={(e) => setNoteContent(e.target.value)} placeholder={"# Título\n\n- item\n**negrito**, *itálico*, `código`, [link](https://...)"} className="w-full text-xs px-3.5 py-3 bg-gray-50 dark:bg-zinc-850 border border-gray-200 dark:border-zinc-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-sky-500 text-gray-900 dark:text-white h-44 font-mono resize-none" />
                  ) : (
                    <div className="w-full text-xs px-3.5 py-3 bg-gray-50 dark:bg-zinc-850 border border-gray-200 dark:border-zinc-800 rounded-xl text-gray-700 dark:text-zinc-300 h-44 overflow-y-auto markdown-body">
                      {noteContent.trim() ? <div dangerouslySetInnerHTML={{ __html: renderMarkdown(noteContent) }} /> : <span className="italic text-gray-400">Nada para pré-visualizar.</span>}
                    </div>
                  )}
                  <div className="text-right text-[10px] text-gray-400 mt-1">{countWords(noteContent)} palavras · {noteContent.length} caracteres</div>
                </div>
                {/* Tags */}
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Etiquetas</label>
                  <div className="flex gap-1.5 mb-1.5">
                    <input value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }} placeholder="Adicionar etiqueta..." className="flex-1 px-3 py-1.5 bg-gray-50 dark:bg-zinc-850 border border-gray-200 dark:border-zinc-800 rounded-lg text-gray-900 dark:text-white focus:outline-none" />
                    <button type="button" onClick={addTag} className="px-2.5 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-gray-500 rounded-lg"><Plus className="w-4 h-4" /></button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {noteTags.map((t) => (
                      <span key={t} className="inline-flex items-center gap-1 px-2 py-1 bg-sky-500/10 border border-sky-500/20 text-sky-600 dark:text-sky-300 rounded-lg font-medium">#{t}<button type="button" onClick={() => setNoteTags(noteTags.filter((x) => x !== t))} className="hover:text-red-500"><X className="w-3 h-3" /></button></span>
                    ))}
                  </div>
                </div>
                {/* Color + pin */}
                <div className="flex items-center justify-between">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-2">Cor</label>
                    <div className="flex gap-2">
                      {NOTE_THEMES.map((t) => (
                        <button key={t.name} type="button" onClick={() => setNoteColor(t.color)} className={`w-7 h-7 border-2 rounded-lg flex items-center justify-center transition-all ${noteColor === t.color ? "border-sky-500 scale-95" : "border-transparent"}`} title={t.name}>
                          <span className="w-5 h-5 rounded-md flex items-center justify-center" style={{ backgroundColor: t.color }}>{noteColor === t.color && <Check className="w-3 h-3 text-white stroke-[3px]" />}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                  <button type="button" onClick={() => setNotePinned(!notePinned)} className={`px-3 py-2 rounded-xl font-bold flex items-center gap-1.5 transition-all self-end ${notePinned ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30" : "bg-gray-100 dark:bg-zinc-800 text-gray-500 border border-transparent"}`}>
                    {notePinned ? <Pin className="w-3.5 h-3.5 fill-current" /> : <Pin className="w-3.5 h-3.5" />}{notePinned ? "Fixado" : "Fixar"}
                  </button>
                </div>
                <div className="flex gap-2 justify-end pt-1">
                  <button type="button" onClick={() => { setShowEditor(false); setEditingNote(null); }} className="px-4 py-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-gray-500 rounded-lg font-semibold cursor-pointer">Fechar</button>
                  <button type="submit" className="px-5 py-2.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl shadow-xs font-semibold cursor-pointer">Salvar</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
