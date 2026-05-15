import type { Difficulty } from "@/lib/difficulty";

const PROGRESS_KEY = "jigsaw:progress:v2";

export type DifficultyRecord = {
  bestTimeMs: number;
  bestStars: number;
};

export type Progress = {
  // Highest stage that should appear unlocked. Defaults to 1.
  unlockedUpTo: number;
  // Best completion time in ms, keyed by stage id (standard difficulty).
  bestTimes: Record<number, number>;
  // Best star rating earned per stage 1-3 (standard difficulty).
  bestStars: Record<number, number>;
  // Stages that have been cleared at least once (any difficulty).
  cleared: Record<number, true>;
  // Lifetime XP. Drives the level chip on the home screen.
  xp: number;
  // Per-difficulty records — separate from `bestTimes`/`bestStars` so
  // standard-mode mastery stays comparable across the player base.
  bestByDifficulty: {
    relax: Record<number, DifficultyRecord>;
    master: Record<number, DifficultyRecord>;
  };
  // Best flow run (consecutive snaps) per stage and lifetime. Treated as
  // an orthogonal metric to time — clean play, not necessarily fast.
  bestFlow: Record<number, number>;
  lifetimeBestFlow: number;
};

export function emptyProgress(): Progress {
  return {
    unlockedUpTo: 1,
    bestTimes: {},
    bestStars: {},
    cleared: {},
    xp: 0,
    bestByDifficulty: { relax: {}, master: {} },
    bestFlow: {},
    lifetimeBestFlow: 0,
  };
}

export function loadProgress(): Progress {
  if (typeof window === "undefined") return emptyProgress();
  try {
    const raw = localStorage.getItem(PROGRESS_KEY);
    if (!raw) return emptyProgress();
    const parsed = JSON.parse(raw) as Partial<Progress> | null;
    if (!parsed || typeof parsed !== "object") return emptyProgress();
    const empty = emptyProgress();
    return {
      unlockedUpTo: typeof parsed.unlockedUpTo === "number" ? parsed.unlockedUpTo : 1,
      bestTimes: parsed.bestTimes ?? {},
      bestStars: parsed.bestStars ?? {},
      cleared: parsed.cleared ?? {},
      xp: typeof parsed.xp === "number" ? parsed.xp : 0,
      bestByDifficulty: {
        relax: parsed.bestByDifficulty?.relax ?? empty.bestByDifficulty.relax,
        master: parsed.bestByDifficulty?.master ?? empty.bestByDifficulty.master,
      },
      bestFlow: parsed.bestFlow ?? {},
      lifetimeBestFlow:
        typeof parsed.lifetimeBestFlow === "number" ? parsed.lifetimeBestFlow : 0,
    };
  } catch {
    return emptyProgress();
  }
}

export function saveProgress(p: Progress): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(p));
  } catch {
    // Quota or private mode — silently degrade.
  }
}

export function recordClear(
  prev: Progress,
  stageId: number,
  durationMs: number,
  stars: number,
  totalStages: number,
  options?: {
    advanceUnlock?: boolean;
    difficulty?: Difficulty;
    xpEarned?: number;
    flowBest?: number;
  }
): Progress {
  const advanceUnlock = options?.advanceUnlock ?? true;
  const difficulty: Difficulty = options?.difficulty ?? "standard";
  const xpEarned = options?.xpEarned ?? 0;
  const flowBest = options?.flowBest ?? 0;

  // Daily/replay clears of out-of-band stages should not jump the unlock
  // frontier past intervening stages — pass advanceUnlock=false in that case.
  const nextUnlock = advanceUnlock
    ? Math.max(prev.unlockedUpTo, Math.min(stageId + 1, totalStages))
    : prev.unlockedUpTo;

  const next: Progress = {
    ...prev,
    unlockedUpTo: nextUnlock,
    bestTimes: { ...prev.bestTimes },
    bestStars: { ...prev.bestStars },
    cleared: { ...prev.cleared, [stageId]: true },
    xp: prev.xp + xpEarned,
    bestByDifficulty: {
      relax: { ...prev.bestByDifficulty.relax },
      master: { ...prev.bestByDifficulty.master },
    },
    bestFlow: { ...(prev.bestFlow ?? {}) },
    lifetimeBestFlow: Math.max(prev.lifetimeBestFlow ?? 0, flowBest),
  };
  if (flowBest > 0) {
    const prevFlow = next.bestFlow[stageId] ?? 0;
    if (flowBest > prevFlow) next.bestFlow[stageId] = flowBest;
  }

  if (difficulty === "standard") {
    const bestTime = prev.bestTimes[stageId];
    next.bestTimes[stageId] =
      bestTime == null || durationMs < bestTime ? durationMs : bestTime;
    const bestStar = prev.bestStars[stageId] ?? 0;
    next.bestStars[stageId] = Math.max(bestStar, stars);
  } else {
    const bucket = next.bestByDifficulty[difficulty];
    const existing = bucket[stageId];
    bucket[stageId] = {
      bestTimeMs: existing == null || durationMs < existing.bestTimeMs ? durationMs : existing.bestTimeMs,
      bestStars: Math.max(existing?.bestStars ?? 0, stars),
    };
  }

  saveProgress(next);
  return next;
}

export function isUnlocked(progress: Progress, stageId: number): boolean {
  return stageId <= progress.unlockedUpTo;
}

const TUTORIAL_SEEN_KEY = "jigsaw:tutorial-seen";

export function hasSeenTutorial(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return localStorage.getItem(TUTORIAL_SEEN_KEY) === "1";
  } catch {
    return true;
  }
}

export function markTutorialSeen(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(TUTORIAL_SEEN_KEY, "1");
  } catch {
    /* ignore quota */
  }
}
