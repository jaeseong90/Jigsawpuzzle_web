const PROGRESS_KEY = "jigsaw:progress:v2";

export type Progress = {
  // Highest stage that should appear unlocked. Defaults to 1.
  unlockedUpTo: number;
  // Best completion time in ms, keyed by stage id.
  bestTimes: Record<number, number>;
  // Stages that have been cleared at least once.
  cleared: Record<number, true>;
};

export function emptyProgress(): Progress {
  return { unlockedUpTo: 1, bestTimes: {}, cleared: {} };
}

export function loadProgress(): Progress {
  if (typeof window === "undefined") return emptyProgress();
  try {
    const raw = localStorage.getItem(PROGRESS_KEY);
    if (!raw) return emptyProgress();
    const parsed = JSON.parse(raw) as Partial<Progress> | null;
    if (!parsed || typeof parsed !== "object") return emptyProgress();
    return {
      unlockedUpTo: typeof parsed.unlockedUpTo === "number" ? parsed.unlockedUpTo : 1,
      bestTimes: parsed.bestTimes ?? {},
      cleared: parsed.cleared ?? {},
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
  totalStages: number
): Progress {
  const next: Progress = {
    unlockedUpTo: Math.max(prev.unlockedUpTo, Math.min(stageId + 1, totalStages)),
    bestTimes: { ...prev.bestTimes },
    cleared: { ...prev.cleared, [stageId]: true },
  };
  const best = prev.bestTimes[stageId];
  if (best == null || durationMs < best) {
    next.bestTimes[stageId] = durationMs;
  } else {
    next.bestTimes[stageId] = best;
  }
  saveProgress(next);
  return next;
}

export function isUnlocked(progress: Progress, stageId: number): boolean {
  return stageId <= progress.unlockedUpTo;
}
