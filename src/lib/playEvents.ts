// Rolling log of clear events for the stats screen's heatmaps. We only
// keep the most recent N entries because the visualizations sample
// recency (weekday + hour-of-day) — older clears would just be noise
// once the player has hundreds of sessions.

const KEY = "jigsaw:playEvents:v1";
const MAX_EVENTS = 400;

export type ClearEvent = {
  ts: number;
  stageId?: number;
  durationMs: number;
  stars: number;
  isDaily: boolean;
  isBoss: boolean;
  difficulty: "relax" | "standard" | "master";
};

export function loadClearEvents(): ClearEvent[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return (parsed as ClearEvent[]).filter(
      (e) => typeof e?.ts === "number" && typeof e?.durationMs === "number"
    );
  } catch {
    return [];
  }
}

export function recordClearEvent(event: ClearEvent): void {
  if (typeof window === "undefined") return;
  try {
    const prev = loadClearEvents();
    prev.push(event);
    const trimmed =
      prev.length > MAX_EVENTS ? prev.slice(prev.length - MAX_EVENTS) : prev;
    localStorage.setItem(KEY, JSON.stringify(trimmed));
  } catch {
    /* quota — silently drop */
  }
}

export function clearAllEvents(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
