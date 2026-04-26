import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { entities } from '@/api/entities';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ChevronRight,
  Film,
  Loader2,
  Play,
  RefreshCw,
  Star,
  Swords,
  Timer,
  TrendingUp,
  Trophy,
  Zap,
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import { TIERS, generateChallenge, getRecommendedTier, getTimeRemaining } from '@/lib/challengeEngine';
import { getRank } from '@/lib/ranking';
import {
  REFERENCE_KEYWORDS,
  getChallengeReference,
  getWorkoutCreatePayload,
} from '@/lib/challengeReferences';

const TIER_KEYS = ['low', 'medium', 'high'];

function normalizeText(value = '') {
  return value.toLowerCase().replace(/[-_]/g, ' ');
}

function findExistingReference(challenge, workouts) {
  const keywords = REFERENCE_KEYWORDS[challenge.reference_key] || [];
  const difficulty = challenge.reference_difficulty;
  const withVideo = workouts.filter((workout) => workout?.video_url && !workout.is_pro);

  const matchesKeywords = (workout) => {
    const haystack = normalizeText(`${workout.title || ''} ${workout.description || ''} ${workout.category || ''}`);
    return keywords.some((keyword) => haystack.includes(normalizeText(keyword)));
  };

  return (
    withVideo.find((workout) => workout.difficulty === difficulty && matchesKeywords(workout)) ||
    withVideo.find(matchesKeywords) ||
    null
  );
}

function attachReferenceToChallenge(challenge, workouts) {
  if (challenge.workout_id) {
    return {
      ...challenge,
      referenceWorkout: workouts.find((workout) => workout.id === challenge.workout_id) || challenge.referenceWorkout || null,
    };
  }

  const existingReference = findExistingReference(challenge, workouts);
  if (existingReference) {
    return {
      ...challenge,
      workout_id: existingReference.id,
      referenceWorkout: existingReference,
      referenceSource: 'library',
    };
  }

  return {
    ...challenge,
    referenceWorkout: getChallengeReference(challenge.reference_difficulty),
    referenceSource: 'curated',
  };
}

function inferReferenceMeta(challenge) {
  if (challenge.reference_key && challenge.reference_difficulty) return challenge;

  const text = normalizeText(`${challenge.title || ''} ${challenge.description || ''} ${challenge.difficulty_label || ''}`);
  if (text.includes('burpee') || text.includes('intermediate')) {
    return {
      ...challenge,
      reference_key: 'intermediate-burpee',
      reference_difficulty: 'intermediate',
    };
  }

  if (
    text.includes('pull') ||
    text.includes('muscle') ||
    text.includes('handstand') ||
    text.includes('advanced') ||
    text.includes('pro')
  ) {
    return {
      ...challenge,
      reference_key: 'advanced-pull-up',
      reference_difficulty: 'advanced',
    };
  }

  return {
    ...challenge,
    reference_key: 'beginner-squat',
    reference_difficulty: 'beginner',
  };
}

function toChallengePayload(challenge) {
  const {
    referenceWorkout,
    referenceSource,
    reference_key,
    reference_difficulty,
    ...payload
  } = challenge;

  return payload;
}

function TierCard({ tierKey, selected, onSelect, recommended }) {
  const tier = TIERS[tierKey];
  return (
    <button
      type="button"
      onClick={() => onSelect(tierKey)}
      className={cn(
        'relative flex-1 rounded-2xl border-2 p-5 text-left transition-all duration-200',
        selected ? 'border-primary bg-primary/5' : 'border-border bg-card hover:border-border/80',
      )}
    >
      {recommended && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-[10px] font-bold px-2.5 py-0.5 rounded-full whitespace-nowrap">
          Recommended
        </div>
      )}
      <p className="font-space font-bold text-base mb-1">{tier.label}</p>
      <p className={cn('text-2xl font-bold', tier.color)}>{tier.stake} FIT</p>
      <p className="text-xs text-muted-foreground mt-1">x{tier.multiplier} reward</p>
      <p className="text-xs mt-2 text-foreground/60">{tier.risk}</p>
    </button>
  );
}

