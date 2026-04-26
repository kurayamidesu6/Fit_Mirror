import { useState } from 'react';
import { ShoppingBag, Zap, Star, Coins, ExternalLink } from 'lucide-react';
import { useWallet } from '@/lib/WalletContext';
import { solscanTokenUrl, TOKEN_MINT_ADDRESS } from '@/lib/wallet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

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

const CATEGORY_LABELS = { all: 'All', unlock: 'Unlocks', boost: 'Boosts', template: 'Plans', cosmetic: 'Style', tipping: 'Tips' };

const CATEGORY_COLORS = {
  unlock: 'text-accent bg-accent/10',
  boost: 'text-primary bg-primary/10',
  template: 'text-chart-3 bg-chart-3/10',
  cosmetic: 'text-chart-2 bg-chart-2/10',
  tipping: 'text-destructive bg-destructive/10',
};

function StoreCard({ item, userBalance, onBuy, purchased }) {
  const canAfford = userBalance >= item.price_fit;
  const isBought = purchased;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'bg-card rounded-2xl border p-5 flex flex-col gap-4',
        item.is_featured ? 'border-primary/30' : 'border-border'
      )}
    >
      {item.is_featured && (
        <div className="flex items-center gap-1 text-xs text-primary font-bold">
          <Star className="w-3.5 h-3.5" /> FEATURED
        </div>
      )}
      <div className="flex items-start gap-4">
        <div className="w-14 h-14 rounded-xl bg-secondary flex items-center justify-center text-3xl flex-shrink-0">
          {item.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <h3 className="font-semibold">{item.name}</h3>
            <Badge className={cn('text-[10px] border-0 flex-shrink-0', CATEGORY_COLORS[item.category])}>
              {item.category}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">{item.description}</p>
        </div>
      </div>
      <div className="flex items-center justify-between pt-1 border-t border-border">
        <div>
          <div className="flex items-center gap-1.5">
            <Zap className="w-4 h-4 text-primary" />
            <span className="font-bold text-primary text-lg">{item.price_fit} FIT</span>
          </div>
          <p className="text-xs text-muted-foreground/60 mt-0.5">≈ {item.solana_price} SOL (demo)</p>
        </div>
        <Button
          size="sm"
          disabled={!canAfford || isBought}
          onClick={() => onBuy(item)}
          className={cn('rounded-xl h-9 px-5 font-semibold', canAfford && !isBought ? '' : 'opacity-40')}
        >
          {isBought ? '✓ Purchased' : canAfford ? 'Buy' : 'Need more FIT'}
        </Button>
      </div>
    </motion.div>
  );
}

export default function Store() {
  const [category, setCategory] = useState('all');
  const [purchased, setPurchased] = useState([]);
  const { fitBalance, recordTransaction, tokenSymbol } = useWallet();

  const filtered = category === 'all' ? STORE_ITEMS : STORE_ITEMS.filter(i => i.category === category);

  const handleBuy = (item) => {
    if (purchased.includes(item.id)) return;
    setPurchased(prev => [...prev, item.id]);
    recordTransaction({
      type: 'purchase',
      amount: -item.price_fit,
      description: `Store: ${item.name}`,
    });
    toast.success(`Purchased: ${item.name}`, { description: `−${item.price_fit} ${tokenSymbol} from your balance` });
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border px-8 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-chart-3/10 flex items-center justify-center">
              <ShoppingBag className="w-5 h-5 text-chart-3" />
            </div>
            <div>
              <h1 className="font-space font-bold text-2xl">Store</h1>
              <p className="text-sm text-muted-foreground">Spend your FIT points on boosts and unlocks</p>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-card border border-border rounded-full px-4 py-2">
            <Zap className="w-4 h-4 text-primary" />
            <span className="font-bold text-primary">{fitBalance} {tokenSymbol}</span>
            <span className="text-sm text-muted-foreground">available</span>
          </div>
        </div>
      </div>

      <div className="px-8 py-6">
        {/* Token banner */}
        <a
          href={solscanTokenUrl(TOKEN_MINT_ADDRESS)}
          target="_blank"
          rel="noopener noreferrer"
          className="bg-gradient-to-r from-accent/10 to-primary/10 rounded-2xl border border-accent/20 p-5 mb-6 flex items-center justify-between hover:border-accent/40 transition-colors"
        >
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Coins className="w-4 h-4 text-accent" />
              <p className="font-bold">{tokenSymbol} Token on Solana Devnet</p>
            </div>
            <p className="text-sm text-muted-foreground">
              Your wallet balance is read live from chain. Spend {tokenSymbol} here to unlock perks.
            </p>
          </div>
          <ExternalLink className="w-5 h-5 text-muted-foreground flex-shrink-0" />
        </a>

        {/* Category filter */}
        <div className="flex gap-2 mb-6">
          {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setCategory(key)}
              className={cn(
                'px-4 py-2 rounded-full text-sm font-medium transition-all',
                category === key ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Items grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filtered.map(item => (
            <StoreCard
              key={item.id}
              item={item}
              userBalance={totalRewards}
              onBuy={handleBuy}
              purchased={purchased.includes(item.id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
