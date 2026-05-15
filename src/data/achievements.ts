import type { Progress } from "@/lib/progress";
import type { DailyRecord } from "@/lib/daily";

export type AchievementContext = {
  progress: Progress;
  daily?: DailyRecord | null;
  personalCount?: number;
};

export type Achievement = {
  id: string;
  icon: string;
  title: string;
  description: string;
  check: (ctx: AchievementContext) => boolean;
};

function clearedCount(p: Progress): number {
  return Object.keys(p.cleared).length;
}

function bossesCleared(p: Progress): number {
  let n = 0;
  for (const idStr of Object.keys(p.cleared)) {
    const id = parseInt(idStr, 10);
    if (id % 10 === 0) n += 1;
  }
  return n;
}

function threeStarCount(p: Progress): number {
  let n = 0;
  for (const v of Object.values(p.bestStars)) {
    if (v >= 3) n++;
  }
  return n;
}

export const ACHIEVEMENTS: ReadonlyArray<Achievement> = [
  {
    id: "first-clear",
    icon: "🌱",
    title: "첫 발걸음",
    description: "첫 스테이지를 클리어했어요",
    check: ({ progress }) => clearedCount(progress) >= 1,
  },
  {
    id: "ten-clears",
    icon: "🔥",
    title: "탄력 받기",
    description: "10 스테이지 클리어",
    check: ({ progress }) => clearedCount(progress) >= 10,
  },
  {
    id: "fifty-clears",
    icon: "💪",
    title: "실력자",
    description: "50 스테이지 클리어",
    check: ({ progress }) => clearedCount(progress) >= 50,
  },
  {
    id: "hundred-clears",
    icon: "🏆",
    title: "마라톤",
    description: "100 스테이지 클리어",
    check: ({ progress }) => clearedCount(progress) >= 100,
  },
  {
    id: "five-hundred-clears",
    icon: "🚀",
    title: "전설의 여행자",
    description: "500 스테이지 클리어",
    check: ({ progress }) => clearedCount(progress) >= 500,
  },
  {
    id: "first-boss",
    icon: "👑",
    title: "보스 사냥꾼",
    description: "첫 보스 격파",
    check: ({ progress }) => bossesCleared(progress) >= 1,
  },
  {
    id: "ten-bosses",
    icon: "🐉",
    title: "보스 마스터",
    description: "보스 10회 격파",
    check: ({ progress }) => bossesCleared(progress) >= 10,
  },
  {
    id: "first-three-star",
    icon: "⭐",
    title: "빛나는 별",
    description: "3성 클리어 달성",
    check: ({ progress }) => threeStarCount(progress) >= 1,
  },
  {
    id: "ten-three-stars",
    icon: "🌟",
    title: "빠른 손",
    description: "3성 클리어 10회",
    check: ({ progress }) => threeStarCount(progress) >= 10,
  },
  {
    id: "fifty-three-stars",
    icon: "💎",
    title: "완벽주의자",
    description: "3성 클리어 50회",
    check: ({ progress }) => threeStarCount(progress) >= 50,
  },
  {
    id: "daily-streak-7",
    icon: "💫",
    title: "일주일의 의식",
    description: "데일리 7일 연속",
    check: ({ daily }) => (daily?.bestStreak ?? 0) >= 7,
  },
  {
    id: "daily-streak-30",
    icon: "👑",
    title: "달인의 한 달",
    description: "데일리 30일 연속",
    check: ({ daily }) => (daily?.bestStreak ?? 0) >= 30,
  },
  {
    id: "daily-50",
    icon: "📅",
    title: "출석의 달인",
    description: "데일리 50회 누적 클리어",
    check: ({ daily }) => (daily?.totalCleared ?? 0) >= 50,
  },
  {
    id: "personal-3",
    icon: "📸",
    title: "내 풍경 수집",
    description: "내 사진 3장 등록",
    check: ({ personalCount = 0 }) => personalCount >= 3,
  },
  {
    id: "personal-10",
    icon: "🖼️",
    title: "나만의 갤러리",
    description: "내 사진 10장 등록",
    check: ({ personalCount = 0 }) => personalCount >= 10,
  },
];

export function earnedAchievements(ctx: AchievementContext): Achievement[] {
  return ACHIEVEMENTS.filter((a) => a.check(ctx));
}
