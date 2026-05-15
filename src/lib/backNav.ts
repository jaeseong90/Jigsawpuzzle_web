"use client";

import { useEffect, useRef } from "react";

type Handler = () => void;

// Centralized back-navigation handling for a single-page PWA.
//
// One sentinel history entry is kept "above" the original entry at all times
// once installed. Pressing the system back button consumes the sentinel,
// fires popstate, and we re-push it so the user stays inside the app while
// we dispatch to whichever screen/sheet is on top of the stack. A separate
// exit guard lets the root menu require a second press within a short window
// before actually closing the PWA.
//
// In-app close buttons (the "X" inside a sheet) just remove the handler
// from the stack — the sentinel persists, and the user's next platform back
// press becomes a no-op routed to the next handler down (or the exit guard).
// That's intentional: any harm is a single extra back press, not an app
// exit.

const stack: Handler[] = [];
let installed = false;

type ExitGuard = { onFirstPress: () => void };
let exitGuard: ExitGuard | null = null;
let armed = false;
let armTimer: ReturnType<typeof setTimeout> | null = null;

function pushSentinel() {
  if (typeof window === "undefined") return;
  window.history.pushState({ __back: 1 }, "");
}

function ensureInstalled() {
  if (typeof window === "undefined" || installed) return;
  installed = true;
  // Push the persistent sentinel so the first back press has something
  // to consume instead of closing the PWA.
  if (window.history.state?.__back !== 1) {
    pushSentinel();
  }
  window.addEventListener("popstate", () => {
    // The sentinel was just consumed. Re-push so we stay trapped.
    pushSentinel();
    const top = stack[stack.length - 1];
    if (top) {
      // Any active screen on the stack handles the press; cancel any
      // pending exit-arm since the user is actively engaging the app.
      armed = false;
      if (armTimer) {
        clearTimeout(armTimer);
        armTimer = null;
      }
      top();
      return;
    }
    if (!exitGuard) {
      // Nothing to guard with; the re-pushed sentinel ensures we don't
      // actually leave. The user's next back press will hit this same
      // branch again (silent), which is harmless.
      return;
    }
    if (armed) {
      armed = false;
      if (armTimer) {
        clearTimeout(armTimer);
        armTimer = null;
      }
      // The sentinel was already consumed by this popstate AND we
      // re-pushed it above. To actually exit, we need to navigate past
      // the original entry — go back twice.
      try {
        window.history.go(-2);
      } catch {}
      return;
    }
    armed = true;
    exitGuard.onFirstPress();
    if (armTimer) clearTimeout(armTimer);
    armTimer = setTimeout(() => {
      armed = false;
      armTimer = null;
    }, 2000);
  });
}

export function registerBack(handler: Handler): () => void {
  ensureInstalled();
  if (typeof window === "undefined") return () => {};
  stack.push(handler);
  return () => {
    const idx = stack.lastIndexOf(handler);
    if (idx >= 0) stack.splice(idx, 1);
  };
}

export function registerExitGuard(guard: ExitGuard): () => void {
  ensureInstalled();
  if (typeof window === "undefined") return () => {};
  exitGuard = guard;
  return () => {
    if (exitGuard === guard) exitGuard = null;
    if (armTimer) {
      clearTimeout(armTimer);
      armTimer = null;
    }
    armed = false;
  };
}

export function useBackButton(active: boolean, onBack: () => void) {
  const ref = useRef(onBack);
  useEffect(() => {
    ref.current = onBack;
  });
  useEffect(() => {
    if (!active) return;
    return registerBack(() => ref.current());
  }, [active]);
}

export function useExitGuard(active: boolean, onFirstPress: () => void) {
  const ref = useRef(onFirstPress);
  useEffect(() => {
    ref.current = onFirstPress;
  });
  useEffect(() => {
    if (!active) return;
    return registerExitGuard({ onFirstPress: () => ref.current() });
  }, [active]);
}
