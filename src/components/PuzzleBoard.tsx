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
  id: number;
  row: number;
  col: number;
  x: number;
  y: number;
  z: number;
  locked: boolean;
};

type Props = {
  imageSrc: string;
  rows: number;
  cols: number;
  onSolved?: (durationMs: number) => void;
  onExit?: () => void;
};

const SNAP_THRESHOLD_RATIO = 0.18;

export default function PuzzleBoard(props: Props) {
  const { imageSrc } = props;
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [imageAspect, setImageAspect] = useState<number | null>(null);
  const [boardSize, setBoardSize] = useState<{ w: number; h: number } | null>(null);

  useEffect(() => {
    const img = new Image();
    img.onload = () => setImageAspect(img.naturalWidth / img.naturalHeight);
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

      let w = availW;
      let h = w / imageAspect;
      if (h > availH) {
        h = availH;
        w = h * imageAspect;
      }
      setBoardSize((prev) => {
        const nw = Math.floor(w);
        const nh = Math.floor(h);
        if (prev && prev.w === nw && prev.h === nh) return prev;
        return { w: nw, h: nh };
      });
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [imageAspect]);

  return (
    <div className="flex h-[100dvh] flex-col bg-amber-50">
      <div ref={containerRef} className="relative flex-1 mx-3 mb-3 overflow-hidden">
        {boardSize ? (
          <Board
            key={`${boardSize.w}x${boardSize.h}-${props.rows}x${props.cols}-${imageSrc.length}`}
            {...props}
            boardSize={boardSize}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-amber-700">
            준비 중...
          </div>
        )}
      </div>
    </div>
  );
}

type BoardProps = Props & { boardSize: { w: number; h: number } };

function buildPieces(boardW: number, boardH: number, rows: number, cols: number): Piece[] {
  const pieceW = boardW / cols;
  const pieceH = boardH / rows;
  const out: Piece[] = [];
  let id = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const targetX = c * pieceW;
      const targetY = r * pieceH;
      let rx = Math.random() * Math.max(1, boardW - pieceW);
      let ry = Math.random() * Math.max(1, boardH - pieceH);
      if (Math.hypot(rx - targetX, ry - targetY) < Math.min(pieceW, pieceH)) {
        rx = (rx + boardW / 2) % Math.max(1, boardW - pieceW);
        ry = (ry + boardH / 2) % Math.max(1, boardH - pieceH);
      }
      out.push({ id: id++, row: r, col: c, x: rx, y: ry, z: 1, locked: false });
    }
  }
  return out;
}

