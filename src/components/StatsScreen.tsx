"use client";

import { useEffect, useMemo, useState } from "react";
import { loadProgress, type Progress } from "@/lib/progress";
import { loadDaily, type DailyRecord } from "@/lib/daily";
import {
  deriveLevel,
  inferTotalXpFromProgress,
  titleForLevel,
  xpRequiredFor,
} from "@/lib/level";
import { STAGES, TOTAL_STAGE_COUNT } from "@/data/stages";
import { loadClearEvents, type ClearEvent } from "@/lib/playEvents";
import { currentTier } from "@/lib/dailyRewards";
import { listPersonalPhotos } from "@/lib/personalLibrary";
import {
  earnedTessera,
  tesseraBalance,
} from "@/lib/cosmetics";
import AchievementsRow from "./AchievementsRow";

type Props = {
  open: boolean;
  onClose: () => void;
};

// Full-screen stats deep dive. The card in SettingsSheet shows the gist;
// this view gives the player the satisfying numbers, distributions, and
// patterns that make them feel their hours have been recorded.
export default function StatsScreen({ open, onClose }: Props) {
  const [progress, setProgress] = useState<Progress | null>(null);
  const [daily, setDaily] = useState<DailyRecord | null>(null);
  const [events, setEvents] = useState<ClearEvent[]>([]);
  const [personalCount, setPersonalCount] = useState(0);

  useEffect(() => {
    if (!open) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setProgress(loadProgress());
    setDaily(loadDaily());
    setEvents(loadClearEvents());
    listPersonalPhotos()
      .then((list) => setPersonalCount(list.length))
      .catch(() => setPersonalCount(0));
  }, [open]);

  const summary = useMemo(() => {
    if (!progress) return null;
    const clearedIds = Object.keys(progress.cleared).map((n) => parseInt(n, 10));
    const cleared = clearedIds.length;
    const totalStars = Object.values(progress.bestStars).reduce(
      (a, b) => a + b,
      0
    );
    const possibleStars = cleared * 3;
    const bossesCleared = STAGES.filter(
      (s) => s.isBoss && progress.cleared[s.id]
    ).length;
    const totalBosses = STAGES.filter((s) => s.isBoss).length;

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
      progress.xp > 0 ? progress.xp : inferTotalXpFromProgress(progress);
    const lvl = deriveLevel(xp);

    return {
      cleared,
      totalStars,
      possibleStars,
      bossesCleared,
      totalBosses,
      fastestTime,
      fastestStageId,
      averageTime,
      timeSamples,
      level: lvl.level,
      title: titleForLevel(lvl.level),
      xp,
      xpIntoLevel: lvl.xpIntoLevel,
      xpForNext: lvl.xpForNext,
      levelProgress: lvl.progress,
    };
  }, [progress]);

  const timeHistogram = useMemo(() => {
    if (!progress) return [];
    // Bin best times into 30-second buckets, cap at 5+ minutes.
    const buckets: number[] = new Array(11).fill(0); // 0:30 .. 5:00, last is 5:00+
    for (const t of Object.values(progress.bestTimes)) {
      const secs = Math.floor(t / 1000);
      const idx = Math.min(buckets.length - 1, Math.floor(secs / 30));
      buckets[idx] += 1;
    }
    return buckets;
  }, [progress]);

  const weekdayCounts = useMemo(() => {
    const arr = new Array(7).fill(0);
    for (const e of events) {
      const d = new Date(e.ts);
      arr[d.getDay()] += 1;
    }
    return arr;
  }, [events]);

  const hourBuckets = useMemo(() => {
    // 4-hour buckets so a casual schedule shows a clear pattern.
    const arr = new Array(6).fill(0);
    for (const e of events) {
      const h = new Date(e.ts).getHours();
      arr[Math.min(5, Math.floor(h / 4))] += 1;
    }
    return arr;
  }, [events]);

  const difficultyBreakdown = useMemo(() => {
    const out = { relax: 0, standard: 0, master: 0 };
    if (events.length > 0) {
      for (const e of events) out[e.difficulty] += 1;
      return out;
    }
    // Fallback: derive what we can from progress (standard cleared count,
    // and per-difficulty buckets).
    if (!progress) return out;
    out.standard = Object.keys(progress.bestTimes).length;
    out.relax = Object.keys(progress.bestByDifficulty.relax).length;
    out.master = Object.keys(progress.bestByDifficulty.master).length;
    return out;
  }, [events, progress]);

  if (!open) return null;
  if (!summary) {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center fade-in-soft"
        style={{ background: "var(--bg-app)", color: "var(--ink-mute)" }}
      >
        통계를 불러오는 중…
      </div>
    );
  }

  const completionPct =
    Math.round((summary.cleared / TOTAL_STAGE_COUNT) * 1000) / 10;
  const starsPct = summary.possibleStars
    ? Math.round((summary.totalStars / summary.possibleStars) * 100)
    : 0;
  const tier = daily ? currentTier(daily.streak) : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-stretch justify-center fade-in-soft overflow-y-auto"
      style={{ background: "var(--bg-app)" }}
    >
      <div className="w-full max-w-md flex flex-col">
        <header
          className="sticky top-0 z-10 flex items-center justify-between px-4 py-3"
          style={{
            background: "var(--bg-app)",
            borderBottom: "1px solid var(--line)",
          }}
        >
          <div>
            <div
              className="text-[11px] uppercase tracking-[0.18em] font-bold"
              style={{ color: "var(--ink-mute)" }}
            >
              Statistics
            </div>
            <div
              className="text-base font-semibold"
              style={{ color: "var(--ink-1)" }}
            >
              나의 기록
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

        <div className="px-4 py-4 space-y-5">
          {/* Level card */}
          <section
            className="rounded-2xl px-4 py-4"
            style={{
              background: "var(--bg-surface)",
              border: "1px solid var(--line)",
            }}
          >
            <div className="flex items-center gap-3">
              <div
                className="flex items-center justify-center w-14 h-14 rounded-full font-bold text-xl tabular-nums"
                style={{
                  background: "var(--accent)",
                  color: "var(--accent-fg)",
                }}
              >
                {summary.level}
              </div>
              <div className="flex-1 min-w-0">
                <div
                  className="text-[10px] tracking-[0.18em] font-bold"
                  style={{ color: "var(--ink-mute)" }}
                >
                  LEVEL {summary.level}
                </div>
                <div
                  className="text-lg font-semibold leading-tight"
                  style={{ color: "var(--ink-1)" }}
                >
                  {summary.title}
                </div>
                <div
                  className="mt-1 text-[11px] tabular-nums"
                  style={{ color: "var(--ink-mute)" }}
                >
                  {summary.xpIntoLevel.toLocaleString()} /{" "}
                  {summary.xpForNext.toLocaleString()} XP · 다음 레벨까지{" "}
                  {(summary.xpForNext - summary.xpIntoLevel).toLocaleString()}
                </div>
              </div>
            </div>
            <div
              className="mt-3 h-2 w-full rounded-full overflow-hidden"
              style={{ background: "var(--bg-elevated)" }}
            >
              <div
                className="xp-bar-fill h-full"
                style={{
                  width: `${Math.round(summary.levelProgress * 100)}%`,
                }}
              />
            </div>
            <div
              className="mt-3 grid grid-cols-3 text-center text-[11px]"
              style={{ color: "var(--ink-mute)" }}
            >
              <Stat
                label="누적 XP"
                value={summary.xp.toLocaleString()}
              />
              <Stat
                label="레벨업까지"
                value={`${Math.round(summary.levelProgress * 100)}%`}
              />
              <Stat
                label="다음 단계"
                value={`Lv.${summary.level + 1} · ${xpRequiredFor(
                  summary.level + 1
                ).toLocaleString()} XP`}
              />
            </div>
          </section>

          {/* Progress */}
          <SectionHeader title="진행도" />
          <div className="grid grid-cols-2 gap-3">
            <BigStat
              label="클리어 스테이지"
              value={summary.cleared.toLocaleString()}
              hint={`${completionPct}% 완료`}
              pct={completionPct / 100}
            />
            <BigStat
              label="획득한 별"
              value={`★ ${summary.totalStars}`}
              hint={
                summary.possibleStars > 0
                  ? `${starsPct}% (${summary.totalStars}/${summary.possibleStars})`
                  : "데이터 없음"
              }
              pct={starsPct / 100}
              accent="gold"
            />
            <BigStat
              label="보스 격파"
              value={`${summary.bossesCleared}`}
              hint={`전체 보스 ${summary.totalBosses}개 중`}
              pct={
                summary.totalBosses > 0
                  ? summary.bossesCleared / summary.totalBosses
                  : 0
              }
              accent="danger"
            />
            <BigStat
              label="최단 클리어"
              value={
                summary.fastestTime != null
                  ? formatTime(summary.fastestTime)
                  : "—"
              }
              hint={
                summary.fastestStageId != null
                  ? `스테이지 ${summary.fastestStageId}`
                  : "기록 없음"
              }
            />
            <BigStat
              label="최고 Flow"
              value={
                progress?.lifetimeBestFlow
                  ? `×${progress.lifetimeBestFlow}`
                  : "—"
              }
              hint="한 판에 연속 스냅한 횟수"
            />
            {progress && (
              <BigStat
                label="테세라"
                value={`◆ ${tesseraBalance(progress).toLocaleString()}`}
                hint={`누적 ${earnedTessera(progress).toLocaleString()} · 사용 ${
                  progress.tesseraSpent?.toLocaleString() ?? 0
                }`}
                accent="gold"
              />
            )}
          </div>

          {/* Daily */}
          {daily && (
            <>
              <SectionHeader title="데일리 챌린지" />
              <section
                className="rounded-2xl px-4 py-4"
                style={{
                  background: "var(--bg-surface)",
                  border: "1px solid var(--line)",
                }}
              >
                <div className="flex items-baseline justify-between">
                  <div>
                    <div
                      className="text-[11px] tracking-[0.16em] uppercase font-bold"
                      style={{ color: "var(--gold)" }}
                    >
                      현재 연속
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span
                        className="text-3xl font-bold tabular-nums"
                        style={{ color: "var(--ink-1)" }}
                      >
                        {daily.streak}
                      </span>
                      <span
                        className="text-base font-semibold"
                        style={{ color: "var(--ink-mute)" }}
                      >
                        일
                      </span>
                      {tier && (
                        <span
                          aria-hidden
                          className="text-2xl ml-1"
                          style={{ color: "var(--gold)" }}
                        >
                          {tier.flair}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div
                      className="text-[11px] tracking-[0.16em] uppercase font-bold"
                      style={{ color: "var(--ink-mute)" }}
                    >
                      최고 연속
                    </div>
                    <div
                      className="text-3xl font-bold tabular-nums"
                      style={{ color: "var(--ink-2)" }}
                    >
                      {daily.bestStreak}
                    </div>
                  </div>
                </div>
                <div
                  className="mt-3 pt-3 grid grid-cols-3 text-center text-[11px]"
                  style={{
                    color: "var(--ink-mute)",
                    borderTop: "1px solid var(--line)",
                  }}
                >
                  <Stat
                    label="누적 클리어"
                    value={`${daily.totalCleared}회`}
                  />
                  <Stat label="오늘" value={daily.cleared ? "완료" : "대기"} />
                  <Stat
                    label="오늘 별"
                    value={daily.stars ? `★${daily.stars}` : "—"}
                  />
                </div>
              </section>
            </>
          )}

          {/* Time histogram */}
          {summary.timeSamples > 0 && (
            <>
              <SectionHeader
                title="클리어 시간 분포"
                hint={`평균 ${formatTime(summary.averageTime)}`}
              />
              <section
                className="rounded-2xl px-4 py-4"
                style={{
                  background: "var(--bg-surface)",
                  border: "1px solid var(--line)",
                }}
              >
                <Histogram
                  buckets={timeHistogram}
                  labels={[
                    "0:30",
                    "1:00",
                    "1:30",
                    "2:00",
                    "2:30",
                    "3:00",
                    "3:30",
                    "4:00",
                    "4:30",
                    "5:00",
                    "5+",
                  ]}
                />
              </section>
            </>
          )}

          {/* Activity heatmaps — populated forward from playEvents */}
          {events.length > 0 ? (
            <>
              <SectionHeader title="플레이 패턴" hint={`최근 ${events.length}회`} />
              <section
                className="rounded-2xl px-4 py-4 space-y-4"
                style={{
                  background: "var(--bg-surface)",
                  border: "1px solid var(--line)",
                }}
              >
                <Heatmap
                  title="요일"
                  buckets={weekdayCounts}
                  labels={["일", "월", "화", "수", "목", "금", "토"]}
                />
                <Heatmap
                  title="시간대"
                  buckets={hourBuckets}
                  labels={[
                    "0–4",
                    "4–8",
                    "8–12",
                    "12–16",
                    "16–20",
                    "20–24",
                  ]}
                />
              </section>
            </>
          ) : (
            <>
              <SectionHeader title="플레이 패턴" />
              <div
                className="rounded-2xl px-4 py-6 text-center"
                style={{
                  background: "var(--bg-surface)",
                  border: "1px solid var(--line)",
                  color: "var(--ink-mute)",
                }}
              >
                플레이가 쌓이면 요일·시간대 패턴이 보여요.
              </div>
            </>
          )}

          {/* Achievements */}
          <section
            className="rounded-2xl px-4 py-4"
            style={{
              background: "var(--bg-surface)",
              border: "1px solid var(--line)",
            }}
          >
            <AchievementsRow
              ctx={progress ? { progress, daily, personalCount } : null}
            />
          </section>

          {/* Difficulty breakdown */}
          <SectionHeader title="난이도" />
          <section
            className="rounded-2xl px-4 py-4 space-y-2"
            style={{
              background: "var(--bg-surface)",
              border: "1px solid var(--line)",
            }}
          >
            {(() => {
              const max = Math.max(
                1,
                difficultyBreakdown.relax,
                difficultyBreakdown.standard,
                difficultyBreakdown.master
              );
              return (
                <>
                  <DiffBar
                    label="릴랙스"
                    count={difficultyBreakdown.relax}
                    max={max}
                    color="var(--ink-2)"
                  />
                  <DiffBar
                    label="스탠다드"
                    count={difficultyBreakdown.standard}
                    max={max}
                    color="var(--accent)"
                    emphasize
                  />
                  <DiffBar
                    label="마스터"
                    count={difficultyBreakdown.master}
                    max={max}
                    color="var(--danger)"
                  />
                </>
              );
            })()}
          </section>

          <div
            className="text-center text-[10px] tracking-[0.28em] font-semibold py-3"
            style={{ color: "var(--ink-mute)" }}
          >
            TESSERA · 끝없는 길
          </div>
        </div>
      </div>
    </div>
  );
}

