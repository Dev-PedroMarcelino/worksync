/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from "react";
import { X, Megaphone } from "lucide-react";
import { loadSiteTheme, applySiteTheme, fetchCloudTheme, SITE_THEME_EVENT } from "../services/siteTheme";
import type { SiteThemeConfig } from "../config/themes";

/**
 * Aplica o tema ativo (tokens de cor globais) e renderiza o banner de
 * campanha quando configurado. O retingimento da interface acontece via
 * variáveis CSS em applySiteTheme — sem overlays nem decorações.
 */
const AppTheme: React.FC = () => {
  const [cfg, setCfg] = useState<SiteThemeConfig>(() => loadSiteTheme());
  const [bannerClosed, setBannerClosed] = useState(false);

  useEffect(() => {
    applySiteTheme(cfg);
    // Em modo cloud, o tema global (definido pelo admin) prevalece sobre o local.
    fetchCloudTheme().then((remote) => {
      if (remote) {
        setCfg(remote);
        applySiteTheme(remote);
        setBannerClosed(false);
      }
    });
    const onChange = (e: Event) => {
      const detail = (e as CustomEvent).detail as SiteThemeConfig | undefined;
      const next = detail || loadSiteTheme();
      setCfg(next);
      setBannerClosed(false);
    };
    window.addEventListener(SITE_THEME_EVENT, onChange);
    return () => window.removeEventListener(SITE_THEME_EVENT, onChange);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!cfg.banner || bannerClosed) return null;

  return (
    <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[55] max-w-[92vw] pointer-events-auto animate-fade-in">
      <div className="relative flex items-center gap-3 pl-3.5 pr-1.5 py-2 rounded-2xl bg-zinc-900/95 backdrop-blur-xl border border-white/10 shadow-2xl overflow-hidden">
        {/* Fio de gradiente no topo — assinatura visual da campanha */}
        <span
          aria-hidden
          className="absolute inset-x-0 top-0 h-[2px]"
          style={{ background: `linear-gradient(90deg, ${cfg.bannerFrom}, ${cfg.bannerTo})` }}
        />
        <span
          className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center"
          style={{ background: `linear-gradient(135deg, ${cfg.bannerFrom}, ${cfg.bannerTo})` }}
        >
          <Megaphone className="w-3.5 h-3.5 text-white" />
        </span>
        <span className="truncate text-xs sm:text-sm font-medium text-zinc-100">{cfg.banner}</span>
        <button
          onClick={() => setBannerClosed(true)}
          className="shrink-0 p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          title="Fechar"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default AppTheme;
