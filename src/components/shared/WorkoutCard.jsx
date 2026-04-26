import { Link } from 'react-router-dom';
import { Heart, Bookmark, Play, Shield } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

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
  const index = (workout.id?.charCodeAt?.(0) || 0) % WORKOUT_IMAGES.length;
  return WORKOUT_IMAGES[index];
}

const difficultyColors = {
  beginner: 'bg-primary/20 text-primary',
  intermediate: 'bg-accent/20 text-accent',
  advanced: 'bg-destructive/20 text-destructive',
};

export default function WorkoutCard({ workout, variant = 'feed' }) {
  const image = getWorkoutImage(workout);

  if (variant === 'compact') {
    return (
      <Link to={`/workout/${workout.id}`} className="block">
        <div className="relative aspect-square rounded-xl overflow-hidden group">
          <img src={image} alt={workout.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent" />
          <div className="absolute bottom-2 left-2 right-2">
            <p className="text-xs font-medium truncate">{workout.title}</p>
          </div>
        </div>
      </Link>
    );
  }

  return (
    <Link to={`/workout/${workout.id}`} className="block">
      <div className="relative rounded-2xl overflow-hidden bg-card border border-border group">
        {/* Image */}
        <div className="relative aspect-[4/5] overflow-hidden">
          <img 
            src={image} 
            alt={workout.title} 
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
          
          {/* Play button overlay */}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <div className="w-14 h-14 rounded-full bg-primary/90 flex items-center justify-center glow-primary">
              <Play className="w-6 h-6 text-primary-foreground ml-0.5" fill="currentColor" />
            </div>
          </div>

          {/* Top badges */}
          <div className="absolute top-3 left-3 flex gap-2">
            <Badge className={cn("text-[10px] font-semibold border-0", difficultyColors[workout.difficulty])}>
              {workout.difficulty}
            </Badge>
            {workout.is_pro && (
              <Badge className="bg-chart-3/20 text-chart-3 border-0 text-[10px]">
                <Shield className="w-3 h-3 mr-0.5" /> PRO
              </Badge>
            )}
          </div>

          {/* Bottom content */}
          <div className="absolute bottom-0 left-0 right-0 p-4">
            <h3 className="font-space font-bold text-lg leading-tight mb-1">{workout.title}</h3>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center text-[10px] font-bold">
                {workout.creator_name?.[0]?.toUpperCase() || '?'}
              </div>
              <span className="text-sm text-foreground/70">{workout.creator_name}</span>
              {workout.is_verified_coach && (
                <Shield className="w-3.5 h-3.5 text-primary" />
              )}
            </div>
          </div>
        </div>

        {/* Footer stats */}
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Heart className="w-4 h-4" /> {workout.likes || 0}
            </span>
            <span className="flex items-center gap-1">
              <Bookmark className="w-4 h-4" /> {workout.saves || 0}
            </span>
          </div>
          <Badge variant="outline" className="text-[10px] text-muted-foreground">
            {workout.category}
          </Badge>
        </div>
      </div>
    </Link>
  );
}