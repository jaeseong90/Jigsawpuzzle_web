// Renders a 1200×630 "share card" PNG for a stage clear and either invokes
// the Web Share API (with a file when supported), downloads the PNG, or
// copies a plain-text summary as a last resort.
//
// We intentionally don't try to embed the actual puzzle photo — Picsum CDN
// images would taint the canvas under CORS and break toBlob. The card leans
// on typography and the 2×2 brand glyph instead, which scales cleanly.

import type { Difficulty } from "@/lib/difficulty";
import { chapterForStage } from "@/data/stages";

export type ShareCardInput = {
  stageId: number;
  stageTitle: string;
  durationMs: number;
  stars: number;
  difficulty: Difficulty;
  isBoss: boolean;
  isDaily: boolean;
  isPersonal?: boolean;
  streak?: number;
  flowBest?: number;
};

const W = 1200;
const H = 630;

const COLORS = {
  bg: "#16120e",
  ink1: "#f3ece0",
  ink2: "#b5a791",
  ink3: "#5a5040",
  accent: "#d4a05c",
  gold: "#d4b07a",
  danger: "#d77565",
};

function formatTime(ms: number): string {
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function difficultyLabel(d: Difficulty): string {
  return d === "relax" ? "Relax" : d === "master" ? "Master" : "Standard";
}

function todayLabel(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}.${m}.${day}`;
}

function drawBrandGlyph(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number
) {
  const half = size / 2;
  const gap = size * 0.08;
  const tile = (size - gap) / 2;
  const r = tile * 0.12;
  // Top-left filled
  roundRect(ctx, x, y, tile, tile, r);
  ctx.fillStyle = COLORS.accent;
  ctx.fill();
  // Top-right outlined
  roundRect(ctx, x + tile + gap, y, tile, tile, r);
  ctx.lineWidth = Math.max(2, size * 0.05);
  ctx.strokeStyle = COLORS.accent;
  ctx.stroke();
  // Bottom-left outlined
  roundRect(ctx, x, y + tile + gap, tile, tile, r);
  ctx.stroke();
  // Bottom-right filled
  roundRect(ctx, x + tile + gap, y + tile + gap, tile, tile, r);
  ctx.fill();
  void half;
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

export async function buildShareCardBlob(input: ShareCardInput): Promise<Blob | null> {
  if (typeof document === "undefined") return null;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  // Background
  const grad = ctx.createLinearGradient(0, 0, W, H);
  grad.addColorStop(0, "#1d1812");
  grad.addColorStop(1, COLORS.bg);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // Subtle accent corner glyph (top-right large, faint)
  ctx.save();
  ctx.globalAlpha = 0.07;
  drawBrandGlyph(ctx, W - 360, -120, 460);
  ctx.restore();

  // Header brand
  drawBrandGlyph(ctx, 70, 70, 60);
  ctx.fillStyle = COLORS.accent;
  ctx.font =
    "700 28px Inter, -apple-system, BlinkMacSystemFont, 'Apple SD Gothic Neo', sans-serif";
  ctx.textBaseline = "middle";
  ctx.fillText("TESSERA", 150, 88);
  ctx.fillStyle = COLORS.ink3;
  ctx.font =
    "500 14px Inter, -apple-system, BlinkMacSystemFont, 'Apple SD Gothic Neo', sans-serif";
  ctx.letterSpacing = "0.18em";
  ctx.fillText("조각의 시간".toUpperCase(), 150, 116);

  // Title strip
  const titleLabel = input.isBoss
    ? "BOSS CLEARED"
    : input.isPersonal
    ? "MY PHOTO CLEARED"
    : "CLEARED";
  ctx.fillStyle = input.isBoss ? COLORS.danger : COLORS.accent;
  ctx.font =
    "700 18px Inter, -apple-system, BlinkMacSystemFont, sans-serif";
  ctx.fillText(titleLabel, 70, 220);

  // Stage subtitle (chapter · stage · difficulty)
  const chapter = !input.isPersonal ? chapterForStage(input.stageId) : null;
  const subtitle = input.isPersonal
    ? `내 사진 · ${difficultyLabel(input.difficulty)}`
    : `${chapter?.title ?? ""} · ${input.stageTitle} · ${difficultyLabel(input.difficulty)}`;
  ctx.fillStyle = COLORS.ink2;
  ctx.font =
    "500 22px Inter, -apple-system, BlinkMacSystemFont, 'Apple SD Gothic Neo', sans-serif";
  ctx.fillText(subtitle, 70, 252);

  // Big time
  ctx.fillStyle = COLORS.ink1;
  ctx.font =
    "700 156px Inter, -apple-system, BlinkMacSystemFont, sans-serif";
  ctx.textBaseline = "alphabetic";
  ctx.fillText(formatTime(input.durationMs), 60, 430);

  // Stars
  const stars = "★".repeat(input.stars) + "☆".repeat(3 - input.stars);
  ctx.fillStyle = COLORS.gold;
  ctx.font = "84px 'Apple SD Gothic Neo', serif";
  ctx.fillText(stars, 64, 520);

  // Right-side info column
  let rightY = 220;
  if (input.isDaily) {
    ctx.fillStyle = COLORS.gold;
    ctx.font =
      "700 18px Inter, -apple-system, BlinkMacSystemFont, sans-serif";
    ctx.textBaseline = "middle";
    ctx.fillText("DAILY CHALLENGE", 720, rightY);
    rightY += 70;
    if (input.streak && input.streak > 1) {
      ctx.fillStyle = COLORS.ink1;
      ctx.font =
        "700 56px Inter, -apple-system, BlinkMacSystemFont, sans-serif";
      ctx.fillText(`${input.streak}일 연속`, 720, rightY);
      rightY += 70;
    }
  }
  if (input.flowBest && input.flowBest >= 4) {
    ctx.fillStyle = COLORS.accent;
    ctx.font =
      "700 18px Inter, -apple-system, BlinkMacSystemFont, sans-serif";
    ctx.textBaseline = "middle";
    ctx.fillText("FLOW", 720, rightY);
    rightY += 50;
    ctx.fillStyle = COLORS.ink1;
    ctx.font =
      "700 56px Inter, -apple-system, BlinkMacSystemFont, sans-serif";
    ctx.fillText(`×${input.flowBest}`, 720, rightY);
  }

  // Footer
  ctx.fillStyle = COLORS.ink3;
  ctx.font =
    "500 16px Inter, -apple-system, BlinkMacSystemFont, sans-serif";
  ctx.textBaseline = "middle";
  ctx.fillText(`${todayLabel()}  ·  tessera`, 70, H - 50);

  // Vertical right column with accent (subtle)
  ctx.save();
  ctx.translate(W - 80, H / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillStyle = COLORS.ink3;
  ctx.font =
    "600 14px Inter, -apple-system, BlinkMacSystemFont, sans-serif";
  ctx.textBaseline = "middle";
  ctx.textAlign = "center";
  ctx.fillText("TESSERA · 조각의 시간", 0, 0);
  ctx.restore();

  return new Promise((resolve) => {
    canvas.toBlob((b) => resolve(b), "image/png");
  });
}

export function shareCardText(input: ShareCardInput): string {
  const stars = "★".repeat(input.stars) + "☆".repeat(3 - input.stars);
  const chapter = !input.isPersonal ? chapterForStage(input.stageId) : null;
  const label = input.isPersonal
    ? "내 사진"
    : `${chapter?.title ?? "스테이지"} · ${input.stageTitle}`;
  const lines = [
    "TESSERA · 조각의 시간",
    `${label} · ${difficultyLabel(input.difficulty)}`,
    `${stars}  ${formatTime(input.durationMs)}`,
  ];
  if (input.isDaily && input.streak && input.streak > 1) {
    lines.push(`데일리 ${input.streak}일 연속`);
  }
  return lines.join("\n");
}

export type ShareResult =
  | "shared"
  | "downloaded"
  | "text-copied"
  | "noop";

export async function shareClear(input: ShareCardInput): Promise<ShareResult> {
  const blob = await buildShareCardBlob(input);
  const text = shareCardText(input);

  // Path 1: Web Share API with file.
  if (blob && typeof navigator !== "undefined") {
    type ShareNav = Navigator & {
      canShare?: (data: { files?: File[]; text?: string }) => boolean;
      share?: (data: {
        files?: File[];
        title?: string;
        text?: string;
      }) => Promise<void>;
    };
    const nav = navigator as ShareNav;
    if (nav.share && nav.canShare) {
      try {
        const file = new File([blob], "tessera.png", { type: "image/png" });
        if (nav.canShare({ files: [file] })) {
          await nav.share({
            files: [file],
            title: "Tessera",
            text,
          });
          return "shared";
        }
      } catch {
        /* fall through */
      }
    }
  }

  // Path 2: Download PNG.
  if (blob && typeof document !== "undefined") {
    try {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `tessera-${input.stageId}-${formatTime(input.durationMs).replace(":", "m")}s.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
      return "downloaded";
    } catch {
      /* fall through */
    }
  }

  // Path 3: Copy text.
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return "text-copied";
    } catch {
      /* ignore */
    }
  }
  return "noop";
}
