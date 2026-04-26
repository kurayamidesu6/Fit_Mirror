import { useState } from 'react';
import { Trash2, Plus, X, Check } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { DAYS, DAY_FULL } from '@/lib/scheduleUtils';
import { motion, AnimatePresence } from 'framer-motion';
import { entities } from '@/api/entities';
import { useQuery } from '@tanstack/react-query';

// Calendar display order — Sun first, matching the screenshot
const CALENDAR_ORDER = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const CALENDAR_HEADERS = { sunday: 'SUN', monday: 'MON', tuesday: 'TUES', wednesday: 'WED', thursday: 'THURS', friday: 'FRI', saturday: 'SAT' };

const CATEGORY_COLORS = {
  strength:    'bg-primary text-primary-foreground',
  cardio:      'bg-destructive text-white',
  hiit:        'bg-orange-500 text-white',
  mobility:    'bg-accent text-accent-foreground',
  yoga:        'bg-emerald-500 text-white',
  calisthenics:'bg-violet-500 text-white',
};

const CATEGORY_SOFT = {
  strength:    'bg-primary/15 text-primary',
  cardio:      'bg-destructive/15 text-destructive',
  hiit:        'bg-orange-500/15 text-orange-600',
  mobility:    'bg-accent/15 text-accent',
  yoga:        'bg-emerald-500/15 text-emerald-600',
  calisthenics:'bg-violet-500/15 text-violet-600',
};

const WORKOUT_IMAGES = [
  'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=200&h=200&fit=crop',
  'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=200&h=200&fit=crop',
  'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=200&h=200&fit=crop',
  'https://images.unsplash.com/photo-1549576490-b0b4831ef60a?w=200&h=200&fit=crop',
  'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=200&h=200&fit=crop',
];

