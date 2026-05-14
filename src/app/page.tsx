"use client";

import { useEffect, useState } from "react";
import StageSelect from "@/components/StageSelect";
import PuzzleBoard from "@/components/PuzzleBoard";
import { TOTAL_STAGE_COUNT, type Stage, getStage } from "@/data/stages";
import { getStageImageDataUrl } from "@/lib/stageImage";
import { loadProgress, recordClear, type Progress } from "@/lib/progress";

export default function Home() {
  const [progress, setProgress] = useState<Progress | null>(null);
  const [stage, setStage] = useState<Stage | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setProgress(loadProgress());
  }, []);

  if (!stage) {
    return <StageSelect onPlay={setStage} />;
  }

  const handleSolved = (durationMs: number) => {
    const prev = progress ?? loadProgress();
    const next = recordClear(prev, stage.id, durationMs, TOTAL_STAGE_COUNT);
    setProgress(next);
  };

  const handleExit = () => {
    // If solved, advance to the next stage automatically (cleaner flow on mobile).
    if (progress && progress.cleared[stage.id]) {
      const nextId = stage.id + 1;
      const nextStage =
        nextId <= TOTAL_STAGE_COUNT && nextId <= progress.unlockedUpTo
          ? getStage(nextId)
          : undefined;
      setStage(nextStage ?? null);
      return;
    }
    setStage(null);
  };

  return (
    <PuzzleBoard
      key={stage.id}
      imageSrc={getStageImageDataUrl(stage.id)}
      rows={stage.rows}
      cols={stage.cols}
      isBoss={stage.isBoss}
      stageLabel={stage.title}
      onSolved={handleSolved}
      onExit={handleExit}
    />
  );
}
