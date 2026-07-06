/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { useApp } from "../context/AppContext";
import { Plus, Trash2, Edit3, BookOpen, Clock, Calendar, Check, X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Notebook } from "../types";
import { useConfirm } from "../context/ConfirmContext";
import { useToast } from "../context/ToastContext";

interface NotebooksListProps {
  canEdit: boolean;
}

const NOTE_THEMES = [
  { name: "Slate", color: "#64748b", border: "border-slate-500/20 bg-slate-500/10 text-slate-700 dark:text-slate-350" },
  { name: "Emerald", color: "#10b981", border: "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-350" },
  { name: "Sky", color: "#0ea5e9", border: "border-sky-500/20 bg-sky-500/10 text-sky-700 dark:text-sky-350" },
  { name: "Amber", color: "#f59e0b", border: "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-350" },
  { name: "Rose", color: "#f43f5e", border: "border-rose-500/20 bg-rose-500/10 text-rose-700 dark:text-rose-350" },
  { name: "Violet", color: "#8b5cf6", border: "border-violet-500/20 bg-violet-500/10 text-violet-700 dark:text-violet-350" },
];

export const NotebooksList: React.FC<NotebooksListProps> = ({ canEdit }) => {
  const {
    notebooks,
    createNotebook,
    updateNotebook,
    deleteNotebook,
  } = useApp();
  const confirm = useConfirm();
  const toast = useToast();

  const [showAddForm, setShowAddForm] = useState(false);
  const [editingNote, setEditingNote] = useState<Notebook | null>(null);

  const [noteTitle, setNoteTitle] = useState("");
  const [noteContent, setNoteContent] = useState("");
  const [noteColor, setNoteColor] = useState(NOTE_THEMES[0].color);

  const handleOpenCreateForm = () => {
    setEditingNote(null);
    setNoteTitle("");
    setNoteContent("");
    setNoteColor(NOTE_THEMES[0].color);
    setShowAddForm(true);
  };

  const handleOpenEditForm = (note: Notebook) => {
    setEditingNote(note);
    setNoteTitle(note.title);
    setNoteContent(note.content);
    setNoteColor(note.color);
    setShowAddForm(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteTitle.trim()) return;

    try {
      if (editingNote) {
        await updateNotebook(editingNote.id, noteTitle.trim(), noteContent.trim(), noteColor);
      } else {
        await createNotebook(noteTitle.trim(), noteContent.trim(), noteColor);
      }
      setShowAddForm(false);
      setEditingNote(null);
      setNoteTitle("");
      setNoteContent("");
    } catch (err) {
      toast("Erro ao salvar anotação.");
    }
  };

  const handleDelete = async (e: React.MouseEvent, noteId: string) => {
    e.stopPropagation();
    e.preventDefault();
    if (
      await confirm({
        title: "Excluir bloco de notas",
        message: "Deseja mesmo excluir este bloco de notas?",
        confirmLabel: "Excluir",
        tone: "danger",
      })
    ) {
      try {
        await deleteNotebook(noteId);
      } catch (err) {
        toast("Erro ao excluir");
      }
    }
  };

  return (
    <div className="h-full flex flex-col min-h-0 font-sans" id="notes-module-container">
      {/* MODULE MAIN BUTTON ACTIONS */}
      <div className="mb-4 flex items-center justify-between shrink-0 select-none">
        <div className="flex items-center gap-2">
          <span className="p-1 px-2.5 bg-sky-500/10 text-sky-600 rounded-lg text-xs font-bold leading-relaxed">
            Anotações Gerais
          </span>
          <p className="text-xs text-gray-500 dark:text-zinc-400 hidden sm:inline-block">
            Crie tópicos estruturados, ata de reuniões, resumos ou diários de projetos.
          </p>
        </div>

        {canEdit && (
          <button
            id="action-add-notebook"
            onClick={handleOpenCreateForm}
            className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Criar Bloco</span>
          </button>
        )}
      </div>

      {/* NOTES CARDS GRID LAYOUT */}
      <div className="flex-1 overflow-y-auto min-h-0 select-none pb-8" id="notebook-list-grid-parent">
        {notebooks.length === 0 ? (
          <div className="text-center p-12 bg-white dark:bg-zinc-900 rounded-3xl border border-gray-150 dark:border-zinc-850 py-16">
            <BookOpen className="w-12 h-12 text-gray-300 dark:text-zinc-750 mx-auto mb-3" />
            <p className="text-sm font-semibold text-gray-800 dark:text-zinc-100">Não há blocos de notas criados</p>
            <p className="text-xs text-gray-500 dark:text-zinc-400 mt-1">
              Escreva ata de decisões, pautas, links rápidos ou diários de projetos clicando no botão acima.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-4" id="notebooks-grid-items">
            {notebooks.map((note) => {
              const themeObj = NOTE_THEMES.find((t) => t.color === note.color) || NOTE_THEMES[0];
              const dateStr = note.updatedAt ? new Date(note.updatedAt).toLocaleDateString("pt-BR") : "";

              return (
                <div
                  id={`note-card-${note.id}`}
                  key={note.id}
                  onClick={() => handleOpenEditForm(note)}
                  className="aspect-video w-full border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-2xl p-4.5 hover:border-sky-500/40 hover:shadow-xs transition-all relative flex flex-col justify-between group cursor-pointer overflow-hidden"
                >
                  {/* Left Side Visual Colored Ribbon indicator */}
                  <div
                    className="absolute top-0 bottom-0 left-0 w-2.5"
                    style={{ backgroundColor: note.color }}
                  />

                  {/* Header info */}
                  <div className="space-y-1.5 pl-2">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="text-sm font-bold text-gray-900 dark:text-zinc-50 truncate">
                        {note.title}
                      </h4>
                      {canEdit && (
                        <button
                          id={`delete-note-btn-${note.id}`}
                          onClick={(e) => handleDelete(e, note.id)}
                          className="p-2 hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-500 dark:hover:text-red-400 rounded-xl text-gray-400 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all shrink-0 cursor-pointer relative z-10"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-zinc-400 line-clamp-3 leading-relaxed whitespace-pre-wrap">
                      {note.content || "Sem descrição..."}
                    </p>
                  </div>

                  {/* Bottom date badge footer */}
                  <div className="pt-2 mt-2 px-2 border-t border-gray-100 dark:border-zinc-850 flex items-center justify-between text-[10px] text-gray-400 dark:text-zinc-500 select-none">
                    <span className="flex items-center gap-1.5 font-medium uppercase tracking-wider">
                      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: note.color }} />
                      {themeObj.name}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3 shrink-0" />
                      <span>{dateStr}</span>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* OVERLAY PANEL DIALOG: CREATE / EDIT NOTE */}
      <AnimatePresence>
        {showAddForm && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-zinc-900 rounded-3xl p-6 w-full max-w-lg border border-gray-200 dark:border-zinc-800 shadow-2xl relative"
            >
              <button
                id="close-add-note-btn"
                onClick={() => {
                  setShowAddForm(false);
                  setEditingNote(null);
                }}
                className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>

              <h3 className="text-sm font-bold text-gray-900 dark:text-zinc-50 mb-4 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-sky-500" />
                <span>{editingNote ? "Editar Anotação" : "Nova Anotação"}</span>
              </h3>

              <form onSubmit={handleFormSubmit} className="space-y-4 text-xs">
                {/* Title */}
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Título do Bloco</label>
                  <input
                    id="new-note-title"
                    type="text"
                    value={noteTitle}
                    onChange={(e) => setNoteTitle(e.target.value)}
                    placeholder="Ex: Ata de Reunião de Pauta, Informações Úteis"
                    className="w-full text-xs px-3.5 py-2.5 bg-gray-50 dark:bg-zinc-850 border border-gray-205 dark:border-zinc-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-sky-500 text-gray-900 dark:text-white font-semibold"
                    required
                  />
                </div>

                {/* Content Editor */}
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Conteúdo</label>
                  <textarea
                    id="new-note-content"
                    value={noteContent}
                    onChange={(e) => setNoteContent(e.target.value)}
                    placeholder="Redija suas anotações, descrições, links de projetos e resumos importantes..."
                    className="w-full text-xs px-3.5 py-3 bg-gray-50 dark:bg-zinc-850 border border-gray-205 dark:border-zinc-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-sky-500 text-gray-900 dark:text-white h-48 select-text"
                  />
                </div>

                {/* Color selects */}
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-2">Identificador de Cor</label>
                  <div className="flex gap-2">
                    {NOTE_THEMES.map((themeObj) => (
                      <button
                        id={`note-color-btn-${themeObj.name}`}
                        key={themeObj.name}
                        type="button"
                        onClick={() => setNoteColor(themeObj.color)}
                        className={`w-9 h-9 border-2 rounded-xl transition-all flex items-center justify-center ${
                          noteColor === themeObj.color ? "border-sky-500 scale-95" : "border-transparent"
                        }`}
                        title={themeObj.name}
                      >
                        <div
                          className="w-6 h-6 rounded-lg shadow-xs"
                          style={{ backgroundColor: themeObj.color }}
                        >
                          {noteColor === themeObj.color && (
                            <Check className="w-3.5 h-3.5 text-white stroke-[3px] m-1" />
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Actions bottom */}
                <div className="flex gap-2 justify-end font-semibold pt-2">
                  <button
                    id="cancel-create-note"
                    type="button"
                    onClick={() => {
                      setShowAddForm(false);
                      setEditingNote(null);
                    }}
                    className="px-3 py-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-gray-500 rounded-lg"
                  >
                    Fechar
                  </button>
                  <button
                    id="submit-create-note"
                    type="submit"
                    className="px-5 py-2.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl shadow-xs transition-all"
                  >
                    Salvar Registro
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
