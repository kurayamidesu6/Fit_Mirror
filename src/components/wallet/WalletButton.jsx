import { useState } from 'react';
import { useWallet } from '@/lib/WalletContext';
import { Wallet, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function WalletButton({ className = '', fullWidth = false }) {
  const { connected, shortAddr, solBalance, connect, disconnect, connecting, hasPhantom } = useWallet();
  const [open, setOpen] = useState(false);

  if (connected) {
    return (
      <div className={cn('relative', fullWidth && 'w-full')}>
        <button
          onClick={() => setOpen(v => !v)}
          className={cn(
            'flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-medium transition-all',
            'bg-primary/10 border-primary/30 text-primary hover:bg-primary/20',
            fullWidth && 'w-full justify-between',
            className
          )}
        >
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse flex-shrink-0" />
            <span className="font-mono text-xs">{shortAddr}</span>
          </div>
          <span className="text-[10px] text-primary/70">{solBalance.toFixed(3)} SOL</span>
        </button>

        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <div className="absolute right-0 top-full mt-1 bg-card border border-border rounded-xl shadow-lg z-50 min-w-[180px] p-1">
              <div className="px-3 py-2 border-b border-border mb-1">
                <p className="text-[10px] text-muted-foreground font-mono truncate">{shortAddr}</p>
                <p className="text-xs font-semibold mt-0.5">{solBalance.toFixed(4)} SOL (devnet)</p>
              </div>
              <button
                onClick={() => { disconnect(); setOpen(false); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                Disconnect
              </button>
            </div>
          </>
        )}
      </div>
    );
  }

  if (!hasPhantom) {
    return (
      <button
        onClick={() => window.open('https://phantom.app', '_blank')}
        className={cn(
          'inline-flex items-center justify-center gap-2 h-8 rounded-md px-3 text-xs font-medium',
          'border border-input bg-transparent shadow-sm hover:bg-accent hover:text-accent-foreground transition-colors',
          fullWidth && 'w-full',
          className
        )}
      >
        <Wallet className="w-4 h-4" />
        Install Phantom ↗
      </button>
    );
  }

  return (
    <button
      onClick={connect}
      disabled={connecting}
      className={cn(
        'inline-flex items-center justify-center gap-2 h-8 rounded-md px-3 text-xs font-medium',
        'bg-primary text-primary-foreground shadow hover:bg-primary/90 transition-colors',
        'disabled:pointer-events-none disabled:opacity-50',
        fullWidth && 'w-full',
        className
      )}
    >
      <Wallet className="w-4 h-4" />
      {connecting ? 'Connecting…' : 'Connect Wallet'}
    </button>
  );
}
