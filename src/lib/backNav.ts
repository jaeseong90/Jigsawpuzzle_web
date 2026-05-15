"use client";

import { useEffect, useRef } from "react";

type Handler = () => void;

const stack: Handler[] = [];
let ignoreCount = 0;
let installed = false;

function ensureInstalled() {
  if (typeof window === "undefined" || installed) return;
  installed = true;
  window.addEventListener("popstate", () => {
    if (ignoreCount > 0) {
      ignoreCount--;
      return;
    }
    const top = stack[stack.length - 1];
    if (top) top();
  });
}

function popHistorySilently() {
  ignoreCount++;
  try {
    window.history.back();
  } catch {
    ignoreCount--;
  }
}

export function pushBackHandler(onBack: () => void): () => void {
  ensureInstalled();
  if (typeof window === "undefined") return () => {};
  window.history.pushState({ __back: Math.random() }, "");
  let consumedByBack = false;
  const handler: Handler = () => {
    consumedByBack = true;
    const idx = stack.indexOf(handler);
    if (idx >= 0) stack.splice(idx, 1);
    onBack();
  };
  stack.push(handler);
  return () => {
    const idx = stack.indexOf(handler);
    if (idx >= 0) stack.splice(idx, 1);
    if (!consumedByBack) popHistorySilently();
  };
}

export function pushExitGuard(
  onFirstPress: () => void,
  windowMs = 2000
): () => void {
  ensureInstalled();
  if (typeof window === "undefined") return () => {};
  window.history.pushState({ __exit: Math.random() }, "");
  let armed = false;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let sentinelHeld = true;
  const handler: Handler = () => {
    if (armed) {
      // The popstate already consumed our sentinel — going back once more
      // navigates past the root entry, which closes the PWA on Android.
      sentinelHeld = false;
      try {
        window.history.back();
      } catch {}
      return;
    }
    sentinelHeld = false;
    window.history.pushState({ __exit: Math.random() }, "");
    sentinelHeld = true;
    armed = true;
    onFirstPress();
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      armed = false;
    }, windowMs);
  };
  stack.push(handler);
  return () => {
    if (timer) clearTimeout(timer);
    const idx = stack.indexOf(handler);
    if (idx >= 0) stack.splice(idx, 1);
    if (sentinelHeld) popHistorySilently();
  };
}

export function useBackButton(active: boolean, onBack: () => void) {
  const ref = useRef(onBack);
  useEffect(() => {
    ref.current = onBack;
  });
  useEffect(() => {
    if (!active) return;
    return pushBackHandler(() => ref.current());
  }, [active]);
}

export function useExitGuard(active: boolean, onFirstPress: () => void) {
  const ref = useRef(onFirstPress);
  useEffect(() => {
    ref.current = onFirstPress;
  });
  useEffect(() => {
    if (!active) return;
    return pushExitGuard(() => ref.current());
  }, [active]);
}
