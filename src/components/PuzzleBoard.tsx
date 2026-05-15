"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import dynamic from "next/dynamic";

// Defer the confetti bundle until it's actually needed (post-solve).
const Confetti = dynamic(() => import("./Confetti"), { ssr: false });
import {
  clearSavedGame,
  clearSavedGameFor,
  loadGameFor,
  saveGame,
  type SavedGameSnapshot,
} from "@/lib/savedGame";
import {
  clearPersonalGame,
  loadPersonalGame,
  savePersonalGame,
} from "@/lib/personalSavedGame";
import { loadDaily } from "@/lib/daily";
import { currentTier } from "@/lib/dailyRewards";
import {
  playGroupMerge,
  playHint,
  playLockIn,
  playRotate,
  playSnap,
  playSolve,
  playUndo,
} from "@/lib/sound";
import { pulse } from "@/lib/haptics";
import type { Difficulty } from "@/lib/difficulty";
import { getDifficultyMeta } from "@/lib/difficulty";
import { shareClear, type ShareResult } from "@/lib/shareCard";
import { useBackButton } from "@/lib/backNav";

type Rotation = 0 | 1 | 2 | 3;

type Piece = {
  id: number;
  origRow: number;
  origCol: number;
  currentIndex: number;
  // 0..3 representing 0°/90°/180°/270° clockwise. Only nonzero in Master mode.
  rotation: Rotation;
};

type Joined = { top: boolean; right: boolean; bottom: boolean; left: boolean };

type Props = {
  imageSrc: string;
  rows: number;
  cols: number;
  isBoss?: boolean;
  stageLabel?: string;
  stageId?: number;
  personalId?: string;
  totalStages?: number;
  parTimeMs?: number;
  previousBestMs?: number;
  isDaily?: boolean;
  difficulty?: Difficulty;
  bossConstraints?: import("@/data/stages").BossConstraints;
  zen?: boolean;
  onSolved?: (
    durationMs: number,
    stars: number,
    hintsUsed: number,
    flowBest: number
  ) => void;
  onExit?: () => void;
  onNext?: () => void;
  hasNext?: boolean;
};

export default function PuzzleBoard(props: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const { imageSrc, rows, cols } = props;

  const [imageAspect, setImageAspect] = useState<number | null>(null);
  const [boardSize, setBoardSize] = useState<{ w: number; h: number } | null>(null);
  // Boss/daily intro: brief photo reveal before the puzzle materializes.
  // Skipped when the player is resuming a saved game (mid-puzzle reentry
  // shouldn't be blocked) or replaying a stage they've already cleared
  // (the reveal is for first-time impact, not friction on every replay).
  const [showIntro, setShowIntro] = useState(() => {
    if (typeof window === "undefined") return false;
    if (!props.isBoss && !props.isDaily) return false;
    if (props.stageId != null && loadGameFor(props.stageId)) return false;
    if (props.personalId && loadPersonalGame(props.personalId)) return false;
    if (props.previousBestMs != null) return false;
    return true;
  });

  useEffect(() => {
    if (!showIntro) return;
    const t = window.setTimeout(() => setShowIntro(false), 1200);
    return () => window.clearTimeout(t);
  }, [showIntro]);

  // Skip the intro reveal on back press so the player isn't forced to
  // wait out the timer just to abort.
  useBackButton(showIntro, () => setShowIntro(false));

  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      const a = img.naturalWidth / img.naturalHeight;
      setImageAspect(Number.isFinite(a) && a > 0 ? a : 1);
    };
    img.onerror = () => setImageAspect(1);
    img.src = imageSrc;
  }, [imageSrc]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || !imageAspect) return;

    const measure = () => {
      const rect = el.getBoundingClientRect();
      const availW = rect.width;
      const availH = rect.height;
      if (availW <= 0 || availH <= 0) return;
      const tileTarget = Math.min(availW / cols, availH / rows);
      const w = Math.floor(tileTarget * cols);
      const h = Math.floor(tileTarget * rows);
      setBoardSize((prev) => {
        if (prev && prev.w === w && prev.h === h) return prev;
        return { w, h };
      });
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [imageAspect, rows, cols]);

  return (
    <div
      className="flex h-[100dvh] flex-col"
      style={{ background: "var(--bg-app)" }}
    >
      <Header
        isBoss={props.isBoss}
        stageLabel={props.stageLabel}
        stageId={props.stageId}
        totalStages={props.totalStages}
        difficulty={props.difficulty}
        onExit={props.onExit}
      />
      <div
        ref={containerRef}
        className="relative flex-1 mx-2 mb-3 mt-1 overflow-hidden flex items-center justify-center"
      >
        {boardSize && !showIntro ? (
          <Board
            key={`${boardSize.w}x${boardSize.h}-${rows}x${cols}-${imageSrc.length}-${props.difficulty ?? "standard"}-${props.zen ? "zen" : "std"}`}
            imageSrc={imageSrc}
            rows={rows}
            cols={cols}
            boardSize={boardSize}
            isBoss={props.isBoss}
            stageId={props.stageId}
            personalId={props.personalId}
            stageLabel={props.stageLabel}
            parTimeMs={props.parTimeMs}
            previousBestMs={props.previousBestMs}
            isDaily={props.isDaily}
            difficulty={props.difficulty}
            rotateMode={props.difficulty === "master"}
            bossConstraints={props.bossConstraints}
            zen={props.zen}
            onSolved={props.onSolved}
            onExit={props.onExit}
            onNext={props.onNext}
            hasNext={props.hasNext}
          />
        ) : (
          <div style={{ color: "var(--ink-mute)" }}>준비 중…</div>
        )}
        {showIntro && (
          <IntroReveal
            imageSrc={imageSrc}
            isBoss={!!props.isBoss}
            stageLabel={props.stageLabel}
            bossConstraints={props.bossConstraints}
            onSkip={() => setShowIntro(false)}
          />
        )}
      </div>
    </div>
  );
}

