/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Temas do site (edições sazonais + personalizado).
 *
 * Um tema não é uma decoração: ele redefine os design tokens reais da
 * interface. Cada tema descreve:
 *  - `accent`: a cor de destaque base — o motor de temas (services/siteTheme)
 *    deriva a rampa completa (50–950) e sobrescreve as variáveis `--color-sky-*`
 *    usadas por toda a UI (botões, estados ativos, links, gráficos).
 *  - `surfaceHue`/`surfaceSat`: a tonalidade das superfícies escuras — as
 *    variáveis `--color-zinc-*` são retingidas mantendo a escala de luminância,
 *    então contraste e hierarquia visual são preservados em qualquer tema.
 *  - `title` e `banner`: título do documento e mensagem de campanha (opcional).
 *
 * Aplicado globalmente por AppTheme e gerenciado no painel de Aparência (admin).
 */

export interface SiteThemeConfig {
  preset: string; // id do preset ou "custom"
  accent: string; // hex — base da rampa de destaque
  surfaceHue: number; // matiz (0–360) das superfícies escuras
  surfaceSat: number; // multiplicador de saturação das superfícies (0–1.2)
  title: string; // título do site (aba/documento)
  banner: string; // mensagem do banner ("" = sem banner)
  bannerFrom: string; // hex gradiente início
  bannerTo: string; // hex gradiente fim
}

export interface ThemePreset extends SiteThemeConfig {
  id: string;
  name: string;
  description: string;
}

/** Tons de superfície disponíveis no modo personalizado. */
export const SURFACE_TONES: { id: string; name: string; hue: number; sat: number }[] = [
  { id: "navy", name: "Navy (padrão)", hue: 217, sat: 1 },
  { id: "grafite", name: "Grafite neutro", hue: 220, sat: 0.22 },
  { id: "floresta", name: "Verde-floresta", hue: 165, sat: 0.75 },
  { id: "terra", name: "Terra quente", hue: 28, sat: 0.65 },
  { id: "vinho", name: "Vinho", hue: 345, sat: 0.7 },
  { id: "ameixa", name: "Ameixa", hue: 285, sat: 0.65 },
];

export const THEME_PRESETS: ThemePreset[] = [
  {
    id: "padrao",
    name: "Padrão",
    description: "Azul-real sobre navy profundo — a identidade do worksync.",
    preset: "padrao",
    accent: "#2563eb",
    surfaceHue: 217,
    surfaceSat: 1,
    title: "worksync",
    banner: "",
    bannerFrom: "#2563eb",
    bannerTo: "#6d5ae8",
  },
  {
    id: "natal",
    name: "Fim de ano",
    description: "Verde-pinheiro sobre tons de floresta, com detalhe em vinho.",
    preset: "natal",
    accent: "#0e9f6e",
    surfaceHue: 165,
    surfaceSat: 0.75,
    title: "worksync · Fim de ano",
    banner: "Edição de fim de ano — feche o ciclo e planeje o próximo.",
    bannerFrom: "#047857",
    bannerTo: "#9f1239",
  },
  {
    id: "halloween",
    name: "Halloween",
    description: "Âmbar queimado sobre grafite quente, com detalhe em violeta.",
    preset: "halloween",
    accent: "#ea580c",
    surfaceHue: 26,
    surfaceSat: 0.55,
    title: "worksync · Halloween",
    banner: "Edição Halloween — foco afiado até o fim do mês.",
    bannerFrom: "#c2410c",
    bannerTo: "#6d28d9",
  },
  {
    id: "junina",
    name: "Festa Junina",
    description: "Âmbar dourado sobre tons de terra — energia de arraiá, sem excessos.",
    preset: "junina",
    accent: "#d97706",
    surfaceHue: 32,
    surfaceSat: 0.6,
    title: "worksync · Junho",
    banner: "Edição junina — ritmo de festa, entregas em dia.",
    bannerFrom: "#b45309",
    bannerTo: "#c2410c",
  },
  {
    id: "namorados",
    name: "Dia dos Namorados",
    description: "Rosé profundo sobre vinho — elegante, longe do clichê.",
    preset: "namorados",
    accent: "#e11d48",
    surfaceHue: 345,
    surfaceSat: 0.7,
    title: "worksync · Junho a dois",
    banner: "Edição Dia dos Namorados — planeje algo especial a dois.",
    bannerFrom: "#be123c",
    bannerTo: "#a21caf",
  },
];

export const DEFAULT_THEME: SiteThemeConfig = { ...THEME_PRESETS[0] };

export const getPreset = (id: string): ThemePreset | undefined => THEME_PRESETS.find((p) => p.id === id);
