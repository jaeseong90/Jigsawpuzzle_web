"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";

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
  onSolved?: (durationMs: number) => void;
  onExit?: () => void;
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
        onExit={props.onExit}
      />
      <div
        ref={containerRef}
        className="relative flex-1 mx-3 mb-4 mt-2 overflow-hidden flex items-center justify-center"
      >
        {boardSize ? (
          <Board
            key={`${boardSize.w}x${boardSize.h}-${rows}x${cols}-${imageSrc.length}`}
            imageSrc={imageSrc}
            rows={rows}
            cols={cols}
            boardSize={boardSize}
            isBoss={props.isBoss}
            onSolved={props.onSolved}
            onExit={props.onExit}
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
  onExit,
}: {
  isBoss?: boolean;
  stageLabel?: string;
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
      <div className="w-[64px]" />
    </div>
  );
}

type BoardProps = {
  imageSrc: string;
  rows: number;
  cols: number;
  boardSize: { w: number; h: number };
  isBoss?: boolean;
  onSolved?: (durationMs: number) => void;
  onExit?: () => void;
};

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
  onSolved,
  onExit,
}: BoardProps) {
  const boardRef = useRef<HTMLDivElement | null>(null);

  const [pieces, setPieces] = useState<Piece[]>(() => buildShuffledPieces(rows, cols));
  const [dragId, setDragId] = useState<number | null>(null);
  const [dragPos, setDragPos] = useState<{ x: number; y: number } | null>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [startedAt] = useState<number>(() => Date.now());
  const [now, setNow] = useState<number>(() => Date.now());
  const [solved, setSolved] = useState(false);

  const dragOffsetRef = useRef<{ ox: number; oy: number; pointerId: number } | null>(null);

  useEffect(() => {
    if (solved) return;
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(id);
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
      };
      setDragId(piece.id);
      setDragPos({ x: cc * pieceW, y: cr * pieceH });
      setHoverIndex(piece.currentIndex);
    },
    [solved, cols, pieceW, pieceH]
  );

  const onPointerMove = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      const off = dragOffsetRef.current;
      if (!off || off.pointerId !== e.pointerId || dragId === null) return;
      const board = boardRef.current;
      if (!board) return;
      const rect = board.getBoundingClientRect();
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;
      const x = Math.max(-pieceW * 0.25, Math.min(boardSize.w - pieceW * 0.75, px - off.ox));
      const y = Math.max(-pieceH * 0.25, Math.min(boardSize.h - pieceH * 0.75, py - off.oy));
      setDragPos({ x, y });
      // Target cell is determined by the pointer position, not the piece corner —
      // matches the user's mental model ("I'm pointing at this cell").
      const tc = Math.max(0, Math.min(cols - 1, Math.floor(px / pieceW)));
      const tr = Math.max(0, Math.min(rows - 1, Math.floor(py / pieceH)));
      setHoverIndex(tr * cols + tc);
    },
    [dragId, boardSize.w, boardSize.h, pieceW, pieceH, cols, rows]
  );

  const finishDrag = useCallback(
    (pointerId: number, e?: ReactPointerEvent<HTMLDivElement>) => {
      const off = dragOffsetRef.current;
      if (!off || off.pointerId !== pointerId || dragId === null) return;
      dragOffsetRef.current = null;

      let targetIndex: number | null = hoverIndex;
      if (e) {
        const board = boardRef.current;
        if (board) {
          const rect = board.getBoundingClientRect();
          const px = e.clientX - rect.left;
          const py = e.clientY - rect.top;
          if (px >= 0 && px < boardSize.w && py >= 0 && py < boardSize.h) {
            const tc = Math.floor(px / pieceW);
            const tr = Math.floor(py / pieceH);
            targetIndex = tr * cols + tc;
          }
        }
      }

      setDragId(null);
      setDragPos(null);
      setHoverIndex(null);

      setPieces((prev) => {
        const dragged = prev.find((p) => p.id === dragId);
        if (!dragged) return prev;
        if (targetIndex == null || targetIndex === dragged.currentIndex) return prev;

        const target = prev.find((p) => p.currentIndex === targetIndex);
        if (!target) return prev;

        const next = prev.map((p) => {
          if (p.id === dragged.id) return { ...p, currentIndex: targetIndex! };
          if (p.id === target.id) return { ...p, currentIndex: dragged.currentIndex };
          return p;
        });

        const isSolved = next.every((p) => p.currentIndex === p.origRow * cols + p.origCol);
        if (isSolved && !solved) {
          const duration = Date.now() - startedAt;
          setSolved(true);
          onSolved?.(duration);
          if (typeof navigator !== "undefined" && navigator.vibrate) {
            navigator.vibrate([20, 40, 80]);
          }
        } else {
          // Light haptic when a new adjacency click happens after this swap.
          const before = countJoinedEdges(prev, rows, cols);
          const after = countJoinedEdges(next, rows, cols);
          if (after > before && typeof navigator !== "undefined" && navigator.vibrate) {
            navigator.vibrate(15);
          }
        }
        return next;
      });
    },
    [dragId, hoverIndex, boardSize.w, boardSize.h, pieceW, pieceH, cols, rows, solved, startedAt, onSolved]
  );

  const totalPieces = rows * cols;
  const correctCount = useMemo(
    () => pieces.filter((p) => p.currentIndex === p.origRow * cols + p.origCol).length,
    [pieces, cols]
  );
  const elapsed = Math.max(0, now - startedAt);

  return (
    <div className="relative flex flex-col items-center gap-3">
      <div
        className="rounded-full bg-white/90 px-4 py-1.5 text-sm font-medium text-amber-900 tabular-nums shadow-sm"
      >
        {formatTime(elapsed)} · {correctCount}/{totalPieces}
      </div>

      <div
        ref={boardRef}
        className={`relative rounded-lg ${
          isBoss ? "ring-4 ring-rose-500/60" : "ring-2 ring-amber-700/30"
        } bg-amber-100/70 shadow-inner`}
        style={{ width: boardSize.w, height: boardSize.h, touchAction: "none" }}
      >
        {dragId !== null && hoverIndex !== null && (
          <div
            className="pointer-events-none absolute rounded-md border-2 border-amber-700/60 bg-amber-700/10 transition-[transform] duration-100"
            style={{
              width: pieceW,
              height: pieceH,
              transform: `translate3d(${(hoverIndex % cols) * pieceW}px, ${
                Math.floor(hoverIndex / cols) * pieceH
              }px, 0)`,
            }}
          />
        )}

        {pieces.map((p) => {
          const isDragging = dragId === p.id;
          const cr = Math.floor(p.currentIndex / cols);
          const cc = p.currentIndex % cols;
          const baseX = cc * pieceW;
          const baseY = cr * pieceH;
          const x = isDragging && dragPos ? dragPos.x : baseX;
          const y = isDragging && dragPos ? dragPos.y : baseY;
          const j = joined[p.id] ?? { top: false, right: false, bottom: false, left: false };
          const inCorrect = p.currentIndex === p.origRow * cols + p.origCol;
          return (
            <div
              key={p.id}
              className="puzzle-piece absolute will-change-transform select-none"
              style={{
                width: pieceW,
                height: pieceH,
                transform: `translate3d(${x}px, ${y}px, 0) ${isDragging ? "scale(1.04)" : ""}`,
                zIndex: isDragging ? 100 : inCorrect ? 1 : 2,
                backgroundImage: `url(${imageSrc})`,
                backgroundSize: `${boardSize.w}px ${boardSize.h}px`,
                backgroundPosition: `-${p.origCol * pieceW}px -${p.origRow * pieceH}px`,
                transition: isDragging
                  ? "none"
                  : "transform 180ms cubic-bezier(0.2, 0.8, 0.2, 1)",
                boxShadow: isDragging
                  ? "0 10px 24px rgba(0,0,0,0.35)"
                  : inCorrect
                  ? "none"
                  : "inset 0 0 0 1px rgba(255,255,255,0.55)",
                outline: isDragging ? "2px solid #b45309" : "none",
                outlineOffset: -2,
                borderTop: j.top ? "0" : "1px solid rgba(255,255,255,0.55)",
                borderRight: j.right ? "0" : "1px solid rgba(255,255,255,0.55)",
                borderBottom: j.bottom ? "0" : "1px solid rgba(255,255,255,0.55)",
                borderLeft: j.left ? "0" : "1px solid rgba(255,255,255,0.55)",
              }}
              onPointerDown={(e) => onPointerDown(e, p)}
              onPointerMove={onPointerMove}
              onPointerUp={(e) => finishDrag(e.pointerId, e)}
              onPointerCancel={(e) => finishDrag(e.pointerId)}
            />
          );
        })}
      </div>

      {solved && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-amber-900/55 backdrop-blur-sm">
          <div className="rounded-2xl bg-white px-7 py-6 text-center shadow-xl">
            <div className="text-3xl font-bold text-amber-900">완성! 🎉</div>
            <div className="mt-2 text-amber-800 text-lg tabular-nums">{formatTime(elapsed)}</div>
            <button
              type="button"
              onClick={onExit}
              className="mt-5 rounded-full bg-amber-700 px-6 py-3 text-white font-semibold"
            >
              다음 스테이지
            </button>
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

function formatTime(ms: number): string {
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}
