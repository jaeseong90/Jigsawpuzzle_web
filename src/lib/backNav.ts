"use client";

import { useEffect, useRef } from "react";

type Handler = () => void;

// Centralized back-navigation handling for a single-page PWA.
//
// Two sentinel history entries are placed above the original launch entry
// when the module installs. On Android PWAs the platform will close the
// window as soon as a back press would otherwise leave the launch entry,
// often *before* popstate fires — keeping a two-deep cushion guarantees
// our handler runs even when the user back-presses repeatedly. Each
// popstate re-pushes one sentinel so we stay trapped.
//
// In-app close buttons (the "X" inside a sheet) just remove the handler
// from the stack — the sentinel persists, and the user's next platform back
// press becomes a no-op routed to the next handler down (or the exit guard).
//
// Exit at the root menu is a two-step: the first back press shows the
// caller's confirmation (typically a toast) and re-arms the sentinel; a
// second press within the window navigates past the launch entry, which
// closes the PWA on Android.

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
  // Two-deep cushion: the first sentinel absorbs the first back press,
  // the second guarantees we still have one entry above origin after a
  // race with Next.js's own router state setup. Without it, Android can
  // exit the PWA before popstate ever fires.
  pushSentinel();
  pushSentinel();
  window.addEventListener("popstate", () => {
    const top = stack[stack.length - 1];
    if (top) {
      pushSentinel();
      armed = false;
      if (armTimer) {
        clearTimeout(armTimer);
        armTimer = null;
      }
      top();
      return;
    }
    if (!exitGuard) {
      pushSentinel();
      return;
    }
    if (armed) {
      armed = false;
      if (armTimer) {
        clearTimeout(armTimer);
        armTimer = null;
      }
      // Don't re-push — let the navigation continue past origin so the
      // PWA closes. The extra back call handles browsers where the
      // current popstate alone leaves us still inside history.
      try {
        window.history.go(-2);
      } catch {}
      return;
    }
    pushSentinel();
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
