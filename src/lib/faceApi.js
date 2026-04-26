/**
 * Face API — real face detection & recognition using face-api.js
 * Models are loaded from jsDelivr CDN (no local binary files needed).
 *
 * Uses:
 *  - SSD MobileNet v1  — face detection
 *  - 68-point landmarks — face shape
 *  - Face recognition net — 128-D descriptor (embedding)
 *
 * Enrollment:  capture descriptor once → store in Supabase
 * Verification: capture live descriptor → euclidean distance vs stored
 */

// @vladmandic/face-api is a maintained fork of face-api.js fully compatible
// with TF.js 4.x. The original face-api.js@0.22.2 uses TF.js 1.7 internals
// that break when Vite deduplicates @tensorflow/tfjs-core to 4.x.
import * as faceapi from '@vladmandic/face-api';
import * as tf from '@tensorflow/tfjs';

const MODEL_URL = '/models';

let modelsLoaded = false;
let loadPromise = null;

/** Load all required models (cached — safe to call multiple times). */
export async function loadFaceModels() {
  if (modelsLoaded) return;
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    try {
      // Force WebGL — TF.js 4.x registers WebGPU as highest priority but it's
      // never initialised here. Must await both calls before any inference.
      await tf.setBackend('webgl');
      await tf.ready();

      await Promise.all([
        faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
      ]);
      modelsLoaded = true;
    } catch (err) {
      loadPromise = null; // reset so retry is possible
      throw err;
    }
  })();

  return loadPromise;
}

/**
 * Capture a 128-D face descriptor from a <video> element.
 * Returns null if no face is found or video isn't ready.
 */
export async function captureDescriptor(videoEl) {
  if (!videoEl || videoEl.readyState < 2) return null;

  const detection = await faceapi
    .detectSingleFace(videoEl, new faceapi.SsdMobilenetv1Options({ minConfidenceScore: 0.3 }))
    .withFaceLandmarks()
    .withFaceDescriptor();

  return detection ? Array.from(detection.descriptor) : null;
}

/**
 * Compare two descriptors (stored as plain number arrays).
 * Returns confidence 0–100: higher = better match.
 * Euclidean distance < 0.4 = same person.
 */
export function compareDescriptors(stored, live) {
  if (!stored || !live) return 0;
  const d1 = new Float32Array(stored);
  const d2 = new Float32Array(live);
  const distance = faceapi.euclideanDistance(d1, d2);
  // Map distance 0→100%, 0.6→0%
  return Math.max(0, Math.min(100, Math.round((1 - distance / 0.6) * 100)));
}

/** Threshold above which we consider it a match. */
export const MATCH_THRESHOLD = 60;

/** Start a webcam stream and attach to a video element. */
export async function startWebcam(videoEl) {
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { width: 640, height: 480, facingMode: 'user' },
    audio: false,
  });
  videoEl.srcObject = stream;
  await new Promise(resolve => { videoEl.onloadedmetadata = resolve; });
  await videoEl.play();
  return stream;
}

/** Stop all tracks on a stream. */
export function stopStream(stream) {
  stream?.getTracks().forEach(t => t.stop());
}
