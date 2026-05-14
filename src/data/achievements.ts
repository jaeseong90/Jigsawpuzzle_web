import type { Progress } from "@/lib/progress";

export type Achievement = {
  id: string;
  icon: string;
  title: string;
  description: string;
  check: (p: Progress) => boolean;
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
    id: "hundred-clears",
    icon: "🏆",
    title: "마라톤",
    description: "100 스테이지 클리어",
    check: (p) => clearedCount(p) >= 100,
  },
  {
    id: "five-hundred-clears",
    icon: "🚀",
    title: "전설의 여행자",
    description: "500 스테이지 클리어",
    check: (p) => clearedCount(p) >= 500,
  },
  {
    id: "first-boss",
    icon: "👑",
    title: "보스 사냥꾼",
    description: "첫 보스 격파",
    check: (p) => bossesCleared(p) >= 1,
  },
  {
    id: "ten-bosses",
    icon: "🐉",
    title: "보스 마스터",
    description: "보스 10회 격파",
    check: (p) => bossesCleared(p) >= 10,
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
    id: "fifty-three-stars",
    icon: "💎",
    title: "완벽주의자",
    description: "3성 클리어 50회",
    check: (p) => threeStarCount(p) >= 50,
  },
];

export function earnedAchievements(p: Progress): Achievement[] {
  return ACHIEVEMENTS.filter((a) => a.check(p));
}
