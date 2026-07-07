/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Assistente de IA — transforma um "despejo de ideias" (falado ou digitado) em
 * tarefas estruturadas (com prioridade, prazo e checklist) e compromissos de
 * calendário (com data e horário).
 *
 * Estratégia de dupla camada, igual ao resto do app (Cloud vs Demo):
 *  - Se houver uma chave de IA (VITE_GEMINI_API_KEY), usa o Gemini para uma
 *    extração de alta qualidade com saída JSON estruturada.
 *  - Sem chave (ou se a chamada falhar), cai para um parser heurístico em
 *    português que roda 100% no navegador. Assim a feature NUNCA quebra —
 *    funciona offline e no modo demo, só com qualidade menor.
 */

export type AiPriority = "low" | "medium" | "high";

export interface AiExtractedTask {
  title: string;
  description?: string;
  priority: AiPriority;
  dueDate?: string; // YYYY-MM-DD
  checklist?: string[];
  tags?: string[];
}

export interface AiExtractedEvent {
  title: string;
  description?: string;
  date: string; // YYYY-MM-DD
  startTime?: string; // HH:mm
  endTime?: string; // HH:mm
  location?: string;
}

export interface AiPlan {
  summary: string;
  tasks: AiExtractedTask[];
  events: AiExtractedEvent[];
  source: "ai" | "local"; // de onde veio a extração (para UI/telemetria)
}

const AI_API_KEY: string =
  (import.meta as any).env?.VITE_GEMINI_API_KEY ||
  (import.meta as any).env?.VITE_AI_API_KEY ||
  "";

export const isAiConfigured = (): boolean => !!AI_API_KEY;

const AI_MODEL = "gemini-2.5-flash";

const pad2 = (n: number) => String(n).padStart(2, "0");
const toISODate = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

/* ------------------------------------------------------------------ */
/*  Camada 1: Gemini (extração inteligente)                            */
/* ------------------------------------------------------------------ */

async function extractWithGemini(text: string, today: Date): Promise<AiPlan> {
  // Import dinâmico: só carrega o SDK quando a IA é realmente usada.
  const { GoogleGenAI, Type } = await import("@google/genai");
  const ai = new GoogleGenAI({ apiKey: AI_API_KEY });

  const todayISO = toISODate(today);
  const weekdayPT = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"][today.getDay()];

  const responseSchema = {
    type: Type.OBJECT,
    properties: {
      summary: { type: Type.STRING },
      tasks: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            description: { type: Type.STRING },
            priority: { type: Type.STRING, enum: ["low", "medium", "high"] },
            dueDate: { type: Type.STRING, description: "Data no formato YYYY-MM-DD, ou vazio se não houver prazo" },
            checklist: { type: Type.ARRAY, items: { type: Type.STRING } },
            tags: { type: Type.ARRAY, items: { type: Type.STRING } },
          },
          required: ["title", "priority"],
        },
      },
      events: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            description: { type: Type.STRING },
            date: { type: Type.STRING, description: "Data no formato YYYY-MM-DD" },
            startTime: { type: Type.STRING, description: "Horário HH:mm, ou vazio" },
            endTime: { type: Type.STRING, description: "Horário HH:mm, ou vazio" },
            location: { type: Type.STRING },
          },
          required: ["title", "date"],
        },
      },
    },
    required: ["summary", "tasks", "events"],
  };

  const systemInstruction =
    "Você é um assistente de produtividade que organiza o que o usuário fala ou escreve. " +
    "A partir de um despejo de ideias em português do Brasil, separe em DUAS categorias:\n" +
    "1. TAREFAS (tasks): coisas a fazer. Infira a prioridade (low/medium/high) pelo tom e por " +
    "palavras como 'urgente', 'importante', 'quando puder'. Se a tarefa tiver passos, preencha a checklist. " +
    "Se houver um prazo, preencha dueDate.\n" +
    "2. COMPROMISSOS (events): reuniões, encontros, consultas, ligações agendadas — qualquer coisa " +
    "com data/horário marcado. Sempre preencha 'date'; preencha startTime/endTime quando o horário for mencionado.\n\n" +
    `Hoje é ${weekdayPT}, ${todayISO}. Resolva datas relativas ('amanhã', 'sexta que vem', 'dia 20') para YYYY-MM-DD ` +
    "sempre no futuro em relação a hoje. Títulos curtos e claros, sem 'preciso' ou 'tenho que'. " +
    "Mantenha tudo em português. Escreva um 'summary' de uma frase resumindo o que foi organizado. " +
    "Se algo não for nem tarefa nem compromisso, ignore.";

  const res: any = await ai.models.generateContent({
    model: AI_MODEL,
    contents: text,
    config: {
      systemInstruction,
      responseMimeType: "application/json",
      responseSchema,
      temperature: 0.2,
    },
  });

  const raw = (res?.text ?? "").trim();
  const parsed = JSON.parse(raw);

  return {
    summary: typeof parsed.summary === "string" ? parsed.summary : "",
    tasks: Array.isArray(parsed.tasks) ? parsed.tasks.map(normalizeTask) : [],
    events: Array.isArray(parsed.events) ? parsed.events.map(normalizeEvent).filter(Boolean) : [],
    source: "ai",
  };
}

