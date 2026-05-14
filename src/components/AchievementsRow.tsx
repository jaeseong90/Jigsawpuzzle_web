"use client";

import { useState } from "react";
import { ACHIEVEMENTS } from "@/data/achievements";
import type { Progress } from "@/lib/progress";

type Props = {
  progress: Progress | null;
};

export default function AchievementsRow({ progress }: Props) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const active = ACHIEVEMENTS.find((a) => a.id === activeId);
  const earnedCount = progress
    ? ACHIEVEMENTS.filter((a) => a.check(progress)).length
    : 0;

  return (
    <div className="mt-3">
      <div className="flex flex-wrap items-center gap-1.5">
        {ACHIEVEMENTS.map((a) => {
          const earned = progress ? a.check(progress) : false;
          return (
            <button
              key={a.id}
              type="button"
              onClick={() => setActiveId(activeId === a.id ? null : a.id)}
              className={`w-9 h-9 rounded-full flex items-center justify-center shadow-sm border transition-transform active:scale-95 ${
                earned
                  ? "bg-amber-100 border-amber-300"
                  : "bg-zinc-100 border-zinc-200 grayscale opacity-60"
              } ${activeId === a.id ? "ring-2 ring-amber-700" : ""}`}
              aria-label={`${a.title} ${earned ? "(달성)" : "(미달성)"}`}
            >
              <span className="text-lg" aria-hidden>
                {a.icon}
              </span>
            </button>
          );
        })}
        <div className="ml-1 text-[11px] font-semibold text-amber-700/80 tabular-nums">
          {earnedCount}/{ACHIEVEMENTS.length}
        </div>
      </div>
      {active && (
        <div className="mt-2 rounded-xl bg-white border border-amber-200 px-3 py-2 text-xs text-amber-900 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="text-base" aria-hidden>
              {active.icon}
            </span>
            <span className="font-semibold">{active.title}</span>
            {progress && active.check(progress) && (
              <span className="ml-auto text-[10px] rounded-full bg-emerald-100 text-emerald-700 px-1.5 py-0.5">
                달성
              </span>
            )}
          </div>
          <div className="mt-0.5 text-amber-800/80">{active.description}</div>
        </div>
      )}
    </div>
  );
}
