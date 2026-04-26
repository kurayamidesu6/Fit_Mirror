/**
 * Pose Detection — MoveNet SinglePose Lightning via TensorFlow.js
 *
 * MoveNet detects 17 COCO keypoints at ~30fps on modern hardware.
 *
 * Keypoint indices (COCO):
 *  0  nose         1  left_eye       2  right_eye
 *  3  left_ear     4  right_ear      5  left_shoulder
 *  6  right_shldr  7  left_elbow     8  right_elbow
 *  9  left_wrist  10  right_wrist   11  left_hip
 * 12  right_hip   13  left_knee     14  right_knee
 * 15  left_ankle  16  right_ankle
 */

import * as tf from '@tensorflow/tfjs';
import * as poseDetection from '@tensorflow-models/pose-detection';

// Skeleton connections for drawing
const CONNECTIONS = [
  [5, 7], [7, 9],     // left arm
  [6, 8], [8, 10],    // right arm
  [5, 6],             // shoulders
  [5, 11], [6, 12],   // torso
  [11, 12],           // hips
  [11, 13], [13, 15], // left leg
  [12, 14], [14, 16], // right leg
  [0, 5], [0, 6],     // head → shoulders
];

// Joint angle definitions: [vertex, pointA, pointB]
// angle is computed at 'vertex' between rays vertex→A and vertex→B
const ANGLE_JOINTS = [
  [7,  9,  5],  // left elbow:   wrist–elbow–shoulder
  [8,  10, 6],  // right elbow:  wrist–elbow–shoulder
  [5,  7,  11], // left shoulder: elbow–shoulder–hip
  [6,  8,  12], // right shoulder: elbow–shoulder–hip
  [11, 5,  13], // left hip:     shoulder–hip–knee
  [12, 6,  14], // right hip:    shoulder–hip–knee
  [13, 11, 15], // left knee:    hip–knee–ankle
  [14, 12, 16], // right knee:   hip–knee–ankle
];

export const ANGLE_COUNT = ANGLE_JOINTS.length; // 8

const MIN_SCORE = 0.3;

let detector = null;
let loadPromise = null;

// ─── Model ────────────────────────────────────────────────────────────────────

export async function loadPoseDetector() {
  if (detector) return detector;
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    // Match the webgl backend forced by faceApi.js — both share the same TF.js instance
    await tf.setBackend('webgl');
    await tf.ready();
    detector = await poseDetection.createDetector(
      poseDetection.SupportedModels.MoveNet,
      {
        modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING,
        enableSmoothing: true,
      }
    );
    return detector;
  })();

  return loadPromise;
}

// ─── Detection ────────────────────────────────────────────────────────────────

/**
 * Detect a pose from a <video> element.
 * @param {HTMLVideoElement} videoEl
 * @param {boolean} flipHorizontal  true for webcam (mirror), false for reference video
 */
export async function detectPose(videoEl, flipHorizontal = false) {
  if (!detector || !videoEl || videoEl.readyState < 2) return null;
  try {
    const poses = await detector.estimatePoses(videoEl, { maxPoses: 1, flipHorizontal });
    return poses?.[0] ?? null;
  } catch {
    return null;
  }
}

// ─── Drawing ──────────────────────────────────────────────────────────────────

export function drawPoseOnCanvas(pose, canvas) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (!pose) return;

  const kp = pose.keypoints;

  ctx.lineWidth = 2.5;
  ctx.strokeStyle = 'hsl(162, 95%, 50%)';
  CONNECTIONS.forEach(([i, j]) => {
    if (kp[i]?.score > MIN_SCORE && kp[j]?.score > MIN_SCORE) {
      ctx.beginPath();
      ctx.moveTo(kp[i].x, kp[i].y);
      ctx.lineTo(kp[j].x, kp[j].y);
      ctx.stroke();
    }
  });

  kp.forEach(k => {
    if (k.score > MIN_SCORE) {
      ctx.beginPath();
      ctx.arc(k.x, k.y, 4, 0, Math.PI * 2);
      ctx.fillStyle = 'hsl(162, 95%, 70%)';
      ctx.fill();
    }
  });
}

// ─── Snapshot ─────────────────────────────────────────────────────────────────

export function isPoseFullBody(pose) {
  if (!pose) return false;
  return [5, 6, 11, 12].every(i => (pose.keypoints[i]?.score ?? 0) > MIN_SCORE);
}

export function snapshotKeypoints(pose) {
  if (!pose) return null;
  return pose.keypoints.map(({ x, y, score }) => ({ x, y, score }));
}

// ─── Joint angle maths ────────────────────────────────────────────────────────

/** Angle in radians at vertex B, given three 2-D points A B C. */
function angleBetween(A, B, C) {
  const v1x = A.x - B.x, v1y = A.y - B.y;
  const v2x = C.x - B.x, v2y = C.y - B.y;
  const dot = v1x * v2x + v1y * v2y;
  const mag = Math.sqrt(v1x ** 2 + v1y ** 2) * Math.sqrt(v2x ** 2 + v2y ** 2);
  if (mag < 1e-6) return 0;
  return Math.acos(Math.max(-1, Math.min(1, dot / mag)));
}

/**
 * Extract 8 joint angles from a keypoint snapshot.
 * Returns Float32Array of length ANGLE_COUNT.
 * Entries are NaN when the relevant keypoints weren't confident enough.
 */
export function extractJointAngles(kps) {
  return new Float32Array(ANGLE_JOINTS.map(([v, a, b]) => {
    const kv = kps[v], ka = kps[a], kb = kps[b];
    if (!kv || !ka || !kb) return NaN;
    if (kv.score < MIN_SCORE || ka.score < MIN_SCORE || kb.score < MIN_SCORE) return NaN;
    return angleBetween(ka, kv, kb);
  }));
}

/**
 * Compare two angle vectors and return similarity 0–1.
 * Ignores joints where either frame has NaN.
 * Returns null if there are no comparable joints.
 */
export function comparePoseAngles(userAngles, refAngles) {
  let sumDiff = 0;
  let count = 0;

  for (let i = 0; i < userAngles.length; i++) {
    const u = userAngles[i], r = refAngles[i];
    if (!isNaN(u) && !isNaN(r)) {
      // Normalise difference to [0, 1]; π radians difference = worst case
      sumDiff += Math.min(Math.abs(u - r), Math.PI) / Math.PI;
      count++;
    }
  }

  if (count === 0) return null;
  return 1 - sumDiff / count; // 1 = perfect match, 0 = completely different
}

/**
 * Average keypoint detection confidence across a snapshot.
 * Used as a fallback quality signal when no reference frames exist.
 */
export function avgConfidence(kps) {
  if (!kps || kps.length === 0) return 0;
  return kps.reduce((s, k) => s + (k.score ?? 0), 0) / kps.length;
}
