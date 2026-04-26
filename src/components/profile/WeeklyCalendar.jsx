import { useState } from 'react';
import { Trash2, Plus, ChevronDown, ChevronUp, X, Check } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { DAYS, DAY_FULL } from '@/lib/scheduleUtils';
import { motion, AnimatePresence } from 'framer-motion';
import { entities } from '@/api/entities';
import { useQuery } from '@tanstack/react-query';

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


function ScheduledWorkoutChip({ workout, dayKey, onRemove }) {
  return (
    <div className="flex items-center gap-2 bg-secondary rounded-xl px-3 py-2 group">
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold truncate">{workout.title}</p>
        <p className="text-[10px] text-muted-foreground">{workout.sets}×{workout.reps} · {workout.category}</p>
      </div>
      <button
        onClick={() => onRemove(dayKey, workout.workout_id)}
        className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive flex-shrink-0"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

function WorkoutPickerItem({ saved, alreadyAdded, onSelect }) {
  const image = saved.thumbnail_url || WORKOUT_IMAGES[(saved.workout_id?.charCodeAt?.(0) || 0) % WORKOUT_IMAGES.length];

  return (
    <button
      onClick={() => !alreadyAdded && onSelect(saved)}
      className={cn(
        'w-full flex items-center gap-3 p-2.5 rounded-xl text-left transition-all',
        alreadyAdded
          ? 'opacity-50 cursor-not-allowed bg-secondary/50'
          : 'hover:bg-secondary active:scale-[0.98] cursor-pointer'
      )}
    >
      <img
        src={image}
        alt={saved.workout_title}
        className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
      />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold truncate">{saved.workout_title}</p>
        <p className="text-[10px] text-muted-foreground capitalize">{saved.workout_category} · {saved.suggested_sets}×{saved.suggested_reps}</p>
      </div>
      <div className="flex-shrink-0">
        {alreadyAdded ? (
          <Check className="w-4 h-4 text-primary" />
        ) : (
          <Plus className="w-4 h-4 text-muted-foreground" />
        )}
      </div>
    </button>
  );
}

function DayColumn({ dayKey, workouts, onAdd, onRemove, savedWorkouts }) {
  const [expanded, setExpanded] = useState(true);
  const [pickerOpen, setPickerOpen] = useState(false);

  const handleAdd = (saved) => {
    onAdd(dayKey, {
      workout_id: saved.workout_id,
      title: saved.workout_title,
      category: saved.workout_category || 'strength',
      sets: saved.suggested_sets || 3,
      reps: saved.suggested_reps || 10,
      thumbnail_url: saved.thumbnail_url,
    });
    setPickerOpen(false);
  };

  return (
    <div className="rounded-2xl border border-border bg-card">
      {/* Day header */}
      <div className="flex items-center px-4 py-3 gap-2">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex-1 flex items-center gap-2 text-left"
        >
          <span className="font-space font-bold text-sm">{DAY_FULL[dayKey]}</span>
          {workouts.length > 0 && (
            <Badge className="bg-primary/20 text-primary border-0 text-[10px]">
              {workouts.length}
            </Badge>
          )}
        </button>
        <button
          onClick={() => { setPickerOpen(!pickerOpen); setExpanded(true); }}
          className="w-7 h-7 rounded-lg bg-primary/10 hover:bg-primary/20 flex items-center justify-center transition-colors"
        >
          {pickerOpen ? <X className="w-3.5 h-3.5 text-primary" /> : <Plus className="w-3.5 h-3.5 text-primary" />}
        </button>
        <button onClick={() => setExpanded(!expanded)}>
          {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </button>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 space-y-2">
              {/* Scheduled workouts */}
              {workouts.map(w => (
                <ScheduledWorkoutChip key={w.workout_id} workout={w} dayKey={dayKey} onRemove={onRemove} />
              ))}

              {/* Workout picker */}
              <AnimatePresence>
                {pickerOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.15 }}
                    className="rounded-xl border border-border bg-background shadow-lg overflow-hidden"
                  >
                    <div className="px-3 pt-2.5 pb-1 border-b border-border">
                      <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                        Add to {DAY_FULL[dayKey]}
                      </p>
                    </div>
                    <div className="p-1.5 max-h-52 overflow-y-auto space-y-0.5">
                      {savedWorkouts.length === 0 ? (
                        <p className="text-xs text-muted-foreground text-center py-4">
                          No saved workouts yet
                        </p>
                      ) : (
                        savedWorkouts.map(saved => (
                          <WorkoutPickerItem
                            key={saved.workout_id || saved.id}
                            saved={saved}
                            alreadyAdded={workouts.some(w => w.workout_id === (saved.workout_id || saved.id))}
                            onSelect={handleAdd}
                          />
                        ))
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Empty state (no picker open) */}
              {workouts.length === 0 && !pickerOpen && (
                <button
                  onClick={() => setPickerOpen(true)}
                  className="w-full rounded-xl border-2 border-dashed border-border/60 p-3 text-center text-muted-foreground/50 hover:border-primary/40 hover:text-primary/60 transition-all"
                >
                  <Plus className="w-4 h-4 mx-auto mb-1" />
                  <p className="text-[10px]">Add workout</p>
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function WeeklyCalendar({ schedule, onScheduleChange }) {
  const { data: savedWorkouts = [] } = useQuery({
    queryKey: ['saved-workouts'],
    queryFn: () => entities.SavedWorkout.list('-created_date', 20),
  });

  const handleAdd = (dayKey, workout) => {
    const existing = schedule[dayKey] || [];
    if (existing.some(e => e.workout_id === workout.workout_id)) return;
    onScheduleChange({ ...schedule, [dayKey]: [...existing, workout] });
  };

  const handleRemove = (dayKey, workoutId) => {
    onScheduleChange({
      ...schedule,
      [dayKey]: (schedule[dayKey] || []).filter(w => w.workout_id !== workoutId),
    });
  };

  return (
    <div className="space-y-2">
      {DAYS.map(day => (
        <DayColumn
          key={day}
          dayKey={day}
          workouts={schedule[day] || []}
          onAdd={handleAdd}
          onRemove={handleRemove}
          savedWorkouts={savedWorkouts}
        />
      ))}
    </div>
  );
}
