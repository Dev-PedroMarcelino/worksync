/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Temas do site (sazonais + personalizado). Define cor de destaque, banner,
 * decoração animada, título e ícone (favicon). Aplicado globalmente pelo
 * componente AppTheme e gerenciado no painel de Aparência (admin).
 */

export type DecorKind = "none" | "snow" | "bats" | "confetti" | "hearts";

export interface SiteThemeConfig {
  preset: string; // id do preset ou "custom"
  accent: string; // hex
  title: string; // título do site (aba/documento)
  banner: string; // mensagem do banner ("" = sem banner)
  bannerFrom: string; // hex gradiente início
  bannerTo: string; // hex gradiente fim
  decor: DecorKind;
  favicon: string; // emoji ("" = padrão)
}

export interface ThemePreset extends SiteThemeConfig {
  id: string;
  name: string;
  emoji: string;
}

export const THEME_PRESETS: ThemePreset[] = [
  {
    id: "padrao", name: "Padrão", emoji: "🎨",
    preset: "padrao", accent: "#0ea5e9", title: "worksync",
    banner: "", bannerFrom: "#0ea5e9", bannerTo: "#6366f1", decor: "none", favicon: "",
  },
  {
    id: "natal", name: "Natal", emoji: "🎄",
    preset: "natal", accent: "#16a34a", title: "worksync · Feliz Natal 🎄",
    banner: "🎄 Feliz Natal! Organize suas metas para o ano novo.",
    bannerFrom: "#16a34a", bannerTo: "#dc2626", decor: "snow", favicon: "🎄",
  },
  {
    id: "halloween", name: "Halloween", emoji: "🎃",
    preset: "halloween", accent: "#f97316", title: "worksync · Halloween 🎃",
    banner: "🎃 Halloween chegou! Não deixe suas tarefas assustadoras acumularem.",
    bannerFrom: "#f97316", bannerTo: "#7c3aed", decor: "bats", favicon: "🎃",
  },
  {
    id: "junina", name: "Festa Junina", emoji: "🎊",
    preset: "junina", accent: "#eab308", title: "worksync · Arraiá 🎊",
    banner: "🎊 Arraiá do worksync! Bora organizar a festa?",
    bannerFrom: "#eab308", bannerTo: "#dc2626", decor: "confetti", favicon: "🌽",
  },
  {
    id: "namorados", name: "Dia dos Namorados", emoji: "❤️",
    preset: "namorados", accent: "#ec4899", title: "worksync · Dia dos Namorados ❤️",
    banner: "❤️ Dia dos Namorados — planeje algo especial a dois.",
    bannerFrom: "#ec4899", bannerTo: "#e11d48", decor: "hearts", favicon: "❤️",
  },
];

export const DEFAULT_THEME: SiteThemeConfig = { ...THEME_PRESETS[0] };

export const getPreset = (id: string): ThemePreset | undefined => THEME_PRESETS.find((p) => p.id === id);
