import { useState } from 'react';
import { supabase } from '@/api/supabaseClient';
import { ArrowLeft, ArrowRight, Check, Eye, EyeOff } from 'lucide-react';
const logo = '/logo.png';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

// ── Helpers ───────────────────────────────────────────────────────────────────
function validateEmail(v) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
}
function validatePassword(v) {
  return v.length >= 6;
}
function validateUsername(v) {
  return /^[a-zA-Z0-9_]{3,20}$/.test(v.trim());
}

// ── Step indicator ────────────────────────────────────────────────────────────
function StepDots({ total, current }) {
  return (
    <div className="flex items-center gap-2 justify-center mb-8">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={cn(
            'rounded-full transition-all duration-300',
            i < current
              ? 'w-2 h-2 bg-primary'
              : i === current
              ? 'w-6 h-2 bg-primary'
              : 'w-2 h-2 bg-border',
          )}
        />
      ))}
    </div>
  );
}

// ── Sign-up flow (3 steps) ────────────────────────────────────────────────────
function SignUpFlow({ onDone, onSwitchToLogin }) {
  const [step, setStep] = useState(0); // 0=email 1=password 2=username
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [username, setUsername] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const STEPS = [
    {
      title: "What's your email?",
      subtitle: "We'll use this to log you in.",
    },
    {
      title: 'Create a password',
      subtitle: 'At least 6 characters.',
    },
    {
      title: 'Pick a username',
      subtitle: '3–20 characters, letters, numbers, underscores.',
    },
  ];

  const canAdvance = () => {
    if (step === 0) return validateEmail(email);
    if (step === 1) return validatePassword(password);
    if (step === 2) return validateUsername(username);
    return false;
  };

  const handleNext = async (e) => {
    e.preventDefault();
    setError('');
    if (!canAdvance()) return;

    if (step < 2) {
      setStep(step + 1);
      return;
    }

    // Step 2 — submit
    setIsLoading(true);
    try {
      // 1. Create the auth account
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: { username: username.trim(), display_name: username.trim() },
        },
      });

      if (signUpError) throw signUpError;

      const uid = signUpData?.user?.id;
      if (uid) {
        // 2. Upsert profile row with username
        await supabase.from('profiles').upsert({
          id: uid,
          username: username.trim(),
          full_name: username.trim(),
        });
      }

      onDone();
    } catch (err) {
      setError(err.message || 'Something went wrong.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-sm">
      {/* Back / progress */}
      <div className="flex items-center justify-between mb-2">
        <button
          type="button"
          onClick={() => (step === 0 ? onSwitchToLogin() : setStep(step - 1))}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          {step === 0 ? 'Sign in' : 'Back'}
        </button>
        <span className="text-xs text-muted-foreground">Step {step + 1} of 3</span>
      </div>

      <StepDots total={3} current={step} />

      <h2 className="font-space font-bold text-2xl mb-1">{STEPS[step].title}</h2>
      <p className="text-muted-foreground text-sm mb-8">{STEPS[step].subtitle}</p>

      <form onSubmit={handleNext} className="space-y-4">
        {/* Step 0 — email */}
        {step === 0 && (
          <div>
            <Label className="text-sm mb-1.5 block">Email</Label>
            <Input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoFocus
              required
              className="h-11 rounded-xl"
            />
          </div>
        )}

        {/* Step 1 — password */}
        {step === 1 && (
          <div>
            <Label className="text-sm mb-1.5 block">Password</Label>
            <div className="relative">
              <Input
                type={showPass ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoFocus
                required
                className="h-11 rounded-xl pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPass((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {/* Strength hint */}
            <div className="flex gap-1 mt-2">
              {[6, 8, 12].map((len) => (
                <div
                  key={len}
                  className={cn(
                    'h-1 flex-1 rounded-full transition-colors duration-300',
                    password.length >= len ? 'bg-primary' : 'bg-border',
                  )}
                />
              ))}
            </div>
          </div>
        )}

        {/* Step 2 — username */}
        {step === 2 && (
          <div>
            <Label className="text-sm mb-1.5 block">Username</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">@</span>
              <Input
                type="text"
                placeholder="fit_legend"
                value={username}
                onChange={(e) => setUsername(e.target.value.replace(/\s/g, ''))}
                autoFocus
                maxLength={20}
                className="h-11 rounded-xl pl-7"
              />
            </div>
            {username && !validateUsername(username) && (
              <p className="text-xs text-destructive mt-1.5">
                3–20 characters, only letters, numbers, and underscores.
              </p>
            )}
          </div>
        )}

        {error && (
          <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <Button
          type="submit"
          disabled={isLoading || !canAdvance()}
          className="w-full h-11 rounded-xl font-semibold flex items-center justify-center gap-2"
        >
          {isLoading ? (
            'Creating account…'
          ) : step < 2 ? (
            <>Continue <ArrowRight className="w-4 h-4" /></>
          ) : (
            <>Create Account <Check className="w-4 h-4" /></>
          )}
        </Button>
      </form>

      {step === 0 && (
        <p className="text-center text-sm text-muted-foreground mt-6">
          Already have an account?{' '}
          <button
            onClick={onSwitchToLogin}
            className="text-primary font-medium hover:underline"
          >
            Sign in
          </button>
        </p>
      )}
    </div>
  );
}

// ── Login form ────────────────────────────────────────────────────────────────
function LoginForm({ onSwitchToSignUp }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setError(error.message);
    setIsLoading(false);
  };

  return (
    <div className="w-full max-w-sm">
      <h2 className="font-space font-bold text-2xl mb-1">Welcome back</h2>
      <p className="text-muted-foreground text-sm mb-8">Sign in to continue.</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label className="text-sm mb-1.5 block">Email</Label>
          <Input
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="h-11 rounded-xl"
          />
        </div>
        <div>
          <Label className="text-sm mb-1.5 block">Password</Label>
          <div className="relative">
            <Input
              type={showPass ? 'text' : 'password'}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="h-11 rounded-xl pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPass((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {error && (
          <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <Button
          type="submit"
          disabled={isLoading}
          className="w-full h-11 rounded-xl font-semibold"
        >
          {isLoading ? 'Signing in…' : 'Sign In'}
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground mt-6">
        Don't have an account?{' '}
        <button
          onClick={onSwitchToSignUp}
          className="text-primary font-medium hover:underline"
        >
          Sign up
        </button>
      </p>
    </div>
  );
}

// ── Success screen ────────────────────────────────────────────────────────────
function SuccessScreen() {
  return (
    <div className="w-full max-w-sm text-center">
      <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-6">
        <Check className="w-8 h-8 text-primary" />
      </div>
      <h2 className="font-space font-bold text-2xl mb-2">You're all set!</h2>
      <p className="text-muted-foreground text-sm">
        Check your email for a confirmation link, then sign in to start training.
      </p>
    </div>
  );
}

// ── Root component ────────────────────────────────────────────────────────────
export default function Login() {
  const [mode, setMode] = useState('login'); // 'login' | 'signup' | 'done'

  return (
    <div className="min-h-screen bg-background text-foreground flex">
      {/* Left branding panel */}
      <div className="hidden lg:flex w-1/2 bg-card border-r border-border flex-col items-center justify-center p-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 pointer-events-none" />
        <div className="relative text-center">
          {/* Logo mark — large, centred */}
          <img
            src={logo}
            alt="Fit Mirror"
            className="w-32 h-32 object-contain mx-auto mb-6 drop-shadow-md"
          />
          <p className="text-muted-foreground text-lg max-w-sm leading-relaxed">
            Train smarter. Match your form. Earn rewards with every rep.
          </p>
          <div className="mt-10 grid grid-cols-3 gap-4 text-center">
            {[
              { value: '500+', label: 'Workouts' },
              { value: '10K+', label: 'Athletes' },
              { value: '1M+', label: 'Reps logged' },
            ].map(({ value, label }) => (
              <div key={label} className="bg-background/50 rounded-xl p-4 border border-border">
                <p className="font-space font-bold text-2xl text-primary">{value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right — dynamic panel */}
      <div className="flex-1 flex items-center justify-center px-8 py-12">
        {/* Mobile logo */}
        <div className="absolute top-6 left-6 flex items-center gap-2 lg:hidden">
          <img src={logo} alt="Fit Mirror" className="w-8 h-8 object-contain" />
          <span className="font-space font-bold text-xl">Fit Mirror</span>
        </div>

        {mode === 'login' && (
          <LoginForm onSwitchToSignUp={() => setMode('signup')} />
        )}
        {mode === 'signup' && (
          <SignUpFlow
            onDone={() => setMode('done')}
            onSwitchToLogin={() => setMode('login')}
          />
        )}
        {mode === 'done' && <SuccessScreen />}
      </div>
    </div>
  );
}
