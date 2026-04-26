/**
 * IdentityCheck — real face verification gate before workout attempts.
 *
 * Flow:
 *  intro → loadingModels → camera → comparing → result
 *
 * Uses face-api.js to:
 *  1. Load the stored descriptor from Supabase (enrolled on Profile)
 *  2. Open webcam + detect live face
 *  3. Compare euclidean distance between descriptors
 *  4. Pass if confidence ≥ MATCH_THRESHOLD, else block
 */
import { useState, useRef, useEffect } from 'react';
import { Shield, CheckCircle2, XCircle, Loader2, Camera, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import {
  loadFaceModels,
  captureDescriptor,
  compareDescriptors,
  MATCH_THRESHOLD,
  startWebcam,
  stopStream,
} from '@/lib/faceApi';
import { getStoredDescriptor } from '@/lib/faceDescriptor';
import { motion, AnimatePresence } from 'framer-motion';

export default function IdentityCheck({ onPassed, onFailed }) {
  const [step, setStep] = useState('intro'); // intro | loading | camera | comparing | result
  const [confidence, setConfidence] = useState(0);
  const [passed, setPassed] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [faceDetected, setFaceDetected] = useState(false);
  const [storedDescriptor, setStoredDescriptor] = useState(null);

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const pollRef = useRef(null);

  useEffect(() => {
    return () => {
      clearInterval(pollRef.current);
      stopStream(streamRef.current);
    };
  }, []);

  const handleBegin = async () => {
    setStep('loading');
    setErrorMsg('');

    try {
      // Load models + fetch stored descriptor in parallel
      const [, descriptor] = await Promise.all([
        loadFaceModels(),
        getStoredDescriptor(),
      ]);

      if (!descriptor) {
        setErrorMsg('No face enrolled on your profile. Go to Profile → set up face verification first.');
        setStep('error');
        return;
      }

      setStoredDescriptor(descriptor);
      // Switch to camera step — webcam starts after React renders the <video>
      setStep('camera');
    } catch (err) {
      console.error('[IdentityCheck]', err);
      setErrorMsg(err.message || 'Camera access denied. Check browser permissions.');
      setStep('error');
    }
  };

  // Start webcam AFTER React has mounted the <video> element
  useEffect(() => {
    if (step !== 'camera') return;
    let cancelled = false;

    const initCamera = async () => {
      try {
        const stream = await startWebcam(videoRef.current);
        if (cancelled) { stopStream(stream); return; }
        streamRef.current = stream;

        pollRef.current = setInterval(async () => {
          if (!videoRef.current) return;
          const desc = await captureDescriptor(videoRef.current).catch(() => null);
          setFaceDetected(!!desc);
        }, 600);
      } catch (err) {
        console.error('[IdentityCheck] camera error:', err);
        setErrorMsg(err.message || 'Camera access denied. Check browser permissions.');
        setStep('error');
      }
    };

    initCamera();
    return () => { cancelled = true; };
  }, [step]);

  const handleVerify = async () => {
    clearInterval(pollRef.current);
    setStep('comparing');

    try {
      const liveDescriptor = await captureDescriptor(videoRef.current);
      stopStream(streamRef.current);

      if (!liveDescriptor) {
        setErrorMsg('No face detected in frame. Try again in better lighting.');
        setStep('error');
        return;
      }

      const score = compareDescriptors(storedDescriptor, liveDescriptor);
      setConfidence(score);
      setPassed(score >= MATCH_THRESHOLD);
      setStep('result');
    } catch (err) {
      console.error('[IdentityCheck] verify error:', err);
      setErrorMsg('Verification failed. Please try again.');
      setStep('error');
    }
  };

  const handleRetry = () => {
    setStep('intro');
    setErrorMsg('');
    setFaceDetected(false);
    setConfidence(0);
    stopStream(streamRef.current);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex flex-col items-center justify-center p-6"
    >
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-primary/20 flex items-center justify-center mx-auto mb-3">
            <Shield className="w-7 h-7 text-primary" />
          </div>
          <h2 className="font-space font-bold text-xl text-white">Identity Check</h2>
          <p className="text-sm text-white/50 mt-1">Confirm it's you before the attempt</p>
        </div>

        <AnimatePresence mode="sync">
          {/* Intro */}
          {step === 'intro' && (
            <motion.div key="intro" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-3">
              {[
                { icon: Camera, text: 'Face recognition match', sub: 'Compares you to your enrolled profile' },
                { icon: Shield, text: 'Anti-cheat protection', sub: 'Prevents someone else from attempting for you' },
              ].map(({ icon: Icon, text, sub }) => (
                <div key={text} className="flex items-start gap-3 bg-white/5 rounded-xl p-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">{text}</p>
                    <p className="text-xs text-white/50">{sub}</p>
                  </div>
                </div>
              ))}
              <Button onClick={handleBegin} className="w-full h-12 rounded-xl bg-primary font-bold mt-2">
                Begin Verification
              </Button>
            </motion.div>
          )}

          {/* Loading models */}
          {step === 'loading' && (
            <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-8 space-y-3">
              <Loader2 className="w-10 h-10 text-primary animate-spin mx-auto" />
              <p className="font-medium text-white">Loading face recognition…</p>
              <p className="text-xs text-white/40">First time may take a few seconds</p>
            </motion.div>
          )}

          {/* Camera live feed */}
          {step === 'camera' && (
            <motion.div key="camera" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              <div className="relative rounded-xl overflow-hidden bg-black aspect-video">
                <video
                  ref={videoRef}
                  autoPlay
                  muted
                  playsInline
                  className="w-full h-full object-cover scale-x-[-1]"
                />
                {/* Oval guide */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className={cn(
                    'w-32 h-40 rounded-full border-4 transition-colors duration-300',
                    faceDetected ? 'border-primary' : 'border-white/30'
                  )} />
                </div>
                <div className={cn(
                  'absolute bottom-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-colors',
                  faceDetected ? 'bg-primary text-primary-foreground' : 'bg-black/60 text-white'
                )}>
                  {faceDetected ? '✓ Face detected' : 'Move closer · face the camera · good lighting'}
                </div>
              </div>
              <Button
                onClick={handleVerify}
                disabled={!faceDetected}
                className="w-full h-12 rounded-xl font-bold"
              >
                Verify My Identity
              </Button>
            </motion.div>
          )}

          {/* Comparing */}
          {step === 'comparing' && (
            <motion.div key="comparing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-8 space-y-3">
              <Loader2 className="w-10 h-10 text-primary animate-spin mx-auto" />
              <p className="font-medium text-white">Comparing face data…</p>
            </motion.div>
          )}

          {/* Result */}
          {step === 'result' && (
            <motion.div key="result" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center space-y-5">
              <div className={cn(
                'w-20 h-20 rounded-full mx-auto flex items-center justify-center',
                passed ? 'bg-primary/20' : 'bg-destructive/20'
              )}>
                {passed
                  ? <CheckCircle2 className="w-10 h-10 text-primary" />
                  : <XCircle className="w-10 h-10 text-destructive" />
                }
              </div>
              <div>
                <p className="font-space font-bold text-xl text-white">
                  {passed ? 'Identity Confirmed' : 'Verification Failed'}
                </p>
                <p className="text-sm text-white/50 mt-1">Match confidence: {confidence}%</p>
              </div>
              <Progress
                value={confidence}
                className={cn('h-2', !passed && '[&>div]:bg-destructive')}
              />
              {!passed && (
                <p className="text-xs text-white/40">
                  Score {confidence}% is below the {MATCH_THRESHOLD}% threshold.
                  Try better lighting or re-enroll your face on the Profile page.
                </p>
              )}
              <div className="flex gap-3">
                {!passed && (
                  <Button onClick={handleRetry} variant="outline" className="flex-1 h-11 rounded-xl gap-2">
                    <RefreshCw className="w-4 h-4" /> Retry
                  </Button>
                )}
                <Button
                  onClick={passed ? onPassed : onFailed}
                  className={cn(
                    'flex-1 h-11 rounded-xl font-bold',
                    passed ? 'bg-primary text-primary-foreground' : 'bg-destructive text-white'
                  )}
                >
                  {passed ? 'Continue to Workout' : 'Go Back'}
                </Button>
              </div>
            </motion.div>
          )}

          {/* Error */}
          {step === 'error' && (
            <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center space-y-4">
              <XCircle className="w-12 h-12 text-destructive mx-auto" />
              <p className="text-sm text-white/70">{errorMsg}</p>
              <div className="flex gap-3">
                <Button onClick={handleRetry} variant="outline" className="flex-1 h-11 rounded-xl gap-2">
                  <RefreshCw className="w-4 h-4" /> Retry
                </Button>
                <Button onClick={onFailed} className="flex-1 h-11 rounded-xl bg-destructive text-white">
                  Go Back
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
