/**
 * TryWorkout — live workout attempt with real webcam + pose detection.
 *
 * Phases:
 *  verify     → IdentityCheck face gate
 *  loading    → loads webcam + MoveNet model
 *  ready      → split screen preview, waits for full-body pose
 *  countdown  → 3-2-1 overlay
 *  recording  → reference video plays left, live skeleton right, keypoints collected
 *  processing → scoring + DB write
 */
import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { entities } from '@/api/entities';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Loader2, Square, RotateCcw, Zap, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { performPoseComparison } from '@/lib/poseScoring';
import IdentityCheck from '@/components/workout/IdentityCheck';
import { useWallet } from '@/lib/WalletContext';
import { startWebcam, stopStream } from '@/lib/faceApi';
import * as poseDetection from '@/lib/poseDetection';
// @vladmandic/face-api is TF.js 4.x native — no need to lazy-load poseDetection
// to avoid a version clash. Static import is fine and avoids the dynamic-import delay.

const MIN_RECORD_SECONDS = 3; // minimum seconds before the stop button enables

export default function TryWorkout() {
  const navigate = useNavigate();
  const { recordTransaction, ATTEMPT_FEE, CREATOR_CUT } = useWallet();
  const workoutId = window.location.pathname.split('/try/')[1];

  const [phase, setPhase] = useState('verify');
  const [countdown, setCountdown] = useState(3);
  const [recordingTime, setRecordingTime] = useState(0);
  const [poseReady, setPoseReady] = useState(false);   // full-body visible
  const [loadError, setLoadError] = useState('');

  // Refs
  const webcamRef = useRef(null);
  const canvasRef = useRef(null);
  const refVideoRef = useRef(null);
  const streamRef = useRef(null);
  const poseLoopRef = useRef(null);
  const collectedFrames = useRef([]); // array of keypoint snapshots

  const { data: workout } = useQuery({
    queryKey: ['workout', workoutId],
    queryFn: () => entities.Workout.filter({ id: workoutId }),
    select: d => d?.[0],
    enabled: !!workoutId,
  });

  // ─── Cleanup on unmount ───────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      clearInterval(poseLoopRef.current);
      stopStream(streamRef.current);
    };
  }, []);

  // ─── Countdown ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'countdown') return;
    if (countdown === 0) { startRecording(); return; }
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, countdown]);

  // ─── Recording timer + auto-stop ─────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'recording') return;
    const maxTime = workout?.duration_seconds || 30;
    if (recordingTime >= maxTime) { handleSubmit(); return; }
    const t = setInterval(() => setRecordingTime(s => s + 1), 1000);
    return () => clearInterval(t);
  }, [phase, recordingTime]);

  // ─── Load webcam + pose model after identity passes ───────────────────────
  useEffect(() => {
    if (phase !== 'loading') return;
    let cancelled = false;

    const init = async () => {
      try {
        // Start webcam and ensure pose model is loaded in parallel.
        // loadPoseDetector() is idempotent — if App.jsx already preloaded it
        // in the background, this resolves instantly from the cached detector.
        const [stream] = await Promise.all([
          startWebcam(webcamRef.current),
          poseDetection.loadPoseDetector(),
        ]);
        if (cancelled) { stopStream(stream); return; }
        streamRef.current = stream;

        // Start pose polling so user can see the skeleton + ready indicator
        poseLoopRef.current = setInterval(async () => {
          const pose = await poseDetection.detectPose(webcamRef.current, true);
          poseDetection.drawPoseOnCanvas(pose, canvasRef.current);
          setPoseReady(poseDetection.isPoseFullBody(pose));
        }, 150);

        setPhase('ready');
      } catch (err) {
        if (!cancelled) setLoadError(err.message || 'Could not start camera.');
      }
    };

    init();
    return () => { cancelled = true; };
  }, [phase]);

  // ─── Sync canvas dimensions to video once metadata is available ──────────
  useEffect(() => {
    const video = webcamRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    const sync = () => {
      if (video.videoWidth) {
        canvas.width  = video.videoWidth;
        canvas.height = video.videoHeight;
      }
    };
    video.addEventListener('loadedmetadata', sync);
    if (video.readyState >= 1) sync();
    return () => video.removeEventListener('loadedmetadata', sync);
  }, []);

  // ─── Actions ──────────────────────────────────────────────────────────────
  const handleVerifyPassed = () => setPhase('loading');

  const handleStartCountdown = () => {
    collectedFrames.current = [];
    setCountdown(3);
    setPhase('countdown');
  };

  const startRecording = () => {
    setRecordingTime(0);
    setPhase('recording');
    // Play reference video from start
    if (refVideoRef.current) {
      refVideoRef.current.currentTime = 0;
      refVideoRef.current.play().catch(() => {});
    }
    // Increase pose detection frequency + collect PAIRED frames
    clearInterval(poseLoopRef.current);
    poseLoopRef.current = setInterval(async () => {
      const [userPose, refPose] = await Promise.all([
        poseDetection.detectPose(webcamRef.current, true),
        poseDetection.detectPose(refVideoRef.current, false).catch(() => null),
      ]);

      poseDetection.drawPoseOnCanvas(userPose, canvasRef.current);

      const userSnap = poseDetection.snapshotKeypoints(userPose);
      const refSnap  = poseDetection.snapshotKeypoints(refPose);

      if (userSnap) {
        collectedFrames.current.push({ user: userSnap, ref: refSnap });
      }
    }, 100);
  };

  const handleSubmit = useCallback(async () => {
    clearInterval(poseLoopRef.current);
    stopStream(streamRef.current);
    if (refVideoRef.current) refVideoRef.current.pause();
    setPhase('processing');

    const title = workout?.title || 'Workout';
    const creatorName = workout?.creator_name || 'Creator';

    await recordTransaction({
      type: 'attempt_fee',
      amount: -ATTEMPT_FEE,
      description: `Attempt Fee: ${title}`,
      workoutId,
      workoutTitle: title,
    });

    // Pass real collected keypoints to scoring (Phase 3 will use them)
    const result = performPoseComparison(workout, collectedFrames.current);

    const attempt = await entities.Attempt.create({
      workout_id: workoutId,
      workout_title: title,
      similarity_score: result.similarity_score,
      passed: result.passed,
      reward_earned: result.reward_earned,
      feedback: result.feedback,
      joint_scores: result.joint_scores,
      frames_captured: collectedFrames.current.length,
    });

    if (result.passed) {
      await recordTransaction({
        type: 'workout_reward',
        amount: result.reward_earned,
        description: `Workout Passed: ${title}`,
        workoutId,
        workoutTitle: title,
      });
      await recordTransaction({
        type: 'creator_reward',
        amount: CREATOR_CUT,
        description: `Creator Earnings → ${creatorName}`,
        workoutId,
        workoutTitle: title,
      });
    }

    navigate(`/result/${attempt.id}`);
  }, [workout, workoutId, recordTransaction, ATTEMPT_FEE, CREATOR_CUT, navigate]);

  // ─── Render helpers ───────────────────────────────────────────────────────
  const maxTime = workout?.duration_seconds || 30;
  const pct = Math.round((recordingTime / maxTime) * 100);
  const canStop = recordingTime >= MIN_RECORD_SECONDS;

  // ── Identity gate ──────────────────────────────────────────────────────────
  if (phase === 'verify') {
    return (
      <IdentityCheck
        onPassed={handleVerifyPassed}
        onFailed={() => navigate(-1)}
      />
    );
  }

  // ── Main workout UI — always rendered so video/canvas refs never unmount ───
  // Loading spinner and error overlay sit on top via absolute positioning.
  return (
    <div className="fixed inset-0 bg-black flex flex-col">

      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 z-10 bg-black/60 backdrop-blur-sm">
        <Button
          variant="ghost" size="icon"
          onClick={() => { stopStream(streamRef.current); navigate(-1); }}
          className="rounded-full bg-white/10 text-white hover:bg-white/20"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>

        <div className="text-center">
          <p className="text-white/40 text-[10px] uppercase tracking-wider">Replicating</p>
          <p className="text-white text-sm font-semibold truncate max-w-[200px]">
            {workout?.title || 'Loading…'}
          </p>
        </div>

        {phase === 'recording' ? (
          <div className="flex items-center gap-2 bg-destructive/90 rounded-full px-3 py-1.5">
            <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
            <span className="text-white text-xs font-bold font-space">
              {recordingTime}s / {maxTime}s
            </span>
          </div>
        ) : (
          <Button
            variant="ghost" size="icon"
            className="rounded-full bg-white/10 text-white hover:bg-white/20"
          >
            <RotateCcw className="w-5 h-5" />
          </Button>
        )}
      </div>

      {/* Split screen */}
      <div className="flex-1 flex gap-1 px-1 overflow-hidden">

        {/* Left — Reference video */}
        <div className="flex-1 relative rounded-xl overflow-hidden bg-gray-900">
          <div className="absolute top-2 left-2 z-10 bg-black/60 rounded-full px-2 py-1 text-[10px] text-white/60 font-medium">
            REFERENCE
          </div>
          {workout?.video_url ? (
            <video
              ref={refVideoRef}
              src={workout.video_url}
              crossOrigin="anonymous"
              className="w-full h-full object-cover"
              loop
              muted
              playsInline
            />
          ) : (
            /* Placeholder skeleton when no reference video */
            <div className="w-full h-full flex items-center justify-center">
              <svg viewBox="0 0 200 400" className="h-2/3 opacity-20">
                <g stroke="white" strokeWidth="3" fill="none">
                  <line x1="100" y1="60" x2="100" y2="150" />
                  <line x1="100" y1="90" x2="65"  y2="140" />
                  <line x1="100" y1="90" x2="135" y2="140" />
                  <line x1="65"  y1="140" x2="55" y2="190" />
                  <line x1="135" y1="140" x2="145" y2="190" />
                  <line x1="100" y1="150" x2="80"  y2="240" />
                  <line x1="100" y1="150" x2="120" y2="240" />
                  <line x1="80"  y1="240" x2="75"  y2="320" />
                  <line x1="120" y1="240" x2="125" y2="320" />
                  <circle cx="100" cy="35" r="22" />
                </g>
              </svg>
              <p className="absolute text-white/30 text-xs">No reference video</p>
            </div>
          )}

          {/* Progress bar overlay */}
          {phase === 'recording' && (
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/10">
              <div
                className="h-full bg-primary transition-all duration-1000"
                style={{ width: `${pct}%` }}
              />
            </div>
          )}
        </div>

        {/* Right — Live webcam + skeleton */}
        <div className="flex-1 relative rounded-xl overflow-hidden bg-gray-900">
          <div className="absolute top-2 left-2 z-10 bg-black/60 rounded-full px-2 py-1 text-[10px] text-white/60 font-medium">
            YOU
          </div>

          {/* Webcam feed — always in DOM so ref never unmounts */}
          <video
            ref={webcamRef}
            autoPlay
            muted
            playsInline
            className="w-full h-full object-cover scale-x-[-1]"
          />

          {/* Skeleton canvas — NO scale-x-[-1] here: flipHorizontal:true in
              detectPose already mirrors coords to match the CSS-mirrored video */}
          <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full pointer-events-none"
          />

          {/* Loading overlay — shown while webcam + model initialise */}
          {(phase === 'loading') && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 gap-3 z-20">
              <Loader2 className="w-10 h-10 text-primary animate-spin" />
              <p className="text-white font-medium text-sm">Starting camera…</p>
              <p className="text-white/40 text-xs">Loading pose model</p>
            </div>
          )}

          {/* Error overlay */}
          {loadError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 gap-3 z-20 p-4">
              <p className="text-destructive text-sm text-center">{loadError}</p>
              <Button variant="outline" size="sm" onClick={() => navigate(-1)}>Go Back</Button>
            </div>
          )}

          {/* Pose-ready indicator */}
          <div className={cn(
            'absolute bottom-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-xs font-semibold transition-all whitespace-nowrap',
            poseReady
              ? 'bg-primary text-primary-foreground'
              : 'bg-black/60 text-white/70'
          )}>
            {poseReady ? '✓ Pose detected' : 'Position your full body'}
          </div>

          {/* Countdown overlay */}
          {phase === 'countdown' && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40">
              <div className="w-24 h-24 rounded-full border-4 border-primary flex items-center justify-center">
                <span className="font-space text-5xl font-bold text-primary">{countdown}</span>
              </div>
            </div>
          )}

          {/* Processing overlay */}
          {phase === 'processing' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 gap-3">
              <Loader2 className="w-10 h-10 text-primary animate-spin" />
              <p className="text-white font-medium text-sm">Analyzing {collectedFrames.current.length} frames…</p>
            </div>
          )}
        </div>
      </div>

      {/* Bottom controls */}
      <div className="py-5 px-4 bg-black/60 backdrop-blur-sm">
        <div className="flex items-center justify-center gap-6">

          {phase === 'ready' && (
            <div className="text-center space-y-3">
              <Button
                onClick={handleStartCountdown}
                disabled={!poseReady}
                className={cn(
                  'h-16 w-16 rounded-full font-bold transition-all',
                  poseReady
                    ? 'bg-primary text-primary-foreground shadow-[0_0_20px_hsl(162,95%,50%,0.4)]'
                    : 'bg-white/10 text-white/30 cursor-not-allowed'
                )}
              >
                <Play className="w-7 h-7" />
              </Button>
              <p className="text-white/40 text-xs">
                {poseReady ? 'Tap to start' : 'Stand in frame to begin'}
              </p>
            </div>
          )}

          {phase === 'countdown' && (
            <div className="h-16 w-16 rounded-full bg-white/10 flex items-center justify-center">
              <Zap className="w-7 h-7 text-primary animate-pulse" />
            </div>
          )}

          {phase === 'recording' && (
            <div className="text-center space-y-3">
              <Button
                onClick={handleSubmit}
                disabled={!canStop}
                className={cn(
                  'h-16 w-16 rounded-full transition-all',
                  canStop
                    ? 'bg-destructive hover:bg-destructive/90'
                    : 'bg-white/10 cursor-not-allowed'
                )}
              >
                <Square className="w-6 h-6 text-white" fill="white" />
              </Button>
              <p className="text-white/40 text-xs">
                {canStop ? 'Tap to finish' : `Keep going… ${MIN_RECORD_SECONDS - recordingTime}s`}
              </p>
            </div>
          )}

          {phase === 'processing' && (
            <p className="text-white/40 text-xs text-center">Scoring your form…</p>
          )}
        </div>
      </div>

    </div>
  );
}
