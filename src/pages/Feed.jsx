import { useState, useEffect } from 'react';
import { entities } from '@/api/entities';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import WorkoutCard from '@/components/shared/WorkoutCard';
import CategoryFilter from '@/components/shared/CategoryFilter';
import { Skeleton } from '@/components/ui/skeleton';
import { seedWorkoutsIfEmpty } from '@/lib/seedData';

export default function Feed() {
  const [category, setCategory] = useState('all');
  const queryClient = useQueryClient();

  useEffect(() => {
    seedWorkoutsIfEmpty()
      .then(() => queryClient.invalidateQueries({ queryKey: ['workouts'] }))
      .catch(console.error);
  }, []);

  const { data: workouts = [], isLoading } = useQuery({
    queryKey: ['workouts'],
    queryFn: () => entities.Workout.list('-created_date', 50),
  });

  const getFiltered = () => {
    const base = workouts.filter(w => !w.is_pro);
    if (category === 'trending') {
      return [...base].sort((a, b) => (b.likes || 0) - (a.likes || 0));
    }
    if (category === 'all') return base;
    return base.filter(w => w.category === category);
  };

  const filtered = getFiltered();

  return (
    <div className="min-h-screen">
      {/* Page header */}
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border px-8 pt-6 pb-4">
        <h1 className="font-space font-bold text-2xl mb-4">Your Feed</h1>
        <CategoryFilter selected={category} onSelect={setCategory} />
      </div>

      <div className="px-8 py-6">
        {isLoading ? (
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
              <Skeleton key={i} className="w-full aspect-[3/4] rounded-2xl" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-24">
            <p className="text-muted-foreground font-medium">No workouts found</p>
            <p className="text-sm text-muted-foreground/60 mt-1">Try a different category</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map(workout => (
              <WorkoutCard key={workout.id} workout={workout} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
