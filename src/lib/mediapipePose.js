import { FilesetResolver, PoseLandmarker } from '@mediapipe/tasks-vision';

const WASM_ROOT = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.34/wasm';
const POSE_MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/latest/pose_landmarker_lite.task';

const MIN_VISIBILITY = 0.35;

const MEDIAPIPE_CONNECTIONS = [
  [11, 13], [13, 15],
  [12, 14], [14, 16],
  [11, 12], [11, 23], [12, 24], [23, 24],
  [23, 25], [25, 27], [27, 31],
  [24, 26], [26, 28], [28, 32],
  [15, 19], [16, 20],
];

const COCO_TO_MEDIAPIPE = [
  0,  // nose
  2,  // left eye
  5,  // right eye
  7,  // left ear
  8,  // right ear
  11, // left shoulder
  12, // right shoulder
  13, // left elbow
  14, // right elbow
  15, // left wrist
  16, // right wrist
  23, // left hip
  24, // right hip
  25, // left knee
  26, // right knee
  27, // left ankle
  28, // right ankle
];

let visionPromise = null;

export function warmMediaPipePose() {
  return loadVisionFileset();
}

async function loadVisionFileset() {
  if (!visionPromise) {
    visionPromise = FilesetResolver.forVisionTasks(WASM_ROOT);
  }
  return visionPromise;
}

export async function createMediaPipePoseLandmarker() {
  const vision = await loadVisionFileset();

  try {
    return await PoseLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: POSE_MODEL_URL,
        delegate: 'GPU',
      },
      runningMode: 'VIDEO',
      numPoses: 1,
      minPoseDetectionConfidence: 0.5,
      minPosePresenceConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });
  } catch (gpuError) {
    console.warn('[MediaPipe] GPU delegate failed; falling back to CPU.', gpuError);
    return PoseLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: POSE_MODEL_URL,
        delegate: 'CPU',
      },
      runningMode: 'VIDEO',
      numPoses: 1,
      minPoseDetectionConfidence: 0.5,
      minPosePresenceConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });
  }
}

export function detectMediaPipePose(landmarker, videoEl, timestampMs = performance.now()) {
  if (!landmarker || !videoEl || videoEl.readyState < 2) return null;
  try {
    return landmarker.detectForVideo(videoEl, timestampMs);
  } catch (err) {
    console.warn('[MediaPipe] detectForVideo failed.', err);
    return null;
  }
}

export function mediaPipeResultHasPose(result) {
  return Boolean(result?.landmarks?.[0]?.length);
}

export function mediaPipeToCocoKeypoints(result) {
  const landmarks = result?.landmarks?.[0];
  if (!landmarks?.length) return null;

  return COCO_TO_MEDIAPIPE.map((mpIndex) => {
    const landmark = landmarks[mpIndex];
    if (!landmark) return { x: 0, y: 0, score: 0 };
    const score = landmark.visibility ?? landmark.presence ?? 0;
    return {
      x: landmark.x * 1000,
      y: landmark.y * 1000,
      score,
    };
  });
}

export function drawMediaPipePose(result, canvas, options = {}) {
  if (!canvas) return;

  const { mirror = false, stroke = 'hsl(162, 95%, 55%)', fill = 'hsl(162, 95%, 75%)' } = options;
  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  const width = Math.max(1, Math.round(rect.width * dpr));
  const height = Math.max(1, Math.round(rect.height * dpr));

  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }

  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, rect.width, rect.height);

  const landmarks = result?.landmarks?.[0];
  if (!landmarks?.length) return;

  const point = (index) => {
    const landmark = landmarks[index];
    if (!landmark) return null;
    const score = landmark.visibility ?? landmark.presence ?? 0;
    if (score < MIN_VISIBILITY) return null;
    return {
      x: (mirror ? 1 - landmark.x : landmark.x) * rect.width,
      y: landmark.y * rect.height,
    };
  };

  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.strokeStyle = stroke;
  ctx.shadowColor = stroke;
  ctx.shadowBlur = 8;

  MEDIAPIPE_CONNECTIONS.forEach(([start, end]) => {
    const a = point(start);
    const b = point(end);
    if (!a || !b) return;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  });

  ctx.shadowBlur = 4;
  ctx.fillStyle = fill;
  landmarks.forEach((_landmark, index) => {
    const p = point(index);
    if (!p) return;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
    ctx.fill();
  });
}

export function clearPoseCanvas(canvas) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}
