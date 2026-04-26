import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { entities } from '@/api/entities';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Camera, Square, RotateCcw, Scan, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { performPoseComparison } from '@/lib/poseScoring';
import IdentityCheck from '@/components/workout/IdentityCheck';

export default function TryWorkout() {
  const navigate = useNavigate();
  const workoutId = window.location.pathname.split('/try/')[1];
  const [phase, setPhase] = useState('verify'); // verify, ready, countdown, recording, processing
  const [countdown, setCountdown] = useState(3);
  const [recordingTime, setRecordingTime] = useState(0);

  const { data: workout } = useQuery({
    queryKey: ['workout', workoutId],
    queryFn: () => entities.Workout.filter({ id: workoutId }),
    select: (data) => data?.[0],
    enabled: !!workoutId,
  });

  useEffect(() => {
    if (phase !== 'countdown') return;
    if (countdown === 0) {
      setPhase('recording');
      return;
    }
    const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [phase, countdown]);

  useEffect(() => {
    if (phase !== 'recording') return;
    const maxTime = workout?.duration_seconds || 30;
    if (recordingTime >= maxTime) {
      handleSubmit();
      return;
    }
    const timer = setInterval(() => setRecordingTime(t => t + 1), 1000);
    return () => clearInterval(timer);
  }, [phase, recordingTime]);

  const handleStart = () => {
    setPhase('countdown');
    setCountdown(3);
  };

  const handleSubmit = async () => {
    setPhase('processing');

    await new Promise(resolve => setTimeout(resolve, 2000));

    const result = performPoseComparison(workout);

    const attempt = await entities.Attempt.create({
      workout_id: workoutId,
      workout_title: workout?.title || 'Workout',
      similarity_score: result.similarity_score,
      passed: result.passed,
      reward_earned: result.reward_earned,
      feedback: result.feedback,
      joint_scores: result.joint_scores,
    });

    navigate(`/result/${attempt.id}`);
  };

  if (phase === 'verify') {
    return (
      <IdentityCheck
        onPassed={() => setPhase('ready')}
        onFailed={() => navigate(-1)}
      />
    );
  }

  return (
    <div className="fixed inset-0 bg-black flex flex-col">
      {/* Camera viewfinder (mocked) */}
      <div className="flex-1 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-gray-900 to-gray-800">
          <div className="absolute inset-0 opacity-20">
            <div className="absolute left-1/3 top-0 bottom-0 w-px bg-white" />
            <div className="absolute left-2/3 top-0 bottom-0 w-px bg-white" />
            <div className="absolute top-1/3 left-0 right-0 h-px bg-white" />
            <div className="absolute top-2/3 left-0 right-0 h-px bg-white" />
          </div>

          <div className="absolute inset-0 flex items-center justify-center">
            {phase === 'ready' && (
              <div className="text-center">
                <div className="w-32 h-48 border-2 border-dashed border-primary/40 rounded-3xl mx-auto mb-4 flex items-center justify-center">
                  <Scan className="w-12 h-12 text-primary/40" />
                </div>
                <p className="text-white/60 text-sm">Position yourself in frame</p>
              </div>
            )}

            {phase === 'countdown' && (
              <div className="text-center">
                <div className="w-28 h-28 rounded-full border-4 border-primary flex items-center justify-center glow-primary">
                  <span className="font-space text-6xl font-bold text-primary">{countdown}</span>
                </div>
                <p className="text-white/80 text-sm mt-4">Get ready!</p>
              </div>
            )}

            {phase === 'recording' && (
              <div className="absolute inset-0">
                <svg className="absolute inset-0 w-full h-full" viewBox="0 0 300 500">
                  <g stroke="hsl(162, 95%, 50%)" strokeWidth="2" opacity="0.6">
                    <line x1="150" y1="100" x2="150" y2="200" />
                    <line x1="150" y1="140" x2="110" y2="200" />
                    <line x1="150" y1="140" x2="190" y2="200" />
                    <line x1="110" y1="200" x2="90" y2="270" />
                    <line x1="190" y1="200" x2="210" y2="270" />
                    <line x1="150" y1="200" x2="120" y2="300" />
                    <line x1="150" y1="200" x2="180" y2="300" />
                    <line x1="120" y1="300" x2="110" y2="400" />
                    <line x1="180" y1="300" x2="190" y2="400" />
                  </g>
                  {[[150,100],[150,140],[110,200],[190,200],[90,270],[210,270],[150,200],[120,300],[180,300],[110,400],[190,400]].map(([x,y], i) => (
                    <circle key={i} cx={x} cy={y} r="5" fill="hsl(162, 95%, 50%)" opacity="0.8" />
                  ))}
                </svg>
              </div>
            )}

            {phase === 'processing' && (
              <div className="text-center">
                <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto mb-4" />
                <p className="text-white font-medium">Analyzing your form...</p>
                <p className="text-white/50 text-sm mt-1">Comparing pose data</p>
              </div>
            )}
          </div>
        </div>

        {/* Top bar */}
        <div className="absolute top-0 left-0 right-0 z-10 p-4 flex items-center justify-between">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="rounded-full bg-black/40 backdrop-blur-sm text-white hover:bg-black/60"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>

          {phase === 'recording' && (
            <div className="flex items-center gap-2 bg-destructive/90 rounded-full px-4 py-2">
              <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
              <span className="text-white text-sm font-bold font-space">
                {recordingTime}s / {workout?.duration_seconds || 30}s
              </span>
            </div>
          )}

          <Button
            variant="ghost"
            size="icon"
            className="rounded-full bg-black/40 backdrop-blur-sm text-white hover:bg-black/60"
          >
            <RotateCcw className="w-5 h-5" />
          </Button>
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
          <p className="text-white/60 text-xs uppercase tracking-wider mb-1">Replicating</p>
          <p className="text-white font-semibold">{workout?.title || 'Loading...'}</p>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-black py-6 px-4">
        <div className="max-w-lg mx-auto flex items-center justify-center gap-6">
          {phase === 'ready' && (
            <Button
              onClick={handleStart}
              className="h-16 w-16 rounded-full bg-primary glow-primary hover:opacity-90"
            >
              <Camera className="w-7 h-7 text-primary-foreground" />
            </Button>
          )}

          {phase === 'recording' && (
            <Button
              onClick={handleSubmit}
              className="h-16 w-16 rounded-full bg-destructive hover:bg-destructive/90"
            >
              <Square className="w-6 h-6 text-white" fill="white" />
            </Button>
          )}

          {(phase === 'countdown' || phase === 'processing') && (
            <div className="h-16 w-16 rounded-full bg-muted/50 flex items-center justify-center">
              <Zap className="w-7 h-7 text-muted-foreground animate-pulse" />
            </div>
          )}
        </div>
        <p className="text-center text-white/40 text-xs mt-3">
          {phase === 'ready' && 'Tap to start recording your attempt'}
          {phase === 'countdown' && 'Starting soon...'}
          {phase === 'recording' && 'Tap the red button to finish'}
          {phase === 'processing' && 'Comparing your movement...'}
        </p>
        <div className="h-[env(safe-area-inset-bottom)]" />
      </div>
    </div>
  );
}
