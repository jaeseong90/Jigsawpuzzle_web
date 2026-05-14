// Theme handling — Light / Dark / System.
// CSS-variable driven so a single attribute toggle on <html> swaps the palette.

export type Theme = "light" | "dark" | "system";

const THEME_KEY = "jigsaw:theme";

export function loadTheme(): Theme {
  if (typeof window === "undefined") return "system";
  try {
    const raw = localStorage.getItem(THEME_KEY);
    if (raw === "light" || raw === "dark" || raw === "system") return raw;
  } catch {
    /* ignore */
  }
  return "system";
}

export function saveTheme(t: Theme): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(THEME_KEY, t);
  } catch {
    /* ignore */
  }
  applyTheme(t);
}

export function applyTheme(t: Theme): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  let resolved: "light" | "dark";
  if (t === "system") {
    resolved =
      typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
  } else {
    resolved = t;
  }
  root.setAttribute("data-theme", resolved);
}

export function watchSystemTheme(cb: () => void): () => void {
  if (typeof window === "undefined" || !window.matchMedia) return () => {};
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  const handler = () => cb();
  mq.addEventListener?.("change", handler);
  return () => mq.removeEventListener?.("change", handler);
}
