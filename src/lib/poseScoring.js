/**
 * Pose scoring.
 *
 * Frames are either:
 * - { user: Keypoint[], ref: Keypoint[] | null } for reference comparison
 * - Keypoint[] for fallback quality scoring
 *
 * The reference path intentionally combines posture and movement. Angle-only
 * scoring can over-reward someone standing still when a reference video moves.
 */

import {
  extractJointAngles,
  avgConfidence,
} from './poseDetection';

const ANGLE_SCORE_NAMES = [
  'left_elbow',
  'right_elbow',
  'left_shoulder',
  'right_shoulder',
  'left_hip',
  'right_hip',
  'left_knee',
  'right_knee',
];

const ANGLE_SCORE_WEIGHTS = [
  1.25, // left elbow
  1.25, // right elbow
  0.45, // left shoulder: useful, but should not dominate
  0.45, // right shoulder
  0.3,  // left hip: mostly torso/stance anchor
  0.3,  // right hip
  1.45, // left knee
  1.45, // right knee
];

const JOINT_NAMES = [
  ...ANGLE_SCORE_NAMES,
  'left_wrist',
  'right_wrist',
  'left_ankle',
  'right_ankle',
  'spine',
  'neck',
];

const MIN_KEYPOINT_SCORE = 0.3;
const MIN_PASS_THRESHOLD = 75;
// Torso joints are used only as the stick-figure anchor for scale/centering.
// Scored body shape focuses on moving limbs, especially hands and feet.
const SHAPE_TRACK_WEIGHTS = [
  [7, 1.0],  // left elbow
  [8, 1.0],  // right elbow
  [9, 1.6],  // left wrist
  [10, 1.6], // right wrist
  [13, 1.1], // left knee
  [14, 1.1], // right knee
  [15, 1.7], // left ankle
  [16, 1.7], // right ankle
];
const MOTION_TRACK_IDS = [7, 8, 9, 10, 13, 14, 15, 16];

function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}

function confident(point) {
  return point && (point.score ?? 0) >= MIN_KEYPOINT_SCORE;
}

function pointDistance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function averagePoint(points) {
  if (!points.length) return null;
  return {
    x: points.reduce((sum, point) => sum + point.x, 0) / points.length,
    y: points.reduce((sum, point) => sum + point.y, 0) / points.length,
  };
}

function normalizeFrame(frame) {
  if (!frame) return null;

  const torsoPoints = [frame[5], frame[6], frame[11], frame[12]].filter(confident);
  const fallbackPoints = frame.filter(confident);
  const center = averagePoint(torsoPoints) || averagePoint(fallbackPoints);
  if (!center) return null;

  const leftShoulder = frame[5];
  const rightShoulder = frame[6];
  const leftHip = frame[11];
  const rightHip = frame[12];

  const shoulderWidth = confident(leftShoulder) && confident(rightShoulder)
    ? pointDistance(leftShoulder, rightShoulder)
    : 0;
  const hipWidth = confident(leftHip) && confident(rightHip)
    ? pointDistance(leftHip, rightHip)
    : 0;
  const torsoHeight = confident(leftShoulder) && confident(leftHip)
    ? pointDistance(leftShoulder, leftHip)
    : confident(rightShoulder) && confident(rightHip)
      ? pointDistance(rightShoulder, rightHip)
      : 0;
  const scale = Math.max(shoulderWidth, hipWidth, torsoHeight, 1);

  return frame.map((point) => {
    if (!point) return null;
    return {
      x: (point.x - center.x) / scale,
      y: (point.y - center.y) / scale,
      score: point.score ?? 0,
    };
  });
}

function comparePoseShape(userFrame, refFrame) {
  const user = normalizeFrame(userFrame);
  const ref = normalizeFrame(refFrame);
  if (!user || !ref) return null;

  let weightedSum = 0;
  let totalWeight = 0;

  SHAPE_TRACK_WEIGHTS.forEach(([id, weight]) => {
    const u = user[id];
    const r = ref[id];
    if (!confident(u) || !confident(r)) return;
    weightedSum += (1 - clamp01(pointDistance(u, r) / 1.2)) * weight;
    totalWeight += weight;
  });

  return totalWeight > 0 ? weightedSum / totalWeight : null;
}

