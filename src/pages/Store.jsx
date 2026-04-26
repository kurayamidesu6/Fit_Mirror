import { Link } from 'react-router-dom';
import { ShoppingBag, Coins, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Store() {
  return (
    <div className="min-h-screen">
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border px-8 py-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-chart-3/10 flex items-center justify-center">
            <ShoppingBag className="w-5 h-5 text-chart-3" />
          </div>
          <div>
            <h1 className="font-space font-bold text-2xl">Store Paused</h1>
            <p className="text-sm text-muted-foreground">Crypto trading and FIT purchases are temporarily disabled.</p>
          </div>
        </div>
      </div>

      <div className="px-8 py-10 max-w-3xl mx-auto">
        <div className="border border-border bg-card rounded-2xl p-8 text-center">
          <div className="w-16 h-16 rounded-2xl bg-chart-3/10 flex items-center justify-center mx-auto mb-5">
            <Coins className="w-8 h-8 text-chart-3" />
          </div>
          <h2 className="font-space font-bold text-2xl mb-3">FIT coin marketplace is on hold</h2>
          <p className="text-sm text-muted-foreground leading-relaxed max-w-xl mx-auto">
            This section will come back once the FIT coin key, purchase flow, and crypto exchange logic are available again.
          </p>

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
