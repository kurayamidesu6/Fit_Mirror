import { useWallet } from '@/lib/WalletContext';
import { ExternalLink, ArrowUpRight, ArrowDownLeft, Coins, Send } from 'lucide-react';
import { cn } from '@/lib/utils';
import { solscanTxUrl } from '@/lib/wallet';

const TX_META = {
  attempt_fee:    { label: 'Attempt Fee',       Icon: ArrowDownLeft, color: 'text-destructive', bg: 'bg-destructive/10' },
  workout_reward: { label: 'Workout Passed',     Icon: ArrowUpRight,  color: 'text-primary',     bg: 'bg-primary/10' },
  creator_reward: { label: 'Creator Earnings',   Icon: Send,          color: 'text-chart-3',     bg: 'bg-chart-3/10' },
  purchase:       { label: 'Store Purchase',     Icon: ArrowDownLeft, color: 'text-destructive', bg: 'bg-destructive/10' },
};

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function TransactionFeed({ limit = 15 }) {
  const { transactions } = useWallet();
  const visible = transactions.slice(0, limit);

  if (visible.length === 0) {
    return (
      <div className="text-center py-10">
        <Coins className="w-10 h-10 text-muted-foreground/20 mx-auto mb-3" />
        <p className="text-sm font-medium text-muted-foreground">No transactions yet</p>
        <p className="text-xs text-muted-foreground/60 mt-1">Complete a workout to earn your first FIT tokens</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {visible.map((tx) => {
        const meta = TX_META[tx.type] ?? { label: tx.type, Icon: Coins, color: 'text-foreground', bg: 'bg-secondary' };
        const { Icon } = meta;
        const isCredit = tx.amount > 0;

        return (
          <div
            key={tx.id || tx.tx_hash}
            className="flex items-center gap-3 p-3 rounded-xl bg-secondary/50 hover:bg-secondary transition-colors"
          >
            <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0', meta.bg)}>
              <Icon className={cn('w-4 h-4', meta.color)} />
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{tx.description || meta.label}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[10px] text-muted-foreground">{timeAgo(tx.created_at)}</span>
                {tx.tx_hash && (
                  <a
                    href={solscanTxUrl(tx.tx_hash)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-0.5 text-[10px] text-primary hover:underline font-mono"
                    onClick={e => e.stopPropagation()}
                  >
                    {tx.tx_hash.slice(0, 8)}…
                    <ExternalLink className="w-2.5 h-2.5 ml-0.5" />
                  </a>
                )}
                <span className="text-[10px] text-primary/60 font-medium">confirmed</span>
              </div>
            </div>

            <span className={cn('text-sm font-bold tabular-nums flex-shrink-0', meta.color)}>
              {isCredit ? '+' : ''}{tx.amount} FIT
            </span>
          </div>
        );
      })}
    </div>
  );
}
