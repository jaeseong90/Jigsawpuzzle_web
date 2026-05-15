"use client";

import { useEffect, useMemo, useState } from "react";
import { loadProgress, type Progress } from "@/lib/progress";
import { STAGES, type Stage } from "@/data/stages";
import { getStageImageDataUrl } from "@/lib/stageImage";
import {
  deletePersonalPhoto,
  listPersonalPhotos,
  type PersonalPhoto,
} from "@/lib/personalLibrary";

type Tab = "stages" | "personal";

type Props = {
  open: boolean;
  onClose: () => void;
  onPersonalReplay?: (opts: {
    imageSrc: string;
    rows: number;
    cols: number;
    rotate: boolean;
    photoId: string;
  }) => void;
};

// A masonry-ish gallery of stages the player has cleared. Adults love
// revisiting completed photos — this is the "trophy shelf". The "내 사진"
// tab surfaces the player's own uploaded photos so they survive a tab close.
export default function PhotoGallery({
  open,
  onClose,
  onPersonalReplay,
}: Props) {
  const [progress, setProgress] = useState<Progress | null>(null);
  const [focused, setFocused] = useState<Stage | null>(null);
  const [tab, setTab] = useState<Tab>("stages");
  const [personal, setPersonal] = useState<PersonalPhoto[]>([]);
  const [focusedPersonal, setFocusedPersonal] =
    useState<PersonalPhoto | null>(null);

  useEffect(() => {
    if (!open) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setProgress(loadProgress());
    setFocused(null);
    setFocusedPersonal(null);
    listPersonalPhotos().then(setPersonal).catch(() => setPersonal([]));
  }, [open]);

  const cleared = useMemo(() => {
    if (!progress) return [];
    return STAGES.filter((s) => progress.cleared[s.id]);
  }, [progress]);

  if (!open) return null;

  const handleDelete = async (id: string) => {
    await deletePersonalPhoto(id);
    setPersonal((prev) => prev.filter((p) => p.id !== id));
    setFocusedPersonal(null);
  };

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
              {tab === "stages"
                ? `완성한 그림 ${cleared.length}점`
                : `내 사진 ${personal.length}장`}
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

        <div
          className="flex px-3 pt-3 gap-1.5"
          style={{ borderBottom: "1px solid var(--line)" }}
        >
          <TabButton
            label="스테이지"
            active={tab === "stages"}
            onClick={() => setTab("stages")}
          />
          <TabButton
            label="내 사진"
            active={tab === "personal"}
            onClick={() => setTab("personal")}
          />
        </div>

        {tab === "stages" ? (
          cleared.length === 0 ? (
            <EmptyState
              title="아직 완성한 그림이 없어요"
              hint="스테이지를 클리어하면 이 자리에 그림이 모여요."
            />
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
          )
        ) : personal.length === 0 ? (
          <EmptyState
            title="저장된 내 사진이 없어요"
            hint="홈에서 + 버튼을 눌러 내 사진으로 퍼즐을 만들어 보세요."
          />
        ) : (
          <div
            className="flex-1 overflow-y-auto px-3 py-3"
            style={{ columnCount: 2, columnGap: "10px" }}
          >
            {personal.map((p) => (
              <PersonalTile
                key={p.id}
                photo={p}
                onTap={() => setFocusedPersonal(p)}
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

      {focusedPersonal && (
        <FocusedPersonal
          photo={focusedPersonal}
          onClose={() => setFocusedPersonal(null)}
          onReplay={
            onPersonalReplay
              ? (opts) => {
                  onPersonalReplay(opts);
                  setFocusedPersonal(null);
                }
              : undefined
          }
          onDelete={handleDelete}
        />
      )}
    </div>
  );
}

function TabButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="press-95 flex-1 rounded-t-lg px-3 py-2 text-xs font-semibold"
      style={{
        background: active ? "var(--bg-app)" : "var(--bg-surface)",
        color: active ? "var(--ink-1)" : "var(--ink-mute)",
        border: "1px solid var(--line)",
        borderBottom: active ? "1px solid var(--bg-app)" : "1px solid var(--line)",
        marginBottom: -1,
      }}
    >
      {label}
    </button>
  );
}

function EmptyState({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
      <div
        className="text-base font-semibold"
        style={{ color: "var(--ink-2)" }}
      >
        {title}
      </div>
      <div className="mt-1 text-sm" style={{ color: "var(--ink-mute)" }}>
        {hint}
      </div>
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

function PersonalTile({
  photo,
  onTap,
}: {
  photo: PersonalPhoto;
  onTap: () => void;
}) {
  const [loaded, setLoaded] = useState(false);
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
      <div className="relative w-full" style={{ aspectRatio: 1 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photo.thumbDataUrl}
          alt=""
          loading="lazy"
          decoding="async"
          onLoad={() => setLoaded(true)}
          className="absolute inset-0 w-full h-full object-cover transition-opacity duration-500"
          style={{ opacity: loaded ? 1 : 0 }}
        />
        {photo.completions > 0 && (
          <span
            className="absolute top-1.5 left-1.5 rounded-full px-1.5 py-0.5 text-[9px] font-bold"
            style={{
              background: "var(--success-soft)",
              color: "var(--success)",
              letterSpacing: "0.08em",
            }}
          >
            CLEAR
          </span>
        )}
      </div>
      <div className="px-2 py-1.5 flex items-center justify-between">
        <span
          className="text-[10px] font-semibold tabular-nums"
          style={{ color: "var(--ink-mute)" }}
        >
          {photo.lastSettings.rows}×{photo.lastSettings.cols}
        </span>
        <span
          className="text-[10px] tabular-nums"
          style={{ color: "var(--ink-mute)" }}
        >
          {photo.bestTimeMs != null ? formatTime(photo.bestTimeMs) : "—"}
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

function FocusedPersonal({
  photo,
  onClose,
  onReplay,
  onDelete,
}: {
  photo: PersonalPhoto;
  onClose: () => void;
  onReplay?: (opts: {
    imageSrc: string;
    rows: number;
    cols: number;
    rotate: boolean;
    photoId: string;
  }) => void;
  onDelete: (id: string) => void | Promise<void>;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
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
            src={photo.dataUrl}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
            decoding="async"
          />
        </div>
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <div
                className="text-[11px] uppercase tracking-[0.18em] font-bold"
                style={{ color: "var(--ink-mute)" }}
              >
                My Photo
              </div>
              <div
                className="text-base font-semibold"
                style={{ color: "var(--ink-1)" }}
              >
                {photo.lastSettings.rows}×{photo.lastSettings.cols} 조각
                {photo.lastSettings.rotate && " · 회전"}
              </div>
            </div>
            <div className="text-right">
              <div
                className="text-base font-bold tabular-nums"
                style={{ color: "var(--ink-1)" }}
              >
                {photo.bestTimeMs != null ? formatTime(photo.bestTimeMs) : "—"}
              </div>
              <div
                className="text-[10px] tabular-nums"
                style={{ color: "var(--ink-mute)" }}
              >
                {photo.completions}회 완성
              </div>
            </div>
          </div>

          <div className="mt-3 flex gap-2">
            {onReplay && (
              <button
                type="button"
                onClick={() =>
                  onReplay({
                    imageSrc: photo.dataUrl,
                    rows: photo.lastSettings.rows,
                    cols: photo.lastSettings.cols,
                    rotate: photo.lastSettings.rotate,
                    photoId: photo.id,
                  })
                }
                className="press-95 flex-1 rounded-full py-2.5 text-sm font-semibold"
                style={{
                  background: "var(--accent)",
                  color: "var(--accent-fg)",
                }}
              >
                다시 풀기
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                if (confirmDelete) {
                  void onDelete(photo.id);
                } else {
                  setConfirmDelete(true);
                }
              }}
              className="press-95 rounded-full px-4 py-2.5 text-sm font-semibold"
              style={{
                background: confirmDelete
                  ? "var(--danger)"
                  : "var(--bg-elevated)",
                color: confirmDelete ? "var(--accent-fg)" : "var(--ink-2)",
                border: confirmDelete
                  ? "1px solid var(--danger)"
                  : "1px solid var(--line)",
              }}
            >
              {confirmDelete ? "정말 삭제" : "삭제"}
            </button>
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
