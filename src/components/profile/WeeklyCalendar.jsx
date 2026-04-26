import { useState, useRef } from 'react';
import { Trash2, GripVertical, Plus, ChevronDown, ChevronUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { DAYS, DAY_LABELS, DAY_FULL } from '@/lib/scheduleUtils';
import { motion, AnimatePresence } from 'framer-motion';

const CATEGORY_COLORS = {
  strength: 'bg-primary/20 text-primary',
  cardio: 'bg-destructive/20 text-destructive',
  hiit: 'bg-chart-3/20 text-chart-3',
  mobility: 'bg-accent/20 text-accent',
  yoga: 'bg-chart-2/20 text-chart-2',
  calisthenics: 'bg-chart-5/20 text-chart-5',
};

function ScheduledWorkoutChip({ workout, dayKey, onRemove }) {
  return (
    <div className="flex items-center gap-2 bg-secondary rounded-xl px-3 py-2 group">
      <GripVertical className="w-3.5 h-3.5 text-muted-foreground/40 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold truncate">{workout.title}</p>
        <p className="text-[10px] text-muted-foreground">{workout.sets}×{workout.reps} · {workout.category}</p>
      </div>
      <button
        onClick={() => onRemove(dayKey, workout.workout_id)}
        className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

function DayColumn({ dayKey, workouts, onDrop, onRemove, isDragOver, onDragOver, onDragLeave }) {
  const [expanded, setExpanded] = useState(true);
  const isEmpty = workouts.length === 0;

  return (
    <div
      className={cn(
        'rounded-2xl border transition-all duration-200',
        isDragOver ? 'border-primary/60 bg-primary/5' : 'border-border bg-card'
      )}
      onDragOver={(e) => { e.preventDefault(); onDragOver(dayKey); }}
      onDragLeave={onDragLeave}
      onDrop={(e) => { e.preventDefault(); onDrop(dayKey); }}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3"
      >
        <div className="flex items-center gap-2">
          <span className="font-space font-bold text-sm">{DAY_FULL[dayKey]}</span>
          {workouts.length > 0 && (
            <Badge className="bg-primary/20 text-primary border-0 text-[10px]">
              {workouts.length}
            </Badge>
          )}
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>

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
              {workouts.map(w => (
                <ScheduledWorkoutChip key={w.workout_id} workout={w} dayKey={dayKey} onRemove={onRemove} />
              ))}
              {isEmpty && (
                <div className={cn(
                  'rounded-xl border-2 border-dashed p-3 text-center transition-all',
                  isDragOver ? 'border-primary/60 text-primary' : 'border-border/60 text-muted-foreground/50'
                )}>
                  <Plus className="w-4 h-4 mx-auto mb-1" />
                  <p className="text-[10px]">Drop workout here</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function WeeklyCalendar({ schedule, onScheduleChange }) {
  const [dragOverDay, setDragOverDay] = useState(null);
  const draggingWorkout = useRef(null);

  const handleDrop = (dayKey) => {
    if (!draggingWorkout.current) return;
    const w = draggingWorkout.current;
    // Prevent duplicates in same day
    const existing = schedule[dayKey] || [];
    if (existing.some(e => e.workout_id === w.workout_id)) {
      setDragOverDay(null);
      return;
    }
    const newSchedule = {
      ...schedule,
      [dayKey]: [...existing, w],
    };
    onScheduleChange(newSchedule);
    draggingWorkout.current = null;
    setDragOverDay(null);
  };

  const handleRemove = (dayKey, workoutId) => {
    const newSchedule = {
      ...schedule,
      [dayKey]: (schedule[dayKey] || []).filter(w => w.workout_id !== workoutId),
    };
    onScheduleChange(newSchedule);
  };

  // Expose draggingWorkout ref setter for parent
  if (typeof window !== 'undefined') {
    window.__fitMirrorSetDragging = (w) => { draggingWorkout.current = w; };
  }

  return (
    <div className="space-y-2">
      {DAYS.map(day => (
        <DayColumn
          key={day}
          dayKey={day}
          workouts={schedule[day] || []}
          onDrop={handleDrop}
          onRemove={handleRemove}
          isDragOver={dragOverDay === day}
          onDragOver={setDragOverDay}
          onDragLeave={() => setDragOverDay(null)}
        />
      ))}
    </div>
  );
}