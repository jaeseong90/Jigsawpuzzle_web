export type Stage = {
  id: number;
  rows: number;
  cols: number;
  isBoss: boolean;
  title: string;
};

const TOTAL_STAGES = 999;

function pickGrid(id: number, isBoss: boolean): { rows: number; cols: number } {
  // Difficulty curve starts from 5×4 (20 pieces) — small grids skipped on
  // purpose. Boss every 10 jumps an extra notch beyond the surrounding
  // chapter so it feels like a real boss.
  if (isBoss) {
    if (id <= 20) return { rows: 6, cols: 5 }; // 30
    if (id <= 40) return { rows: 7, cols: 5 }; // 35
    if (id <= 70) return { rows: 8, cols: 6 }; // 48
    return { rows: 9, cols: 7 }; // 63 — final-stretch
  }
  if (id <= 10) return { rows: 5, cols: 4 }; // 20
  if (id <= 25) return { rows: 5, cols: 5 }; // 25
  if (id <= 45) return { rows: 6, cols: 5 }; // 30
  if (id <= 65) return { rows: 6, cols: 6 }; // 36
  if (id <= 85) return { rows: 7, cols: 6 }; // 42
  return { rows: 8, cols: 6 }; // 48
}

function buildStages(): Stage[] {
  const list: Stage[] = [];
  for (let id = 1; id <= TOTAL_STAGES; id++) {
    const isBoss = id % 10 === 0;
    const { rows, cols } = pickGrid(id, isBoss);
    list.push({
      id,
      rows,
      cols,
      isBoss,
      title: isBoss ? `보스 ${id}` : `스테이지 ${id}`,
    });
  }
  return list;
}

export const STAGES: ReadonlyArray<Stage> = buildStages();

export function getStage(id: number): Stage | undefined {
  return STAGES.find((s) => s.id === id);
}

export const TOTAL_STAGE_COUNT = TOTAL_STAGES;

export type Chapter = {
  id: number;
  range: [number, number];
  title: string;
  subtitle: string;
  // Seed namespace fed to the image source so each chapter draws from its own
  // photo pool. Random within the namespace, but consistent across reloads.
  themeSeed: string;
};

const NAMED_CHAPTERS: ReadonlyArray<
  Pick<Chapter, "title" | "subtitle" | "themeSeed">
> = [
  { title: "정원", subtitle: "초록과 빛의 시작", themeSeed: "garden" },
  { title: "수면", subtitle: "물에 비친 풍경", themeSeed: "tideline" },
  { title: "도시", subtitle: "선과 빛의 도면", themeSeed: "metropole" },
  { title: "여행", subtitle: "낯선 거리의 결", themeSeed: "wayfare" },
  { title: "정물", subtitle: "탁자 위 고요", themeSeed: "stilllife" },
  { title: "황혼", subtitle: "해가 기울어진 시간", themeSeed: "vespers" },
  { title: "원경", subtitle: "멀리 펼쳐진 결", themeSeed: "horizon" },
  { title: "건축", subtitle: "기하와 무게", themeSeed: "atelier" },
  { title: "야경", subtitle: "어둠을 가르는 빛", themeSeed: "nocturne" },
  { title: "광장", subtitle: "사람과 시간이 모이는 곳", themeSeed: "agora" },
];

function buildChapters(): Chapter[] {
  const list: Chapter[] = [];
  const chapterSize = 100;
  let id = 1;
  for (let start = 1; start <= TOTAL_STAGES; start += chapterSize) {
    const end = Math.min(start + chapterSize - 1, TOTAL_STAGES);
    const named = NAMED_CHAPTERS[id - 1];
    list.push({
      id,
      range: [start, end],
      title: named?.title ?? `스테이지 ${start}-${end}`,
      subtitle: named?.subtitle ?? "끝없이 이어지는 길",
      themeSeed: named?.themeSeed ?? `endless-${id}`,
    });
    id += 1;
  }
  return list;
}

export const CHAPTERS: ReadonlyArray<Chapter> = buildChapters();

export function chapterIdForStage(stageId: number): number {
  return Math.min(CHAPTERS.length, Math.max(1, Math.ceil(stageId / 100)));
}

export function chapterForStage(stageId: number): Chapter {
  const id = chapterIdForStage(stageId);
  return CHAPTERS[id - 1];
}

// Target time per piece in milliseconds. Beating this earns 3 stars.
function msPerPiece(stage: Stage): number {
  return stage.isBoss ? 7000 : 5000;
}

export function parTimeMs(stage: Stage): number {
  return stage.rows * stage.cols * msPerPiece(stage);
}

export function starsFromTime(stage: Stage, durationMs: number): 1 | 2 | 3 {
  const par = parTimeMs(stage);
  if (durationMs <= par) return 3;
  if (durationMs <= par * 1.8) return 2;
  return 1;
}