function IntroReveal({
  imageSrc,
  isBoss,
  stageLabel,
  bossConstraints,
  onSkip,
}: {
  imageSrc: string;
  isBoss: boolean;
  stageLabel?: string;
  bossConstraints?: import("@/data/stages").BossConstraints;
  onSkip: () => void;
}) {
  const eyebrow = isBoss ? "Boss" : "Daily";
  const subtitle = isBoss ? "도전이 시작됩니다" : "오늘의 그림";
  const constraintLabels: string[] = [];
  if (bossConstraints?.noPreview) constraintLabels.push("미리보기 잠김");
  else if (bossConstraints?.bwPreview) constraintLabels.push("흑백 미리보기");
  if (bossConstraints?.parMultiplier && bossConstraints.parMultiplier < 1) {
    const pct = Math.round((1 - bossConstraints.parMultiplier) * 100);
    constraintLabels.push(`시간 −${pct}%`);
  }
  return (
    <button
      type="button"
      onClick={onSkip}
      aria-label="건너뛰기"
      className="absolute inset-0 z-20 flex items-center justify-center fade-in-soft"
      style={{ background: "var(--bg-app)" }}
    >
      <div className="intro-reveal w-full max-w-md px-3 flex flex-col items-center">
        <div
          className="text-[10px] tracking-[0.32em] font-bold mb-2"
          style={{
            color: isBoss ? "var(--danger)" : "var(--gold)",
          }}
        >
          {eyebrow.toUpperCase()}
        </div>
        <div
          className="intro-reveal-photo relative w-full overflow-hidden rounded-2xl"
          style={{
            aspectRatio: 1,
            background: "var(--bg-elevated)",
            border: `1px solid ${
              isBoss ? "var(--danger)" : "var(--line)"
            }`,
            boxShadow: isBoss
              ? "0 18px 50px rgba(179,53,31,0.35)"
              : "0 12px 40px rgba(0,0,0,0.25)",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageSrc}
            alt=""
            decoding="async"
            className="absolute inset-0 h-full w-full object-cover"
          />
          {isBoss && (
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background:
                  "radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.45) 100%)",
              }}
            />
          )}
        </div>
        <div
          className="mt-4 text-lg font-semibold"
          style={{ color: "var(--ink-1)" }}
        >
          {stageLabel ?? "Puzzle"}
        </div>
        <div
          className="mt-1 text-[12px]"
          style={{ color: "var(--ink-mute)" }}
        >
          {subtitle}
        </div>
        {constraintLabels.length > 0 && (
          <div className="mt-2 flex flex-wrap items-center justify-center gap-1.5">
            {constraintLabels.map((label) => (
              <span
                key={label}
                className="rounded-full px-2 py-0.5 text-[10px] font-bold tracking-[0.08em]"
                style={{
                  background: "var(--danger-soft)",
                  color: "var(--danger)",
                  border: "1px solid var(--danger)",
                }}
              >
                {label}
              </span>
            ))}
          </div>
        )}
        <div
          className="intro-reveal-progress mt-4 h-1 w-32 rounded-full overflow-hidden"
          style={{ background: "var(--bg-elevated)" }}
        >
          <div
            className="intro-reveal-bar h-full"
            style={{
              background: isBoss ? "var(--danger)" : "var(--gold)",
            }}
          />
        </div>
        <div
          className="mt-3 text-[10px] tracking-[0.16em]"
          style={{ color: "var(--ink-mute)" }}
        >
          탭하여 시작 · TAP TO START
        </div>
      </div>
    </button>
  );
}

function Header({
  isBoss,
  stageLabel,
  stageId,
  totalStages,
  difficulty,
  onExit,
}: {
  isBoss?: boolean;
  stageLabel?: string;
  stageId?: number;
  totalStages?: number;
  difficulty?: Difficulty;
  onExit?: () => void;
}) {
  const diff = difficulty ? getDifficultyMeta(difficulty) : null;
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <button
        type="button"
        onClick={onExit}
        className="press-95 rounded-full px-3 py-1.5 text-sm font-medium"
        style={{
          background: "var(--bg-surface)",
          color: "var(--ink-2)",
          border: "1px solid var(--line)",
        }}
      >
        ← 목록
      </button>
      <div className="flex flex-col items-center">
        <div
          className="text-[10px] tracking-[0.18em] uppercase font-semibold"
          style={{ color: isBoss ? "var(--danger)" : "var(--ink-mute)" }}
        >
          {isBoss ? "Boss" : "Stage"}
          {diff ? ` · ${diff.en}` : ""}
        </div>
        <div
          className="text-[15px] font-semibold leading-tight"
          style={{ color: "var(--ink-1)" }}
        >
          {stageLabel ?? "Puzzle"}
        </div>
      </div>
      <div
        className="text-[11px] font-semibold tabular-nums min-w-[64px] text-right"
        style={{ color: "var(--ink-mute)" }}
      >
        {stageId != null && totalStages != null ? `${stageId}/${totalStages}` : ""}
      </div>
    </div>
  );
}

type BoardProps = {
  imageSrc: string;
  rows: number;
  cols: number;
  boardSize: { w: number; h: number };
  isBoss?: boolean;
  stageId?: number;
  personalId?: string;
  stageLabel?: string;
  parTimeMs?: number;
  previousBestMs?: number;
  isDaily?: boolean;
  difficulty?: Difficulty;
  rotateMode?: boolean;
  bossConstraints?: import("@/data/stages").BossConstraints;
  zen?: boolean;
  onSolved?: (
    durationMs: number,
    stars: number,
    hintsUsed: number,
    flowBest: number
  ) => void;
  onExit?: () => void;
  onNext?: () => void;
  hasNext?: boolean;
};

type InitialBoardState = {
  pieces: Piece[];
  elapsedMs: number;
  hintsLeft: number;
  hintsUsed: number;
};

function initialBoardState(
  stageId: number | undefined,
  personalId: string | undefined,
  rows: number,
  cols: number,
  initialHints: number,
  rotateMode: boolean
): InitialBoardState {
  let saved:
    | SavedGameSnapshot
    | { pieces: SavedGameSnapshot["pieces"]; elapsedMs: number; hintsLeft: number; hintsUsed: number }
    | null = null;
  if (personalId) {
    saved = loadPersonalGame(personalId);
  } else if (stageId != null) {
    saved = loadGameFor(stageId);
  }
  if (saved && saved.pieces.length === rows * cols) {
    return {
      pieces: saved.pieces.map((p) => ({
        id: p.id,
        origRow: p.origRow,
        origCol: p.origCol,
        currentIndex: p.currentIndex,
        rotation: ((p.rotation ?? 0) % 4) as Rotation,
      })),
      elapsedMs: saved.elapsedMs,
      hintsLeft: saved.hintsLeft,
      hintsUsed: saved.hintsUsed,
    };
  }
  return {
    pieces: buildShuffledPieces(rows, cols, rotateMode),
    elapsedMs: 0,
    hintsLeft: initialHints,
    hintsUsed: 0,
  };
}

function computeStars(durationMs: number, parMs: number | undefined): 1 | 2 | 3 {
  if (!parMs || parMs <= 0) return 1;
  if (durationMs <= parMs) return 3;
  if (durationMs <= parMs * 1.8) return 2;
  return 1;
}

function buildShuffledPieces(
  rows: number,
  cols: number,
  rotateMode: boolean = false
): Piece[] {
  const total = rows * cols;
  const pieces: Piece[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      pieces.push({
        id: r * cols + c,
        origRow: r,
        origCol: c,
        currentIndex: 0,
        rotation: 0,
      });
    }
  }
  const indices = Array.from({ length: total }, (_, i) => i);
  for (let attempt = 0; attempt < 5; attempt++) {
    for (let i = total - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    let identity = true;
    for (let i = 0; i < total; i++) {
      if (indices[i] !== i) {
        identity = false;
        break;
      }
    }
    if (!identity) break;
  }
  pieces.forEach((p, i) => {
    p.currentIndex = indices[i];
    if (rotateMode) {
      // Random nonzero rotation so every piece starts misaligned.
      p.rotation = (1 + Math.floor(Math.random() * 3)) as Rotation;
    }
  });
  return pieces;
}