function SectionHeader({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="flex items-baseline justify-between px-1">
      <div
        className="text-[10px] font-bold tracking-[0.18em] uppercase"
        style={{ color: "var(--ink-mute)" }}
      >
        {title}
      </div>
      {hint && (
        <div
          className="text-[11px] tabular-nums"
          style={{ color: "var(--ink-mute)" }}
        >
          {hint}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div
        className="text-[10px] tracking-[0.12em] uppercase font-semibold"
        style={{ color: "var(--ink-mute)" }}
      >
        {label}
      </div>
      <div
        className="mt-0.5 font-semibold tabular-nums"
        style={{ color: "var(--ink-1)", fontSize: 12 }}
      >
        {value}
      </div>
    </div>
  );
}

function BigStat({
  label,
  value,
  hint,
  pct,
  accent,
}: {
  label: string;
  value: string;
  hint: string;
  pct?: number;
  accent?: "gold" | "danger";
}) {
  const barColor =
    accent === "gold"
      ? "var(--gold)"
      : accent === "danger"
      ? "var(--danger)"
      : "var(--accent)";
  return (
    <div
      className="rounded-2xl px-3 py-3"
      style={{
        background: "var(--bg-surface)",
        border: "1px solid var(--line)",
      }}
    >
      <div
        className="text-[10px] tracking-[0.14em] uppercase font-bold"
        style={{ color: "var(--ink-mute)" }}
      >
        {label}
      </div>
      <div
        className="mt-1 text-2xl font-bold tabular-nums leading-tight"
        style={{ color: "var(--ink-1)" }}
      >
        {value}
      </div>
      <div
        className="text-[11px] tabular-nums"
        style={{ color: "var(--ink-mute)" }}
      >
        {hint}
      </div>
      {pct != null && (
        <div
          className="mt-2 h-1.5 rounded-full overflow-hidden"
          style={{ background: "var(--bg-elevated)" }}
        >
          <div
            className="h-full rounded-full"
            style={{
              width: `${Math.min(100, Math.max(0, Math.round(pct * 100)))}%`,
              background: barColor,
              transition: "width 480ms cubic-bezier(0.2,0.8,0.2,1)",
            }}
          />
        </div>
      )}
    </div>
  );
}

function Histogram({
  buckets,
  labels,
}: {
  buckets: number[];
  labels: string[];
}) {
  const max = Math.max(1, ...buckets);
  return (
    <div className="flex items-end gap-1 h-28">
      {buckets.map((c, i) => {
        const h = Math.round((c / max) * 100);
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            <div
              className="w-full rounded-md"
              style={{
                height: `${Math.max(2, h)}%`,
                background:
                  c > 0 ? "var(--accent)" : "var(--bg-elevated)",
                opacity: c > 0 ? 1 : 0.4,
                transition: "height 320ms cubic-bezier(0.2,0.8,0.2,1)",
              }}
              title={`${labels[i]} · ${c}`}
            />
            <div
              className="text-[9px] tabular-nums"
              style={{ color: "var(--ink-mute)" }}
            >
              {labels[i]}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Heatmap({
  title,
  buckets,
  labels,
}: {
  title: string;
  buckets: number[];
  labels: string[];
}) {
  const max = Math.max(1, ...buckets);
  return (
    <div>
      <div
        className="text-[11px] mb-1.5 font-semibold"
        style={{ color: "var(--ink-2)" }}
      >
        {title}
      </div>
      <div className="grid grid-cols-7 gap-1" style={{ gridTemplateColumns: `repeat(${buckets.length}, minmax(0, 1fr))` }}>
        {buckets.map((c, i) => {
          const intensity = c / max;
          return (
            <div key={i} className="flex flex-col items-center gap-1">
              <div
                className="w-full rounded-md"
                style={{
                  aspectRatio: 1,
                  background:
                    intensity > 0
                      ? `color-mix(in srgb, var(--accent) ${Math.max(
                          15,
                          Math.round(intensity * 100)
                        )}%, var(--bg-elevated))`
                      : "var(--bg-elevated)",
                }}
                title={`${labels[i]} · ${c}`}
              />
              <div
                className="text-[9px] tabular-nums"
                style={{ color: "var(--ink-mute)" }}
              >
                {labels[i]}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DiffBar({
  label,
  count,
  max,
  color,
  emphasize,
}: {
  label: string;
  count: number;
  max: number;
  color: string;
  emphasize?: boolean;
}) {
  const pct = max > 0 ? Math.round((count / max) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <div
        className="w-16 text-[12px] font-semibold"
        style={{ color: "var(--ink-2)" }}
      >
        {label}
      </div>
      <div
        className="flex-1 h-2 rounded-full overflow-hidden"
        style={{ background: "var(--bg-elevated)" }}
      >
        <div
          className="h-full rounded-full"
          style={{
            background: color,
            width: `${pct}%`,
            opacity: emphasize ? 1 : 0.85,
            transition: "width 360ms cubic-bezier(0.2,0.8,0.2,1)",
          }}
        />
      </div>
      <div
        className="w-10 text-right tabular-nums text-[12px] font-semibold"
        style={{ color: "var(--ink-1)" }}
      >
        {count}
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
