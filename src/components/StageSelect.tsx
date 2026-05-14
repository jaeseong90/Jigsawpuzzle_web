"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  CHAPTERS,
  STAGES,
  type Stage,
  TOTAL_STAGE_COUNT,
  chapterIdForStage,
} from "@/data/stages";
import { emptyProgress, loadProgress, type Progress } from "@/lib/progress";
import { peekSavedStageId } from "@/lib/savedGame";
import { getStageImageDataUrl } from "@/lib/stageImage";
import TutorialTip from "./TutorialTip";
import SettingsSheet from "./SettingsSheet";

type Props = {
  onPlay: (stage: Stage) => void;
};

export default function StageSelect({ onPlay }: Props) {
  const [progress, setProgress] = useState<Progress | null>(null);
  const [resumeStageId, setResumeStageId] = useState<number | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const chapterRefs = useRef<Map<number, HTMLElement | null>>(new Map());

  useEffect(() => {
    // Hydrate stage-select state from localStorage on mount (client-only).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setProgress(loadProgress());
    setResumeStageId(peekSavedStageId());
  }, []);

  // Once we know progress, scroll to the chapter holding the latest unlocked stage.
  useEffect(() => {
    if (!progress) return;
    const target = resumeStageId ?? progress.unlockedUpTo;
    const chId = chapterIdForStage(target);
    const el = chapterRefs.current.get(chId);
    if (el) el.scrollIntoView({ block: "start", behavior: "auto" });
  }, [progress, resumeStageId]);

  const clearedCount = useMemo(() => {
    if (!progress) return 0;
    return Object.keys(progress.cleared).length;
  }, [progress]);

  const handleResetProgress = () => {
    setProgress(emptyProgress());
    setResumeStageId(null);
  };

  return (
    <main className="flex min-h-[100dvh] flex-col px-4 pt-5 pb-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-amber-900">직소퍼즐</h1>
          <p className="mt-0.5 text-xs text-amber-800/80">
            {clearedCount} / {TOTAL_STAGE_COUNT} 스테이지 완료
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ProgressRing total={TOTAL_STAGE_COUNT} done={clearedCount} />
          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            aria-label="설정"
            className="rounded-full bg-white shadow-sm border border-amber-200 w-9 h-9 flex items-center justify-center text-amber-900"
          >
            <span className="text-base" aria-hidden>
              ⚙
            </span>
          </button>
        </div>
      </header>

      {resumeStageId != null && (
        <ResumeBanner
          stageId={resumeStageId}
          onResume={() => {
            const stage = STAGES.find((s) => s.id === resumeStageId);
            if (stage) onPlay(stage);
          }}
        />
      )}

      <div className="mt-5 space-y-6">
        {CHAPTERS.map((ch) => {
          const stagesInChapter = STAGES.filter(
            (s) => s.id >= ch.range[0] && s.id <= ch.range[1]
          );
          const clearedInChapter = progress
            ? stagesInChapter.filter((s) => progress.cleared[s.id]).length
            : 0;
          return (
            <section
              key={ch.id}
              ref={(el) => {
                chapterRefs.current.set(ch.id, el);
              }}
              className="scroll-mt-3"
            >
              <header className="flex items-end justify-between mb-2 px-0.5">
                <div>
                  <div className="text-[11px] font-bold tracking-wide text-amber-700/80 uppercase">
                    Chapter {ch.id}
                  </div>
                  <div className="text-lg font-bold text-amber-900 leading-tight">
                    {ch.title}
                  </div>
                  <div className="text-[11px] text-amber-800/70">
                    {ch.subtitle}
                  </div>
                </div>
                <div className="text-[11px] font-semibold tabular-nums text-amber-700/80">
                  {clearedInChapter} / {stagesInChapter.length}
                </div>
              </header>
              <div className="grid grid-cols-3 gap-3">
                {stagesInChapter.map((s) => (
                  <StageCard
                    key={s.id}
                    stage={s}
                    progress={progress}
                    isResume={resumeStageId === s.id}
                    onPlay={onPlay}
                  />
                ))}
              </div>
            </section>
          );
        })}
      </div>

      <p className="mt-8 text-center text-[11px] text-amber-700/70">
        스테이지를 차례로 클리어하면 다음 스테이지가 열려요. 10단위는 보스 ✨
      </p>

      <TutorialTip />
      <SettingsSheet
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onResetProgress={handleResetProgress}
      />
    </main>
  );
}

function ResumeBanner({
  stageId,
  onResume,
}: {
  stageId: number;
  onResume: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onResume}
      className="mt-4 flex items-center justify-between rounded-2xl bg-amber-700 text-white px-4 py-3 shadow-sm active:scale-[0.99] transition-transform"
    >
      <div className="text-left">
        <div className="text-xs opacity-80">진행 중</div>
        <div className="text-base font-bold">스테이지 {stageId} 이어하기</div>
      </div>
      <div className="text-2xl" aria-hidden>
        ▶
      </div>
    </button>
  );
}

function StageCard({
  stage,
  progress,
  isResume,
  onPlay,
}: {
  stage: Stage;
  progress: Progress | null;
  isResume: boolean;
  onPlay: (s: Stage) => void;
}) {
  const unlocked = progress ? stage.id <= progress.unlockedUpTo : stage.id === 1;
  const cleared = progress ? !!progress.cleared[stage.id] : false;
  const best = progress?.bestTimes[stage.id];
  const stars = progress?.bestStars[stage.id] ?? 0;

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
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/65 to-transparent px-1.5 pb-1.5 pt-3">
        <div className="flex items-end justify-between">
          <span className="text-white text-xs font-bold tabular-nums">
            {stage.isBoss && "👑 "}
            {stage.id}
          </span>
          {cleared && best != null && (
            <span className="text-white text-[10px] font-medium tabular-nums">
              {formatTime(best)}
            </span>
          )}
        </div>
        {cleared && (
          <div className="mt-0.5 flex gap-[1px] text-[10px] leading-none">
            {[1, 2, 3].map((n) => (
              <span
                key={n}
                className={n <= stars ? "text-amber-300" : "text-white/30"}
                aria-hidden
              >
                ★
              </span>
            ))}
          </div>
        )}
      </div>
      {!unlocked && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/20">
          <span className="text-white text-2xl drop-shadow">🔒</span>
        </div>
      )}
      {stage.isBoss && unlocked && !cleared && (
        <div className="absolute top-1 right-1 rounded-full bg-rose-600 text-white text-[10px] px-1.5 py-0.5 font-bold shadow">
          BOSS
        </div>
      )}
      {isResume && (
        <div className="absolute top-1 left-1 rounded-full bg-amber-700 text-white text-[10px] px-1.5 py-0.5 font-bold shadow">
          이어하기
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
