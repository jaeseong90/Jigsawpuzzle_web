"use client";

import { useEffect, useMemo, useState } from "react";
import StageSelect from "@/components/StageSelect";
import PuzzleBoard from "@/components/PuzzleBoard";
import {
  TOTAL_STAGE_COUNT,
  type Stage,
  getStage,
  parTimeMs,
} from "@/data/stages";
import { getStageImageDataUrl } from "@/lib/stageImage";
import {
  loadProgress,
  recordClear,
  type Progress,
} from "@/lib/progress";
import {
  getDailyStageId,
  loadDaily,
  recordDailyClear,
} from "@/lib/daily";
import { recordDailyHistory } from "@/lib/dailyHistory";
import { applyTheme, loadTheme } from "@/lib/theme";
import {
  installFirstInteractionResume,
  installVisibilityHook,
} from "@/lib/ambient";
import {
  applyDifficulty,
  loadDefaultDifficulty,
  type Difficulty,
} from "@/lib/difficulty";
import { xpForClear } from "@/lib/level";
import {
  recordPersonalCompletion,
  recordPersonalPlay,
} from "@/lib/personalLibrary";
import {
  crossedTier,
  streakXpBonus,
  type StreakTier,
} from "@/lib/dailyRewards";
import StreakCelebration from "@/components/StreakCelebration";
import { recordClearEvent } from "@/lib/playEvents";

type View =
  | { kind: "menu" }
  | {
      kind: "play";
      baseStage: Stage;
      activeStage: Stage;
      difficulty: Difficulty;
    }
  | {
      kind: "personal";
      imageSrc: string;
      rows: number;
      cols: number;
      rotate: boolean;
      photoId: string;
    };

