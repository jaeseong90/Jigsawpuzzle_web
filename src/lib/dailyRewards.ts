// Streak-reward tiers for the daily challenge. When the player crosses a
// tier on a fresh clear, we celebrate it and grant an XP bonus on top of
// the base daily-clear payout. Above 30 we keep the flame going but stop
// firing new celebration toasts so the UX doesn't get noisy.

export type StreakTier = {
  days: number;
  label: string;
  flair: "🔥" | "✨" | "💫" | "🌟" | "👑";
  xpBonus: number;
  blurb: string;
};

export const STREAK_TIERS: ReadonlyArray<StreakTier> = [
  { days: 3, label: "3일 연속", flair: "🔥", xpBonus: 30, blurb: "리듬을 탔어요" },
  { days: 5, label: "5일 연속", flair: "✨", xpBonus: 60, blurb: "꾸준한 한 주" },
  { days: 7, label: "7일 연속", flair: "💫", xpBonus: 120, blurb: "일주일을 채웠어요" },
  { days: 14, label: "14일 연속", flair: "🌟", xpBonus: 240, blurb: "이 주의 챔피언" },
  { days: 30, label: "30일 연속", flair: "👑", xpBonus: 600, blurb: "달인의 한 달" },
];

// Returns the tier that was *just* crossed when the streak advanced from
// prev → next, or null if no tier line was crossed. Used to fire the
// milestone celebration exactly once per crossing.
export function crossedTier(
  prevStreak: number,
  nextStreak: number
): StreakTier | null {
  for (let i = STREAK_TIERS.length - 1; i >= 0; i--) {
    const tier = STREAK_TIERS[i];
    if (nextStreak >= tier.days && prevStreak < tier.days) return tier;
  }
  return null;
}

// Tier the player is currently *on* — the highest tier whose `days` is
// less than or equal to the active streak. Drives the flair on the level
// chip and the streak pill in the banner.
export function currentTier(streak: number): StreakTier | null {
  let active: StreakTier | null = null;
  for (const tier of STREAK_TIERS) {
    if (streak >= tier.days) active = tier;
    else break;
  }
  return active;
}

// XP awarded on a daily clear beyond the base. Above the highest defined
// tier we keep paying out the top bonus so long streaks remain rewarding.
export function streakXpBonus(streak: number): number {
  const tier = currentTier(streak);
  return tier?.xpBonus ?? 0;
}
