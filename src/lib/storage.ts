const IMAGE_KEY = "jigsaw:lastImage";
const COMPLETIONS_KEY = "jigsaw:completions";

export type Completion = {
  rows: number;
  cols: number;
  durationMs: number;
  finishedAt: number;
};

export function saveLastImage(dataUrl: string) {
  try {
    localStorage.setItem(IMAGE_KEY, dataUrl);
  } catch {
    // Quota — ignore silently; the image is still usable for the current session.
  }
}

export function loadLastImage(): string | null {
  try {
    return localStorage.getItem(IMAGE_KEY);
  } catch {
    return null;
  }
}

export function saveCompletion(c: Completion) {
  try {
    const list = loadCompletions();
    list.unshift(c);
    localStorage.setItem(COMPLETIONS_KEY, JSON.stringify(list.slice(0, 50)));
  } catch {
    // Ignore quota errors.
  }
}

export function loadCompletions(): Completion[] {
  try {
    const raw = localStorage.getItem(COMPLETIONS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
