"use client";

import { useEffect, useMemo, useState } from "react";
import StageSelect from "@/components/StageSelect";
import PuzzleBoard from "@/components/PuzzleBoard";
import PreStageScreen from "@/components/PreStageScreen";
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
  applyDifficulty,
  loadDefaultDifficulty,
  type Difficulty,
} from "@/lib/difficulty";
import { xpForClear } from "@/lib/level";

type View =
  | { kind: "menu" }
  | { kind: "preStage"; stage: Stage }
  | {
      kind: "play";
      // baseStage is the original (unscaled) stage; activeStage is what we feed
      // into the board after applying the chosen difficulty.
      baseStage: Stage;
      activeStage: Stage;
      difficulty: Difficulty;
    };

export default function Home() {
  const [progress, setProgress] = useState<Progress | null>(null);
  const [view, setView] = useState<View>({ kind: "menu" });

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setProgress(loadProgress());
    applyTheme(loadTheme());
  }, []);

  // Warm cache for the upcoming stage photo.
  useEffect(() => {
    if (view.kind === "menu") return;
    const stage =
      view.kind === "preStage" ? view.stage : view.baseStage;
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
    if (view.kind === "menu") return false;
    const stageId =
      view.kind === "preStage" ? view.stage.id : view.baseStage.id;
    return getDailyStageId() === stageId;
  }, [view]);

  if (view.kind === "menu") {
    return (
      <StageSelect
        progressOverride={progress}
        onSelect={(stage) => setView({ kind: "preStage", stage })}
        onQuickStart={(stage) => {
          const d = loadDefaultDifficulty();
          const active = applyDifficulty(stage, d);
          setView({
            kind: "play",
            baseStage: stage,
            activeStage: active,
            difficulty: d,
          });
        }}
      />
    );
  }

  if (view.kind === "preStage") {
    return (
      <PreStageScreen
        stage={view.stage}
        progress={progress}
        isDaily={isDailyStage}
        onStart={(activeStage, difficulty) =>
          setView({
            kind: "play",
            baseStage: view.stage,
            activeStage,
            difficulty,
          })
        }
        onCancel={() => setView({ kind: "menu" })}
      />
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
    const xpEarned = Math.round(
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
    );
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

    const daily = loadDaily();
    if (daily.stageId === baseStage.id) {
      recordDailyClear(daily, baseStage.id, durationMs, stars);
      recordDailyHistory(daily.date, {
        stageId: baseStage.id,
        stars,
        durationMs,
      });
    }
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
    setView({ kind: "preStage", stage });
  };

  return (
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
  );
}
