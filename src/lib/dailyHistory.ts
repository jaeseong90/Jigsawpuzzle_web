// History of daily-challenge clears so the calendar view can show, for each
// past day, whether the player cleared that day's puzzle (and at how many
// stars). Stored as a flat map { "YYYY-MM-DD": { stageId, stars } }.

const DAILY_HISTORY_KEY = "jigsaw:dailyHistory:v1";

export type DailyHistoryEntry = {
  stageId: number;
  stars: number;
  durationMs: number;
};

export type DailyHistory = Record<string, DailyHistoryEntry>;

export function loadDailyHistory(): DailyHistory {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(DAILY_HISTORY_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return {};
    return parsed as DailyHistory;
  } catch {
    return {};
  }
}

export function saveDailyHistory(h: DailyHistory): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(DAILY_HISTORY_KEY, JSON.stringify(h));
  } catch {
    /* ignore */
  }
}

export function recordDailyHistory(
  dateKey: string,
  entry: DailyHistoryEntry
): DailyHistory {
  const h = loadDailyHistory();
  const prev = h[dateKey];
  // Keep the best result for the day if the player improves on a replay.
  if (prev) {
    h[dateKey] = {
      stageId: entry.stageId,
      stars: Math.max(prev.stars, entry.stars),
      durationMs: Math.min(prev.durationMs, entry.durationMs),
    };
  } else {
    h[dateKey] = entry;
  }
  saveDailyHistory(h);
  return h;
}
