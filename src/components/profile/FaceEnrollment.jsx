/**
 * FaceEnrollment — one-time face scan setup on the Profile page.
 * Opens the webcam, waits for a clear face, captures the 128-D descriptor,
 * and saves it to Supabase. User only needs to do this once.
 */
import { useState, useRef, useEffect } from 'react';
import { Camera, CheckCircle2, Loader2, RefreshCw, ShieldCheck, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { loadFaceModels, captureDescriptor, startWebcam, stopStream } from '@/lib/faceApi';
import { saveDescriptor } from '@/lib/faceDescriptor';

const STEPS = {
  idle: 'idle',
  loadingModels: 'loadingModels',
  camera: 'camera',
  capturing: 'capturing',
  saving: 'saving',
  done: 'done',
  error: 'error',
};

export default function FaceEnrollment({ onEnrolled, onClose }) {
  const [step, setStep] = useState(STEPS.idle);
  const [errorMsg, setErrorMsg] = useState('');
  const [faceDetected, setFaceDetected] = useState(false);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const detectionIntervalRef = useRef(null);

  // Clean up camera on unmount
  useEffect(() => {
    return () => {
      clearInterval(detectionIntervalRef.current);
      stopStream(streamRef.current);
    };
  }, []);

  const startEnrollment = async () => {
    setStep(STEPS.loadingModels);
    setErrorMsg('');
    try {
      await loadFaceModels();
      // Switch to camera step — the <video> element mounts after this setState.
      // Actual webcam start happens in the useEffect below, once the DOM is ready.
      setStep(STEPS.camera);
    } catch (err) {
      console.error('[FaceEnrollment] model load error:', err);
      setErrorMsg(err.message || 'Failed to load face models.');
      setStep(STEPS.error);
    }
  };

  // Start webcam AFTER React has rendered the <video> element
  useEffect(() => {
    if (step !== STEPS.camera) return;
    let cancelled = false;

    const initCamera = async () => {
      try {
        const stream = await startWebcam(videoRef.current);
        if (cancelled) { stopStream(stream); return; }
        streamRef.current = stream;

        detectionIntervalRef.current = setInterval(async () => {
          if (!videoRef.current) return;
          const desc = await captureDescriptor(videoRef.current).catch(() => null);
          setFaceDetected(!!desc);
        }, 500);
      } catch (err) {
        console.error('[FaceEnrollment] camera error:', err);
        setErrorMsg(err.message || 'Could not access camera. Check browser permissions.');
        setStep(STEPS.error);
      }
    };

    initCamera();
    return () => { cancelled = true; };
  }, [step]);

  const handleCapture = async () => {
    clearInterval(detectionIntervalRef.current);
    setStep(STEPS.capturing);

    try {
      const descriptor = await captureDescriptor(videoRef.current);
      if (!descriptor) {
        setErrorMsg('No face detected — make sure your face is clearly visible and try again.');
        setStep(STEPS.error);
        stopStream(streamRef.current);
        return;
      }

      setStep(STEPS.saving);
      await saveDescriptor(descriptor);

      stopStream(streamRef.current);
      setStep(STEPS.done);
      setTimeout(() => onEnrolled?.(), 1200);
    } catch (err) {
      console.error('[FaceEnrollment] capture error:', err);
      setErrorMsg(err.message || 'Failed to save face data. Please try again.');
      setStep(STEPS.error);
      stopStream(streamRef.current);
    }
  };

  const handleRetry = () => {
    setStep(STEPS.idle);
    setErrorMsg('');
    setFaceDetected(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-card rounded-2xl border border-border w-full max-w-md shadow-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-primary" />
            <h2 className="font-space font-bold text-base">Face Enrollment</h2>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Idle */}
          {step === STEPS.idle && (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
                <Camera className="w-8 h-8 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-1">Set up face verification</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  We'll capture your face once and store a secure numeric signature — not your photo.
                  This is used to confirm it's you before each workout attempt.
                </p>
              </div>
              <ul className="text-left space-y-2 text-sm text-muted-foreground">
                {[
                  'Only a numeric descriptor is stored, never your image',
                  'Required before attempting any workout',
                  'Takes about 10 seconds to set up',
                ].map(t => (
                  <li key={t} className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                    {t}
                  </li>
                ))}
              </ul>
              <Button onClick={startEnrollment} className="w-full h-11 rounded-xl font-semibold">
                <Camera className="w-4 h-4 mr-2" /> Open Camera
              </Button>
            </div>
          )}

          {/* Loading models */}
          {step === STEPS.loadingModels && (
            <div className="text-center py-8 space-y-3">
              <Loader2 className="w-10 h-10 text-primary animate-spin mx-auto" />
              <p className="font-medium">Loading face recognition models…</p>
              <p className="text-sm text-muted-foreground">First time only — takes a few seconds</p>
            </div>
          )}

          {/* Camera live feed */}
          {step === STEPS.camera && (
            <div className="space-y-4">
              <div className="relative rounded-xl overflow-hidden bg-black aspect-video">
                <video
                  ref={videoRef}
                  autoPlay
                  muted
                  playsInline
                  className="w-full h-full object-cover scale-x-[-1]"
                />
                {/* Face guide overlay */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className={cn(
                    'w-36 h-44 rounded-full border-4 transition-colors duration-300',
                    faceDetected ? 'border-primary' : 'border-white/30'
                  )} />
                </div>
                {/* Status badge */}
                <div className={cn(
                  'absolute bottom-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-xs font-semibold transition-colors',
                  faceDetected ? 'bg-primary text-primary-foreground' : 'bg-black/60 text-white'
                )}>
                  {faceDetected ? '✓ Face detected — ready to capture' : 'Position your face in the oval'}
                </div>
              </div>
              <Button
                onClick={handleCapture}
                disabled={!faceDetected}
                className="w-full h-11 rounded-xl font-semibold"
              >
                <Camera className="w-4 h-4 mr-2" /> Capture My Face
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                Make sure you're in good light, facing the camera directly
              </p>
            </div>
          )}

          {/* Capturing */}
          {step === STEPS.capturing && (
            <div className="text-center py-8 space-y-3">
              <div className="relative">
                <video ref={videoRef} autoPlay muted playsInline className="hidden" />
                <Loader2 className="w-10 h-10 text-primary animate-spin mx-auto" />
              </div>
              <p className="font-medium">Capturing face data…</p>
            </div>
          )}

          {/* Saving */}
          {step === STEPS.saving && (
            <div className="text-center py-8 space-y-3">
              <Loader2 className="w-10 h-10 text-primary animate-spin mx-auto" />
              <p className="font-medium">Saving to your profile…</p>
            </div>
          )}

          {/* Done */}
          {step === STEPS.done && (
            <div className="text-center py-8 space-y-3">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8 text-primary" />
              </div>
              <p className="font-space font-bold text-lg">Face enrolled!</p>
              <p className="text-sm text-muted-foreground">
                You're all set. Identity verification is now active for all workout attempts.
              </p>
            </div>
          )}

          {/* Error */}
          {step === STEPS.error && (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center mx-auto">
                <X className="w-8 h-8 text-destructive" />
              </div>
              <div>
                <p className="font-semibold text-destructive mb-1">Enrollment failed</p>
                <p className="text-sm text-muted-foreground">{errorMsg}</p>
              </div>
              <Button onClick={handleRetry} variant="outline" className="w-full h-11 rounded-xl gap-2">
                <RefreshCw className="w-4 h-4" /> Try Again
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
