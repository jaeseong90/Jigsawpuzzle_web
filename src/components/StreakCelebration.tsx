"use client";

import { useEffect } from "react";
import type { StreakTier } from "@/lib/dailyRewards";

type Props = {
  tier: StreakTier | null;
  onClose: () => void;
};

// Fires after a daily clear that just crossed a streak tier. Sits over
// whatever screen the player is on (win modal, board, or menu) and asks
// for an acknowledgment tap before dismissing — we want the milestone to
// register, not flash past.
export default function StreakCelebration({ tier, onClose }: Props) {
  useEffect(() => {
    if (!tier) return;
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      try {
        navigator.vibrate?.([20, 50, 30, 50, 30]);
      } catch {
        /* ignore */
      }
    }
  }, [tier]);

  if (!tier) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-6 fade-in-soft"
      style={{ background: "rgba(0,0,0,0.78)" }}
      onClick={onClose}
    >
      <div
        className="streak-burst w-full max-w-xs rounded-3xl px-6 py-8 text-center"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--bg-surface)",
          border: "1px solid var(--gold)",
          boxShadow: "0 24px 60px rgba(0,0,0,0.45)",
        }}
      >
        <div
          aria-hidden
          className="streak-flair mx-auto flex items-center justify-center"
          style={{
            width: 88,
            height: 88,
            fontSize: 56,
            lineHeight: 1,
            background: "var(--gold-soft)",
            color: "var(--gold)",
            borderRadius: 9999,
          }}
        >
          {tier.flair}
        </div>
        <div
          className="mt-4 text-[10px] font-bold tracking-[0.32em] uppercase"
          style={{ color: "var(--gold)" }}
        >
          Streak Milestone
        </div>
        <div
          className="mt-1 text-2xl font-bold"
          style={{ color: "var(--ink-1)", letterSpacing: "-0.01em" }}
        >
          {tier.label}
        </div>
        <div
          className="mt-1 text-sm"
          style={{ color: "var(--ink-mute)" }}
        >
          {tier.blurb}
        </div>
        <div
          className="mt-4 inline-flex items-center gap-2 rounded-full px-3 py-1 text-[12px] font-semibold"
          style={{
            background: "var(--accent)",
            color: "var(--accent-fg)",
          }}
        >
          +{tier.xpBonus} XP 보너스
        </div>
        <button
          type="button"
          onClick={onClose}
          className="press-95 mt-6 w-full rounded-full py-3 text-sm font-semibold"
          style={{
            background: "var(--ink-1)",
            color: "var(--bg-surface)",
          }}
        >
          계속하기
        </button>
      </div>
    </div>
  );
}
