"use client";

import { useEffect, useMemo, useState } from "react";
import { loadProgress, type Progress } from "@/lib/progress";
import { STAGES, type Stage } from "@/data/stages";
import { getStageImageDataUrl } from "@/lib/stageImage";

type Props = {
  open: boolean;
  onClose: () => void;
};

// A masonry-ish gallery of stages the player has cleared. Adults love
// revisiting completed photos — this is the "trophy shelf".
export default function PhotoGallery({ open, onClose }: Props) {
  const [progress, setProgress] = useState<Progress | null>(null);
  const [focused, setFocused] = useState<Stage | null>(null);

  useEffect(() => {
    if (!open) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setProgress(loadProgress());
    setFocused(null);
  }, [open]);

  const cleared = useMemo(() => {
    if (!progress) return [];
    return STAGES.filter((s) => progress.cleared[s.id]);
  }, [progress]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-stretch justify-center fade-in-soft"
      style={{ background: "var(--bg-overlay)" }}
    >
      <div
        className="w-full max-w-md flex flex-col"
        style={{ background: "var(--bg-app)" }}
      >
        <header
          className="flex items-center justify-between px-4 py-3"
          style={{ borderBottom: "1px solid var(--line)" }}
        >
          <div>
            <div
              className="text-[11px] uppercase tracking-[0.18em] font-bold"
              style={{ color: "var(--ink-mute)" }}
            >
              Gallery
            </div>
            <div
              className="text-base font-semibold"
              style={{ color: "var(--ink-1)" }}
            >
              완성한 그림 {cleared.length}점
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="press-95 rounded-full px-3 py-1 text-xs font-medium"
            style={{
              background: "var(--bg-surface)",
              color: "var(--ink-2)",
              border: "1px solid var(--line)",
            }}
          >
            닫기
          </button>
        </header>

        {cleared.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
            <div
              className="text-base font-semibold"
              style={{ color: "var(--ink-2)" }}
            >
              아직 완성한 그림이 없어요
            </div>
            <div
              className="mt-1 text-sm"
              style={{ color: "var(--ink-mute)" }}
            >
              스테이지를 클리어하면 이 자리에 그림이 모여요.
            </div>
          </div>
        ) : (
          <div
            className="flex-1 overflow-y-auto px-3 py-3"
            style={{ columnCount: 2, columnGap: "10px" }}
          >
            {cleared.map((s) => (
              <GalleryTile
                key={s.id}
                stage={s}
                stars={progress?.bestStars[s.id] ?? 0}
                onTap={() => setFocused(s)}
              />
            ))}
          </div>
        )}
      </div>

      {focused && (
        <FocusedPhoto
          stage={focused}
          bestTime={progress?.bestTimes[focused.id]}
          stars={progress?.bestStars[focused.id] ?? 0}
          onClose={() => setFocused(null)}
        />
      )}
    </div>
  );
}

function GalleryTile({
  stage,
  stars,
  onTap,
}: {
  stage: Stage;
  stars: number;
  onTap: () => void;
}) {
  const [loaded, setLoaded] = useState(false);
  // Stagger heights for a masonry feel.
  const aspect = stage.id % 5 === 0 ? 1.3 : stage.id % 3 === 0 ? 1.1 : 1;
  return (
    <button
      type="button"
      onClick={onTap}
      className="gallery-card mb-2 w-full press-95 relative overflow-hidden rounded-xl text-left"
      style={{
        background: "var(--bg-surface)",
        border: "1px solid var(--line)",
      }}
    >
      <div
        className="relative w-full"
        style={{ aspectRatio: aspect }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={getStageImageDataUrl(stage.id)}
          alt=""
          loading="lazy"
          decoding="async"
          onLoad={() => setLoaded(true)}
          className="absolute inset-0 w-full h-full object-cover transition-opacity duration-500"
          style={{ opacity: loaded ? 1 : 0 }}
        />
      </div>
      <div className="px-2 py-1.5 flex items-center justify-between">
        <span
          className="text-[10px] font-semibold tabular-nums"
          style={{ color: "var(--ink-mute)" }}
        >
          {String(stage.id).padStart(3, "0")}
          {stage.isBoss && " · BOSS"}
        </span>
        <span
          className="text-[10px]"
          style={{ color: "var(--gold)", letterSpacing: "0.08em" }}
        >
          {"★".repeat(stars)}
          <span style={{ color: "var(--ink-faint)" }}>
            {"★".repeat(3 - stars)}
          </span>
        </span>
      </div>
    </button>
  );
}

function FocusedPhoto({
  stage,
  bestTime,
  stars,
  onClose,
}: {
  stage: Stage;
  bestTime?: number;
  stars: number;
  onClose: () => void;
}) {
  return (
    <div
      className="absolute inset-0 z-10 flex items-center justify-center p-3 fade-in-soft"
      style={{ background: "rgba(0,0,0,0.85)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        style={{ background: "var(--bg-surface)" }}
      >
        <div className="relative aspect-square w-full">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={getStageImageDataUrl(stage.id)}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
            decoding="async"
          />
        </div>
        <div className="px-4 py-3 flex items-center justify-between">
          <div>
            <div
              className="text-[11px] uppercase tracking-[0.18em] font-bold"
              style={{ color: "var(--ink-mute)" }}
            >
              {stage.isBoss ? "Boss" : "Stage"}
            </div>
            <div
              className="text-base font-semibold"
              style={{ color: "var(--ink-1)" }}
            >
              {stage.title}
            </div>
          </div>
          <div className="text-right">
            <div
              className="text-base font-bold tabular-nums"
              style={{ color: "var(--ink-1)" }}
            >
              {bestTime != null ? formatTime(bestTime) : "—"}
            </div>
            <div
              className="text-[10px]"
              style={{ color: "var(--gold)", letterSpacing: "0.08em" }}
            >
              {"★".repeat(stars)}
              <span style={{ color: "var(--ink-faint)" }}>
                {"★".repeat(3 - stars)}
              </span>
            </div>
          </div>
        </div>
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
