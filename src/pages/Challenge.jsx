import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Swords, Zap, Timer, Trophy, TrendingUp, Star, ChevronRight, RefreshCw, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
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
        'relative flex-1 rounded-2xl border-2 p-4 text-left transition-all duration-200',
        selected
          ? 'border-primary bg-primary/10'
          : 'border-border bg-card hover:border-border/80'
      )}
    >
      {recommended && (
        <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap">
          ✦ RECOMMENDED
        </div>
      )}
      <p className="font-space font-bold text-sm mb-1">{tier.label}</p>
      <p className={cn('text-xl font-bold', tier.color)}>{tier.stake} FIT</p>
      <p className="text-xs text-muted-foreground mt-1">×{tier.multiplier} reward</p>
      <p className="text-[10px] mt-2">{tier.risk}</p>
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
      className={cn('rounded-2xl border p-5', tier.bg, 'border-border')}
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">{challenge.difficulty_label}</p>
          <h3 className="font-space font-bold text-lg">{challenge.title}</h3>
        </div>
        <Badge className={cn('border-0 text-[10px]', tier.bg, tier.color)}>{tier.risk}</Badge>
      </div>

      <p className="text-sm text-foreground/70 mb-4 leading-relaxed">{challenge.description}</p>

      <div className="grid grid-cols-3 gap-2 mb-4">
        {[
          { label: 'Stake', value: `${challenge.stake_amount} FIT`, icon: Zap },
          { label: 'Reward', value: `${reward} FIT`, icon: Trophy },
          { label: 'Target', value: `${challenge.target_score}% score`, icon: Star },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="bg-background/60 rounded-xl p-2.5 text-center">
            <Icon className="w-3.5 h-3.5 mx-auto mb-1 text-muted-foreground" />
            <p className="text-xs font-bold">{value}</p>
            <p className="text-[9px] text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4">
        <Timer className="w-3.5 h-3.5" />
        <span>Expires in {timeLeft}</span>
      </div>

      <div className="flex gap-3">
        {challenge.status === 'active' && onAbandon && (
          <Button variant="outline" className="flex-1 h-10 rounded-xl text-xs" onClick={onAbandon}>
            Abandon
          </Button>
        )}
        {onAccept && (
          <Button
            className="flex-1 h-10 rounded-xl bg-primary text-primary-foreground font-bold text-sm glow-primary hover:opacity-90"
            onClick={() => onAccept(challenge)}
          >
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
    queryFn: () => base44.entities.Attempt.list('-created_date', 100),
  });

  const { data: activeChallenges = [] } = useQuery({
    queryKey: ['challenges'],
    queryFn: () => base44.entities.Challenge.filter({ status: 'active' }, '-created_date', 10),
  });

  const completedCount = attempts.filter(a => a.passed).length;
  const rank = getRank(completedCount);
  const recommendedTier = getRecommendedTier(completedCount);
  const totalRewards = attempts.reduce((s, a) => s + (a.reward_earned || 0), 0);

  const acceptMutation = useMutation({
    mutationFn: (challenge) => base44.entities.Challenge.create(challenge),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['challenges'] });
      setGeneratedChallenge(null);
    },
  });

  const abandonMutation = useMutation({
    mutationFn: (id) => base44.entities.Challenge.update(id, { status: 'failed' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['challenges'] }),
  });

  const handleGenerate = () => {
    setIsGenerating(true);
    setTimeout(() => {
      const challenge = generateChallenge(rank.name, selectedTier, completedCount);
      setGeneratedChallenge(challenge);
      setIsGenerating(false);
    }, 800);
  };

  return (
    <div className="min-h-screen pb-28">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border">
        <div className="max-w-lg mx-auto px-4 pt-4 pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-destructive/20 flex items-center justify-center">
                <Swords className="w-5 h-5 text-destructive" />
              </div>
              <h1 className="font-space font-bold text-xl">Challenges</h1>
            </div>
            <div className="flex items-center gap-2 bg-card border border-border rounded-full px-3 py-1">
              <Zap className="w-3.5 h-3.5 text-primary" />
              <span className="text-sm font-bold text-primary">{totalRewards} FIT</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 pt-4 space-y-6">
        {/* Rank context */}
        <div className="bg-card rounded-2xl border border-border p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Your Rank</p>
            <p className="font-space font-bold text-lg">{rank.emoji} {rank.name}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground mb-1">Completed</p>
            <p className="font-space font-bold text-lg">{completedCount} workouts</p>
          </div>
        </div>

        {/* Tier selection */}
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-3">Select Challenge Tier</p>
          <div className="flex gap-3">
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
          <p className="text-[10px] text-muted-foreground mt-2 text-center">
            Stake your Fit Points. Win and multiply. Fail and lose your stake.
          </p>
        </div>

        {/* Generate button */}
        <Button
          onClick={handleGenerate}
          disabled={isGenerating}
          className="w-full h-12 rounded-2xl bg-destructive/90 hover:bg-destructive text-white font-bold"
        >
          {isGenerating ? (
            <><RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Generating Challenge...</>
          ) : (
            <><Swords className="w-4 h-4 mr-2" /> Generate My Challenge</>
          )}
        </Button>

        {/* Generated challenge */}
        <AnimatePresence>
          {generatedChallenge && (
            <ChallengeCard
              challenge={generatedChallenge}
              onAccept={() => acceptMutation.mutate(generatedChallenge)}
            />
          )}
        </AnimatePresence>

        {/* Active challenges */}
        {activeChallenges.length > 0 && (
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
              <TrendingUp className="w-3.5 h-3.5" /> Active Challenges ({activeChallenges.length})
            </p>
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

        {/* Disclaimer */}
        <p className="text-[10px] text-muted-foreground text-center pb-4">
          Challenges use in-app Fit Points only. No real currency is involved.
          Points are earned through verified workout completions.
        </p>
      </div>
    </div>
  );
}