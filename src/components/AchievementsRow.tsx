"use client";

import { useState } from "react";
import { ACHIEVEMENTS, type AchievementContext } from "@/data/achievements";

type Props = {
  ctx: AchievementContext | null;
};

// Tappable row of milestone badges. Earned ones bloom into the gold palette;
// unearned ones stay desaturated so the player can read the next goal at a
// glance.
export default function AchievementsRow({ ctx }: Props) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const active = ACHIEVEMENTS.find((a) => a.id === activeId);
  const earnedCount = ctx
    ? ACHIEVEMENTS.filter((a) => a.check(ctx)).length
    : 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-2 px-1">
        <div
          className="text-[10px] tracking-[0.18em] uppercase font-bold"
          style={{ color: "var(--ink-mute)" }}
        >
          ACHIEVEMENTS
        </div>
        <div
          className="text-[11px] tabular-nums font-semibold"
          style={{ color: "var(--ink-mute)" }}
        >
          {earnedCount} / {ACHIEVEMENTS.length}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        {ACHIEVEMENTS.map((a) => {
          const earned = ctx ? a.check(ctx) : false;
          const selected = activeId === a.id;
          return (
            <button
              key={a.id}
              type="button"
              onClick={() => setActiveId(selected ? null : a.id)}
              className="press-95 w-9 h-9 rounded-full flex items-center justify-center"
              style={{
                background: earned ? "var(--gold-soft)" : "var(--bg-elevated)",
                border: `1px solid ${
                  selected
                    ? "var(--gold)"
                    : earned
                    ? "var(--gold)"
                    : "var(--line)"
                }`,
                opacity: earned ? 1 : 0.55,
                filter: earned ? "none" : "grayscale(0.7)",
                boxShadow: selected
                  ? "0 0 0 2px var(--gold-soft)"
                  : "none",
              }}
              aria-label={`${a.title} ${earned ? "(달성)" : "(미달성)"}`}
            >
              <span className="text-base" aria-hidden>
                {a.icon}
              </span>
            </button>
          );
        })}
      </div>
      {active && (
        <div
          className="mt-2 rounded-xl px-3 py-2 text-xs"
          style={{
            background: "var(--bg-elevated)",
            border: "1px solid var(--line)",
            color: "var(--ink-2)",
          }}
        >
          <div className="flex items-center gap-2">
            <span className="text-base" aria-hidden>
              {active.icon}
            </span>
            <span
              className="font-semibold"
              style={{ color: "var(--ink-1)" }}
            >
              {active.title}
            </span>
            {ctx && active.check(ctx) && (
              <span
                className="ml-auto text-[10px] rounded-full px-1.5 py-0.5 font-semibold"
                style={{
                  background: "var(--success-soft)",
                  color: "var(--success)",
                }}
              >
                달성
              </span>
            )}
          </div>
          <div
            className="mt-0.5"
            style={{ color: "var(--ink-mute)" }}
          >
            {active.description}
          </div>
        </div>
      )}
    </div>
  );
}