// ── Weekly Calendar Grid ─────────────────────────────────────────────────────
function WeekOverview({ schedule, onAdd, onRemove, savedWorkouts }) {
  const todayName = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'][new Date().getDay()];
  const [pickerDay, setPickerDay] = useState(null);

  const handleAdd = (saved) => {
    if (!pickerDay) return;
    onAdd(pickerDay, {
      workout_id: saved.workout_id,
      title: saved.workout_title,
      category: saved.workout_category || 'strength',
      sets: saved.suggested_sets || 3,
      reps: saved.suggested_reps || 10,
      thumbnail_url: saved.thumbnail_url,
    });
    setPickerDay(null);
  };

  return (
    <div className="rounded-2xl overflow-hidden border border-border mb-6 bg-card shadow-sm">
      {/* Header row */}
      <div className="grid grid-cols-7">
        {CALENDAR_ORDER.map(day => (
          <div
            key={day}
            className={cn(
              'py-3 text-center text-xs font-bold tracking-widest uppercase border-r last:border-r-0',
              day === todayName
                ? 'bg-primary text-primary-foreground'
                : 'bg-[#2d3748] text-white'
            )}
          >
            {CALENDAR_HEADERS[day]}
          </div>
        ))}
      </div>

      {/* Cell row */}
      <div className="grid grid-cols-7 divide-x divide-border min-h-[140px]">
        {CALENDAR_ORDER.map(day => {
          const workouts = schedule[day] || [];
          const isToday = day === todayName;

          return (
            <div
              key={day}
              className={cn(
                'p-2 flex flex-col gap-1.5 relative group min-h-[140px]',
                isToday && 'bg-primary/5'
              )}
            >
              {/* Workout chips inside cell */}
              {workouts.map(w => {
                const cat = w.category?.toLowerCase();
                return (
                  <div
                    key={w.workout_id}
                    className={cn(
                      'rounded-md px-2 py-1.5 text-[11px] font-semibold leading-tight flex items-start justify-between gap-1 group/chip',
                      CATEGORY_SOFT[cat] || 'bg-primary/15 text-primary'
                    )}
                  >
                    <span className="truncate">{w.title}</span>
                    <button
                      onClick={() => onRemove(day, w.workout_id)}
                      className="opacity-0 group-hover/chip:opacity-100 flex-shrink-0 transition-opacity"
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </div>
                );
              })}

              {/* Add button — appears on hover */}
              <button
                onClick={() => setPickerDay(pickerDay === day ? null : day)}
                className={cn(
                  'mt-auto w-full rounded-md py-1 flex items-center justify-center transition-all',
                  pickerDay === day
                    ? 'bg-primary/20 text-primary opacity-100'
                    : 'opacity-0 group-hover:opacity-100 hover:bg-primary/10 text-primary/60 hover:text-primary'
                )}
              >
                {pickerDay === day
                  ? <X className="w-3 h-3" />
                  : <Plus className="w-3 h-3" />}
              </button>

              {/* Picker dropdown */}
              <AnimatePresence>
                {pickerDay === day && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.12 }}
                    className="absolute top-full left-0 z-50 w-56 rounded-xl border border-border bg-background shadow-xl overflow-hidden"
                  >
                    <div className="px-3 pt-2.5 pb-1.5 border-b border-border">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Add to {DAY_FULL[day]}
                      </p>
                    </div>
                    <div className="p-1.5 max-h-52 overflow-y-auto space-y-0.5">
                      {savedWorkouts.length === 0 ? (
                        <p className="text-xs text-muted-foreground text-center py-4">
                          Save workouts from the Feed first
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
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Scheduled workout chip ────────────────────────────────────────────────────
function ScheduledWorkoutChip({ workout, dayKey, onRemove }) {
  const cat = workout.category?.toLowerCase();
  return (
    <div className="flex items-center gap-3 bg-secondary/60 rounded-xl px-4 py-3 group">
      <div className={cn(
        'w-2 h-2 rounded-full flex-shrink-0',
        cat && CATEGORY_COLORS[cat] ? CATEGORY_COLORS[cat] : 'bg-primary'
      )} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold truncate">{workout.title}</p>
        <p className="text-xs text-muted-foreground mt-0.5 capitalize">
          {workout.sets}×{workout.reps} · {workout.category}
        </p>
      </div>
      <button
        onClick={() => onRemove(dayKey, workout.workout_id)}
        className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive flex-shrink-0 p-1 rounded-lg hover:bg-destructive/10"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
}

// ── Workout picker item ───────────────────────────────────────────────────────
function WorkoutPickerItem({ saved, alreadyAdded, onSelect }) {
  const image = saved.thumbnail_url
    || WORKOUT_IMAGES[(saved.workout_id?.charCodeAt?.(0) || 0) % WORKOUT_IMAGES.length];

  return (
    <button
      onClick={() => !alreadyAdded && onSelect(saved)}
      className={cn(
        'w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all',
        alreadyAdded
          ? 'opacity-50 cursor-not-allowed bg-secondary/50'
          : 'hover:bg-secondary active:scale-[0.98] cursor-pointer'
      )}
    >
      <img
        src={image}
        alt={saved.workout_title}
        className="w-11 h-11 rounded-lg object-cover flex-shrink-0"
      />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold truncate">{saved.workout_title}</p>
        <p className="text-xs text-muted-foreground capitalize mt-0.5">
          {saved.workout_category} · {saved.suggested_sets}×{saved.suggested_reps}
        </p>
      </div>
      <div className="flex-shrink-0">
        {alreadyAdded
          ? <Check className="w-4 h-4 text-primary" />
          : <Plus className="w-4 h-4 text-muted-foreground" />}
      </div>
    </button>
  );
}

// ── Day column ────────────────────────────────────────────────────────────────
function DayColumn({ dayKey, workouts, onAdd, onRemove, savedWorkouts }) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const todayIndex = (new Date().getDay() + 6) % 7;
  const isToday = DAYS.indexOf(dayKey) === todayIndex;

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
    <div className={cn(
      'rounded-2xl border bg-card transition-colors',
      isToday ? 'border-primary/40' : 'border-border'
    )}>
      {/* Day header */}
      <div className="flex items-center px-5 py-4 gap-3">
        <div className="flex-1 flex items-center gap-2.5">
          <span className={cn(
            'font-space font-bold text-base',
            isToday && 'text-primary'
          )}>
            {DAY_FULL[dayKey]}
          </span>
          {isToday && (
            <Badge className="bg-primary/15 text-primary border-0 text-xs px-2 py-0.5">Today</Badge>
          )}
          {workouts.length > 0 && (
            <Badge className="bg-primary/20 text-primary border-0 text-xs">
              {workouts.length}
            </Badge>
          )}
        </div>
        <button
          onClick={() => setPickerOpen(!pickerOpen)}
          className="w-8 h-8 rounded-lg bg-primary/10 hover:bg-primary/20 flex items-center justify-center transition-colors"
        >
          {pickerOpen
            ? <X className="w-4 h-4 text-primary" />
            : <Plus className="w-4 h-4 text-primary" />}
        </button>
      </div>

      {/* Body */}
      <div className="px-4 pb-4 space-y-2.5">
        {/* Scheduled workouts */}
        {workouts.map(w => (
          <ScheduledWorkoutChip
            key={w.workout_id}
            workout={w}
            dayKey={dayKey}
            onRemove={onRemove}
          />
        ))}

        {/* Picker dropdown */}
        <AnimatePresence>
          {pickerOpen && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
              className="rounded-xl border border-border bg-background shadow-lg overflow-hidden"
            >
              <div className="px-4 pt-3 pb-2 border-b border-border">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Add to {DAY_FULL[dayKey]}
                </p>
              </div>
              <div className="p-2 max-h-56 overflow-y-auto space-y-0.5">
                {savedWorkouts.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-5">
                    Save workouts from the Feed first
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

        {/* Empty state */}
        {workouts.length === 0 && !pickerOpen && (
          <button
            onClick={() => setPickerOpen(true)}
            className="w-full rounded-xl border-2 border-dashed border-border/60 py-4 text-center text-muted-foreground/50 hover:border-primary/40 hover:text-primary/60 transition-all"
          >
            <Plus className="w-5 h-5 mx-auto mb-1" />
            <p className="text-xs font-medium">Add workout</p>
          </button>
        )}
      </div>
    </div>
  );
}

// ── Root export ───────────────────────────────────────────────────────────────
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
    <div>
      {/* ── Weekly calendar grid ── */}
      <WeekOverview
        schedule={schedule}
        onAdd={handleAdd}
        onRemove={handleRemove}
        savedWorkouts={savedWorkouts}
      />

      {/* ── Day-by-day detail list ── */}
      <div className="space-y-3">
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
    </div>
  );
}
