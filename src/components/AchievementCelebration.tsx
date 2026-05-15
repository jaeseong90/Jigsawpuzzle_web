"use client";

import { useEffect } from "react";
import type { Achievement } from "@/data/achievements";
import { pulse } from "@/lib/haptics";

type Props = {
  achievement: Achievement | null;
  onClose: () => void;
};

// Pop-in overlay for the moment an achievement is first earned. Smaller
// presence than the streak celebration (which is a tier event), but still
// asks for a tap so the player actually registers the unlock.
export default function AchievementCelebration({
  achievement,
  onClose,
}: Props) {
  useEffect(() => {
    if (!achievement) return;
    pulse("hint");
  }, [achievement]);

  if (!achievement) return null;

  return (
    <div
      className="fixed inset-0 z-[65] flex items-center justify-center p-6 fade-in-soft"
      style={{ background: "rgba(0,0,0,0.7)" }}
      onClick={onClose}
    >
      <div
        className="achievement-burst w-full max-w-xs rounded-3xl px-6 py-7 text-center"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--bg-surface)",
          border: "1px solid var(--gold)",
          boxShadow: "0 20px 48px rgba(0,0,0,0.4)",
        }}
      >
        <div
          aria-hidden
          className="achievement-flair mx-auto flex items-center justify-center"
          style={{
            width: 72,
            height: 72,
            fontSize: 44,
            lineHeight: 1,
            background: "var(--gold-soft)",
            color: "var(--gold)",
            borderRadius: 9999,
          }}
        >
          {achievement.icon}
        </div>
        <div
          className="mt-3 text-[10px] font-bold tracking-[0.32em] uppercase"
          style={{ color: "var(--gold)" }}
        >
          Achievement Unlocked
        </div>
        <div
          className="mt-1 text-xl font-bold"
          style={{ color: "var(--ink-1)", letterSpacing: "-0.01em" }}
        >
          {achievement.title}
        </div>
        <div
          className="mt-1 text-[12px]"
          style={{ color: "var(--ink-mute)" }}
        >
          {achievement.description}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="press-95 mt-5 w-full rounded-full py-2.5 text-sm font-semibold"
          style={{
            background: "var(--ink-1)",
            color: "var(--bg-surface)",
          }}
        >
          확인
        </button>
      </div>
    </div>
  );
}
