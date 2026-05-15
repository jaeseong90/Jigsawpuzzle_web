// Persistent library of the player's own-photo puzzles. Stored in
// IndexedDB because the data URLs are ~80-200KB each and 20+ photos
// would blow past the localStorage quota (~5MB).

const DB_NAME = "tessera-personal";
const DB_VERSION = 1;
const STORE = "photos";

export type PersonalPhotoSettings = {
  rows: number;
  cols: number;
  rotate: boolean;
};

export type PersonalPhoto = {
  id: string;
  dataUrl: string;
  thumbDataUrl: string;
  createdAt: number;
  lastPlayedAt: number | null;
  plays: number;
  completions: number;
  bestTimeMs: number | null;
  lastSettings: PersonalPhotoSettings;
};

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof indexedDB !== "undefined";
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: "id" });
        store.createIndex("createdAt", "createdAt");
        store.createIndex("lastPlayedAt", "lastPlayedAt");
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("indexedDB open failed"));
  });
}

async function withStore<T>(
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => Promise<T> | T
): Promise<T> {
  const db = await openDb();
  try {
    return await new Promise<T>((resolve, reject) => {
      const tx = db.transaction(STORE, mode);
      const store = tx.objectStore(STORE);
      let pending: Promise<T> | T;
      try {
        pending = fn(store);
      } catch (err) {
        reject(err);
        return;
      }
      tx.oncomplete = () => {
        Promise.resolve(pending).then(resolve, reject);
      };
      tx.onerror = () => reject(tx.error ?? new Error("idb tx failed"));
      tx.onabort = () => reject(tx.error ?? new Error("idb tx aborted"));
    });
  } finally {
    db.close();
  }
}

function reqAsPromise<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("idb req failed"));
  });
}

function generateId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `p_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

// Downscale an existing data URL into a tiny thumbnail for the gallery
// grid so we never paint the full-resolution puzzle bitmap there.
async function makeThumbnail(dataUrl: string, side = 280): Promise<string> {
  if (!isBrowser()) return dataUrl;
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.decoding = "async";
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("thumbnail load failed"));
      el.src = dataUrl;
    });
    const w = img.naturalWidth || img.width;
    const h = img.naturalHeight || img.height;
    const longest = Math.max(w, h);
    const scale = longest > side ? side / longest : 1;
    const tw = Math.max(1, Math.round(w * scale));
    const th = Math.max(1, Math.round(h * scale));
    const canvas = document.createElement("canvas");
    canvas.width = tw;
    canvas.height = th;
    const ctx = canvas.getContext("2d");
    if (!ctx) return dataUrl;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, 0, 0, tw, th);
    return canvas.toDataURL("image/jpeg", 0.78);
  } catch {
    return dataUrl;
  }
}

export async function addPersonalPhoto(
  dataUrl: string,
  settings: PersonalPhotoSettings
): Promise<PersonalPhoto> {
  const thumb = await makeThumbnail(dataUrl);
  const entry: PersonalPhoto = {
    id: generateId(),
    dataUrl,
    thumbDataUrl: thumb,
    createdAt: Date.now(),
    lastPlayedAt: null,
    plays: 0,
    completions: 0,
    bestTimeMs: null,
    lastSettings: settings,
  };
  if (!isBrowser()) return entry;
  await withStore("readwrite", (store) => {
    store.put(entry);
    return entry;
  });
  return entry;
}

export async function listPersonalPhotos(): Promise<PersonalPhoto[]> {
  if (!isBrowser()) return [];
  return withStore("readonly", async (store) => {
    const all = await reqAsPromise(store.getAll());
    const list = (all ?? []) as PersonalPhoto[];
    list.sort((a, b) => {
      const ta = a.lastPlayedAt ?? a.createdAt;
      const tb = b.lastPlayedAt ?? b.createdAt;
      return tb - ta;
    });
    return list;
  });
}

export async function getPersonalPhoto(
  id: string
): Promise<PersonalPhoto | null> {
  if (!isBrowser()) return null;
  return withStore("readonly", async (store) => {
    const v = (await reqAsPromise(store.get(id))) as PersonalPhoto | undefined;
    return v ?? null;
  });
}

export async function deletePersonalPhoto(id: string): Promise<void> {
  if (!isBrowser()) return;
  await withStore("readwrite", (store) => {
    store.delete(id);
  });
}

export async function recordPersonalPlay(
  id: string,
  settings?: PersonalPhotoSettings
): Promise<void> {
  if (!isBrowser()) return;
  await withStore("readwrite", async (store) => {
    const existing = (await reqAsPromise(store.get(id))) as
      | PersonalPhoto
      | undefined;
    if (!existing) return;
    const next: PersonalPhoto = {
      ...existing,
      lastPlayedAt: Date.now(),
      plays: existing.plays + 1,
      lastSettings: settings ?? existing.lastSettings,
    };
    store.put(next);
  });
}

export async function recordPersonalCompletion(
  id: string,
  durationMs: number
): Promise<void> {
  if (!isBrowser()) return;
  await withStore("readwrite", async (store) => {
    const existing = (await reqAsPromise(store.get(id))) as
      | PersonalPhoto
      | undefined;
    if (!existing) return;
    const next: PersonalPhoto = {
      ...existing,
      completions: existing.completions + 1,
      bestTimeMs:
        existing.bestTimeMs == null || durationMs < existing.bestTimeMs
          ? durationMs
          : existing.bestTimeMs,
    };
    store.put(next);
  });
}

export async function clearPersonalPhotos(): Promise<void> {
  if (!isBrowser()) return;
  await withStore("readwrite", (store) => {
    store.clear();
  });
}
