import { seedRng } from "./seedRng";

// 24 palettes × varied patterns gives ~100 visually distinct stage images.
// Each palette uses 4 colors [bg, accent1, accent2, accent3] arranged from light to dark.
const PALETTES: ReadonlyArray<readonly [string, string, string, string]> = [
  ["#fde68a", "#f59e0b", "#b45309", "#78350f"], // amber
  ["#fecaca", "#f87171", "#dc2626", "#7f1d1d"], // rose
  ["#bbf7d0", "#34d399", "#059669", "#064e3b"], // emerald
  ["#bfdbfe", "#60a5fa", "#2563eb", "#1e3a8a"], // blue
  ["#ddd6fe", "#a78bfa", "#7c3aed", "#4c1d95"], // violet
  ["#fbcfe8", "#f472b6", "#db2777", "#831843"], // pink
  ["#a7f3d0", "#6ee7b7", "#10b981", "#065f46"], // mint
  ["#fed7aa", "#fb923c", "#ea580c", "#7c2d12"], // orange
  ["#e9d5ff", "#c084fc", "#9333ea", "#581c87"], // purple
  ["#fef3c7", "#fbbf24", "#d97706", "#92400e"], // gold
  ["#ccfbf1", "#5eead4", "#0d9488", "#134e4a"], // teal
  ["#e0e7ff", "#818cf8", "#4f46e5", "#312e81"], // indigo
  ["#fce7f3", "#ec4899", "#be185d", "#9d174d"], // hot pink
  ["#d9f99d", "#a3e635", "#65a30d", "#365314"], // lime
  ["#cffafe", "#22d3ee", "#0891b2", "#164e63"], // cyan
  ["#fee2e2", "#fb7185", "#e11d48", "#881337"], // crimson
  ["#dcfce7", "#4ade80", "#16a34a", "#14532d"], // green
  ["#f5d0fe", "#e879f9", "#c026d3", "#701a75"], // fuchsia
  ["#fef9c3", "#facc15", "#ca8a04", "#854d0e"], // yellow
  ["#dbeafe", "#3b82f6", "#1d4ed8", "#1e40af"], // royal blue
  ["#f3e8ff", "#d8b4fe", "#a855f7", "#6b21a8"], // lilac
  ["#fae8ff", "#f0abfc", "#d946ef", "#86198f"], // magenta
  ["#cffafe", "#67e8f9", "#06b6d4", "#155e75"], // sky
  ["#fef2f2", "#fecaca", "#f43f5e", "#9f1239"], // soft red
];

const PATTERNS = [
  "circles",
  "rects",
  "triangles",
  "stripes",
  "mountain",
  "heart",
  "flower",
  "star",
  "bubbles",
  "waves",
] as const;
type Pattern = (typeof PATTERNS)[number];

const W = 720;
const H = 720;

