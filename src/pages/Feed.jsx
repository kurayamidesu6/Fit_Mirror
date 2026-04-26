import { useState, useEffect } from 'react';
import { entities } from '@/api/entities';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Flame, TrendingUp } from 'lucide-react';
import WorkoutCard from '@/components/shared/WorkoutCard';
import CategoryFilter from '@/components/shared/CategoryFilter';
import { Skeleton } from '@/components/ui/skeleton';
import { seedWorkoutsIfEmpty } from '@/lib/seedData';

export default function Feed() {
  const [category, setCategory] = useState('all');
  const queryClient = useQueryClient();

  useEffect(() => {
    seedWorkoutsIfEmpty().then(() => {
      queryClient.invalidateQueries({ queryKey: ['workouts'] });
    });
  }, []);

  const { data: workouts = [], isLoading } = useQuery({
    queryKey: ['workouts'],
    queryFn: () => entities.Workout.list('-created_date', 50),
  });

  const filtered = category === 'all' 
    ? workouts.filter(w => !w.is_pro)
    : workouts.filter(w => w.category === category && !w.is_pro);

  const trending = [...workouts]
    .filter(w => !w.is_pro)
    .sort((a, b) => (b.likes || 0) - (a.likes || 0))
    .slice(0, 3);

  return (
    <div className="min-h-screen pb-28 pt-2">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border">
        <div className="max-w-lg mx-auto px-4 pt-4 pb-3">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-xl bg-primary/20 flex items-center justify-center">
              <Flame className="w-5 h-5 text-primary" />
            </div>
            <h1 className="font-space font-bold text-xl">Fit Mirror</h1>
          </div>
          <CategoryFilter selected={category} onSelect={setCategory} />
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 pt-4">
        {/* Trending section */}
        {category === 'all' && trending.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-4 h-4 text-primary" />
              <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Trending</span>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4">
              {trending.map(w => (
                <div key={w.id} className="min-w-[160px]">
                  <WorkoutCard workout={w} variant="compact" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Main feed */}
        {isLoading ? (
          <div className="space-y-4">
            {[1,2,3].map(i => (
              <Skeleton key={i} className="w-full aspect-[4/5] rounded-2xl" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-muted-foreground">No workouts found</p>
            <p className="text-sm text-muted-foreground/60 mt-1">Try a different category</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map(workout => (
              <WorkoutCard key={workout.id} workout={workout} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}