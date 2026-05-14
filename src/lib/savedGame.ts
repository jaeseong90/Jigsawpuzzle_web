const SAVED_GAME_KEY = "jigsaw:savedGame:v1";

export type SavedGameSnapshot = {
  stageId: number;
  pieces: Array<{
    id: number;
    origRow: number;
    origCol: number;
    currentIndex: number;
    // 0..3 = 0°/90°/180°/270° clockwise rotation. Absent in pre-v2 snapshots.
    rotation?: number;
  }>;
  elapsedMs: number;
  hintsLeft: number;
  hintsUsed: number;
  savedAt: number;
};

export function saveGame(g: Omit<SavedGameSnapshot, "savedAt">): void {
  if (typeof window === "undefined") return;
  try {
    const payload: SavedGameSnapshot = { ...g, savedAt: Date.now() };
    localStorage.setItem(SAVED_GAME_KEY, JSON.stringify(payload));
  } catch {
    /* quota or private mode — best effort */
  }
}

export function loadGameFor(stageId: number): SavedGameSnapshot | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(SAVED_GAME_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<SavedGameSnapshot> | null;
    if (!parsed || parsed.stageId !== stageId) return null;
    if (!Array.isArray(parsed.pieces)) return null;
    return {
      stageId: parsed.stageId,
      pieces: parsed.pieces as SavedGameSnapshot["pieces"],
      elapsedMs: typeof parsed.elapsedMs === "number" ? parsed.elapsedMs : 0,
      hintsLeft: typeof parsed.hintsLeft === "number" ? parsed.hintsLeft : 0,
      hintsUsed: typeof parsed.hintsUsed === "number" ? parsed.hintsUsed : 0,
      savedAt: typeof parsed.savedAt === "number" ? parsed.savedAt : 0,
    };
  } catch {
    return null;
  }
}

export function clearSavedGame(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(SAVED_GAME_KEY);
  } catch {
    /* ignore */
  }
}

export function peekSavedStageId(): number | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(SAVED_GAME_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<SavedGameSnapshot> | null;
    if (parsed && typeof parsed.stageId === "number") return parsed.stageId;
    return null;
  } catch {
    return null;
  }
}
