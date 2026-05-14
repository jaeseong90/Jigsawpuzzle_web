"use client";

import { useEffect, useMemo, useState } from "react";
import {
  DIFFICULTIES,
  applyDifficulty,
  loadDefaultDifficulty,
  saveDefaultDifficulty,
  type Difficulty,
} from "@/lib/difficulty";
import type { Stage } from "@/data/stages";
import { parTimeMs } from "@/data/stages";
import type { Progress } from "@/lib/progress";
import { getStageImageDataUrl } from "@/lib/stageImage";

type Props = {
  stage: Stage;
  progress: Progress | null;
  isDaily: boolean;
  onStart: (stage: Stage, difficulty: Difficulty) => void;
  onCancel: () => void;
};

export default function PreStageScreen({
  stage,
  progress,
  isDaily,
  onStart,
  onCancel,
}: Props) {
  const [difficulty, setDifficulty] = useState<Difficulty>("standard");
  const [imgLoaded, setImgLoaded] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDifficulty(loadDefaultDifficulty());
  }, []);

  const previewSrc = getStageImageDataUrl(stage.id);

  const stageAtDiff = useMemo(
    () => applyDifficulty(stage, difficulty),
    [stage, difficulty]
  );

  const pieceCount = stageAtDiff.rows * stageAtDiff.cols;
  const parMs = parTimeMs(stageAtDiff);
  const bestTime = (() => {
    if (!progress) return undefined;
    if (difficulty === "standard") return progress.bestTimes[stage.id];
    return progress.bestByDifficulty[difficulty][stage.id]?.bestTimeMs;
  })();
  const bestStars = (() => {
    if (!progress) return 0;
    if (difficulty === "standard") return progress.bestStars[stage.id] ?? 0;
    return progress.bestByDifficulty[difficulty][stage.id]?.bestStars ?? 0;
  })();

  const handleStart = () => {
    saveDefaultDifficulty(difficulty);
    onStart(stageAtDiff, difficulty);
  };

  return (
    <main
      className="flex min-h-[100dvh] flex-col fade-in-soft"
      style={{ background: "var(--bg-app)" }}
    >
      <header className="flex items-center justify-between px-4 pt-3 pb-2">
        <button
          type="button"
          onClick={onCancel}
          className="press-95 rounded-full px-3 py-1.5 text-sm font-medium"
          style={{
            background: "var(--bg-surface)",
            color: "var(--ink-2)",
            border: "1px solid var(--line)",
          }}
        >
          ← 목록
        </button>
        <div
          className="text-xs font-semibold tabular-nums"
          style={{ color: "var(--ink-mute)" }}
        >
          STAGE {String(stage.id).padStart(3, "0")}
        </div>
        {stage.isBoss ? (
          <div
            className="rounded-full px-2.5 py-1 text-[11px] font-bold tracking-wide"
            style={{
              background: "var(--danger)",
              color: "#fff",
            }}
          >
            BOSS
          </div>
        ) : isDaily ? (
          <div
            className="rounded-full px-2.5 py-1 text-[11px] font-bold tracking-wide"
            style={{ background: "var(--gold-soft)", color: "var(--gold)" }}
          >
            오늘의 도전
          </div>
        ) : (
          <div style={{ width: 48 }} />
        )}
      </header>

      <div className="mx-4 mt-2 overflow-hidden rounded-2xl border" style={{ borderColor: "var(--line)", background: "var(--bg-surface)" }}>
        <div className="relative aspect-[5/4] w-full">
          <div
            className="absolute inset-0"
            style={{ background: "var(--bg-elevated)" }}
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewSrc}
            alt=""
            onLoad={() => setImgLoaded(true)}
            decoding="async"
            className="absolute inset-0 h-full w-full object-cover transition-opacity duration-500"
            style={{ opacity: imgLoaded ? 1 : 0 }}
          />
          <div
            className="absolute inset-x-0 bottom-0 px-4 pt-12 pb-3"
            style={{
              background:
                "linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.65) 100%)",
              color: "#fff",
            }}
          >
            <div className="flex items-end justify-between">
              <div>
                <div className="text-[11px] uppercase tracking-[0.18em] opacity-80">
                  {stage.isBoss ? "BOSS PUZZLE" : "PUZZLE"}
                </div>
                <div className="text-xl font-semibold leading-tight">
                  {stage.title}
                </div>
              </div>
              <div className="text-right">
                <div className="text-[11px] opacity-80">조각</div>
                <div className="text-xl font-bold tabular-nums">
                  {pieceCount}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <section className="mt-5 px-4">
        <div
          className="text-[11px] font-semibold tracking-[0.16em] uppercase mb-2"
          style={{ color: "var(--ink-mute)" }}
        >
          난이도 · Difficulty
        </div>
        <div className="space-y-2">
          {DIFFICULTIES.map((d) => {
            const stageAt = applyDifficulty(stage, d.id);
            const pieces = stageAt.rows * stageAt.cols;
            const selected = difficulty === d.id;
            return (
              <button
                key={d.id}
                type="button"
                onClick={() => setDifficulty(d.id)}
                className="press-95 w-full text-left rounded-2xl px-4 py-3 flex items-center justify-between"
                style={{
                  background: selected ? "var(--accent-soft)" : "var(--bg-surface)",
                  border: `1px solid ${selected ? "var(--accent)" : "var(--line)"}`,
                  color: "var(--ink-1)",
                }}
                aria-pressed={selected}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <div
                      className="text-base font-semibold"
                      style={{
                        color: selected
                          ? "var(--accent-soft-fg)"
                          : "var(--ink-1)",
                      }}
                    >
                      {d.ko}
                    </div>
                    <div
                      className="text-[10px] tracking-[0.16em] uppercase"
                      style={{ color: "var(--ink-mute)" }}
                    >
                      {d.en}
                    </div>
                  </div>
                  <div
                    className="text-[11px] mt-0.5"
                    style={{ color: "var(--ink-3)" }}
                  >
                    {d.blurb}
                  </div>
                </div>
                <div className="text-right">
                  <div
                    className="text-base font-bold tabular-nums"
                    style={{
                      color: selected
                        ? "var(--accent-soft-fg)"
                        : "var(--ink-1)",
                    }}
                  >
                    {pieces}
                  </div>
                  <div
                    className="text-[10px]"
                    style={{ color: "var(--ink-mute)" }}
                  >
                    조각 · XP ×{d.xpMultiplier.toFixed(1)}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      <section className="mt-5 px-4">
        <div
          className="text-[11px] font-semibold tracking-[0.16em] uppercase mb-2"
          style={{ color: "var(--ink-mute)" }}
        >
          기록
        </div>
        <div
          className="rounded-2xl px-4 py-3 grid grid-cols-3 gap-3"
          style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--line)",
          }}
        >
          <Stat label="최고 시간" value={bestTime != null ? formatTime(bestTime) : "—"} />
          <Stat
            label="최고 별"
            value={bestStars > 0 ? "★".repeat(bestStars) + "☆".repeat(3 - bestStars) : "—"}
            valueStyle={{ letterSpacing: "0.08em", color: "var(--gold)" }}
          />
          <Stat label="목표 시간" value={formatTime(parMs)} />
        </div>
      </section>

      <div className="flex-1" />
      <div className="px-4 pb-5 pt-4">
        <button
          type="button"
          onClick={handleStart}
          className="press-95 w-full rounded-full py-4 text-base font-semibold shadow-sm"
          style={{
            background: "var(--accent)",
            color: "var(--accent-fg)",
          }}
        >
          시작하기
        </button>
      </div>
    </main>
  );
}

function Stat({
  label,
  value,
  valueStyle,
}: {
  label: string;
  value: string;
  valueStyle?: React.CSSProperties;
}) {
  return (
    <div>
      <div
        className="text-[10px] uppercase tracking-[0.12em]"
        style={{ color: "var(--ink-mute)" }}
      >
        {label}
      </div>
      <div
        className="text-base font-semibold tabular-nums mt-0.5"
        style={{ color: "var(--ink-1)", ...valueStyle }}
      >
        {value}
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
