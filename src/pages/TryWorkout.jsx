import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  AlertTriangle,
  ArrowLeft,
  Camera,
  CheckCircle2,
  Loader2,
  RotateCcw,
  Sparkles,
  Square,
  Upload,
  Video,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import ScoreRing from '@/components/shared/ScoreRing';
import { entities } from '@/api/entities';
import { useWallet } from '@/lib/WalletContext';
import { calculateSimilarityScore, PASS_THRESHOLD_DEFAULT, performPoseComparison } from '@/lib/poseScoring';
import {
  comparePoseAngles,
  extractJointAngles,
} from '@/lib/poseDetection';
import * as pd from '@/lib/poseDetection';
import {
  clearPoseCanvas,
  createMediaPipePoseLandmarker,
  detectMediaPipePose,
  drawMediaPipePose,
  mediaPipeResultHasPose,
  mediaPipeToCocoKeypoints,
} from '@/lib/mediapipePose';
import {
  formatFormFeedback,
  requestGeminiFormFeedback,
} from '@/lib/geminiFeedback';

const FRAME_COUNT = 40;
const DETECTION_INTERVAL_MS = 90;
const MAX_CAPTURED_FRAMES = 420;
const MIN_FRAMES_TO_SCORE = 6;

function stopStream(stream) {
  stream?.getTracks?.().forEach((track) => track.stop());
}

function formatElapsed(ms) {
  const seconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(seconds / 60).toString().padStart(2, '0');
  const remainder = (seconds % 60).toString().padStart(2, '0');
  return `${minutes}:${remainder}`;
}

function average(values) {
  const valid = values.filter((value) => typeof value === 'number' && Number.isFinite(value));
  if (!valid.length) return null;
  return Math.round(valid.reduce((sum, value) => sum + value, 0) / valid.length);
}

function scoreFrame(userKeypoints, refKeypoints) {
  if (!userKeypoints || !refKeypoints) return null;
  const similarity = comparePoseAngles(
    extractJointAngles(userKeypoints),
    extractJointAngles(refKeypoints),
  );
  return similarity === null ? null : Math.round(Math.min(100, similarity * 105));
}

function cueForScore(score, hasUserPose, hasRefPose) {
  if (!hasUserPose) return 'Step fully into frame';
  if (!hasRefPose) return 'Reference pose not visible';
  if (score === null) return 'Hold clear body lines';
  if (score >= 86) return 'Locked in';
  if (score >= 74) return 'Small alignment tweaks';
  if (score >= 62) return 'Match the reference angles';
  return 'Slow down and reset form';
}

async function extractKeyframes(videoEl, flipHorizontal, onProgress) {
  if (!videoEl) return [];

  if (videoEl.readyState < 1) {
    await new Promise((resolve) => {
      videoEl.onloadedmetadata = resolve;
    });
  }

  const duration = videoEl.duration;
  if (!duration || !Number.isFinite(duration)) return [];

  const frames = [];
  for (let i = 0; i < FRAME_COUNT; i++) {
    const t = (i / (FRAME_COUNT - 1)) * duration;
    await new Promise((resolve) => {
      if (Math.abs(videoEl.currentTime - t) < 0.01 && videoEl.readyState >= 2) {
        resolve();
        return;
      }

      const onSeeked = () => {
        videoEl.removeEventListener('seeked', onSeeked);
        resolve();
      };
      videoEl.addEventListener('seeked', onSeeked);
      videoEl.currentTime = t;
    });

    await new Promise((resolve) => requestAnimationFrame(resolve));

    const pose = await pd.detectPose(videoEl, flipHorizontal);
    frames.push(pd.snapshotKeypoints(pose));
    onProgress(Math.round(((i + 1) / FRAME_COUNT) * 100));
  }

  return frames;
}

function summarizeAttempt(frames, scoreSamples, result, mode) {
  const pairedFrames = frames.filter((frame) => frame.user && frame.ref).length;

  return {
    mode,
    framesCaptured: frames.length,
    pairedFrames,
    averageLiveScore: mode === 'live' ? average(scoreSamples) : null,
    bestLiveScore: mode === 'live' && scoreSamples.length ? Math.max(...scoreSamples) : null,
    finalScore: result.similarity_score,
    passed: result.passed,
    weakAreas: result.weak_areas || [],
    jointScores: result.joint_scores || {},
  };
}

