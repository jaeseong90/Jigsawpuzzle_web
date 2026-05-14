// In-progress puzzle snapshots, keyed by stageId so the player can have
// several stages mid-solve at the same time. Storage shape (v2):
//   localStorage[SAVED_KEY] = { [stageId: string]: SavedGameSnapshot }
// We migrate the prior single-slot v1 storage on first read.

const SAVED_KEY = "jigsaw:savedGame:v2";
const LEGACY_KEY = "jigsaw:savedGame:v1";
const MAX_SLOTS = 24;

export type SavedGameSnapshot = {
  stageId: number;
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

type SavedMap = Record<string, SavedGameSnapshot>;

function readMap(): SavedMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(SAVED_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") return parsed as SavedMap;
    }
    // One-time migration from v1 single-slot save.
    const legacyRaw = localStorage.getItem(LEGACY_KEY);
    if (legacyRaw) {
      const legacy = JSON.parse(legacyRaw) as Partial<SavedGameSnapshot> | null;
      if (
        legacy &&
        typeof legacy.stageId === "number" &&
        Array.isArray(legacy.pieces)
      ) {
        const migrated: SavedMap = {
          [String(legacy.stageId)]: {
            stageId: legacy.stageId,
            pieces: legacy.pieces as SavedGameSnapshot["pieces"],
            elapsedMs:
              typeof legacy.elapsedMs === "number" ? legacy.elapsedMs : 0,
            hintsLeft:
              typeof legacy.hintsLeft === "number" ? legacy.hintsLeft : 0,
            hintsUsed:
              typeof legacy.hintsUsed === "number" ? legacy.hintsUsed : 0,
            savedAt:
              typeof legacy.savedAt === "number" ? legacy.savedAt : Date.now(),
          },
        };
        try {
          localStorage.setItem(SAVED_KEY, JSON.stringify(migrated));
          localStorage.removeItem(LEGACY_KEY);
        } catch {
          /* quota */
        }
        return migrated;
      }
    }
  } catch {
    /* corrupt storage — start over */
  }
  return {};
}

function writeMap(map: SavedMap): void {
  if (typeof window === "undefined") return;
  try {
    // Cap stored slots at MAX_SLOTS, evicting the oldest savedAt entries first
    // so localStorage doesn't bloat unbounded on a player who skips around.
    const entries = Object.values(map);
    if (entries.length > MAX_SLOTS) {
      entries.sort((a, b) => b.savedAt - a.savedAt);
      const kept = entries.slice(0, MAX_SLOTS);
      const next: SavedMap = {};
      for (const e of kept) next[String(e.stageId)] = e;
      map = next;
    }
    localStorage.setItem(SAVED_KEY, JSON.stringify(map));
  } catch {
    /* quota */
  }
}

export function saveGame(g: Omit<SavedGameSnapshot, "savedAt">): void {
  if (typeof window === "undefined") return;
  const map = readMap();
  map[String(g.stageId)] = { ...g, savedAt: Date.now() };
  writeMap(map);
}

export function loadGameFor(stageId: number): SavedGameSnapshot | null {
  if (typeof window === "undefined") return null;
  const map = readMap();
  const slot = map[String(stageId)];
  return slot ?? null;
}

export function clearSavedGameFor(stageId: number): void {
  if (typeof window === "undefined") return;
  const map = readMap();
  if (map[String(stageId)] == null) return;
  delete map[String(stageId)];
  writeMap(map);
}

// Wipe every in-progress slot. Called by the global "reset progress" action.
export function clearSavedGame(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(SAVED_KEY);
    localStorage.removeItem(LEGACY_KEY);
  } catch {
    /* ignore */
  }
}

// Returns the saved snapshots in most-recently-saved-first order.
export function listSavedGames(): SavedGameSnapshot[] {
  if (typeof window === "undefined") return [];
  const map = readMap();
  return Object.values(map).sort((a, b) => b.savedAt - a.savedAt);
}

// The most recently saved stage id, or null if no snapshots exist.
export function peekSavedStageId(): number | null {
  const list = listSavedGames();
  return list.length > 0 ? list[0].stageId : null;
}
