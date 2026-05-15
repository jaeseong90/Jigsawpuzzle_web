"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  CHAPTERS,
  STAGES,
  type Stage,
  TOTAL_STAGE_COUNT,
  chapterIdForStage,
  type Chapter,
} from "@/data/stages";
import { emptyProgress, loadProgress, type Progress } from "@/lib/progress";
import { listSavedGames } from "@/lib/savedGame";
import { getStageImageDataUrl, THUMB_SIZE } from "@/lib/stageImage";
import { getDailyStageId } from "@/lib/daily";
import dynamic from "next/dynamic";
import TutorialTip from "./TutorialTip";
import DailyBanner from "./DailyBanner";
import LevelChip from "./LevelChip";

// Modals/overlays are only mounted when the player opens them, so defer
// their bundle splits to keep first-paint quick on the home shelf.
const SettingsSheet = dynamic(() => import("./SettingsSheet"), { ssr: false });
const PhotoGallery = dynamic(() => import("./PhotoGallery"), { ssr: false });
const StatsScreen = dynamic(() => import("./StatsScreen"), { ssr: false });
const PersonalPhotoPicker = dynamic(() => import("./PersonalPhotoPicker"), {
  ssr: false,
});
const InProgressSheet = dynamic(() => import("./InProgressSheet"), {
  ssr: false,
});

type Props = {
  progressOverride?: Progress | null;
  onPlay: (stage: Stage) => void;
  onPersonal: (opts: {
    imageSrc: string;
    rows: number;
    cols: number;
    rotate: boolean;
    photoId: string;
  }) => void;
  onZen?: () => void;
  zenAvailable?: boolean;
};

