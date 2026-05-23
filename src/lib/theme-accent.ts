export interface AccentTheme {
  id: string;
  name: string;
  /** HSL channels as "H S% L%" to plug into CSS vars. */
  primary: string;
  primaryForeground: string;
  /** A representative hex for swatches. */
  swatch: string;
}

export const ACCENT_THEMES: AccentTheme[] = [
  { id: "orange", name: "Naranja", primary: "24 95% 53%", primaryForeground: "0 0% 100%", swatch: "#f97316" },
  { id: "blue", name: "Azul", primary: "217 91% 60%", primaryForeground: "0 0% 100%", swatch: "#3b82f6" },
  { id: "violet", name: "Violeta", primary: "262 83% 63%", primaryForeground: "0 0% 100%", swatch: "#8b5cf6" },
  { id: "green", name: "Verde", primary: "152 60% 42%", primaryForeground: "0 0% 100%", swatch: "#16a34a" },
  { id: "pink", name: "Rosa", primary: "330 81% 60%", primaryForeground: "0 0% 100%", swatch: "#ec4899" },
  { id: "red", name: "Rojo", primary: "0 72% 51%", primaryForeground: "0 0% 100%", swatch: "#dc2626" },
  { id: "cyan", name: "Cyan", primary: "189 94% 43%", primaryForeground: "0 0% 100%", swatch: "#06b6d4" },
  { id: "amber", name: "Ámbar", primary: "38 92% 50%", primaryForeground: "0 0% 10%", swatch: "#f59e0b" },
];

export const DEFAULT_ACCENT_ID = "orange";
const STORAGE_KEY = "app-accent";

export interface StoredAccent {
  primary: string;
  primaryForeground: string;
  presetId?: string;
}

export function hexToHsl(hex: string): { h: number; s: number; l: number } | null {
  const m = hex.replace("#", "").trim();
  if (!/^[0-9a-fA-F]{6}$/.test(m)) return null;
  const r = parseInt(m.slice(0, 2), 16) / 255;
  const g = parseInt(m.slice(2, 4), 16) / 255;
  const b = parseInt(m.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  const d = max - min;
  if (d !== 0) {
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      default:
        h = (r - g) / d + 4;
    }
    h /= 6;
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

/** Picks black or white text depending on the accent lightness. */
function foregroundFor(hex: string): string {
  const hsl = hexToHsl(hex);
  if (!hsl) return "0 0% 100%";
  return hsl.l > 65 ? "0 0% 10%" : "0 0% 100%";
}

export function accentFromHex(hex: string): StoredAccent | null {
  const hsl = hexToHsl(hex);
  if (!hsl) return null;
  return {
    primary: `${hsl.h} ${hsl.s}% ${hsl.l}%`,
    primaryForeground: foregroundFor(hex),
  };
}

export function applyAccent(accent: StoredAccent): void {
  const root = document.documentElement;
  root.style.setProperty("--primary", accent.primary);
  root.style.setProperty("--primary-foreground", accent.primaryForeground);
  root.style.setProperty("--ring", accent.primary);
}

export function getStoredAccent(): StoredAccent | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as StoredAccent) : null;
  } catch {
    return null;
  }
}

export function setStoredAccent(accent: StoredAccent): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(accent));
  } catch {
    /* ignore */
  }
  applyAccent(accent);
}

/** Applies the saved accent on startup (call before/at render to avoid flash). */
export function applyStoredAccent(): void {
  const stored = getStoredAccent();
  if (stored) applyAccent(stored);
}
