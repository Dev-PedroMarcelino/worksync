/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState } from "react";
import { useApp } from "../context/AppContext";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  X,
  Clock,
  MapPin,
  User,
  Trash2,
  Pencil,
  CalendarDays,
  CalendarPlus,
  Download,
  ExternalLink,
  CheckSquare,
  ListChecks,
  CalendarClock,
  Sparkles,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { CalendarEvent, Task } from "../types";
import { useToast } from "../context/ToastContext";
import { useConfirm } from "../context/ConfirmContext";

interface CalendarViewProps {
  canEdit: boolean;
}

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];
const EVENT_COLORS = ["#0ea5e9", "#10b981", "#f59e0b", "#f43f5e", "#8b5cf6", "#f97316", "#64748b"];

const pad = (n: number) => String(n).padStart(2, "0");
const ymd = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;
const todayStr = () => {
  const t = new Date();
  return ymd(t.getFullYear(), t.getMonth(), t.getDate());
};
const nextDayStr = (dateStr: string) => {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + 1);
  return ymd(d.getFullYear(), d.getMonth(), d.getDate());
};
const prettyDate = (dateStr: string) => {
  const d = new Date(dateStr + "T00:00:00");
  return `${WEEKDAYS[d.getDay()]}, ${d.getDate()} de ${MONTHS[d.getMonth()]} de ${d.getFullYear()}`;
};

// ── iCalendar helpers (for phone-calendar sync) ─────────────────────────────
const escapeICS = (s: string) => (s || "").replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
const icsStamp = (dateStr: string, timeStr?: string) => {
  const [y, m, d] = dateStr.split("-");
  if (!timeStr) return `${y}${m}${d}`;
  const [hh, mm] = timeStr.split(":");
  return `${y}${m}${d}T${hh}${mm}00`;
};

type ICSInput = { uid: string; title: string; date: string; endDate?: string; startTime?: string; endTime?: string; allDay?: boolean; location?: string; description?: string };

const buildICS = (events: ICSInput[]) => {
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//worksync//Calendario//PT-BR", "CALSCALE:GREGORIAN"];
  events.forEach((e) => {
    lines.push("BEGIN:VEVENT");
    lines.push(`UID:${e.uid}@worksync`);
    lines.push(`SUMMARY:${escapeICS(e.title)}`);
    if (e.allDay || !e.startTime) {
      lines.push(`DTSTART;VALUE=DATE:${icsStamp(e.date)}`);
      lines.push(`DTEND;VALUE=DATE:${icsStamp(nextDayStr(e.endDate || e.date))}`);
    } else {
      lines.push(`DTSTART:${icsStamp(e.date, e.startTime)}`);
      lines.push(`DTEND:${icsStamp(e.endDate || e.date, e.endTime || e.startTime)}`);
    }
    if (e.location) lines.push(`LOCATION:${escapeICS(e.location)}`);
    if (e.description) lines.push(`DESCRIPTION:${escapeICS(e.description)}`);
    lines.push("END:VEVENT");
  });
  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
};

