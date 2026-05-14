"use client";

import { useEffect, useMemo, useState } from "react";
import { STAGES, type Stage, TOTAL_STAGE_COUNT } from "@/data/stages";
import { loadProgress, type Progress } from "@/lib/progress";
import { getStageImageDataUrl } from "@/lib/stageImage";

type Props = {
  onPlay: (stage: Stage) => void;
};

export default function StageSelect({ onPlay }: Props) {
  const [progress, setProgress] = useState<Progress | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setProgress(loadProgress());
  }, []);

  const clearedCount = useMemo(() => {
    if (!progress) return 0;
    return Object.keys(progress.cleared).length;
  }, [progress]);

  return (
    <main className="flex min-h-[100dvh] flex-col px-4 pt-5 pb-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-amber-900">직소퍼즐</h1>
          <p className="mt-0.5 text-xs text-amber-800/80">
            {clearedCount} / {TOTAL_STAGE_COUNT} 스테이지 완료
          </p>
        </div>
        <ProgressRing total={TOTAL_STAGE_COUNT} done={clearedCount} />
      </header>

      <div className="mt-5 grid grid-cols-3 gap-3">
        {STAGES.map((s) => (
          <StageCard
            key={s.id}
            stage={s}
            progress={progress}
            onPlay={onPlay}
          />
        ))}
      </div>

      <p className="mt-8 text-center text-[11px] text-amber-700/70">
        스테이지를 차례로 클리어하면 다음 스테이지가 열려요. 10단위는 보스 ✨
      </p>
    </main>
  );
}

function StageCard({
  stage,
  progress,
  onPlay,
}: {
  stage: Stage;
  progress: Progress | null;
  onPlay: (s: Stage) => void;
}) {
  const unlocked = progress ? stage.id <= progress.unlockedUpTo : stage.id === 1;
  const cleared = progress ? !!progress.cleared[stage.id] : false;
  const best = progress?.bestTimes[stage.id];

  const img = getStageImageDataUrl(stage.id);

  return (
    <button
      type="button"
      disabled={!unlocked}
      onClick={() => onPlay(stage)}
      className={`relative aspect-square rounded-xl overflow-hidden text-left shadow-sm border ${
        stage.isBoss
          ? "border-rose-500"
          : cleared
          ? "border-emerald-500"
          : "border-amber-200"
      } ${unlocked ? "active:scale-[0.97] transition-transform" : "opacity-60"}`}
    >
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `url(${img})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          filter: unlocked ? "none" : "grayscale(80%) brightness(0.75)",
        }}
      />
      <div className="absolute inset-0 bg-black/0" />
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent px-2 py-1.5">
        <div className="flex items-center justify-between">
          <span className="text-white text-xs font-bold tabular-nums">
            {stage.isBoss && "👑 "}
            {stage.id}
          </span>
          {cleared && (
            <span className="text-white text-[10px] font-medium">
              ★ {best != null ? formatTime(best) : ""}
            </span>
          )}
        </div>
      </div>
      {!unlocked && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-white text-2xl drop-shadow">🔒</span>
        </div>
      )}
      {stage.isBoss && unlocked && !cleared && (
        <div className="absolute top-1 right-1 rounded-full bg-rose-600 text-white text-[10px] px-1.5 py-0.5 font-bold shadow">
          BOSS
        </div>
      )}
    </button>
  );
}

function ProgressRing({ total, done }: { total: number; done: number }) {
  const r = 18;
  const c = 2 * Math.PI * r;
  const pct = total > 0 ? done / total : 0;
  const offset = c * (1 - pct);
  return (
    <div className="relative w-12 h-12">
      <svg viewBox="0 0 48 48" className="w-full h-full -rotate-90">
        <circle cx="24" cy="24" r={r} fill="none" stroke="#fde68a" strokeWidth="4" />
        <circle
          cx="24"
          cy="24"
          r={r}
          fill="none"
          stroke="#b45309"
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-amber-900 tabular-nums">
        {Math.round(pct * 100)}%
      </div>
    </div>
  );
}

function formatTime(ms: number): string {
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}
