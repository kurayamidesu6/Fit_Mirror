import { Link } from 'react-router-dom';
import { entities } from '@/api/entities';
import { supabase } from '@/api/supabaseClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Bookmark, Play, Clock, Target, BarChart3, Users, Shield } from 'lucide-react';
import TipCreator from '@/components/shared/TipCreator';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useSettings } from '@/lib/SettingsContext';
import { PASS_THRESHOLD_DEFAULT } from '@/lib/poseScoring';

const WORKOUT_IMAGES = [
  'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=800&h=1000&fit=crop',
  'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=800&h=1000&fit=crop',
  'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&h=1000&fit=crop',
  'https://images.unsplash.com/photo-1549576490-b0b4831ef60a?w=800&h=1000&fit=crop',
  'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=800&h=1000&fit=crop',
  'https://images.unsplash.com/photo-1574680096145-d05b474e2155?w=800&h=1000&fit=crop',
];

const difficultyColors = {
  beginner: 'bg-primary/20 text-primary',
  intermediate: 'bg-accent/20 text-accent',
  advanced: 'bg-destructive/20 text-destructive',
};

export default function WorkoutDetail() {
  const workoutId = window.location.pathname.split('/workout/')[1];
  const queryClient = useQueryClient();

  const { data: workout, isLoading } = useQuery({
    queryKey: ['workout', workoutId],
    queryFn: () => entities.Workout.filter({ id: workoutId }),
    select: (data) => data?.[0],
    enabled: !!workoutId,
  });

  // Check if this workout is already saved by the current user
  const { data: existingSaved = [] } = useQuery({
    queryKey: ['saved-check', workoutId],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data, error } = await supabase
        .from('saved_workouts')
        .select('id')
        .eq('user_id', user.id)
        .eq('workout_id', workoutId);
      if (error) throw error;
      return data || [];
    },
    enabled: !!workoutId,
  });

  const isSaved = existingSaved.length > 0;
  const savedRowId = existingSaved[0]?.id;

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (isSaved) {
        // Unsave
        await entities.SavedWorkout.delete(savedRowId);
      } else {
        // Save
        await entities.SavedWorkout.create({
          workout_id: workout.id,
          workout_title: workout.title,
          workout_category: workout.category,
          suggested_sets: 3,
          suggested_reps: 10,
          thumbnail_url: workout.thumbnail_url || null,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saved-check', workoutId] });
      queryClient.invalidateQueries({ queryKey: ['saved-workouts'] });
    },
  });
  const { bgEnabled } = useSettings();

  if (isLoading || !workout) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const image = workout.thumbnail_url || WORKOUT_IMAGES[(workout.id?.charCodeAt?.(0) || 0) % WORKOUT_IMAGES.length];
  const passThreshold = Math.max(PASS_THRESHOLD_DEFAULT, workout.pass_threshold || PASS_THRESHOLD_DEFAULT);

  return (
    <div className="min-h-screen pb-8">
      <div className="px-4 sm:px-8 pt-6">
        <div className="max-w-5xl mx-auto">
          <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-black border border-border shadow-sm">
            {workout.video_url ? (
              <video
                src={workout.video_url}
                poster={image}
                className="w-full h-full object-contain"
                controls
                playsInline
                preload="metadata"
                crossOrigin="anonymous"
              />
            ) : (
              <>
                <img src={image} alt={workout.title} className="w-full h-full object-cover" />
                <div className={cn(
                  'absolute inset-0 bg-gradient-to-t to-transparent',
                  bgEnabled
                    ? 'from-black/80 via-black/20'
                    : 'from-black/70 via-black/10'
                )} />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-16 h-16 rounded-full bg-primary/80 flex items-center justify-center glow-primary">
                    <Play className="w-7 h-7 text-primary-foreground ml-0.5" fill="currentColor" />
                  </div>
                </div>
              </>
            )}

            <Link to="/" className="absolute top-4 left-4 z-10">
              <Button variant="ghost" size="icon" className="rounded-full bg-black/45 text-white backdrop-blur-sm hover:bg-black/65">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>

            <div className="absolute top-4 right-4 z-10 flex gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full bg-black/45 text-white backdrop-blur-sm hover:bg-black/65"
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending}
              >
                <Bookmark className={cn("w-5 h-5 transition-colors", isSaved && "fill-primary text-primary")} />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-4 sm:px-8 pt-6 relative z-10">
        <div className="flex gap-2 mb-3">
          <Badge className={cn("text-xs font-semibold border-0", difficultyColors[workout.difficulty])}>
            {workout.difficulty}
          </Badge>
          <Badge variant="outline" className="text-xs">{workout.category}</Badge>
          {workout.is_pro && (
            <Badge className="bg-chart-3/20 text-chart-3 border-0 text-xs">
              <Shield className="w-3 h-3 mr-0.5" /> PRO
            </Badge>
          )}
        </div>

        <h1 className="font-space font-bold text-2xl mb-2">{workout.title}</h1>

        {/* Creator + Tip */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center font-bold text-sm">
            {workout.creator_name?.[0]?.toUpperCase() || '?'}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-1.5">
              <span className="font-medium text-sm">{workout.creator_name}</span>
              {workout.is_verified_coach && <Shield className="w-3.5 h-3.5 text-primary" />}
            </div>
            <span className="text-xs text-muted-foreground">Creator</span>
          </div>
          <TipCreator
            creatorName={workout.creator_name}
            creatorUserId={workout.created_by || workout.user_id}
            workoutId={workout.id}
          />
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-4 gap-3 mb-6">
          {[
            { icon: Clock, label: 'Duration', value: `${workout.duration_seconds || 30}s` },
            { icon: Target, label: 'Target', value: workout.target_muscle?.replace(/_/g, ' ') || 'Full body' },
            { icon: BarChart3, label: 'Threshold', value: `${passThreshold}%` },
            { icon: Users, label: 'Attempts', value: workout.attempts_count || 0 },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="bg-card rounded-xl p-3 text-center border border-border">
              <Icon className="w-4 h-4 mx-auto text-muted-foreground mb-1" />
              <p className="text-sm font-bold">{value}</p>
              <p className="text-[10px] text-muted-foreground">{label}</p>
            </div>
          ))}
        </div>

        {/* Description */}
        {workout.description && (
          <div className="mb-8">
            <h3 className="text-sm font-semibold mb-2 text-muted-foreground">About</h3>
            <p className="text-sm text-foreground/80 leading-relaxed">{workout.description}</p>
          </div>
        )}

        {/* Save status hint */}
        {isSaved && (
          <p className="text-xs text-primary text-center mb-4">
            ✓ Saved — find it in your Profile → Saved tab
          </p>
        )}

        {/* Try It Button */}
        <Link to={`/try/${workout.id}`}>
          <Button className="w-full h-14 rounded-2xl bg-primary text-primary-foreground font-bold text-lg glow-primary hover:opacity-90 transition-opacity">
            <Play className="w-5 h-5 mr-2" fill="currentColor" />
            Try This Workout
          </Button>
        </Link>
      </div>
    </div>
  );
}
