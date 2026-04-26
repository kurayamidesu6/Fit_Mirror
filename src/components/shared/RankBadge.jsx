import { cn } from '@/lib/utils';
import { getRank } from '@/lib/ranking';

export default function RankBadge({ completedWorkouts, size = 'sm' }) {
  const rank = getRank(completedWorkouts);

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-3 py-1',
    lg: 'text-base px-4 py-1.5'
  };

  return (
    <span className={cn(
      "inline-flex items-center gap-1 rounded-full font-semibold",
      rank.bgColor, rank.color,
      sizeClasses[size]
    )}>
      <span>{rank.emoji}</span>
      <span>{rank.name}</span>
    </span>
  );
}