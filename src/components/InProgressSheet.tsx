"use client";

import { useEffect, useState } from "react";
import {
  clearSavedGameFor,
  listSavedGames,
  type SavedGameSnapshot,
} from "@/lib/savedGame";
import { getStage } from "@/data/stages";
import { getStageImageDataUrl, THUMB_SIZE } from "@/lib/stageImage";

type Props = {
  open: boolean;
  onClose: () => void;
  onResume: (stageId: number) => void;
};

// Lists every in-progress puzzle so the player can hop between them. Adults
// often rotate through a few puzzles rather than playing in a strict line.
export default function InProgressSheet({ open, onClose, onResume }: Props) {
  const [items, setItems] = useState<SavedGameSnapshot[]>([]);

  useEffect(() => {
    if (!open) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setItems(listSavedGames());
  }, [open]);

  if (!open) return null;

  const discard = (stageId: number) => {
    clearSavedGameFor(stageId);
    setItems(listSavedGames());
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3 fade-in-soft"
      style={{ background: "var(--bg-overlay)" }}
    >
      <div
        className="w-full max-w-sm rounded-2xl px-5 py-5"
        style={{
          background: "var(--bg-surface)",
          border: "1px solid var(--line)",
          maxHeight: "82vh",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div className="flex items-start justify-between flex-none">
          <div>
            <div
              className="text-[11px] uppercase tracking-[0.18em] font-bold"
              style={{ color: "var(--ink-mute)" }}
            >
              In progress
            </div>
            <div
              className="text-lg font-semibold"
              style={{ color: "var(--ink-1)" }}
            >
              진행 중인 퍼즐 {items.length}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="press-95 rounded-full px-3 py-1 text-xs font-medium"
            style={{
              background: "var(--bg-elevated)",
              color: "var(--ink-2)",
              border: "1px solid var(--line)",
            }}
          >
            닫기
          </button>
        </div>

        <div className="mt-3 overflow-y-auto flex-1 space-y-2 -mx-1 px-1">
          {items.length === 0 ? (
            <div
              className="text-center py-10 text-sm"
              style={{ color: "var(--ink-mute)" }}
            >
              진행 중인 퍼즐이 없어요
            </div>
          ) : (
            items.map((item) => (
              <Row
                key={item.stageId}
                snapshot={item}
                onResume={() => {
                  onClose();
                  onResume(item.stageId);
                }}
                onDiscard={() => discard(item.stageId)}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function Row({
  snapshot,
  onResume,
  onDiscard,
}: {
  snapshot: SavedGameSnapshot;
  onResume: () => void;
  onDiscard: () => void;
}) {
  const stage = getStage(snapshot.stageId);
  const thumb = getStageImageDataUrl(snapshot.stageId, THUMB_SIZE);
  const elapsed = formatTime(snapshot.elapsedMs);
  const correct = snapshot.pieces.filter((p) => {
    const home = p.origRow * (stage?.cols ?? 1) + p.origCol;
    return p.currentIndex === home && (p.rotation ?? 0) === 0;
  }).length;
  const total = snapshot.pieces.length;
  const savedAgo = relativeTime(snapshot.savedAt);

  return (
    <div
      className="flex items-stretch rounded-xl overflow-hidden"
      style={{
        background: "var(--bg-elevated)",
        border: "1px solid var(--line)",
      }}
    >
      <div className="w-16 flex-none relative">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={thumb}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
          decoding="async"
        />
      </div>
      <button
        type="button"
        onClick={onResume}
        className="press-95 flex-1 px-3 py-2 text-left"
      >
        <div className="flex items-center justify-between">
          <div
            className="text-sm font-semibold"
            style={{ color: "var(--ink-1)" }}
          >
            {stage?.title ?? `스테이지 ${snapshot.stageId}`}
            {stage?.isBoss && (
              <span
                className="ml-1.5 text-[10px] tracking-[0.14em] font-bold"
                style={{ color: "var(--danger)" }}
              >
                BOSS
              </span>
            )}
          </div>
          <div
            className="text-[11px] font-semibold tabular-nums"
            style={{ color: "var(--ink-mute)" }}
          >
            {elapsed}
          </div>
        </div>
        <div
          className="text-[11px] mt-0.5 tabular-nums"
          style={{ color: "var(--ink-mute)" }}
        >
          {correct}/{total} 맞춤 · {savedAgo}
        </div>
      </button>
      <button
        type="button"
        onClick={onDiscard}
        aria-label="이 슬롯 버리기"
        className="press-95 px-3 flex items-center justify-center"
        style={{
          borderLeft: "1px solid var(--line)",
          color: "var(--ink-mute)",
        }}
      >
        <span style={{ fontSize: 16 }} aria-hidden>
          ⨯
        </span>
      </button>
    </div>
  );
}

function formatTime(ms: number): string {
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function relativeTime(ts: number): string {
  const diffSec = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (diffSec < 60) return "방금";
  const min = Math.floor(diffSec / 60);
  if (min < 60) return `${min}분 전`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}시간 전`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `${day}일 전`;
  const mo = Math.floor(day / 30);
  return `${mo}달 전`;
}