function ChallengeCard({
  challenge,
  referenceWorkout,
  onAccept,
  onAbandon,
  onAttachAndStart,
  isAccepting,
  isStarting,
}) {
  const tier = TIERS[challenge.tier] || TIERS.low;
  const timeLeft = getTimeRemaining(challenge.expires_at);
  const reward = Math.floor((challenge.stake_amount || 0) * (challenge.reward_multiplier || 1));
  const canStart = challenge.status === 'active' && challenge.workout_id;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={cn('rounded-2xl border p-6', tier.bg, 'border-border')}
    >
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
            {challenge.difficulty_label}
          </p>
          <h3 className="font-space font-bold text-xl">{challenge.title}</h3>
        </div>
        <Badge className={cn('border-0 text-xs', tier.bg, tier.color)}>{tier.risk}</Badge>
      </div>

      <p className="text-sm text-foreground/70 mb-5 leading-relaxed">{challenge.description}</p>

      <div className="mb-5 overflow-hidden rounded-xl border border-border bg-background/70">
        {referenceWorkout?.video_url ? (
          <video
            src={referenceWorkout.video_url}
            poster={referenceWorkout.thumbnail_url || ''}
            className="aspect-video w-full bg-black object-contain"
            controls
            muted
            playsInline
            preload="metadata"
            crossOrigin="anonymous"
          />
        ) : (
          <div className="aspect-video w-full flex flex-col items-center justify-center gap-2 text-muted-foreground">
            <Film className="w-8 h-8" />
            <span className="text-sm font-medium">No reference video attached</span>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-5 text-xs text-muted-foreground">
        <Film className="w-4 h-4" />
        <span>
          {referenceWorkout?.title || 'Reference workout missing'}
        </span>
        {referenceWorkout?.source_url && (
          <a
            href={referenceWorkout.source_url}
            target="_blank"
            rel="noreferrer"
            className="text-primary hover:underline"
          >
            source
          </a>
        )}
      </div>

      <div className="grid grid-cols-3 gap-3 mb-5">
        {[
          { label: 'Stake', value: `${challenge.stake_amount} FIT`, icon: Zap },
          { label: 'Reward', value: `${reward} FIT`, icon: Trophy },
          { label: 'Target', value: `${challenge.target_score}%`, icon: Star },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="bg-background/60 rounded-xl p-3 text-center">
            <Icon className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
            <p className="text-sm font-bold">{value}</p>
            <p className="text-xs text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-5">
        <Timer className="w-4 h-4" />
        <span>Expires in {timeLeft}</span>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        {canStart && (
          <Button asChild className="flex-1 h-11 rounded-xl font-bold">
            <Link to={`/try/${challenge.workout_id}`}>
              <Play className="w-4 h-4 mr-1" />
              Start Workout
            </Link>
          </Button>
        )}

        {!canStart && challenge.status === 'active' && onAttachAndStart && (
          <Button
            className="flex-1 h-11 rounded-xl font-bold"
            disabled={isStarting || !referenceWorkout?.video_url}
            onClick={() => onAttachAndStart(challenge)}
          >
            {isStarting ? (
              <Loader2 className="w-4 h-4 mr-1 animate-spin" />
            ) : (
              <Play className="w-4 h-4 mr-1" />
            )}
            {isStarting ? 'Starting...' : 'Start Workout'}
          </Button>
        )}

        {challenge.status === 'active' && onAbandon && (
          <Button variant="outline" className="flex-1 h-11 rounded-xl" onClick={onAbandon}>
            Abandon
          </Button>
        )}

        {onAccept && (
          <Button
            className="flex-1 h-11 rounded-xl font-bold"
            disabled={isAccepting || !referenceWorkout?.video_url}
            onClick={() => onAccept(challenge)}
          >
            {isAccepting ? (
              <Loader2 className="w-4 h-4 mr-1 animate-spin" />
            ) : (
              <ChevronRight className="w-4 h-4 mr-1" />
            )}
            {isAccepting ? 'Starting...' : 'Accept and Start'}
          </Button>
        )}
      </div>
    </motion.div>
  );
}

export default function Challenge() {
  const [selectedTier, setSelectedTier] = useState('low');
  const [generatedChallenge, setGeneratedChallenge] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { toast } = useToast();

  const { data: attempts = [] } = useQuery({
    queryKey: ['my-attempts'],
    queryFn: () => entities.Attempt.list('-created_date', 100),
  });

  const { data: workouts = [] } = useQuery({
    queryKey: ['workouts'],
    queryFn: () => entities.Workout.list('-created_date', 200),
  });

  const { data: activeChallenges = [] } = useQuery({
    queryKey: ['challenges'],
    queryFn: () => entities.Challenge.filter({ status: 'active' }, '-created_date', 10),
  });

  const activeChallengeCards = useMemo(
    () => activeChallenges.map((challenge) => attachReferenceToChallenge(inferReferenceMeta(challenge), workouts)),
    [activeChallenges, workouts],
  );

  const completedCount = attempts.filter((attempt) => attempt.passed).length;
  const rank = getRank(completedCount);
  const recommendedTier = getRecommendedTier(completedCount);
  const totalRewards = attempts.reduce((sum, attempt) => sum + (attempt.reward_earned || 0), 0);

  const ensureChallengeWorkout = async (challenge) => {
    if (challenge.workout_id) return challenge.workout_id;

    const referenceWorkout = challenge.referenceWorkout || getChallengeReference(challenge.reference_difficulty);
    if (!referenceWorkout?.video_url) {
      throw new Error('This challenge does not have a reference video.');
    }

    const existing = await entities.Workout.filter({ title: referenceWorkout.title }, '-created_date', 1);
    if (existing?.[0]?.video_url) {
      return existing[0].id;
    }

    const createdWorkout = await entities.Workout.create(getWorkoutCreatePayload(referenceWorkout));
    return createdWorkout.id;
  };

  const acceptMutation = useMutation({
    mutationFn: async (challenge) => {
      const workoutId = await ensureChallengeWorkout(challenge);
      const payload = toChallengePayload({ ...challenge, workout_id: workoutId });
      return entities.Challenge.create(payload);
    },
    onSuccess: (createdChallenge) => {
      queryClient.invalidateQueries({ queryKey: ['challenges'] });
      queryClient.invalidateQueries({ queryKey: ['workouts'] });
      setGeneratedChallenge(null);

      if (createdChallenge.workout_id) {
        navigate(`/try/${createdChallenge.workout_id}`);
      }
    },
    onError: (err) => {
      toast({
        title: 'Challenge could not start',
        description: err?.message || 'Please generate another challenge and try again.',
        variant: 'destructive',
      });
    },
  });

  const abandonMutation = useMutation({
    mutationFn: (id) => entities.Challenge.update(id, { status: 'failed' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['challenges'] }),
  });

  const attachAndStartMutation = useMutation({
    mutationFn: async (challenge) => {
      const workoutId = await ensureChallengeWorkout(challenge);
      await entities.Challenge.update(challenge.id, { workout_id: workoutId });
      return workoutId;
    },
    onSuccess: (workoutId) => {
      queryClient.invalidateQueries({ queryKey: ['challenges'] });
      queryClient.invalidateQueries({ queryKey: ['workouts'] });
      navigate(`/try/${workoutId}`);
    },
    onError: (err) => {
      toast({
        title: 'Challenge could not start',
        description: err?.message || 'Please generate another challenge and try again.',
        variant: 'destructive',
      });
    },
  });

  const handleGenerate = () => {
    setIsGenerating(true);
    setTimeout(() => {
      const challenge = generateChallenge(rank.name, selectedTier, completedCount);
      setGeneratedChallenge(attachReferenceToChallenge(challenge, workouts));
      setIsGenerating(false);
    }, 500);
  };

  return (
    <div className="min-h-screen">
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border px-8 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-destructive/10 flex items-center justify-center">
              <Swords className="w-5 h-5 text-destructive" />
            </div>
            <div>
              <h1 className="font-space font-bold text-2xl">Challenges</h1>
              <p className="text-sm text-muted-foreground">Stake FIT points and multiply your rewards</p>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-card border border-border rounded-full px-4 py-2">
            <Zap className="w-4 h-4 text-primary" />
            <span className="font-bold text-primary">{totalRewards} FIT</span>
          </div>
        </div>
      </div>

      <div className="px-8 py-6 flex gap-8">
        <div className="w-80 flex-shrink-0 space-y-5">
          <div className="bg-card rounded-2xl border border-border p-5">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-3">Your Status</p>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-space font-bold text-xl">{rank.name}</p>
                <p className="text-sm text-muted-foreground mt-0.5">{completedCount} workouts completed</p>
              </div>
            </div>
          </div>

          <div>
            <p className="text-sm font-semibold mb-3">Select Challenge Tier</p>
            <div className="flex flex-col gap-3">
              {TIER_KEYS.map((tierKey) => (
                <TierCard
                  key={tierKey}
                  tierKey={tierKey}
                  selected={selectedTier === tierKey}
                  onSelect={setSelectedTier}
                  recommended={recommendedTier === tierKey}
                />
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-3 text-center">
              Challenge references match beginner, intermediate, and advanced movement levels.
            </p>
          </div>

          <Button
            onClick={handleGenerate}
            disabled={isGenerating || acceptMutation.isPending}
            className="w-full h-12 rounded-xl bg-destructive/90 hover:bg-destructive text-white font-bold"
          >
            {isGenerating ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Swords className="w-4 h-4 mr-2" />
                Generate My Challenge
              </>
            )}
          </Button>
        </div>

        <div className="flex-1 space-y-5">
          <AnimatePresence mode="wait">
            {generatedChallenge && (
              <ChallengeCard
                key="generated-challenge"
                challenge={generatedChallenge}
                referenceWorkout={generatedChallenge.referenceWorkout}
                onAccept={(challenge) => acceptMutation.mutate(challenge)}
                isAccepting={acceptMutation.isPending}
              />
            )}
          </AnimatePresence>

          {!generatedChallenge && activeChallengeCards.length === 0 && (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center mb-4">
                <Swords className="w-8 h-8 text-muted-foreground" />
              </div>
              <p className="font-semibold text-muted-foreground">No active challenges</p>
              <p className="text-sm text-muted-foreground/60 mt-1">Select a tier and generate one to get started</p>
            </div>
          )}

          {activeChallengeCards.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-4 h-4 text-muted-foreground" />
                <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  Active Challenges ({activeChallengeCards.length})
                </p>
              </div>
              <div className="space-y-4">
                {activeChallengeCards.map((challenge) => (
                  <ChallengeCard
                    key={challenge.id}
                    challenge={challenge}
                    referenceWorkout={challenge.referenceWorkout}
                    onAttachAndStart={(currentChallenge) => attachAndStartMutation.mutate(currentChallenge)}
                    onAbandon={() => abandonMutation.mutate(challenge.id)}
                    isStarting={attachAndStartMutation.isPending}
                  />
                ))}
              </div>
            </div>
          )}

          <p className="text-xs text-muted-foreground text-center">
            Challenges use in-app FIT points only. No real currency involved.
          </p>
        </div>
      </div>
    </div>
  );
}
