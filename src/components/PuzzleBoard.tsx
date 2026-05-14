"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import Confetti from "./Confetti";
import {
  clearSavedGame,
  loadGameFor,
  saveGame,
  type SavedGameSnapshot,
} from "@/lib/savedGame";
import { playSnap, playSolve } from "@/lib/sound";

type Piece = {
  // Stable identity. id encodes the piece's original (row, col) for clarity.
  id: number;
  origRow: number;
  origCol: number;
  // Where the piece is currently placed in the grid (0..rows*cols-1).
  currentIndex: number;
};

type Joined = { top: boolean; right: boolean; bottom: boolean; left: boolean };

type Props = {
  imageSrc: string;
  rows: number;
  cols: number;
  isBoss?: boolean;
  stageLabel?: string;
  stageId?: number;
  totalStages?: number;
  // Time in ms below which the player earns 3 stars (par). 1.8× par → 2 stars; else 1.
  parTimeMs?: number;
  // Best clear time the player has previously recorded for this stage. Used to
  // detect new records on completion.
  previousBestMs?: number;
  // True when this stage matches the daily challenge for today.
  isDaily?: boolean;
  onSolved?: (durationMs: number, stars: number, hintsUsed: number) => void;
  onExit?: () => void;
  onNext?: () => void;
  hasNext?: boolean;
};

export default function PuzzleBoard(props: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const { imageSrc, rows, cols } = props;

  const [imageAspect, setImageAspect] = useState<number | null>(null);
  const [boardSize, setBoardSize] = useState<{ w: number; h: number } | null>(null);

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

      // Pieces themselves should be roughly square so the puzzle stays readable.
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
    <div className="flex h-[100dvh] flex-col bg-amber-50">
      <Header
        isBoss={props.isBoss}
        stageLabel={props.stageLabel}
        stageId={props.stageId}
        totalStages={props.totalStages}
        onExit={props.onExit}
      />
      <div
        ref={containerRef}
        className="relative flex-1 mx-2 mb-3 mt-1 overflow-hidden flex items-center justify-center"
      >
        {boardSize ? (
          <Board
            key={`${boardSize.w}x${boardSize.h}-${rows}x${cols}-${imageSrc.length}`}
            imageSrc={imageSrc}
            rows={rows}
            cols={cols}
            boardSize={boardSize}
            isBoss={props.isBoss}
            stageId={props.stageId}
            parTimeMs={props.parTimeMs}
            previousBestMs={props.previousBestMs}
            isDaily={props.isDaily}
            onSolved={props.onSolved}
            onExit={props.onExit}
            onNext={props.onNext}
            hasNext={props.hasNext}
          />
        ) : (
          <div className="text-amber-700">준비 중...</div>
        )}
      </div>
    </div>
  );
}

function Header({
  isBoss,
  stageLabel,
  stageId,
  totalStages,
  onExit,
}: {
  isBoss?: boolean;
  stageLabel?: string;
  stageId?: number;
  totalStages?: number;
  onExit?: () => void;
}) {
  return (
    <div className="flex items-center justify-between px-4 py-3 text-sm">
      <button
        type="button"
        onClick={onExit}
        className="rounded-full bg-white px-3 py-1.5 shadow-sm text-amber-900 font-medium"
      >
        ← 목록
      </button>
      <div
        className={`px-3 py-1.5 rounded-full font-semibold ${
          isBoss
            ? "bg-rose-600 text-white shadow-sm"
            : "bg-white text-amber-900 shadow-sm"
        }`}
      >
        {isBoss ? `👑 ${stageLabel ?? "보스"}` : stageLabel ?? "스테이지"}
      </div>
      <div className="text-[11px] font-medium text-amber-800/80 tabular-nums min-w-[64px] text-right">
        {stageId != null && totalStages != null ? `${stageId} / ${totalStages}` : ""}
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
  parTimeMs?: number;
  previousBestMs?: number;
  isDaily?: boolean;
  onSolved?: (durationMs: number, stars: number, hintsUsed: number) => void;
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
  rows: number,
  cols: number,
  initialHints: number
): InitialBoardState {
  if (stageId != null) {
    const saved: SavedGameSnapshot | null = loadGameFor(stageId);
    if (saved && saved.pieces.length === rows * cols) {
      return {
        pieces: saved.pieces.map((p) => ({
          id: p.id,
          origRow: p.origRow,
          origCol: p.origCol,
          currentIndex: p.currentIndex,
        })),
        elapsedMs: saved.elapsedMs,
        hintsLeft: saved.hintsLeft,
        hintsUsed: saved.hintsUsed,
      };
    }
  }
  return {
    pieces: buildShuffledPieces(rows, cols),
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

function buildShuffledPieces(rows: number, cols: number): Piece[] {
  const total = rows * cols;
  const pieces: Piece[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      pieces.push({ id: r * cols + c, origRow: r, origCol: c, currentIndex: 0 });
    }
  }
  // Fisher-Yates on the index list. Re-shuffle if it happens to be already solved.
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
  });
  return pieces;
}

