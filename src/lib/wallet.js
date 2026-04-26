// Phantom wallet + Solana devnet utilities — no npm packages required
// Uses Phantom's injected window.solana provider and raw Solana JSON-RPC

export const DEVNET_RPC = 'https://api.devnet.solana.com';

// ── YOUR CUSTOM TOKEN ────────────────────────────────────────────────────────
// Replace with your actual SPL token mint address on devnet after creating it.
// Create a token: `spl-token create-token --url devnet`
// Then mint supply: `spl-token mint <MINT_ADDRESS> 1000000 --url devnet`
export const TOKEN_MINT_ADDRESS = 'REPLACE_WITH_YOUR_MINT_ADDRESS';
export const TOKEN_SYMBOL = 'FIT';   // Display name for your coin
export const TOKEN_DECIMALS = 0;     // 0 = whole tokens only (no fractions)
// ────────────────────────────────────────────────────────────────────────────

/** @param {string} addr */
export function shortAddress(addr) {
  if (!addr || addr.length < 8) return addr ?? '';
  return `${addr.slice(0, 4)}...${addr.slice(-4)}`;
}

// Realistic Solana base58 tx signature (88 chars) — used for simulated txs
export function generateTxHash() {
  const chars = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  return Array.from({ length: 88 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

/** @param {string} hash */
export function solscanTxUrl(hash) {
  return `https://solscan.io/tx/${hash}?cluster=devnet`;
}

/** @param {string} mint */
export function solscanTokenUrl(mint) {
  return `https://solscan.io/token/${mint}?cluster=devnet`;
}

export function getPhantomProvider() {
  if (typeof window !== 'undefined' && /** @type {any} */ (window).solana?.isPhantom) {
    return /** @type {any} */ (window).solana;
  }
  return null;
}

export async function connectPhantom() {
  const provider = getPhantomProvider();
  if (!provider) throw new Error('Phantom wallet not installed. Visit phantom.app');
  const resp = await provider.connect();
  return resp.publicKey.toString();
}

export async function disconnectPhantom() {
  const provider = getPhantomProvider();
  if (provider?.isConnected) await provider.disconnect();
}

/** @param {string} publicKey */
export async function getSolBalance(publicKey) {
  try {
    const resp = await fetch(DEVNET_RPC, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0', id: 1,
        method: 'getBalance',
        params: [publicKey, { commitment: 'confirmed' }],
      }),
    });
    const json = await resp.json();
    return (json.result?.value ?? 0) / 1e9; // lamports → SOL
  } catch {
    return 0;
  }
}

/**
 * Reads the connected wallet's balance of YOUR custom SPL token from chain.
 * Returns the token amount (respecting decimals), or null on RPC error.
 * @param {string} walletAddress
 * @param {string} [mintAddress]
 */
export async function getTokenBalance(walletAddress, mintAddress = TOKEN_MINT_ADDRESS) {
  if (!walletAddress) return null;
  // If mint address hasn't been replaced yet, skip the RPC call
  if (mintAddress === 'REPLACE_WITH_YOUR_MINT_ADDRESS') return null;
  try {
    const resp = await fetch(DEVNET_RPC, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0', id: 1,
        method: 'getTokenAccountsByOwner',
        params: [
          walletAddress,
          { mint: mintAddress },
          { encoding: 'jsonParsed' },
        ],
      }),
    });
    const json = await resp.json();
    const accounts = json.result?.value ?? [];
    if (accounts.length === 0) return 0; // wallet exists, token account just empty
    return accounts[0].account.data.parsed.info.tokenAmount.uiAmount ?? 0;
  } catch {
    return null; // network error — caller falls back to optimistic balance
  }
}
