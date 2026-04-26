/**
 * Weekly Schedule Utilities
 * Manages the user's weekly workout planner state and achievement generation.
 */

export const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
export const DAY_LABELS = {
  monday: 'Mon', tuesday: 'Tue', wednesday: 'Wed', thursday: 'Thu',
  friday: 'Fri', saturday: 'Sat', sunday: 'Sun'
};
export const DAY_FULL = {
  monday: 'Monday', tuesday: 'Tuesday', wednesday: 'Wednesday', thursday: 'Thursday',
  friday: 'Friday', saturday: 'Saturday', sunday: 'Sunday'
};

export function buildEmptySchedule() {
  return DAYS.reduce((acc, d) => ({ ...acc, [d]: [] }), {});
}

/**
 * Generates achievements from a weekly schedule.
 * Structured for future real-data integration.
 */
export function generateAchievements(schedule) {
  const daily = [];
  const weekly = [];
  const monthly = [];

  const today = new Date();
  const dayNames = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
  const todayKey = dayNames[today.getDay()];

  // Daily tasks from today's scheduled workouts
  const todayWorkouts = schedule[todayKey] || [];
  todayWorkouts.forEach(w => {
    daily.push({
      id: `daily-${w.workout_id}-${todayKey}`,
      title: `${w.sets}×${w.reps} ${w.title}`,
      description: `Complete ${w.sets} sets of ${w.reps} reps of ${w.title}`,
      reward: 15,
      progress: Math.floor(Math.random() * 60),
      target: 100,
      category: w.category,
    });
  });

  if (daily.length === 0) {
    daily.push({
      id: 'daily-rest',
      title: 'Rest Day Recovery',
      description: 'No workouts scheduled today — take a rest or do light stretching',
      reward: 5,
      progress: 100,
      target: 100,
      category: 'mobility',
    });
  }

  // Weekly tasks from entire schedule
  const allScheduled = DAYS.flatMap(d => schedule[d] || []);
  const workoutCounts = {};
  allScheduled.forEach(w => {
    workoutCounts[w.title] = (workoutCounts[w.title] || 0) + 1;
  });

  Object.entries(workoutCounts).forEach(([title, count]) => {
    if (count > 0) {
      weekly.push({
        id: `weekly-${title}`,
        title: `${title} × ${count} this week`,
        description: `Complete your ${title} routine ${count} time${count > 1 ? 's' : ''} this week`,
        reward: count * 20,
        progress: Math.floor(Math.random() * 80),
        target: 100,
      });
    }
  });

  const activeDays = DAYS.filter(d => (schedule[d] || []).length > 0).length;
  if (activeDays >= 3) {
    weekly.push({
      id: 'weekly-consistency',
      title: `Hit ${activeDays}-Day Workout Week`,
      description: `Complete all workouts on your ${activeDays} active days`,
      reward: activeDays * 25,
      progress: Math.floor(Math.random() * 60),
      target: 100,
    });
  }

  if (weekly.length === 0) {
    weekly.push({
      id: 'weekly-start',
      title: 'Build Your First Routine',
      description: 'Add workouts to at least 3 days of your weekly planner',
      reward: 50,
      progress: 0,
      target: 100,
    });
  }

  // Monthly tasks from weekly schedule frequency
  Object.entries(workoutCounts).forEach(([title, count]) => {
    const monthlyCount = count * 4;
    monthly.push({
      id: `monthly-${title}`,
      title: `${title} Consistency`,
      description: `Complete your ${title} routine ${monthlyCount} times this month`,
      reward: monthlyCount * 10,
      progress: Math.floor(Math.random() * 50),
      target: 100,
    });
  });

  if (activeDays >= 5) {
    monthly.push({
      id: 'monthly-elite',
      title: '4-Week Elite Streak',
      description: `Maintain your ${activeDays}-day/week routine for the full month`,
      reward: 500,
      progress: Math.floor(Math.random() * 40),
      target: 100,
    });
  }

  if (monthly.length === 0) {
    monthly.push({
      id: 'monthly-start',
      title: 'First Month Milestone',
      description: 'Complete at least 12 workouts this month',
      reward: 200,
      progress: 0,
      target: 100,
    });
  }

  return { daily, weekly, monthly };
}