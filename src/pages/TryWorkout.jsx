/**
 * TryWorkout — upload-based workout attempt.
 *
 * Phases:
 *  upload     → user uploads their attempt video; reference plays on left
 *  processing → MoveNet scrubs both videos frame-by-frame, extracts keypoints, scores
 *  (navigate to /result/:id)
 *
 * No webcam required. Both videos are seeked offline so there are no
 * real-time performance constraints.
 */
import { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { entities } from '@/api/entities';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Loader2, Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { performPoseComparison } from '@/lib/poseScoring';
import { useWallet } from '@/lib/WalletContext';
import * as pd from '@/lib/poseDetection';

/** How many evenly-spaced keyframes to sample from each video. */
const FRAME_COUNT = 40;

/**
 * Seek a <video> element through its entire duration and collect pose keypoints
 * at FRAME_COUNT evenly-spaced timestamps.
 *
 * @param {HTMLVideoElement} videoEl
 * @param {boolean} flipHorizontal  pass true if coords need mirroring
 * @param {(pct: number) => void} onProgress  0–100
 * @returns {Promise<Array<Array<{x,y,score}>|null>>}  one entry per frame, null = no pose
 */
async function extractKeyframes(videoEl, flipHorizontal, onProgress) {
  // Wait for metadata so .duration is available
  if (videoEl.readyState < 1) {
    await new Promise(resolve => { videoEl.onloadedmetadata = resolve; });
  }

  const duration = videoEl.duration;
  if (!duration || !isFinite(duration)) return [];

  const frames = [];
  for (let i = 0; i < FRAME_COUNT; i++) {
    // Seek to evenly-spaced timestamp
    const t = (i / (FRAME_COUNT - 1)) * duration;
    await new Promise(resolve => {
      const onSeeked = () => { videoEl.removeEventListener('seeked', onSeeked); resolve(); };
      videoEl.addEventListener('seeked', onSeeked);
      videoEl.currentTime = t;
    });

    // Give the browser one animation frame to decode and paint the new frame
    await new Promise(resolve => requestAnimationFrame(resolve));

    const pose = await pd.detectPose(videoEl, flipHorizontal);
    frames.push(pd.snapshotKeypoints(pose)); // null when no pose detected
    onProgress(Math.round(((i + 1) / FRAME_COUNT) * 100));
  }
  return frames;
}

export default function TryWorkout() {
  const navigate = useNavigate();
  const { recordTransaction, ATTEMPT_FEE, CREATOR_CUT } = useWallet();
  const workoutId = window.location.pathname.split('/try/')[1];

  const [phase, setPhase]           = useState('upload'); // upload | processing
  const [userVideoUrl, setUserVideoUrl] = useState('');
  const [progressMsg, setProgressMsg]   = useState('');
  const [progressPct, setProgressPct]   = useState(0);

  const refVideoRef  = useRef(null);
  const userVideoRef = useRef(null);
  const blobUrlRef   = useRef(''); // track so we can revoke on change

  const { data: workout } = useQuery({
    queryKey: ['workout', workoutId],
    queryFn: () => entities.Workout.filter({ id: workoutId }),
    select: d => d?.[0],
    enabled: !!workoutId,
  });

  // ─── File selection ────────────────────────────────────────────────────────

  const handleFileSelect = (file) => {
    if (!file) return;
    if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
    const url = URL.createObjectURL(file);
    blobUrlRef.current = url;
    setUserVideoUrl(url);
  };

  const handleClearVideo = () => {
    if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
    blobUrlRef.current = '';
    setUserVideoUrl('');
  };

  // ─── Analysis ──────────────────────────────────────────────────────────────

  const handleAnalyze = useCallback(async () => {
    setPhase('processing');
    setProgressPct(0);

    try {
      // 1. Ensure MoveNet is loaded (resolves instantly if already warm)
      setProgressMsg('Loading pose model…');
      await pd.loadPoseDetector();

      // 2. Extract keyframes from the user's uploaded video
      setProgressMsg('Analyzing your video…');
      const userFrames = await extractKeyframes(
        userVideoRef.current,
        false, // uploaded videos are already oriented correctly
        pct => setProgressPct(Math.round(pct * 0.45)), // 0 → 45%
      );

      // 3. Extract keyframes from the reference video (if one exists)
      let refFrames = [];
      if (refVideoRef.current && workout?.video_url) {
        setProgressMsg('Analyzing reference video…');
        refFrames = await extractKeyframes(
          refVideoRef.current,
          false,
          pct => setProgressPct(45 + Math.round(pct * 0.45)), // 45 → 90%
        );
      }

      // 4. Pair frames by relative position (handles different video lengths)
      setProgressMsg('Scoring your form…');
      setProgressPct(92);
      const pairedFrames = userFrames.map((user, i) => ({
        user,
        ref: refFrames[i] ?? null,
      })).filter(f => f.user !== null);

      // 5. Score + record attempt
      const title       = workout?.title        || 'Workout';
      const creatorName = workout?.creator_name || 'Creator';

      await recordTransaction({
        type: 'attempt_fee',
        amount: -ATTEMPT_FEE,
        description: `Attempt Fee: ${title}`,
        workoutId,
        workoutTitle: title,
      });

      const result = performPoseComparison(workout, pairedFrames);

      setProgressPct(97);
      const attempt = await entities.Attempt.create({
        workout_id:       workoutId,
        workout_title:    title,
        similarity_score: result.similarity_score,
        passed:           result.passed,
        reward_earned:    result.reward_earned,
        feedback:         result.feedback,
        joint_scores:     result.joint_scores,
        frames_captured:  pairedFrames.length,
      });

      if (result.passed) {
        await Promise.all([
          recordTransaction({
            type: 'workout_reward',
            amount: result.reward_earned,
            description: `Workout Passed: ${title}`,
            workoutId, workoutTitle: title,
          }),
          recordTransaction({
            type: 'creator_reward',
            amount: CREATOR_CUT,
            description: `Creator Earnings → ${creatorName}`,
            workoutId, workoutTitle: title,
          }),
        ]);
      }

      navigate(`/result/${attempt.id}`);
    } catch (err) {
      console.error('[TryWorkout]', err);
      setPhase('upload'); // let user retry
    }
  }, [workout, workoutId, recordTransaction, ATTEMPT_FEE, CREATOR_CUT, navigate]);

  // ─── Main UI ───────────────────────────────────────────────────────────────
  const isProcessing = phase === 'processing';

  return (
    <div className="fixed inset-0 bg-black flex flex-col">

      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 z-10 bg-black/60 backdrop-blur-sm">
        <Button
          variant="ghost" size="icon"
          onClick={() => navigate(-1)}
          disabled={isProcessing}
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
        <div className="w-10" /> {/* balance the back button */}
      </div>

      {/* Split screen */}
      <div className="flex-1 flex gap-1 px-1 min-h-0">

        {/* Left — Reference video */}
        <div className="flex-1 relative rounded-xl overflow-hidden bg-gray-900">
          <div className="absolute top-2 left-2 z-10 bg-black/60 rounded-full px-2 py-1 text-[10px] text-white/60 font-medium">
            REFERENCE
          </div>

          {/* Always render so refVideoRef is always valid for MoveNet */}
          <video
            ref={refVideoRef}
            src={workout?.video_url || ''}
            crossOrigin="anonymous"
            className="w-full h-full object-cover"
            controls
            loop
            playsInline
          />

          {!workout?.video_url && (
            <div className="absolute inset-0 flex items-center justify-center">
              <p className="text-white/30 text-xs">No reference video</p>
            </div>
          )}
        </div>

        {/* Right — User's uploaded video */}
        <div className="flex-1 relative rounded-xl overflow-hidden bg-gray-900 flex flex-col">
          <div className="absolute top-2 left-2 z-10 bg-black/60 rounded-full px-2 py-1 text-[10px] text-white/60 font-medium">
            YOUR ATTEMPT
          </div>

          {/* Always rendered so userVideoRef never unmounts during processing */}
          <video
            ref={userVideoRef}
            src={userVideoUrl}
            className={`w-full h-full object-cover ${userVideoUrl ? '' : 'hidden'}`}
            controls
            loop
            playsInline
          />

          {/* Upload zone — shown when no video selected */}
          {!userVideoUrl && (
            <label className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer p-6 text-center">
              <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center mb-3">
                <Upload className="w-7 h-7 text-white/60" />
              </div>
              <p className="text-white font-medium text-sm">Upload your attempt</p>
              <p className="text-white/40 text-xs mt-1">MP4 · MOV · any length</p>
              <input
                type="file"
                accept="video/*"
                className="hidden"
                onChange={e => handleFileSelect(e.target.files?.[0])}
              />
            </label>
          )}

          {/* Clear button */}
          {userVideoUrl && !isProcessing && (
            <button
              onClick={handleClearVideo}
              className="absolute top-2 right-2 z-10 w-7 h-7 rounded-full bg-black/60 flex items-center justify-center hover:bg-black/80 transition-colors"
            >
              <X className="w-4 h-4 text-white" />
            </button>
          )}

          {/* Processing overlay */}
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
        </div>
      </div>

      {/* Bottom bar */}
      <div className="py-5 px-4 bg-black/60 backdrop-blur-sm">
        {!isProcessing ? (
          <Button
            onClick={handleAnalyze}
            disabled={!userVideoUrl}
            className="w-full h-14 rounded-2xl font-bold text-base"
          >
            {userVideoUrl ? 'Analyze My Form' : 'Upload a video to continue'}
          </Button>
        ) : (
          <p className="text-white/40 text-xs text-center">
            Analyzing {FRAME_COUNT} frames per video — this takes about 15–20 seconds…
          </p>
        )}
      </div>

    </div>
  );
}
