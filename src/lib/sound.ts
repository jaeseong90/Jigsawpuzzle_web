// Tiny Web Audio sound effects — no audio assets, no extra bytes.
// iOS Safari requires the AudioContext to be created in response to a user
// gesture, so we lazily construct it on first play() call.

const SOUND_KEY = "jigsaw:sound";

type W = Window & { webkitAudioContext?: typeof AudioContext };

let ctx: AudioContext | null = null;

function ensureContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (ctx) return ctx;
  const w = window as W;
  const AC = window.AudioContext || w.webkitAudioContext;
  if (!AC) return null;
  try {
    ctx = new AC();
  } catch {
    ctx = null;
  }
  return ctx;
}

export function isSoundEnabled(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(SOUND_KEY) !== "off";
  } catch {
    return true;
  }
}

export function setSoundEnabled(on: boolean): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(SOUND_KEY, on ? "on" : "off");
  } catch {
    /* ignore quota */
  }
}

function playTone(
  freq: number,
  durationSec: number,
  type: OscillatorType,
  startOffset = 0,
  peakGain = 0.15
) {
  const c = ensureContext();
  if (!c) return;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.connect(gain);
  gain.connect(c.destination);
  osc.frequency.value = freq;
  osc.type = type;
  const start = c.currentTime + startOffset;
  gain.gain.setValueAtTime(peakGain, start);
  gain.gain.exponentialRampToValueAtTime(0.001, start + durationSec);
  osc.start(start);
  osc.stop(start + durationSec + 0.02);
}

export function playSnap(): void {
  if (!isSoundEnabled()) return;
  // Brief soft "click": two short tones close in pitch.
  playTone(720, 0.07, "sine", 0, 0.18);
  playTone(960, 0.05, "triangle", 0.02, 0.1);
}

// Fuller, lower chord for merging two or more pieces in a single move.
// Distinct from the single-snap so the player feels the difference between
// a small click and the deeper "whump" of a big group fusion.
export function playGroupMerge(): void {
  if (!isSoundEnabled()) return;
  playTone(440, 0.12, "sine", 0, 0.2);
  playTone(554, 0.1, "triangle", 0.02, 0.14);
  playTone(659, 0.08, "sine", 0.04, 0.1);
}

// Quick "tick" for a 90° rotation — high and tiny, like a watch crown.
export function playRotate(): void {
  if (!isSoundEnabled()) return;
  playTone(1240, 0.04, "square", 0, 0.07);
}

// Lock-in chime: rotated piece landed at correct orientation (rotation 0).
// A pair of bright ascending notes that don't compete with the chord
// played on a successful edge join.
export function playLockIn(): void {
  if (!isSoundEnabled()) return;
  playTone(880, 0.06, "sine", 0, 0.12);
  playTone(1320, 0.07, "sine", 0.04, 0.1);
}

// Soft "twinkle" for hint use — descends so it feels helpful rather than
// triumphant, which would be misleading.
export function playHint(): void {
  if (!isSoundEnabled()) return;
  playTone(1480, 0.06, "sine", 0, 0.1);
  playTone(1108, 0.08, "sine", 0.05, 0.09);
  playTone(880, 0.1, "triangle", 0.1, 0.07);
}

// Reverse swoosh for undo — descending wash to suggest "going back."
export function playUndo(): void {
  if (!isSoundEnabled()) return;
  playTone(620, 0.05, "sine", 0, 0.1);
  playTone(440, 0.08, "triangle", 0.03, 0.08);
}

export function playSolve(): void {
  if (!isSoundEnabled()) return;
  // Ascending arpeggio: C5 → E5 → G5 → C6.
  const notes = [523.25, 659.25, 783.99, 1046.5];
  notes.forEach((f, i) => {
    playTone(f, 0.42, "triangle", i * 0.1, 0.18);
  });
}

export function playTap(): void {
  if (!isSoundEnabled()) return;
  playTone(420, 0.04, "sine", 0, 0.08);
}
