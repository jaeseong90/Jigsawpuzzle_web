import { TOTAL_STAGE_COUNT } from "@/data/stages";

const DAILY_KEY = "jigsaw:daily:v1";

export type DailyRecord = {
  // YYYY-MM-DD in local time. We use local-day so the "today's puzzle"
  // doesn't flip mid-evening for the player.
  date: string;
  stageId: number;
  cleared: boolean;
  durationMs?: number;
  stars?: number;
  // Lifetime streak / count.
  streak: number;
  totalCleared: number;
  lastClearedDate?: string;
};

export function getTodayKey(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// Hash the date string into a stage id in [1, TOTAL_STAGE_COUNT].
// Deterministic so every player sees the same daily puzzle.
export function getDailyStageId(dateKey: string = getTodayKey()): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < dateKey.length; i++) {
    h ^= dateKey.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  // Map to 1..TOTAL_STAGE_COUNT. Skip first 10 (warm-up) so the daily is
  // always at least moderately challenging.
  const span = TOTAL_STAGE_COUNT - 10;
  return 11 + ((h >>> 0) % span);
}

function emptyRecord(dateKey: string): DailyRecord {
  return {
    date: dateKey,
    stageId: getDailyStageId(dateKey),
    cleared: false,
    streak: 0,
    totalCleared: 0,
  };
}

export function loadDaily(): DailyRecord {
  const today = getTodayKey();
  if (typeof window === "undefined") return emptyRecord(today);
  try {
    const raw = localStorage.getItem(DAILY_KEY);
    if (!raw) return emptyRecord(today);
    const parsed = JSON.parse(raw) as Partial<DailyRecord> | null;
    if (!parsed) return emptyRecord(today);
    const streak = typeof parsed.streak === "number" ? parsed.streak : 0;
    const totalCleared =
      typeof parsed.totalCleared === "number" ? parsed.totalCleared : 0;
    const lastClearedDate = parsed.lastClearedDate;
    // Different day → roll over: today is fresh, streak preserved if yesterday
    // was cleared, otherwise reset.
    if (parsed.date !== today) {
      const expectedYesterday = yesterdayKey(today);
      const continuingStreak = lastClearedDate === expectedYesterday ? streak : 0;
      return {
        date: today,
        stageId: getDailyStageId(today),
        cleared: false,
        streak: continuingStreak,
        totalCleared,
        lastClearedDate,
      };
    }
    return {
      date: today,
      stageId: getDailyStageId(today),
      cleared: !!parsed.cleared,
      durationMs: parsed.durationMs,
      stars: parsed.stars,
      streak,
      totalCleared,
      lastClearedDate,
    };
  } catch {
    return emptyRecord(today);
  }
}

function yesterdayKey(todayKey: string): string {
  const [y, m, d] = todayKey.split("-").map((n) => parseInt(n, 10));
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() - 1);
  return getTodayKey(dt);
}

export function saveDaily(rec: DailyRecord): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(DAILY_KEY, JSON.stringify(rec));
  } catch {
    /* ignore */
  }
}

export function recordDailyClear(
  prev: DailyRecord,
  stageId: number,
  durationMs: number,
  stars: number
): DailyRecord {
  // Only counts when the cleared stage matches today's daily and it wasn't
  // already cleared today.
  if (prev.stageId !== stageId) return prev;
  if (prev.cleared) {
    // Still update best time for today.
    const next: DailyRecord = {
      ...prev,
      durationMs:
        prev.durationMs == null || durationMs < prev.durationMs
          ? durationMs
          : prev.durationMs,
      stars: Math.max(prev.stars ?? 0, stars),
    };
    saveDaily(next);
    return next;
  }
  const today = prev.date;
  const continuing = prev.lastClearedDate === yesterdayKey(today);
  const next: DailyRecord = {
    ...prev,
    cleared: true,
    durationMs,
    stars,
    streak: continuing ? prev.streak + 1 : 1,
    totalCleared: prev.totalCleared + 1,
    lastClearedDate: today,
  };
  saveDaily(next);
  return next;
}
