// Image source for each stage.
//
// We use Picsum (https://picsum.photos) — curated Unsplash photography served
// from a free, no-key CDN.
// - Normal stages use seeded random photos (same seed → same photo each time).
// - Boss stages pull from a hand-picked list of striking landscape IDs so
//   every 10th stage has a noticeably premium feel.

const SIZE = 720;

// Picsum image IDs known to be high-quality landscapes / nature shots.
const BOSS_IMAGE_IDS = [
  1015, // misty mountain
  1018, // city skyline
  1019, // bridge at sunset
  1041, // mountain range
  1043, // architectural reflection
  1051, // mountain pass
  1066, // pier on water
  1074, // snowy summit
  1062, // forest path
  1011, // ocean cliff
];

export function getStageImageDataUrl(stageId: number): string {
  return getStageImageUrl(stageId, SIZE);
}

export function getStageImageUrl(stageId: number, size: number = SIZE): string {
  const isBoss = stageId % 10 === 0;
  if (isBoss) {
    const bossIndex = Math.max(0, Math.floor(stageId / 10) - 1);
    // First N bosses use hand-curated Picsum IDs; the rest fall back to seeded
    // random photos with a "boss" prefix so they still differ from normal seeds.
    if (bossIndex < BOSS_IMAGE_IDS.length) {
      return `https://picsum.photos/id/${BOSS_IMAGE_IDS[bossIndex]}/${size}/${size}`;
    }
    return `https://picsum.photos/seed/boss-${stageId}/${size}/${size}`;
  }
  return `https://picsum.photos/seed/jigsaw-${stageId}/${size}/${size}`;
}

// A small palette per stage — used for accent rings and progress UI while
// the photo is still loading.
const ACCENTS: ReadonlyArray<readonly [string, string, string, string]> = [
  ["#fde68a", "#f59e0b", "#b45309", "#78350f"],
  ["#fecaca", "#f87171", "#dc2626", "#7f1d1d"],
  ["#bbf7d0", "#34d399", "#059669", "#064e3b"],
  ["#bfdbfe", "#60a5fa", "#2563eb", "#1e3a8a"],
  ["#ddd6fe", "#a78bfa", "#7c3aed", "#4c1d95"],
  ["#fbcfe8", "#f472b6", "#db2777", "#831843"],
  ["#a7f3d0", "#6ee7b7", "#10b981", "#065f46"],
  ["#fed7aa", "#fb923c", "#ea580c", "#7c2d12"],
];

export function getStagePalette(stageId: number): readonly [string, string, string, string] {
  return ACCENTS[(stageId - 1) % ACCENTS.length];
}
