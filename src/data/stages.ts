export type BossConstraints = {
  // Preview overlay renders desaturated — you still see the shape but
  // color cues are stripped.
  bwPreview?: boolean;
  // Preview tool is disabled entirely for this boss.
  noPreview?: boolean;
  // Par-time multiplier <1 makes 3-star harder for this boss.
  parMultiplier?: number;
};

export type Stage = {
  id: number;
  rows: number;
  cols: number;
  isBoss: boolean;
  title: string;
  bossConstraints?: BossConstraints;
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

// Per-chapter title pools so every stage gets an evocative two-word
// Korean name instead of the generic "스테이지 N". Each pool below combines
// adjective × noun deterministically by stage-index-within-chapter, so the
// 100 stages in a chapter spread across the entire combinatorial space.
// Bosses get a dedicated reservation pool so the 10th, 20th, … stage of a
// chapter feels named with intent.
const THEME_TITLE_POOLS: Record<
  string,
  { adjectives: ReadonlyArray<string>; nouns: ReadonlyArray<string>; bosses: ReadonlyArray<string> }
> = {
  garden: {
    adjectives: ["이른", "늦은", "젖은", "마른", "푸른", "흩어진", "고요한", "비스듬한", "흔들리는", "물든", "남은", "맑은"],
    nouns: ["마당", "이파리", "꽃잎", "이슬", "장미", "덩굴", "잔디", "그늘", "벤치", "햇살", "산책", "한낮"],
    bosses: ["만개", "여름의 정점", "온실의 끝", "비 그친 정원", "장미의 시간", "가장 깊은 초록", "정원의 끝", "한낮의 빛", "잔디 너머", "정원의 결말"],
  },
  tideline: {
    adjectives: ["잔잔한", "물든", "얕은", "깊은", "은빛", "흐려진", "맑은", "고인", "흘러간", "흔들린", "고요한", "투명한"],
    nouns: ["연못", "물결", "그림자", "거울", "파문", "수면", "물비늘", "윤슬", "강가", "여울", "물안개", "조약돌"],
    bosses: ["물의 정점", "달빛 호수", "은빛 파도", "조용한 해변", "심해의 결", "바다의 끝", "조수의 정점", "물안개의 핵", "투명한 깊이", "수평의 끝"],
  },
  metropole: {
    adjectives: ["늦은", "이른", "푸른", "젖은", "흐려진", "차가운", "더운", "잠든", "깨어난", "스민", "느린", "빠른"],
    nouns: ["골목", "광장", "광고", "유리", "벽", "창문", "거리", "신호등", "보도", "철문", "전봇대", "옥상"],
    bosses: ["도시의 심장", "광장의 정점", "마천루", "도심의 끝", "교차로", "지하철역", "철길의 끝", "유리탑", "옥상의 빛", "도시의 결말"],
  },
  wayfare: {
    adjectives: ["이름 모를", "낯선", "머문", "지나친", "오래된", "새로운", "비어 있는", "북적이는", "조용한", "흩어진", "느린", "굽이진"],
    nouns: ["정거장", "길", "표지판", "도시", "역", "시장", "골목", "터미널", "광장", "여인숙", "사잇길", "여로"],
    bosses: ["여행의 정점", "끝없는 길", "마지막 정거장", "이름 없는 마을", "지도의 끝", "북쪽 끝", "여로의 정점", "옛 도시", "여행자의 쉼터", "여행의 끝"],
  },
  stilllife: {
    adjectives: ["따뜻한", "식은", "비스듬한", "겹쳐진", "흩어진", "가지런한", "낡은", "새것의", "기울어진", "고요한", "남은", "남겨진"],
    nouns: ["찻잔", "책", "접시", "탁자", "꽃병", "촛불", "편지", "사과", "유리", "수저", "주전자", "오후"],
    bosses: ["정물의 정점", "오후의 결", "탁자의 끝", "고요의 핵", "마지막 찻잔", "정물의 결말", "촛불의 정점", "책의 끝", "꽃병의 시간", "정적의 끝"],
  },
  vespers: {
    adjectives: ["노을", "저녁", "물든", "기울어진", "스러지는", "타오르는", "마지막", "잠든", "조용한", "흐려진", "남은", "스민"],
    nouns: ["능선", "길", "언덕", "지붕", "들판", "강", "산", "수평선", "골짜기", "마을", "구름", "노을빛"],
    bosses: ["황혼의 정점", "마지막 빛", "노을의 끝", "타는 능선", "지평선", "저녁의 결말", "스러지는 빛", "산의 끝", "구름의 시간", "황혼의 결말"],
  },
  horizon: {
    adjectives: ["멀리", "희미한", "짙은", "푸른", "흐릿한", "맑은", "광활한", "겹쳐진", "텅 빈", "고요한", "흩어진", "짙어가는"],
    nouns: ["산", "안개", "들", "바다", "구름", "지평", "골짜기", "초원", "벌판", "능선", "수평", "원경"],
    bosses: ["원경의 정점", "지평의 끝", "산맥의 정점", "광활한 들", "수평선의 끝", "안개의 핵", "원경의 결말", "끝없는 바다", "마지막 능선", "원경의 결"],
  },
  atelier: {
    adjectives: ["빈", "오래된", "굳건한", "차가운", "낡은", "고요한", "조용한", "기울어진", "비스듬한", "굽이진", "단단한", "흐릿한"],
    nouns: ["계단", "기둥", "지붕", "벽", "창", "문", "복도", "탑", "광장", "회랑", "발코니", "아치"],
    bosses: ["건축의 정점", "탑의 정점", "회랑의 끝", "기둥의 시간", "마지막 아치", "광장의 끝", "발코니의 빛", "건축의 결말", "복도의 끝", "지붕의 정점"],
  },
  nocturne: {
    adjectives: ["밤", "늦은", "푸른", "흐려진", "잠든", "깨어난", "고요한", "흩어진", "스민", "차가운", "어둔", "맑은"],
    nouns: ["도시", "하늘", "길", "창", "별", "달빛", "골목", "거리", "강가", "지붕", "광장", "야경"],
    bosses: ["야경의 정점", "달빛의 시간", "별의 끝", "심야", "밤의 결말", "야경의 결", "어둠의 정점", "도시의 밤", "야경의 핵", "밤의 끝"],
  },
  agora: {
    adjectives: ["모인", "흩어진", "걸어가는", "머문", "지나친", "북적이는", "조용한", "흐릿한", "남은", "오랜", "새로운", "스민"],
    nouns: ["사람들", "광장", "그림자", "발자국", "교차로", "보도", "분수", "벤치", "노점", "회랑", "비둘기", "광장빛"],
    bosses: ["광장의 정점", "마지막 광장", "사람들의 끝", "광장의 결말", "교차의 정점", "광장의 핵", "오후의 광장", "광장의 시간", "분수의 끝", "광장의 결"],
  },
};

function titleForStage(id: number, isBoss: boolean): string {
  const chapter = chapterForStageRaw(id);
  const pool = THEME_TITLE_POOLS[chapter.themeSeed];
  if (!pool) return isBoss ? `보스 ${id}` : `스테이지 ${id}`;
  const offset = id - chapter.range[0];
  if (isBoss) {
    // 10 boss stages per chapter (id ending in 0). Index by which boss-ord
    // this is within the chapter — first boss in chapter → bosses[0], etc.
    const bossOrd = Math.floor(offset / 10);
    return pool.bosses[bossOrd % pool.bosses.length];
  }
  const adj = pool.adjectives[offset % pool.adjectives.length];
  const noun =
    pool.nouns[Math.floor(offset / pool.adjectives.length) % pool.nouns.length];
  return `${adj} ${noun}`;
}

// Inline theme-seed sequence so titleForStage can resolve at module-load
// time, before the CHAPTERS array (which references the same data) has
// been constructed.
const THEME_SEEDS_BY_CHAPTER: ReadonlyArray<string> = [
  "garden",
  "tideline",
  "metropole",
  "wayfare",
  "stilllife",
  "vespers",
  "horizon",
  "atelier",
  "nocturne",
  "agora",
];

function chapterForStageRaw(stageId: number): {
  range: [number, number];
  themeSeed: string;
} {
  const chapterIdx = Math.min(
    THEME_SEEDS_BY_CHAPTER.length,
    Math.max(1, Math.ceil(stageId / 100))
  );
  const start = (chapterIdx - 1) * 100 + 1;
  const end = Math.min(start + 99, TOTAL_STAGES);
  return {
    range: [start, end],
    themeSeed: THEME_SEEDS_BY_CHAPTER[chapterIdx - 1] ?? `endless-${chapterIdx}`,
  };
}

// Per-chapter boss constraint profile. Each chapter ramps the boss
// experience instead of just enlarging the grid — chapter 2 desaturates
// the preview, chapter 10 hides it entirely AND tightens par.
const BOSS_PROFILE_BY_CHAPTER: ReadonlyArray<BossConstraints> = [
  {}, // 1: 정원 — warmup, no constraints
  { bwPreview: true }, // 2: 수면
  { parMultiplier: 0.78 }, // 3: 도시
  { bwPreview: true }, // 4: 여행
  { noPreview: true }, // 5: 정물
  { parMultiplier: 0.78 }, // 6: 황혼
  { bwPreview: true, parMultiplier: 0.78 }, // 7: 원경
  { noPreview: true }, // 8: 건축
  { bwPreview: true, parMultiplier: 0.72 }, // 9: 야경
  { noPreview: true, parMultiplier: 0.72 }, // 10: 광장 — the final exam
];

function bossConstraintsFor(stageId: number): BossConstraints | undefined {
  const chapterIdx = Math.min(
    BOSS_PROFILE_BY_CHAPTER.length,
    Math.max(1, Math.ceil(stageId / 100))
  );
  const profile = BOSS_PROFILE_BY_CHAPTER[chapterIdx - 1];
  if (!profile) return undefined;
  // Keep undefined when there are no constraints so the field stays
  // truly optional in callers' equality checks.
  return Object.keys(profile).length > 0 ? profile : undefined;
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
      title: titleForStage(id, isBoss),
      ...(isBoss
        ? { bossConstraints: bossConstraintsFor(id) }
        : {}),
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
  const base = stage.rows * stage.cols * msPerPiece(stage);
  const mult = stage.bossConstraints?.parMultiplier ?? 1;
  return Math.round(base * mult);
}

export function starsFromTime(stage: Stage, durationMs: number): 1 | 2 | 3 {
  const par = parTimeMs(stage);
  if (durationMs <= par) return 3;
  if (durationMs <= par * 1.8) return 2;
  return 1;
}
