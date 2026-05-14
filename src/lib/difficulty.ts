// Difficulty tiers offered on the pre-stage screen.
// Adults appreciate optional challenge. We scale piece count, not the photo,
// so the artwork still looks great regardless of selection.

import type { Stage } from "@/data/stages";

export type Difficulty = "relax" | "standard" | "master";

export const DIFFICULTIES: ReadonlyArray<{
  id: Difficulty;
  ko: string;
  en: string;
  blurb: string;
  // Multiplier applied to base grid dimensions. Rounded; final piece count is
  // derived from the multiplied rows * cols.
  scale: number;
  // XP multiplier for clearing at this difficulty.
  xpMultiplier: number;
}> = [
  {
    id: "relax",
    ko: "릴랙스",
    en: "Relax",
    blurb: "느긋하게 그림을 즐기는 모드",
    scale: 0.75,
    xpMultiplier: 0.7,
  },
  {
    id: "standard",
    ko: "스탠다드",
    en: "Standard",
    blurb: "오늘의 일반 도전",
    scale: 1,
    xpMultiplier: 1,
  },
  {
    id: "master",
    ko: "마스터",
    en: "Master",
    blurb: "더 작은 조각, 더 깊은 몰입",
    scale: 1.3,
    xpMultiplier: 1.6,
  },
];

export function getDifficultyMeta(id: Difficulty) {
  return DIFFICULTIES.find((d) => d.id === id) ?? DIFFICULTIES[1];
}

// Apply a difficulty to a stage by scaling the grid dimensions. Always clamps
// to at least 3×3 (or the stage's natural minimum) so very-early stages stay
// playable in Relax mode and very-late stages don't explode at Master.
export function applyDifficulty(stage: Stage, difficulty: Difficulty): Stage {
  const meta = getDifficultyMeta(difficulty);
  const targetRows = Math.max(3, Math.round(stage.rows * meta.scale));
  const targetCols = Math.max(3, Math.round(stage.cols * meta.scale));
  // Hard cap so master mode of late stages doesn't become absurd on phones.
  const clampedRows = Math.min(12, targetRows);
  const clampedCols = Math.min(9, targetCols);
  return {
    ...stage,
    rows: clampedRows,
    cols: clampedCols,
  };
}

const DEFAULT_KEY = "jigsaw:defaultDifficulty";

export function loadDefaultDifficulty(): Difficulty {
  if (typeof window === "undefined") return "standard";
  try {
    const raw = localStorage.getItem(DEFAULT_KEY);
    if (raw === "relax" || raw === "standard" || raw === "master") return raw;
  } catch {
    /* ignore */
  }
  return "standard";
}

export function saveDefaultDifficulty(d: Difficulty): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(DEFAULT_KEY, d);
  } catch {
    /* ignore */
  }
}
