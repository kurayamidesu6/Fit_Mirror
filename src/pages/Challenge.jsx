import { useState } from 'react';
import { entities } from '@/api/entities';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Swords, Zap, Timer, Trophy, TrendingUp, Star, ChevronRight, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { TIERS, generateChallenge, getRecommendedTier, getTimeRemaining } from '@/lib/challengeEngine';
import { getRank } from '@/lib/ranking';
import { motion, AnimatePresence } from 'framer-motion';

const TIER_KEYS = ['low', 'medium', 'high'];

function TierCard({ tierKey, selected, onSelect, recommended }) {
  const tier = TIERS[tierKey];
  return (
    <button
      onClick={() => onSelect(tierKey)}
      className={cn(
        'relative flex-1 rounded-2xl border-2 p-5 text-left transition-all duration-200',
        selected ? 'border-primary bg-primary/5' : 'border-border bg-card hover:border-border/80'
      )}
    >
      {recommended && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-[10px] font-bold px-2.5 py-0.5 rounded-full whitespace-nowrap">
          ✦ RECOMMENDED
        </div>
      )}
      <p className="font-space font-bold text-base mb-1">{tier.label}</p>
      <p className={cn('text-2xl font-bold', tier.color)}>{tier.stake} FIT</p>
      <p className="text-xs text-muted-foreground mt-1">×{tier.multiplier} reward</p>
      <p className="text-xs mt-2 text-foreground/60">{tier.risk}</p>
    </button>
  );
}

function ChallengeCard({ challenge, onAccept, onAbandon }) {
  const tier = TIERS[challenge.tier];
  const timeLeft = getTimeRemaining(challenge.expires_at);
  const reward = Math.floor(challenge.stake_amount * challenge.reward_multiplier);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn('rounded-2xl border p-6', tier.bg, 'border-border')}
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">{challenge.difficulty_label}</p>
          <h3 className="font-space font-bold text-xl">{challenge.title}</h3>
        </div>
        <Badge className={cn('border-0 text-xs', tier.bg, tier.color)}>{tier.risk}</Badge>
      </div>

      <p className="text-sm text-foreground/70 mb-5 leading-relaxed">{challenge.description}</p>

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

      <div className="flex gap-3">
        {challenge.status === 'active' && onAbandon && (
          <Button variant="outline" className="flex-1 h-11 rounded-xl" onClick={onAbandon}>Abandon</Button>
        )}
        {onAccept && (
          <Button className="flex-1 h-11 rounded-xl font-bold" onClick={() => onAccept(challenge)}>
            Accept Challenge <ChevronRight className="w-4 h-4 ml-1" />
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

  const { data: attempts = [] } = useQuery({
    queryKey: ['my-attempts'],
    queryFn: () => entities.Attempt.list('-created_date', 100),
  });

  const { data: activeChallenges = [] } = useQuery({
    queryKey: ['challenges'],
    queryFn: () => entities.Challenge.filter({ status: 'active' }, '-created_date', 10),
  });

  const completedCount = attempts.filter(a => a.passed).length;
  const rank = getRank(completedCount);
  const recommendedTier = getRecommendedTier(completedCount);
  const totalRewards = attempts.reduce((s, a) => s + (a.reward_earned || 0), 0);

  const acceptMutation = useMutation({
    mutationFn: (challenge) => entities.Challenge.create(challenge),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['challenges'] }); setGeneratedChallenge(null); },
  });

  const abandonMutation = useMutation({
    mutationFn: (id) => entities.Challenge.update(id, { status: 'failed' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['challenges'] }),
  });

  const handleGenerate = () => {
    setIsGenerating(true);
    setTimeout(() => {
      setGeneratedChallenge(generateChallenge(rank.name, selectedTier, completedCount));
      setIsGenerating(false);
    }, 800);
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
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
        {/* Left — controls */}
        <div className="w-80 flex-shrink-0 space-y-5">
          {/* Rank card */}
          <div className="bg-card rounded-2xl border border-border p-5">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-3">Your Status</p>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-space font-bold text-xl">{rank.emoji} {rank.name}</p>
                <p className="text-sm text-muted-foreground mt-0.5">{completedCount} workouts completed</p>
              </div>
            </div>
          </div>

          {/* Tier selection */}
          <div>
            <p className="text-sm font-semibold mb-3">Select Challenge Tier</p>
            <div className="flex flex-col gap-3">
              {TIER_KEYS.map(t => (
                <TierCard
                  key={t}
                  tierKey={t}
                  selected={selectedTier === t}
                  onSelect={setSelectedTier}
                  recommended={recommendedTier === t}
                />
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-3 text-center">
              Stake your FIT Points. Win and multiply. Fail and lose your stake.
            </p>
          </div>

          <Button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="w-full h-12 rounded-xl bg-destructive/90 hover:bg-destructive text-white font-bold"
          >
            {isGenerating
              ? <><RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Generating…</>
              : <><Swords className="w-4 h-4 mr-2" /> Generate My Challenge</>
            }
          </Button>
        </div>

        {/* Right — challenge display */}
        <div className="flex-1 space-y-5">
          <AnimatePresence>
            {generatedChallenge && (
              <ChallengeCard
                challenge={generatedChallenge}
                onAccept={() => acceptMutation.mutate(generatedChallenge)}
              />
            )}
          </AnimatePresence>

          {!generatedChallenge && activeChallenges.length === 0 && (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center mb-4">
                <Swords className="w-8 h-8 text-muted-foreground" />
              </div>
              <p className="font-semibold text-muted-foreground">No active challenges</p>
              <p className="text-sm text-muted-foreground/60 mt-1">Select a tier and generate one to get started</p>
            </div>
          )}

          {activeChallenges.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-4 h-4 text-muted-foreground" />
                <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  Active Challenges ({activeChallenges.length})
                </p>
              </div>
              <div className="space-y-4">
                {activeChallenges.map(c => (
                  <ChallengeCard
                    key={c.id}
                    challenge={c}
                    onAbandon={() => abandonMutation.mutate(c.id)}
                  />
                ))}
              </div>
            </div>
          )}

          <p className="text-xs text-muted-foreground text-center">
            Challenges use in-app Fit Points only. No real currency involved.
          </p>
        </div>
      </div>
    </div>
  );
}