function compareWeightedAngles(userFrame, refFrame) {
  const userAngles = extractJointAngles(userFrame);
  const refAngles = extractJointAngles(refFrame);
  let weightedSum = 0;
  let totalWeight = 0;

  for (let i = 0; i < userAngles.length; i++) {
    const userAngle = userAngles[i];
    const refAngle = refAngles[i];
    if (isNaN(userAngle) || isNaN(refAngle)) continue;

    const weight = ANGLE_SCORE_WEIGHTS[i] ?? 1;
    const diff = Math.min(Math.abs(userAngle - refAngle), Math.PI) / Math.PI;
    weightedSum += (1 - diff) * weight;
    totalWeight += weight;
  }

  return totalWeight > 0 ? weightedSum / totalWeight : null;
}

function computeMotionEnergy(frames) {
  const normalized = frames.map(normalizeFrame);
  const movements = [];

  for (let i = 1; i < normalized.length; i++) {
    const prev = normalized[i - 1];
    const next = normalized[i];
    if (!prev || !next) continue;

    MOTION_TRACK_IDS.forEach((id) => {
      if (!confident(prev[id]) || !confident(next[id])) return;
      movements.push(pointDistance(prev[id], next[id]));
    });
  }

  if (!movements.length) return 0;
  return movements.reduce((sum, value) => sum + value, 0) / movements.length;
}

function computeNormalizedRangeOfMotion(frames) {
  const normalized = frames.map(normalizeFrame).filter(Boolean);
  if (normalized.length < 2) return 0;

  const ranges = MOTION_TRACK_IDS.flatMap((id) => {
    const positions = normalized
      .map((frame) => frame[id])
      .filter(confident);

    if (positions.length < 2) return [];

    const xs = positions.map((point) => point.x);
    const ys = positions.map((point) => point.y);
    const range = Math.hypot(
      Math.max(...xs) - Math.min(...xs),
      Math.max(...ys) - Math.min(...ys),
    );

    return [clamp01(range / 1.4)];
  });

  if (!ranges.length) return 0;
  return ranges.reduce((sum, value) => sum + value, 0) / ranges.length;
}

function compareMotionTrajectory(userFrames, refFrames) {
  const user = userFrames.map(normalizeFrame);
  const ref = refFrames.map(normalizeFrame);
  const sims = [];

  for (let i = 1; i < Math.min(user.length, ref.length); i++) {
    const userPrev = user[i - 1];
    const userNext = user[i];
    const refPrev = ref[i - 1];
    const refNext = ref[i];
    if (!userPrev || !userNext || !refPrev || !refNext) continue;

    MOTION_TRACK_IDS.forEach((id) => {
      const up = userPrev[id];
      const un = userNext[id];
      const rp = refPrev[id];
      const rn = refNext[id];
      if (!confident(up) || !confident(un) || !confident(rp) || !confident(rn)) return;

      const userVector = { x: un.x - up.x, y: un.y - up.y };
      const refVector = { x: rn.x - rp.x, y: rn.y - rp.y };
      const userMag = Math.hypot(userVector.x, userVector.y);
      const refMag = Math.hypot(refVector.x, refVector.y);
      if (refMag < 0.015) return;

      const magnitudeScore = 1 - clamp01(Math.abs(userMag - refMag) / (refMag + 0.08));
      const directionScore = userMag < 0.01
        ? 0
        : ((userVector.x * refVector.x + userVector.y * refVector.y) / (userMag * refMag) + 1) / 2;

      sims.push(clamp01(magnitudeScore * 0.65 + directionScore * 0.35));
    });
  }

  if (!sims.length) return null;
  return sims.reduce((sum, value) => sum + value, 0) / sims.length;
}

function scoreVsReference(frames) {
  const paired = frames.filter((frame) => frame.user && frame.ref);
  if (paired.length < 3) return null;

  const angleScores = paired.flatMap(({ user, ref }) => {
    const sim = compareWeightedAngles(user, ref);
    return sim === null ? [] : [sim];
  });

  if (!angleScores.length) return null;

  const angleScore = angleScores.reduce((sum, value) => sum + value, 0) / angleScores.length;
  const shapeScores = paired.flatMap(({ user, ref }) => {
    const sim = comparePoseShape(user, ref);
    return sim === null ? [] : [sim];
  });
  const shapeScore = shapeScores.length
    ? shapeScores.reduce((sum, value) => sum + value, 0) / shapeScores.length
    : angleScore;

  const userFrames = paired.map(({ user }) => user);
  const refFrames = paired.map(({ ref }) => ref);
  const userMotion = computeMotionEnergy(userFrames);
  const refMotion = computeMotionEnergy(refFrames);
  const userRange = computeNormalizedRangeOfMotion(userFrames);
  const refRange = computeNormalizedRangeOfMotion(refFrames);
  const trajectoryScore = compareMotionTrajectory(userFrames, refFrames);
  const rangeScore = refRange < 0.08
    ? 1
    : 1 - clamp01(Math.abs(userRange - refRange) / (refRange + 0.12));
  const motionScore = trajectoryScore ?? rangeScore;
  const referenceMoves = refMotion > 0.018 || refRange > 0.22;
  const motionParticipation = referenceMoves
    ? clamp01(Math.max(userMotion / (refMotion + 0.01), userRange / (refRange + 0.08)))
    : 1;

  let raw = referenceMoves
    ? angleScore * 0.28 + shapeScore * 0.27 + motionScore * 0.3 + rangeScore * 0.15
    : angleScore * 0.45 + shapeScore * 0.4 + rangeScore * 0.15;

  if (referenceMoves && motionParticipation < 0.55) {
    raw = Math.min(raw, 0.35 + motionParticipation * 0.35);
  }

  return Math.round(clamp01(raw) * 100);
}

