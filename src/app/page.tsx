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
import { loadProgress, recordClear, type Progress } from "@/lib/progress";
import { getDailyStageId, loadDaily, recordDailyClear } from "@/lib/daily";

export default function Home() {
  const [progress, setProgress] = useState<Progress | null>(null);
  const [stage, setStage] = useState<Stage | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setProgress(loadProgress());
  }, []);

  // Warm the cache for the next stage's photo so "다음" navigates without a
  // visible network round-trip.
  useEffect(() => {
    if (!stage) return;
    const nextId = stage.id + 1;
    if (nextId > TOTAL_STAGE_COUNT) return;
    if (typeof window === "undefined") return;
    const img = new Image();
    img.decoding = "async";
    img.src = getStageImageDataUrl(nextId);
  }, [stage]);

  const par = useMemo(() => (stage ? parTimeMs(stage) : 0), [stage]);
  const hasNext = useMemo(() => {
    if (!stage || !progress) return false;
    const nextId = stage.id + 1;
    return nextId <= TOTAL_STAGE_COUNT && nextId <= progress.unlockedUpTo;
  }, [stage, progress]);
  const previousBestMs = useMemo(() => {
    if (!stage || !progress) return undefined;
    return progress.bestTimes[stage.id];
  }, [stage, progress]);
  const isDailyStage = useMemo(() => {
    if (!stage) return false;
    return getDailyStageId() === stage.id;
  }, [stage]);

  if (!stage) {
    return <StageSelect onPlay={setStage} />;
  }

  const handleSolved = (durationMs: number, stars: number) => {
    const prev = progress ?? loadProgress();
    // Only push the unlock frontier when the player cleared a stage that was
    // already unlocked through normal progression — daily-challenge clears of
    // far-future stages shouldn't skip the player past everything in between.
    const advanceUnlock = stage.id <= prev.unlockedUpTo;
    const next = recordClear(prev, stage.id, durationMs, stars, TOTAL_STAGE_COUNT, {
      advanceUnlock,
    });
    setProgress(next);
    // Tick the daily-challenge record if this stage matches today's pick.
    const daily = loadDaily();
    if (daily.stageId === stage.id) {
      recordDailyClear(daily, stage.id, durationMs, stars);
    }
  };

  const handleExit = () => setStage(null);

  const handleNext = () => {
    const p = progress ?? loadProgress();
    const nextId = stage.id + 1;
    if (nextId > TOTAL_STAGE_COUNT || nextId > p.unlockedUpTo) {
      setStage(null);
      return;
    }
    setStage(getStage(nextId) ?? null);
  };

  return (
    <PuzzleBoard
      key={stage.id}
      imageSrc={getStageImageDataUrl(stage.id)}
      rows={stage.rows}
      cols={stage.cols}
      isBoss={stage.isBoss}
      stageLabel={stage.title}
      stageId={stage.id}
      totalStages={TOTAL_STAGE_COUNT}
      parTimeMs={par}
      previousBestMs={previousBestMs}
      isDaily={isDailyStage}
      hasNext={hasNext}
      onSolved={handleSolved}
      onExit={handleExit}
      onNext={handleNext}
    />
  );
}
