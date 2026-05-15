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
      {active && (() => {
        const earned = ctx ? active.check(ctx) : false;
        const prog = ctx && !earned && active.progress ? active.progress(ctx) : null;
        const pct = prog
          ? Math.min(100, Math.round((prog[0] / Math.max(1, prog[1])) * 100))
          : 0;
        return (
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
              {earned && (
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
            {prog && (
              <div className="mt-2">
                <div className="flex items-center justify-between mb-1">
                  <span
                    className="text-[10px] font-semibold tabular-nums"
                    style={{ color: "var(--ink-mute)" }}
                  >
                    진행도
                  </span>
                  <span
                    className="text-[10px] font-bold tabular-nums"
                    style={{ color: "var(--ink-1)" }}
                  >
                    {prog[0].toLocaleString()} / {prog[1].toLocaleString()}
                  </span>
                </div>
                <div
                  className="h-1 rounded-full overflow-hidden"
                  style={{ background: "var(--bg-surface)" }}
                >
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${pct}%`,
                      background: "var(--gold)",
                      transition: "width 400ms cubic-bezier(0.2,0.8,0.2,1)",
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        );
      })()}
    </div>
  );
}
