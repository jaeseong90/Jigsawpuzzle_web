export type Stage = {
  id: number;
  rows: number;
  cols: number;
  isBoss: boolean;
  title: string;
};

const TOTAL_STAGES = 100;

function pickGrid(id: number, isBoss: boolean): { rows: number; cols: number } {
  if (isBoss) {
    if (id <= 20) return { rows: 5, cols: 4 };
    if (id <= 40) return { rows: 6, cols: 5 };
    if (id <= 70) return { rows: 7, cols: 5 };
    return { rows: 8, cols: 6 };
  }
  if (id <= 5) return { rows: 3, cols: 3 };
  if (id <= 15) return { rows: 4, cols: 3 };
  if (id <= 30) return { rows: 4, cols: 4 };
  if (id <= 50) return { rows: 5, cols: 4 };
  if (id <= 70) return { rows: 5, cols: 5 };
  if (id <= 90) return { rows: 6, cols: 5 };
  return { rows: 7, cols: 5 };
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

