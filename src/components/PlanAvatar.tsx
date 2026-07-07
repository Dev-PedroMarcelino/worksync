/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { Medal, Crown, Gem, Users, Sparkles, type LucideIcon } from "lucide-react";
import { getPlan, type PlanId } from "../config/plans";

/**
 * Avatar do usuário com moldura especial de acordo com o plano.
 * Free: borda simples. Planos pagos: moldura em gradiente + brilho + selo
 * (ícone sobre o gradiente do plano — sem emojis).
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

const PLAN_ICONS: Record<string, LucideIcon> = {
  prata: Medal,
  ouro: Crown,
  diamante: Gem,
  esmeralda: Users,
};

const SealBadge: React.FC<{ size: number; gradient: string; icon: LucideIcon; className?: string }> = ({ size, gradient, icon: Icon, className = "" }) => {
  const dim = Math.max(14, Math.round(size * 0.4));
  return (
    <span
      className={`absolute -bottom-0.5 -right-0.5 rounded-full flex items-center justify-center shadow-md ring-2 ring-white dark:ring-zinc-900 bg-gradient-to-br ${gradient} ${className}`}
      style={{ width: dim, height: dim }}
      aria-hidden
    >
      <Icon className="text-white drop-shadow" style={{ width: dim * 0.62, height: dim * 0.62 }} strokeWidth={2.5} />
    </span>
  );
};

const PlanAvatar: React.FC<PlanAvatarProps> = ({ photoUrl, plan, size = 36, className = "", showGem = true, title, galaxy }) => {
  const def = getPlan(plan);
  const dim = { width: size, height: size };

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
          <SealBadge size={size} gradient="from-violet-500 via-fuchsia-500 to-sky-500" icon={Sparkles} className="ws-galaxy-twinkle" />
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

  const Icon = PLAN_ICONS[def.id] || Medal;

  return (
    <span className={`relative inline-block rounded-full ${className}`} style={dim} title={title || `Plano ${def.name}`}>
      <span className={`block w-full h-full rounded-full bg-gradient-to-br ${def.frame.ring} ${def.frame.glow} p-[2px]`}>
        <span className="block w-full h-full rounded-full overflow-hidden border-2 border-white dark:border-zinc-900 bg-white dark:bg-zinc-900">
          {photoUrl ? <img src={photoUrl} alt="" referrerPolicy="no-referrer" className="w-full h-full object-cover" /> : null}
        </span>
      </span>
      {showGem && <SealBadge size={size} gradient={def.frame.ring} icon={Icon} />}
    </span>
  );
};

export default PlanAvatar;
