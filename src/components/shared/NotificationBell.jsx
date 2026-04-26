/**
 * NotificationBell
 *
 * Shows a bell icon in the sidebar. Queries the `tips` table for tips
 * received by the current user. Unread count badge appears when new tips
 * arrive since the last time the panel was opened.
 *
 * "Read" state is tracked via localStorage (last_opened_at timestamp).
 */

import { useState, useEffect, useRef } from 'react';
import { Bell, Coins, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/api/supabaseClient';
import { useAuth } from '@/lib/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';

const STORAGE_KEY = 'fitMirrorNotifLastSeen';

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  const h = Math.floor(diff / 3600000);
  const d = Math.floor(diff / 86400000);
  if (m < 1)  return 'just now';
  if (m < 60) return `${m}m ago`;
  if (h < 24) return `${h}h ago`;
  return `${d}d ago`;
}

function solscanUrl(hash) {
  return `https://solscan.io/tx/${hash}?cluster=devnet`;
}

export default function NotificationBell() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const panelRef = useRef(null);
  const buttonRef = useRef(null);

  const [lastSeen, setLastSeen] = useState(() => {
    return localStorage.getItem(STORAGE_KEY) || new Date(0).toISOString();
  });

  // Fetch tips received by this user, joined with sender profile
  const { data: tips = [], refetch } = useQuery({
    queryKey: ['my-tips', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('tips')
        .select(`
          id,
          amount,
          tx_hash,
          created_at,
          workout_id,
          from_user_id,
          sender:profiles!tips_from_user_id_fkey (
            username,
            email,
            wallet_address
          )
        `)
        .eq('to_user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) {
        // Fallback: fetch without join if FK alias fails
        const { data: plain } = await supabase
          .from('tips')
          .select('id, amount, tx_hash, created_at, workout_id, from_user_id')
          .eq('to_user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(20);
        return plain || [];
      }
      return data || [];
    },
    enabled: !!user,
    refetchInterval: 30_000, // poll every 30s
  });

  // Unread = tips newer than lastSeen
  const unreadCount = tips.filter(t => new Date(t.created_at) > new Date(lastSeen)).length;

  // Mark all read when panel opens
  const handleOpen = () => {
    const now = new Date().toISOString();
    setOpen(v => {
      if (!v) {
        setLastSeen(now);
        localStorage.setItem(STORAGE_KEY, now);
      }
      return !v;
    });
  };

  // Close on outside click (ignore clicks on the bell button itself — handleOpen covers those)
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      const inPanel  = panelRef.current  && panelRef.current.contains(e.target);
      const inButton = buttonRef.current && buttonRef.current.contains(e.target);
      if (!inPanel && !inButton) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Refetch when panel opens
  useEffect(() => {
    if (open) refetch();
  }, [open, refetch]);

  if (!user) return null;

  return (
    <div>
      {/* Bell button */}
      <button
        ref={buttonRef}
        onClick={handleOpen}
        className={cn(
          'relative w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-150',
          open
            ? 'bg-primary/20 text-primary'
            : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
        )}
        title="Notifications"
      >
        <Bell className="w-4 h-4" strokeWidth={open ? 2.5 : 2} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[16px] h-4 bg-destructive text-white text-[9px] font-bold rounded-full flex items-center justify-center px-1 leading-none">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown panel — fixed to left edge of sidebar, full sidebar width */}
      <AnimatePresence>
        {open && (
          <motion.div
            ref={panelRef}
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="fixed left-0 top-[77px] z-[200] w-60 bg-card border border-border border-t-0 shadow-xl overflow-hidden rounded-b-2xl"
          >
            {/* Header */}
            <div className="px-4 py-3 border-b border-border flex items-center justify-between">
              <p className="font-space font-bold text-sm">Notifications</p>
              {tips.length > 0 && (
                <span className="text-xs text-muted-foreground">{tips.length} tip{tips.length !== 1 ? 's' : ''} received</span>
              )}
            </div>

            {/* List */}
            <div className="max-h-96 overflow-y-auto">
              {tips.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center px-4">
                  <div className="w-12 h-12 rounded-2xl bg-secondary flex items-center justify-center mb-3">
                    <Coins className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <p className="text-sm font-medium text-muted-foreground">No tips yet</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">
                    When viewers tip your workouts, they'll appear here
                  </p>
                </div>
              ) : (
                tips.map((tip) => {
                  const isNew = new Date(tip.created_at) > new Date(lastSeen);
                  const senderName =
                    tip.sender?.username
                      ? `@${tip.sender.username}`
                      : tip.sender?.email
                      ? tip.sender.email.split('@')[0]
                      : 'Someone';

                  return (
                    <div
                      key={tip.id}
                      className={cn(
                        'flex items-start gap-3 px-4 py-3 border-b border-border/50 last:border-b-0 transition-colors',
                        isNew ? 'bg-primary/5' : 'hover:bg-secondary/40'
                      )}
                    >
                      {/* Icon */}
                      <div className={cn(
                        'w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold',
                        isNew ? 'bg-primary/20 text-primary' : 'bg-secondary text-muted-foreground'
                      )}>
                        {senderName[0]?.toUpperCase() || '?'}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm leading-snug">
                          <span className="font-semibold">{senderName}</span>
                          {' '}tipped you{' '}
                          <span className="font-bold text-primary">{tip.amount} FIT</span>
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {timeAgo(tip.created_at)}
                        </p>
                      </div>

                      {/* Tx link */}
                      {tip.tx_hash && (
                        <a
                          href={solscanUrl(tip.tx_hash)}
                          target="_blank"
                          rel="noreferrer"
                          className="flex-shrink-0 text-muted-foreground hover:text-primary transition-colors mt-1"
                          title="View on Solscan"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}

                      {/* New dot */}
                      {isNew && (
                        <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-2" />
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