function normalizeTask(t: any): AiExtractedTask {
  const priority: AiPriority = ["low", "medium", "high"].includes(t?.priority) ? t.priority : "medium";
  return {
    title: String(t?.title || "Nova tarefa").trim().slice(0, 140),
    description: t?.description ? String(t.description).trim() : "",
    priority,
    dueDate: isISODate(t?.dueDate) ? t.dueDate : "",
    checklist: Array.isArray(t?.checklist) ? t.checklist.map((c: any) => String(c).trim()).filter(Boolean) : [],
    tags: Array.isArray(t?.tags) ? t.tags.map((c: any) => String(c).trim()).filter(Boolean) : [],
  };
}

function normalizeEvent(e: any): AiExtractedEvent | null {
  if (!e?.title) return null;
  const date = isISODate(e?.date) ? e.date : "";
  if (!date) return null;
  return {
    title: String(e.title).trim().slice(0, 140),
    description: e?.description ? String(e.description).trim() : "",
    date,
    startTime: isTime(e?.startTime) ? e.startTime : "",
    endTime: isTime(e?.endTime) ? e.endTime : "",
    location: e?.location ? String(e.location).trim() : "",
  };
}

const isISODate = (s: any): boolean => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);
const isTime = (s: any): boolean => typeof s === "string" && /^\d{2}:\d{2}$/.test(s);

/* ------------------------------------------------------------------ */
/*  Camada 2: Parser heurístico local (fallback pt-BR, sem rede)       */
/* ------------------------------------------------------------------ */

const WEEKDAYS_PT: { [k: string]: number } = {
  domingo: 0,
  segunda: 1,
  "segunda-feira": 1,
  terca: 2,
  terça: 2,
  "terca-feira": 2,
  "terça-feira": 2,
  quarta: 3,
  "quarta-feira": 3,
  quinta: 4,
  "quinta-feira": 4,
  sexta: 5,
  "sexta-feira": 5,
  sabado: 6,
  sábado: 6,
};

const EVENT_HINTS = [
  "reuni",
  "reunião",
  "compromisso",
  "consulta",
  "encontro",
  "marcar",
  "agendar",
  "agendamento",
  "call",
  "ligar para",
  "ligação",
  "almoço",
  "almoco",
  "café",
  "cafe",
  "evento",
  "aniversário",
  "aniversario",
  "entrevista",
  "apresentação",
  "apresentacao",
  "visita",
];

const HIGH_HINTS = ["urgente", "urgência", "prioridade alta", "importante", "o quanto antes", "asap", "pra ontem", "crítico", "critico", "hoje mesmo"];
const LOW_HINTS = ["sem pressa", "quando puder", "quando der", "prioridade baixa", "baixa prioridade", "algum dia", "eventualmente"];

const FILLER_PREFIXES = [
  "preciso de",
  "preciso",
  "tenho que",
  "tenho de",
  "eu tenho que",
  "lembrar de",
  "lembra de",
  "não esquecer de",
  "nao esquecer de",
  "quero",
  "gostaria de",
  "devo",
  "vou",
  "marcar",
  "agendar",
  "fazer",
];

