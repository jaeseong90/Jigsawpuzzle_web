"use client";

import { useEffect, useMemo, useState } from "react";
import { loadDailyHistory, type DailyHistory } from "@/lib/dailyHistory";
import { getDailyStageId, getTodayKey, loadDaily } from "@/lib/daily";
import { currentTier } from "@/lib/dailyRewards";

type Props = {
  open: boolean;
  onClose: () => void;
};

// Monthly calendar view — adults appreciate seeing the cadence of their
// daily ritual at a glance. Each cell shows whether the day's puzzle was
// cleared (filled), in-progress today, or empty.
export default function DailyCalendar({ open, onClose }: Props) {
  const [history, setHistory] = useState<DailyHistory>({});
  const [todayCleared, setTodayCleared] = useState(false);
  const [bestStreak, setBestStreak] = useState(0);
  const [cursor, setCursor] = useState<{ year: number; month: number }>(() => {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
  });

  useEffect(() => {
    if (!open) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHistory(loadDailyHistory());
    const daily = loadDaily();
    setTodayCleared(daily.cleared && daily.date === getTodayKey());
    setBestStreak(daily.bestStreak);
  }, [open]);

  const grid = useMemo(() => buildMonthGrid(cursor.year, cursor.month), [cursor]);

  const todayKey = getTodayKey();
  const todayStage = getDailyStageId(todayKey);

  if (!open) return null;

  const monthLabel = `${cursor.year}.${String(cursor.month + 1).padStart(2, "0")}`;
  const monthClears = grid.filter((d) => d.key && history[d.key]).length;
  const streakNow = computeCurrentStreak(history, todayKey, todayCleared);

  const canGoNext = (() => {
    const today = new Date();
    return (
      cursor.year < today.getFullYear() ||
      (cursor.year === today.getFullYear() && cursor.month < today.getMonth())
    );
  })();

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3 fade-in-soft"
      style={{ background: "var(--bg-overlay)" }}
    >
      <div
        className="w-full max-w-sm rounded-2xl px-5 py-5"
        style={{ background: "var(--bg-surface)", border: "1px solid var(--line)" }}
      >
        <div className="flex items-start justify-between">
          <div>
            <div
              className="text-[11px] uppercase tracking-[0.18em] font-bold"
              style={{ color: "var(--ink-mute)" }}
            >
              Daily Challenge
            </div>
            <div
              className="text-xl font-semibold"
              style={{ color: "var(--ink-1)" }}
            >
              {monthLabel}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="press-95 rounded-full px-3 py-1 text-xs font-medium"
            style={{
              background: "var(--bg-elevated)",
              color: "var(--ink-2)",
              border: "1px solid var(--line)",
            }}
          >
            닫기
          </button>
        </div>

        <div className="mt-3 flex items-center justify-between">
          <button
            type="button"
            className="press-95 px-2 py-1 rounded-full text-sm"
            onClick={() =>
              setCursor((c) =>
                c.month === 0
                  ? { year: c.year - 1, month: 11 }
                  : { year: c.year, month: c.month - 1 }
              )
            }
            style={{ color: "var(--ink-2)" }}
          >
            ‹
          </button>
          <div
            className="text-[11px] font-semibold tabular-nums flex items-center gap-1.5"
            style={{ color: "var(--ink-mute)" }}
          >
            {(() => {
              const tier = currentTier(streakNow);
              return (
                <>
                  이번 달 {monthClears}일 · 연속 {streakNow}일
                  {tier && (
                    <span aria-hidden style={{ color: "var(--gold)" }}>
                      {tier.flair}
                    </span>
                  )}
                  {bestStreak > streakNow && (
                    <span style={{ color: "var(--ink-faint)" }}>
                      · 최고 {bestStreak}일
                    </span>
                  )}
                </>
              );
            })()}
          </div>
          <button
            type="button"
            disabled={!canGoNext}
            className="press-95 px-2 py-1 rounded-full text-sm disabled:opacity-30"
            onClick={() => {
              if (!canGoNext) return;
              setCursor((c) =>
                c.month === 11
                  ? { year: c.year + 1, month: 0 }
                  : { year: c.year, month: c.month + 1 }
              );
            }}
            style={{ color: "var(--ink-2)" }}
          >
            ›
          </button>
        </div>

        <div
          className="mt-3 grid grid-cols-7 gap-1 text-center text-[10px] font-semibold"
          style={{ color: "var(--ink-mute)" }}
        >
          {["일", "월", "화", "수", "목", "금", "토"].map((d) => (
            <div key={d} className="py-1">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {grid.map((cell, i) => {
            if (!cell.key) {
              return <div key={i} className="aspect-square" />;
            }
            const entry = history[cell.key];
            const isToday = cell.key === todayKey;
            const cleared = !!entry || (isToday && todayCleared);
            const stars = entry?.stars ?? 0;
            return (
              <div
                key={i}
                className="aspect-square rounded-md flex flex-col items-center justify-center text-[10px] font-semibold"
                style={{
                  background: cleared
                    ? "var(--accent-soft)"
                    : isToday
                    ? "var(--gold-soft)"
                    : "var(--bg-elevated)",
                  color: cleared
                    ? "var(--accent-soft-fg)"
                    : isToday
                    ? "var(--gold)"
                    : "var(--ink-mute)",
                  border: isToday
                    ? "1px solid var(--gold)"
                    : "1px solid var(--line-soft)",
                }}
              >
                <span className="tabular-nums">{cell.day}</span>
                {cleared && stars > 0 && (
                  <span
                    className="text-[8px] leading-none mt-0.5"
                    style={{ color: "var(--gold)" }}
                  >
                    {"★".repeat(stars)}
                  </span>
                )}
              </div>
            );
          })}
        </div>

        <div
          className="mt-4 rounded-xl px-3 py-2 text-[11px]"
          style={{
            background: "var(--bg-elevated)",
            color: "var(--ink-3)",
            border: "1px solid var(--line)",
          }}
        >
          오늘의 퍼즐 · 스테이지 {todayStage}
        </div>
      </div>
    </div>
  );
}

type DayCell = { key: string | null; day: number };

function buildMonthGrid(year: number, month: number): DayCell[] {
  const first = new Date(year, month, 1);
  const startDay = first.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: DayCell[] = [];
  for (let i = 0; i < startDay; i++) cells.push({ key: null, day: 0 });
  for (let d = 1; d <= daysInMonth; d++) {
    const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(
      2,
      "0"
    )}`;
    cells.push({ key, day: d });
  }
  // Pad to a multiple of 7 for tidy grid.
  while (cells.length % 7 !== 0) cells.push({ key: null, day: 0 });
  return cells;
}

function computeCurrentStreak(
  history: DailyHistory,
  todayKey: string,
  todayCleared: boolean
): number {
  let streak = 0;
  const cursor = new Date(todayKey);
  if (todayCleared || history[todayKey]) {
    streak += 1;
  } else {
    // Start from yesterday.
    cursor.setDate(cursor.getDate() - 1);
  }
  while (true) {
    cursor.setDate(cursor.getDate() - 1);
    const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}-${String(
      cursor.getDate()
    ).padStart(2, "0")}`;
    if (history[key]) {
      streak += 1;
      if (streak > 365) return streak;
    } else {
      break;
    }
  }
  return streak;
}
