export type Stage = {
  id: number;
  rows: number;
  cols: number;
  isBoss: boolean;
  title: string;
};

const TOTAL_STAGES = 100;

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
};

export const CHAPTERS: ReadonlyArray<Chapter> = [
  { id: 1, range: [1, 10], title: "따뜻한 시작", subtitle: "퍼즐과 친해지기" },
  { id: 2, range: [11, 20], title: "호기심", subtitle: "조금 더 큰 그림" },
  { id: 3, range: [21, 30], title: "여정", subtitle: "탄력이 붙는 시간" },
  { id: 4, range: [31, 40], title: "도전", subtitle: "보스가 강해진다" },
  { id: 5, range: [41, 50], title: "발견", subtitle: "패턴을 익히는 단계" },
  { id: 6, range: [51, 60], title: "깊이", subtitle: "그림이 한층 풍성" },
  { id: 7, range: [61, 70], title: "변주", subtitle: "익숙함을 깨는 색" },
  { id: 8, range: [71, 80], title: "통찰", subtitle: "전략이 필요해진다" },
  { id: 9, range: [81, 90], title: "절정", subtitle: "조각이 더 작아짐" },
  { id: 10, range: [91, 100], title: "마스터", subtitle: "끝까지 가는 길" },
];

export function chapterIdForStage(stageId: number): number {
  return Math.min(CHAPTERS.length, Math.max(1, Math.ceil(stageId / 10)));
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

