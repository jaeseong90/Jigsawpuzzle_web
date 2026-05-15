// Cosmetic palettes — unlockable with the player's lifetime tessera
// (rows × cols summed over cleared stages). The default 황동 palette is
// always available; everything else is bought once and stays unlocked.
//
// Palettes override only the accent-family CSS variables. Theme (light/
// dark) and the neutral inks stay intact, so the look of the rest of
// the UI stays coherent — only the brand color rotates.

import { STAGES } from "@/data/stages";
import type { Progress } from "@/lib/progress";

export type PaletteId = "amber" | "forest" | "harbor" | "twilight" | "monochrome";

export type Palette = {
  id: PaletteId;
  name: string;
  description: string;
  cost: number;
  // Compact swatch colors (light theme) for the picker tile.
  swatch: string;
};

export const PALETTES: ReadonlyArray<Palette> = [
  {
    id: "amber",
    name: "황동",
    description: "따뜻한 기본",
    cost: 0,
    swatch: "#8a5a2b",
  },
  {
    id: "forest",
    name: "숲",
    description: "젖은 잎의 채도",
    cost: 240,
    swatch: "#3f6b3a",
  },
  {
    id: "harbor",
    name: "포구",
    description: "물안개 너머 파랑",
    cost: 240,
    swatch: "#3a5d7b",
  },
  {
    id: "twilight",
    name: "황혼",
    description: "기울어진 자줏빛",
    cost: 480,
    swatch: "#6b3d6e",
  },
  {
    id: "monochrome",
    name: "묵",
    description: "절제된 회색",
    cost: 720,
    swatch: "#454545",
  },
];

const SELECTED_KEY = "jigsaw:palette:v1";
const UNLOCKED_KEY = "jigsaw:palettes:v1";

function isPaletteId(s: unknown): s is PaletteId {
  return (
    typeof s === "string" && PALETTES.some((p) => p.id === (s as PaletteId))
  );
}

export function loadSelectedPalette(): PaletteId {
  if (typeof window === "undefined") return "amber";
  try {
    const raw = localStorage.getItem(SELECTED_KEY);
    if (isPaletteId(raw)) return raw;
  } catch {
    /* ignore */
  }
  return "amber";
}

export function setSelectedPalette(id: PaletteId): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(SELECTED_KEY, id);
  } catch {
    /* ignore quota */
  }
  applyPalette(id);
}

export function applyPalette(id: PaletteId): void {
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute("data-palette", id);
}

export function loadUnlockedPalettes(): Set<PaletteId> {
  const base = new Set<PaletteId>(["amber"]);
  if (typeof window === "undefined") return base;
  try {
    const raw = localStorage.getItem(UNLOCKED_KEY);
    if (!raw) return base;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return base;
    for (const v of parsed) if (isPaletteId(v)) base.add(v);
  } catch {
    /* corrupt — start over */
  }
  return base;
}

function saveUnlockedPalettes(set: Set<PaletteId>): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(UNLOCKED_KEY, JSON.stringify(Array.from(set)));
  } catch {
    /* ignore quota */
  }
}

export function unlockPalette(id: PaletteId): void {
  const set = loadUnlockedPalettes();
  if (set.has(id)) return;
  set.add(id);
  saveUnlockedPalettes(set);
}

// Lifetime tessera earned across all cleared stages (rows × cols per
// stage). Derived rather than persisted so a player who clears a stage
// before the cosmetics system shipped still gets retroactive credit.
export function earnedTessera(progress: Progress): number {
  let total = 0;
  for (const idStr of Object.keys(progress.cleared)) {
    const id = parseInt(idStr, 10);
    const stage = STAGES.find((s) => s.id === id);
    if (stage) total += stage.rows * stage.cols;
  }
  return total;
}

export function tesseraBalance(progress: Progress): number {
  return Math.max(0, earnedTessera(progress) - (progress.tesseraSpent ?? 0));
}
