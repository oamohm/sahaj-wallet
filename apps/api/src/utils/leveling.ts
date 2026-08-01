/**
 * Simple, deterministic XP curve: each level requires 500 more XP than the
 * last (level 1: 0-499, level 2: 500-999, ...). Centralized here so XP
 * awards and level-ups never drift out of sync between modules.
 */
const XP_PER_LEVEL = 500;

export function levelForXp(xp: number): number {
  return Math.max(1, Math.floor(xp / XP_PER_LEVEL) + 1);
}

export function xpToNextLevel(xp: number): { currentLevel: number; xpIntoLevel: number; xpForNextLevel: number } {
  const currentLevel = levelForXp(xp);
  const xpIntoLevel = xp % XP_PER_LEVEL;
  return { currentLevel, xpIntoLevel, xpForNextLevel: XP_PER_LEVEL };
}
