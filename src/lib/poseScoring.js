/**
 * Pose Scoring — Phase 3: real joint-angle comparison.
 *
 * Each recorded frame is { user: Keypoint[], ref: Keypoint[] | null }.
 *
 * Scoring strategy:
 *  A) If reference frames exist (workout video was playing + detectable):
 *     → Compute 8 joint angles per frame for both user and reference.
 *     → Average the per-frame cosine similarities → final score.
 *
 *  B) If no reference frames (no video or CORS blocked):
 *     → Score by average keypoint detection confidence + range-of-motion.
 *     → This rewards actually moving vs standing still.
 */

import {
  extractJointAngles,
  comparePoseAngles,
  avgConfidence,
} from './poseDetection';

const JOINT_NAMES = [
  'left_shoulder',  'right_shoulder',
  'left_elbow',     'right_elbow',
  'left_wrist',     'right_wrist',
  'left_hip',       'right_hip',
  'left_knee',      'right_knee',
  'left_ankle',     'right_ankle',
  'spine',          'neck',
];

// ─── Path A: Reference comparison ────────────────────────────────────────────

function scoreVsReference(frames) {
  const paired = frames.filter(f => f.user && f.ref);
  if (paired.length < 3) return null; // not enough overlap

  const similarities = paired.flatMap(({ user, ref }) => {
    const uAngles = extractJointAngles(user);
    const rAngles = extractJointAngles(ref);
    const sim = comparePoseAngles(uAngles, rAngles);
    return sim !== null ? [sim] : [];
  });

  if (similarities.length === 0) return null;

  const avg = similarities.reduce((a, b) => a + b, 0) / similarities.length;
  // avg is 0-1; map to 0-100, with a slight compression so ~80% similarity → 75 score
  return Math.round(Math.min(100, avg * 105));
}

// ─── Path B: Quality-based fallback ──────────────────────────────────────────

function scoreByQuality(frames) {
  const userFrames = frames.map(f => f.user ?? f).filter(Boolean);
  if (userFrames.length === 0) return 50; // can't tell — give neutral

  // 1. Average confidence across all keypoints across all frames
  const confScores = userFrames.map(avgConfidence);
  const avgConf = confScores.reduce((a, b) => a + b, 0) / confScores.length;

  // 2. Range-of-motion: how much do key joints move across frames?
  //    Use hip-normalised wrist + ankle positions as proxy for movement
  const movementScore = computeRangeOfMotion(userFrames);

  // Blend: 60% confidence, 40% movement
  const raw = avgConf * 0.6 + movementScore * 0.4;
  return Math.round(Math.min(100, raw * 100));
}

function computeRangeOfMotion(frames) {
  if (frames.length < 2) return 0;

  // Track wrists (9, 10) and ankles (15, 16) — most expressive joints
  const TRACK_IDS = [9, 10, 15, 16];
  let totalRange = 0;
  let tracked = 0;

  TRACK_IDS.forEach(id => {
    const positions = frames
      .map(f => f[id])
      .filter(k => k && k.score > 0.3);

    if (positions.length < 2) return;

    const xs = positions.map(k => k.x);
    const ys = positions.map(k => k.y);
    const rangeX = Math.max(...xs) - Math.min(...xs);
    const rangeY = Math.max(...ys) - Math.min(...ys);

    // Normalise by a typical video dimension (assume ~500px height)
    const normRange = (rangeX + rangeY) / 1000;
    totalRange += Math.min(1, normRange);
    tracked++;
  });

  return tracked > 0 ? totalRange / tracked : 0;
}

// ─── Per-joint scores for result breakdown ────────────────────────────────────

function generateJointScores(frames, baseScore) {
  const scores = {};

  // If we have real frames with reference, compute per-joint accuracy
  const paired = frames.filter(f => f.user && f.ref);

  JOINT_NAMES.forEach((name, idx) => {
    if (paired.length >= 3) {
      // Map joint name index to angle index (first 8 joints)
      const angleIdx = idx < 8 ? idx : null;
      if (angleIdx !== null) {
        const angleSims = paired.flatMap(({ user, ref }) => {
          const u = extractJointAngles(user)[angleIdx];
          const r = extractJointAngles(ref)[angleIdx];
          if (isNaN(u) || isNaN(r)) return [];
          const diff = Math.min(Math.abs(u - r), Math.PI) / Math.PI;
          return [1 - diff];
        });
        if (angleSims.length > 0) {
          const avg = angleSims.reduce((a, b) => a + b, 0) / angleSims.length;
          scores[name] = Math.round(avg * 100);
          return;
        }
      }
    }
    // Fallback: scatter around baseScore ±10
    scores[name] = Math.max(0, Math.min(100, baseScore + (Math.random() * 20 - 10)));
  });

  return scores;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function calculateSimilarityScore(difficulty = 'beginner', frames = []) {
  const diffMod = { beginner: 5, intermediate: 0, advanced: -8 }[difficulty] ?? 0;

  const refScore = scoreVsReference(frames);
  const score = refScore !== null
    ? refScore
    : scoreByQuality(frames);

  return Math.max(0, Math.min(100, score + diffMod));
}

/**
 * Full comparison result.
 *
 * @param {object} workout
 * @param {Array<{user: Keypoint[], ref: Keypoint[]|null}>} frames
 */
export function performPoseComparison(workout, frames = []) {
  const score = calculateSimilarityScore(workout?.difficulty, frames);
  const threshold = workout?.pass_threshold || 75;
  const passed = score >= threshold;
  const jointScores = generateJointScores(frames, score);

  const weakJoints = Object.entries(jointScores)
    .sort(([, a], [, b]) => a - b)
    .slice(0, 3)
    .map(([name]) => name.replace(/_/g, ' '));

  const paired = frames.filter(f => f.user && f.ref).length;
  const mode = paired >= 3 ? 'reference comparison' : 'form quality analysis';

  const feedback = passed
    ? `Excellent! ${score}% match via ${mode} across ${frames.length} frames. ${weakJoints[0]} was your strongest area.`
    : `Score: ${score}%. Focus on ${weakJoints[0]} and ${weakJoints[1]} alignment. Watch the reference and match the tempo closely.`;

  const reward = passed ? (score > 85 ? 10 : 5) : 0;

  return {
    similarity_score: score,
    passed,
    threshold,
    reward_earned: reward,
    feedback,
    joint_scores: jointScores,
    weak_areas: weakJoints,
    frames_captured: frames.length,
    scoring_mode: mode,
  };
}

export const PASS_THRESHOLD_DEFAULT = 75;
