import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { ShoppingBag, Zap, Crown, Shield, Flame, Star, ArrowRight, Coins, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

// Mock store inventory
const STORE_ITEMS = [
  { id: 's1', name: 'Pro Content Unlock', description: 'Instantly unlock all Pro coaching content — skip the workout requirement', category: 'unlock', price_fit: 500, icon: '👑', is_featured: true, solana_price: 0.002 },
  { id: 's2', name: 'Advanced Form Feedback', description: 'Get detailed AI coaching on your last 5 attempts with joint-by-joint breakdown', category: 'unlock', price_fit: 200, icon: '🎯', is_featured: false, solana_price: 0.001 },
  { id: 's3', name: 'Streak Shield', description: 'Protect your current streak for 24 hours — miss a day without penalty', category: 'boost', price_fit: 75, icon: '🛡️', is_featured: false, solana_price: 0.0003 },
  { id: 's4', name: 'Free Retry Token', description: 'Get one free retry on a failed challenge without losing staked points', category: 'boost', price_fit: 120, icon: '🔁', is_featured: false, solana_price: 0.0005 },
  { id: 's5', name: 'Elite Routine Template', description: 'Download a 4-week progressive overload routine built by verified coaches', category: 'template', price_fit: 350, icon: '📋', is_featured: true, solana_price: 0.0015 },
  { id: 's6', name: 'Neon Avatar Frame', description: 'Exclusive animated neon border for your profile avatar', category: 'cosmetic', price_fit: 150, icon: '✨', is_featured: false, solana_price: 0.0006 },
  { id: 's7', name: 'Gold Score Ring', description: 'Replace your score ring with an animated gold variant', category: 'cosmetic', price_fit: 250, icon: '🏅', is_featured: false, solana_price: 0.001 },
  { id: 's8', name: 'Creator Tip Bundle', description: 'Send appreciation tips to 3 creators of your choice', category: 'tipping', price_fit: 100, icon: '💸', is_featured: false, solana_price: 0.0004 },
];

const CATEGORY_LABELS = {
  all: 'All', unlock: 'Unlocks', boost: 'Boosts', template: 'Plans', cosmetic: 'Style', tipping: 'Tips'
};

const CATEGORY_COLORS = {
  unlock: 'text-accent bg-accent/10',
  boost: 'text-primary bg-primary/10',
  template: 'text-chart-3 bg-chart-3/10',
  cosmetic: 'text-chart-2 bg-chart-2/10',
  tipping: 'text-destructive bg-destructive/10',
};

function StoreCard({ item, userBalance, onBuy }) {
  const canAfford = userBalance >= item.price_fit;
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'bg-card rounded-2xl border p-4',
        item.is_featured ? 'border-primary/30' : 'border-border'
      )}
    >
      {item.is_featured && (
        <div className="flex items-center gap-1 text-[10px] text-primary font-bold mb-2">
          <Star className="w-3 h-3" /> FEATURED
        </div>
      )}
      <div className="flex items-start gap-3">
        <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center text-2xl flex-shrink-0">
          {item.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-0.5">
            <h3 className="font-semibold text-sm">{item.name}</h3>
            <Badge className={cn('text-[10px] border-0 flex-shrink-0', CATEGORY_COLORS[item.category])}>
              {item.category}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed mb-3">{item.description}</p>
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-1">
                <Zap className="w-3.5 h-3.5 text-primary" />
                <span className="font-bold text-primary">{item.price_fit} FIT</span>
              </div>
              {/* Mock Solana price — demo only */}
              <p className="text-[10px] text-muted-foreground/60 mt-0.5">≈ {item.solana_price} SOL (demo)</p>
            </div>
            <Button
              size="sm"
              disabled={!canAfford}
              onClick={() => onBuy(item)}
              className={cn(
                'rounded-xl h-8 text-xs font-bold',
                canAfford ? 'bg-primary text-primary-foreground hover:opacity-90' : 'opacity-40'
              )}
            >
              {canAfford ? 'Buy' : 'Need more FIT'}
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default function Store() {
  const [category, setCategory] = useState('all');
  const [purchased, setPurchased] = useState([]);

  const { data: attempts = [] } = useQuery({
    queryKey: ['my-attempts'],
    queryFn: () => base44.entities.Attempt.list('-created_date', 100),
  });

  const totalRewards = attempts.reduce((s, a) => s + (a.reward_earned || 0), 0);

  const filtered = category === 'all' ? STORE_ITEMS : STORE_ITEMS.filter(i => i.category === category);

  const handleBuy = (item) => {
    if (purchased.includes(item.id)) return;
    setPurchased(prev => [...prev, item.id]);
    toast.success(`Purchased: ${item.name}`, {
      description: `−${item.price_fit} FIT from your balance`,
    });
  };

  return (
    <div className="min-h-screen pb-28">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border">
        <div className="max-w-lg mx-auto px-4 pt-4 pb-3">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-chart-3/20 flex items-center justify-center">
                <ShoppingBag className="w-5 h-5 text-chart-3" />
              </div>
              <h1 className="font-space font-bold text-xl">Store</h1>
            </div>
            <div className="flex items-center gap-2 bg-card border border-border rounded-full px-3 py-1">
              <Zap className="w-3.5 h-3.5 text-primary" />
              <span className="text-sm font-bold text-primary">{totalRewards} FIT</span>
            </div>
          </div>
          {/* Category filter */}
          <div className="flex gap-2 overflow-x-auto pb-1">
            {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setCategory(key)}
                className={cn(
                  'whitespace-nowrap px-3 py-1 rounded-full text-xs font-medium transition-all',
                  category === key ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 pt-4 space-y-4">
        {/* Mock Solana exchange banner */}
        <div className="bg-gradient-to-r from-accent/10 to-primary/10 rounded-2xl border border-accent/20 p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Coins className="w-4 h-4 text-accent" />
                <p className="font-bold text-sm">FIT → SOL Exchange</p>
                <Badge className="bg-accent/20 text-accent border-0 text-[9px]">DEMO</Badge>
              </div>
              <p className="text-xs text-muted-foreground">Future: redeem Fit Points for real Solana tokens</p>
              <p className="text-[10px] text-muted-foreground/60 mt-0.5">Blockchain integration coming — mock prices shown above</p>
            </div>
            <ExternalLink className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          </div>
        </div>

        {/* Items */}
        <div className="space-y-3">
          {filtered.map(item => (
            <StoreCard
              key={item.id}
              item={item}
              userBalance={totalRewards}
              onBuy={handleBuy}
            />
          ))}
        </div>
      </div>
    </div>
  );
}