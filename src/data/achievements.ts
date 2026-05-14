import type { Progress } from "@/lib/progress";

export type Achievement = {
  id: string;
  icon: string;
  title: string;
  description: string;
  check: (p: Progress) => boolean;
};

const bossIds = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100] as const;

function clearedCount(p: Progress): number {
  return Object.keys(p.cleared).length;
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
    check: (p) => clearedCount(p) >= 1,
  },
  {
    id: "ten-clears",
    icon: "🔥",
    title: "탄력 받기",
    description: "10 스테이지 클리어",
    check: (p) => clearedCount(p) >= 10,
  },
  {
    id: "fifty-clears",
    icon: "💪",
    title: "실력자",
    description: "50 스테이지 클리어",
    check: (p) => clearedCount(p) >= 50,
  },
  {
    id: "all-clears",
    icon: "🏆",
    title: "마스터",
    description: "100 스테이지 모두 클리어",
    check: (p) => clearedCount(p) >= 100,
  },
  {
    id: "first-boss",
    icon: "👑",
    title: "보스 사냥꾼",
    description: "첫 보스 격파",
    check: (p) => bossIds.some((id) => p.cleared[id]),
  },
  {
    id: "all-boss",
    icon: "🐉",
    title: "보스 마스터",
    description: "모든 보스 격파",
    check: (p) => bossIds.every((id) => p.cleared[id]),
  },
  {
    id: "first-three-star",
    icon: "⭐",
    title: "빛나는 별",
    description: "3성 클리어 달성",
    check: (p) => threeStarCount(p) >= 1,
  },
  {
    id: "ten-three-stars",
    icon: "🌟",
    title: "빠른 손",
    description: "3성 클리어 10회",
    check: (p) => threeStarCount(p) >= 10,
  },
  {
    id: "all-three-star",
    icon: "💎",
    title: "완벽주의자",
    description: "모든 스테이지 3성",
    check: (p) => threeStarCount(p) >= 100,
  },
];

export function earnedAchievements(p: Progress): Achievement[] {
  return ACHIEVEMENTS.filter((a) => a.check(p));
}