function escapeSvg(s: string) {
  return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

function svgWrap(inner: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice">${inner}</svg>`;
}

function bg(color: string) {
  return `<rect width="${W}" height="${H}" fill="${color}"/>`;
}

function drawCircles(rng: () => number, palette: readonly string[]): string {
  let s = bg(palette[0]);
  const count = 9 + Math.floor(rng() * 6);
  for (let i = 0; i < count; i++) {
    const cx = rng() * W;
    const cy = rng() * H;
    const r = 50 + rng() * 140;
    const color = palette[1 + Math.floor(rng() * 3)];
    s += `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${r.toFixed(1)}" fill="${color}" opacity="0.88"/>`;
  }
  return svgWrap(s);
}

function drawRects(rng: () => number, palette: readonly string[]): string {
  let s = bg(palette[0]);
  const count = 14 + Math.floor(rng() * 10);
  for (let i = 0; i < count; i++) {
    const w = 80 + rng() * 220;
    const h = 80 + rng() * 220;
    const x = rng() * (W - w);
    const y = rng() * (H - h);
    const color = palette[1 + Math.floor(rng() * 3)];
    const rot = (rng() - 0.5) * 30;
    s += `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" fill="${color}" opacity="0.85" rx="14" transform="rotate(${rot.toFixed(1)} ${(x + w / 2).toFixed(1)} ${(y + h / 2).toFixed(1)})"/>`;
  }
  return svgWrap(s);
}

function drawTriangles(rng: () => number, palette: readonly string[]): string {
  let s = bg(palette[0]);
  const count = 12 + Math.floor(rng() * 8);
  for (let i = 0; i < count; i++) {
    const cx = rng() * W;
    const cy = rng() * H;
    const size = 100 + rng() * 200;
    const rot = rng() * 360;
    const color = palette[1 + Math.floor(rng() * 3)];
    const p1x = cx;
    const p1y = cy - size / 2;
    const p2x = cx - size / 2;
    const p2y = cy + size / 2;
    const p3x = cx + size / 2;
    const p3y = cy + size / 2;
    s += `<polygon points="${p1x.toFixed(1)},${p1y.toFixed(1)} ${p2x.toFixed(1)},${p2y.toFixed(1)} ${p3x.toFixed(1)},${p3y.toFixed(1)}" fill="${color}" opacity="0.85" transform="rotate(${rot.toFixed(1)} ${cx.toFixed(1)} ${cy.toFixed(1)})"/>`;
  }
  return svgWrap(s);
}

function drawStripes(rng: () => number, palette: readonly string[]): string {
  let s = bg(palette[0]);
  const stripeCount = 6 + Math.floor(rng() * 6);
  const rotation = rng() * 90;
  const stripeW = (W * 1.8) / stripeCount;
  for (let i = 0; i < stripeCount; i++) {
    const x = -W * 0.4 + i * stripeW;
    const color = palette[1 + (i % 3)];
    s += `<rect x="${x.toFixed(1)}" y="${(-H * 0.4).toFixed(1)}" width="${(stripeW * 0.7).toFixed(1)}" height="${(H * 1.8).toFixed(1)}" fill="${color}" opacity="0.85" transform="rotate(${rotation.toFixed(1)} ${(W / 2).toFixed(1)} ${(H / 2).toFixed(1)})"/>`;
  }
  return svgWrap(s);
}

function drawHeart(rng: () => number, palette: readonly string[]): string {
  const cx = W / 2;
  const cy = H / 2 + 20;
  const r = 200 + rng() * 60;
  let s = bg(palette[0]);
  for (let i = 0; i < 10; i++) {
    const angle = rng() * Math.PI * 2;
    const dist = 290 + rng() * 80;
    const px = cx + dist * Math.cos(angle);
    const py = cy + dist * Math.sin(angle);
    const rr = 18 + rng() * 32;
    s += `<circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="${rr.toFixed(1)}" fill="${palette[1]}" opacity="0.55"/>`;
  }
  const path = `M ${cx} ${(cy + r * 0.45).toFixed(1)} C ${(cx - r * 1.25).toFixed(1)} ${(cy - r * 0.25).toFixed(1)}, ${(cx - r * 0.9).toFixed(1)} ${(cy - r * 1.05).toFixed(1)}, ${cx} ${(cy - r * 0.1).toFixed(1)} C ${(cx + r * 0.9).toFixed(1)} ${(cy - r * 1.05).toFixed(1)}, ${(cx + r * 1.25).toFixed(1)} ${(cy - r * 0.25).toFixed(1)}, ${cx} ${(cy + r * 0.45).toFixed(1)} Z`;
  s += `<path d="${path}" fill="${palette[2]}"/>`;
  s += `<path d="${path}" fill="${palette[3]}" opacity="0.4" transform="translate(8,8)"/>`;
  return svgWrap(s);
}

function drawFlower(rng: () => number, palette: readonly string[]): string {
  const cx = W / 2;
  const cy = H / 2;
  const petalCount = 5 + Math.floor(rng() * 3); // 5..7 petals
  const petalR = 130 + rng() * 40;
  const dist = 130 + rng() * 30;
  let s = bg(palette[0]);
  for (let i = 0; i < petalCount; i++) {
    const angle = (i / petalCount) * Math.PI * 2;
    const px = cx + dist * Math.cos(angle);
    const py = cy + dist * Math.sin(angle);
    const rotDeg = ((angle * 180) / Math.PI).toFixed(1);
    s += `<ellipse cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" rx="${petalR.toFixed(1)}" ry="${(petalR * 0.55).toFixed(1)}" fill="${palette[2]}" opacity="0.92" transform="rotate(${rotDeg} ${px.toFixed(1)} ${py.toFixed(1)})"/>`;
  }
  s += `<circle cx="${cx}" cy="${cy}" r="${(petalR * 0.55).toFixed(1)}" fill="${palette[1]}"/>`;
  s += `<circle cx="${cx}" cy="${cy}" r="${(petalR * 0.3).toFixed(1)}" fill="${palette[3]}" opacity="0.7"/>`;
  return svgWrap(s);
}

function drawStar(rng: () => number, palette: readonly string[]): string {
  const cx = W / 2;
  const cy = H / 2;
  const R = 240 + rng() * 40;
  const r = R * (0.4 + rng() * 0.1);
  const rot = rng() * 30;
  let s = bg(palette[0]);
  // Background pattern: a few faint stars scattered around
  for (let i = 0; i < 8; i++) {
    const sx = rng() * W;
    const sy = rng() * H;
    const sR = 30 + rng() * 30;
    s += `<circle cx="${sx.toFixed(1)}" cy="${sy.toFixed(1)}" r="${sR.toFixed(1)}" fill="${palette[1]}" opacity="0.4"/>`;
  }
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const angle = (i * Math.PI) / 5 - Math.PI / 2;
    const rad = i % 2 === 0 ? R : r;
    pts.push(`${(cx + Math.cos(angle) * rad).toFixed(1)},${(cy + Math.sin(angle) * rad).toFixed(1)}`);
  }
  s += `<polygon points="${pts.join(" ")}" fill="${palette[2]}" transform="rotate(${rot.toFixed(1)} ${cx} ${cy})"/>`;
  s += `<polygon points="${pts.join(" ")}" fill="${palette[3]}" opacity="0.35" transform="rotate(${(rot + 7).toFixed(1)} ${cx} ${cy})"/>`;
  return svgWrap(s);
}

