import { useState } from 'react';
import { entities } from '@/api/entities';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bookmark, Minus, Plus, Trash2, Dumbbell } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

const CATEGORY_COLORS = {
  strength: 'bg-primary/20 text-primary',
  cardio: 'bg-destructive/20 text-destructive',
  hiit: 'bg-chart-3/20 text-chart-3',
  mobility: 'bg-accent/20 text-accent',
  yoga: 'bg-chart-2/20 text-chart-2',
  calisthenics: 'bg-chart-5/20 text-chart-5',
};

const WORKOUT_IMAGES = [
  'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=200&h=200&fit=crop',
  'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=200&h=200&fit=crop',
  'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=200&h=200&fit=crop',
  'https://images.unsplash.com/photo-1549576490-b0b4831ef60a?w=200&h=200&fit=crop',
  'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=200&h=200&fit=crop',
];

function SavedCard({ saved, onUnsave }) {
  const [sets, setSets] = useState(saved.suggested_sets || 3);
  const [reps, setReps] = useState(saved.suggested_reps || 10);
  const image = saved.thumbnail_url || WORKOUT_IMAGES[(saved.workout_id?.charCodeAt?.(0) || 0) % WORKOUT_IMAGES.length];

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      <div className="flex items-stretch">
        {/* Thumbnail */}
        <Link to={`/workout/${saved.workout_id}`} className="relative w-20 flex-shrink-0 block">
          <img src={image} alt={saved.workout_title} className="w-full h-full object-cover" />
        </Link>

        {/* Info */}
        <div className="flex-1 p-3 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <Link to={`/workout/${saved.workout_id}`} className="flex-1 min-w-0">
              <h3 className="font-semibold text-xs leading-tight truncate hover:text-primary transition-colors">
                {saved.workout_title}
              </h3>
            </Link>
            <div className="flex items-center gap-1 flex-shrink-0">
              <Badge className={cn('text-[9px] border-0', CATEGORY_COLORS[saved.workout_category] || 'bg-secondary text-secondary-foreground')}>
                {saved.workout_category}
              </Badge>
              <button
                onClick={() => onUnsave(saved.id)}
                className="text-muted-foreground hover:text-destructive transition-colors p-0.5"
                title="Remove from saved"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Sets & Reps controls */}
          <div className="flex gap-3 mt-2">
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-muted-foreground w-6">Sets</span>
              <button onClick={() => setSets(s => Math.max(1, s - 1))} className="w-5 h-5 rounded bg-secondary flex items-center justify-center">
                <Minus className="w-3 h-3" />
              </button>
              <span className="text-xs font-bold w-4 text-center">{sets}</span>
              <button onClick={() => setSets(s => Math.min(10, s + 1))} className="w-5 h-5 rounded bg-secondary flex items-center justify-center">
                <Plus className="w-3 h-3" />
              </button>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-muted-foreground w-6">Reps</span>
              <button onClick={() => setReps(r => Math.max(1, r - 1))} className="w-5 h-5 rounded bg-secondary flex items-center justify-center">
                <Minus className="w-3 h-3" />
              </button>
              <span className="text-xs font-bold w-4 text-center">{reps}</span>
              <button onClick={() => setReps(r => Math.min(50, r + 1))} className="w-5 h-5 rounded bg-secondary flex items-center justify-center">
                <Plus className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SavedWorkoutsPanel() {
  const queryClient = useQueryClient();

  const { data: savedWorkouts = [], isLoading } = useQuery({
    queryKey: ['saved-workouts'],
    queryFn: () => entities.SavedWorkout.list('-created_date', 50),
  });

  const unsaveMutation = useMutation({
    mutationFn: (id) => entities.SavedWorkout.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saved-workouts'] });
    },
  });

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Bookmark className="w-4 h-4 text-primary" />
        <h3 className="font-semibold text-sm">Saved Workouts</h3>
        {savedWorkouts.length > 0 && (
          <span className="text-xs text-muted-foreground">({savedWorkouts.length})</span>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-20 rounded-2xl bg-secondary animate-pulse" />
          ))}
        </div>
      ) : savedWorkouts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="w-14 h-14 rounded-2xl bg-secondary flex items-center justify-center mb-3">
            <Dumbbell className="w-7 h-7 text-muted-foreground" />
          </div>
          <p className="font-semibold text-sm">No saved workouts yet</p>
          <p className="text-xs text-muted-foreground mt-1 max-w-[200px]">
            Tap the bookmark icon on any workout to save it here
          </p>
          <Link to="/" className="mt-4 text-xs text-primary font-medium hover:underline">
            Browse workouts →
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {savedWorkouts.map(w => (
            <SavedCard
              key={w.id}
              saved={w}
              onUnsave={(id) => unsaveMutation.mutate(id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
