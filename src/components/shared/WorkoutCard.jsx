import { Link } from 'react-router-dom';
import { Heart, Bookmark, Play, Shield } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useSettings } from '@/lib/SettingsContext';

const WORKOUT_IMAGES = [
  'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=600&h=800&fit=crop',
  'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=600&h=800&fit=crop',
  'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=600&h=800&fit=crop',
  'https://images.unsplash.com/photo-1549576490-b0b4831ef60a?w=600&h=800&fit=crop',
  'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=600&h=800&fit=crop',
  'https://images.unsplash.com/photo-1574680096145-d05b474e2155?w=600&h=800&fit=crop',
];

function getWorkoutImage(workout) {
  if (workout.thumbnail_url) return workout.thumbnail_url;
  return WORKOUT_IMAGES[(workout.id?.charCodeAt?.(0) || 0) % WORKOUT_IMAGES.length];
}

const difficultyColors = {
  beginner: 'bg-primary/20 text-primary',
  intermediate: 'bg-accent/20 text-accent',
  advanced: 'bg-destructive/20 text-destructive',
};

export default function WorkoutCard({ workout, variant = 'feed' }) {
  const image = getWorkoutImage(workout);
  const { bgEnabled } = useSettings();

  if (variant === 'compact') {
    return (
      <Link to={`/workout/${workout.id}`} className="block">
        <div className="relative aspect-square rounded-xl overflow-hidden group">
          <img src={image} alt={workout.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent" />
          {/* Play on hover */}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <div className="w-10 h-10 rounded-full bg-primary/80 flex items-center justify-center">
              <Play className="w-4 h-4 text-primary-foreground ml-0.5" fill="currentColor" />
            </div>
          </div>
          <div className="absolute bottom-2 left-2 right-2">
            <p className="text-xs font-semibold truncate">{workout.title}</p>
            <p className="text-[10px] text-white/60 capitalize mt-0.5">{workout.category}</p>
          </div>
        </div>
      </Link>
    );
  }

  return (
    <Link to={`/workout/${workout.id}`} className="block group">
      <div className={cn(
        'rounded-2xl overflow-hidden hover:border-primary/30 transition-colors duration-200 border',
        bgEnabled
          ? 'bg-black/50 backdrop-blur-sm border-white/10'
          : 'bg-card border-border'
      )}>
        {/* Image */}
        <div className="relative aspect-[3/4] overflow-hidden">
          <img
            src={image}
            alt={workout.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
          <div className={cn(
            'absolute inset-0 bg-gradient-to-t to-transparent',
            bgEnabled
              ? 'from-black/90 via-black/30'
              : 'from-black/80 via-black/10'
          )} />

          {/* Play button */}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <div className="w-12 h-12 rounded-full bg-primary/90 flex items-center justify-center glow-primary">
              <Play className="w-5 h-5 text-primary-foreground ml-0.5" fill="currentColor" />
            </div>
          </div>

          {/* Top badges */}
          <div className="absolute top-2.5 left-2.5 flex gap-1.5">
            <Badge className={cn("text-[10px] font-semibold border-0 px-2 py-0.5", difficultyColors[workout.difficulty])}>
              {workout.difficulty}
            </Badge>
            {workout.is_pro && (
              <Badge className="bg-chart-3/20 text-chart-3 border-0 text-[10px] px-2 py-0.5">
                <Shield className="w-2.5 h-2.5 mr-0.5" /> PRO
              </Badge>
            )}
          </div>

          {/* Bottom content */}
          <div className="absolute bottom-0 left-0 right-0 p-3">
            <h3 className="font-space font-bold text-sm leading-tight mb-1 line-clamp-2">{workout.title}</h3>
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[9px] font-bold">
                {workout.creator_name?.[0]?.toUpperCase() || '?'}
              </div>
              <span className="text-xs text-white/70 truncate">{workout.creator_name}</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className={cn(
          'flex items-center justify-between px-3 py-2.5',
          bgEnabled && 'bg-black/20'
        )}>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Heart className="w-3.5 h-3.5" /> {workout.likes || 0}
            </span>
            <span className="flex items-center gap-1">
              <Bookmark className="w-3.5 h-3.5" /> {workout.saves || 0}
            </span>
          </div>
          <Badge variant="outline" className="text-[10px] text-muted-foreground px-2 py-0.5">
            {workout.category}
          </Badge>
        </div>
      </div>
    </Link>
  );
}
