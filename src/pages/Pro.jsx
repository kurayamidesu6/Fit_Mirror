import { Link } from 'react-router-dom';
import { Crown, Coins, Lock, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Pro() {
  return (
    <div className="min-h-screen">
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border px-8 py-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-accent/10 flex items-center justify-center">
            <Crown className="w-5 h-5 text-accent" />
          </div>
          <div>
            <h1 className="font-space font-bold text-2xl">Pro Coaching</h1>
            <p className="text-sm text-muted-foreground">FIT unlocks are paused until token purchasing is wired.</p>
          </div>
        </div>
      </div>

      <div className="px-8 py-10 max-w-3xl mx-auto">
        <div className="border border-border bg-card rounded-2xl p-8 text-center">
          <div className="w-16 h-16 rounded-2xl bg-accent/10 flex items-center justify-center mx-auto mb-5">
            <Lock className="w-8 h-8 text-accent" />
          </div>
          <h2 className="font-space font-bold text-2xl mb-3">Pro unlocks coming back soon</h2>
          <p className="text-sm text-muted-foreground leading-relaxed max-w-xl mx-auto">
            Pro content will be unlocked by purchasing access with FIT coin once the token key and purchase flow are available again.
          </p>

          <div className="mt-6 rounded-xl border border-border bg-background/50 p-4 flex items-center justify-center gap-3 text-sm text-muted-foreground">
            <Coins className="w-5 h-5 text-primary" />
            Pro content unlocks with more FIT coins in your wallet.
          </div>

          <Link to="/">
            <Button className="mt-6 h-11 px-6 rounded-xl">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to workouts
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