function stripAccents(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

function detectPriority(seg: string): AiPriority {
  const low = stripAccents(seg.toLowerCase());
  if (HIGH_HINTS.some((h) => low.includes(stripAccents(h)))) return "high";
  if (LOW_HINTS.some((h) => low.includes(stripAccents(h)))) return "low";
  return "medium";
}

function detectTime(seg: string): { startTime: string; endTime: string } {
  // "às 15h", "15h30", "15:30", "das 14h às 16h" — exige "h" ou ":" para contar como horário
  const times: string[] = [];
  let m: RegExpExecArray | null;
  const scan = /(\d{1,2})\s*(?:h|:)\s*(\d{2})?/gi;
  while ((m = scan.exec(seg)) !== null) {
    const h = parseInt(m[1], 10);
    if (h > 23) continue;
    const min = m[2] ? parseInt(m[2], 10) : 0;
    if (min > 59) continue;
    times.push(`${pad2(h)}:${pad2(min)}`);
    if (times.length >= 2) break;
  }
  return { startTime: times[0] || "", endTime: times[1] || "" };
}

function detectDate(seg: string, today: Date): string {
  const low = stripAccents(seg.toLowerCase());

  if (/depois de amanha/.test(low)) {
    const d = new Date(today);
    d.setDate(d.getDate() + 2);
    return toISODate(d);
  }
  if (/\bamanha\b/.test(low)) {
    const d = new Date(today);
    d.setDate(d.getDate() + 1);
    return toISODate(d);
  }
  if (/\bhoje\b/.test(low)) {
    return toISODate(today);
  }

  // dia da semana ("sexta", "na quinta", "sexta que vem")
  for (const key of Object.keys(WEEKDAYS_PT)) {
    const k = stripAccents(key);
    const re = new RegExp(`\\b${k}\\b`);
    if (re.test(low)) {
      const target = WEEKDAYS_PT[key];
      const d = new Date(today);
      let diff = (target - d.getDay() + 7) % 7;
      if (diff === 0) diff = 7; // "sexta" já passando hoje -> próxima sexta
      if (/que vem|semana que vem|proxima|próxima/.test(low)) diff += 7;
      d.setDate(d.getDate() + diff);
      return toISODate(d);
    }
  }

  // dd/mm ou dd/mm/aaaa
  const slash = seg.match(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/);
  if (slash) {
    const day = parseInt(slash[1], 10);
    const month = parseInt(slash[2], 10) - 1;
    let year = slash[3] ? parseInt(slash[3], 10) : today.getFullYear();
    if (year < 100) year += 2000;
    const d = new Date(year, month, day);
    if (!isNaN(d.getTime())) return toISODate(d);
  }

  // "dia 20"
  const diaMatch = low.match(/\bdia\s+(\d{1,2})\b/);
  if (diaMatch) {
    const day = parseInt(diaMatch[1], 10);
    if (day >= 1 && day <= 31) {
      let d = new Date(today.getFullYear(), today.getMonth(), day);
      if (d.getTime() < today.setHours(0, 0, 0, 0)) {
        d = new Date(today.getFullYear(), today.getMonth() + 1, day);
      }
      return toISODate(d);
    }
  }

  return "";
}

function cleanTitle(seg: string): string {
  let s = seg.trim().replace(/\s+/g, " ");
  // remove prefixos de "recheio"
  let changed = true;
  while (changed) {
    changed = false;
    const low = stripAccents(s.toLowerCase());
    for (const p of FILLER_PREFIXES) {
      const pl = stripAccents(p);
      if (low.startsWith(pl + " ")) {
        s = s.slice(p.length).trim();
        changed = true;
        break;
      }
    }
  }
  // corta menções de tempo do fim para o título ficar limpo
  s = s.replace(/\b(?:hoje|amanhã|amanha|depois de amanhã|até|ate)\b.*$/i, "").trim() || s;
  if (!s) return seg.trim();
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function localExtract(text: string, today: Date): AiPlan {
  const segments = text
    .split(/[\n.;!?]+|,?\s*(?:e\s+)?depois\b|,?\s*(?:e\s+)?tamb[ée]m\b|,?\s+e\s+(?=(?:preciso|tenho|marcar|agendar|lembrar|quero|reuni))/i)
    .map((s) => s.trim())
    .filter((s) => s.length >= 3);

  const tasks: AiExtractedTask[] = [];
  const events: AiExtractedEvent[] = [];

  for (const seg of segments) {
    const low = stripAccents(seg.toLowerCase());
    const isEvent = EVENT_HINTS.some((h) => low.includes(stripAccents(h)));
    const date = detectDate(seg, new Date(today));
    const { startTime, endTime } = detectTime(seg);

    if (isEvent || (date && startTime)) {
      events.push({
        title: cleanTitle(seg),
        description: "",
        date: date || toISODate(today),
        startTime,
        endTime,
        location: "",
      });
    } else {
      tasks.push({
        title: cleanTitle(seg),
        description: "",
        priority: detectPriority(seg),
        dueDate: date || "",
        checklist: [],
        tags: [],
      });
    }
  }

  const summary =
    tasks.length || events.length
      ? `Organizei ${tasks.length} tarefa(s) e ${events.length} compromisso(s).`
      : "Não consegui identificar tarefas ou compromissos no texto.";

  return { summary, tasks, events, source: "local" };
}

/* ------------------------------------------------------------------ */
/*  API pública                                                        */
/* ------------------------------------------------------------------ */

/**
 * Extrai um plano (tarefas + compromissos) a partir de texto livre.
 * Tenta a IA; em qualquer falha, cai para o parser local silenciosamente.
 */
export async function generatePlanFromText(text: string): Promise<AiPlan> {
  const clean = (text || "").trim();
  const today = new Date();
  if (!clean) {
    return { summary: "Nada para organizar.", tasks: [], events: [], source: "local" };
  }

  if (isAiConfigured()) {
    try {
      const plan = await extractWithGemini(clean, today);
      // Se a IA não achou nada, tenta o parser local como reforço.
      if (plan.tasks.length === 0 && plan.events.length === 0) {
        return localExtract(clean, today);
      }
      return plan;
    } catch (err) {
      console.warn("[aiAssistant] Falha na IA, usando parser local:", err);
      return localExtract(clean, today);
    }
  }

  return localExtract(clean, today);
}

/**
 * Quebra uma tarefa em subtarefas (checklist) acionáveis. Usa a IA quando
 * configurada; senão devolve um esqueleto genérico útil.
 */
export async function generateChecklist(title: string, description = ""): Promise<string[]> {
  const clean = (title || "").trim();
  if (!clean) return [];

  if (isAiConfigured()) {
    try {
      const { GoogleGenAI, Type } = await import("@google/genai");
      const ai = new GoogleGenAI({ apiKey: AI_API_KEY });
      const responseSchema = {
        type: Type.OBJECT,
        properties: { steps: { type: Type.ARRAY, items: { type: Type.STRING } } },
        required: ["steps"],
      };
      const res: any = await ai.models.generateContent({
        model: AI_MODEL,
        contents: `Tarefa: ${clean}${description ? "\nDetalhes: " + description : ""}`,
        config: {
          systemInstruction:
            "Quebre a tarefa em 3 a 6 subtarefas objetivas e acionáveis, em português do Brasil. " +
            "Cada passo curto, começando por um verbo no infinitivo. Não numere.",
          responseMimeType: "application/json",
          responseSchema,
          temperature: 0.3,
        },
      });
      const parsed = JSON.parse((res?.text ?? "").trim());
      if (Array.isArray(parsed.steps)) {
        const steps = parsed.steps.map((s: any) => String(s).trim()).filter(Boolean).slice(0, 8);
        if (steps.length) return steps;
      }
    } catch (err) {
      console.warn("[aiAssistant] Falha ao gerar subtarefas, usando esqueleto local:", err);
    }
  }

  // Fallback local: esqueleto genérico de execução.
  return ["Planejar e organizar", "Executar a parte principal", "Revisar o resultado", "Concluir e comunicar"];
}

/**
 * Resume a atividade de um grupo (a partir de um registro de ações) em poucas
 * frases. Usa a IA quando configurada; senão devolve o `fallback` já calculado
 * pelo chamador (contagens simples). Nunca quebra.
 */
export async function summarizeActivity(digest: string, fallback: string): Promise<string> {
  const clean = (digest || "").trim();
  if (!clean) return fallback;

  if (isAiConfigured()) {
    try {
      const { GoogleGenAI } = await import("@google/genai");
      const ai = new GoogleGenAI({ apiKey: AI_API_KEY });
      const res: any = await ai.models.generateContent({
        model: AI_MODEL,
        contents: clean,
        config: {
          systemInstruction:
            "Você resume a atividade de um grupo de trabalho, em português do Brasil. " +
            "A partir do registro de ações abaixo, escreva um resumo objetivo em 2 a 4 frases, " +
            "destacando o que foi concluído, o que está em andamento e quem se destacou. " +
            "Tom profissional e direto. Não invente dados que não estejam no registro.",
          temperature: 0.4,
        },
      });
      const out = (res?.text ?? "").trim();
      if (out) return out;
    } catch (err) {
      console.warn("[aiAssistant] Falha ao resumir atividade, usando fallback:", err);
    }
  }

  return fallback;
}
