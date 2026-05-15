"use client";

import { useEffect, useMemo, useState } from "react";
import { loadProgress, type Progress } from "@/lib/progress";
import { loadDaily, type DailyRecord } from "@/lib/daily";
import { STAGES } from "@/data/stages";
import {
  deriveLevel,
  inferTotalXpFromProgress,
  titleForLevel,
} from "@/lib/level";

export default function StatsCard() {
  const [progress, setProgress] = useState<Progress | null>(null);
  const [daily, setDaily] = useState<DailyRecord | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setProgress(loadProgress());
    setDaily(loadDaily());
  }, []);

  const summary = useMemo(() => {
    if (!progress) return null;
    const clearedIds = Object.keys(progress.cleared).map((n) => parseInt(n, 10));
    const cleared = clearedIds.length;
    const totalStars = Object.values(progress.bestStars).reduce(
      (a, b) => a + b,
      0
    );
    const bossesCleared = STAGES.filter(
      (s) => s.isBoss && progress.cleared[s.id]
    ).length;

    let fastestTime: number | null = null;
    let fastestStageId: number | null = null;
    let totalTime = 0;
    let timeSamples = 0;
    for (const idStr of Object.keys(progress.bestTimes)) {
      const id = parseInt(idStr, 10);
      const t = progress.bestTimes[id];
      if (typeof t !== "number") continue;
      totalTime += t;
      timeSamples += 1;
      if (fastestTime == null || t < fastestTime) {
        fastestTime = t;
        fastestStageId = id;
      }
    }
    const averageTime = timeSamples > 0 ? Math.round(totalTime / timeSamples) : 0;

    const xp =
      progress.xp > 0
        ? progress.xp
        : inferTotalXpFromProgress(progress);
    const lvl = deriveLevel(xp);

    return {
      cleared,
      totalStars,
      bossesCleared,
      fastestTime,
      fastestStageId,
      averageTime,
      timeSamples,
      level: lvl.level,
      title: titleForLevel(lvl.level),
      xp,
    };
  }, [progress]);

  if (!summary) {
    return (
      <div
        className="rounded-xl px-4 py-3 text-sm"
        style={{
          background: "var(--bg-elevated)",
          color: "var(--ink-mute)",
          border: "1px solid var(--line)",
        }}
      >
        통계를 불러오는 중…
      </div>
    );
  }

  return (
    <div
      className="rounded-xl px-4 py-3 space-y-2 text-sm"
      style={{
        background: "var(--bg-elevated)",
        border: "1px solid var(--line)",
      }}
    >
      <Row label="레벨" value={`Lv.${summary.level} · ${summary.title}`} />
      <Row label="누적 XP" value={`${summary.xp.toLocaleString()}`} />
      <Row label="클리어한 스테이지" value={`${summary.cleared}`} />
      <Row label="획득한 별" value={`★ ${summary.totalStars}`} />
      <Row label="보스 격파" value={`${summary.bossesCleared}`} />
      {summary.fastestTime != null && summary.fastestStageId != null && (
        <Row
          label="최단 클리어"
          value={`${formatTime(summary.fastestTime)} · St.${summary.fastestStageId}`}
        />
      )}
      {summary.timeSamples > 0 && (
        <Row label="평균 시간" value={formatTime(summary.averageTime)} />
      )}
      {daily && (
        <>
          <Row
            label="데일리 연속"
            value={
              daily.bestStreak > daily.streak
                ? `${daily.streak}일 · 최고 ${daily.bestStreak}일`
                : `${daily.streak}일`
            }
          />
          <Row label="데일리 누적" value={`${daily.totalCleared}회`} />
        </>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span style={{ color: "var(--ink-mute)" }}>{label}</span>
      <span
        className="font-semibold tabular-nums"
        style={{ color: "var(--ink-1)" }}
      >
        {value}
      </span>
    </div>
  );
}

function formatTime(ms: number): string {
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}
