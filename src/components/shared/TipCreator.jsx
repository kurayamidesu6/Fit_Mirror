/**
 * TipCreator
 *
 * Lets a viewer tip a workout creator with real FIT tokens on Solana devnet.
 *
 * Flow:
 *  1. Fetch creator's wallet_address from their profiles row
 *  2. User picks an amount and clicks Send
 *  3. tipCreator() builds a Token-2022 transfer (tipper → creator) and
 *     asks Phantom to sign — creator's ATA is created if it doesn't exist
 *  4. On-chain confirmation → record in `tips` table → update optimistic balance
 */

import { useState } from 'react';
import { Heart, Send, Loader2, CheckCircle2, AlertCircle, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/api/supabaseClient';
import { tipCreator } from '@/lib/tokenService';
import { useWallet } from '@/lib/WalletContext';
import { useQuery } from '@tanstack/react-query';

const TIP_AMOUNTS = [5, 10, 25, 50];

// Fetch creator's wallet address from their profile row
async function fetchCreatorWallet(creatorUserId) {
  if (!creatorUserId) return null;
  const { data, error } = await supabase
    .from('profiles')
    .select('wallet_address')
    .eq('id', creatorUserId)
    .single();
  if (error || !data) return null;
  return data.wallet_address || null;
}

export default function TipCreator({ creatorName, creatorUserId, workoutId }) {
  const { address: myWallet, connected, fitBalance, refreshBalance } = useWallet();
  const [open, setOpen]       = useState(false);
  const [selected, setSelected] = useState(null);
  const [status, setStatus]   = useState('idle'); // idle | sending | success | error
  const [errorMsg, setErrorMsg] = useState('');

  // Fetch creator wallet lazily when panel opens
  const { data: creatorWallet, isLoading: walletLoading } = useQuery({
    queryKey: ['creator-wallet', creatorUserId],
    queryFn: () => fetchCreatorWallet(creatorUserId),
    enabled: !!creatorUserId && open,
    staleTime: 5 * 60 * 1000,
  });

  const handleOpen = () => {
    setOpen(v => !v);
    setStatus('idle');
    setErrorMsg('');
    setSelected(null);
  };

  const handleSend = async () => {
    if (!selected || status === 'sending') return;

    if (!connected || !myWallet) {
      setErrorMsg('Connect your Phantom wallet first.');
      setStatus('error');
      return;
    }
    if (!creatorWallet) {
      setErrorMsg("The creator hasn't linked a wallet yet — they need to connect Phantom on the app.");
      setStatus('error');
      return;
    }
    if (myWallet.toLowerCase() === creatorWallet.toLowerCase()) {
      setErrorMsg("You can't tip yourself.");
      setStatus('error');
      return;
    }
    if ((fitBalance ?? 0) < selected) {
      setErrorMsg(`Not enough FIT — you have ${fitBalance ?? 0} FIT.`);
      setStatus('error');
      return;
    }

    setStatus('sending');
    setErrorMsg('');

    try {
      // 1. On-chain transfer (Phantom popup)
      const txHash = await tipCreator({
        fromWallet: myWallet,
        toWallet: creatorWallet,
        amount: selected,
      });

      // 2. Record in tips table
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from('tips').insert({
        from_user_id: user?.id ?? null,
        to_user_id: creatorUserId ?? null,
        workout_id: workoutId ?? null,
        amount: selected,
        tx_hash: txHash,
      });

      setStatus('success');
      refreshBalance(); // pull updated on-chain balance
      // Auto-close after showing success
      setTimeout(() => {
        setOpen(false);
        setStatus('idle');
        setSelected(null);
      }, 2000);
    } catch (err) {
      console.error('[TipCreator]', err);
      setErrorMsg(err?.message || 'Transaction failed. Please try again.');
      setStatus('error');
    }
  };

  return (
    <div>
      {/* Trigger button */}
      <Button
        variant="outline"
        size="sm"
        onClick={handleOpen}
        className={cn(
          'rounded-full h-8 gap-1.5 text-xs transition-all',
          open
            ? 'border-primary/60 bg-primary/5 text-primary'
            : 'border-border hover:border-primary/50'
        )}
      >
        <Heart className={cn('w-3.5 h-3.5', open ? 'text-primary fill-primary' : 'text-destructive')} />
        Tip Creator
      </Button>

      {/* Panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="mt-3 bg-card rounded-2xl border border-border p-5 shadow-lg"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="font-semibold text-sm">Support {creatorName}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  FIT tokens sent directly to their wallet
                </p>
              </div>
              {connected && (
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Your balance</p>
                  <p className="text-sm font-bold text-primary">{fitBalance ?? 0} FIT</p>
                </div>
              )}
            </div>

            {/* Not connected warning */}
            {!connected && (
              <div className="flex items-center gap-2 bg-amber-500/10 text-amber-600 rounded-xl px-3 py-2.5 mb-4 text-xs">
                <Wallet className="w-4 h-4 flex-shrink-0" />
                Connect your Phantom wallet to send tips
              </div>
            )}

            {/* Amount picker */}
            <div className="grid grid-cols-4 gap-2 mb-4">
              {TIP_AMOUNTS.map(amt => (
                <button
                  key={amt}
                  onClick={() => setSelected(selected === amt ? null : amt)}
                  disabled={status === 'sending'}
                  className={cn(
                    'py-2.5 rounded-xl text-sm font-bold transition-all border',
                    selected === amt
                      ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                      : 'bg-secondary text-secondary-foreground border-transparent hover:border-primary/30 hover:bg-secondary/70'
                  )}
                >
                  {amt}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-muted-foreground text-center mb-4">
              FIT tokens · Solana devnet · Phantom required
            </p>

            {/* Status messages */}
            {status === 'error' && errorMsg && (
              <div className="flex items-start gap-2 bg-destructive/10 text-destructive rounded-xl px-3 py-2.5 mb-3 text-xs">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                {errorMsg}
              </div>
            )}

            {status === 'success' && (
              <div className="flex items-center gap-2 bg-primary/10 text-primary rounded-xl px-3 py-2.5 mb-3 text-sm font-medium">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                {selected} FIT sent to {creatorName}! 🎉
              </div>
            )}

            {/* Send button */}
            {status !== 'success' && (
              <Button
                onClick={handleSend}
                disabled={!selected || status === 'sending' || walletLoading}
                className="w-full h-10 rounded-xl text-sm font-bold"
              >
                {status === 'sending' ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Waiting for Phantom…</>
                ) : (
                  <><Send className="w-3.5 h-3.5 mr-2" /> Send {selected ? `${selected} FIT` : 'Tip'}</>
                )}
              </Button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
