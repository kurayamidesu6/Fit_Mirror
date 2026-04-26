import { useState } from 'react';
import { Heart, Coins, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

const TIP_AMOUNTS = [10, 25, 50, 100];

/**
 * Tipping System — community support for creators using Fit Points.
 * MOCK: In production, this would trigger a Solana SPL token transfer
 * from the user's wallet to the creator's registered wallet address.
 */
export default function TipCreator({ creatorName, workoutId }) {
  const [selected, setSelected] = useState(null);
  const [sent, setSent] = useState(false);
  const [open, setOpen] = useState(false);

  const handleSend = () => {
    if (!selected) return;
    setSent(true);
    toast.success(`Tipped ${selected} FIT to ${creatorName}!`, {
      description: '💸 Mock Solana transfer — blockchain integration coming',
    });
    setTimeout(() => {
      setSent(false);
      setOpen(false);
      setSelected(null);
    }, 1500);
  };

  return (
    <div>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(!open)}
        className="rounded-full h-8 gap-1.5 text-xs border-border hover:border-primary/50"
      >
        <Heart className="w-3.5 h-3.5 text-destructive" />
        Tip Creator
      </Button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            className="mt-3 bg-card rounded-2xl border border-border p-4"
          >
            <div className="flex items-center gap-2 mb-3">
              <Coins className="w-4 h-4 text-chart-3" />
              <p className="text-sm font-semibold">Support {creatorName}</p>
            </div>
            <div className="flex gap-2 mb-3">
              {TIP_AMOUNTS.map(amt => (
                <button
                  key={amt}
                  onClick={() => setSelected(amt)}
                  className={cn(
                    'flex-1 py-2 rounded-xl text-sm font-bold transition-all',
                    selected === amt
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                  )}
                >
                  {amt}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-muted-foreground mb-3">
              FIT Points · Mock Solana transfer (demo)
            </p>
            <Button
              onClick={handleSend}
              disabled={!selected || sent}
              className="w-full h-9 rounded-xl text-sm font-bold bg-primary text-primary-foreground"
            >
              {sent ? '✓ Sent!' : (
                <><Send className="w-3.5 h-3.5 mr-1.5" /> Send {selected ? `${selected} FIT` : 'Tip'}</>
              )}
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}