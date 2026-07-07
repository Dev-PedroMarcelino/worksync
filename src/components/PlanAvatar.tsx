/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { getPlan, type PlanId } from "../config/plans";

/**
 * Avatar do usuário com moldura especial de acordo com o plano.
 * Free: borda simples. Planos pagos: moldura em gradiente + brilho + gema.
 */
interface PlanAvatarProps {
  photoUrl?: string;
  plan?: PlanId | string | null;
  size?: number;
  className?: string;
  showGem?: boolean;
  title?: string;
  /** Moldura exclusiva do Criador (galáxia animada) — sobrepõe o plano. */
  galaxy?: boolean;
}

const PlanAvatar: React.FC<PlanAvatarProps> = ({ photoUrl, plan, size = 36, className = "", showGem = true, title, galaxy }) => {
  const def = getPlan(plan);
  const dim = { width: size, height: size };
  const gemSizeFor = (s: number) => Math.max(12, Math.round(s * 0.34));

  // Moldura exclusiva do Criador: galáxia animada (independe do plano).
  if (galaxy) {
    return (
      <span className={`relative inline-block rounded-full ws-galaxy-glow ${className}`} style={dim} title={title || "Criador · moldura Galáxia"}>
        <span className="absolute inset-0 rounded-full overflow-hidden">
          <span className="ws-galaxy-ring" />
        </span>
        <span className="absolute inset-[2.5px] rounded-full overflow-hidden border border-white/50 dark:border-zinc-950 bg-zinc-950">
          {photoUrl ? <img src={photoUrl} alt="" referrerPolicy="no-referrer" className="w-full h-full object-cover" /> : null}
        </span>
        {showGem && (
          <span className="absolute -bottom-1 -right-1 leading-none drop-shadow ws-galaxy-twinkle" style={{ fontSize: gemSizeFor(size) }} aria-hidden>
            🌌
          </span>
        )}
      </span>
    );
  }

  if (!def.frame) {
    return (
      <span className={`inline-block rounded-full overflow-hidden border border-gray-200 dark:border-zinc-700 ${className}`} style={dim} title={title}>
        {photoUrl ? <img src={photoUrl} alt="" referrerPolicy="no-referrer" className="w-full h-full object-cover" /> : null}
      </span>
    );
  }

  const gemSize = Math.max(12, Math.round(size * 0.34));

  return (
    <span className={`relative inline-block rounded-full ${className}`} style={dim} title={title || `Plano ${def.name}`}>
      <span className={`block w-full h-full rounded-full bg-gradient-to-br ${def.frame.ring} ${def.frame.glow} p-[2px]`}>
        <span className="block w-full h-full rounded-full overflow-hidden border-2 border-white dark:border-zinc-900 bg-white dark:bg-zinc-900">
          {photoUrl ? <img src={photoUrl} alt="" referrerPolicy="no-referrer" className="w-full h-full object-cover" /> : null}
        </span>
      </span>
      {showGem && (
        <span
          className="absolute -bottom-1 -right-1 leading-none drop-shadow"
          style={{ fontSize: gemSize }}
          aria-hidden
        >
          {def.frame.gem}
        </span>
      )}
    </span>
  );
};

export default PlanAvatar;
