// Image source for each stage.
//
// We use Picsum (https://picsum.photos) — curated Unsplash photography served
// from a free, no-key CDN.
// - Boss stages pull from a hand-picked list of striking high-quality
//   landscape IDs so every 10th stage has a noticeably premium feel.
// - Normal stages use seeded random photos. The seed includes the chapter's
//   themeSeed so each chapter has its own photo namespace — the player sees
//   a different visual pool as they progress through chapters.

import { chapterForStage } from "@/data/stages";

const SIZE = 720;

// Curated Picsum image IDs known to render as compelling photos for the
// boss spotlight. Beyond this list we fall back to seeded random.
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
  1025, // dog portrait — wildcard charm
  1029, // forest light
  1031, // sunset boat
  1036, // alpine lake
  1039, // cliff overlook
  1043, // mirrored building
  1048, // tunnel architecture
  1050, // boats at dock
  1053, // rocky shore
  1059, // city architecture
  1067, // ocean swell
  1069, // pier perspective
  1073, // valley dusk
  1080, // wildflowers
  1081, // canyon ridge
  1083, // marble texture
  1084, // city lights
  658, // architecture
  790, // dramatic clouds
  855, // golden field
];

export function getStageImageDataUrl(stageId: number): string {
  return getStageImageUrl(stageId, SIZE);
}

export function getStageImageUrl(stageId: number, size: number = SIZE): string {
  const isBoss = stageId % 10 === 0;
  if (isBoss) {
    const bossIndex = Math.max(0, Math.floor(stageId / 10) - 1);
    if (bossIndex < BOSS_IMAGE_IDS.length) {
      return `https://picsum.photos/id/${BOSS_IMAGE_IDS[bossIndex]}/${size}/${size}`;
    }
    return `https://picsum.photos/seed/tessera-boss-${stageId}/${size}/${size}`;
  }
  const chapter = chapterForStage(stageId);
  return `https://picsum.photos/seed/${chapter.themeSeed}-${stageId}/${size}/${size}`;
}

// A small palette per stage — used for accent rings and progress UI while
// the photo is still loading. (Currently only kept for back-compat callers.)
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
