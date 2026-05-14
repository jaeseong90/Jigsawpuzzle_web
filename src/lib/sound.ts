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
