/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { DEFAULT_THEME, type SiteThemeConfig } from "../config/themes";

/**
 * Motor de temas do worksync.
 *
 * Toda a UI referencia os tokens `--color-sky-*` (destaque) e `--color-zinc-*`
 * (superfícies) definidos em `src/index.css` via Tailwind v4 `@theme`. Este
 * módulo sobrescreve essas variáveis em runtime a partir da configuração do
 * tema, então trocar de tema retinge de verdade botões, estados ativos,
 * bordas, painéis e o fundo do app — mantendo a escala de luminância original
 * para não quebrar contraste nem hierarquia.
 */

const KEY = "worksync_site_theme";
export const SITE_THEME_EVENT = "site-theme-changed";

/* ── Utilidades de cor (HSL) ─────────────────────────────────────────── */

type HSL = { h: number; s: number; l: number };

function hexToHsl(hex: string): HSL {
  const m = hex.replace("#", "");
  const full = m.length === 3 ? m.split("").map((c) => c + c).join("") : m;
  const r = parseInt(full.slice(0, 2), 16) / 255;
  const g = parseInt(full.slice(2, 4), 16) / 255;
  const b = parseInt(full.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;
  return { h: h * 360, s, l };
}

function hslToRgb({ h, s, l }: HSL): [number, number, number] {
  const hue = ((h % 360) + 360) % 360 / 360;
  if (s === 0) {
    const v = Math.round(l * 255);
    return [v, v, v];
  }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const f = (t: number) => {
    let x = t;
    if (x < 0) x += 1;
    if (x > 1) x -= 1;
    if (x < 1 / 6) return p + (q - p) * 6 * x;
    if (x < 1 / 2) return q;
    if (x < 2 / 3) return p + (q - p) * (2 / 3 - x) * 6;
    return p;
  };
  return [f(hue + 1 / 3), f(hue), f(hue - 1 / 3)].map((v) => Math.round(v * 255)) as [number, number, number];
}

function hslToHex(hsl: HSL): string {
  const [r, g, b] = hslToRgb(hsl);
  return "#" + [r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("");
}

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

/* ── Tokens base (espelham o @theme de src/index.css) ────────────────── */

/** Rampa de destaque padrão (azul-real) — serve de gabarito de luminância. */
const SKY_BASE: Record<string, string> = {
  "50": "#edf3ff", "100": "#dbe6ff", "200": "#b8ceff", "300": "#8aabff",
  "350": "#6f98fb", "400": "#5685fb", "405": "#5182fb", "450": "#3d74f3",
  "455": "#386ff2", "500": "#2563eb", "505": "#2360e8", "600": "#1750d0",
  "655": "#1447bc", "700": "#123fa8", "750": "#133b96", "800": "#143784",
  "850": "#143577", "900": "#15306b", "950": "#0c1c40", "955": "#0b1a3a",
};

/** Escala neutra padrão (navy) — retingida por matiz/saturação do tema. */
const ZINC_BASE: Record<string, string> = {
  "50": "#f6f8fc", "55": "#fafcfe", "100": "#eef2f9", "105": "#eef2f8",
  "150": "#e6ebf3", "200": "#e0e6f0", "300": "#c6cfde", "350": "#aeb9c9",
  "355": "#acb7c7", "400": "#8f9cb3", "450": "#7c8ba1", "500": "#64748b",
  "505": "#5f6f85", "550": "#566579", "555": "#54637a", "600": "#465066",
  "650": "#33455f", "700": "#2b3b58", "755": "#263857", "800": "#1e304e",
  "855": "#17253f", "900": "#131f36", "905": "#0f1a2e", "950": "#0b1526",
};

/** Tokens neutros com transparência (base hex + alfa). */
const ZINC_ALPHA: Record<string, { base: string; alpha: number }> = {
  "750": { base: "#2b3b58", alpha: 0.7 },
  "850": { base: "#152037", alpha: 0.55 },
};

/* ── Derivação de rampas ─────────────────────────────────────────────── */

/**
 * Deriva a rampa de destaque completa a partir de uma única cor: mantém a
 * escala de luminância do gabarito e transplanta matiz/saturação do acento.
 */
function accentRamp(accentHex: string): Record<string, string> {
  const accent = hexToHsl(accentHex);
  const base500 = hexToHsl(SKY_BASE["500"]);
  const satScale = base500.s > 0 ? accent.s / base500.s : 1;
  const out: Record<string, string> = {};
  for (const [stop, hex] of Object.entries(SKY_BASE)) {
    if (stop === "500") {
      out[stop] = accentHex;
      continue;
    }
    const t = hexToHsl(hex);
    out[stop] = hslToHex({ h: accent.h, s: clamp(t.s * satScale, 0.04, 1), l: t.l });
  }
  return out;
}

/** Retinge um token neutro preservando a luminância original. */
function tintNeutral(hex: string, hue: number, satMul: number): HSL {
  const t = hexToHsl(hex);
  return { h: hue, s: clamp(t.s * satMul, 0, 0.85), l: t.l };
}

/* ── Persistência ────────────────────────────────────────────────────── */

/** Remove emojis/pictogramas de textos vindos de configurações antigas. */
function stripEmoji(text: string): string {
  return text
    .replace(/[\u{1F000}-\u{1FAFF}\u{2190}-\u{2BFF}\u{2600}-\u{27BF}\u{FE0F}\u{200D}]/gu, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function normalize(raw: Partial<SiteThemeConfig>): SiteThemeConfig {
  const cfg = { ...DEFAULT_THEME, ...raw };
  return {
    preset: cfg.preset || "custom",
    accent: cfg.accent || DEFAULT_THEME.accent,
    surfaceHue: Number.isFinite(cfg.surfaceHue) ? cfg.surfaceHue : DEFAULT_THEME.surfaceHue,
    surfaceSat: Number.isFinite(cfg.surfaceSat) ? clamp(cfg.surfaceSat, 0, 1.2) : DEFAULT_THEME.surfaceSat,
    title: stripEmoji(cfg.title || DEFAULT_THEME.title),
    banner: stripEmoji(cfg.banner || ""),
    bannerFrom: cfg.bannerFrom || cfg.accent || DEFAULT_THEME.bannerFrom,
    bannerTo: cfg.bannerTo || cfg.accent || DEFAULT_THEME.bannerTo,
  };
}

export function loadSiteTheme(): SiteThemeConfig {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return normalize(JSON.parse(raw));
  } catch {
    /* noop */
  }
  return { ...DEFAULT_THEME };
}

export function saveSiteTheme(cfg: SiteThemeConfig): void {
  const clean = normalize(cfg);
  try {
    localStorage.setItem(KEY, JSON.stringify(clean));
  } catch {
    /* noop */
  }
  applySiteTheme(clean);
  window.dispatchEvent(new CustomEvent(SITE_THEME_EVENT, { detail: clean }));
  // Sincroniza globalmente (modo cloud) — só o super-admin tem permissão de escrita.
  saveCloudTheme(clean);
}

async function saveCloudTheme(cfg: SiteThemeConfig): Promise<void> {
  try {
    const { isDemoMode } = await import("../db/firebase");
    if (isDemoMode) return;
    const { db } = await import("../db/firebase");
    const { doc, setDoc } = await import("firebase/firestore");
    await setDoc(doc(db, "admin", "siteTheme"), cfg, { merge: true });
  } catch {
    /* sem permissão / offline — mantém apenas local */
  }
}

/** Lê o tema global do Firestore (modo cloud). Retorna null se indisponível. */
export async function fetchCloudTheme(): Promise<SiteThemeConfig | null> {
  try {
    const { isDemoMode } = await import("../db/firebase");
    if (isDemoMode) return null;
    const { db } = await import("../db/firebase");
    const { doc, getDoc } = await import("firebase/firestore");
    const snap = await getDoc(doc(db, "admin", "siteTheme"));
    if (snap.exists()) return normalize(snap.data() as Partial<SiteThemeConfig>);
  } catch {
    /* noop */
  }
  return null;
}

/* ── Aplicação ───────────────────────────────────────────────────────── */

let themeAnimTimer: number | undefined;

/** Cor de superfície usada em prévias (painel de Aparência). */
export function surfacePreviewColor(hue: number, satMul: number, stop: "900" | "950" | "800" = "950"): string {
  return hslToHex(tintNeutral(ZINC_BASE[stop], hue, satMul));
}

/**
 * Aplica o tema: sobrescreve os tokens de destaque e de superfície no
 * documento, atualiza título e a meta theme-color (PWA).
 */
export function applySiteTheme(cfg: SiteThemeConfig): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;

  // Transição suave de cores ao trocar de tema (removida em seguida para
  // não interferir nas animações normais da UI).
  root.classList.add("ws-theme-anim");
  if (themeAnimTimer) window.clearTimeout(themeAnimTimer);
  themeAnimTimer = window.setTimeout(() => root.classList.remove("ws-theme-anim"), 600);

  // Rampa de destaque. Os tokens `--color-sky-*` do @theme apontam para
  // `--ws-sky-*` (indireção que impede o build de pré-calcular as variantes
  // com opacidade), então basta definir as variáveis de runtime.
  const ramp = accentRamp(cfg.accent || DEFAULT_THEME.accent);
  for (const [stop, hex] of Object.entries(ramp)) {
    root.style.setProperty(`--ws-sky-${stop}`, hex);
  }

  // Superfícies (`--ws-zinc-*`), preservando luminância.
  for (const [stop, hex] of Object.entries(ZINC_BASE)) {
    root.style.setProperty(`--ws-zinc-${stop}`, hslToHex(tintNeutral(hex, cfg.surfaceHue, cfg.surfaceSat)));
  }
  for (const [stop, { base, alpha }] of Object.entries(ZINC_ALPHA)) {
    const [r, g, b] = hslToRgb(tintNeutral(base, cfg.surfaceHue, cfg.surfaceSat));
    root.style.setProperty(`--ws-zinc-${stop}`, `rgb(${r} ${g} ${b} / ${alpha})`);
  }

  // Compatibilidade: acento simples como variável global.
  root.style.setProperty("--ws-accent", cfg.accent || DEFAULT_THEME.accent);

  // Meta theme-color (barra do navegador / PWA) acompanha a superfície.
  const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (meta) meta.content = hslToHex(tintNeutral(ZINC_BASE["950"], cfg.surfaceHue, cfg.surfaceSat));

  // Título do documento.
  if (cfg.title) document.title = cfg.title;

  // Restaura o favicon original caso uma versão antiga tenha trocado por emoji.
  const link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
  if (link?.dataset.wsOriginal) {
    link.href = link.dataset.wsOriginal;
    delete link.dataset.wsOriginal;
  }
}
