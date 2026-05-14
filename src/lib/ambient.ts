// Generated ambient soundscape — no assets, no external audio files.
//
// Composition:
// - Three sine drones at A1 / E2 / A2 carry the harmonic floor at very low gain
// - One triangle pad at A3, modulated by a slow LFO so it breathes in and out
// - Occasional bell-like impulses at pentatonic notes (A4 B4 C#5 E5 F#5) every
//   6–20 seconds, scheduled with setTimeout
//
// Browser autoplay restrictions: AudioContext cannot make sound until a user
// gesture. Settings toggle is itself the gesture; on subsequent page loads the
// app installs a one-shot resume on first user interaction.

const PERSIST_KEY = "jigsaw:ambient";

type W = Window & { webkitAudioContext?: typeof AudioContext };

let ctx: AudioContext | null = null;
let masterGain: GainNode | null = null;
let active = false;
let oscillators: Array<OscillatorNode> = [];
let bellTimer: number | null = null;
let firstInteractionAttached = false;

export function isAmbientEnabled(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(PERSIST_KEY) === "on";
  } catch {
    return false;
  }
}

export function setAmbientEnabled(on: boolean): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(PERSIST_KEY, on ? "on" : "off");
  } catch {
    /* ignore */
  }
  if (on) startAmbient();
  else stopAmbient();
}

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

export function startAmbient(): boolean {
  if (typeof window === "undefined") return false;
  if (active) return true;
  const c = ensureContext();
  if (!c) return false;
  try {
    // If the context was suspended (autoplay), best-effort resume.
    if (c.state === "suspended") c.resume();

    const master = c.createGain();
    master.gain.value = 0;
    master.connect(c.destination);
    masterGain = master;

    const now = c.currentTime;
    master.gain.setValueAtTime(0, now);
    master.gain.linearRampToValueAtTime(0.22, now + 3.5);

    // Three sine drones at very low frequencies — the harmonic floor.
    const droneFreqs = [55, 82.4, 110]; // A1, E2, A2
    for (const f of droneFreqs) {
      const o = c.createOscillator();
      o.type = "sine";
      o.frequency.value = f;
      const g = c.createGain();
      g.gain.value = 0.32;
      o.connect(g);
      g.connect(master);
      o.start();
      oscillators.push(o);
    }

    // Breathing pad — triangle at A3, modulated by a slow LFO so the gain
    // drifts between near-silent and gently audible.
    const padOsc = c.createOscillator();
    padOsc.type = "triangle";
    padOsc.frequency.value = 220;
    const padGain = c.createGain();
    padGain.gain.value = 0.04;
    padOsc.connect(padGain);
    padGain.connect(master);
    padOsc.start();
    oscillators.push(padOsc);

    const lfo = c.createOscillator();
    lfo.type = "sine";
    lfo.frequency.value = 0.05; // ~20s cycle
    const lfoGain = c.createGain();
    lfoGain.gain.value = 0.05;
    lfo.connect(lfoGain);
    lfoGain.connect(padGain.gain);
    lfo.start();
    oscillators.push(lfo);

    scheduleBell();

    active = true;
    return true;
  } catch {
    return false;
  }
}

function scheduleBell() {
  if (bellTimer != null) window.clearTimeout(bellTimer);
  const delay = 6000 + Math.random() * 14000; // 6–20s
  bellTimer = window.setTimeout(() => {
    playBell();
    scheduleBell();
  }, delay);
}

function playBell() {
  if (!ctx || !masterGain) return;
  const notes = [440, 493.88, 554.37, 659.25, 739.99]; // A4 B4 C#5 E5 F#5
  const freq = notes[Math.floor(Math.random() * notes.length)];
  const osc = ctx.createOscillator();
  osc.type = "sine";
  osc.frequency.value = freq;
  const g = ctx.createGain();
  g.gain.value = 0;
  osc.connect(g);
  g.connect(masterGain);
  const now = ctx.currentTime;
  g.gain.setValueAtTime(0, now);
  g.gain.linearRampToValueAtTime(0.07, now + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0008, now + 4);
  osc.start();
  osc.stop(now + 4.2);
}

export function stopAmbient(): void {
  if (!active) return;
  active = false;
  if (bellTimer != null) {
    window.clearTimeout(bellTimer);
    bellTimer = null;
  }
  if (!ctx || !masterGain) return;
  const now = ctx.currentTime;
  try {
    masterGain.gain.cancelScheduledValues(now);
    masterGain.gain.setValueAtTime(masterGain.gain.value, now);
    masterGain.gain.linearRampToValueAtTime(0, now + 1.4);
  } catch {
    /* ignore */
  }
  const oscsToStop = oscillators;
  oscillators = [];
  const gainNode = masterGain;
  masterGain = null;
  window.setTimeout(() => {
    for (const o of oscsToStop) {
      try {
        o.stop();
      } catch {
        /* ignore */
      }
    }
    try {
      gainNode.disconnect();
    } catch {
      /* ignore */
    }
  }, 1600);
}

// Installs a one-shot "resume ambient on first gesture" handler if the user
// previously had ambient enabled. Browsers refuse to start audio without a
// gesture, so this defers the start until they tap anywhere.
export function installFirstInteractionResume(): void {
  if (typeof window === "undefined") return;
  if (firstInteractionAttached) return;
  if (!isAmbientEnabled()) return;
  firstInteractionAttached = true;
  const start = () => {
    startAmbient();
    window.removeEventListener("pointerdown", start);
    window.removeEventListener("keydown", start);
  };
  window.addEventListener("pointerdown", start, { once: true });
  window.addEventListener("keydown", start, { once: true });
}

// Pause on tab hide, resume on tab show — saves battery and avoids the audio
// silently drifting in the background.
export function installVisibilityHook(): void {
  if (typeof document === "undefined") return;
  document.addEventListener("visibilitychange", () => {
    if (!isAmbientEnabled()) return;
    if (document.hidden) stopAmbient();
    else startAmbient();
  });
}
