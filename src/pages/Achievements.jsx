import { useState, useEffect } from 'react';
import { entities } from '@/api/entities';
import { useQuery } from '@tanstack/react-query';
import { Trophy, Star, Calendar, Flame, Coins, CheckCircle2, Circle } from 'lucide-react';
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
      transition={{ delay: index * 0.04 }}
      className={cn(
        'bg-card rounded-2xl border p-5',
        isComplete ? 'border-primary/40' : 'border-border'
      )}
    >
      <div className="flex items-start gap-4">
        <div className={cn(
          'w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0',
          isComplete ? 'bg-primary/15' : 'bg-secondary'
        )}>
          {isComplete
            ? <CheckCircle2 className="w-5 h-5 text-primary" />
            : <Circle className="w-5 h-5 text-muted-foreground" />
          }
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h3 className={cn('font-semibold', isComplete && 'text-primary')}>{task.title}</h3>
            <div className="flex items-center gap-1 flex-shrink-0">
              <Coins className="w-3.5 h-3.5 text-chart-3" />
              <span className="text-sm font-bold text-chart-3">+{task.reward}</span>
            </div>
          </div>
          <p className="text-sm text-muted-foreground mb-3 leading-relaxed">{task.description}</p>
          <div className="flex items-center gap-3">
            <Progress value={task.progress} className="flex-1 h-1.5" />
            <span className="text-xs text-muted-foreground font-mono w-8 text-right">{task.progress}%</span>
          </div>
          {isComplete && (
            <Badge className="mt-2 bg-primary/15 text-primary border-0 text-xs">✓ Completed</Badge>
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
    const saved = localStorage.getItem('fitMirrorSchedule');
    if (saved) {
      try { setSchedule(JSON.parse(saved)); } catch {}
    }
  }, []);

  const achievements = generateAchievements(schedule);
  const tasks = achievements[activeTab] || [];
  const totalPossible = tasks.reduce((s, t) => s + t.reward, 0);
  const totalCompleted = tasks.filter(t => t.progress >= t.target).reduce((s, t) => s + t.reward, 0);
  const completedCount = tasks.filter(t => t.progress >= t.target).length;

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border px-8 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-chart-3/10 flex items-center justify-center">
              <Trophy className="w-5 h-5 text-chart-3" />
            </div>
            <div>
              <h1 className="font-space font-bold text-2xl">Achievements</h1>
              <p className="text-sm text-muted-foreground">Complete tasks to earn FIT points</p>
            </div>
          </div>
          {/* Tab switcher in header */}
          <div className="flex gap-2">
            {TAB_CONFIG.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all',
                  activeTab === key
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="px-8 py-6">
        {/* Summary row */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-card rounded-2xl border border-border p-5">
            <p className="text-sm text-muted-foreground mb-1">Total tasks</p>
            <p className="font-space font-bold text-3xl">{tasks.length}</p>
          </div>
          <div className="bg-card rounded-2xl border border-border p-5">
            <p className="text-sm text-muted-foreground mb-1">Completed</p>
            <p className="font-space font-bold text-3xl text-primary">{completedCount}</p>
          </div>
          <div className="bg-card rounded-2xl border border-border p-5">
            <div className="flex items-center gap-2 mb-1">
              <Coins className="w-4 h-4 text-chart-3" />
              <p className="text-sm text-muted-foreground">FIT earned</p>
            </div>
            <p className="font-space font-bold text-3xl text-chart-3">{totalCompleted}<span className="text-lg text-muted-foreground font-normal ml-1">/ {totalPossible}</span></p>
          </div>
        </div>

        {/* No schedule notice */}
        {Object.values(schedule).every(d => d.length === 0) && (
          <div className="bg-accent/10 rounded-2xl border border-accent/20 p-5 mb-6 flex items-center justify-between">
            <div>
              <p className="font-semibold mb-1">Build your routine first</p>
              <p className="text-sm text-muted-foreground">
                Achievements are generated from your weekly schedule. Add workouts to unlock personalized tasks.
              </p>
            </div>
            <Link to="/profile">
              <Button size="sm" className="rounded-xl bg-accent text-accent-foreground hover:opacity-90 flex-shrink-0 ml-4">
                Go to Calendar
              </Button>
            </Link>
          </div>
        )}

        {/* Task grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {tasks.map((task, i) => (
            <AchievementCard key={task.id} task={task} index={i} />
          ))}
        </div>
      </div>
    </div>
  );
}
