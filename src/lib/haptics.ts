// Centralized haptic cues so every interaction has a distinct fingerprint
// instead of every action firing the same 15ms tap. Vibration silently
// no-ops on platforms (iOS Safari) that lack navigator.vibrate — so the
// caller never has to feature-check.

const HAPTICS_KEY = "jigsaw:haptics";

export type HapticCue =
  | "snap" // single edge joined
  | "merge" // ≥2 edges joined in one move (group fusion)
  | "rotate" // piece rotated 90°
  | "lockIn" // piece rotated to its correct orientation
  | "hint" // hint used
  | "undo" // move reverted
  | "solve"; // puzzle complete

const PATTERNS: Record<HapticCue, number | number[]> = {
  snap: 14,
  merge: [10, 30, 24],
  rotate: 6,
  lockIn: [4, 18, 10],
  hint: [8, 20, 8],
  undo: 9,
  solve: [22, 50, 90],
};

export function isHapticsEnabled(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(HAPTICS_KEY) !== "off";
  } catch {
    return true;
  }
}

export function setHapticsEnabled(on: boolean): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(HAPTICS_KEY, on ? "on" : "off");
  } catch {
    /* ignore quota */
  }
}

export function pulse(cue: HapticCue): void {
  if (typeof navigator === "undefined" || !("vibrate" in navigator)) return;
  if (!isHapticsEnabled()) return;
  try {
    navigator.vibrate?.(PATTERNS[cue]);
  } catch {
    /* ignore */
  }
}
