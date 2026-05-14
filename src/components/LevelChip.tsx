"use client";

import {
  deriveLevel,
  inferTotalXpFromProgress,
  titleForLevel,
} from "@/lib/level";
import type { Progress } from "@/lib/progress";

type Props = {
  progress: Progress | null;
  compact?: boolean;
  onClick?: () => void;
};

export default function LevelChip({ progress, compact, onClick }: Props) {
  // Persisted xp is authoritative once the user has cleared any stage post-update.
  // For carry-over users (xp == 0 but cleared list non-empty), infer.
  const xpFromProgress =
    progress && progress.xp === 0 && Object.keys(progress.cleared).length > 0
      ? inferTotalXpFromProgress(progress)
      : progress?.xp ?? 0;
  const state = deriveLevel(xpFromProgress);
  const pct = Math.round(state.progress * 100);
  const title = titleForLevel(state.level);

  const inner = (
    <div
      className="rounded-2xl flex items-center gap-3 px-3 py-2"
      style={{
        background: "var(--bg-surface)",
        border: "1px solid var(--line)",
      }}
    >
      <div
        className="flex items-center justify-center w-10 h-10 rounded-full font-bold"
        style={{
          background: "var(--accent)",
          color: "var(--accent-fg)",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {state.level}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <div
            className="text-[11px] font-bold tracking-[0.16em] uppercase"
            style={{ color: "var(--ink-mute)" }}
          >
            Level {state.level}
          </div>
          <div
            className="text-[10px] font-semibold tabular-nums"
            style={{ color: "var(--ink-mute)" }}
          >
            {state.xpIntoLevel} / {state.xpForNext} XP
          </div>
        </div>
        <div
          className="text-[13px] font-semibold leading-tight truncate"
          style={{ color: "var(--ink-1)" }}
        >
          {title}
        </div>
        {!compact && (
          <div
            className="mt-1.5 h-1.5 w-full rounded-full overflow-hidden"
            style={{ background: "var(--bg-elevated)" }}
          >
            <div
              className="xp-bar-fill h-full rounded-full"
              style={{ width: `${pct}%` }}
            />
          </div>
        )}
      </div>
    </div>
  );

  if (!onClick) return inner;
  return (
    <button type="button" onClick={onClick} className="press-95 w-full text-left">
      {inner}
    </button>
  );
}
