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

export const REFERENCE_KEYWORDS = {
  'beginner-squat': ['squat'],
  'intermediate-burpee': ['burpee'],
  'advanced-pull-up': ['pull-up', 'pull up', 'pullup', 'muscle-up', 'muscle up'],
};

export function getChallengeReference(difficulty = 'beginner') {
  return CHALLENGE_REFERENCES[difficulty] || CHALLENGE_REFERENCES.beginner;
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
    is_pro: Boolean(referenceWorkout.is_pro),
    is_verified_coach: Boolean(referenceWorkout.is_verified_coach),
    duration_seconds: referenceWorkout.duration_seconds || 30,
    pass_threshold: referenceWorkout.pass_threshold || 75,
    thumbnail_url: referenceWorkout.thumbnail_url || '',
    video_url: referenceWorkout.video_url,
  };
}
