import { cn } from '@/lib/utils';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

const CATEGORIES = [
  { value: 'all', label: 'All' },
  { value: 'trending', label: '🔥 Trending' },
  { value: 'strength', label: '💪 Strength' },
  { value: 'cardio', label: '🏃 Cardio' },
  { value: 'hiit', label: '⚡ HIIT' },
  { value: 'mobility', label: '🧘 Mobility' },
  { value: 'yoga', label: '🧘‍♀️ Yoga' },
  { value: 'calisthenics', label: '🤸 Calisthenics' },
];

export default function CategoryFilter({ selected, onSelect }) {
  return (
    <ScrollArea className="w-full">
      <div className="flex gap-2 pb-2 px-1">
        {CATEGORIES.map(cat => (
          <button
            key={cat.value}
            onClick={() => onSelect(cat.value)}
            className={cn(
              "whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium transition-all duration-200",
              selected === cat.value
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
            )}
          >
            {cat.label}
          </button>
        ))}
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
}