function Board({ imageSrc, rows, cols, onSolved, onExit, boardSize }: BoardProps) {
  const boardRef = useRef<HTMLDivElement | null>(null);
  const zRef = useRef(1);

  const [pieces, setPieces] = useState<Piece[]>(() =>
    buildPieces(boardSize.w, boardSize.h, rows, cols)
  );
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const [startedAt] = useState<number>(() => Date.now());
  const [now, setNow] = useState<number>(() => Date.now());
  const [solved, setSolved] = useState(false);
  const [showHintImage, setShowHintImage] = useState(false);

  useEffect(() => {
    if (solved) return;
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(id);
  }, [solved]);

  const pieceW = boardSize.w / cols;
  const pieceH = boardSize.h / rows;
  const snapThreshold = Math.max(pieceW, pieceH) * SNAP_THRESHOLD_RATIO;

  const dragRef = useRef<{
    pieceId: number;
    pointerId: number;
    offsetX: number;
    offsetY: number;
  } | null>(null);

  const onPointerDown = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>, piece: Piece) => {
      if (piece.locked || solved) return;
      const board = boardRef.current;
      if (!board) return;
      e.currentTarget.setPointerCapture(e.pointerId);
      const rect = board.getBoundingClientRect();
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;
      dragRef.current = {
        pieceId: piece.id,
        pointerId: e.pointerId,
        offsetX: px - piece.x,
        offsetY: py - piece.y,
      };
      zRef.current += 1;
      const newZ = zRef.current;
      setDraggingId(piece.id);
      setPieces((prev) => prev.map((p) => (p.id === piece.id ? { ...p, z: newZ } : p)));
    },
    [solved]
  );

  const onPointerMove = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      const drag = dragRef.current;
      if (!drag || drag.pointerId !== e.pointerId) return;
      const board = boardRef.current;
      if (!board) return;
      const rect = board.getBoundingClientRect();
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;
      let nx = px - drag.offsetX;
      let ny = py - drag.offsetY;
      nx = Math.max(0, Math.min(boardSize.w - pieceW, nx));
      ny = Math.max(0, Math.min(boardSize.h - pieceH, ny));
      setPieces((prev) =>
        prev.map((p) => (p.id === drag.pieceId ? { ...p, x: nx, y: ny } : p))
      );
    },
    [boardSize.w, boardSize.h, pieceW, pieceH]
  );

  const finishDrag = useCallback(
    (pointerId: number) => {
      const drag = dragRef.current;
      if (!drag || drag.pointerId !== pointerId) return;
      dragRef.current = null;
      setDraggingId(null);

      setPieces((prev) => {
        let snappedNow = false;
        const next = prev.map((p) => {
          if (p.id !== drag.pieceId) return p;
          const targetX = p.col * pieceW;
          const targetY = p.row * pieceH;
          const dist = Math.hypot(p.x - targetX, p.y - targetY);
          if (dist <= snapThreshold) {
            if (!p.locked) snappedNow = true;
            return { ...p, x: targetX, y: targetY, locked: true };
          }
          return p;
        });

        if (next.every((p) => p.locked)) {
          if (!solved) {
            const duration = Date.now() - startedAt;
            setSolved(true);
            onSolved?.(duration);
            if (typeof navigator !== "undefined" && navigator.vibrate) {
              navigator.vibrate([20, 40, 80]);
            }
          }
        } else if (snappedNow && typeof navigator !== "undefined" && navigator.vibrate) {
          navigator.vibrate(15);
        }
        return next;
      });
    },
    [pieceW, pieceH, snapThreshold, solved, startedAt, onSolved]
  );

  const lockedCount = useMemo(() => pieces.filter((p) => p.locked).length, [pieces]);
  const elapsed = Math.max(0, now - startedAt);

  return (
    <>
      <Header
        elapsed={elapsed}
        lockedCount={lockedCount}
        totalCount={pieces.length}
        onExit={onExit}
        showHint={showHintImage}
        toggleHint={() => setShowHintImage((v) => !v)}
      />

      <div
        ref={boardRef}
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-lg bg-amber-100/70 shadow-inner"
        style={{ width: boardSize.w, height: boardSize.h }}
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              "linear-gradient(to right, rgba(180,83,9,0.15) 1px, transparent 1px), linear-gradient(to bottom, rgba(180,83,9,0.15) 1px, transparent 1px)",
            backgroundSize: `${pieceW}px ${pieceH}px`,
          }}
        />

        {showHintImage && (
          <div
            className="pointer-events-none absolute inset-0 opacity-30"
            style={{
              backgroundImage: `url(${imageSrc})`,
              backgroundSize: "100% 100%",
              backgroundRepeat: "no-repeat",
            }}
          />
        )}

        {pieces.map((p) => {
          const isDragging = draggingId === p.id;
          return (
            <div
              key={p.id}
              className="puzzle-piece absolute will-change-transform select-none"
              style={{
                width: pieceW,
                height: pieceH,
                transform: `translate3d(${p.x}px, ${p.y}px, 0)`,
                zIndex: p.locked ? 0 : p.z,
                backgroundImage: `url(${imageSrc})`,
                backgroundSize: `${boardSize.w}px ${boardSize.h}px`,
                backgroundPosition: `-${p.col * pieceW}px -${p.row * pieceH}px`,
                boxShadow: p.locked
                  ? "none"
                  : "0 4px 8px rgba(0,0,0,0.25), inset 0 0 0 1px rgba(255,255,255,0.4)",
                borderRadius: p.locked ? 0 : 4,
                transition: isDragging ? "none" : "box-shadow 120ms",
              }}
              onPointerDown={(e) => onPointerDown(e, p)}
              onPointerMove={onPointerMove}
              onPointerUp={(e) => finishDrag(e.pointerId)}
              onPointerCancel={(e) => finishDrag(e.pointerId)}
            />
          );
        })}
      </div>

      {solved && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-amber-900/60 backdrop-blur-sm">
          <div className="rounded-2xl bg-white px-6 py-5 text-center shadow-xl">
            <div className="text-2xl font-bold text-amber-900">완성! 🎉</div>
            <div className="mt-1 text-amber-800">{formatTime(elapsed)}</div>
            <button
              type="button"
              onClick={onExit}
              className="mt-4 rounded-full bg-amber-700 px-5 py-2 text-white font-semibold"
            >
              다시 고르기
            </button>
          </div>
        </div>
      )}
    </>
  );
}

function Header({
  elapsed,
  lockedCount,
  totalCount,
  onExit,
  showHint,
  toggleHint,
}: {
  elapsed: number;
  lockedCount: number;
  totalCount: number;
  onExit?: () => void;
  showHint: boolean;
  toggleHint: () => void;
}) {
  return (
    <div className="absolute left-0 right-0 top-0 z-40 flex items-center justify-between px-4 py-3 text-sm pointer-events-none">
      <button
        type="button"
        onClick={onExit}
        className="rounded-full bg-white px-3 py-1.5 shadow-sm text-amber-900 font-medium pointer-events-auto"
      >
        ← 처음으로
      </button>
      <div className="font-medium text-amber-900 tabular-nums bg-white/80 rounded-full px-3 py-1.5 pointer-events-auto">
        {formatTime(elapsed)} · {lockedCount}/{totalCount}
      </div>
      <button
        type="button"
        onClick={toggleHint}
        className="rounded-full bg-white px-3 py-1.5 shadow-sm text-amber-900 font-medium pointer-events-auto"
      >
        {showHint ? "힌트끔" : "힌트"}
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