export default function TryWorkout() {
  const navigate = useNavigate();
  const { recordTransaction, ATTEMPT_FEE, CREATOR_CUT } = useWallet();
  const workoutId = window.location.pathname.split('/try/')[1];

  const [mode, setMode] = useState('live');
  const [phase, setPhase] = useState('idle');
  const [modelStatus, setModelStatus] = useState('loading');
  const [userVideoUrl, setUserVideoUrl] = useState('');
  const [progressMsg, setProgressMsg] = useState('');
  const [progressPct, setProgressPct] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');
  const [liveScore, setLiveScore] = useState(null);
  const [liveCue, setLiveCue] = useState('Loading pose model');
  const [elapsedMs, setElapsedMs] = useState(0);
  const [framesCaptured, setFramesCaptured] = useState(0);
  const [poseStatus, setPoseStatus] = useState({ user: false, ref: false });

  const refVideoRef = useRef(null);
  const userVideoRef = useRef(null);
  const userCanvasRef = useRef(null);
  const refCanvasRef = useRef(null);
  const userLandmarkerRef = useRef(null);
  const refLandmarkerRef = useRef(null);
  const streamRef = useRef(null);
  const rafRef = useRef(0);
  const runningRef = useRef(false);
  const startTimeRef = useRef(0);
  const lastDetectionRef = useRef(0);
  const framesRef = useRef([]);
  const scoreSamplesRef = useRef([]);
  const blobUrlRef = useRef('');

  const { data: workout } = useQuery({
    queryKey: ['workout', workoutId],
    queryFn: () => entities.Workout.filter({ id: workoutId }),
    select: (data) => data?.[0],
    enabled: !!workoutId,
  });

  useEffect(() => {
    let cancelled = false;

    async function loadModels() {
      setModelStatus('loading');
      try {
        const [userLandmarker, refLandmarker] = await Promise.all([
          createMediaPipePoseLandmarker(),
          createMediaPipePoseLandmarker(),
        ]);
        if (cancelled) {
          userLandmarker.close?.();
          refLandmarker.close?.();
          return;
        }
        userLandmarkerRef.current = userLandmarker;
        refLandmarkerRef.current = refLandmarker;
        setModelStatus('ready');
        setLiveCue('Ready for live tracking');
      } catch (err) {
        console.error('[TryWorkout] MediaPipe load failed', err);
        if (!cancelled) {
          setModelStatus('error');
          setLiveCue('Pose model failed to load');
        }
      }
    }

    loadModels();

    return () => {
      cancelled = true;
      runningRef.current = false;
      cancelAnimationFrame(rafRef.current);
      stopStream(streamRef.current);
      userLandmarkerRef.current?.close?.();
      refLandmarkerRef.current?.close?.();
    };
  }, []);

  useEffect(() => {
    return () => {
      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
    };
  }, []);

  const resetLiveState = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    runningRef.current = false;
    stopStream(streamRef.current);
    streamRef.current = null;
    if (userVideoRef.current) userVideoRef.current.srcObject = null;
    refVideoRef.current?.pause?.();
    clearPoseCanvas(userCanvasRef.current);
    clearPoseCanvas(refCanvasRef.current);
    framesRef.current = [];
    scoreSamplesRef.current = [];
    setLiveScore(null);
    setElapsedMs(0);
    setFramesCaptured(0);
    setPoseStatus({ user: false, ref: false });
    setLiveCue(modelStatus === 'ready' ? 'Ready for live tracking' : 'Loading pose model');
    setPhase('idle');
  }, [modelStatus]);

  const handleModeChange = useCallback((nextMode) => {
    if (nextMode === mode || phase === 'running' || phase === 'processing' || phase === 'starting' || phase === 'finishing') {
      return;
    }

    resetLiveState();
    setErrorMsg('');
    setProgressMsg('');
    setProgressPct(0);
    setMode(nextMode);
  }, [mode, phase, resetLiveState]);

  const handleFileSelect = (file) => {
    if (!file) return;
    if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
    const url = URL.createObjectURL(file);
    blobUrlRef.current = url;
    setUserVideoUrl(url);
    setErrorMsg('');
  };

  const handleClearVideo = () => {
    if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
    blobUrlRef.current = '';
    setUserVideoUrl('');
    setErrorMsg('');
  };

  const saveAttempt = useCallback(async ({ frames, attemptMode, scoreSamples = [] }) => {
    const title = workout?.title || 'Workout';
    const creatorName = workout?.creator_name || 'Creator';

    await recordTransaction({
      type: 'attempt_fee',
      amount: -ATTEMPT_FEE,
      description: `Attempt Fee: ${title}`,
      workoutId,
      workoutTitle: title,
    });

    const result = performPoseComparison(workout, frames);
    const summary = summarizeAttempt(frames, scoreSamples, result, attemptMode);
    const feedback = await requestGeminiFormFeedback({ workout, result, summary });

    const attempt = await entities.Attempt.create({
      workout_id: workoutId,
      workout_title: title,
      similarity_score: result.similarity_score,
      passed: result.passed,
      reward_earned: result.reward_earned,
      feedback: formatFormFeedback(feedback),
      joint_scores: result.joint_scores,
      frames_captured: frames.length,
    });

    if (result.passed) {
      await Promise.all([
        recordTransaction({
          type: 'workout_reward',
          amount: result.reward_earned,
          description: `Workout Passed: ${title}`,
          workoutId,
          workoutTitle: title,
        }),
        recordTransaction({
          type: 'creator_reward',
          amount: CREATOR_CUT,
          description: `Creator Earnings -> ${creatorName}`,
          workoutId,
          workoutTitle: title,
        }),
      ]);
    }

    return attempt;
  }, [ATTEMPT_FEE, CREATOR_CUT, recordTransaction, workout, workoutId]);

  const handleAnalyzeUpload = useCallback(async () => {
    if (!userVideoUrl) return;

    setPhase('processing');
    setProgressPct(0);
    setErrorMsg('');

    try {
      setProgressMsg('Loading pose model...');
      await pd.loadPoseDetector();

      setProgressMsg('Analyzing your video...');
      const userFrames = await extractKeyframes(
        userVideoRef.current,
        false,
        (pct) => setProgressPct(Math.round(pct * 0.45)),
      );

      let refFrames = [];
      if (refVideoRef.current && workout?.video_url) {
        setProgressMsg('Analyzing reference video...');
        refFrames = await extractKeyframes(
          refVideoRef.current,
          false,
          (pct) => setProgressPct(45 + Math.round(pct * 0.45)),
        );
      }

      setProgressMsg('Scoring your form...');
      setProgressPct(92);
      const pairedFrames = userFrames
        .map((user, index) => ({
          user,
          ref: refFrames[index] ?? null,
        }))
        .filter((frame) => frame.user !== null);

      if (pairedFrames.length < MIN_FRAMES_TO_SCORE) {
        throw new Error('Not enough body poses were detected. Try a clearer video with your full body visible.');
      }

      setProgressPct(97);
      const attempt = await saveAttempt({
        frames: pairedFrames,
        attemptMode: 'upload',
      });

      navigate(`/result/${attempt.id}`);
    } catch (err) {
      console.error('[TryWorkout] upload analysis failed:', err);
      setErrorMsg(err?.message || String(err) || 'Something went wrong. Please try again.');
      setPhase('idle');
    }
  }, [navigate, saveAttempt, userVideoUrl, workout?.video_url]);

  const runPoseLoop = useCallback(() => {
    if (!runningRef.current) return;

    const now = performance.now();
    setElapsedMs(now - startTimeRef.current);

    if (now - lastDetectionRef.current >= DETECTION_INTERVAL_MS) {
      lastDetectionRef.current = now;

      const userResult = detectMediaPipePose(userLandmarkerRef.current, userVideoRef.current, now);
      const refResult = workout?.video_url
        ? detectMediaPipePose(refLandmarkerRef.current, refVideoRef.current, now + 0.1)
        : null;

      const hasUserPose = mediaPipeResultHasPose(userResult);
      const hasRefPose = mediaPipeResultHasPose(refResult);
      const userKeypoints = mediaPipeToCocoKeypoints(userResult);
      const refKeypoints = mediaPipeToCocoKeypoints(refResult);
      const frameScore = scoreFrame(userKeypoints, refKeypoints);

      drawMediaPipePose(userResult, userCanvasRef.current, {
        mirror: true,
        stroke: 'hsl(162, 95%, 55%)',
        fill: 'hsl(162, 95%, 75%)',
      });
      drawMediaPipePose(refResult, refCanvasRef.current, {
        stroke: 'hsl(48, 96%, 58%)',
        fill: 'hsl(48, 96%, 75%)',
      });

      if (userKeypoints) {
        framesRef.current.push({ user: userKeypoints, ref: refKeypoints });
        if (framesRef.current.length > MAX_CAPTURED_FRAMES) {
          framesRef.current.shift();
        }
      }

      if (frameScore !== null) {
        scoreSamplesRef.current.push(frameScore);
        if (scoreSamplesRef.current.length > 80) {
          scoreSamplesRef.current.shift();
        }
        setLiveScore(average(scoreSamplesRef.current.slice(-12)));
      }

      if (framesRef.current.length >= MIN_FRAMES_TO_SCORE) {
        const recentFrames = framesRef.current.slice(-90);
        setLiveScore(calculateSimilarityScore(workout?.difficulty, recentFrames));
      }

      setFramesCaptured(framesRef.current.length);
      setPoseStatus({ user: hasUserPose, ref: hasRefPose || !workout?.video_url });
      setLiveCue(cueForScore(frameScore, hasUserPose, hasRefPose || !workout?.video_url));
    }

    rafRef.current = requestAnimationFrame(runPoseLoop);
  }, [workout?.video_url]);

  const startLiveAttempt = useCallback(async () => {
    if (modelStatus !== 'ready' || phase === 'running' || phase === 'finishing') return;

    setErrorMsg('');
    setPhase('starting');

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('Camera access is not available in this browser.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: 'user',
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });

      streamRef.current = stream;
      userVideoRef.current.srcObject = stream;
      await userVideoRef.current.play();

      if (workout?.video_url && refVideoRef.current) {
        refVideoRef.current.currentTime = 0;
        await refVideoRef.current.play().catch(() => {});
      }

      framesRef.current = [];
      scoreSamplesRef.current = [];
      startTimeRef.current = performance.now();
      lastDetectionRef.current = 0;
      runningRef.current = true;
      setLiveScore(null);
      setFramesCaptured(0);
      setElapsedMs(0);
      setLiveCue('Tracking live form');
      setPhase('running');
      rafRef.current = requestAnimationFrame(runPoseLoop);
    } catch (err) {
      console.error('[TryWorkout] camera start failed:', err);
      stopStream(streamRef.current);
      streamRef.current = null;
      setErrorMsg(err instanceof Error ? err.message : 'Could not start the camera.');
      setPhase('idle');
    }
  }, [modelStatus, phase, runPoseLoop, workout?.video_url]);

  const finishLiveAttempt = useCallback(async () => {
    if (phase !== 'running') return;

    runningRef.current = false;
    cancelAnimationFrame(rafRef.current);
    refVideoRef.current?.pause?.();
    stopStream(streamRef.current);
    streamRef.current = null;
    if (userVideoRef.current) userVideoRef.current.srcObject = null;
    setPhase('finishing');
    setLiveCue('Preparing feedback');

    try {
      const frames = framesRef.current.filter((frame) => frame.user);
      if (frames.length < MIN_FRAMES_TO_SCORE) {
        setErrorMsg('Keep your full body visible for a few more seconds before finishing.');
        setPhase('idle');
        return;
      }

      const attempt = await saveAttempt({
        frames,
        attemptMode: 'live',
        scoreSamples: scoreSamplesRef.current,
      });

      navigate(`/result/${attempt.id}`);
    } catch (err) {
      console.error('[TryWorkout] live finish failed:', err);
      setErrorMsg('Could not save this attempt. Please try again.');
      setPhase('idle');
    }
  }, [navigate, phase, saveAttempt]);

  const isLiveMode = mode === 'live';
  const isLoadingModel = modelStatus === 'loading';
  const isRunning = phase === 'running';
  const isProcessing = phase === 'processing';
  const isBusy = phase === 'starting' || phase === 'finishing' || isProcessing;
  const canStartLive = modelStatus === 'ready' && isLiveMode && !isRunning && !isBusy;
  const canSwitchMode = !isRunning && !isBusy;
  const threshold = Math.max(PASS_THRESHOLD_DEFAULT, workout?.pass_threshold || PASS_THRESHOLD_DEFAULT);
  const displayedScore = liveScore ?? 0;

  return (
    <div className="fixed inset-0 bg-black text-white flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 z-10 bg-black/70 backdrop-blur-sm border-b border-white/10">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(-1)}
          disabled={isRunning || isBusy}
          className="rounded-full bg-white/10 text-white hover:bg-white/20"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>

        <div className="text-center min-w-0 px-3">
          <p className="text-white/40 text-[10px] uppercase tracking-wider">
            {isLiveMode ? 'Live Form Match' : 'Upload Form Match'}
          </p>
          <p className="text-white text-sm font-semibold truncate max-w-[240px]">
            {workout?.title || 'Loading workout'}
          </p>
        </div>

        <div className="flex items-center justify-end w-10">
          {isLiveMode && isLoadingModel ? (
            <Loader2 className="w-5 h-5 text-primary animate-spin" />
          ) : isLiveMode && modelStatus === 'ready' ? (
            <CheckCircle2 className="w-5 h-5 text-primary" />
          ) : isLiveMode ? (
            <AlertTriangle className="w-5 h-5 text-destructive" />
          ) : (
            <Upload className="w-5 h-5 text-primary" />
          )}
        </div>
      </div>

      <div className="px-4 pt-3 bg-black">
        <div className="mx-auto grid grid-cols-2 gap-1 max-w-sm rounded-xl bg-white/10 p-1">
          {[
            { id: 'live', label: 'Live', icon: Camera },
            { id: 'upload', label: 'Upload', icon: Upload },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              disabled={!canSwitchMode}
              onClick={() => handleModeChange(id)}
              className={`h-10 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-colors ${
                mode === id
                  ? 'bg-primary text-primary-foreground'
                  : 'text-white/65 hover:bg-white/10'
              } ${!canSwitchMode ? 'opacity-60 cursor-not-allowed' : ''}`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 min-h-0 p-2 lg:p-4 grid grid-rows-2 lg:grid-rows-1 lg:grid-cols-2 gap-2 lg:gap-4">
        <section className="relative overflow-hidden rounded-lg bg-zinc-950 border border-white/10">
          <video
            ref={refVideoRef}
            src={workout?.video_url || ''}
            crossOrigin="anonymous"
            className="absolute inset-0 w-full h-full object-contain"
            muted={isLiveMode}
            loop
            playsInline
            controls={!isRunning}
          />
          {isLiveMode && <canvas ref={refCanvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />}
          <div className="absolute left-3 top-3 flex items-center gap-2 rounded-full bg-black/65 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-white/70">
            <Video className="w-3.5 h-3.5" />
            Reference
          </div>
          {isLiveMode && (
            <div className="absolute right-3 top-3 rounded-full bg-black/65 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-white/70">
              {poseStatus.ref ? 'Pose found' : 'Waiting'}
            </div>
          )}
          {!workout?.video_url && (
            <div className="absolute inset-0 flex items-center justify-center px-6 text-center">
              <p className="text-sm text-white/45">No reference video attached to this workout</p>
            </div>
          )}
        </section>

        <section className="relative overflow-hidden rounded-lg bg-zinc-950 border border-white/10">
          {isLiveMode ? (
            <>
              <video
                ref={userVideoRef}
                className="absolute inset-0 w-full h-full object-contain"
                style={{ transform: 'scaleX(-1)' }}
                muted
                playsInline
              />
              <canvas ref={userCanvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />
              <div className="absolute left-3 top-3 flex items-center gap-2 rounded-full bg-black/65 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-white/70">
                <Camera className="w-3.5 h-3.5" />
                You
              </div>
              <div className="absolute right-3 top-3 rounded-full bg-black/65 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-white/70">
                {poseStatus.user ? 'Pose found' : isRunning ? 'Step back' : 'Standby'}
              </div>
              {!isRunning && phase !== 'starting' && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/35 px-6 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center">
                    <Camera className="w-7 h-7 text-white/65" />
                  </div>
                  <p className="text-sm font-semibold text-white/80">Camera standby</p>
                </div>
              )}
              {phase === 'starting' && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/65">
                  <Loader2 className="w-8 h-8 text-primary animate-spin" />
                  <p className="text-sm text-white/70">Starting camera</p>
                </div>
              )}
            </>
          ) : (
            <>
              <video
                ref={userVideoRef}
                src={userVideoUrl}
                className={`absolute inset-0 w-full h-full object-contain ${userVideoUrl ? '' : 'hidden'}`}
                controls
                loop
                playsInline
              />
              <div className="absolute left-3 top-3 flex items-center gap-2 rounded-full bg-black/65 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-white/70">
                <Upload className="w-3.5 h-3.5" />
                Your attempt
              </div>
              {!userVideoUrl && (
                <label className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer p-6 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center mb-3">
                    <Upload className="w-7 h-7 text-white/60" />
                  </div>
                  <p className="text-white font-medium text-sm">Upload your attempt</p>
                  <p className="text-white/40 text-xs mt-1">MP4, MOV, any length</p>
                  <input
                    type="file"
                    accept="video/*"
                    className="hidden"
                    onChange={(event) => handleFileSelect(event.target.files?.[0])}
                  />
                </label>
              )}
              {userVideoUrl && !isProcessing && (
                <button
                  type="button"
                  onClick={handleClearVideo}
                  className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-black/65 flex items-center justify-center hover:bg-black/85 transition-colors"
                >
                  <X className="w-4 h-4 text-white" />
                </button>
              )}
              {isProcessing && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/85 gap-4 z-20 p-8">
                  <Loader2 className="w-10 h-10 text-primary animate-spin" />
                  <p className="text-white font-medium text-sm text-center">{progressMsg}</p>
                  <div className="w-full bg-white/10 rounded-full h-1.5">
                    <div
                      className="bg-primary h-1.5 rounded-full transition-all duration-300"
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                  <p className="text-white/40 text-xs">{progressPct}%</p>
                </div>
              )}
            </>
          )}
        </section>
      </div>

      <div className="bg-black/75 backdrop-blur-sm border-t border-white/10 px-4 py-4">
        {isLiveMode ? (
          <div className="max-w-5xl mx-auto flex flex-col lg:flex-row lg:items-center gap-4">
            <div className="flex items-center gap-4">
              <ScoreRing
                score={displayedScore}
                size={82}
                strokeWidth={7}
                passed={displayedScore >= threshold}
              />
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-xs text-white/45">
                  <span>{formatElapsed(elapsedMs)}</span>
                  <span>/</span>
                  <span>{framesCaptured} frames</span>
                  <span>/</span>
                  <span>{threshold}% target</span>
                </div>
                <p className="text-lg font-bold leading-tight mt-1">{liveCue}</p>
                {errorMsg && (
                  <p className="text-xs text-destructive mt-1 max-w-xl">{errorMsg}</p>
                )}
              </div>
            </div>

            <div className="flex-1" />

            <div className="flex gap-2">
              {(isRunning || phase === 'idle') && framesCaptured > 0 && !isBusy && (
                <Button
                  variant="outline"
                  onClick={resetLiveState}
                  className="h-12 rounded-xl border-white/15 bg-white/5 text-white hover:bg-white/10"
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Reset
                </Button>
              )}

              {isRunning ? (
                <Button
                  onClick={finishLiveAttempt}
                  className="h-12 px-6 rounded-xl bg-primary text-primary-foreground font-bold"
                >
                  <Square className="w-4 h-4 mr-2" fill="currentColor" />
                  Finish
                </Button>
              ) : (
                <Button
                  onClick={startLiveAttempt}
                  disabled={!canStartLive}
                  className="h-12 px-6 rounded-xl bg-primary text-primary-foreground font-bold"
                >
                  {phase === 'starting' || phase === 'finishing' || isLoadingModel ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4 mr-2" />
                  )}
                  {phase === 'finishing' ? 'Scoring' : 'Start Live Attempt'}
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto space-y-3">
            {errorMsg && (
              <p className="text-destructive text-xs text-center font-medium px-2">{errorMsg}</p>
            )}
            {!isProcessing ? (
              <Button
                onClick={handleAnalyzeUpload}
                disabled={!userVideoUrl}
                className="w-full h-14 rounded-2xl font-bold text-base"
              >
                {userVideoUrl ? 'Analyze Uploaded Video' : 'Upload a video to continue'}
              </Button>
            ) : (
              <p className="text-white/40 text-xs text-center">
                Analyzing {FRAME_COUNT} frames per video. This takes about 15-20 seconds.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
