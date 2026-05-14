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
import { getStageImageDataUrl, getStagePalette } from "@/lib/stageImage";
import { getDailyStageId } from "@/lib/daily";
import TutorialTip from "./TutorialTip";
import SettingsSheet from "./SettingsSheet";
import AchievementsRow from "./AchievementsRow";
import DailyBanner from "./DailyBanner";

type Props = {
  onPlay: (stage: Stage) => void;
};

export default function StageSelect({ onPlay }: Props) {
  const [progress, setProgress] = useState<Progress | null>(null);
  const [resumeStageId, setResumeStageId] = useState<number | null>(null);
  const [dailyStageId, setDailyStageId] = useState<number | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const toastTimerRef = useRef<number | null>(null);
  const chapterRefs = useRef<Map<number, HTMLElement | null>>(new Map());

  const showToast = (msg: string) => {
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    setToast(msg);
    toastTimerRef.current = window.setTimeout(() => {
      setToast(null);
      toastTimerRef.current = null;
    }, 1800);
  };

  useEffect(() => {
    // Hydrate stage-select state from localStorage on mount (client-only).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setProgress(loadProgress());
    setResumeStageId(peekSavedStageId());
    setDailyStageId(getDailyStageId());
  }, []);

  const clearedCount = useMemo(() => {
    if (!progress) return 0;
    return Object.keys(progress.cleared).length;
  }, [progress]);

  // The first stage that's unlocked but still uncleared — the natural "next".
  const nextStageId = useMemo<number | null>(() => {
    if (!progress) return null;
    const limit = Math.min(TOTAL_STAGE_COUNT, progress.unlockedUpTo);
    let found: number | null = null;
    for (let id = 1; id <= limit; id++) {
      if (!progress.cleared[id]) {
        found = id;
        break;
      }
    }
    return found;
  }, [progress]);

  // Show floating "to top" button once the player has scrolled past the
  // initial viewport-worth of chapters.
  useEffect(() => {
    const onScroll = () => setShowScrollTop(window.scrollY > 640);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Once we know progress, scroll to the chapter holding the latest unlocked stage.
  useEffect(() => {
    if (!progress) return;
    const target = resumeStageId ?? nextStageId ?? progress.unlockedUpTo;
    const chId = chapterIdForStage(target);
    const el = chapterRefs.current.get(chId);
    if (el) el.scrollIntoView({ block: "start", behavior: "auto" });
  }, [progress, resumeStageId, nextStageId]);

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
            {clearedCount} 스테이지 클리어 · 1만+ 스테이지 ∞
          </p>
        </div>
        <button
          type="button"
          onClick={() => setSettingsOpen(true)}
          aria-label="설정"
          className="rounded-full bg-white shadow-sm border border-amber-200 w-10 h-10 flex items-center justify-center text-amber-900"
        >
          <span className="text-lg" aria-hidden>
            ⚙
          </span>
        </button>
      </header>

      <DailyBanner onPlay={onPlay} />

      <AchievementsRow progress={progress} />

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
          const starsInChapter = progress
            ? stagesInChapter.reduce(
                (sum, s) => sum + (progress.bestStars[s.id] ?? 0),
                0
              )
            : 0;
          const chapterFullyCleared =
            clearedInChapter === stagesInChapter.length;
          return (
            <section
              key={ch.id}
              ref={(el) => {
                chapterRefs.current.set(ch.id, el);
              }}
              className="scroll-mt-3 chapter-section"
            >
              <header className="flex items-end justify-between mb-2 px-0.5">
                <div>
                  <div className="text-[11px] font-bold tracking-wide text-amber-700/80 uppercase">
                    Chapter {ch.id}
                    {chapterFullyCleared && " ✓"}
                  </div>
                  <div className="text-lg font-bold text-amber-900 leading-tight">
                    {ch.title}
                  </div>
                  <div className="text-[11px] text-amber-800/70">
                    {ch.subtitle}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[11px] font-semibold tabular-nums text-amber-700/80">
                    {clearedInChapter} / {stagesInChapter.length}
                  </div>
                  <div className="text-[11px] font-semibold tabular-nums text-amber-700/60">
                    ★ {starsInChapter} / {stagesInChapter.length * 3}
                  </div>
                </div>
              </header>
              <div className="grid grid-cols-3 gap-3">
                {stagesInChapter.map((s) => (
                  <StageCard
                    key={s.id}
                    stage={s}
                    progress={progress}
                    isResume={resumeStageId === s.id}
                    isNext={nextStageId === s.id}
                    isDaily={dailyStageId === s.id}
                    onPlay={onPlay}
                    onLockedTap={(stageId) => {
                      const unlockedUpTo = progress?.unlockedUpTo ?? 1;
                      showToast(`스테이지 ${unlockedUpTo}을(를) 먼저 클리어해 주세요`);
                      void stageId;
                    }}
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

      {toast && (
        <div className="fixed inset-x-0 bottom-6 z-40 flex justify-center px-4 pointer-events-none">
          <div className="rounded-full bg-amber-900/90 text-white text-sm px-4 py-2 shadow-lg">
            {toast}
          </div>
        </div>
      )}

      {showScrollTop && (
        <button
          type="button"
          aria-label="맨 위로"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="fixed bottom-4 right-4 z-30 w-11 h-11 rounded-full bg-amber-700 text-white text-lg shadow-lg active:scale-95 transition-transform"
          style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        >
          ↑
        </button>
      )}
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
  isNext,
  isDaily,
  onPlay,
  onLockedTap,
}: {
  stage: Stage;
  progress: Progress | null;
  isResume: boolean;
  isNext: boolean;
  isDaily: boolean;
  onPlay: (s: Stage) => void;
  onLockedTap: (stageId: number) => void;
}) {
  const unlocked = progress ? stage.id <= progress.unlockedUpTo : stage.id === 1;
  const cleared = progress ? !!progress.cleared[stage.id] : false;
  const best = progress?.bestTimes[stage.id];
  const stars = progress?.bestStars[stage.id] ?? 0;
  const [imgLoaded, setImgLoaded] = useState(false);

  const img = getStageImageDataUrl(stage.id);
  const palette = getStagePalette(stage.id);

  return (
    <button
      type="button"
      onClick={() => (unlocked ? onPlay(stage) : onLockedTap(stage.id))}
      className={`relative aspect-square rounded-xl overflow-hidden text-left shadow-sm border ${
        stage.isBoss
          ? "border-rose-500"
          : cleared
          ? "border-emerald-500"
          : "border-amber-200"
      } ${unlocked ? "active:scale-[0.97] transition-transform" : "opacity-60"} ${
        isNext && !isResume
          ? "ring-2 ring-amber-500 ring-offset-2 ring-offset-amber-50"
          : ""
      }`}
    >
      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(135deg, ${palette[1]} 0%, ${palette[2]} 100%)`,
        }}
      />
      {/* eslint-disable-next-line @next/next/no-img-element -- cross-origin picsum URLs aren't friendly to next/image without remote patterns */}
      <img
        src={img}
        alt=""
        loading="lazy"
        decoding="async"
        onLoad={() => setImgLoaded(true)}
        className="absolute inset-0 h-full w-full object-cover transition-opacity duration-500"
        style={{
          opacity: imgLoaded ? 1 : 0,
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
      {isDaily && !isResume && (
        <div className="absolute top-1 left-1 rounded-full bg-amber-500 text-white text-[10px] px-1.5 py-0.5 font-bold shadow">
          오늘
        </div>
      )}
    </button>
  );
}

function formatTime(ms: number): string {
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}
