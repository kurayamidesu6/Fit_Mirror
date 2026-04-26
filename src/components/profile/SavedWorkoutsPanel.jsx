import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Bookmark, GripVertical, Minus, Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
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

function SavedCard({ saved, onDragStart }) {
  const [sets, setSets] = useState(saved.suggested_sets || 3);
  const [reps, setReps] = useState(saved.suggested_reps || 10);
  const image = saved.thumbnail_url || WORKOUT_IMAGES[(saved.workout_id?.charCodeAt?.(0) || 0) % WORKOUT_IMAGES.length];

  const handleDragStart = (e) => {
    e.dataTransfer.effectAllowed = 'copy';
    if (typeof window !== 'undefined' && window.__fitMirrorSetDragging) {
      window.__fitMirrorSetDragging({
        workout_id: saved.workout_id,
        title: saved.workout_title,
        category: saved.workout_category || 'strength',
        sets,
        reps,
        thumbnail_url: saved.thumbnail_url,
      });
    }
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      className="bg-card border border-border rounded-2xl overflow-hidden cursor-grab active:cursor-grabbing select-none"
    >
      <div className="flex items-stretch">
        {/* Thumbnail */}
        <div className="relative w-20 flex-shrink-0">
          <img src={image} alt={saved.workout_title} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
            <GripVertical className="w-5 h-5 text-white/70" />
          </div>
        </div>
        {/* Info */}
        <div className="flex-1 p-3 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h3 className="font-semibold text-xs leading-tight truncate">{saved.workout_title}</h3>
            <Badge className={cn('text-[9px] border-0 flex-shrink-0', CATEGORY_COLORS[saved.workout_category] || 'bg-secondary text-secondary-foreground')}>
              {saved.workout_category}
            </Badge>
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
          <p className="text-[10px] text-muted-foreground/60 mt-1.5">Drag to add to a day ↑</p>
        </div>
      </div>
    </div>
  );
}

// Mock saved workouts from recent attempts + feed workouts
const MOCK_SAVED = [
  { workout_id: 'saved-1', workout_title: 'Perfect Push-Up', workout_category: 'strength', suggested_sets: 4, suggested_reps: 10, thumbnail_url: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=200&h=200&fit=crop' },
  { workout_id: 'saved-2', workout_title: 'Kettlebell Swing', workout_category: 'strength', suggested_sets: 3, suggested_reps: 12, thumbnail_url: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=200&h=200&fit=crop' },
  { workout_id: 'saved-3', workout_title: 'Deep Squat Hold', workout_category: 'mobility', suggested_sets: 3, suggested_reps: 8, thumbnail_url: 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=200&h=200&fit=crop' },
  { workout_id: 'saved-4', workout_title: 'Burpee Challenge', workout_category: 'cardio', suggested_sets: 4, suggested_reps: 8, thumbnail_url: 'https://images.unsplash.com/photo-1549576490-b0b4831ef60a?w=200&h=200&fit=crop' },
  { workout_id: 'saved-5', workout_title: 'Warrior Flow', workout_category: 'yoga', suggested_sets: 2, suggested_reps: 5, thumbnail_url: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=200&h=200&fit=crop' },
  { workout_id: 'saved-6', workout_title: 'Explosive Box Jump', workout_category: 'hiit', suggested_sets: 4, suggested_reps: 6, thumbnail_url: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=200&h=200&fit=crop' },
];

export default function SavedWorkoutsPanel() {
  const { data: savedWorkouts = [] } = useQuery({
    queryKey: ['saved-workouts'],
    queryFn: () => base44.entities.SavedWorkout.list('-created_date', 20),
  });

  const displayWorkouts = savedWorkouts.length > 0 ? savedWorkouts : MOCK_SAVED;

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Bookmark className="w-4 h-4 text-primary" />
        <h3 className="font-semibold text-sm">Saved Workouts</h3>
        <span className="text-xs text-muted-foreground">— drag to calendar</span>
      </div>
      <div className="space-y-2">
        {displayWorkouts.map(w => (
          <SavedCard key={w.workout_id || w.id} saved={w} />
        ))}
      </div>
    </div>
  );
}