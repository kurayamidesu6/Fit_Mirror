import { useState } from 'react';
import { supabase } from '@/api/supabaseClient';
import { Flame } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setMessage('');

    if (isSignUp) {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) setError(error.message);
      else setMessage('Check your email for a confirmation link.');
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setError(error.message);
    }

    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex">
      {/* Left — branding panel */}
      <div className="hidden lg:flex w-1/2 bg-card border-r border-border flex-col items-center justify-center p-12 relative overflow-hidden">
        {/* Background glow */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 pointer-events-none" />
        <div className="relative text-center">
          <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center mx-auto mb-6">
            <Flame className="w-8 h-8 text-primary" />
          </div>
          <h1 className="font-space font-bold text-4xl mb-4">Fit Mirror</h1>
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

      {/* Right — auth form */}
      <div className="flex-1 flex items-center justify-center px-8 py-12">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="w-8 h-8 rounded-xl bg-primary/20 flex items-center justify-center">
              <Flame className="w-5 h-5 text-primary" />
            </div>
            <span className="font-space font-bold text-xl">Fit Mirror</span>
          </div>

          <h2 className="font-space font-bold text-2xl mb-1">
            {isSignUp ? 'Create your account' : 'Welcome back'}
          </h2>
          <p className="text-muted-foreground text-sm mb-8">
            {isSignUp ? 'Start your fitness journey today.' : 'Sign in to continue.'}
          </p>

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
              <Input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="h-11 rounded-xl"
              />
            </div>

            {error && <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">{error}</p>}
            {message && <p className="text-sm text-primary bg-primary/10 rounded-lg px-3 py-2">{message}</p>}

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-11 rounded-xl font-semibold"
            >
              {isLoading ? 'Loading…' : isSignUp ? 'Create Account' : 'Sign In'}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-6">
            {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
            <button
              onClick={() => { setIsSignUp(!isSignUp); setError(''); setMessage(''); }}
              className="text-primary font-medium hover:underline"
            >
              {isSignUp ? 'Sign in' : 'Sign up'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
