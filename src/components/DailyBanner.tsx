"use client";

import { useEffect, useState } from "react";
import { getStageImageDataUrl } from "@/lib/stageImage";
import { loadDaily, type DailyRecord } from "@/lib/daily";
import { getStage, type Stage } from "@/data/stages";
import DailyCalendar from "./DailyCalendar";

type Props = {
  onSelect: (stage: Stage) => void;
};

export default function DailyBanner({ onSelect }: Props) {
  const [record, setRecord] = useState<DailyRecord | null>(null);
  const [calendarOpen, setCalendarOpen] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRecord(loadDaily());
  }, []);

  if (!record) return null;
  const stage = getStage(record.stageId);
  if (!stage) return null;

  const thumb = getStageImageDataUrl(record.stageId);

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
            onClick={() => onSelect(stage)}
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
                className="mt-0.5 text-[11px] tabular-nums"
                style={{ color: "var(--ink-mute)" }}
              >
                {record.cleared
                  ? `완료 · ${formatTime(record.durationMs ?? 0)}${
                      record.stars
                        ? ` · ${"★".repeat(record.stars)}`
                        : ""
                    }`
                  : record.streak > 0
                  ? `연속 ${record.streak}일째`
                  : "오늘의 그림"}
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
            aria-label="일일 캘린더"
            className="press-95 px-3 flex items-center justify-center"
            style={{
              borderLeft: "1px solid var(--line)",
              color: "var(--ink-2)",
            }}
          >
            <span aria-hidden style={{ fontSize: 16 }}>
              ▦
            </span>
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
