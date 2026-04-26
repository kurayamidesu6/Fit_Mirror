import { createContext, useState, useContext, useEffect, useCallback, useRef } from 'react';
import {
  connectPhantom, disconnectPhantom, getPhantomProvider,
  shortAddress, getSolBalance, getTokenBalance, generateTxHash,
  TOKEN_SYMBOL,
} from './wallet';
import { claimReward, spendTokens } from './tokenService';

// ── Token economy constants ──────────────────────────────────────────────────
export const ATTEMPT_FEE = 1;
export const PASS_REWARD = 5;
export const CREATOR_CUT = 2;
export const PRO_TOKEN_THRESHOLD = 50;
// ────────────────────────────────────────────────────────────────────────────

// Debit types that Phantom signs (user sends tokens to treasury)
const SPEND_TYPES = new Set(['attempt_fee', 'purchase']);
// Credit types that the edge function handles (treasury sends tokens to user)
const EARN_TYPES = new Set(['workout_reward']);

/** @param {string|null} addr */
const txKey = (addr) => addr ? `fitMirrorTx_${addr}` : 'fitMirrorTx_guest';

/** @param {string|null} addr */
function loadLocalTx(addr) {
  try { return JSON.parse(localStorage.getItem(txKey(addr)) || '[]'); }
  catch { return []; }
}

/** @param {string|null} addr @param {any[]} txs */
function saveLocalTx(addr, txs) {
  try { localStorage.setItem(txKey(addr), JSON.stringify(txs.slice(0, 100))); }
  catch {}
}

const WalletContext = createContext(/** @type {any} */ (null));