function isEdgePiece(p: Piece, rows: number, cols: number): boolean {
  return (
    p.origRow === 0 ||
    p.origCol === 0 ||
    p.origRow === rows - 1 ||
    p.origCol === cols - 1
  );
}

function Board({
  imageSrc,
  rows,
  cols,
  boardSize,
  isBoss,
  stageId,
  personalId,
  stageLabel,
  parTimeMs,
  previousBestMs,
  isDaily,
  difficulty,
  rotateMode,
  bossConstraints,
  zen,
  onSolved,
  onExit,
  onNext,
  hasNext,
}: BoardProps) {
  const boardRef = useRef<HTMLDivElement | null>(null);

  const initialHints = isBoss ? 2 : 3;
  const [initial] = useState<InitialBoardState>(() =>
    initialBoardState(stageId, personalId, rows, cols, initialHints, !!rotateMode)
  );

  const [pieces, setPieces] = useState<Piece[]>(initial.pieces);
  const [dragGroup, setDragGroup] = useState<Set<number> | null>(null);
  const [dragHeadId, setDragHeadId] = useState<number | null>(null);
  const [dragDelta, setDragDelta] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [hoverDelta, setHoverDelta] = useState<{ row: number; col: number } | null>(null);
  const [startedAt, setStartedAt] = useState<number>(() => Date.now() - initial.elapsedMs);
  const [now, setNow] = useState<number>(() => Date.now());
  const [solved, setSolved] = useState(false);
  const [showSolveModal, setShowSolveModal] = useState(false);
  const [hintsLeft, setHintsLeft] = useState(initial.hintsLeft);
  const [hintsUsed, setHintsUsed] = useState(initial.hintsUsed);
  const [pausedAt, setPausedAt] = useState<number | null>(null);
  const [pausedTotal, setPausedTotal] = useState(0);
  const [showPreview, setShowPreview] = useState(false);
  const [reshuffleConfirming, setReshuffleConfirming] = useState(false);
  const reshuffleTimerRef = useRef<number | null>(null);
  const [history, setHistory] = useState<Piece[][]>([]);
  const initialUndos = isBoss ? 3 : 5;
  const [undosLeft, setUndosLeft] = useState(initialUndos);
  const [moveCount, setMoveCount] = useState(0);

  // Flow-state tracking — consecutive snap-joins within a tight window light up
  // a subtle ring around the timer. No popups, no number explosions.
  const [flowCount, setFlowCount] = useState(0);
  const [flowBest, setFlowBest] = useState(0);
  // Mirror flow values into a ref so the snap handler can read the latest
  // value at solve-time without taking a dep on every flow tick (which
  // would re-create the pointer-up callback on each snap).
  const flowRef = useRef({ count: 0, best: 0 });
  useEffect(() => {
    flowRef.current = { count: flowCount, best: flowBest };
  });
  const lastSnapAtRef = useRef<number>(0);
  const flowDecayTimerRef = useRef<number | null>(null);

  // Tool toggles
  const [edgeHighlight, setEdgeHighlight] = useState(false);
  // Explicit pause (independent from visibilitychange).
  const [manualPaused, setManualPaused] = useState(false);

  // Back press inside the puzzle dismisses transient overlays first
  // (preview, reshuffle confirmation, pause), then the solve modal, before
  // bubbling up to the parent's "return to menu" handler.
  useBackButton(showPreview, () => setShowPreview(false));
  useBackButton(reshuffleConfirming, () => setReshuffleConfirming(false));
  useBackButton(manualPaused, () => setManualPaused(false));
  useBackButton(showSolveModal, () => setShowSolveModal(false));

  const dragOffsetRef = useRef<{
    ox: number;
    oy: number;
    pointerId: number;
    headStartCol: number;
    headStartRow: number;
  } | null>(null);

  useEffect(() => {
    if (solved) return;
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(id);
  }, [solved]);

  // Auto-pause on tab hide.
  useEffect(() => {
    const onVis = () => {
      if (document.hidden) {
        setPausedAt((prev) => prev ?? Date.now());
      } else {
        setPausedAt((prev) => {
          if (manualPaused) return prev;
          if (prev != null) setPausedTotal((t) => t + (Date.now() - prev));
          return null;
        });
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [manualPaused]);

  // Manual pause syncs with pausedAt.
  useEffect(() => {
    if (manualPaused) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPausedAt((prev) => prev ?? Date.now());
    } else {
      setPausedAt((prev) => {
        if (prev != null) setPausedTotal((t) => t + (Date.now() - prev));
        return null;
      });
    }
  }, [manualPaused]);

  useEffect(() => {
    if (!solved) return;
    const t = window.setTimeout(() => setShowSolveModal(true), 800);
    return () => window.clearTimeout(t);
  }, [solved]);

  useEffect(() => {
    if (solved) return;
    if (stageId == null && !personalId) return;
    const effectiveStop = pausedAt ?? Date.now();
    const elapsedMs = Math.max(0, effectiveStop - startedAt - pausedTotal);
    const pieceSnapshot = pieces.map((p) => ({
      id: p.id,
      origRow: p.origRow,
      origCol: p.origCol,
      currentIndex: p.currentIndex,
      rotation: p.rotation,
    }));
    if (personalId) {
      savePersonalGame({
        photoId: personalId,
        rows,
        cols,
        rotate: !!rotateMode,
        pieces: pieceSnapshot,
        elapsedMs,
        hintsLeft,
        hintsUsed,
      });
    } else if (stageId != null) {
      saveGame({
        stageId,
        pieces: pieceSnapshot,
        elapsedMs,
        hintsLeft,
        hintsUsed,
      });
    }
  }, [pieces, hintsLeft, hintsUsed, startedAt, pausedTotal, pausedAt, stageId, personalId, rows, cols, rotateMode, solved]);

  const snapshotStateRef = useRef({
    pieces,
    hintsLeft,
    hintsUsed,
    startedAt,
    pausedTotal,
    pausedAt,
  });
  useEffect(() => {
    snapshotStateRef.current = {
      pieces,
      hintsLeft,
      hintsUsed,
      startedAt,
      pausedTotal,
      pausedAt,
    };
  });
  const persistSnapshot = useCallback(() => {
    const s = snapshotStateRef.current;
    if (s.pieces.length === 0) return;
    const effectiveStop = s.pausedAt ?? Date.now();
    const elapsedMs = Math.max(0, effectiveStop - s.startedAt - s.pausedTotal);
    const pieceSnapshot = s.pieces.map((p) => ({
      id: p.id,
      origRow: p.origRow,
      origCol: p.origCol,
      currentIndex: p.currentIndex,
      rotation: p.rotation,
    }));
    if (personalId) {
      savePersonalGame({
        photoId: personalId,
        rows,
        cols,
        rotate: !!rotateMode,
        pieces: pieceSnapshot,
        elapsedMs,
        hintsLeft: s.hintsLeft,
        hintsUsed: s.hintsUsed,
      });
    } else if (stageId != null) {
      saveGame({
        stageId,
        pieces: pieceSnapshot,
        elapsedMs,
        hintsLeft: s.hintsLeft,
        hintsUsed: s.hintsUsed,
      });
    }
  }, [personalId, stageId, rows, cols, rotateMode]);

  useEffect(() => {
    if (solved) return;
    if (stageId == null && !personalId) return;
    const id = window.setInterval(persistSnapshot, 10000);
    return () => window.clearInterval(id);
  }, [stageId, personalId, solved, persistSnapshot]);

  useEffect(() => {
    const onVis = () => {
      if (!document.hidden || solved) return;
      if (stageId == null && !personalId) return;
      persistSnapshot();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [stageId, personalId, solved, persistSnapshot]);

  useEffect(() => {
    if (!solved) return;
    if (personalId) clearPersonalGame(personalId);
    else if (stageId != null) clearSavedGameFor(stageId);
    else clearSavedGame();
  }, [solved, stageId, personalId]);

  const pieceW = boardSize.w / cols;
  const pieceH = boardSize.h / rows;

  const joined = useMemo(() => computeJoined(pieces, rows, cols), [pieces, rows, cols]);

  const onPointerDown = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>, piece: Piece) => {
      if (solved || pausedAt != null) return;
      const board = boardRef.current;
      if (!board) return;
      e.currentTarget.setPointerCapture(e.pointerId);
      const rect = board.getBoundingClientRect();
      const cr = Math.floor(piece.currentIndex / cols);
      const cc = piece.currentIndex % cols;
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;
      dragOffsetRef.current = {
        ox: px - cc * pieceW,
        oy: py - cr * pieceH,
        pointerId: e.pointerId,
        headStartCol: cc,
        headStartRow: cr,
      };
      const group = findGroup(piece.id, pieces, cols, joined);
      setDragGroup(group);
      setDragHeadId(piece.id);
      setDragDelta({ x: 0, y: 0 });
      setHoverDelta({ row: 0, col: 0 });
    },
    [solved, pausedAt, cols, pieceW, pieceH, pieces, joined]
  );

  const onPointerMove = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      const off = dragOffsetRef.current;
      if (!off || off.pointerId !== e.pointerId || dragGroup === null) return;
      const board = boardRef.current;
      if (!board) return;
      const rect = board.getBoundingClientRect();
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;
      const headX = px - off.ox;
      const headY = py - off.oy;
      const dx = headX - off.headStartCol * pieceW;
      const dy = headY - off.headStartRow * pieceH;
      setDragDelta({ x: dx, y: dy });
      setHoverDelta({
        row: Math.round(dy / pieceH),
        col: Math.round(dx / pieceW),
      });
    },
    [dragGroup, pieceW, pieceH]
  );

  const bumpFlow = useCallback(() => {
    const now = Date.now();
    const within = now - lastSnapAtRef.current < 4500;
    const next = within ? Math.min(99, flowCount + 1) : 1;
    setFlowCount(next);
    setFlowBest((b) => Math.max(b, next));
    lastSnapAtRef.current = now;
    if (flowDecayTimerRef.current) window.clearTimeout(flowDecayTimerRef.current);
    flowDecayTimerRef.current = window.setTimeout(() => {
      setFlowCount(0);
    }, 5500);
  }, [flowCount]);

  const finishDrag = useCallback(
    (pointerId: number) => {
      const off = dragOffsetRef.current;
      if (!off || off.pointerId !== pointerId || dragGroup === null) return;
      dragOffsetRef.current = null;

      const groupIds = dragGroup;
      const delta = dragDelta;
      const rDeltaCol = Math.round(delta.x / pieceW);
      const rDeltaRow = Math.round(delta.y / pieceH);
      const headId = dragHeadId;
      const groupSize = dragGroup.size;
      const totalMove = Math.abs(delta.x) + Math.abs(delta.y);

      setDragGroup(null);
      setDragHeadId(null);
      setDragDelta({ x: 0, y: 0 });
      setHoverDelta(null);

      // Tap (no meaningful drag) on a single rotated/rotatable piece in Master
      // mode → rotate 90° clockwise. We require single-piece group so a tap on
      // a joined cluster never accidentally breaks it.
      if (
        rotateMode &&
        totalMove < 6 &&
        groupSize === 1 &&
        headId != null
      ) {
        let landedAtZero = false;
        setPieces((prev) =>
          prev.map((p) => {
            if (p.id !== headId) return p;
            const nextRotation = (((p.rotation + 1) % 4) as Rotation);
            if (nextRotation === 0) landedAtZero = true;
            return { ...p, rotation: nextRotation };
          })
        );
        if (landedAtZero) {
          playLockIn();
          pulse("lockIn");
        } else {
          playRotate();
          pulse("rotate");
        }
        return;
      }

      if (rDeltaCol === 0 && rDeltaRow === 0) return;

      setPieces((prev) => {
        const next = applyGroupMove(prev, groupIds, rDeltaRow, rDeltaCol, rows, cols);
        if (!next) return prev;

        setHistory((h) => [...h.slice(-9), prev]);
        setMoveCount((n) => n + 1);

        const isSolved = next.every(
          (p) =>
            p.currentIndex === p.origRow * cols + p.origCol && p.rotation === 0
        );
        if (isSolved && !solved) {
          const duration = Math.max(0, Date.now() - startedAt - pausedTotal);
          const stars = computeStars(duration, parTimeMs);
          setSolved(true);
          // Capture flowBest *including* the snap that just solved — that
          // joining edge bumps flow up by one beyond the state visible
          // here, so the eventual SolveModal still reads the live flowBest
          // state but the persisted record matches what's celebrated.
          const f = flowRef.current;
          onSolved?.(duration, stars, hintsUsed, Math.max(f.best, f.count));
          playSolve();
          pulse("solve");
        } else {
          const before = countJoinedEdges(prev, rows, cols);
          const after = countJoinedEdges(next, rows, cols);
          const joined = after - before;
          if (joined > 0) {
            bumpFlow();
            if (joined >= 2) {
              playGroupMerge();
              pulse("merge");
            } else {
              playSnap();
              pulse("snap");
            }
          }
        }
        return next;
      });
    },
    [
      dragGroup,
      dragHeadId,
      dragDelta,
      pieceW,
      pieceH,
      rows,
      cols,
      solved,
      startedAt,
      pausedTotal,
      parTimeMs,
      hintsUsed,
      onSolved,
      bumpFlow,
      rotateMode,
    ]
  );

  const totalPieces = rows * cols;
  const correctCount = useMemo(
    () =>
      pieces.filter(
        (p) =>
          p.currentIndex === p.origRow * cols + p.origCol && p.rotation === 0
      ).length,
    [pieces, cols]
  );
  const effectiveStop = pausedAt ?? now;
  const elapsed = Math.max(0, effectiveStop - startedAt - pausedTotal);

  const useHint = useCallback(() => {
    if (solved || hintsLeft <= 0 || pausedAt != null) return;
    setPieces((prev) => {
      const wrong = prev.filter(
        (p) =>
          p.currentIndex !== p.origRow * cols + p.origCol || p.rotation !== 0
      );
      if (wrong.length === 0) return prev;
      const target = wrong[Math.floor(Math.random() * wrong.length)];
      const home = target.origRow * cols + target.origCol;
      const occ = prev.find((p) => p.currentIndex === home);
      if (!occ) return prev;
      setHistory((h) => [...h.slice(-9), prev]);
      setMoveCount((n) => n + 1);
      return prev.map((p) => {
        if (p.id === target.id)
          return { ...p, currentIndex: home, rotation: 0 as Rotation };
        if (p.id === occ.id) return { ...p, currentIndex: target.currentIndex };
        return p;
      });
    });
    setHintsLeft((h) => h - 1);
    setHintsUsed((h) => h + 1);
    playHint();
    pulse("hint");
  }, [solved, hintsLeft, cols, pausedAt]);

  const replay = useCallback(() => {
    if (reshuffleTimerRef.current) {
      window.clearTimeout(reshuffleTimerRef.current);
      reshuffleTimerRef.current = null;
    }
    setReshuffleConfirming(false);
    if (personalId) clearPersonalGame(personalId);
    else if (stageId != null) clearSavedGameFor(stageId);
    setPieces(buildShuffledPieces(rows, cols, !!rotateMode));
    setStartedAt(Date.now());
    setNow(Date.now());
    setPausedTotal(0);
    setPausedAt(null);
    setManualPaused(false);
    setHintsLeft(initialHints);
    setHintsUsed(0);
    setHistory([]);
    setUndosLeft(initialUndos);
    setMoveCount(0);
    setFlowCount(0);
    setFlowBest(0);
    setSolved(false);
    setShowSolveModal(false);
  }, [rows, cols, initialHints, initialUndos, rotateMode, stageId, personalId]);

  const undo = useCallback(() => {
    if (solved || undosLeft <= 0 || history.length === 0 || pausedAt != null) return;
    const last = history[history.length - 1];
    setPieces(last);
    setHistory((h) => h.slice(0, -1));
    setUndosLeft((u) => u - 1);
    setMoveCount((n) => Math.max(0, n - 1));
    setDragGroup(null);
    setDragHeadId(null);
    setDragDelta({ x: 0, y: 0 });
    setHoverDelta(null);
    playUndo();
    pulse("undo");
  }, [solved, undosLeft, history, pausedAt]);

  const reshuffle = useCallback(() => {
    if (solved) return;
    if (!reshuffleConfirming) {
      setReshuffleConfirming(true);
      if (reshuffleTimerRef.current) window.clearTimeout(reshuffleTimerRef.current);
      reshuffleTimerRef.current = window.setTimeout(() => {
        setReshuffleConfirming(false);
        reshuffleTimerRef.current = null;
      }, 2200);
      return;
    }
    if (reshuffleTimerRef.current) {
      window.clearTimeout(reshuffleTimerRef.current);
      reshuffleTimerRef.current = null;
    }
    setReshuffleConfirming(false);
    if (personalId) clearPersonalGame(personalId);
    else if (stageId != null) clearSavedGameFor(stageId);
    setPieces(buildShuffledPieces(rows, cols, !!rotateMode));
    setStartedAt(Date.now());
    setPausedTotal(0);
    setPausedAt(null);
    setManualPaused(false);
    setHintsLeft(initialHints);
    setHintsUsed(0);
    setHistory([]);
    setUndosLeft(initialUndos);
    setMoveCount(0);
    setFlowCount(0);
    setFlowBest(0);
  }, [rows, cols, solved, initialHints, initialUndos, reshuffleConfirming, rotateMode, stageId, personalId]);

  const flowActive = flowCount >= 2;

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex items-center gap-2">
        <div
          className={`rounded-full px-4 py-1.5 text-sm font-medium tabular-nums shadow-sm ${
            flowActive ? "flow-ring" : ""
          }`}
          style={{
            background: "var(--bg-surface)",
            color: "var(--ink-1)",
            border: "1px solid var(--line)",
          }}
        >
          {formatTime(elapsed)} · {correctCount}/{totalPieces}
        </div>
        {flowActive && (
          <div
            className="rounded-full px-2.5 py-1 text-[10px] font-bold tracking-[0.14em] uppercase"
            style={{
              background: "var(--accent-soft)",
              color: "var(--accent-soft-fg)",
            }}
          >
            Flow ×{flowCount}
          </div>
        )}
        {pausedAt != null && (
          <div
            className="rounded-full px-2.5 py-1 text-[11px] font-semibold"
            style={{ background: "var(--ink-2)", color: "var(--bg-surface)" }}
          >
            일시정지
          </div>
        )}
      </div>

      <div
        ref={boardRef}
        className={`relative rounded-lg overflow-hidden ${
          solved ? "puzzle-solved-pulse" : ""
        }`}
        style={{
          width: boardSize.w,
          height: boardSize.h,
          touchAction: "none",
          background: "var(--bg-board)",
          border: isBoss
            ? "2px solid var(--danger)"
            : "1px solid var(--line)",
          boxShadow: "inset 0 0 0 1px var(--line-soft)",
        }}
      >
        {showPreview && !bossConstraints?.noPreview && (
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              backgroundImage: `url(${imageSrc})`,
              backgroundSize: "100% 100%",
              backgroundRepeat: "no-repeat",
              opacity: 0.92,
              filter: bossConstraints?.bwPreview ? "grayscale(1)" : "none",
              zIndex: 50,
            }}
          />
        )}
        {dragGroup && hoverDelta && (() => {
          let anyOOB = false;
          const cells: Array<{ r: number; c: number }> = [];
          dragGroup.forEach((id) => {
            const p = pieces.find((pp) => pp.id === id);
            if (!p) return;
            const cr = Math.floor(p.currentIndex / cols);
            const cc = p.currentIndex % cols;
            const nr = cr + hoverDelta.row;
            const nc = cc + hoverDelta.col;
            if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) {
              anyOOB = true;
              return;
            }
            cells.push({ r: nr, c: nc });
          });
          const color = anyOOB ? "rgba(179,53,31,0.7)" : "rgba(138,90,43,0.7)";
          const bg = anyOOB ? "rgba(179,53,31,0.10)" : "rgba(138,90,43,0.10)";
          return (
            <>
              {cells.map((cell, i) => (
                <div
                  key={i}
                  className="pointer-events-none absolute rounded-sm"
                  style={{
                    width: pieceW,
                    height: pieceH,
                    transform: `translate3d(${cell.c * pieceW}px, ${cell.r * pieceH}px, 0)`,
                    border: `1.5px solid ${color}`,
                    background: bg,
                  }}
                />
              ))}
            </>
          );
        })()}

        {pieces.map((p) => {
          const inGroup = dragGroup?.has(p.id) ?? false;
          const isHead = dragHeadId === p.id;
          const cr = Math.floor(p.currentIndex / cols);
          const cc = p.currentIndex % cols;
          const baseX = cc * pieceW;
          const baseY = cr * pieceH;
          const x = inGroup ? baseX + dragDelta.x : baseX;
          const y = inGroup ? baseY + dragDelta.y : baseY;
          const j = joined[p.id] ?? { top: false, right: false, bottom: false, left: false };
          const inCorrect =
            p.currentIndex === p.origRow * cols + p.origCol &&
            p.rotation === 0;
          const edgeMark = edgeHighlight && isEdgePiece(p, rows, cols);
          const rotated = p.rotation !== 0;
          return (
            <div
              key={p.id}
              className="puzzle-piece absolute will-change-transform select-none"
              style={{
                width: pieceW,
                height: pieceH,
                transform: `translate3d(${x}px, ${y}px, 0) rotate(${p.rotation * 90}deg) ${
                  inGroup ? "scale(1.02)" : ""
                }`,
                transformOrigin: "center",
                zIndex: inGroup ? 100 + (isHead ? 1 : 0) : inCorrect ? 1 : 2,
                backgroundImage: `url(${imageSrc})`,
                backgroundSize: `${boardSize.w}px ${boardSize.h}px`,
                backgroundPosition: `-${p.origCol * pieceW}px -${p.origRow * pieceH}px`,
                opacity: dragGroup && !inGroup ? 0.78 : 1,
                transition: inGroup
                  ? "none"
                  : "transform 220ms cubic-bezier(0.2, 0.8, 0.2, 1), opacity 180ms",
                boxShadow: inGroup ? "0 10px 24px rgba(0,0,0,0.32)" : "none",
                outline: isHead
                  ? "2px solid var(--accent)"
                  : edgeMark
                  ? "2px solid rgba(212,160,92,0.85)"
                  : rotated
                  ? "1.5px dashed rgba(212,160,92,0.55)"
                  : "none",
                outlineOffset: -2,
                borderTop: j.top ? "0" : "1px solid rgba(255,255,255,0.45)",
                borderRight: j.right ? "0" : "1px solid rgba(255,255,255,0.45)",
                borderBottom: j.bottom ? "0" : "1px solid rgba(255,255,255,0.45)",
                borderLeft: j.left ? "0" : "1px solid rgba(255,255,255,0.45)",
              }}
              onPointerDown={(e) => onPointerDown(e, p)}
              onPointerMove={onPointerMove}
              onPointerUp={(e) => finishDrag(e.pointerId)}
              onPointerCancel={(e) => finishDrag(e.pointerId)}
            />
          );
        })}
      </div>

      <Toolbar
        solved={solved}
        paused={pausedAt != null}
        manualPaused={manualPaused}
        onPause={() => setManualPaused((v) => !v)}
        hintsLeft={hintsLeft}
        useHint={useHint}
        undosLeft={undosLeft}
        canUndo={history.length > 0}
        undo={undo}
        showPreview={showPreview}
        togglePreview={() => setShowPreview((v) => !v)}
        previewDisabled={!!bossConstraints?.noPreview}
        edgeHighlight={edgeHighlight}
        toggleEdge={() => setEdgeHighlight((v) => !v)}
        reshuffleConfirming={reshuffleConfirming}
        reshuffle={reshuffle}
      />

      {solved && <Confetti count={isBoss ? 60 : 36} />}

      {manualPaused && !solved && (
        <PauseOverlay onResume={() => setManualPaused(false)} onExit={onExit} />
      )}

      {showSolveModal && (
        <SolveModal
          stageId={stageId}
          stageLabel={stageLabel}
          isBoss={!!isBoss}
          isDaily={!!isDaily}
          difficulty={difficulty}
          elapsed={elapsed}
          parTimeMs={parTimeMs}
          previousBestMs={previousBestMs}
          moveCount={moveCount}
          hintsUsed={hintsUsed}
          flowBest={flowBest}
          zen={!!zen}
          onExit={onExit}
          onReplay={replay}
          onNext={hasNext ? onNext : onExit}
          nextLabel={zen ? "또 한 판 ▶" : hasNext ? "다음 ▶" : "완료"}
        />
      )}
    </div>
  );
}

