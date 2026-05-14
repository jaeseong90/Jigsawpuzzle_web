"use client";

import { useEffect, useState } from "react";
import { getStageImageDataUrl } from "@/lib/stageImage";
import { loadDaily, type DailyRecord } from "@/lib/daily";
import { getStage, type Stage } from "@/data/stages";

type Props = {
  onPlay: (stage: Stage) => void;
};

export default function DailyBanner({ onPlay }: Props) {
  const [record, setRecord] = useState<DailyRecord | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRecord(loadDaily());
  }, []);

  if (!record) return null;
  const stage = getStage(record.stageId);
  if (!stage) return null;

  const thumb = getStageImageDataUrl(record.stageId);

  return (
    <button
      type="button"
      onClick={() => onPlay(stage)}
      className="mt-4 relative w-full overflow-hidden rounded-2xl shadow-sm border border-amber-200 active:scale-[0.99] transition-transform"
    >
      <div className="flex items-stretch">
        <div className="relative w-20 h-20 flex-none">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={thumb}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
            loading="lazy"
            decoding="async"
          />
        </div>
        <div className="flex flex-1 items-center justify-between px-3 py-2 bg-gradient-to-r from-amber-700 to-amber-600 text-white">
          <div className="text-left">
            <div className="text-[10px] font-bold uppercase tracking-wider opacity-80">
              오늘의 도전
            </div>
            <div className="text-base font-bold leading-tight">
              스테이지 {record.stageId}
              {stage.isBoss && " 👑"}
            </div>
            <div className="mt-0.5 text-[11px] opacity-90 tabular-nums">
              {record.cleared
                ? `✓ 클리어 · ${formatTime(record.durationMs ?? 0)}${record.stars ? ` · ${"★".repeat(record.stars)}` : ""}`
                : record.streak > 0
                ? `🔥 ${record.streak}일 연속`
                : "도전!"}
            </div>
          </div>
          <div className="text-2xl" aria-hidden>
            ▶
          </div>
        </div>
      </div>
    </button>
  );
}

function formatTime(ms: number): string {
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}
