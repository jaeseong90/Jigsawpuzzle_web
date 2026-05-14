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

export default function Home() {
  const [progress, setProgress] = useState<Progress | null>(null);
  const [stage, setStage] = useState<Stage | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setProgress(loadProgress());
  }, []);

  const par = useMemo(() => (stage ? parTimeMs(stage) : 0), [stage]);
  const hasNext = useMemo(() => {
    if (!stage || !progress) return false;
    const nextId = stage.id + 1;
    return nextId <= TOTAL_STAGE_COUNT && nextId <= progress.unlockedUpTo;
  }, [stage, progress]);

  if (!stage) {
    return <StageSelect onPlay={setStage} />;
  }

  const handleSolved = (durationMs: number, stars: number) => {
    const prev = progress ?? loadProgress();
    const next = recordClear(prev, stage.id, durationMs, stars, TOTAL_STAGE_COUNT);
    setProgress(next);
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
      parTimeMs={par}
      hasNext={hasNext}
      onSolved={handleSolved}
      onExit={handleExit}
      onNext={handleNext}
    />
  );
}
