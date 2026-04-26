import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Trophy, Coins, ArrowRight, RotateCcw, Share2, Check, X, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import ScoreRing from '@/components/shared/ScoreRing';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

export default function AttemptResult() {
  const navigate = useNavigate();
  const attemptId = window.location.pathname.split('/result/')[1];
  const [showDetails, setShowDetails] = useState(false);

  const { data: attempt, isLoading } = useQuery({
    queryKey: ['attempt', attemptId],
    queryFn: () => base44.entities.Attempt.filter({ id: attemptId }),
    select: (data) => data?.[0],
    enabled: !!attemptId,
  });

  useEffect(() => {
    const timer = setTimeout(() => setShowDetails(true), 800);
    return () => clearTimeout(timer);
  }, []);

  if (isLoading || !attempt) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const jointScores = attempt.joint_scores || {};
  const topJoints = Object.entries(jointScores)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5);

  return (
    <div className="min-h-screen pb-24 pt-8">
      <div className="max-w-lg mx-auto px-4">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className={cn(
            "inline-flex items-center gap-2 px-4 py-2 rounded-full mb-4",
            attempt.passed ? "bg-primary/20 text-primary" : "bg-destructive/20 text-destructive"
          )}>
            {attempt.passed ? <Check className="w-5 h-5" /> : <X className="w-5 h-5" />}
            <span className="font-bold text-lg">{attempt.passed ? 'PASSED!' : 'NOT QUITE'}</span>
          </div>
          <h1 className="font-space font-bold text-xl">{attempt.workout_title}</h1>
        </motion.div>

        {/* Score Ring */}
        <motion.div 
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 150 }}
          className="flex justify-center mb-8"
        >
          <ScoreRing score={attempt.similarity_score} size={160} strokeWidth={10} passed={attempt.passed} />
        </motion.div>

        {/* Reward */}
        {showDetails && attempt.passed && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card rounded-2xl border border-primary/30 p-5 mb-6 glow-primary"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
                  <Coins className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Reward Earned</p>
                  <p className="font-space font-bold text-2xl text-primary">+{attempt.reward_earned} FIT</p>
                </div>
              </div>
              {/* Solana integration point: Show "Claimed to wallet" after tx */}
              <Badge className="bg-primary/20 text-primary border-0">
                <Trophy className="w-3 h-3 mr-1" /> Earned
              </Badge>
            </div>
          </motion.div>
        )}

        {/* Feedback */}
        {showDetails && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-card rounded-2xl border border-border p-5 mb-6"
          >
            <h3 className="font-semibold text-sm text-muted-foreground mb-2">AI Feedback</h3>
            <p className="text-sm leading-relaxed text-foreground/80">{attempt.feedback}</p>
          </motion.div>
        )}

        {/* Joint breakdown */}
        {showDetails && topJoints.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-card rounded-2xl border border-border p-5 mb-6"
          >
            <h3 className="font-semibold text-sm text-muted-foreground mb-3">Joint Accuracy</h3>
            <div className="space-y-3">
              {topJoints.map(([joint, score]) => (
                <div key={joint} className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground w-28 capitalize">{joint.replace(/_/g, ' ')}</span>
                  <div className="flex-1 h-2 rounded-full bg-secondary overflow-hidden">
                    <div 
                      className={cn(
                        "h-full rounded-full transition-all duration-1000",
                        score >= 80 ? "bg-primary" : score >= 60 ? "bg-accent" : "bg-destructive"
                      )}
                      style={{ width: `${score}%` }}
                    />
                  </div>
                  <span className="text-xs font-mono font-bold w-10 text-right">{score}%</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Pro suggestion for failed attempts */}
        {showDetails && !attempt.passed && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="bg-card rounded-2xl border border-accent/30 p-5 mb-6"
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-accent/20 flex items-center justify-center flex-shrink-0">
                <Crown className="w-5 h-5 text-accent" />
              </div>
              <div>
                <h3 className="font-semibold text-sm mb-1">Unlock Pro Content</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Get form correction tips and technique guidance from verified coaches to improve your score.
                </p>
                <Link to="/pro">
                  <Button variant="link" className="text-accent p-0 h-auto mt-2 text-xs">
                    View Pro Content <ArrowRight className="w-3 h-3 ml-1" />
                  </Button>
                </Link>
              </div>
            </div>
          </motion.div>
        )}

        {/* Actions */}
        {showDetails && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="flex gap-3"
          >
            <Button
              onClick={() => navigate(-2)}
              variant="outline"
              className="flex-1 h-12 rounded-xl"
            >
              <RotateCcw className="w-4 h-4 mr-2" /> Try Again
            </Button>
            <Link to="/" className="flex-1">
              <Button className="w-full h-12 rounded-xl bg-primary text-primary-foreground">
                More Workouts <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </motion.div>
        )}
      </div>
    </div>
  );
}