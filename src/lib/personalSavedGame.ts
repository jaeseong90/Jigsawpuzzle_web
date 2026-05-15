// In-progress snapshots for personal-photo puzzles, keyed by photoId.
// Mirrors lib/savedGame.ts for stage puzzles but lives in its own
// localStorage namespace so the two layers stay independent — personal
// content is user-owned and shouldn't get wiped by "진행도 초기화".

const SAVED_KEY = "jigsaw:personalSavedGame:v1";
const MAX_SLOTS = 12;

export type PersonalSavedSnapshot = {
  photoId: string;
  rows: number;
  cols: number;
  rotate: boolean;
  pieces: Array<{
    id: number;
    origRow: number;
    origCol: number;
    currentIndex: number;
    rotation?: number;
  }>;
  elapsedMs: number;
  hintsLeft: number;
  hintsUsed: number;
  savedAt: number;
};

type SavedMap = Record<string, PersonalSavedSnapshot>;

function readMap(): SavedMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(SAVED_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") return parsed as SavedMap;
  } catch {
    /* corrupt — start over */
  }
  return {};
}

function writeMap(map: SavedMap): void {
  if (typeof window === "undefined") return;
  try {
    const entries = Object.values(map);
    if (entries.length > MAX_SLOTS) {
      entries.sort((a, b) => b.savedAt - a.savedAt);
      const kept = entries.slice(0, MAX_SLOTS);
      const next: SavedMap = {};
      for (const e of kept) next[e.photoId] = e;
      map = next;
    }
    localStorage.setItem(SAVED_KEY, JSON.stringify(map));
  } catch {
    /* quota */
  }
}

export function savePersonalGame(
  g: Omit<PersonalSavedSnapshot, "savedAt">
): void {
  if (typeof window === "undefined") return;
  const map = readMap();
  map[g.photoId] = { ...g, savedAt: Date.now() };
  writeMap(map);
}

export function loadPersonalGame(
  photoId: string
): PersonalSavedSnapshot | null {
  if (typeof window === "undefined") return null;
  const map = readMap();
  return map[photoId] ?? null;
}

export function clearPersonalGame(photoId: string): void {
  if (typeof window === "undefined") return;
  const map = readMap();
  if (map[photoId] == null) return;
  delete map[photoId];
  writeMap(map);
}

export function listPersonalSavedGames(): PersonalSavedSnapshot[] {
  if (typeof window === "undefined") return [];
  const map = readMap();
  return Object.values(map).sort((a, b) => b.savedAt - a.savedAt);
}
