import { entities } from '@/api/entities';
import { useQuery } from '@tanstack/react-query';
import { Crown, Lock, Shield, Play, Flame, Coins } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { PRO_UNLOCK_THRESHOLD } from '@/lib/ranking';
import { motion } from 'framer-motion';
import { useWallet } from '@/lib/WalletContext';

const PRO_IMAGES = [
  'https://images.unsplash.com/photo-1550345332-09e3ac987658?w=600&h=400&fit=crop',
  'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=600&h=400&fit=crop',
  'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=600&h=400&fit=crop',
  'https://images.unsplash.com/photo-1540497077202-7c8a3999166f?w=600&h=400&fit=crop',
];

function ProLockedCard({ workout, index }) {
  const image = workout.thumbnail_url || PRO_IMAGES[index % PRO_IMAGES.length];
  return (
    <div className="relative rounded-2xl overflow-hidden bg-card border border-border">
      <div className="relative aspect-video overflow-hidden">
        <img src={image} alt={workout.title} className="w-full h-full object-cover blur-sm opacity-60" />
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
          <div className="w-14 h-14 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center">
            <Lock className="w-6 h-6 text-white/70" />
          </div>
        </div>
        <Badge className="absolute top-3 left-3 bg-chart-3/20 text-chart-3 border-0 text-xs">
          <Shield className="w-3 h-3 mr-0.5" /> Verified Coach
        </Badge>
      </div>
      <div className="p-4">
        <h3 className="font-semibold mb-1">{workout.title}</h3>
        <p className="text-sm text-muted-foreground line-clamp-2">{workout.description}</p>
      </div>
    </div>
  );
}

