"use client";

import { useEffect, useMemo, useState } from "react";
import { getStageImageDataUrl, THUMB_SIZE } from "@/lib/stageImage";
import { getTodayKey, loadDaily, type DailyRecord } from "@/lib/daily";
import { loadDailyHistory } from "@/lib/dailyHistory";
import { currentTier } from "@/lib/dailyRewards";
import { getStage, type Stage } from "@/data/stages";
import DailyCalendar from "./DailyCalendar";

type Props = {
  onPlay: (stage: Stage) => void;
};

export default function DailyBanner({ onPlay }: Props) {
  const [record, setRecord] = useState<DailyRecord | null>(null);
  const [calendarOpen, setCalendarOpen] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRecord(loadDaily());
  }, []);

  // Past-7-days strip — most recent day (today) is rightmost. Each cell
  // reads from dailyHistory; today's own state comes from the live daily
  // record so it updates the moment the player solves.
  const last7 = useMemo(() => {
    if (!record) return [];
    const todayKey = getTodayKey();
    const history = loadDailyHistory();
    const cells: Array<{ key: string; cleared: boolean; stars: number; isToday: boolean }> = [];
    const today = new Date(todayKey);
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
        d.getDate()
      ).padStart(2, "0")}`;
      const isToday = key === todayKey;
      const entry = history[key];
      const cleared = isToday ? record.cleared : !!entry;
      const stars = isToday ? record.stars ?? 0 : entry?.stars ?? 0;
      cells.push({ key, cleared, stars, isToday });
    }
    return cells;
  }, [record]);

  if (!record) return null;
  const stage = getStage(record.stageId);
  if (!stage) return null;

  const thumb = getStageImageDataUrl(record.stageId, THUMB_SIZE);
  const tier = currentTier(record.streak);

  return (
    <>
      <div
        className="mt-3 relative overflow-hidden rounded-2xl"
        style={{
          background: "var(--bg-surface)",
          border: "1px solid var(--line)",
        }}
      >
        <div className="flex items-stretch">
          <div className="relative w-20 flex-none">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={thumb}
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
              loading="lazy"
              decoding="async"
            />
          </div>
          <button
            type="button"
            onClick={() => onPlay(stage)}
            className="press-95 flex flex-1 items-center justify-between px-3 py-3 text-left"
            style={{ color: "var(--ink-1)" }}
          >
            <div>
              <div
                className="text-[10px] font-bold tracking-[0.18em] uppercase"
                style={{ color: "var(--gold)" }}
              >
                Daily · 오늘의 도전
              </div>
              <div className="text-base font-semibold leading-tight">
                스테이지 {record.stageId}
                {stage.isBoss && (
                  <span
                    className="ml-1 text-[10px] tracking-[0.14em]"
                    style={{ color: "var(--danger)" }}
                  >
                    BOSS
                  </span>
                )}
              </div>
              <div
                className="mt-0.5 text-[11px] tabular-nums flex items-center gap-1.5"
                style={{ color: "var(--ink-mute)" }}
              >
                {record.cleared ? (
                  <>
                    완료 · {formatTime(record.durationMs ?? 0)}
                    {record.stars ? ` · ${"★".repeat(record.stars)}` : ""}
                  </>
                ) : record.streak > 0 ? (
                  <>연속 {record.streak}일째</>
                ) : (
                  "오늘의 그림"
                )}
                {tier && record.streak > 0 && (
                  <span
                    className="streak-chip inline-flex items-center gap-0.5 rounded-full px-1.5 py-[1px] font-semibold tabular-nums"
                    style={{
                      background: "var(--gold-soft)",
                      color: "var(--gold)",
                      fontSize: "10px",
                    }}
                  >
                    <span aria-hidden style={{ fontSize: "11px" }}>
                      {tier.flair}
                    </span>
                    {record.streak}
                  </span>
                )}
              </div>
            </div>
            <div
              className="text-xl"
              aria-hidden
              style={{ color: "var(--ink-mute)" }}
            >
              ▶
            </div>
          </button>
          <button
            type="button"
            onClick={() => setCalendarOpen(true)}
            aria-label="지난 7일 캘린더"
            className="press-95 flex flex-col items-center justify-center gap-1 px-3"
            style={{
              borderLeft: "1px solid var(--line)",
              color: "var(--ink-2)",
              minWidth: 84,
            }}
          >
            <div
              className="text-[9px] tracking-[0.14em] font-bold uppercase"
              style={{ color: "var(--ink-mute)" }}
            >
              7 DAYS
            </div>
            <div className="flex items-end gap-[3px]">
              {last7.map((c) => (
                <div
                  key={c.key}
                  aria-hidden
                  style={{
                    width: 6,
                    height: c.cleared ? 14 : 6,
                    borderRadius: 9999,
                    background: c.cleared
                      ? "var(--gold)"
                      : c.isToday
                      ? "var(--accent-soft)"
                      : "var(--bg-elevated)",
                    border: c.isToday
                      ? "1px solid var(--gold)"
                      : "1px solid var(--line-soft)",
                  }}
                />
              ))}
            </div>
          </button>
        </div>
      </div>

      <DailyCalendar open={calendarOpen} onClose={() => setCalendarOpen(false)} />
    </>
  );
}

function formatTime(ms: number): string {
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}
