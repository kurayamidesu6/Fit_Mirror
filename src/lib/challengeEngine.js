/**
 * Challenge Engine
 * Generates personalized fitness challenges and maps each challenge to a
 * reference workout that can be stored in Supabase and opened from Try Workout.
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
    multiplier: 5.0,
    color: 'text-destructive',
    bg: 'bg-destructive/10',
    risk: 'High',
  },
};

const CHALLENGE_TEMPLATES = {
  beginner: [
    {
      title: 'Squat Form Challenge',
      description: 'Complete controlled squats with steady depth and knee tracking',
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
      description: 'Complete burpees with a clear plank, jump, and overhead finish',
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

const WIKIMEDIA_FILE_BASE = 'https://upload.wikimedia.org/wikipedia/commons';

export const CHALLENGE_REFERENCES = {
  beginner: {
    key: 'beginner-squat',
    title: 'Challenge Reference: Squat Fundamentals',
    description: 'Beginner lower-body form challenge. Match the squat depth, knee tracking, and controlled tempo.',
    category: 'mobility',
    difficulty: 'beginner',
    target_muscle: 'lower_body',
    creator_name: 'Wikimedia Commons Reference',
    likes: 0,
    saves: 0,
    attempts_count: 0,
    is_pro: false,
    is_verified_coach: true,
    duration_seconds: 8,
    pass_threshold: 75,
    thumbnail_url: 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=600&h=800&fit=crop',
    video_url: `${WIKIMEDIA_FILE_BASE}/5/5c/Squat_-_exercise_demonstration_video.webm`,
    source_url: 'https://commons.wikimedia.org/wiki/File:Squat_-_exercise_demonstration_video.webm',
  },
  intermediate: {
    key: 'intermediate-burpee',
    title: 'Challenge Reference: Burpee Gauntlet',
    description: 'Intermediate full-body challenge. Match the drop, plank, jump, and overhead finish.',
    category: 'hiit',
    difficulty: 'intermediate',
    target_muscle: 'full_body',
    creator_name: 'Wikimedia Commons Reference',
    likes: 0,
    saves: 0,
    attempts_count: 0,
    is_pro: false,
    is_verified_coach: true,
    duration_seconds: 6,
    pass_threshold: 75,
    thumbnail_url: 'https://images.unsplash.com/photo-1549576490-b0b4831ef60a?w=600&h=800&fit=crop',
    video_url: `${WIKIMEDIA_FILE_BASE}/3/39/Burpee.webm`,
    source_url: 'https://commons.wikimedia.org/wiki/File:Burpee.webm',
  },
  advanced: {
    key: 'advanced-pull-up',
    title: 'Challenge Reference: Pull-Up Power',
    description: 'Advanced upper-body challenge. Match the pull height, shoulder control, and full extension.',
    category: 'calisthenics',
    difficulty: 'advanced',
    target_muscle: 'upper_body',
    creator_name: 'Wikimedia Commons Reference',
    likes: 0,
    saves: 0,
    attempts_count: 0,
    is_pro: false,
    is_verified_coach: true,
    duration_seconds: 7,
    pass_threshold: 80,
    thumbnail_url: 'https://images.unsplash.com/photo-1598971639058-fab3c3109a00?w=600&h=800&fit=crop',
    video_url: `${WIKIMEDIA_FILE_BASE}/1/15/Pull-ups_-_exercise_demonstration_video.webm`,
    source_url: 'https://commons.wikimedia.org/wiki/File:Pull-ups_-_exercise_demonstration_video.webm',
  },
};

const REFERENCE_KEYWORDS = {
  'beginner-squat': ['squat'],
  'intermediate-burpee': ['burpee'],
  'advanced-pull-up': ['pull-up', 'pull up', 'pullup', 'muscle-up', 'muscle up'],
};

function normalizeRank(rankName = 'Beginner') {
  const rank = rankName.toLowerCase();
  if (rank === 'pro') return 'advanced';
  return CHALLENGE_TEMPLATES[rank] ? rank : 'beginner';
}

function normalizeText(value = '') {
  return value.toLowerCase().replace(/[-_]/g, ' ');
}

function findExistingReference(challenge, workouts) {
  const keywords = REFERENCE_KEYWORDS[challenge.reference_key] || [];
  const difficulty = challenge.reference_difficulty;
  const usableWorkouts = workouts.filter((workout) => workout?.video_url && !workout.is_pro);

  const matchesKeywords = (workout) => {
    const haystack = normalizeText(`${workout.title || ''} ${workout.description || ''} ${workout.category || ''}`);
    return keywords.some((keyword) => haystack.includes(normalizeText(keyword)));
  };

  return usableWorkouts.find((workout) => workout.difficulty === difficulty && matchesKeywords(workout))
    || usableWorkouts.find(matchesKeywords)
    || null;
}

export function getChallengeReference(referenceDifficulty = 'beginner') {
  return CHALLENGE_REFERENCES[referenceDifficulty] || CHALLENGE_REFERENCES.beginner;
}

export function getWorkoutCreatePayload(referenceWorkout) {
  return {
    title: referenceWorkout.title,
    description: referenceWorkout.description,
    category: referenceWorkout.category,
    difficulty: referenceWorkout.difficulty,
    target_muscle: referenceWorkout.target_muscle,
    creator_name: referenceWorkout.creator_name,
    likes: referenceWorkout.likes || 0,
    saves: referenceWorkout.saves || 0,
    attempts_count: referenceWorkout.attempts_count || 0,
    is_pro: !!referenceWorkout.is_pro,
    is_verified_coach: !!referenceWorkout.is_verified_coach,
    duration_seconds: referenceWorkout.duration_seconds || 30,
    pass_threshold: referenceWorkout.pass_threshold || 75,
    thumbnail_url: referenceWorkout.thumbnail_url || '',
    video_url: referenceWorkout.video_url,
  };
}

export function inferReferenceMeta(challenge) {
  if (challenge.reference_key && challenge.reference_difficulty) return challenge;

  const text = normalizeText(`${challenge.title || ''} ${challenge.description || ''} ${challenge.difficulty_label || ''}`);
  if (text.includes('burpee') || text.includes('intermediate')) {
    return { ...challenge, reference_key: 'intermediate-burpee', reference_difficulty: 'intermediate' };
  }

  if (
    text.includes('pull')
    || text.includes('muscle')
    || text.includes('handstand')
    || text.includes('advanced')
    || text.includes('pro')
  ) {
    return { ...challenge, reference_key: 'advanced-pull-up', reference_difficulty: 'advanced' };
  }

  return { ...challenge, reference_key: 'beginner-squat', reference_difficulty: 'beginner' };
}

export function attachReferenceToChallenge(challenge, workouts = []) {
  const curatedReference = getChallengeReference(challenge.reference_difficulty);

  if (challenge.workout_id) {
    const storedWorkout = workouts.find((workout) => workout.id === challenge.workout_id);
    const referenceWorkout = storedWorkout?.title?.startsWith('Challenge Reference:')
      ? { ...curatedReference, ...storedWorkout, source_url: curatedReference.source_url }
      : storedWorkout || challenge.referenceWorkout || null;

    return {
      ...challenge,
      referenceWorkout,
    };
  }

  const existingReference = findExistingReference(challenge, workouts);
  if (existingReference) {
    return {
      ...challenge,
      workout_id: existingReference.id,
      referenceWorkout: { ...curatedReference, ...existingReference, source_url: curatedReference.source_url },
      referenceSource: 'library',
    };
  }

  return {
    ...challenge,
    referenceWorkout: curatedReference,
    referenceSource: 'curated',
  };
}

export function toChallengePayload(challenge) {
  const {
    referenceWorkout,
    referenceSource,
    reference_key,
    reference_difficulty,
    ...payload
  } = challenge;
  return payload;
}

export function generateChallenge(rankName = 'Beginner', tier = 'low') {
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