export default function Home() {
  const [progress, setProgress] = useState<Progress | null>(null);
  const [view, setView] = useState<View>({ kind: "menu" });
  const [pendingMilestone, setPendingMilestone] = useState<StreakTier | null>(
    null
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setProgress(loadProgress());
    applyTheme(loadTheme());
    installFirstInteractionResume();
    installVisibilityHook();
  }, []);

  // Warm cache for the upcoming stage photo.
  useEffect(() => {
    if (view.kind !== "play") return;
    const stage = view.baseStage;
    const nextId = stage.id + 1;
    if (nextId > TOTAL_STAGE_COUNT) return;
    if (typeof window === "undefined") return;
    const img = new Image();
    img.decoding = "async";
    img.src = getStageImageDataUrl(nextId);
  }, [view]);

  const par = useMemo(() => {
    if (view.kind !== "play") return 0;
    return parTimeMs(view.activeStage);
  }, [view]);
  const hasNext = useMemo(() => {
    if (view.kind !== "play" || !progress) return false;
    const nextId = view.baseStage.id + 1;
    return nextId <= TOTAL_STAGE_COUNT && nextId <= progress.unlockedUpTo;
  }, [view, progress]);
  const previousBestMs = useMemo(() => {
    if (view.kind !== "play" || !progress) return undefined;
    if (view.difficulty === "standard")
      return progress.bestTimes[view.baseStage.id];
    return progress.bestByDifficulty[view.difficulty][view.baseStage.id]
      ?.bestTimeMs;
  }, [view, progress]);
  const isDailyStage = useMemo(() => {
    if (view.kind !== "play") return false;
    return getDailyStageId() === view.baseStage.id;
  }, [view]);

  const launchStage = (stage: Stage) => {
    const d = loadDefaultDifficulty();
    const active = applyDifficulty(stage, d);
    setView({
      kind: "play",
      baseStage: stage,
      activeStage: active,
      difficulty: d,
    });
  };

  const celebrationOverlay = (
    <StreakCelebration
      tier={pendingMilestone}
      onClose={() => setPendingMilestone(null)}
    />
  );

  if (view.kind === "menu") {
    return (
      <>
        <StageSelect
          progressOverride={progress}
          onPlay={launchStage}
          onPersonal={(opts) => {
            void recordPersonalPlay(opts.photoId, {
              rows: opts.rows,
              cols: opts.cols,
              rotate: opts.rotate,
            });
            setView({
              kind: "personal",
              imageSrc: opts.imageSrc,
              rows: opts.rows,
              cols: opts.cols,
              rotate: opts.rotate,
              photoId: opts.photoId,
            });
          }}
        />
        {celebrationOverlay}
      </>
    );
  }

  if (view.kind === "personal") {
    return (
      <>
        <PuzzleBoard
          key={`personal-${view.photoId}-${view.rows}x${view.cols}-${view.rotate}`}
          imageSrc={view.imageSrc}
          rows={view.rows}
          cols={view.cols}
          personalId={view.photoId}
          stageLabel="내 사진"
          parTimeMs={view.rows * view.cols * 5500}
          difficulty={view.rotate ? "master" : "standard"}
          hasNext={false}
          onSolved={(durationMs) => {
            void recordPersonalCompletion(view.photoId, durationMs);
          }}
          onExit={() => setView({ kind: "menu" })}
          onNext={() => setView({ kind: "menu" })}
        />
        {celebrationOverlay}
      </>
    );
  }

  const { baseStage, activeStage, difficulty } = view;

  const handleSolved = (
    durationMs: number,
    stars: number,
    hintsUsed: number
  ) => {
    const prev = progress ?? loadProgress();
    const advanceUnlock = baseStage.id <= prev.unlockedUpTo;
    const isFirstClear = !prev.cleared[baseStage.id];
    const pieces = activeStage.rows * activeStage.cols;
    const isDaily = getDailyStageId() === baseStage.id;

    let streakBonus = 0;
    let milestone: StreakTier | null = null;
    const daily = loadDaily();
    if (daily.stageId === baseStage.id) {
      const updated = recordDailyClear(daily, baseStage.id, durationMs, stars);
      recordDailyHistory(daily.date, {
        stageId: baseStage.id,
        stars,
        durationMs,
      });
      if (!daily.cleared && updated.cleared) {
        // First daily clear today — fold the streak bonus into XP and
        // surface a milestone if a tier was just crossed.
        streakBonus = streakXpBonus(updated.streak);
        milestone = crossedTier(daily.streak, updated.streak);
      }
    }

    const xpEarned =
      Math.round(
        xpForClear({
          pieces,
          stars: stars as 1 | 2 | 3,
          isBoss: baseStage.isBoss,
          isDaily,
          isFirstClear,
        }) *
          (difficulty === "relax"
            ? 0.7
            : difficulty === "master"
            ? 1.6
            : 1)
      ) + streakBonus;
    void hintsUsed;

    const next = recordClear(
      prev,
      baseStage.id,
      durationMs,
      stars,
      TOTAL_STAGE_COUNT,
      { advanceUnlock, difficulty, xpEarned }
    );
    setProgress(next);

    recordClearEvent({
      ts: Date.now(),
      stageId: baseStage.id,
      durationMs,
      stars,
      isDaily,
      isBoss: !!baseStage.isBoss,
      difficulty,
    });

    if (milestone) setPendingMilestone(milestone);
  };

  const handleExit = () => setView({ kind: "menu" });

  const handleNext = () => {
    const p = progress ?? loadProgress();
    const nextId = baseStage.id + 1;
    if (nextId > TOTAL_STAGE_COUNT || nextId > p.unlockedUpTo) {
      setView({ kind: "menu" });
      return;
    }
    const stage = getStage(nextId);
    if (!stage) {
      setView({ kind: "menu" });
      return;
    }
    launchStage(stage);
  };

  return (
    <>
      <PuzzleBoard
        key={`${baseStage.id}-${difficulty}`}
        imageSrc={getStageImageDataUrl(baseStage.id)}
        rows={activeStage.rows}
        cols={activeStage.cols}
        isBoss={baseStage.isBoss}
        stageLabel={baseStage.title}
        stageId={baseStage.id}
        totalStages={TOTAL_STAGE_COUNT}
        parTimeMs={par}
        previousBestMs={previousBestMs}
        isDaily={isDailyStage}
        difficulty={difficulty}
        hasNext={hasNext}
        onSolved={handleSolved}
        onExit={handleExit}
        onNext={handleNext}
      />
      {celebrationOverlay}
    </>
  );
}