function scoreByQuality(frames) {
  const userFrames = frames.map((frame) => frame.user ?? frame).filter(Boolean);
  if (!userFrames.length) return 35;

  const confScores = userFrames.map(avgConfidence);
  const avgConf = confScores.reduce((sum, score) => sum + score, 0) / confScores.length;
  const movementScore = computeRangeOfMotion(userFrames);
  const raw = avgConf * 0.45 + movementScore * 0.55;

  return Math.round(clamp01(raw) * 100);
}

function computeRangeOfMotion(frames) {
  if (frames.length < 2) return 0;

  const ranges = [9, 10, 15, 16].flatMap((id) => {
    const positions = frames
      .map((frame) => frame[id])
      .filter(confident);

    if (positions.length < 2) return [];

    const xs = positions.map((point) => point.x);
    const ys = positions.map((point) => point.y);
    const rangeX = Math.max(...xs) - Math.min(...xs);
    const rangeY = Math.max(...ys) - Math.min(...ys);
    return [clamp01((rangeX + rangeY) / 1000)];
  });

  if (!ranges.length) return 0;
  return ranges.reduce((sum, value) => sum + value, 0) / ranges.length;
}

function generateJointScores(frames, baseScore) {
  const scores = {};
  const paired = frames.filter((frame) => frame.user && frame.ref);

  JOINT_NAMES.forEach((name, idx) => {
    if (paired.length >= 3) {
      const angleIdx = ANGLE_SCORE_NAMES.indexOf(name);
      if (angleIdx >= 0) {
        const angleSims = paired.flatMap(({ user, ref }) => {
          const userAngle = extractJointAngles(user)[angleIdx];
          const refAngle = extractJointAngles(ref)[angleIdx];
          if (isNaN(userAngle) || isNaN(refAngle)) return [];
          const diff = Math.min(Math.abs(userAngle - refAngle), Math.PI) / Math.PI;
          return [1 - diff];
        });

        if (angleSims.length > 0) {
          const avg = angleSims.reduce((sum, value) => sum + value, 0) / angleSims.length;
          scores[name] = Math.round(avg * 100);
          return;
        }
      }
    }

    const offset = ((idx % 5) - 2) * 3;
    scores[name] = Math.max(0, Math.min(100, Math.round(baseScore + offset)));
  });

  return scores;
}

export function calculateSimilarityScore(difficulty = 'beginner', frames = []) {
  const diffMod = { beginner: 0, intermediate: 0, advanced: -5 }[difficulty] ?? 0;
  const refScore = scoreVsReference(frames);
  const score = refScore !== null ? refScore : scoreByQuality(frames);

  return Math.max(0, Math.min(100, score + diffMod));
}

export function performPoseComparison(workout, frames = []) {
  const score = calculateSimilarityScore(workout?.difficulty, frames);
  const threshold = Math.max(MIN_PASS_THRESHOLD, workout?.pass_threshold || MIN_PASS_THRESHOLD);
  const passed = score >= threshold;
  const jointScores = generateJointScores(frames, score);
  const weakJoints = Object.entries(jointScores)
    .sort(([, a], [, b]) => a - b)
    .slice(0, 3)
    .map(([name]) => name.replace(/_/g, ' '));

  const paired = frames.filter((frame) => frame.user && frame.ref).length;
  const mode = paired >= 3 ? 'motion and reference comparison' : 'form quality analysis';
  const feedback = passed
    ? `Excellent! ${score}% match via ${mode} across ${frames.length} frames. Keep matching the reference tempo.`
    : `Score: ${score}%. Focus on ${weakJoints[0]} and ${weakJoints[1]} alignment, then match the reference range and tempo.`;
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

export const PASS_THRESHOLD_DEFAULT = MIN_PASS_THRESHOLD;
