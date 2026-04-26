/**
 * Challenge Engine
 * Generates personalized fitness challenges based on user rank, history, and selected tier.
 * The generated challenge keeps a lightweight reference hint; Challenge.jsx resolves that
 * hint to an existing workout video or creates one from curated fallback references.
 */

export const TIERS = {
  low: {
    label: 'Low Risk',
    stake: 50,
    multiplier: 1.5,
    color: 'text-primary',
    bg: 'bg-primary/10',
    risk: 'Low',
  },
  medium: {
    label: 'Medium Risk',
    stake: 150,
    multiplier: 2.5,
    color: 'text-chart-3',
    bg: 'bg-chart-3/10',
    risk: 'Medium',
  },
  high: {
    label: 'High Risk',
    stake: 400,
    multiplier: 5,
    color: 'text-destructive',
    bg: 'bg-destructive/10',
    risk: 'High',
  },
};

const CHALLENGE_TEMPLATES = {
  beginner: [
    {
      title: 'Squat Form Challenge',
      description: 'Complete 3 sets of controlled squats with steady depth and knee tracking',
      reps: 10,
      sets: 3,
      scoreTarget: 75,
      referenceKey: 'beginner-squat',
      referenceDifficulty: 'beginner',
    },
  ],
  intermediate: [
    {
      title: 'Burpee Gauntlet',
      description: 'Complete 5 sets of burpees with a clear plank, jump, and overhead finish',
      reps: 8,
      sets: 5,
      scoreTarget: 78,
      referenceKey: 'intermediate-burpee',
      referenceDifficulty: 'intermediate',
    },
  ],
  advanced: [
    {
      title: 'Pull-Up Power Test',
      description: 'Complete strict pull-ups with full extension, shoulder control, and a strong top position',
      reps: 5,
      sets: 5,
      scoreTarget: 85,
      referenceKey: 'advanced-pull-up',
      referenceDifficulty: 'advanced',
    },
  ],
};

const TIER_SCALERS = {
  low: { repsMultiplier: 0.75, scoreBonus: 0, descSuffix: '' },
  medium: { repsMultiplier: 1.25, scoreBonus: 6, descSuffix: ' - pushed pace' },
  high: { repsMultiplier: 1.6, scoreBonus: 12, descSuffix: ' - maximum intensity' },
};

function normalizeRank(rankName = 'Beginner') {
  const rankKey = rankName.toLowerCase();
  if (rankKey === 'pro') return 'advanced';
  if (CHALLENGE_TEMPLATES[rankKey]) return rankKey;
  return 'beginner';
}

export function generateChallenge(rankName = 'Beginner', tier = 'low', completedCount = 0) {
  const rankKey = normalizeRank(rankName);
  const templates = CHALLENGE_TEMPLATES[rankKey] || CHALLENGE_TEMPLATES.beginner;
  const template = templates[Math.floor(Math.random() * templates.length)];
  const scaler = TIER_SCALERS[tier] || TIER_SCALERS.low;
  const tierConfig = TIERS[tier] || TIERS.low;

  const scaledReps = Math.max(1, Math.round(template.reps * scaler.repsMultiplier));
  const scaledScore = Math.min(98, Math.max(75, template.scoreTarget + scaler.scoreBonus));

  return {
    title: template.title,
    description: `${template.description}${scaler.descSuffix}`,
    tier,
    stake_amount: tierConfig.stake,
    reward_multiplier: tierConfig.multiplier,
    difficulty_label: `${rankName} / ${tierConfig.risk}`,
    target_score: scaledScore,
    target_reps: scaledReps,
    target_sets: template.sets,
    status: 'active',
    reference_key: template.referenceKey,
    reference_difficulty: template.referenceDifficulty,
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