function Toolbar({
  solved,
  paused,
  manualPaused,
  onPause,
  hintsLeft,
  useHint,
  undosLeft,
  canUndo,
  undo,
  showPreview,
  togglePreview,
  previewDisabled,
  edgeHighlight,
  toggleEdge,
  reshuffleConfirming,
  reshuffle,
}: {
  solved: boolean;
  paused: boolean;
  manualPaused: boolean;
  onPause: () => void;
  hintsLeft: number;
  useHint: () => void;
  undosLeft: number;
  canUndo: boolean;
  undo: () => void;
  showPreview: boolean;
  togglePreview: () => void;
  previewDisabled?: boolean;
  edgeHighlight: boolean;
  toggleEdge: () => void;
  reshuffleConfirming: boolean;
  reshuffle: () => void;
}) {
  return (
    <div className="flex items-center gap-1.5 flex-wrap justify-center px-2">
      <ToolButton
        onClick={onPause}
        disabled={solved}
        active={manualPaused}
        label={manualPaused ? "재개" : "일시정지"}
        glyph={manualPaused ? "▶" : "❚❚"}
      />
      <ToolButton
        onClick={undo}
        disabled={solved || !canUndo || paused || undosLeft <= 0}
        label={`되돌리기 ${undosLeft}`}
        glyph="↶"
      />
      <ToolButton
        onClick={useHint}
        disabled={solved || hintsLeft <= 0 || paused}
        accent={hintsLeft > 1}
        danger={hintsLeft === 1}
        label={`힌트 ${hintsLeft}`}
        glyph="✦"
      />
      <ToolButton
        onClick={togglePreview}
        active={showPreview}
        disabled={previewDisabled}
        label={previewDisabled ? "미리보기 잠김" : "미리보기"}
        glyph="◐"
      />
      <ToolButton
        onClick={toggleEdge}
        active={edgeHighlight}
        label="테두리"
        glyph="◻"
      />
      <ToolButton
        onClick={reshuffle}
        disabled={solved}
        danger={reshuffleConfirming}
        label={reshuffleConfirming ? "한 번 더" : "다시 섞기"}
        glyph="⟳"
      />
    </div>
  );
}

