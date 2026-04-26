import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

export default function ScoreRing({ score, size = 120, strokeWidth = 8, passed }) {
  const [animatedScore, setAnimatedScore] = useState(0);
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (animatedScore / 100) * circumference;

  useEffect(() => {
    const timer = setTimeout(() => setAnimatedScore(score), 100);
    return () => clearTimeout(timer);
  }, [score]);

  const color = passed ? 'hsl(162, 95%, 50%)' : 'hsl(0, 84%, 60%)';

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="-rotate-90">
        {/* Background ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="hsl(240, 4%, 16%)"
          strokeWidth={strokeWidth}
        />
        {/* Score ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-[1500ms] ease-out"
          style={{ filter: `drop-shadow(0 0 6px ${color})` }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className={cn(
          "font-space font-bold",
          size > 100 ? "text-3xl" : "text-xl"
        )}>
          {animatedScore}
        </span>
        <span className="text-[10px] text-muted-foreground font-medium tracking-wider uppercase">
          Score
        </span>
      </div>
    </div>
  );
}