/**
 * Ranking System
 * 
 * Rank progression based on completed workouts and engagement.
 * Structured to allow future token-gated unlocks via Solana.
 */

export const RANKS = [
  { 
    name: 'Beginner', 
    threshold: 0, 
    color: 'text-muted-foreground',
    bgColor: 'bg-muted',
    emoji: '🌱',
    description: 'Just getting started'
  },
  { 
    name: 'Intermediate', 
    threshold: 5, 
    color: 'text-primary',
    bgColor: 'bg-primary/20',
    emoji: '⚡',
    description: 'Building momentum'
  },
  { 
    name: 'Advanced', 
    threshold: 15, 
    color: 'text-accent',
    bgColor: 'bg-accent/20',
    emoji: '🔥',
    description: 'Pushing limits'
  },
  { 
    name: 'Pro', 
    threshold: 30, 
    color: 'text-chart-3',
    bgColor: 'bg-chart-3/20',
    emoji: '👑',
    description: 'Elite performer'
  },
];

export function getRank(completedWorkouts) {
  let currentRank = RANKS[0];
  for (const rank of RANKS) {
    if (completedWorkouts >= rank.threshold) {
      currentRank = rank;
    }
  }
  return currentRank;
}

export function getNextRank(completedWorkouts) {
  for (const rank of RANKS) {
    if (completedWorkouts < rank.threshold) {
      return rank;
    }
  }
  return null; // Max rank reached
}

export function getProgressToNextRank(completedWorkouts) {
  const current = getRank(completedWorkouts);
  const next = getNextRank(completedWorkouts);
  if (!next) return { progress: 100, remaining: 0 };

  const rangeStart = current.threshold;
  const rangeEnd = next.threshold;
  const progress = ((completedWorkouts - rangeStart) / (rangeEnd - rangeStart)) * 100;
  const remaining = rangeEnd - completedWorkouts;

  return { progress: Math.min(100, progress), remaining };
}

export const PRO_UNLOCK_THRESHOLD = 5;

export function isProUnlocked(completedWorkouts) {
  return completedWorkouts >= PRO_UNLOCK_THRESHOLD;
}