const downloadICS = (filename: string, events: ICSInput[]) => {
  const blob = new Blob([buildICS(events)], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".ics") ? filename : `${filename}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

const googleCalUrl = (e: ICSInput) => {
  const params = new URLSearchParams({ action: "TEMPLATE", text: e.title });
  if (e.allDay || !e.startTime) {
    params.set("dates", `${icsStamp(e.date)}/${icsStamp(nextDayStr(e.endDate || e.date))}`);
  } else {
    params.set("dates", `${icsStamp(e.date, e.startTime)}/${icsStamp(e.endDate || e.date, e.endTime || e.startTime)}`);
  }
  if (e.location) params.set("location", e.location);
  if (e.description) params.set("details", e.description);
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
};

const eventToICS = (ev: CalendarEvent): ICSInput => ({
  uid: ev.id,
  title: ev.title,
  date: ev.date,
  endDate: ev.endDate,
  startTime: ev.startTime,
  endTime: ev.endTime,
  allDay: ev.allDay,
  location: ev.location,
  description: ev.description,
});
const taskToICS = (t: Task): ICSInput => ({
  uid: t.id,
  title: t.title,
  date: t.dueDate as string,
  allDay: true,
  description: t.description,
});

export const CalendarView: React.FC<CalendarViewProps> = ({ canEdit }) => {
  const {
    calendarEvents,
    tasks,
    createCalendarEvent,
    updateCalendarEvent,
    deleteCalendarEvent,
    createTask,
    updateTaskFields,
    toggleTaskStatus,
    groupMembers,
    activeTab,
  } = useApp();
  const toast = useToast();
  const confirm = useConfirm();

  const isPersonal = activeTab === "personal";
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [view, setView] = useState<"month" | "agenda">("month");
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  // ── Event modal state ─────────────────────────────────────────────────
  const [showEventModal, setShowEventModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [fTitle, setFTitle] = useState("");
  const [fDate, setFDate] = useState(todayStr());
  const [fAllDay, setFAllDay] = useState(false);
  const [fStart, setFStart] = useState("09:00");
  const [fEnd, setFEnd] = useState("10:00");
  const [fLocation, setFLocation] = useState("");
  const [fDesc, setFDesc] = useState("");
  const [fColor, setFColor] = useState(EVENT_COLORS[0]);
  const [fAssigned, setFAssigned] = useState("");

  // ── Quick task modal ──────────────────────────────────────────────────
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [tTitle, setTTitle] = useState("");
  const [tDate, setTDate] = useState(todayStr());
  const [tPriority, setTPriority] = useState<"low" | "medium" | "high">("medium");
  const [tAssigned, setTAssigned] = useState("");

  const scheduledTasks = useMemo(() => tasks.filter((t) => t.dueDate), [tasks]);
  const unscheduledTasks = useMemo(() => tasks.filter((t) => !t.dueDate && t.status !== "completed"), [tasks]);

  // Map date -> events and tasks
  const eventsByDate = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {};
    calendarEvents.forEach((ev) => {
      const start = ev.date;
      const end = ev.endDate && ev.endDate > ev.date ? ev.endDate : ev.date;
      let cur = start;
      let guard = 0;
      while (cur <= end && guard < 366) {
        (map[cur] = map[cur] || []).push(ev);
        if (cur === end) break;
        cur = nextDayStr(cur);
        guard++;
      }
    });
    return map;
  }, [calendarEvents]);

  const tasksByDate = useMemo(() => {
    const map: Record<string, Task[]> = {};
    scheduledTasks.forEach((t) => {
      (map[t.dueDate as string] = map[t.dueDate as string] || []).push(t);
    });
    return map;
  }, [scheduledTasks]);

  // ── Calendar grid cells ───────────────────────────────────────────────
  const cells = useMemo(() => {
    const firstWeekday = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const arr: (string | null)[] = [];
    for (let i = 0; i < firstWeekday; i++) arr.push(null);
    for (let d = 1; d <= daysInMonth; d++) arr.push(ymd(year, month, d));
    while (arr.length % 7 !== 0) arr.push(null);
    return arr;
  }, [year, month]);

  const goMonth = (delta: number) => {
    let m = month + delta;
    let y = year;
    if (m < 0) { m = 11; y--; }
    if (m > 11) { m = 0; y++; }
    setMonth(m);
    setYear(y);
  };
  const goToday = () => {
    const t = new Date();
    setYear(t.getFullYear());
    setMonth(t.getMonth());
    setSelectedDay(todayStr());
  };

  const resetEventForm = (date?: string) => {
    setEditingEvent(null);
    setFTitle("");
    setFDate(date || selectedDay || todayStr());
    setFAllDay(false);
    setFStart("09:00");
    setFEnd("10:00");
    setFLocation("");
    setFDesc("");
    setFColor(EVENT_COLORS[Math.floor(Math.random() * EVENT_COLORS.length)]);
    setFAssigned("");
  };

  const openCreateEvent = (date?: string) => {
    resetEventForm(date);
    setShowEventModal(true);
  };

  const openEditEvent = (ev: CalendarEvent) => {
    setEditingEvent(ev);
    setFTitle(ev.title);
    setFDate(ev.date);
    setFAllDay(!!ev.allDay);
    setFStart(ev.startTime || "09:00");
    setFEnd(ev.endTime || "10:00");
    setFLocation(ev.location || "");
    setFDesc(ev.description || "");
    setFColor(ev.color || EVENT_COLORS[0]);
    setFAssigned(ev.assignedTo || "");
    setShowEventModal(true);
  };

  const submitEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fTitle.trim()) return;
    const payload: Partial<CalendarEvent> = {
      title: fTitle.trim(),
      date: fDate,
      allDay: fAllDay,
      startTime: fAllDay ? "" : fStart,
      endTime: fAllDay ? "" : fEnd,
      location: fLocation.trim(),
      description: fDesc.trim(),
      color: fColor,
      assignedTo: isPersonal ? "" : fAssigned,
    };
    try {
      if (editingEvent) await updateCalendarEvent(editingEvent.id, payload);
      else await createCalendarEvent(payload);
      setShowEventModal(false);
    } catch {
      toast("Erro ao salvar compromisso.");
    }
  };

  const submitTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tTitle.trim()) return;
    try {
      await createTask(tTitle.trim(), "", tPriority, tDate, isPersonal ? undefined : tAssigned || undefined, []);
      setShowTaskModal(false);
      setTTitle("");
      setTPriority("medium");
      setTAssigned("");
    } catch {
      toast("Erro ao criar tarefa.");
    }
  };

  const scheduleTask = async (task: Task, date: string) => {
    if (!date) return;
    await updateTaskFields(task.id, { dueDate: date });
    toast("Tarefa agendada!", "success");
  };

  const exportAll = () => {
    const items: ICSInput[] = [
      ...calendarEvents.map(eventToICS),
      ...scheduledTasks.map(taskToICS),
    ];
    if (items.length === 0) {
      toast("Nada para exportar ainda.", "info");
      return;
    }
    downloadICS("worksync-calendario", items);
  };

  const dayItemsCount = (d: string) => (eventsByDate[d]?.length || 0) + (tasksByDate[d]?.length || 0);

  const selectedEvents = selectedDay ? eventsByDate[selectedDay] || [] : [];
  const selectedTasks = selectedDay ? tasksByDate[selectedDay] || [] : [];

  // Agenda list (upcoming)
  const agendaItems = useMemo(() => {
    const t = todayStr();
    const evs = calendarEvents.filter((e) => (e.endDate || e.date) >= t).map((e) => ({ date: e.date, ev: e as CalendarEvent | undefined, task: undefined as Task | undefined }));
    const tks = scheduledTasks.filter((k) => (k.dueDate as string) >= t).map((k) => ({ date: k.dueDate as string, ev: undefined, task: k }));
    return [...evs, ...tks].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  }, [calendarEvents, scheduledTasks]);

  return (
    <div className="h-full flex flex-col min-h-0 font-sans select-none" id="calendar-module-container">
      {/* HEADER */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2.5 shrink-0">
        <div className="flex items-center gap-2">
          <button onClick={() => goMonth(-1)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-600 dark:text-zinc-300 cursor-pointer" title="Mês anterior">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <h2 className="text-base font-extrabold text-gray-900 dark:text-zinc-50 min-w-[150px] text-center tracking-tight">
            {MONTHS[month]} <span className="text-gray-400 dark:text-zinc-500 font-bold">{year}</span>
          </h2>
          <button onClick={() => goMonth(1)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-600 dark:text-zinc-300 cursor-pointer" title="Próximo mês">
            <ChevronRight className="w-4 h-4" />
          </button>
          <button onClick={goToday} className="ml-1 px-2.5 py-1.5 text-xs font-bold rounded-lg bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 text-gray-700 dark:text-zinc-200 cursor-pointer">
            Hoje
          </button>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center p-1 bg-gray-150/80 dark:bg-zinc-800/80 rounded-xl border border-gray-200/50 dark:border-zinc-850 text-xs">
            <button onClick={() => setView("month")} className={`px-2.5 py-1.5 font-bold rounded-lg flex items-center gap-1.5 cursor-pointer ${view === "month" ? "bg-white dark:bg-zinc-700 text-gray-900 dark:text-white shadow-xs" : "text-gray-500 dark:text-zinc-400"}`}>
              <CalendarDays className="w-3.5 h-3.5" /><span className="hidden sm:inline">Mês</span>
            </button>
            <button onClick={() => setView("agenda")} className={`px-2.5 py-1.5 font-bold rounded-lg flex items-center gap-1.5 cursor-pointer ${view === "agenda" ? "bg-white dark:bg-zinc-700 text-gray-900 dark:text-white shadow-xs" : "text-gray-500 dark:text-zinc-400"}`}>
              <ListChecks className="w-3.5 h-3.5" /><span className="hidden sm:inline">Agenda</span>
            </button>
          </div>
          <button onClick={exportAll} className="px-2.5 py-2 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 hover:border-sky-400 text-gray-700 dark:text-zinc-200 text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer transition-all" title="Exportar tudo (.ics) para o calendário do celular">
            <Download className="w-3.5 h-3.5" /><span className="hidden md:inline">Exportar</span>
          </button>
          {canEdit && (
            <button onClick={() => openCreateEvent()} className="px-3 py-2 bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-sm transition-all cursor-pointer">
              <Plus className="w-4 h-4" /><span className="hidden sm:inline">Compromisso</span>
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 min-h-0 flex flex-col lg:flex-row gap-3">
        {/* MAIN AREA */}
        <div className="flex-1 min-h-0 flex flex-col">
          {view === "month" ? (
            <div className="flex-1 min-h-0 flex flex-col bg-white dark:bg-zinc-900 rounded-2xl border border-gray-200 dark:border-zinc-800 overflow-hidden">
              {/* Weekday header */}
              <div className="grid grid-cols-7 border-b border-gray-150 dark:border-zinc-800 shrink-0">
                {WEEKDAYS.map((w) => (
                  <div key={w} className="py-2 text-center text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-zinc-500">
                    {w}
                  </div>
                ))}
              </div>
              {/* Day cells */}
              <div className="flex-1 grid grid-cols-7 auto-rows-fr overflow-y-auto">
                {cells.map((d, i) => {
                  if (!d) return <div key={i} className="border-b border-r border-gray-100 dark:border-zinc-850/60 bg-gray-50/40 dark:bg-zinc-950/30" />;
                  const evs = eventsByDate[d] || [];
                  const tks = tasksByDate[d] || [];
                  const isToday = d === todayStr();
                  const isSel = d === selectedDay;
                  const dayNum = Number(d.slice(8));
                  return (
                    <button
                      key={i}
                      onClick={() => setSelectedDay(d)}
                      onDoubleClick={() => canEdit && openCreateEvent(d)}
                      className={`text-left border-b border-r border-gray-100 dark:border-zinc-850/60 p-1.5 min-h-[74px] flex flex-col gap-1 transition-all cursor-pointer hover:bg-sky-50/50 dark:hover:bg-sky-500/5 ${
                        isSel ? "bg-sky-50 dark:bg-sky-500/10 ring-1 ring-inset ring-sky-400/50" : ""
                      }`}
                    >
                      <span className={`text-[11px] font-bold w-5 h-5 flex items-center justify-center rounded-full shrink-0 ${isToday ? "bg-sky-600 text-white" : "text-gray-600 dark:text-zinc-300"}`}>
                        {dayNum}
                      </span>
                      <div className="flex flex-col gap-0.5 overflow-hidden">
                        {evs.slice(0, 2).map((ev) => (
                          <span key={ev.id} className="text-[9px] font-semibold px-1 py-0.5 rounded truncate flex items-center gap-1" style={{ backgroundColor: ev.color + "22", color: ev.color }}>
                            <span className="w-1 h-1 rounded-full shrink-0" style={{ backgroundColor: ev.color }} />
                            {ev.startTime && !ev.allDay ? ev.startTime + " " : ""}{ev.title}
                          </span>
                        ))}
                        {tks.slice(0, evs.length >= 2 ? 0 : 1).map((t) => (
                          <span key={t.id} className={`text-[9px] font-semibold px-1 py-0.5 rounded truncate flex items-center gap-1 ${t.status === "completed" ? "line-through opacity-50" : ""} bg-emerald-500/15 text-emerald-600 dark:text-emerald-400`}>
                            <CheckSquare className="w-2 h-2 shrink-0" />{t.title}
                          </span>
                        ))}
                        {dayItemsCount(d) > 3 && (
                          <span className="text-[8px] font-bold text-gray-400 pl-1">+{dayItemsCount(d) - 3} mais</span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            /* AGENDA VIEW */
            <div className="flex-1 min-h-0 overflow-y-auto bg-white dark:bg-zinc-900 rounded-2xl border border-gray-200 dark:border-zinc-800 p-3">
              {agendaItems.length === 0 ? (
                <div className="text-center py-16">
                  <CalendarClock className="w-12 h-12 text-gray-300 dark:text-zinc-750 mx-auto mb-3" />
                  <p className="text-sm font-semibold text-gray-800 dark:text-zinc-100">Nenhum compromisso futuro</p>
                  <p className="text-xs text-gray-500 dark:text-zinc-400 mt-1">Crie compromissos ou agende tarefas para vê-los aqui.</p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {agendaItems.map((it, idx) => (
                    <div key={idx} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-zinc-850/60 border border-transparent hover:border-gray-150 dark:hover:border-zinc-800 transition-all">
                      <div className="text-center shrink-0 w-12">
                        <div className="text-[9px] font-bold uppercase text-gray-400">{MONTHS[Number(it.date.slice(5, 7)) - 1].slice(0, 3)}</div>
                        <div className="text-lg font-extrabold text-gray-800 dark:text-zinc-100 leading-none">{it.date.slice(8)}</div>
                      </div>
                      {it.ev ? (
                        <div className="flex-1 min-w-0 flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: it.ev.color }} />
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-gray-900 dark:text-zinc-50 truncate">{it.ev.title}</p>
                            <p className="text-[11px] text-gray-500 dark:text-zinc-400 flex items-center gap-2 flex-wrap">
                              {!it.ev.allDay && it.ev.startTime && <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{it.ev.startTime}{it.ev.endTime ? `–${it.ev.endTime}` : ""}</span>}
                              {it.ev.allDay && <span>Dia inteiro</span>}
                              {it.ev.location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{it.ev.location}</span>}
                              {it.ev.assignedToName && <span className="flex items-center gap-1"><User className="w-3 h-3" />{it.ev.assignedToName}</span>}
                            </p>
                          </div>
                          <div className="ml-auto flex items-center gap-1 shrink-0">
                            <a href={googleCalUrl(eventToICS(it.ev))} target="_blank" rel="noreferrer" className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-400 hover:text-sky-500" title="Adicionar ao Google Agenda"><ExternalLink className="w-3.5 h-3.5" /></a>
                            <button onClick={() => downloadICS(it.ev!.title, [eventToICS(it.ev!)])} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-400 hover:text-sky-500" title="Baixar .ics"><Download className="w-3.5 h-3.5" /></button>
                            {canEdit && <button onClick={() => openEditEvent(it.ev!)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-400 hover:text-sky-500" title="Editar"><Pencil className="w-3.5 h-3.5" /></button>}
                          </div>
                        </div>
                      ) : it.task ? (
                        <div className="flex-1 min-w-0 flex items-center gap-2">
                          <CheckSquare className="w-4 h-4 text-emerald-500 shrink-0" />
                          <p className={`text-sm font-bold text-gray-900 dark:text-zinc-50 truncate ${it.task.status === "completed" ? "line-through opacity-50" : ""}`}>{it.task.title}</p>
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">Tarefa</span>
                          <a href={googleCalUrl(taskToICS(it.task))} target="_blank" rel="noreferrer" className="ml-auto p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-400 hover:text-sky-500" title="Adicionar ao Google Agenda"><ExternalLink className="w-3.5 h-3.5" /></a>
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* SIDE PANEL */}
        <div className="w-full lg:w-80 shrink-0 min-h-0 flex flex-col gap-3">
          {/* Selected day panel */}
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-200 dark:border-zinc-800 p-3.5 flex flex-col min-h-0">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-bold text-gray-900 dark:text-zinc-50">
                {selectedDay ? prettyDate(selectedDay) : "Selecione um dia"}
              </h3>
              {canEdit && selectedDay && (
                <div className="flex items-center gap-1">
                  <button onClick={() => openCreateEvent(selectedDay)} className="p-1.5 rounded-lg bg-sky-500/10 hover:bg-sky-500/20 text-sky-600 dark:text-sky-400 cursor-pointer" title="Novo compromisso">
                    <CalendarPlus className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => { setTDate(selectedDay); setShowTaskModal(true); }} className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 cursor-pointer" title="Nova tarefa neste dia">
                    <CheckSquare className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>

            {!selectedDay ? (
              <p className="text-xs text-gray-400 dark:text-zinc-500 py-4 text-center">Clique em um dia no calendário para ver e criar compromissos e tarefas.</p>
            ) : selectedEvents.length === 0 && selectedTasks.length === 0 ? (
              <p className="text-xs text-gray-400 dark:text-zinc-500 py-4 text-center">Nada agendado. Use os botões acima para adicionar.</p>
            ) : (
              <div className="space-y-1.5 overflow-y-auto -mr-1 pr-1">
                {selectedEvents.map((ev) => (
                  <div key={ev.id} className="p-2.5 rounded-xl border border-gray-150 dark:border-zinc-800 group" style={{ borderLeftWidth: 3, borderLeftColor: ev.color }}>
                    <div className="flex items-start justify-between gap-1">
                      <p className="text-xs font-bold text-gray-900 dark:text-zinc-50">{ev.title}</p>
                      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        <a href={googleCalUrl(eventToICS(ev))} target="_blank" rel="noreferrer" className="p-1 rounded hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-400 hover:text-sky-500" title="Google Agenda"><ExternalLink className="w-3 h-3" /></a>
                        <button onClick={() => downloadICS(ev.title, [eventToICS(ev)])} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-400 hover:text-sky-500" title="Baixar .ics"><Download className="w-3 h-3" /></button>
                        {canEdit && <button onClick={() => openEditEvent(ev)} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-400 hover:text-sky-500"><Pencil className="w-3 h-3" /></button>}
                        {canEdit && (
                          <button
                            onClick={async () => {
                              if (await confirm({ title: "Excluir compromisso", message: `Excluir "${ev.title}"?`, confirmLabel: "Excluir", tone: "danger" })) deleteCalendarEvent(ev.id);
                            }}
                            className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-500/10 text-gray-400 hover:text-red-500"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                    <p className="text-[10px] text-gray-500 dark:text-zinc-400 flex items-center gap-2 flex-wrap mt-1">
                      {ev.allDay ? <span>Dia inteiro</span> : ev.startTime && <span className="flex items-center gap-1"><Clock className="w-2.5 h-2.5" />{ev.startTime}{ev.endTime ? `–${ev.endTime}` : ""}</span>}
                      {ev.location && <span className="flex items-center gap-1"><MapPin className="w-2.5 h-2.5" />{ev.location}</span>}
                      {ev.assignedToName && <span className="flex items-center gap-1"><User className="w-2.5 h-2.5" />{ev.assignedToName}</span>}
                    </p>
                    {ev.description && <p className="text-[10px] text-gray-500 dark:text-zinc-400 mt-1 whitespace-pre-wrap">{ev.description}</p>}
                  </div>
                ))}
                {selectedTasks.map((t) => (
                  <div key={t.id} className="p-2.5 rounded-xl border border-gray-150 dark:border-zinc-800 flex items-center gap-2 bg-emerald-500/5">
                    <button onClick={() => canEdit && toggleTaskStatus(t.id)} className="shrink-0" title="Concluir">
                      <CheckSquare className={`w-4 h-4 ${t.status === "completed" ? "text-emerald-500" : "text-gray-300 dark:text-zinc-600"}`} />
                    </button>
                    <p className={`text-xs font-semibold flex-1 truncate ${t.status === "completed" ? "line-through text-gray-400" : "text-gray-800 dark:text-zinc-100"}`}>{t.title}</p>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">Tarefa</span>
                    {canEdit && (
                      <button onClick={() => updateTaskFields(t.id, { dueDate: "" })} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-400 hover:text-red-500 shrink-0" title="Remover do calendário">
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Unscheduled tasks */}
          {canEdit && unscheduledTasks.length > 0 && (
            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-200 dark:border-zinc-800 p-3.5 min-h-0 flex flex-col">
              <h3 className="text-xs font-bold text-gray-900 dark:text-zinc-50 mb-1 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Tarefas sem data
              </h3>
              <p className="text-[10px] text-gray-400 dark:text-zinc-500 mb-2">Defina uma data para colocá-las no calendário.</p>
              <div className="space-y-1.5 overflow-y-auto -mr-1 pr-1 max-h-52">
                {unscheduledTasks.map((t) => (
                  <div key={t.id} className="flex items-center gap-2 p-2 rounded-xl border border-gray-150 dark:border-zinc-800">
                    <p className="text-xs font-semibold text-gray-800 dark:text-zinc-100 flex-1 truncate">{t.title}</p>
                    <input
                      type="date"
                      onChange={(e) => scheduleTask(t, e.target.value)}
                      className="text-[10px] px-1.5 py-1 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg text-gray-700 dark:text-zinc-200 cursor-pointer shrink-0 w-28"
                      title="Agendar tarefa"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Sync hint */}
          <div className="bg-sky-50/70 dark:bg-sky-950/20 border border-sky-100 dark:border-sky-900/30 rounded-2xl p-3 text-[11px] text-sky-700 dark:text-sky-300 flex items-start gap-2">
            <CalendarClock className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Sincronize com o celular:</span> use <span className="font-semibold">Exportar</span> (.ics) para importar tudo no app de calendário do seu telefone, ou o ícone do Google Agenda em cada item. {isPersonal ? "" : "Todos os membros do grupo veem estes compromissos em tempo real."}
            </div>
          </div>
        </div>
      </div>

      {/* ══════ EVENT MODAL ══════ */}
      <AnimatePresence>
        {showEventModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <motion.div initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.96, opacity: 0 }} className="bg-white dark:bg-zinc-900 rounded-3xl p-6 w-full max-w-md border border-gray-200 dark:border-zinc-800 shadow-2xl relative max-h-[90dvh] overflow-y-auto scrollbar-thin">
              <button onClick={() => setShowEventModal(false)} className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-400"><X className="w-5 h-5" /></button>
              <h3 className="text-sm font-bold text-gray-900 dark:text-zinc-50 mb-4 flex items-center gap-2">
                <CalendarPlus className="w-5 h-5 text-sky-500" />
                {editingEvent ? "Editar compromisso" : "Novo compromisso"}
              </h3>
              <form onSubmit={submitEvent} className="space-y-3.5 text-xs">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Nome do compromisso</label>
                  <input value={fTitle} onChange={(e) => setFTitle(e.target.value)} placeholder="Ex: Reunião de alinhamento" required autoFocus className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-sky-500 text-gray-900 dark:text-white font-semibold" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Data</label>
                    <input type="date" value={fDate} onChange={(e) => setFDate(e.target.value)} required className="w-full px-3 py-2 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-sky-500 text-gray-900 dark:text-white" />
                  </div>
                  <div className="flex items-end pb-1">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={fAllDay} onChange={(e) => setFAllDay(e.target.checked)} className="w-4 h-4 accent-sky-500" />
                      <span className="font-semibold text-gray-700 dark:text-zinc-300">Dia inteiro</span>
                    </label>
                  </div>
                </div>
                {!fAllDay && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Início</label>
                      <input type="time" value={fStart} onChange={(e) => setFStart(e.target.value)} className="w-full px-3 py-2 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-sky-500 text-gray-900 dark:text-white" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Fim</label>
                      <input type="time" value={fEnd} onChange={(e) => setFEnd(e.target.value)} className="w-full px-3 py-2 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-sky-500 text-gray-900 dark:text-white" />
                    </div>
                  </div>
                )}
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Local (opcional)</label>
                  <input value={fLocation} onChange={(e) => setFLocation(e.target.value)} placeholder="Ex: Sala 2, Google Meet, Rua X" className="w-full px-3.5 py-2 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-sky-500 text-gray-900 dark:text-white" />
                </div>
                {!isPersonal && (
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Atribuir a</label>
                    <select value={fAssigned} onChange={(e) => setFAssigned(e.target.value)} className="w-full px-3 py-2.5 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-sky-500 text-gray-800 dark:text-zinc-200">
                      <option value="">Ninguém específico</option>
                      <option value="all">Todos do canal</option>
                      {groupMembers.map((m) => <option key={m.userId} value={m.userId}>{m.name}</option>)}
                    </select>
                  </div>
                )}
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Descrição (opcional)</label>
                  <textarea value={fDesc} onChange={(e) => setFDesc(e.target.value)} placeholder="Pauta, links, observações..." className="w-full px-3.5 py-2 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-sky-500 text-gray-900 dark:text-white h-16 resize-none" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-2">Cor</label>
                  <div className="flex gap-2">
                    {EVENT_COLORS.map((c) => (
                      <button key={c} type="button" onClick={() => setFColor(c)} className={`w-7 h-7 rounded-lg border-2 cursor-pointer transition-all ${fColor === c ? "border-sky-500 scale-110" : "border-transparent"}`} style={{ backgroundColor: c }} />
                    ))}
                  </div>
                </div>
                <div className="flex gap-2 justify-between items-center pt-2">
                  {editingEvent ? (
                    <button type="button" onClick={async () => { if (await confirm({ title: "Excluir compromisso", message: `Excluir "${editingEvent.title}"?`, confirmLabel: "Excluir", tone: "danger" })) { deleteCalendarEvent(editingEvent.id); setShowEventModal(false); } }} className="px-3 py-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg font-semibold cursor-pointer">
                      Excluir
                    </button>
                  ) : <span />}
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setShowEventModal(false)} className="px-4 py-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-gray-500 rounded-lg font-semibold cursor-pointer">Cancelar</button>
                    <button type="submit" className="px-5 py-2.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl shadow-xs transition-all font-semibold cursor-pointer">Salvar</button>
                  </div>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ══════ QUICK TASK MODAL ══════ */}
      <AnimatePresence>
        {showTaskModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <motion.div initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.96, opacity: 0 }} className="bg-white dark:bg-zinc-900 rounded-3xl p-6 w-full max-w-sm border border-gray-200 dark:border-zinc-800 shadow-2xl relative">
              <button onClick={() => setShowTaskModal(false)} className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-400"><X className="w-5 h-5" /></button>
              <h3 className="text-sm font-bold text-gray-900 dark:text-zinc-50 mb-4 flex items-center gap-2"><CheckSquare className="w-5 h-5 text-emerald-500" /> Nova tarefa</h3>
              <form onSubmit={submitTask} className="space-y-3.5 text-xs">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Título</label>
                  <input value={tTitle} onChange={(e) => setTTitle(e.target.value)} required autoFocus placeholder="Ex: Enviar relatório" className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-sky-500 text-gray-900 dark:text-white font-semibold" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Data</label>
                    <input type="date" value={tDate} onChange={(e) => setTDate(e.target.value)} required className="w-full px-3 py-2 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-sky-500 text-gray-900 dark:text-white" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Prioridade</label>
                    <select value={tPriority} onChange={(e) => setTPriority(e.target.value as any)} className="w-full px-3 py-2.5 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-sky-500 text-gray-800 dark:text-zinc-200">
                      <option value="low">Baixa</option>
                      <option value="medium">Média</option>
                      <option value="high">Alta</option>
                    </select>
                  </div>
                </div>
                {!isPersonal && (
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Atribuir a</label>
                    <select value={tAssigned} onChange={(e) => setTAssigned(e.target.value)} className="w-full px-3 py-2.5 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-sky-500 text-gray-800 dark:text-zinc-200">
                      <option value="">Ninguém / Solo</option>
                      <option value="all">Todos do canal</option>
                      {groupMembers.map((m) => <option key={m.userId} value={m.userId}>{m.name}</option>)}
                    </select>
                  </div>
                )}
                <div className="flex gap-2 justify-end pt-2">
                  <button type="button" onClick={() => setShowTaskModal(false)} className="px-4 py-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-gray-500 rounded-lg font-semibold cursor-pointer">Cancelar</button>
                  <button type="submit" className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-xs font-semibold cursor-pointer">Criar tarefa</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