function Board({
  imageSrc,
  rows,
  cols,
  boardSize,
  isBoss,
  stageId,
  parTimeMs,
  previousBestMs,
  isDaily,
  onSolved,
  onExit,
  onNext,
  hasNext,
}: BoardProps) {
  const boardRef = useRef<HTMLDivElement | null>(null);

  const initialHints = isBoss ? 2 : 3;
  const [initial] = useState<InitialBoardState>(() =>
    initialBoardState(stageId, rows, cols, initialHints)
  );

  const [pieces, setPieces] = useState<Piece[]>(initial.pieces);
  const [dragGroup, setDragGroup] = useState<Set<number> | null>(null);
  const [dragHeadId, setDragHeadId] = useState<number | null>(null);
  const [dragDelta, setDragDelta] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [hoverDelta, setHoverDelta] = useState<{ row: number; col: number } | null>(null);
  // Treat the resumed elapsed time as "already played": shift startedAt backwards so
  // the on-screen timer continues from where the previous session left off.
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

  // Pause the timer while the tab is hidden so background time doesn't inflate the record.
  useEffect(() => {
    const onVis = () => {
      if (document.hidden) {
        setPausedAt(Date.now());
      } else {
        setPausedAt((prev) => {
          if (prev != null) setPausedTotal((t) => t + (Date.now() - prev));
          return null;
        });
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  // Give the player a brief moment to see the completed image before showing the modal.
  useEffect(() => {
    if (!solved) return;
    const t = window.setTimeout(() => setShowSolveModal(true), 800);
    return () => window.clearTimeout(t);
  }, [solved]);

  // Snapshot the in-progress puzzle so closing the tab and returning resumes
  // exactly where the player left off.
  useEffect(() => {
    if (stageId == null || solved) return;
    const effectiveStop = pausedAt ?? Date.now();
    const elapsedMs = Math.max(0, effectiveStop - startedAt - pausedTotal);
    saveGame({
      stageId,
      pieces: pieces.map((p) => ({
        id: p.id,
        origRow: p.origRow,
        origCol: p.origCol,
        currentIndex: p.currentIndex,
      })),
      elapsedMs,
      hintsLeft,
      hintsUsed,
    });
  }, [pieces, hintsLeft, hintsUsed, startedAt, pausedTotal, pausedAt, stageId, solved]);

  // Periodic snapshot so a long idle-then-crash still preserves the timer.
  // We read state from refs to avoid recreating the interval on every change.
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
  useEffect(() => {
    if (stageId == null || solved) return;
    const id = window.setInterval(() => {
      const s = snapshotStateRef.current;
      const effectiveStop = s.pausedAt ?? Date.now();
      const elapsedMs = Math.max(0, effectiveStop - s.startedAt - s.pausedTotal);
      saveGame({
        stageId,
        pieces: s.pieces.map((p) => ({
          id: p.id,
          origRow: p.origRow,
          origCol: p.origCol,
          currentIndex: p.currentIndex,
        })),
        elapsedMs,
        hintsLeft: s.hintsLeft,
        hintsUsed: s.hintsUsed,
      });
    }, 10000);
    return () => window.clearInterval(id);
  }, [stageId, solved]);

  // Also persist on tab hide so the snapshot survives mobile suspensions.
  useEffect(() => {
    const onVis = () => {
      if (!document.hidden || stageId == null || solved) return;
      const s = snapshotStateRef.current;
      const effectiveStop = s.pausedAt ?? Date.now();
      const elapsedMs = Math.max(0, effectiveStop - s.startedAt - s.pausedTotal);
      saveGame({
        stageId,
        pieces: s.pieces.map((p) => ({
          id: p.id,
          origRow: p.origRow,
          origCol: p.origCol,
          currentIndex: p.currentIndex,
        })),
        elapsedMs,
        hintsLeft: s.hintsLeft,
        hintsUsed: s.hintsUsed,
      });
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [stageId, solved]);

  // Once solved, drop the snapshot so the next entry is a fresh shuffle.
  useEffect(() => {
    if (solved) clearSavedGame();
  }, [solved]);

  const pieceW = boardSize.w / cols;
  const pieceH = boardSize.h / rows;

  const joined = useMemo(() => computeJoined(pieces, rows, cols), [pieces, rows, cols]);

  const onPointerDown = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>, piece: Piece) => {
      if (solved) return;
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
    [solved, cols, pieceW, pieceH, pieces, joined]
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
      // Head piece's desired top-left given the finger position.
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

  const finishDrag = useCallback(
    (pointerId: number) => {
      const off = dragOffsetRef.current;
      if (!off || off.pointerId !== pointerId || dragGroup === null) return;
      dragOffsetRef.current = null;

      const groupIds = dragGroup;
      const delta = dragDelta;
      const rDeltaCol = Math.round(delta.x / pieceW);
      const rDeltaRow = Math.round(delta.y / pieceH);

      setDragGroup(null);
      setDragHeadId(null);
      setDragDelta({ x: 0, y: 0 });
      setHoverDelta(null);

      if (rDeltaCol === 0 && rDeltaRow === 0) return;

      setPieces((prev) => {
        const next = applyGroupMove(prev, groupIds, rDeltaRow, rDeltaCol, rows, cols);
        if (!next) return prev;

        // Record the pre-move snapshot so the undo stack can roll back.
        setHistory((h) => [...h.slice(-9), prev]);
        setMoveCount((n) => n + 1);

        const isSolved = next.every((p) => p.currentIndex === p.origRow * cols + p.origCol);
        if (isSolved && !solved) {
          const duration = Math.max(0, Date.now() - startedAt - pausedTotal);
          const stars = computeStars(duration, parTimeMs);
          setSolved(true);
          onSolved?.(duration, stars, hintsUsed);
          playSolve();
          if (typeof navigator !== "undefined" && navigator.vibrate) {
            navigator.vibrate([20, 40, 80]);
          }
        } else {
          const before = countJoinedEdges(prev, rows, cols);
          const after = countJoinedEdges(next, rows, cols);
          if (after > before) {
            playSnap();
            if (typeof navigator !== "undefined" && navigator.vibrate) {
              navigator.vibrate(15);
            }
          }
        }
        return next;
      });
    },
    [dragGroup, dragDelta, pieceW, pieceH, rows, cols, solved, startedAt, pausedTotal, parTimeMs, hintsUsed, onSolved]
  );

  const totalPieces = rows * cols;
  const correctCount = useMemo(
    () => pieces.filter((p) => p.currentIndex === p.origRow * cols + p.origCol).length,
    [pieces, cols]
  );
  const effectiveStop = pausedAt ?? now;
  const elapsed = Math.max(0, effectiveStop - startedAt - pausedTotal);

  const useHint = useCallback(() => {
    if (solved || hintsLeft <= 0) return;
    setPieces((prev) => {
      const wrong = prev.filter(
        (p) => p.currentIndex !== p.origRow * cols + p.origCol
      );
      if (wrong.length === 0) return prev;
      const target = wrong[Math.floor(Math.random() * wrong.length)];
      const home = target.origRow * cols + target.origCol;
      const occ = prev.find((p) => p.currentIndex === home);
      if (!occ) return prev;
      setHistory((h) => [...h.slice(-9), prev]);
      setMoveCount((n) => n + 1);
      return prev.map((p) => {
        if (p.id === target.id) return { ...p, currentIndex: home };
        if (p.id === occ.id) return { ...p, currentIndex: target.currentIndex };
        return p;
      });
    });
    setHintsLeft((h) => h - 1);
    setHintsUsed((h) => h + 1);
    if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(12);
  }, [solved, hintsLeft, cols]);

  const replay = useCallback(() => {
    if (reshuffleTimerRef.current) {
      window.clearTimeout(reshuffleTimerRef.current);
      reshuffleTimerRef.current = null;
    }
    setReshuffleConfirming(false);
    clearSavedGame();
    setPieces(buildShuffledPieces(rows, cols));
    setStartedAt(Date.now());
    setNow(Date.now());
    setPausedTotal(0);
    setPausedAt(null);
    setHintsLeft(initialHints);
    setHintsUsed(0);
    setHistory([]);
    setUndosLeft(initialUndos);
    setMoveCount(0);
    setSolved(false);
    setShowSolveModal(false);
  }, [rows, cols, initialHints, initialUndos]);

  const undo = useCallback(() => {
    if (solved || undosLeft <= 0 || history.length === 0) return;
    const last = history[history.length - 1];
    setPieces(last);
    setHistory((h) => h.slice(0, -1));
    setUndosLeft((u) => u - 1);
    setMoveCount((n) => Math.max(0, n - 1));
    setDragGroup(null);
    setDragHeadId(null);
    setDragDelta({ x: 0, y: 0 });
    setHoverDelta(null);
    if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(10);
  }, [solved, undosLeft, history]);

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
    clearSavedGame();
    setPieces(buildShuffledPieces(rows, cols));
    setStartedAt(Date.now());
    setPausedTotal(0);
    setPausedAt(null);
    setHintsLeft(initialHints);
    setHintsUsed(0);
    setHistory([]);
    setUndosLeft(initialUndos);
    setMoveCount(0);
  }, [rows, cols, solved, initialHints, initialUndos, reshuffleConfirming]);

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex items-center gap-2">
        <div className="rounded-full bg-white/90 px-4 py-1.5 text-sm font-medium text-amber-900 tabular-nums shadow-sm">
          {formatTime(elapsed)} · {correctCount}/{totalPieces}
        </div>
        {pausedAt != null && (
          <div className="rounded-full bg-amber-700 text-white px-2.5 py-1 text-xs font-medium shadow-sm">
            일시정지
          </div>
        )}
      </div>

      <div
        ref={boardRef}
        className={`relative rounded-lg overflow-hidden ${
          isBoss ? "ring-4 ring-rose-500/60" : "ring-2 ring-amber-700/30"
        } bg-amber-100/70 shadow-inner ${solved ? "puzzle-solved-pulse" : ""}`}
        style={{ width: boardSize.w, height: boardSize.h, touchAction: "none" }}
      >
        {showPreview && (
          <div
            className="pointer-events-none absolute inset-0 opacity-30"
            style={{
              backgroundImage: `url(${imageSrc})`,
              backgroundSize: "100% 100%",
              backgroundRepeat: "no-repeat",
            }}
          />
        )}
        {dragGroup && hoverDelta && (() => {
          // Highlight each cell the group would land on at the current rounded delta.
          // If any group piece would land out of bounds, show the highlight in red.
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
          const color = anyOOB ? "rgba(220,38,38,0.6)" : "rgba(180,83,9,0.6)";
          const bg = anyOOB ? "rgba(220,38,38,0.10)" : "rgba(180,83,9,0.10)";
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
                    border: `2px solid ${color}`,
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
          const inCorrect = p.currentIndex === p.origRow * cols + p.origCol;
          return (
            <div
              key={p.id}
              className="puzzle-piece absolute will-change-transform select-none"
              style={{
                width: pieceW,
                height: pieceH,
                transform: `translate3d(${x}px, ${y}px, 0) ${inGroup ? "scale(1.02)" : ""}`,
                zIndex: inGroup ? 100 + (isHead ? 1 : 0) : inCorrect ? 1 : 2,
                backgroundImage: `url(${imageSrc})`,
                backgroundSize: `${boardSize.w}px ${boardSize.h}px`,
                backgroundPosition: `-${p.origCol * pieceW}px -${p.origRow * pieceH}px`,
                opacity: dragGroup && !inGroup ? 0.78 : 1,
                transition: inGroup
                  ? "none"
                  : "transform 180ms cubic-bezier(0.2, 0.8, 0.2, 1), opacity 180ms",
                // Drop shadow only while picked up. No inset shadow when not
                // dragging — borders below handle per-side separation so they
                // can disappear precisely on the joined edges.
                boxShadow: inGroup ? "0 10px 24px rgba(0,0,0,0.32)" : "none",
                outline: isHead ? "2px solid #b45309" : "none",
                outlineOffset: -2,
                borderTop: j.top ? "0" : "1px solid rgba(255,255,255,0.55)",
                borderRight: j.right ? "0" : "1px solid rgba(255,255,255,0.55)",
                borderBottom: j.bottom ? "0" : "1px solid rgba(255,255,255,0.55)",
                borderLeft: j.left ? "0" : "1px solid rgba(255,255,255,0.55)",
              }}
              onPointerDown={(e) => onPointerDown(e, p)}
              onPointerMove={onPointerMove}
              onPointerUp={(e) => finishDrag(e.pointerId)}
              onPointerCancel={(e) => finishDrag(e.pointerId)}
            />
          );
        })}
      </div>

      <div className="flex items-center gap-1.5 flex-wrap justify-center">
        <button
          type="button"
          onClick={undo}
          disabled={solved || undosLeft <= 0 || history.length === 0}
          className="rounded-full bg-white text-amber-900 px-3 py-2 text-sm font-medium shadow-sm border border-amber-200 active:scale-95 transition-transform disabled:opacity-50"
        >
          ↶ 되돌리기 {undosLeft}
        </button>
        <button
          type="button"
          onClick={useHint}
          disabled={solved || hintsLeft <= 0}
          className="rounded-full bg-amber-700 text-white px-3 py-2 text-sm font-semibold shadow-sm active:scale-95 transition-transform disabled:bg-amber-300"
        >
          💡 힌트 {hintsLeft}
        </button>
        <button
          type="button"
          onClick={() => setShowPreview((v) => !v)}
          className={`rounded-full px-3 py-2 text-sm font-medium shadow-sm active:scale-95 transition-transform border ${
            showPreview
              ? "bg-amber-200 text-amber-900 border-amber-300"
              : "bg-white text-amber-900 border-amber-200"
          }`}
        >
          {showPreview ? "👁 미리보기 ✓" : "👁 미리보기"}
        </button>
        <button
          type="button"
          onClick={reshuffle}
          disabled={solved}
          className={`rounded-full px-3 py-2 text-sm font-medium shadow-sm border active:scale-95 transition-transform disabled:opacity-50 ${
            reshuffleConfirming
              ? "bg-rose-600 text-white border-rose-600"
              : "bg-white text-amber-900 border-amber-200"
          }`}
        >
          {reshuffleConfirming ? "한 번 더 누르기" : "🔀 다시 섞기"}
        </button>
      </div>

      {solved && <Confetti count={isBoss ? 60 : 36} />}

      {showSolveModal && (
        <div className="fixed inset-x-0 bottom-0 z-50 flex items-end justify-center p-3 pointer-events-none solve-sheet-enter">
          <div className="rounded-2xl bg-white px-6 py-5 text-center shadow-2xl w-full max-w-sm pointer-events-auto">
            <div className="text-3xl font-bold text-amber-900">
              {isBoss ? "보스 격파! 👑" : "완성! 🎉"}
            </div>
            <StarsRow count={computeStars(elapsed, parTimeMs)} />
            <div className="mt-2 text-amber-800 text-2xl font-semibold tabular-nums">
              {formatTime(elapsed)}
            </div>
            <div className="mt-2 flex flex-wrap items-center justify-center gap-1.5 text-[11px] font-semibold">
              {previousBestMs == null || elapsed < previousBestMs ? (
                <span className="rounded-full bg-amber-700 text-white px-2.5 py-0.5">
                  🏆 신기록
                </span>
              ) : (
                <span className="rounded-full bg-amber-50 text-amber-700 px-2.5 py-0.5 border border-amber-200">
                  이전 최고 {formatTime(previousBestMs)}
                </span>
              )}
              {computeStars(elapsed, parTimeMs) === 3 && hintsUsed === 0 && (
                <span className="rounded-full bg-rose-100 text-rose-700 px-2.5 py-0.5 border border-rose-200">
                  💎 PERFECT
                </span>
              )}
              {isDaily && (
                <span className="rounded-full bg-amber-500 text-white px-2.5 py-0.5 border border-amber-500">
                  ✨ 오늘의 도전
                </span>
              )}
              <span className="rounded-full bg-amber-50 text-amber-700 px-2.5 py-0.5 border border-amber-200">
                {moveCount}회 이동
              </span>
              {hintsUsed > 0 && (
                <span className="rounded-full bg-amber-50 text-amber-700 px-2.5 py-0.5 border border-amber-200">
                  힌트 {hintsUsed}
                </span>
              )}
            </div>
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={onExit}
                className="flex-1 rounded-full bg-white text-amber-900 border border-amber-200 px-3 py-3 text-sm font-semibold active:scale-[0.97] transition-transform"
              >
                목록
              </button>
              <button
                type="button"
                onClick={replay}
                className="flex-1 rounded-full bg-amber-50 text-amber-900 border border-amber-200 px-3 py-3 text-sm font-semibold active:scale-[0.97] transition-transform"
              >
                🔄 다시
              </button>
              <button
                type="button"
                onClick={hasNext ? onNext : onExit}
                className="flex-1 rounded-full bg-amber-700 px-3 py-3 text-sm text-white font-semibold active:scale-[0.97] transition-transform"
              >
                {hasNext ? "다음 ▶" : "완료"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
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
    const ci = p.currentIndex;
    const cr = Math.floor(ci / cols);
    const cc = ci % cols;
    if (cc < cols - 1) {
      const right = byIndex.get(ci + 1);
      if (right && right.origRow === p.origRow && right.origCol === p.origCol + 1) {
        out[p.id].right = true;
        out[right.id].left = true;
      }
    }
    if (cr < rows - 1) {
      const below = byIndex.get(ci + cols);
      if (below && below.origCol === p.origCol && below.origRow === p.origRow + 1) {
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

// BFS across joined adjacencies starting from `startId`.
// Returns the ids of every piece in the same connected cluster.
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

// Rigidly translate every piece in `groupIds` by (rDeltaRow, rDeltaCol) cells.
// Non-group pieces in cells the group now occupies are displaced to the cells
// the group just vacated (paired by sorted index).
// Returns null if the move would push any group piece out of bounds.
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
  // Should never collide internally under a rigid translation, but guard anyway.
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
    <div className="mt-3 flex justify-center gap-1">
      {[1, 2, 3].map((n) => (
        <span
          key={n}
          className={`text-3xl ${n <= count ? "text-amber-500" : "text-amber-200"}`}
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