/** @param {{ children: import('react').ReactNode }} props */
export const WalletProvider = ({ children }) => {
  const [connected, setConnected] = useState(false);
  const [address, setAddress] = useState(/** @type {string|null} */ (null));
  const [solBalance, setSolBalance] = useState(0);
  const [tokenBalance, setTokenBalance] = useState(/** @type {number|null} */ (null));
  const [optimisticBalance, setOptimisticBalance] = useState(0);
  const [transactions, setTransactions] = useState(/** @type {any[]} */ ([]));
  const [connecting, setConnecting] = useState(false);
  const [hasPhantom, setHasPhantom] = useState(false);
  const mounted = useRef(true);
  const pollRef = useRef(/** @type {ReturnType<typeof setInterval>|null} */ (null));

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  // Hydrate tx history + derive optimistic balance from localStorage
  const loadTx = useCallback((/** @type {string|null} */ addr) => {
    const txs = loadLocalTx(addr);
    if (!mounted.current) return;
    setTransactions(txs);
    const bal = txs
      .filter((/** @type {any} */ tx) => tx.type !== 'creator_reward')
      .reduce((/** @type {number} */ sum, /** @type {any} */ tx) => sum + (tx.amount || 0), 0);
    setOptimisticBalance(Math.max(0, bal));
  }, []);

  // Fetch real on-chain token balance
  const refreshChainBalance = useCallback(async (/** @type {string} */ addr) => {
    const bal = await getTokenBalance(addr);
    if (mounted.current && bal !== null) setTokenBalance(bal);
  }, []);

  const startPolling = useCallback((/** @type {string} */ addr) => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(() => {
      if (mounted.current) refreshChainBalance(addr);
    }, 30_000);
  }, [refreshChainBalance]);

  const stopPolling = useCallback(() => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  }, []);

  const initWallet = useCallback((/** @type {string} */ addr) => {
    setAddress(addr);
    setConnected(true);
    setTokenBalance(null);
    loadTx(addr);
    getSolBalance(addr).then(sol => { if (mounted.current) setSolBalance(sol); });
    refreshChainBalance(addr);
    startPolling(addr);
  }, [loadTx, refreshChainBalance, startPolling]);

  // Detect Phantom and auto-reconnect on mount
  useEffect(() => {
    const provider = getPhantomProvider();
    setHasPhantom(!!provider);

    if (provider?.isConnected && provider.publicKey) {
      initWallet(provider.publicKey.toString());
    }

    if (provider) {
      provider.on('accountChanged', (/** @type {any} */ pk) => {
        if (!mounted.current) return;
        stopPolling();
        if (pk) {
          initWallet(pk.toString());
        } else {
          setAddress(null);
          setConnected(false);
          setTokenBalance(null);
          loadTx(null);
        }
      });
      provider.on('disconnect', () => {
        if (!mounted.current) return;
        stopPolling();
        setAddress(null);
        setConnected(false);
        setSolBalance(0);
        setTokenBalance(null);
        loadTx(null);
      });
    }
  }, [initWallet, loadTx, stopPolling]);

  const connect = async () => {
    setConnecting(true);
    try {
      const addr = await connectPhantom();
      if (mounted.current) initWallet(addr);
    } finally {
      if (mounted.current) setConnecting(false);
    }
  };

  const disconnect = async () => {
    stopPolling();
    await disconnectPhantom();
    if (mounted.current) {
      setAddress(null);
      setConnected(false);
      setSolBalance(0);
      setTokenBalance(null);
      loadTx(null);
    }
  };

  /**
   * Records a token transaction.
   * - EARN types (workout_reward): calls the Supabase Edge Function — treasury
   *   sends real tokens to the user's wallet on-chain, no Phantom popup.
   * - SPEND types (attempt_fee, purchase): builds a transaction and asks Phantom
   *   to sign it — user sends real tokens to the treasury on-chain.
   * - CREATOR / INFO types: recorded locally only (informational).
   * Falls back to optimistic local recording if chain calls fail.
   */
  const recordTransaction = useCallback(async (/** @type {{ type: string, amount: number, description: string, workoutId?: string, workoutTitle?: string }} */ opts) => {
    const { type, amount, description, workoutId, workoutTitle } = opts;
    let txHash = generateTxHash();

    // ── Attempt real on-chain transaction ─────────────────────────────────
    if (address) {
      try {
        if (EARN_TYPES.has(type)) {
          // Edge function: treasury → user wallet (silent, no popup)
          txHash = await claimReward({ walletAddress: address, amount, description });
        } else if (SPEND_TYPES.has(type) && connected) {
          // Phantom: user wallet → treasury (Phantom approval popup)
          txHash = await spendTokens({ walletAddress: address, amount: Math.abs(amount) });
        }
      } catch (err) {
        // Chain call failed — log and fall through to optimistic recording
        console.warn(`[tokenService] ${type} chain call failed, recording optimistically:`, err);
      }
    }

    // ── Always record locally so the UI stays responsive ─────────────────
    const entry = {
      id: txHash,
      type,
      amount,
      description,
      workout_id: workoutId || null,
      workout_title: workoutTitle || null,
      tx_hash: txHash,
      wallet_address: address,
      created_at: new Date().toISOString(),
    };

    setTransactions(prev => {
      const next = [entry, ...prev];
      saveLocalTx(address, next);
      return next;
    });

    if (type !== 'creator_reward') {
      setOptimisticBalance(prev => Math.max(0, prev + amount));
    }

    // Refresh chain balance a few seconds later to confirm
    if (address) setTimeout(() => refreshChainBalance(address), 6_000);

    return txHash;
  }, [address, connected, refreshChainBalance]);

  // Prefer on-chain balance; fall back to optimistic while waiting
  const fitBalance = tokenBalance !== null ? tokenBalance : optimisticBalance;

  return (
    <WalletContext.Provider value={{
      connected,
      address,
      shortAddr: address ? shortAddress(address) : null,
      solBalance,
      fitBalance,
      tokenSymbol: TOKEN_SYMBOL,
      transactions,
      connecting,
      hasPhantom,
      connect,
      disconnect,
      recordTransaction,
      refreshBalance: () => { if (address) refreshChainBalance(address); },
      ATTEMPT_FEE,
      PASS_REWARD,
      CREATOR_CUT,
      PRO_TOKEN_THRESHOLD,
    }}>
      {children}
    </WalletContext.Provider>
  );
};

export const useWallet = () => {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error('useWallet must be used within WalletProvider');
  return ctx;
};
