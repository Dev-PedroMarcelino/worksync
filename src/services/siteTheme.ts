/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { DEFAULT_THEME, type SiteThemeConfig } from "../config/themes";

/**
 * Carrega, salva e aplica o tema do site (título do documento, favicon e
 * a cor de destaque via variável CSS `--ws-accent`). O banner e as
 * decorações animadas são renderizados pelo componente AppTheme.
 */

const KEY = "worksync_site_theme";
export const SITE_THEME_EVENT = "site-theme-changed";

export function loadSiteTheme(): SiteThemeConfig {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...DEFAULT_THEME, ...JSON.parse(raw) };
  } catch {
    /* noop */
  }
  return { ...DEFAULT_THEME };
}

export function saveSiteTheme(cfg: SiteThemeConfig): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(cfg));
  } catch {
    /* noop */
  }
  applySiteTheme(cfg);
  window.dispatchEvent(new CustomEvent(SITE_THEME_EVENT, { detail: cfg }));
  // Sincroniza globalmente (modo cloud) — só o super-admin tem permissão de escrita.
  saveCloudTheme(cfg);
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
    if (snap.exists()) return { ...DEFAULT_THEME, ...(snap.data() as SiteThemeConfig) };
  } catch {
    /* noop */
  }
  return null;
}

/** Aplica título, favicon e cor de destaque no documento. */
export function applySiteTheme(cfg: SiteThemeConfig): void {
  if (typeof document === "undefined") return;

  // Cor de destaque como variável CSS global.
  document.documentElement.style.setProperty("--ws-accent", cfg.accent || "#0ea5e9");

  // Título do documento.
  if (cfg.title) document.title = cfg.title;

  // Favicon a partir de um emoji (SVG data URI). Vazio = mantém o padrão.
  if (cfg.favicon) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><text y="52" font-size="52">${cfg.favicon}</text></svg>`;
    const href = "data:image/svg+xml," + encodeURIComponent(svg);
    let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    if (!link) {
      link = document.createElement("link");
      link.rel = "icon";
      document.head.appendChild(link);
    }
    if (!link.dataset.wsOriginal) link.dataset.wsOriginal = link.href || "";
    link.href = href;
  }
}
