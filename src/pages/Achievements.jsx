import { useState, useEffect } from 'react';
import { entities } from '@/api/entities';
import { useQuery } from '@tanstack/react-query';
import { Trophy, Star, Calendar, Flame, Coins, CheckCircle2, Circle, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { generateAchievements, buildEmptySchedule } from '@/lib/scheduleUtils';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

const TAB_CONFIG = [
  { key: 'daily', label: 'Daily', icon: Flame, color: 'text-primary' },
  { key: 'weekly', label: 'Weekly', icon: Calendar, color: 'text-accent' },
  { key: 'monthly', label: 'Monthly', icon: Star, color: 'text-chart-3' },
];

function AchievementCard({ task, index }) {
  const isComplete = task.progress >= task.target;
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className={cn(
        'bg-card rounded-2xl border p-4',
        isComplete ? 'border-primary/40' : 'border-border'
      )}
    >
      <div className="flex items-start gap-3">
        <div className={cn(
          'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0',
          isComplete ? 'bg-primary/20' : 'bg-secondary'
        )}>
          {isComplete
            ? <CheckCircle2 className="w-5 h-5 text-primary" />
            : <Circle className="w-5 h-5 text-muted-foreground" />
          }
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h3 className={cn('font-semibold text-sm', isComplete && 'text-primary')}>{task.title}</h3>
            <div className="flex items-center gap-1 flex-shrink-0">
              <Coins className="w-3 h-3 text-chart-3" />
              <span className="text-xs font-bold text-chart-3">+{task.reward}</span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mb-2 leading-relaxed">{task.description}</p>
          <div className="flex items-center gap-2">
            <Progress
              value={task.progress}
              className="flex-1 h-1.5"
            />
            <span className="text-[10px] text-muted-foreground font-mono w-8 text-right">{task.progress}%</span>
          </div>
          {isComplete && (
            <Badge className="mt-2 bg-primary/20 text-primary border-0 text-[10px]">
              ✓ Completed
            </Badge>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export default function Achievements() {
  const [activeTab, setActiveTab] = useState('daily');
  const [schedule, setSchedule] = useState(buildEmptySchedule());

  useEffect(() => {
    // Load schedule from localStorage
    const saved = localStorage.getItem('fitMirrorSchedule');
    if (saved) {
      try { setSchedule(JSON.parse(saved)); } catch {}
    }
  }, []);

  const achievements = generateAchievements(schedule);
  const tasks = achievements[activeTab] || [];

  const totalPossible = tasks.reduce((s, t) => s + t.reward, 0);
  const totalCompleted = tasks.filter(t => t.progress >= t.target).reduce((s, t) => s + t.reward, 0);

  return (
    <div className="min-h-screen pb-28">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border">
        <div className="max-w-lg mx-auto px-4 pt-4 pb-3">
          <div className="flex items-center gap-3 mb-3">
            <Link to="/profile">
              <Button variant="ghost" size="icon" className="rounded-full w-8 h-8">
                <ChevronLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-chart-3/20 flex items-center justify-center">
                <Trophy className="w-5 h-5 text-chart-3" />
              </div>
              <h1 className="font-space font-bold text-xl">Achievements</h1>
            </div>
          </div>
          {/* Tabs */}
          <div className="flex gap-2">
            {TAB_CONFIG.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={cn(
                  'flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-medium transition-all',
                  activeTab === key ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 pt-4 space-y-4">
        {/* Summary bar */}
        <div className="bg-card rounded-2xl border border-border p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Rewards available</p>
            <div className="flex items-center gap-1.5">
              <Coins className="w-4 h-4 text-chart-3" />
              <span className="font-space font-bold text-xl text-chart-3">{totalPossible} FIT</span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground mb-1">Earned</p>
            <span className="font-space font-bold text-xl text-primary">{totalCompleted} FIT</span>
          </div>
        </div>

        {/* Notice if no schedule */}
        {Object.values(schedule).every(d => d.length === 0) && (
          <div className="bg-accent/10 rounded-2xl border border-accent/20 p-4 text-center">
            <p className="text-sm font-medium mb-1">Build your routine first</p>
            <p className="text-xs text-muted-foreground mb-3">
              Achievements are generated from your weekly workout calendar. Add workouts to your schedule to unlock personalized tasks.
            </p>
            <Link to="/profile">
              <Button size="sm" className="rounded-xl bg-accent text-accent-foreground hover:opacity-90">
                Go to Calendar
              </Button>
            </Link>
          </div>
        )}

        {/* Task list */}
        <div className="space-y-3">
          {tasks.map((task, i) => (
            <AchievementCard key={task.id} task={task} index={i} />
          ))}
        </div>
      </div>
    </div>
  );
}