import { entities } from '@/api/entities';
import { useQuery } from '@tanstack/react-query';
import { Crown, Lock, Shield, Play, ChevronRight, Flame } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { isProUnlocked, PRO_UNLOCK_THRESHOLD } from '@/lib/ranking';
import { motion } from 'framer-motion';

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
          <div className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center">
            <Lock className="w-5 h-5 text-white/70" />
          </div>
        </div>
        <Badge className="absolute top-3 left-3 bg-chart-3/20 text-chart-3 border-0 text-[10px]">
          <Shield className="w-3 h-3 mr-0.5" /> Verified Coach
        </Badge>
      </div>
      <div className="p-4">
        <h3 className="font-semibold text-sm mb-1">{workout.title}</h3>
        <p className="text-xs text-muted-foreground line-clamp-2">{workout.description}</p>
      </div>
    </div>
  );
}

function ProUnlockedCard({ workout, index }) {
  const image = workout.thumbnail_url || PRO_IMAGES[index % PRO_IMAGES.length];
  
  return (
    <Link to={`/workout/${workout.id}`}>
      <div className="relative rounded-2xl overflow-hidden bg-card border border-accent/20 group hover:border-accent/40 transition-colors">
        <div className="relative aspect-video overflow-hidden">
          <img src={image} alt={workout.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent" />
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="w-12 h-12 rounded-full bg-accent/90 flex items-center justify-center glow-accent">
              <Play className="w-5 h-5 text-white ml-0.5" fill="white" />
            </div>
          </div>
          <Badge className="absolute top-3 left-3 bg-chart-3/20 text-chart-3 border-0 text-[10px]">
            <Shield className="w-3 h-3 mr-0.5" /> Verified Coach
          </Badge>
          <Badge className="absolute top-3 right-3 bg-accent/20 text-accent border-0 text-[10px]">
            PRO
          </Badge>
        </div>
        <div className="p-4">
          <h3 className="font-semibold text-sm mb-1">{workout.title}</h3>
          <p className="text-xs text-muted-foreground line-clamp-2">{workout.description}</p>
          <div className="flex items-center gap-2 mt-2">
            <div className="w-5 h-5 rounded-full bg-accent/20 flex items-center justify-center text-[8px] font-bold text-accent">
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

  const completedCount = attempts.filter(a => a.passed).length;
  const unlocked = isProUnlocked(completedCount);
  const progress = Math.min(100, (completedCount / PRO_UNLOCK_THRESHOLD) * 100);
  const remaining = Math.max(0, PRO_UNLOCK_THRESHOLD - completedCount);

  return (
    <div className="min-h-screen pb-24">
      <div className="max-w-lg mx-auto px-4 pt-6">
        {/* Header */}
        <div className="flex items-center gap-2 mb-6">
          <div className="w-8 h-8 rounded-xl bg-accent/20 flex items-center justify-center">
            <Crown className="w-5 h-5 text-accent" />
          </div>
          <h1 className="font-space font-bold text-xl">Pro Coaching</h1>
        </div>

        {/* Locked state */}
        {!unlocked && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-br from-accent/10 to-primary/5 rounded-2xl border border-accent/20 p-6 mb-6"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-accent/20 flex items-center justify-center">
                <Lock className="w-6 h-6 text-accent" />
              </div>
              <div>
                <h2 className="font-bold">Unlock Pro Content</h2>
                <p className="text-sm text-muted-foreground">Complete workouts to access coaching</p>
              </div>
            </div>

            <div className="mb-3">
              <div className="flex justify-between text-sm mb-1.5">
                <span className="text-muted-foreground">Progress</span>
                <span className="font-bold text-accent">{completedCount}/{PRO_UNLOCK_THRESHOLD}</span>
              </div>
              <Progress value={progress} className="h-3" />
            </div>
            
            <p className="text-xs text-muted-foreground mb-4">
              Complete {remaining} more workout{remaining !== 1 ? 's' : ''} successfully to unlock Pro content
            </p>

            <Link to="/">
              <Button className="w-full h-11 rounded-xl bg-accent hover:bg-accent/90 text-accent-foreground font-semibold">
                <Flame className="w-4 h-4 mr-2" /> Browse Workouts
              </Button>
            </Link>
          </motion.div>
        )}

        {/* Unlocked banner */}
        {unlocked && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-r from-accent/20 to-primary/20 rounded-2xl border border-accent/30 p-4 mb-6 flex items-center gap-3"
          >
            <div className="w-10 h-10 rounded-xl bg-accent/30 flex items-center justify-center">
              <Crown className="w-5 h-5 text-accent" />
            </div>
            <div>
              <p className="font-bold text-sm">Pro Unlocked!</p>
              <p className="text-xs text-muted-foreground">Access all coaching content below</p>
            </div>
          </motion.div>
        )}

        {/* Pro Content Grid */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            {unlocked ? 'Pro Workouts' : 'Preview'}
          </h3>
          {proWorkouts.length === 0 ? (
            <div className="text-center py-12">
              <Crown className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">Pro content coming soon</p>
              <p className="text-muted-foreground/50 text-xs mt-1">Check back after more workouts are published</p>
            </div>
          ) : (
            <div className="grid gap-4">
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