export default function StageSelect({
  progressOverride,
  onPlay,
  onPersonal,
  onZen,
  zenAvailable,
}: Props) {
  const [progress, setProgress] = useState<Progress | null>(progressOverride ?? null);
  const [resumeStageIds, setResumeStageIds] = useState<number[]>([]);
  const [dailyStageId, setDailyStageId] = useState<number | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [statsOpen, setStatsOpen] = useState(false);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [personalOpen, setPersonalOpen] = useState(false);
  const [inProgressOpen, setInProgressOpen] = useState(false);
  const resumeStageId = resumeStageIds[0] ?? null;
  const extraInProgress = Math.max(0, resumeStageIds.length - 1);
  const [toast, setToast] = useState<string | null>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const toastTimerRef = useRef<number | null>(null);
  const chapterRefs = useRef<Map<number, HTMLElement | null>>(new Map());
  // Only one chapter is open at a time — the home screen reads like a
  // shelf of chapter "worlds" rather than a 999-stage wall. Default to
  // chapter 1 immediately so a fresh open doesn't flash an all-collapsed
  // shelf before the progress-aware effect picks the right one.
  const [openChapterId, setOpenChapterId] = useState<number | null>(1);

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

  // Track whether we've already auto-picked the chapter for this mount —
  // user-initiated toggles after that should stick instead of being
  // overwritten when progress changes (e.g., after a clear).
  const autoPickedRef = useRef(false);
  const stageRefs = useRef<Map<number, HTMLElement | null>>(new Map());
  useEffect(() => {
    if (!progress) return;
    const target = resumeStageId ?? nextStageId ?? progress.unlockedUpTo;
    const chId = chapterIdForStage(target);
    if (!autoPickedRef.current) {
      setOpenChapterId(chId);
      autoPickedRef.current = true;
    }
    // Defer the scroll one frame so the expanded chapter grid mounts
    // first; otherwise we'd target the (still-collapsed) header instead
    // of the active stage tile inside it.
    requestAnimationFrame(() => {
      const stageEl = stageRefs.current.get(target);
      if (stageEl) {
        stageEl.scrollIntoView({ block: "center", behavior: "auto" });
        return;
      }
      const el = chapterRefs.current.get(chId);
      if (el) el.scrollIntoView({ block: "start", behavior: "auto" });
    });
  }, [progress, resumeStageId, nextStageId]);

  const toggleChapter = (id: number) => {
    autoPickedRef.current = true;
    setOpenChapterId((prev) => (prev === id ? null : id));
    if (openChapterId !== id) {
      window.setTimeout(() => {
        const el = chapterRefs.current.get(id);
        if (el) el.scrollIntoView({ block: "start", behavior: "smooth" });
      }, 30);
    }
  };

  const handleResetProgress = () => {
    setProgress(emptyProgress());
    setResumeStageIds([]);
    autoPickedRef.current = false;
    setOpenChapterId(1);
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
        <LevelChip progress={progress} onClick={() => setStatsOpen(true)} />
      </div>

      <DailyBanner onPlay={onPlay} />

      {resumeStageId != null ? (
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
      ) : nextStageId != null ? (
        <NextStageBanner
          stageId={nextStageId}
          onPlay={() => {
            const stage = STAGES.find((s) => s.id === nextStageId);
            if (stage) onPlay(stage);
          }}
        />
      ) : null}

      {zenAvailable && onZen && <ZenBanner onPlay={onZen} />}

      <div className="mt-5 space-y-3">
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
          const unlockedInChapter = progress
            ? stagesInChapter.some((s) => s.id <= progress.unlockedUpTo)
            : ch.id === 1;
          const isOpen = openChapterId === ch.id;
          return (
            <ChapterBlock
              key={ch.id}
              chapter={ch}
              cleared={clearedInChapter}
              total={stagesInChapter.length}
              stars={starsInChapter}
              fullyCleared={chapterFullyCleared}
              mastered={chapterMastered}
              unlocked={unlockedInChapter}
              isOpen={isOpen}
              onToggle={() => toggleChapter(ch.id)}
              sectionRef={(el) => {
                chapterRefs.current.set(ch.id, el);
              }}
            >
              {isOpen && (
                <div className="grid grid-cols-3 gap-3 mt-3">
                  {stagesInChapter.map((s) => (
                    <StageCard
                      key={s.id}
                      stage={s}
                      progress={progress}
                      isResume={resumeStageId === s.id}
                      isNext={nextStageId === s.id}
                      isDaily={dailyStageId === s.id}
                      onPlay={onPlay}
                      cardRef={(el) => {
                        if (el) stageRefs.current.set(s.id, el);
                        else stageRefs.current.delete(s.id);
                      }}
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
              )}
            </ChapterBlock>
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
        onPersonalReplay={(opts) => {
          setGalleryOpen(false);
          onPersonal(opts);
        }}
        onAddPersonal={() => {
          setGalleryOpen(false);
          setPersonalOpen(true);
        }}
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
      <StatsScreen open={statsOpen} onClose={() => setStatsOpen(false)} />

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

function ZenBanner({ onPlay }: { onPlay: () => void }) {
  return (
    <button
      type="button"
      onClick={onPlay}
      className="press-95 mt-2 w-full flex items-stretch rounded-2xl overflow-hidden text-left"
      style={{
        background: "var(--bg-surface)",
        border: "1px solid var(--success)",
      }}
    >
      <div
        className="flex-none flex items-center justify-center w-14"
        style={{
          background: "var(--success-soft)",
          color: "var(--success)",
        }}
      >
        <span aria-hidden style={{ fontSize: 22 }}>
          ☯
        </span>
      </div>
      <div className="flex-1 flex items-center justify-between px-4 py-3">
        <div>
          <div
            className="text-[10px] tracking-[0.18em] uppercase font-bold"
            style={{ color: "var(--success)" }}
          >
            Zen · 쉼터
          </div>
          <div
            className="text-base font-semibold"
            style={{ color: "var(--ink-1)" }}
          >
            시간 없이, 점수 없이
          </div>
          <div
            className="text-[11px]"
            style={{ color: "var(--ink-mute)" }}
          >
            완성한 그림 중에서 한 장 골라드려요
          </div>
        </div>
        <div className="text-xl" aria-hidden style={{ color: "var(--success)" }}>
          ▶
        </div>
      </div>
    </button>
  );
}

function NextStageBanner({
  stageId,
  onPlay,
}: {
  stageId: number;
  onPlay: () => void;
}) {
  const thumb = getStageImageDataUrl(stageId, THUMB_SIZE);
  return (
    <button
      type="button"
      onClick={onPlay}
      className="press-95 mt-3 w-full flex items-stretch rounded-2xl overflow-hidden text-left"
      style={{
        background: "var(--accent)",
        color: "var(--accent-fg)",
      }}
    >
      <div className="relative w-20 flex-none">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={thumb}
          alt=""
          decoding="async"
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover"
        />
      </div>
      <div className="flex-1 flex items-center justify-between px-4 py-3">
        <div>
          <div className="text-[10px] tracking-[0.18em] uppercase font-bold opacity-85">
            Next
          </div>
          <div className="text-base font-semibold">
            스테이지 {stageId} 시작
          </div>
        </div>
        <div className="text-xl" aria-hidden>
          ▶
        </div>
      </div>
    </button>
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

function ChapterBlock({
  chapter,
  cleared,
  total,
  stars,
  fullyCleared,
  mastered,
  unlocked,
  isOpen,
  onToggle,
  sectionRef,
  children,
}: {
  chapter: Chapter;
  cleared: number;
  total: number;
  stars: number;
  fullyCleared: boolean;
  mastered: boolean;
  unlocked: boolean;
  isOpen: boolean;
  onToggle: () => void;
  sectionRef: (el: HTMLElement | null) => void;
  children?: React.ReactNode;
}) {
  const pct = total > 0 ? cleared / total : 0;
  const accent = mastered
    ? "var(--gold)"
    : fullyCleared
    ? "var(--success)"
    : "var(--accent)";
  return (
    <section
      ref={sectionRef}
      className="scroll-mt-3 chapter-section rounded-2xl overflow-hidden"
      style={{
        background: "var(--bg-surface)",
        border: `1px solid ${isOpen ? accent : "var(--line)"}`,
        opacity: unlocked ? 1 : 0.7,
        transition: "border-color 200ms ease",
      }}
    >
      <button
        type="button"
        onClick={onToggle}
        className="press-95 w-full text-left px-4 py-3 flex items-center gap-3"
        aria-expanded={isOpen}
      >
        <div
          className="flex-none flex items-center justify-center w-12 h-12 rounded-xl font-bold tabular-nums"
          style={{
            background: isOpen
              ? accent
              : mastered
              ? "var(--gold-soft)"
              : fullyCleared
              ? "var(--success-soft)"
              : "var(--bg-elevated)",
            color: isOpen
              ? "var(--accent-fg)"
              : mastered
              ? "var(--gold)"
              : fullyCleared
              ? "var(--success)"
              : "var(--ink-2)",
            border: `1px solid ${
              isOpen
                ? accent
                : mastered
                ? "var(--gold)"
                : fullyCleared
                ? "var(--success)"
                : "var(--line)"
            }`,
            fontSize: 14,
          }}
        >
          {String(chapter.id).padStart(2, "0")}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <div
              className="text-[10px] font-bold tracking-[0.18em] uppercase"
              style={{ color: "var(--ink-mute)" }}
            >
              Chapter {chapter.id}
            </div>
            {mastered && (
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
            {!mastered && fullyCleared && (
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
            {!unlocked && (
              <span
                className="rounded-sm px-1 py-0.5 text-[9px]"
                style={{
                  background: "var(--bg-elevated)",
                  color: "var(--ink-mute)",
                  letterSpacing: "0.14em",
                }}
              >
                LOCKED
              </span>
            )}
          </div>
          <div
            className="text-base font-semibold leading-tight truncate"
            style={{ color: "var(--ink-1)" }}
          >
            {chapter.title}
          </div>
          <div
            className="text-[11px] truncate"
            style={{ color: "var(--ink-mute)" }}
          >
            {chapter.subtitle}
          </div>
          <div
            className="mt-1.5 h-1 rounded-full overflow-hidden"
            style={{ background: "var(--bg-elevated)" }}
          >
            <div
              className="h-full rounded-full"
              style={{
                width: `${Math.round(pct * 100)}%`,
                background: accent,
                transition: "width 400ms cubic-bezier(0.2,0.8,0.2,1)",
              }}
            />
          </div>
        </div>
        <div className="flex-none text-right">
          <div
            className="text-[11px] font-semibold tabular-nums"
            style={{ color: "var(--ink-2)" }}
          >
            {cleared} / {total}
          </div>
          <div
            className="text-[11px] tabular-nums"
            style={{ color: "var(--gold)" }}
          >
            ★ {stars}
          </div>
          <div
            className="mt-0.5 text-[14px]"
            style={{ color: "var(--ink-mute)" }}
            aria-hidden
          >
            {isOpen ? "▾" : "▸"}
          </div>
        </div>
      </button>
      {isOpen && (
        <div
          className="chapter-reveal px-3 pb-4"
          style={{ borderTop: "1px solid var(--line-soft)" }}
        >
          {children}
        </div>
      )}
    </section>
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
  cardRef,
}: {
  stage: Stage;
  progress: Progress | null;
  isResume: boolean;
  isNext: boolean;
  isDaily: boolean;
  onPlay: (s: Stage) => void;
  onLockedTap: (stageId: number) => void;
  cardRef?: (el: HTMLButtonElement | null) => void;
}) {
  const sequentiallyUnlocked = progress
    ? stage.id <= progress.unlockedUpTo
    : stage.id === 1;
  const cleared = progress ? !!progress.cleared[stage.id] : false;
  // A daily-cleared stage past the unlock frontier should still be
  // replayable — the player already finished it once, refusing to let
  // them open it again is just frustrating.
  const playable = sequentiallyUnlocked || cleared;
  const best = progress?.bestTimes[stage.id];
  const stars = progress?.bestStars[stage.id] ?? 0;
  const mastered = cleared && stars === 3;
  const [imgLoaded, setImgLoaded] = useState(false);

  const img = getStageImageDataUrl(stage.id, THUMB_SIZE);

  return (
    <button
      type="button"
      ref={cardRef}
      onClick={() => (playable ? onPlay(stage) : onLockedTap(stage.id))}
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
        opacity: playable ? 1 : 0.55,
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
          filter: playable ? "none" : "grayscale(85%) brightness(0.7)",
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
      {!playable && (
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.25)" }}
        >
          <span style={{ color: "#fff", fontSize: 22 }} aria-hidden>
            ⨯
          </span>
        </div>
      )}
      {stage.isBoss && playable && !cleared && (
        <div className="absolute top-1 right-1 flex flex-col items-end gap-0.5">
          <div
            className="rounded-sm px-1.5 py-0.5 text-[9px] font-bold tracking-[0.14em]"
            style={{ background: "var(--danger)", color: "#fff" }}
          >
            BOSS
          </div>
          {stage.bossConstraints?.noPreview && (
            <div
              className="rounded-sm px-1 py-px text-[8px] font-bold tracking-[0.1em]"
              style={{ background: "rgba(0,0,0,0.6)", color: "#fff" }}
            >
              미리보기 없음
            </div>
          )}
          {!stage.bossConstraints?.noPreview && stage.bossConstraints?.bwPreview && (
            <div
              className="rounded-sm px-1 py-px text-[8px] font-bold tracking-[0.1em]"
              style={{ background: "rgba(0,0,0,0.6)", color: "#fff" }}
            >
              흑백
            </div>
          )}
          {stage.bossConstraints?.parMultiplier && stage.bossConstraints.parMultiplier < 1 && (
            <div
              className="rounded-sm px-1 py-px text-[8px] font-bold tracking-[0.1em]"
              style={{ background: "rgba(0,0,0,0.6)", color: "#fff" }}
            >
              시간 −{Math.round((1 - stage.bossConstraints.parMultiplier) * 100)}%
            </div>
          )}
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
