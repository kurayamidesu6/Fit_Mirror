import { useState, useEffect } from 'react';
import { entities } from '@/api/entities';
import { useAuth } from '@/lib/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { Wallet, Trophy, Upload, Flame, CalendarDays, Bookmark, ChevronRight, Coins } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import RankBadge from '@/components/shared/RankBadge';
import { getNextRank, getProgressToNextRank } from '@/lib/ranking';
import { buildEmptySchedule } from '@/lib/scheduleUtils';
import WeeklyCalendar from '@/components/profile/WeeklyCalendar';
import SavedWorkoutsPanel from '@/components/profile/SavedWorkoutsPanel';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useWallet } from '@/lib/WalletContext';
import WalletButton from '@/components/wallet/WalletButton';
import TransactionFeed from '@/components/wallet/TransactionFeed';

const TABS = [
  { key: 'schedule', label: 'Schedule', icon: CalendarDays },
  { key: 'saved', label: 'Saved', icon: Bookmark },
  { key: 'stats', label: 'Stats', icon: Trophy },
  { key: 'wallet', label: 'Wallet', icon: Coins },
];

export default function Profile() {
  const { user } = useAuth();
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

  const { connected, shortAddr, solBalance, fitBalance } = useWallet();

  const displayName = user?.user_metadata?.full_name || user?.email || 'Guest';
  const passedAttempts = attempts.filter(a => a.passed);
  const completedCount = passedAttempts.length;
  const uploadCount = myWorkouts.filter(w => w.created_by === user?.id).length;
  const nextRank = getNextRank(completedCount);
  const { progress, remaining } = getProgressToNextRank(completedCount);
  const scheduledDays = Object.values(schedule).filter(d => d.length > 0).length;

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border px-8 py-4">
        <div className="flex items-center justify-between">
          <h1 className="font-space font-bold text-2xl">Profile</h1>
          <Link to="/achievements">
            <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground">
              <Trophy className="w-4 h-4 text-chart-3" />
              Achievements
            </Button>
          </Link>
        </div>
      </div>

      <div className="px-8 py-6 flex gap-8">
        {/* Left panel — user info */}
        <div className="w-72 flex-shrink-0 space-y-4">
          {/* Avatar & Identity */}
          <div className="bg-card rounded-2xl border border-border p-6">
            <div className="flex flex-col items-center text-center gap-3">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/30 to-accent/30 flex items-center justify-center text-3xl font-bold font-space">
                {displayName[0]?.toUpperCase() || '?'}
              </div>
              <div>
                <h2 className="font-bold text-lg">{displayName}</h2>
                <p className="text-sm text-muted-foreground">{user?.email}</p>
                <div className="mt-2">
                  <RankBadge completedWorkouts={completedCount} size="sm" />
                </div>
              </div>
            </div>
          </div>

          {/* Wallet */}
          <div className="bg-card rounded-2xl border border-border p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wallet className="w-4 h-4 text-primary" />
                <span className="text-sm font-semibold">Wallet</span>
              </div>
              {connected && (
                <span className="text-[10px] text-muted-foreground font-mono">{shortAddr}</span>
              )}
            </div>
            <div className="flex items-baseline gap-1">
              <span className="font-space font-bold text-3xl text-primary">{fitBalance}</span>
              <span className="text-sm text-muted-foreground">FIT</span>
            </div>
            {connected && (
              <p className="text-[10px] text-muted-foreground">{solBalance.toFixed(4)} SOL on devnet</p>
            )}
            <WalletButton fullWidth size="sm" />
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { icon: Flame, label: 'Done', value: completedCount, color: 'text-primary' },
              { icon: Upload, label: 'Uploads', value: uploadCount, color: 'text-accent' },
              { icon: CalendarDays, label: 'Days', value: `${scheduledDays}/7`, color: 'text-chart-3' },
            ].map(({ icon: Icon, label, value, color }) => (
              <div key={label} className="bg-card rounded-xl border border-border p-3 text-center">
                <Icon className={`w-4 h-4 mx-auto mb-1.5 ${color}`} />
                <p className="font-space font-bold text-base">{value}</p>
                <p className="text-[9px] text-muted-foreground">{label}</p>
              </div>
            ))}
          </div>

          {/* Rank Progress */}
          {nextRank && (
            <div className="bg-card rounded-2xl border border-border p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold">Rank Progress</span>
              </div>
              <p className="text-xs text-muted-foreground mb-2">
                {remaining} more to {nextRank.emoji} {nextRank.name}
              </p>
              <Progress value={progress} className="h-2" />
            </div>
          )}

        </div>

        {/* Right panel — tabs */}
        <div className="flex-1 min-w-0">
          {/* Tab bar */}
          <div className="flex gap-2 mb-6 border-b border-border pb-4">
            {TABS.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={cn(
                  'flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all',
                  activeTab === key
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                )}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </div>

          {activeTab === 'schedule' && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Click <span className="text-primary font-semibold">+</span> on any day to add a saved workout to your schedule.
              </p>
              <WeeklyCalendar schedule={schedule} onScheduleChange={handleScheduleChange} />
            </div>
          )}

          {activeTab === 'saved' && <SavedWorkoutsPanel />}

          {activeTab === 'wallet' && (
            <div className="space-y-5">
              {/* Wallet summary header */}
              <div className="bg-gradient-to-br from-primary/10 to-accent/10 rounded-2xl border border-primary/20 p-5 flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">FIT Balance</p>
                  <p className="font-space font-bold text-3xl text-primary">{fitBalance} FIT</p>
                  {connected && (
                    <p className="text-xs text-muted-foreground mt-1 font-mono">{shortAddr} · {solBalance.toFixed(4)} SOL</p>
                  )}
                </div>
                <WalletButton />
              </div>

              {/* Transaction feed */}
              <div>
                <h3 className="font-semibold text-sm text-muted-foreground mb-3">Transaction History</h3>
                <TransactionFeed limit={20} />
              </div>
            </div>
          )}

          {activeTab === 'stats' && (
            <div className="space-y-4">
              <Link to="/achievements">
                <div className="bg-card rounded-2xl border border-chart-3/30 p-5 flex items-center justify-between group hover:border-chart-3/60 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-chart-3/20 flex items-center justify-center">
                      <Trophy className="w-6 h-6 text-chart-3" />
                    </div>
                    <div>
                      <p className="font-semibold">Achievements</p>
                      <p className="text-sm text-muted-foreground">Daily, weekly & monthly tasks</p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                </div>
              </Link>

              {attempts.length > 0 && (
                <div>
                  <h3 className="font-semibold text-sm text-muted-foreground mb-3">Recent Attempts</h3>
                  <div className="space-y-2">
                    {attempts.slice(0, 8).map(attempt => (
                      <div key={attempt.id} className="bg-card rounded-xl border border-border p-4 flex items-center justify-between">
                        <div>
                          <p className="font-medium">{attempt.workout_title}</p>
                          <p className="text-sm text-muted-foreground mt-0.5">
                            Score: {attempt.similarity_score}% · {attempt.passed ? '✅ Passed' : '❌ Failed'}
                          </p>
                        </div>
                        {attempt.reward_earned > 0 && (
                          <span className="font-bold text-primary">+{attempt.reward_earned} FIT</span>
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

    </div>
  );
}
