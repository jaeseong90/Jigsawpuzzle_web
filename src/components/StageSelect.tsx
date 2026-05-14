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
import { listSavedGames } from "@/lib/savedGame";
import { getStageImageDataUrl } from "@/lib/stageImage";
import { getDailyStageId } from "@/lib/daily";
import TutorialTip from "./TutorialTip";
import SettingsSheet from "./SettingsSheet";
import DailyBanner from "./DailyBanner";
import LevelChip from "./LevelChip";
import PhotoGallery from "./PhotoGallery";
import PersonalPhotoPicker from "./PersonalPhotoPicker";
import InProgressSheet from "./InProgressSheet";

type Props = {
  progressOverride?: Progress | null;
  onPlay: (stage: Stage) => void;
  onPersonal: (opts: {
    imageSrc: string;
    rows: number;
    cols: number;
    rotate: boolean;
  }) => void;
};

export default function StageSelect({
  progressOverride,
  onPlay,
  onPersonal,
}: Props) {
  const [progress, setProgress] = useState<Progress | null>(progressOverride ?? null);
  const [resumeStageIds, setResumeStageIds] = useState<number[]>([]);
  const [dailyStageId, setDailyStageId] = useState<number | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [personalOpen, setPersonalOpen] = useState(false);
  const [inProgressOpen, setInProgressOpen] = useState(false);
  const resumeStageId = resumeStageIds[0] ?? null;
  const extraInProgress = Math.max(0, resumeStageIds.length - 1);
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
    if (progressOverride !== undefined) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setProgress(progressOverride);
    } else {
      setProgress(loadProgress());
    }
    setResumeStageIds(listSavedGames().map((s) => s.stageId));
    setDailyStageId(getDailyStageId());
  }, [progressOverride]);

  const clearedCount = useMemo(() => {
    if (!progress) return 0;
    return Object.keys(progress.cleared).length;
  }, [progress]);

  const totalStarsEarned = useMemo(() => {
    if (!progress) return 0;
    return Object.values(progress.bestStars).reduce((a, b) => a + b, 0);
  }, [progress]);

  const nextStageId = useMemo<number | null>(() => {
    if (!progress) return null;
    const limit = Math.min(TOTAL_STAGE_COUNT, progress.unlockedUpTo);
    for (let id = 1; id <= limit; id++) {
      if (!progress.cleared[id]) return id;
    }
    return null;
  }, [progress]);

  useEffect(() => {
    const onScroll = () => setShowScrollTop(window.scrollY > 640);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!progress) return;
    const target = resumeStageId ?? nextStageId ?? progress.unlockedUpTo;
    const chId = chapterIdForStage(target);
    const el = chapterRefs.current.get(chId);
    if (el) el.scrollIntoView({ block: "start", behavior: "auto" });
  }, [progress, resumeStageId, nextStageId]);

  const handleResetProgress = () => {
    setProgress(emptyProgress());
    setResumeStageIds([]);
  };

  return (
    <main
      className="flex min-h-[100dvh] flex-col px-4 pt-4 pb-8"
      style={{ background: "var(--bg-app)" }}
    >
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <BrandMark />
          <div className="min-w-0">
            <div
              className="text-[10px] tracking-[0.32em] font-bold"
              style={{ color: "var(--ink-mute)" }}
            >
              TESSERA
            </div>
            <h1
              className="mt-0.5 text-[20px] font-semibold leading-tight"
              style={{ color: "var(--ink-1)", letterSpacing: "-0.01em" }}
            >
              조각의 시간
            </h1>
            <p
              className="mt-0.5 text-[11px] tabular-nums"
              style={{ color: "var(--ink-mute)" }}
            >
              {clearedCount} 클리어 · ★ {totalStarsEarned}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPersonalOpen(true)}
            aria-label="내 사진"
            className="press-95 w-10 h-10 rounded-full flex items-center justify-center"
            style={{
              background: "var(--accent)",
              color: "var(--accent-fg)",
              border: "1px solid var(--accent)",
            }}
          >
            <span aria-hidden style={{ fontSize: 18, lineHeight: 1 }}>
              ＋
            </span>
          </button>
          <button
            type="button"
            onClick={() => setGalleryOpen(true)}
            aria-label="갤러리"
            className="press-95 w-10 h-10 rounded-full flex items-center justify-center"
            style={{
              background: "var(--bg-surface)",
              color: "var(--ink-2)",
              border: "1px solid var(--line)",
            }}
          >
            <span aria-hidden style={{ fontSize: 16 }}>
              ◧
            </span>
          </button>
          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            aria-label="설정"
            className="press-95 w-10 h-10 rounded-full flex items-center justify-center"
            style={{
              background: "var(--bg-surface)",
              color: "var(--ink-2)",
              border: "1px solid var(--line)",
            }}
          >
            <span aria-hidden style={{ fontSize: 16 }}>
              ⚙
            </span>
          </button>
        </div>
      </header>

      <div className="mt-3">
        <LevelChip progress={progress} />
      </div>

      <DailyBanner onPlay={onPlay} />

      {resumeStageId != null && (
        <ResumeBanner
          stageId={resumeStageId}
          extra={extraInProgress}
          onResume={() => {
            const stage = STAGES.find((s) => s.id === resumeStageId);
            if (stage) onPlay(stage);
          }}
          onOpenList={
            extraInProgress > 0 ? () => setInProgressOpen(true) : undefined
          }
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
          const chapterMastered =
            chapterFullyCleared &&
            starsInChapter === stagesInChapter.length * 3;
          return (
            <section
              key={ch.id}
              ref={(el) => {
                chapterRefs.current.set(ch.id, el);
              }}
              className="scroll-mt-3 chapter-section"
            >
              <header className="flex items-end justify-between mb-2 px-0.5">
                <div className="min-w-0">
                  <div
                    className="text-[10px] font-bold tracking-[0.18em] uppercase flex items-center gap-1.5"
                    style={{ color: "var(--ink-mute)" }}
                  >
                    Chapter {ch.id}
                    {chapterMastered && (
                      <span
                        className="rounded-sm px-1 py-0.5 text-[9px]"
                        style={{
                          background: "var(--gold-soft)",
                          color: "var(--gold)",
                          letterSpacing: "0.14em",
                        }}
                      >
                        MASTER
                      </span>
                    )}
                    {!chapterMastered && chapterFullyCleared && (
                      <span
                        className="rounded-sm px-1 py-0.5 text-[9px]"
                        style={{
                          background: "var(--success-soft)",
                          color: "var(--success)",
                          letterSpacing: "0.14em",
                        }}
                      >
                        CLEAR
                      </span>
                    )}
                  </div>
                  <div
                    className="text-lg font-semibold leading-tight"
                    style={{ color: "var(--ink-1)" }}
                  >
                    {ch.title}
                  </div>
                  <div
                    className="text-[11px]"
                    style={{ color: "var(--ink-mute)" }}
                  >
                    {ch.subtitle}
                  </div>
                </div>
                <div className="text-right">
                  <div
                    className="text-[11px] font-semibold tabular-nums"
                    style={{ color: "var(--ink-2)" }}
                  >
                    {clearedInChapter} / {stagesInChapter.length}
                  </div>
                  <div
                    className="text-[11px] font-semibold tabular-nums"
                    style={{ color: "var(--ink-mute)" }}
                  >
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
                      showToast(
                        `스테이지 ${unlockedUpTo}을(를) 먼저 클리어해 주세요`
                      );
                      void stageId;
                    }}
                  />
                ))}
              </div>
            </section>
          );
        })}
      </div>

      <p
        className="mt-8 text-center text-[10px] tracking-[0.28em] font-semibold"
        style={{ color: "var(--ink-mute)" }}
      >
        TESSERA · 끝없는 길
      </p>

      <TutorialTip />
      <SettingsSheet
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onResetProgress={handleResetProgress}
      />
      <PhotoGallery
        open={galleryOpen}
        onClose={() => setGalleryOpen(false)}
      />
      <PersonalPhotoPicker
        open={personalOpen}
        onClose={() => setPersonalOpen(false)}
        onStart={(opts) => {
          setPersonalOpen(false);
          onPersonal(opts);
        }}
      />
      <InProgressSheet
        open={inProgressOpen}
        onClose={() => setInProgressOpen(false)}
        onResume={(id) => {
          const stage = STAGES.find((s) => s.id === id);
          if (stage) onPlay(stage);
        }}
      />

      {toast && (
        <div className="fixed inset-x-0 bottom-6 z-40 flex justify-center px-4 pointer-events-none">
          <div
            className="rounded-full text-sm px-4 py-2 shadow-lg"
            style={{ background: "var(--ink-2)", color: "var(--bg-surface)" }}
          >
            {toast}
          </div>
        </div>
      )}

      {showScrollTop && (
        <button
          type="button"
          aria-label="맨 위로"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="press-95 fixed bottom-4 right-4 z-30 w-11 h-11 rounded-full shadow-lg"
          style={{
            background: "var(--accent)",
            color: "var(--accent-fg)",
            paddingBottom: "env(safe-area-inset-bottom)",
          }}
        >
          ↑
        </button>
      )}
    </main>
  );
}

