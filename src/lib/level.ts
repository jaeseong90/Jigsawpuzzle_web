// XP and level math for an adult casual progression curve.
//
// Goal: feel meaningful without ever blocking play. Levels are awarded purely
// for play (no pay/no grind walls). The curve front-loads early levels so the
// first few clears feel rewarding, then stretches so reaching level 50 is a
// long-haul accomplishment without being unattainable.

import { STAGES } from "@/data/stages";
import type { Progress } from "@/lib/progress";

// XP awarded for a single stage clear. Star count gives the multiplier; bosses
// pay a flat extra; daily stages pay a flat extra. No hint penalty — adults
// who choose to use a hint shouldn't be punished for QoL.
export function xpForClear(opts: {
  pieces: number;
  stars: 1 | 2 | 3;
  isBoss: boolean;
  isDaily: boolean;
  isFirstClear: boolean;
}): number {
  const base = Math.round(opts.pieces * 1.2);
  const starBonus = (opts.stars - 1) * Math.round(opts.pieces * 0.5);
  const bossBonus = opts.isBoss ? 40 : 0;
  const dailyBonus = opts.isDaily ? 25 : 0;
  const firstBonus = opts.isFirstClear ? 10 : 0;
  return base + starBonus + bossBonus + dailyBonus + firstBonus;
}

// XP required to reach the next level from the previous one.
// Levels 1..5 are gentle (50, 75, 110, 160, 230) and the gap grows from there.
export function xpRequiredFor(level: number): number {
  if (level <= 1) return 0;
  return Math.round(50 * Math.pow(level - 1, 1.55));
}

// Total XP to reach a given level (sum of all prior requirements).
export function totalXpForLevel(level: number): number {
  let total = 0;
  for (let l = 2; l <= level; l++) total += xpRequiredFor(l);
  return total;
}

export type LevelState = {
  level: number;
  totalXp: number;
  xpIntoLevel: number;
  xpForNext: number;
  progress: number; // 0..1
};

export function deriveLevel(totalXp: number): LevelState {
  let level = 1;
  let remaining = totalXp;
  while (true) {
    const need = xpRequiredFor(level + 1);
    if (remaining < need) {
      return {
        level,
        totalXp,
        xpIntoLevel: remaining,
        xpForNext: need,
        progress: need > 0 ? remaining / need : 0,
      };
    }
    remaining -= need;
    level += 1;
    if (level > 999) {
      return {
        level: 999,
        totalXp,
        xpIntoLevel: 0,
        xpForNext: 1,
        progress: 1,
      };
    }
  }
}

// Title given to the player at each milestone — adult, restrained.
// (Not the noisy "Legendary God-King" archetype from kid casual.)
const TITLES: ReadonlyArray<{ level: number; ko: string }> = [
  { level: 1, ko: "산책자" },
  { level: 5, ko: "수집가" },
  { level: 10, ko: "탐험가" },
  { level: 20, ko: "관찰자" },
  { level: 30, ko: "장인" },
  { level: 45, ko: "큐레이터" },
  { level: 60, ko: "마에스트로" },
  { level: 80, ko: "거장" },
];

export function titleForLevel(level: number): string {
  let title = TITLES[0].ko;
  for (const t of TITLES) {
    if (level >= t.level) title = t.ko;
  }
  return title;
}

// Approximate total XP from progress alone (used for migration / display when
// the persisted total isn't available yet).
export function inferTotalXpFromProgress(p: Progress): number {
  let total = 0;
  for (const idStr of Object.keys(p.cleared)) {
    const id = parseInt(idStr, 10);
    const stage = STAGES.find((s) => s.id === id);
    if (!stage) continue;
    const pieces = stage.rows * stage.cols;
    const stars = (p.bestStars[id] ?? 1) as 1 | 2 | 3;
    total += xpForClear({
      pieces,
      stars,
      isBoss: stage.isBoss,
      isDaily: false,
      isFirstClear: true,
    });
  }
  return total;
}
