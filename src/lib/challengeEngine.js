/**
 * Challenge Engine
 * Generates personalized fitness challenges based on user rank, history, and selected tier.
 * MOCK IMPLEMENTATION — logic can be replaced with AI-driven recommendation in production.
 */

export const TIERS = {
  low:    { label: 'Low Risk',    stake: 50,   multiplier: 1.5, color: 'text-primary',     bg: 'bg-primary/10',     risk: '🟢 Low'    },
  medium: { label: 'Medium Risk', stake: 150,  multiplier: 2.5, color: 'text-chart-3',     bg: 'bg-chart-3/10',     risk: '🟡 Medium' },
  high:   { label: 'High Risk',   stake: 400,  multiplier: 5.0, color: 'text-destructive',  bg: 'bg-destructive/10', risk: '🔴 High'   },
};

const CHALLENGE_TEMPLATES = {
  beginner: [
    { title: 'Push-Up Blitz', description: 'Complete 3 sets of 10 push-ups with proper form', reps: 10, sets: 3, scoreTarget: 70 },
    { title: 'Squat Hold Challenge', description: 'Hold a deep squat for 30 seconds, 3 times', reps: 1, sets: 3, scoreTarget: 65 },
    { title: 'Core Starter', description: 'Complete 3 sets of 15 crunches with controlled movement', reps: 15, sets: 3, scoreTarget: 68 },
  ],
  intermediate: [
    { title: 'Burpee Gauntlet', description: 'Complete 5 sets of 8 burpees — full body, no breaks', reps: 8, sets: 5, scoreTarget: 75 },
    { title: 'Box Jump Series', description: '4 sets of 6 explosive box jumps — land clean', reps: 6, sets: 4, scoreTarget: 78 },
    { title: 'Kettlebell Power Round', description: '4 sets of 12 kettlebell swings with explosive hip drive', reps: 12, sets: 4, scoreTarget: 76 },
  ],
  advanced: [
    { title: 'Muscle-Up Marathon', description: '5 sets of 5 strict muscle-ups — no kipping', reps: 5, sets: 5, scoreTarget: 85 },
    { title: 'Turkish Get-Up Test', description: '3 sets of 4 per side Turkish get-ups — controlled and precise', reps: 4, sets: 3, scoreTarget: 88 },
    { title: 'Handstand Hold Elite', description: 'Hold a freestanding handstand for 10 seconds, 4 times', reps: 1, sets: 4, scoreTarget: 90 },
  ],
};

// Tier difficulty scalers applied to base templates
const TIER_SCALERS = {
  low:    { repsMultiplier: 0.75, scoreBonus: 0,   descSuffix: '' },
  medium: { repsMultiplier: 1.25, scoreBonus: 8,   descSuffix: ' — pushed to the limit' },
  high:   { repsMultiplier: 1.75, scoreBonus: 15,  descSuffix: ' — MAXIMUM INTENSITY, no compromises' },
};

export function generateChallenge(rankName = 'Beginner', tier = 'low', completedCount = 0) {
  const rankKey = rankName.toLowerCase();
  const templates = CHALLENGE_TEMPLATES[rankKey] || CHALLENGE_TEMPLATES.beginner;
  const template = templates[Math.floor(Math.random() * templates.length)];
  const scaler = TIER_SCALERS[tier];
  const tierConfig = TIERS[tier];

  const scaledReps = Math.round(template.reps * scaler.repsMultiplier);
  const scaledScore = Math.min(98, template.scoreTarget + scaler.scoreBonus);

  return {
    title: template.title,
    description: template.description.replace(
      /(\d+) (reps|sets of \d+|times)/,
      (_, n, rest) => `${Math.round(n * scaler.repsMultiplier)} ${rest}`
    ) + scaler.descSuffix,
    tier,
    stake_amount: tierConfig.stake,
    reward_multiplier: tierConfig.multiplier,
    difficulty_label: `${rankName} · ${tierConfig.risk}`,
    target_score: scaledScore,
    target_reps: scaledReps,
    target_sets: template.sets,
    status: 'active',
    expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  };
}

export function getRecommendedTier(completedCount, currentStreak = 0) {
  if (completedCount >= 20 || currentStreak >= 7) return 'high';
  if (completedCount >= 8 || currentStreak >= 3) return 'medium';
  return 'low';
}

export function getTimeRemaining(expiresAt) {
  const diff = new Date(expiresAt) - new Date();
  if (diff <= 0) return 'Expired';
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  return `${h}h ${m}m`;
}