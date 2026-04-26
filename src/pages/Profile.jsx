import { useState, useEffect } from 'react';
import { entities } from '@/api/entities';
import { useAuth } from '@/lib/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { Wallet, Trophy, Upload, Flame, LogOut, CalendarDays, Bookmark, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import RankBadge from '@/components/shared/RankBadge';
import { getRank, getNextRank, getProgressToNextRank } from '@/lib/ranking';
import { getWalletStatus } from '@/lib/rewards';
import { buildEmptySchedule } from '@/lib/scheduleUtils';
import WeeklyCalendar from '@/components/profile/WeeklyCalendar';
import SavedWorkoutsPanel from '@/components/profile/SavedWorkoutsPanel';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

const TABS = [
  { key: 'schedule', label: 'Schedule', icon: CalendarDays },
  { key: 'saved', label: 'Saved', icon: Bookmark },
  { key: 'stats', label: 'Stats', icon: Trophy },
];

export default function Profile() {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('schedule');
  const [schedule, setSchedule] = useState(buildEmptySchedule());

  useEffect(() => {
    const saved = localStorage.getItem('fitMirrorSchedule');
    if (saved) {
      try { setSchedule(JSON.parse(saved)); } catch {}
    }
  }, []);

  const handleScheduleChange = (newSchedule) => {
    setSchedule(newSchedule);
    localStorage.setItem('fitMirrorSchedule', JSON.stringify(newSchedule));
  };

  const { data: attempts = [] } = useQuery({
    queryKey: ['my-attempts'],
    queryFn: () => entities.Attempt.list('-created_date', 100),
    enabled: !!user,
  });

  const { data: myWorkouts = [] } = useQuery({
    queryKey: ['my-workouts'],
    queryFn: () => entities.Workout.list('-created_date', 50),
  });

  const displayName = user?.user_metadata?.full_name || user?.email || 'Guest';
  const passedAttempts = attempts.filter(a => a.passed);
  const totalRewards = attempts.reduce((sum, a) => sum + (a.reward_earned || 0), 0);
  const completedCount = passedAttempts.length;
  const uploadCount = myWorkouts.filter(w => w.created_by === user?.id).length;
  const wallet = getWalletStatus();
  const rank = getRank(completedCount);
  const nextRank = getNextRank(completedCount);
  const { progress, remaining } = getProgressToNextRank(completedCount);

  const scheduledDays = Object.values(schedule).filter(d => d.length > 0).length;

  return (
    <div className="min-h-screen pb-28">
      <div className="max-w-lg mx-auto px-4 pt-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="font-space font-bold text-xl">Profile</h1>
          <div className="flex items-center gap-2">
            <Link to="/achievements">
              <Button variant="ghost" size="icon" className="rounded-full relative">
                <Trophy className="w-5 h-5 text-chart-3" />
              </Button>
            </Link>
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full"
              onClick={logout}
            >
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Avatar & Info */}
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/40 to-accent/40 flex items-center justify-center text-2xl font-bold font-space">
            {displayName[0]?.toUpperCase() || '?'}
          </div>
          <div className="flex-1">
            <h2 className="font-bold text-lg">{displayName}</h2>
            <p className="text-sm text-muted-foreground">{user?.email}</p>
            <div className="mt-1">
              <RankBadge completedWorkouts={completedCount} size="sm" />
            </div>
          </div>
        </div>

        {/* Wallet Card */}
        <div className="bg-card rounded-2xl border border-border p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Wallet className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">Wallet</span>
            </div>
            <span className="text-xs text-muted-foreground font-mono">{wallet.address}</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="font-space font-bold text-3xl text-primary">{totalRewards || wallet.balance}</span>
            <span className="text-sm text-muted-foreground">FIT</span>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { icon: Flame, label: 'Completed', value: completedCount, color: 'text-primary' },
            { icon: Upload, label: 'Uploads', value: uploadCount, color: 'text-accent' },
            { icon: CalendarDays, label: 'Active Days', value: `${scheduledDays}/7`, color: 'text-chart-3' },
          ].map(({ icon: Icon, label, value, color }) => (
            <div key={label} className="bg-card rounded-xl border border-border p-4 text-center">
              <Icon className={`w-5 h-5 mx-auto mb-2 ${color}`} />
              <p className="font-space font-bold text-xl">{value}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {/* Rank Progress */}
        {nextRank && (
          <div className="bg-card rounded-2xl border border-border p-4 mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Rank Progress</span>
              <span className="text-xs text-muted-foreground">
                {remaining} more to {nextRank.emoji} {nextRank.name}
              </span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-4">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={cn(
                'flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-medium transition-all',
                activeTab === key ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>

        {activeTab === 'schedule' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                Drag workouts from <span className="text-primary font-medium">Saved</span> tab into your days
              </p>
            </div>
            <WeeklyCalendar schedule={schedule} onScheduleChange={handleScheduleChange} />
          </div>
        )}

        {activeTab === 'saved' && (
          <SavedWorkoutsPanel />
        )}

        {activeTab === 'stats' && (
          <div className="space-y-4">
            <Link to="/achievements">
              <div className="bg-card rounded-2xl border border-chart-3/30 p-4 flex items-center justify-between group hover:border-chart-3/60 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-chart-3/20 flex items-center justify-center">
                    <Trophy className="w-5 h-5 text-chart-3" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">Achievements</p>
                    <p className="text-xs text-muted-foreground">Daily, weekly & monthly tasks</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
              </div>
            </Link>

            {attempts.length > 0 && (
              <div>
                <h3 className="font-semibold text-sm text-muted-foreground mb-3">Recent Attempts</h3>
                <div className="space-y-2">
                  {attempts.slice(0, 5).map(attempt => (
                    <div key={attempt.id} className="bg-card rounded-xl border border-border p-3 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">{attempt.workout_title}</p>
                        <p className="text-xs text-muted-foreground">
                          Score: {attempt.similarity_score}% · {attempt.passed ? '✅ Passed' : '❌ Failed'}
                        </p>
                      </div>
                      {attempt.reward_earned > 0 && (
                        <span className="text-sm font-bold text-primary">+{attempt.reward_earned} FIT</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
