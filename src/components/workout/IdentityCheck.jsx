import { useState, useEffect } from 'react';
import { Shield, CheckCircle2, XCircle, Loader2, Eye, Camera } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import {
  getRandomLivenessPrompt,
  runFaceMatch,
  runLivenessCheck,
  computeVerificationResult,
} from '@/lib/identityVerification';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Identity Verification Flow component.
 * MOCK — structured for real MediaPipe / face-recognition integration.
 * Steps: face match → liveness prompt → result
 */
export default function IdentityCheck({ onPassed, onFailed }) {
  const [step, setStep] = useState('intro'); // intro | face | liveness | result
  const [livenessPrompt] = useState(getRandomLivenessPrompt);
  const [faceResult, setFaceResult] = useState(null);
  const [livenessResult, setLivenessResult] = useState(null);
  const [verificationResult, setVerificationResult] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [countdown, setCountdown] = useState(null);

  const runFaceStep = async () => {
    setStep('face');
    setIsProcessing(true);
    // INTEGRATION POINT: capture live frame from camera feed and compare to enrolled selfie
    const result = await runFaceMatch(null, null);
    setFaceResult(result);
    setIsProcessing(false);
    // Auto-proceed to liveness
    setTimeout(() => setStep('liveness'), 800);
  };

  const runLivenessStep = async () => {
    setIsProcessing(true);
    // Start countdown
    let count = 3;
    setCountdown(count);
    await new Promise(r => {
      const interval = setInterval(() => {
        count--;
        setCountdown(count);
        if (count === 0) { clearInterval(interval); r(); }
      }, 700);
    });
    setCountdown(null);
    // INTEGRATION POINT: ML model verifies liveness gesture was performed
    const result = await runLivenessCheck(livenessPrompt.id);
    setLivenessResult(result);
    setIsProcessing(false);
    // Compute combined result
    const combined = computeVerificationResult(
      faceResult || { match: true, confidence: 90 },
      result,
      { isDuplicate: false }
    );
    setVerificationResult(combined);
    setStep('result');
  };

  const handleResult = () => {
    if (verificationResult?.passed) {
      onPassed();
    } else {
      onFailed();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex flex-col items-center justify-center p-6"
    >
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-primary/20 flex items-center justify-center mx-auto mb-3">
            <Shield className="w-7 h-7 text-primary" />
          </div>
          <h2 className="font-space font-bold text-xl">Identity Check</h2>
          <p className="text-sm text-muted-foreground mt-1">Anti-cheat verification required</p>
        </div>

        {/* Step: Intro */}
        {step === 'intro' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            {[
              { icon: Camera, text: 'Face recognition match', sub: 'Confirms you are the registered user' },
              { icon: Eye, text: 'Liveness detection', sub: 'Prevents pre-recorded replay attacks' },
              { icon: Shield, text: 'Session integrity', sub: 'Secure in-app recording only' },
            ].map(({ icon: Icon, text, sub }) => (
              <div key={text} className="flex items-start gap-3 bg-card/50 rounded-xl p-3">
                <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium">{text}</p>
                  <p className="text-xs text-muted-foreground">{sub}</p>
                </div>
              </div>
            ))}
            <Button onClick={runFaceStep} className="w-full h-12 rounded-xl bg-primary font-bold mt-2">
              Begin Verification
            </Button>
          </motion.div>
        )}

        {/* Step: Face Match */}
        {step === 'face' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center space-y-4">
            <div className="w-40 h-40 rounded-full border-4 border-primary/40 mx-auto flex items-center justify-center bg-card/30">
              {isProcessing ? (
                <Loader2 className="w-10 h-10 text-primary animate-spin" />
              ) : (
                <CheckCircle2 className="w-10 h-10 text-primary" />
              )}
            </div>
            <div>
              <p className="font-semibold">
                {isProcessing ? 'Scanning face...' : `Match: ${faceResult?.confidence}%`}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {/* INTEGRATION POINT: real MediaPipe FaceMesh results */}
                Comparing to enrolled identity reference
              </p>
            </div>
            {!isProcessing && faceResult && (
              <Progress value={faceResult.confidence} className="h-2" />
            )}
          </motion.div>
        )}

        {/* Step: Liveness */}
        {step === 'liveness' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center space-y-6">
            <div className="w-28 h-28 rounded-full border-4 border-accent/60 mx-auto flex items-center justify-center bg-card/30 text-5xl">
              {livenessPrompt.icon}
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Liveness Prompt</p>
              <p className="font-space font-bold text-xl">{livenessPrompt.instruction}</p>
              <p className="text-xs text-muted-foreground mt-1">Perform this action live to continue</p>
            </div>
            {countdown !== null && (
              <div className="text-4xl font-space font-bold text-primary">{countdown}</div>
            )}
            {!isProcessing && countdown === null && (
              <Button onClick={runLivenessStep} className="w-full h-12 rounded-xl bg-accent text-accent-foreground font-bold">
                I'm Ready — Start Check
              </Button>
            )}
            {isProcessing && countdown === null && (
              <div className="flex items-center justify-center gap-2 text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">Verifying...</span>
              </div>
            )}
          </motion.div>
        )}

        {/* Step: Result */}
        {step === 'result' && verificationResult && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center space-y-5">
            <div className={cn(
              'w-20 h-20 rounded-full mx-auto flex items-center justify-center',
              verificationResult.passed ? 'bg-primary/20' : 'bg-destructive/20'
            )}>
              {verificationResult.passed
                ? <CheckCircle2 className="w-10 h-10 text-primary" />
                : <XCircle className="w-10 h-10 text-destructive" />
              }
            </div>
            <div>
              <p className="font-space font-bold text-xl">
                {verificationResult.passed ? 'Identity Confirmed' : 'Verification Failed'}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Confidence: {verificationResult.confidence}% · Risk: {verificationResult.riskLevel}
              </p>
              {!verificationResult.passed && verificationResult.signals.length > 0 && (
                <p className="text-xs text-destructive mt-2">
                  Issues: {verificationResult.signals.join(', ')}
                </p>
              )}
            </div>
            <Button
              onClick={handleResult}
              className={cn(
                'w-full h-12 rounded-xl font-bold',
                verificationResult.passed ? 'bg-primary text-primary-foreground' : 'bg-destructive text-white'
              )}
            >
              {verificationResult.passed ? 'Continue to Workout' : 'Try Again'}
            </Button>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}