function drawBubbles(rng: () => number, palette: readonly string[]): string {
  let s = bg(palette[0]);
  const colors = [palette[1], palette[2], palette[3]];
  const count = 28 + Math.floor(rng() * 12);
  for (let i = 0; i < count; i++) {
    const cx = rng() * W;
    const cy = rng() * H;
    const r = 30 + rng() * 80;
    const c = colors[i % colors.length];
    s += `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${r.toFixed(1)}" fill="${c}" opacity="${(0.55 + rng() * 0.4).toFixed(2)}"/>`;
    // tiny highlight
    s += `<circle cx="${(cx - r * 0.3).toFixed(1)}" cy="${(cy - r * 0.3).toFixed(1)}" r="${(r * 0.18).toFixed(1)}" fill="white" opacity="0.35"/>`;
  }
  return svgWrap(s);
}

function drawWaves(rng: () => number, palette: readonly string[]): string {
  let s = bg(palette[0]);
  const bands = 4 + Math.floor(rng() * 3);
  const colors = [palette[1], palette[2], palette[3]];
  for (let b = 0; b < bands; b++) {
    const baseY = (H / bands) * (b + 0.5) + (rng() - 0.5) * 40;
    const amp = 40 + rng() * 80;
    const wavelength = 220 + rng() * 200;
    let path = `M -20 ${(baseY + 200).toFixed(1)}`;
    for (let x = -20; x <= W + 20; x += 10) {
      const y = baseY + Math.sin((x / wavelength) * Math.PI * 2 + b) * amp;
      path += ` L ${x} ${y.toFixed(1)}`;
    }
    path += ` L ${W + 20} ${H + 20} L -20 ${H + 20} Z`;
    s += `<path d="${path}" fill="${colors[b % colors.length]}" opacity="${(0.6 + (b / bands) * 0.35).toFixed(2)}"/>`;
  }
  return svgWrap(s);
}