function BrandMark() {
  // The 2x2 tessera glyph used in icon/manifest, scaled down for the header.
  return (
    <span
      aria-hidden
      className="flex items-center justify-center rounded-lg"
      style={{
        width: 40,
        height: 40,
        background: "var(--bg-surface)",
        border: "1px solid var(--line)",
      }}
    >
      <svg width="22" height="22" viewBox="0 0 64 64">
        <rect x="10" y="10" width="22" height="22" rx="3" fill="var(--accent)" />
        <rect
          x="34"
          y="10"
          width="22"
          height="22"
          rx="3"
          fill="none"
          stroke="var(--accent)"
          strokeWidth="2.2"
        />
        <rect
          x="10"
          y="34"
          width="22"
          height="22"
          rx="3"
          fill="none"
          stroke="var(--accent)"
          strokeWidth="2.2"
        />
        <rect x="34" y="34" width="22" height="22" rx="3" fill="var(--accent)" />
      </svg>
    </span>
  );
}

function ResumeBanner({
  stageId,
  extra,
  onResume,
  onOpenList,
}: {
  stageId: number;
  extra: number;
  onResume: () => void;
  onOpenList?: () => void;
}) {
  return (
    <div
      className="mt-3 flex items-stretch rounded-2xl overflow-hidden"
      style={{ background: "var(--accent)", color: "var(--accent-fg)" }}
    >
      <button
        type="button"
        onClick={onResume}
        className="press-95 flex-1 flex items-center justify-between px-4 py-3 text-left"
      >
        <div>
          <div className="text-[10px] tracking-[0.18em] uppercase font-bold opacity-80">
            Resume
          </div>
          <div className="text-base font-semibold">
            스테이지 {stageId} 이어하기
          </div>
        </div>
        <div className="text-xl" aria-hidden>
          ▶
        </div>
      </button>
      {onOpenList && extra > 0 && (
        <button
          type="button"
          onClick={onOpenList}
          aria-label={`다른 진행 ${extra}개 보기`}
          className="press-95 flex flex-col items-center justify-center px-4"
          style={{
            borderLeft: "1px solid rgba(255,255,255,0.25)",
          }}
        >
          <div className="text-[10px] tracking-[0.18em] font-bold opacity-80">
            +
          </div>
          <div className="text-base font-bold tabular-nums leading-tight">
            {extra}
          </div>
        </button>
      )}
    </div>
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
  const mastered = cleared && stars === 3;
  const [imgLoaded, setImgLoaded] = useState(false);

  const img = getStageImageDataUrl(stage.id);

  return (
    <button
      type="button"
      onClick={() => (unlocked ? onPlay(stage) : onLockedTap(stage.id))}
      className="press-95 relative aspect-square rounded-xl overflow-hidden text-left"
      style={{
        background: "var(--bg-elevated)",
        border: mastered
          ? "1.5px solid var(--gold)"
          : stage.isBoss
          ? "1.5px solid var(--danger)"
          : cleared
          ? "1.5px solid var(--success)"
          : "1px solid var(--line)",
        opacity: unlocked ? 1 : 0.55,
        boxShadow: isNext && !isResume
          ? "0 0 0 2px var(--accent), 0 0 0 4px var(--bg-app)"
          : "none",
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={img}
        alt=""
        loading="lazy"
        decoding="async"
        onLoad={() => setImgLoaded(true)}
        className="absolute inset-0 h-full w-full object-cover transition-opacity duration-500"
        style={{
          opacity: imgLoaded ? 1 : 0,
          filter: unlocked ? "none" : "grayscale(85%) brightness(0.7)",
        }}
      />
      <div
        className="absolute inset-x-0 bottom-0 px-1.5 pb-1 pt-3"
        style={{
          background:
            "linear-gradient(to top, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0) 100%)",
        }}
      >
        <div className="flex items-end justify-between text-white">
          <span className="text-xs font-bold tabular-nums">
            {String(stage.id).padStart(3, "0")}
          </span>
          {cleared && best != null && (
            <span className="text-[10px] font-medium tabular-nums opacity-90">
              {formatTime(best)}
            </span>
          )}
        </div>
        {cleared && (
          <div
            className="mt-0.5 text-[10px] leading-none"
            style={{ letterSpacing: "0.06em" }}
          >
            <span style={{ color: "#f6c870" }}>{"★".repeat(stars)}</span>
            <span style={{ color: "rgba(255,255,255,0.35)" }}>
              {"★".repeat(3 - stars)}
            </span>
          </div>
        )}
      </div>
      {!unlocked && (
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.25)" }}
        >
          <span style={{ color: "#fff", fontSize: 22 }} aria-hidden>
            ⨯
          </span>
        </div>
      )}
      {stage.isBoss && unlocked && !cleared && (
        <div
          className="absolute top-1 right-1 rounded-sm px-1.5 py-0.5 text-[9px] font-bold tracking-[0.14em]"
          style={{ background: "var(--danger)", color: "#fff" }}
        >
          BOSS
        </div>
      )}
      {mastered && (
        <div
          className="absolute top-1 right-1 rounded-sm px-1.5 py-0.5 text-[9px] font-bold tracking-[0.14em]"
          style={{ background: "var(--gold)", color: "#fff" }}
        >
          MASTER
        </div>
      )}
      {isResume && (
        <div
          className="absolute top-1 left-1 rounded-sm px-1.5 py-0.5 text-[9px] font-bold tracking-[0.14em]"
          style={{ background: "var(--accent)", color: "var(--accent-fg)" }}
        >
          RESUME
        </div>
      )}
      {isDaily && !isResume && (
        <div
          className="absolute top-1 left-1 rounded-sm px-1.5 py-0.5 text-[9px] font-bold tracking-[0.14em]"
          style={{ background: "var(--gold)", color: "#fff" }}
        >
          TODAY
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