function ToolButton({
  onClick,
  disabled,
  active,
  accent,
  danger,
  label,
  glyph,
}: {
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  accent?: boolean;
  danger?: boolean;
  label: string;
  glyph: string;
}) {
  const bg = danger
    ? "var(--danger)"
    : accent
    ? "var(--accent)"
    : active
    ? "var(--accent-soft)"
    : "var(--bg-surface)";
  const fg = danger
    ? "#fff"
    : accent
    ? "var(--accent-fg)"
    : active
    ? "var(--accent-soft-fg)"
    : "var(--ink-2)";
  const border =
    accent || danger
      ? "transparent"
      : active
      ? "var(--accent)"
      : "var(--line)";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="press-95 rounded-full px-3 py-2 text-[12px] font-semibold shadow-sm flex items-center gap-1.5 disabled:opacity-45"
      style={{
        background: bg,
        color: fg,
        border: `1px solid ${border}`,
      }}
    >
      <span aria-hidden style={{ fontSize: 13 }}>
        {glyph}
      </span>
      <span>{label}</span>
    </button>
  );
}

function PauseOverlay({
  onResume,
  onExit,
}: {
  onResume: () => void;
  onExit?: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4 fade-in-soft"
      style={{ background: "var(--bg-overlay)" }}
    >
      <div
        className="w-full max-w-sm rounded-2xl px-6 py-6 text-center"
        style={{ background: "var(--bg-surface)", border: "1px solid var(--line)" }}
      >
        <div
          className="text-[11px] tracking-[0.2em] uppercase font-bold"
          style={{ color: "var(--ink-mute)" }}
        >
          Paused
        </div>
        <div
          className="mt-2 text-2xl font-semibold"
          style={{ color: "var(--ink-1)" }}
        >
          잠시 멈춰뒀어요
        </div>
        <div className="mt-1 text-sm" style={{ color: "var(--ink-3)" }}>
          준비되면 이어서 풀어주세요.
        </div>
        <div className="mt-6 flex gap-2">
          <button
            type="button"
            onClick={onExit}
            className="press-95 flex-1 rounded-full py-3 text-sm font-semibold"
            style={{
              background: "var(--bg-elevated)",
              color: "var(--ink-2)",
              border: "1px solid var(--line)",
            }}
          >
            목록으로
          </button>
          <button
            type="button"
            onClick={onResume}
            className="press-95 flex-1 rounded-full py-3 text-sm font-semibold"
            style={{ background: "var(--accent)", color: "var(--accent-fg)" }}
          >
            이어하기
          </button>
        </div>
      </div>
    </div>
  );
}