function drawMountain(rng: () => number, palette: readonly string[]): string {
  // Sky → sun → 3 mountain layers → optional foreground
  const sky = palette[0];
  const sun = palette[1];
  const mountain1 = palette[2];
  const mountain2 = palette[3];
  let s = bg(sky);
  // Sun / moon
  const sunX = 150 + rng() * (W - 300);
  const sunY = 80 + rng() * 180;
  const sunR = 80 + rng() * 60;
  s += `<circle cx="${sunX.toFixed(1)}" cy="${sunY.toFixed(1)}" r="${sunR.toFixed(1)}" fill="${sun}" opacity="0.85"/>`;
  // Far mountains
  const peakBase = 360 + rng() * 80;
  let path = `M -20 ${(peakBase + 80).toFixed(1)}`;
  for (let x = 0; x <= W + 20; x += 60) {
    const y = peakBase - rng() * 160;
    path += ` L ${x} ${y.toFixed(1)}`;
  }
  path += ` L ${W + 20} ${H + 20} L -20 ${H + 20} Z`;
  s += `<path d="${path}" fill="${mountain1}" opacity="0.9"/>`;
  // Near mountains
  const peakBase2 = 500 + rng() * 80;
  let path2 = `M -20 ${(peakBase2 + 60).toFixed(1)}`;
  for (let x = 0; x <= W + 20; x += 80) {
    const y = peakBase2 - rng() * 200;
    path2 += ` L ${x} ${y.toFixed(1)}`;
  }
  path2 += ` L ${W + 20} ${H + 20} L -20 ${H + 20} Z`;
  s += `<path d="${path2}" fill="${mountain2}"/>`;
  return svgWrap(s);
}

function generateSvg(stageId: number): string {
  // Compose palette and pattern from stage id so the result is fully deterministic.
  // Pattern cycles every 10 stages; palette advances every full pattern cycle so
  // adjacent stages always look different.
  const rng = seedRng(stageId * 7919 + 31);
  const patternIdx = (stageId - 1) % PATTERNS.length;
  const paletteIdx =
    (Math.floor((stageId - 1) / PATTERNS.length) +
      patternIdx * 3) % PALETTES.length;
  const palette = PALETTES[paletteIdx];
  const pattern: Pattern = PATTERNS[patternIdx];
  switch (pattern) {
    case "circles":
      return drawCircles(rng, palette);
    case "rects":
      return drawRects(rng, palette);
    case "triangles":
      return drawTriangles(rng, palette);
    case "stripes":
      return drawStripes(rng, palette);
    case "mountain":
      return drawMountain(rng, palette);
    case "heart":
      return drawHeart(rng, palette);
    case "flower":
      return drawFlower(rng, palette);
    case "star":
      return drawStar(rng, palette);
    case "bubbles":
      return drawBubbles(rng, palette);
    case "waves":
      return drawWaves(rng, palette);
  }
}

const cache = new Map<number, string>();

export function getStageImageDataUrl(stageId: number): string {
  const cached = cache.get(stageId);
  if (cached) return cached;
  const svg = generateSvg(stageId);
  // URL-encode is safer than base64 across Node/browser for SVG.
  const url = `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  cache.set(stageId, url);
  return url;
}

export function getStagePalette(stageId: number): readonly [string, string, string, string] {
  const patternIdx = (stageId - 1) % PATTERNS.length;
  const paletteIdx =
    (Math.floor((stageId - 1) / PATTERNS.length) +
      patternIdx * 3) % PALETTES.length;
  return PALETTES[paletteIdx];
}

// Re-export for components that want a literal escape helper (e.g. for stage labels).
export { escapeSvg };
