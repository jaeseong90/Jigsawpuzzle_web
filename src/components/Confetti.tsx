"use client";

import { useMemo, useState } from "react";
import { seedRng } from "@/lib/seedRng";

const COLORS = [
  "#f59e0b",
  "#dc2626",
  "#10b981",
  "#3b82f6",
  "#a855f7",
  "#ec4899",
  "#facc15",
];

type Piece = {
  left: number;
  delay: number;
  duration: number;
  color: string;
  rot: number;
  drift: number;
  shape: "square" | "circle";
  size: number;
};

function buildPieces(count: number, seed: number): Piece[] {
  const rng = seedRng(seed);
  const list: Piece[] = [];
  for (let i = 0; i < count; i++) {
    list.push({
      left: rng() * 100,
      delay: rng() * 250,
      duration: 1500 + rng() * 1500,
      color: COLORS[i % COLORS.length],
      rot: rng() * 360,
      drift: (rng() - 0.5) * 80,
      shape: rng() > 0.5 ? "square" : "circle",
      size: 6 + rng() * 8,
    });
  }
  return list;
}

export default function Confetti({ count = 36 }: { count?: number }) {
  const [seed] = useState<number>(() => Date.now() & 0xffffffff);
  const pieces = useMemo(() => buildPieces(count, seed), [count, seed]);

  return (
    <div className="pointer-events-none fixed inset-0 z-40 overflow-hidden">
      {pieces.map((p, i) => (
        <span
          key={i}
          className="confetti-piece absolute"
          style={{
            left: `${p.left}%`,
            top: -20,
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            borderRadius: p.shape === "circle" ? "50%" : 2,
            animationDelay: `${p.delay}ms`,
            animationDuration: `${p.duration}ms`,
            ["--drift" as string]: `${p.drift}px`,
            ["--rot" as string]: `${p.rot}deg`,
          }}
        />
      ))}
    </div>
  );
}