function SolveModal({
  stageId,
  stageLabel,
  isBoss,
  isDaily,
  difficulty,
  elapsed,
  parTimeMs,
  previousBestMs,
  moveCount,
  hintsUsed,
  flowBest,
  zen,
  onExit,
  onReplay,
  onNext,
  nextLabel,
}: {
  stageId?: number;
  stageLabel?: string;
  isBoss: boolean;
  isDaily: boolean;
  difficulty?: Difficulty;
  elapsed: number;
  parTimeMs?: number;
  previousBestMs?: number;
  moveCount: number;
  hintsUsed: number;
  flowBest: number;
  zen: boolean;
  onExit?: () => void;
  onReplay: () => void;
  onNext?: () => void;
  nextLabel: string;
}) {
  const stars = computeStars(elapsed, parTimeMs);
  const isPerfect = stars === 3 && hintsUsed === 0;
  const isNewRecord = previousBestMs == null || elapsed < previousBestMs;
  const diff = difficulty ? getDifficultyMeta(difficulty) : null;
  const [shareBusy, setShareBusy] = useState(false);
  const [shareToast, setShareToast] = useState<string | null>(null);
  const isPersonal = stageId == null;
  const streakDisplay = useMemo(() => {
    if (!isDaily) return null;
    const d = loadDaily();
    if (d.streak <= 0) return null;
    const tier = currentTier(d.streak);
    return { streak: d.streak, flair: tier?.flair };
  }, [isDaily]);

  const handleShare = async () => {
    if (shareBusy) return;
    setShareBusy(true);
    try {
      const result: ShareResult = await shareClear({
        stageId: stageId ?? 0,
        stageTitle: stageLabel ?? "Puzzle",
        durationMs: elapsed,
        stars,
        difficulty: difficulty ?? "standard",
        isBoss,
        isDaily,
        isPersonal,
        streak: streakDisplay?.streak,
        flowBest,
      });
      const label =
        result === "shared"
          ? "공유됨"
          : result === "downloaded"
          ? "이미지가 저장됐어요"
          : result === "text-copied"
          ? "텍스트가 복사됐어요"
          : "공유 실패";
      setShareToast(label);
      window.setTimeout(() => setShareToast(null), 2200);
    } finally {
      setShareBusy(false);
    }
  };

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 flex items-end justify-center p-3 pointer-events-none solve-sheet-enter">
      <div
        className="rounded-2xl px-6 py-5 text-center w-full max-w-sm pointer-events-auto shadow-2xl"
        style={{
          background: "var(--bg-surface)",
          border: "1px solid var(--line)",
        }}
      >
        <div
          className="text-[11px] uppercase tracking-[0.18em] font-bold"
          style={{
            color: zen
              ? "var(--success)"
              : isBoss
              ? "var(--danger)"
              : "var(--accent)",
          }}
        >
          {zen ? "Zen 쉼터" : isBoss ? "Boss Cleared" : "Cleared"}
          {!zen && diff ? ` · ${diff.en}` : ""}
        </div>
        <div
          className="mt-1 text-2xl font-semibold"
          style={{ color: "var(--ink-1)" }}
        >
          {zen ? "쉬어가는 한 판" : "완성했어요"}
        </div>
        {!zen && <StarsRow count={stars} />}
        <div
          className="mt-2 text-3xl font-bold tabular-nums"
          style={{ color: "var(--ink-1)" }}
        >
          {formatTime(elapsed)}
        </div>
        <div className="mt-2 flex flex-wrap items-center justify-center gap-1.5 text-[11px] font-semibold">
          {zen ? (
            <Tag tone="soft">시간 없이</Tag>
          ) : isNewRecord ? (
            <Tag tone="accent">신기록</Tag>
          ) : (
            <Tag tone="soft">이전 최고 {formatTime(previousBestMs!)}</Tag>
          )}
          {!zen && isPerfect && <Tag tone="gold">Perfect</Tag>}
          {!zen && isDaily && <Tag tone="gold">오늘의 도전</Tag>}
          {!zen && streakDisplay && (
            <Tag tone="gold">
              {streakDisplay.flair ? `${streakDisplay.flair} ` : ""}
              {streakDisplay.streak}일 연속
            </Tag>
          )}
          <Tag tone="soft">{moveCount}회 이동</Tag>
          {hintsUsed > 0 && <Tag tone="soft">힌트 {hintsUsed}</Tag>}
          {flowBest >= 4 && <Tag tone="accent">Flow ×{flowBest}</Tag>}
        </div>
        <button
          type="button"
          onClick={handleShare}
          disabled={shareBusy}
          className="press-95 mt-4 w-full rounded-full py-2.5 text-[12px] font-semibold tracking-[0.16em] uppercase"
          style={{
            background: "transparent",
            color: "var(--ink-2)",
            border: "1px solid var(--line)",
          }}
        >
          {shareBusy ? "그리는 중…" : shareToast ?? "↗ 결과 공유"}
        </button>
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={onExit}
            className="press-95 flex-1 rounded-full py-3 text-sm font-semibold"
            style={{
              background: "var(--bg-elevated)",
              color: "var(--ink-2)",
              border: "1px solid var(--line)",
            }}
          >
            목록
          </button>
          <button
            type="button"
            onClick={onReplay}
            className="press-95 flex-1 rounded-full py-3 text-sm font-semibold"
            style={{
              background: "var(--accent-soft)",
              color: "var(--accent-soft-fg)",
              border: "1px solid var(--accent)",
            }}
          >
            다시
          </button>
          <button
            type="button"
            onClick={onNext}
            className="press-95 flex-1 rounded-full py-3 text-sm font-semibold"
            style={{ background: "var(--accent)", color: "var(--accent-fg)" }}
          >
            {nextLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function Tag({
  tone,
  children,
}: {
  tone: "accent" | "soft" | "gold";
  children: React.ReactNode;
}) {
  const styles: React.CSSProperties =
    tone === "accent"
      ? {
          background: "var(--accent)",
          color: "var(--accent-fg)",
        }
      : tone === "gold"
      ? {
          background: "var(--gold-soft)",
          color: "var(--gold)",
          border: "1px solid var(--gold)",
        }
      : {
          background: "var(--bg-elevated)",
          color: "var(--ink-3)",
          border: "1px solid var(--line)",
        };
  return (
    <span
      className="rounded-full px-2.5 py-0.5"
      style={{ ...styles, fontWeight: 600 }}
    >
      {children}
    </span>
  );
}

function computeJoined(pieces: Piece[], rows: number, cols: number): Record<number, Joined> {
  const byIndex = new Map<number, Piece>();
  for (const p of pieces) byIndex.set(p.currentIndex, p);

  const out: Record<number, Joined> = {};
  for (const p of pieces) {
    out[p.id] = { top: false, right: false, bottom: false, left: false };
  }

  for (const p of pieces) {
    // Rotated pieces never join — they must be straightened first.
    if (p.rotation !== 0) continue;
    const ci = p.currentIndex;
    const cr = Math.floor(ci / cols);
    const cc = ci % cols;
    if (cc < cols - 1) {
      const right = byIndex.get(ci + 1);
      if (
        right &&
        right.rotation === 0 &&
        right.origRow === p.origRow &&
        right.origCol === p.origCol + 1
      ) {
        out[p.id].right = true;
        out[right.id].left = true;
      }
    }
    if (cr < rows - 1) {
      const below = byIndex.get(ci + cols);
      if (
        below &&
        below.rotation === 0 &&
        below.origCol === p.origCol &&
        below.origRow === p.origRow + 1
      ) {
        out[p.id].bottom = true;
        out[below.id].top = true;
      }
    }
  }
  return out;
}

function countJoinedEdges(pieces: Piece[], rows: number, cols: number): number {
  const j = computeJoined(pieces, rows, cols);
  let n = 0;
  for (const v of Object.values(j)) {
    if (v.right) n++;
    if (v.bottom) n++;
  }
  return n;
}

function findGroup(
  startId: number,
  pieces: Piece[],
  cols: number,
  joined: Record<number, Joined>
): Set<number> {
  const byIdx = new Map<number, Piece>();
  for (const p of pieces) byIdx.set(p.currentIndex, p);
  const byId = new Map<number, Piece>();
  for (const p of pieces) byId.set(p.id, p);

  const visited = new Set<number>();
  const queue: number[] = [startId];
  while (queue.length > 0) {
    const id = queue.shift()!;
    if (visited.has(id)) continue;
    visited.add(id);
    const p = byId.get(id);
    const j = joined[id];
    if (!p || !j) continue;
    const ci = p.currentIndex;
    if (j.right) {
      const n = byIdx.get(ci + 1);
      if (n) queue.push(n.id);
    }
    if (j.left) {
      const n = byIdx.get(ci - 1);
      if (n) queue.push(n.id);
    }
    if (j.top) {
      const n = byIdx.get(ci - cols);
      if (n) queue.push(n.id);
    }
    if (j.bottom) {
      const n = byIdx.get(ci + cols);
      if (n) queue.push(n.id);
    }
  }
  return visited;
}

function applyGroupMove(
  pieces: Piece[],
  groupIds: Set<number>,
  rDeltaRow: number,
  rDeltaCol: number,
  rows: number,
  cols: number
): Piece[] | null {
  const groupPieces = pieces.filter((p) => groupIds.has(p.id));
  if (groupPieces.length === 0) return null;

  const oldGroupCells = new Set<number>();
  for (const p of groupPieces) oldGroupCells.add(p.currentIndex);

  const newGroupMap = new Map<number, number>();
  for (const p of groupPieces) {
    const cr = Math.floor(p.currentIndex / cols);
    const cc = p.currentIndex % cols;
    const ncr = cr + rDeltaRow;
    const ncc = cc + rDeltaCol;
    if (ncr < 0 || ncr >= rows || ncc < 0 || ncc >= cols) return null;
    newGroupMap.set(p.id, ncr * cols + ncc);
  }
  const newGroupCells = new Set<number>(newGroupMap.values());
  if (newGroupCells.size !== groupPieces.length) return null;

  const vacated: number[] = [];
  for (const c of oldGroupCells) if (!newGroupCells.has(c)) vacated.push(c);
  const contested: number[] = [];
  for (const c of newGroupCells) if (!oldGroupCells.has(c)) contested.push(c);
  vacated.sort((a, b) => a - b);
  contested.sort((a, b) => a - b);

  const displaceMap = new Map<number, number>();
  for (const p of pieces) {
    if (groupIds.has(p.id)) continue;
    const idx = contested.indexOf(p.currentIndex);
    if (idx !== -1) {
      displaceMap.set(p.id, vacated[idx]);
    }
  }

  return pieces.map((p) => {
    const ng = newGroupMap.get(p.id);
    if (ng != null) return { ...p, currentIndex: ng };
    const dp = displaceMap.get(p.id);
    if (dp != null) return { ...p, currentIndex: dp };
    return p;
  });
}

function StarsRow({ count }: { count: number }) {
  return (
    <div
      className="mt-3 flex justify-center gap-1 text-2xl"
      style={{ letterSpacing: "0.08em" }}
    >
      {[1, 2, 3].map((n) => (
        <span
          key={n}
          style={{ color: n <= count ? "var(--gold)" : "var(--ink-faint)" }}
          aria-hidden
        >
          ★
        </span>
      ))}
    </div>
  );
}

function formatTime(ms: number): string {
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}