function ProUnlockedCard({ workout, index }) {
  const image = workout.thumbnail_url || PRO_IMAGES[index % PRO_IMAGES.length];
  return (
    <Link to={`/workout/${workout.id}`}>
      <div className="relative rounded-2xl overflow-hidden bg-card border border-accent/20 group hover:border-accent/50 transition-colors">
        <div className="relative aspect-video overflow-hidden">
          <img src={image} alt={workout.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent" />
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="w-14 h-14 rounded-full bg-accent/90 flex items-center justify-center">
              <Play className="w-6 h-6 text-white ml-0.5" fill="white" />
            </div>
          </div>
          <Badge className="absolute top-3 left-3 bg-chart-3/20 text-chart-3 border-0 text-xs">
            <Shield className="w-3 h-3 mr-0.5" /> Verified Coach
          </Badge>
          <Badge className="absolute top-3 right-3 bg-accent/20 text-accent border-0 text-xs">PRO</Badge>
        </div>
        <div className="p-4">
          <h3 className="font-semibold mb-1">{workout.title}</h3>
          <p className="text-sm text-muted-foreground line-clamp-2">{workout.description}</p>
          <div className="flex items-center gap-2 mt-3">
            <div className="w-5 h-5 rounded-full bg-accent/20 flex items-center justify-center text-[9px] font-bold text-accent">
              {workout.creator_name?.[0]?.toUpperCase()}
            </div>
            <span className="text-xs text-muted-foreground">{workout.creator_name}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}

export default function Pro() {
  const { data: attempts = [] } = useQuery({
    queryKey: ['my-attempts'],
    queryFn: () => entities.Attempt.list('-created_date', 100),
  });

  const { data: proWorkouts = [] } = useQuery({
    queryKey: ['pro-workouts'],
    queryFn: () => entities.Workout.filter({ is_pro: true }, '-created_date', 20),
  });

  const { fitBalance, PRO_TOKEN_THRESHOLD } = useWallet();
  const completedCount = attempts.filter(a => a.passed).length;
  // Unlock via workouts completed OR FIT tokens held
  const unlockedByWorkouts = completedCount >= PRO_UNLOCK_THRESHOLD;
  const unlockedByTokens = fitBalance >= PRO_TOKEN_THRESHOLD;
  const unlocked = unlockedByWorkouts || unlockedByTokens;
  const workoutProgress = Math.min(100, (completedCount / PRO_UNLOCK_THRESHOLD) * 100);
  const tokenProgress = Math.min(100, (fitBalance / PRO_TOKEN_THRESHOLD) * 100);
  const workoutsRemaining = Math.max(0, PRO_UNLOCK_THRESHOLD - completedCount);
  const tokensRemaining = Math.max(0, PRO_TOKEN_THRESHOLD - fitBalance);

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border px-8 py-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-accent/10 flex items-center justify-center">
            <Crown className="w-5 h-5 text-accent" />
          </div>
          <div>
            <h1 className="font-space font-bold text-2xl">Pro Coaching</h1>
            <p className="text-sm text-muted-foreground">Verified coach content — earn access by completing workouts</p>
          </div>
        </div>
      </div>

      <div className="px-8 py-6">
        {/* Unlock / unlocked banner */}
        {!unlocked ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-br from-accent/10 to-primary/5 rounded-2xl border border-accent/20 p-6 mb-8"
          >
            <div className="flex items-center gap-3 mb-5">
              <div className="w-12 h-12 rounded-2xl bg-accent/20 flex items-center justify-center flex-shrink-0">
                <Lock className="w-6 h-6 text-accent" />
              </div>
              <div>
                <h2 className="font-bold text-lg">Unlock Pro Content</h2>
                <p className="text-sm text-muted-foreground">Complete either path to get instant access</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-5">
              {/* Path 1 — workouts */}
              <div className="bg-background/50 rounded-xl p-4 border border-border">
                <div className="flex items-center gap-2 mb-2">
                  <Flame className="w-4 h-4 text-primary" />
                  <span className="text-sm font-semibold">Complete Workouts</span>
                </div>
                <p className="text-xs text-muted-foreground mb-3">
                  {workoutsRemaining > 0 ? `${workoutsRemaining} more to go` : 'Done!'}
                </p>
                <Progress value={workoutProgress} className="h-2 mb-1" />
                <p className="text-[10px] text-muted-foreground text-right">{completedCount}/{PRO_UNLOCK_THRESHOLD}</p>
              </div>

              {/* Path 2 — tokens */}
              <div className="bg-background/50 rounded-xl p-4 border border-border">
                <div className="flex items-center gap-2 mb-2">
                  <Coins className="w-4 h-4 text-chart-3" />
                  <span className="text-sm font-semibold">Hold FIT Tokens</span>
                </div>
                <p className="text-xs text-muted-foreground mb-3">
                  {tokensRemaining > 0 ? `${tokensRemaining} FIT to go` : 'Done!'}
                </p>
                <Progress value={tokenProgress} className="h-2 mb-1" />
                <p className="text-[10px] text-muted-foreground text-right">{fitBalance}/{PRO_TOKEN_THRESHOLD} FIT</p>
              </div>
            </div>

            <Link to="/">
              <Button className="h-11 px-6 rounded-xl bg-accent hover:bg-accent/90 text-accent-foreground font-semibold">
                <Flame className="w-4 h-4 mr-2" /> Start Earning FIT
              </Button>
            </Link>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-r from-accent/20 to-primary/20 rounded-2xl border border-accent/30 p-5 mb-8 flex items-center gap-4"
          >
            <div className="w-12 h-12 rounded-xl bg-accent/30 flex items-center justify-center">
              <Crown className="w-6 h-6 text-accent" />
            </div>
            <div>
              <p className="font-bold text-lg">Pro Unlocked!</p>
              <p className="text-sm text-muted-foreground">You have full access to all verified coach content below.</p>
            </div>
          </motion.div>
        )}

        {/* Content grid */}
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
            {unlocked ? 'Pro Workouts' : 'Preview — unlock to access'}
          </h3>
          {proWorkouts.length === 0 ? (
            <div className="text-center py-20">
              <Crown className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-muted-foreground font-medium">Pro content coming soon</p>
              <p className="text-sm text-muted-foreground/50 mt-1">Check back after more workouts are published</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {proWorkouts.map((workout, i) => (
                unlocked
                  ? <ProUnlockedCard key={workout.id} workout={workout} index={i} />
                  : <ProLockedCard key={workout.id} workout={workout} index={i} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
