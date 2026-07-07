/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import { loadSiteTheme, applySiteTheme, fetchCloudTheme, SITE_THEME_EVENT } from "../services/siteTheme";
import type { SiteThemeConfig, DecorKind } from "../config/themes";

const DECOR_EMOJI: Record<Exclude<DecorKind, "none">, string[]> = {
  snow: ["❄️", "❄", "🌨️"],
  bats: ["🦇", "🕸️", "🎃"],
  confetti: ["🎊", "🎉", "🌽", "🎈"],
  hearts: ["❤️", "💕", "💗"],
};

/** Overlay decorativo com emojis caindo (não bloqueia cliques). */
const Decorations: React.FC<{ decor: DecorKind }> = ({ decor }) => {
  const items = useMemo(() => {
    if (decor === "none") return [];
    const pool = DECOR_EMOJI[decor];
    return Array.from({ length: 16 }, (_, i) => ({
      emoji: pool[i % pool.length],
      left: (i * 61) % 100, // distribuição determinística ao longo da largura
      delay: (i % 8) * 0.9,
      duration: 6 + (i % 6),
      size: 14 + (i % 4) * 6,
    }));
  }, [decor]);

  if (decor === "none") return null;
  return (
    <div className="fixed inset-0 z-[45] pointer-events-none overflow-hidden" aria-hidden>
      {items.map((it, i) => (
        <span
          key={i}
          className="absolute top-0 ws-fall"
          style={{
            left: `${it.left}%`,
            fontSize: it.size,
            animationDelay: `${it.delay}s`,
            animationDuration: `${it.duration}s`,
          }}
        >
          {it.emoji}
        </span>
      ))}
    </div>
  );
};

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

  return (
    <>
      {/* Animação das decorações (injeta os keyframes uma vez) */}
      <style>{`
        @keyframes ws-fall {
          0% { transform: translateY(-12vh) rotate(0deg); opacity: 0; }
          8% { opacity: 0.95; }
          100% { transform: translateY(112vh) rotate(360deg); opacity: 0.95; }
        }
        .ws-fall { animation-name: ws-fall; animation-timing-function: linear; animation-iteration-count: infinite; }
      `}</style>

      <Decorations decor={cfg.decor} />

      {/* Banner de campanha/sazonal (flutuante, inferior, dispensável) */}
      {cfg.banner && !bannerClosed && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[55] max-w-[92vw] pointer-events-auto">
          <div
            className="flex items-center gap-3 pl-4 pr-2 py-2.5 rounded-full shadow-lg text-white text-xs sm:text-sm font-semibold"
            style={{ background: `linear-gradient(90deg, ${cfg.bannerFrom}, ${cfg.bannerTo})` }}
          >
            <span className="truncate">{cfg.banner}</span>
            <button
              onClick={() => setBannerClosed(true)}
              className="shrink-0 p-1 rounded-full hover:bg-white/20 transition-colors cursor-pointer"
              title="Fechar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default AppTheme;
