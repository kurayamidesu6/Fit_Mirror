/**
 * tokenService — bridges on-chain token actions with the frontend.
 *
 * claimReward()  → calls the Supabase Edge Function, which uses the treasury
 *                  keypair to send tokens from treasury → user wallet (no Phantom popup)
 *
 * spendTokens()  → builds a Solana transaction locally and asks Phantom to sign
 *                  it (user sends tokens from their wallet → treasury)
 */

import {
  Connection,
  PublicKey,
  Transaction,
} from '@solana/web3.js';
import {
  createTransferCheckedInstruction,
  createAssociatedTokenAccountIdempotentInstruction,
  getAssociatedTokenAddress,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
} from '@solana/spl-token';
import { supabase } from '@/api/supabaseClient';
import { getPhantomProvider, TOKEN_MINT_ADDRESS, TOKEN_DECIMALS, DEVNET_RPC } from './wallet';

// Treasury public key — the wallet that holds your token supply.
// Set VITE_TREASURY_WALLET_ADDRESS in your .env file.
const TREASURY_ADDRESS = import.meta.env.VITE_TREASURY_WALLET_ADDRESS;

// ── Earn tokens (backend signs) ──────────────────────────────────────────────

/**
 * Calls the `reward-tokens` Supabase Edge Function, which transfers tokens
 * from the treasury → the user's Phantom wallet on-chain.
 * No Phantom popup — fully transparent to the user.
 *
 * @param {{ walletAddress: string, amount: number, description: string }} opts
 * @returns {Promise<string>} Solana transaction signature
 */
export async function claimReward({ walletAddress, amount, description }) {
  const { data, error } = await supabase.functions.invoke('reward-tokens', {
    body: { walletAddress, amount, reason: description },
  });

  if (error) {
    // supabase-js wraps non-2xx responses as FunctionsHttpError.
    // The actual JSON body (with our `error` field) lives in error.context.
    let detail = error.message;
    try {
      const body = await error.context?.json?.();
      if (body?.error) detail = body.error;
    } catch { /* context not parseable — keep original message */ }
    throw new Error(`reward-tokens: ${detail}`);
  }
  if (!data?.success) throw new Error(data?.error ?? 'reward-tokens returned failure');

  return data.signature;
}

// ── Spend tokens (Phantom signs) ─────────────────────────────────────────────

/**
 * Builds a token transfer transaction (user → treasury) and asks Phantom to
 * sign and send it. Returns the confirmed transaction signature.
 *
 * @param {{ walletAddress: string, amount: number }} opts
 * @returns {Promise<string>} Solana transaction signature
 */
export async function spendTokens({ walletAddress, amount }) {
  const provider = getPhantomProvider();
  if (!provider?.publicKey) throw new Error('Phantom wallet not connected');
  if (!TREASURY_ADDRESS) throw new Error('VITE_TREASURY_WALLET_ADDRESS is not set in .env');
  if (TOKEN_MINT_ADDRESS === 'REPLACE_WITH_YOUR_MINT_ADDRESS') {
    throw new Error('TOKEN_MINT_ADDRESS not configured in src/lib/wallet.js');
  }

  const connection = new Connection(DEVNET_RPC, 'confirmed');
  const mintPubkey = new PublicKey(TOKEN_MINT_ADDRESS);
  const userPubkey = new PublicKey(walletAddress);
  const treasuryPubkey = new PublicKey(TREASURY_ADDRESS);

  const [userTokenAcc, treasuryTokenAcc] = await Promise.all([
    getAssociatedTokenAddress(mintPubkey, userPubkey, false, TOKEN_2022_PROGRAM_ID),
    getAssociatedTokenAddress(mintPubkey, treasuryPubkey, false, TOKEN_2022_PROGRAM_ID),
  ]);

  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
  const rawAmount = BigInt(amount) * BigInt(10 ** TOKEN_DECIMALS);

  const tx = new Transaction({
    recentBlockhash: blockhash,
    feePayer: userPubkey,
  }).add(
    createTransferCheckedInstruction(
      userTokenAcc,
      mintPubkey,
      treasuryTokenAcc,
      userPubkey,
      rawAmount,
      TOKEN_DECIMALS,
      [],
      TOKEN_2022_PROGRAM_ID,
    ),
  );

  // Phantom signs and broadcasts the transaction
  const { signature } = await provider.signAndSendTransaction(tx);
  await connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight });

  return signature;
}

// ── Tip a creator (Phantom signs) ────────────────────────────────────────────

/**
 * Transfers FIT tokens directly from the tipping user's wallet to the
 * creator's wallet. Phantom approval popup appears for the sender.
 * Automatically creates the creator's Associated Token Account if it
 * doesn't exist yet (idempotent instruction — safe to always include).
 *
 * @param {{ fromWallet: string, toWallet: string, amount: number }} opts
 * @returns {Promise<string>} confirmed Solana transaction signature
 */
export async function tipCreator({ fromWallet, toWallet, amount }) {
  const provider = getPhantomProvider();
  if (!provider?.publicKey) throw new Error('Phantom wallet not connected');
  if (!toWallet) throw new Error('Creator has not linked a wallet address yet');

  const connection = new Connection(DEVNET_RPC, 'confirmed');
  const mintPubkey   = new PublicKey(TOKEN_MINT_ADDRESS);
  const fromPubkey   = new PublicKey(fromWallet);
  const toPubkey     = new PublicKey(toWallet);

  const [fromATA, toATA] = await Promise.all([
    getAssociatedTokenAddress(mintPubkey, fromPubkey, false, TOKEN_2022_PROGRAM_ID),
    getAssociatedTokenAddress(mintPubkey, toPubkey,   false, TOKEN_2022_PROGRAM_ID),
  ]);

  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
  const rawAmount = BigInt(amount) * BigInt(10 ** TOKEN_DECIMALS);

  const tx = new Transaction({ recentBlockhash: blockhash, feePayer: fromPubkey });

  // Ensure the creator's ATA exists — no-ops if it already does
  tx.add(
    createAssociatedTokenAccountIdempotentInstruction(
      fromPubkey,             // fee payer (tipper pays for ATA creation if needed)
      toATA,                  // the ATA address to create
      toPubkey,               // ATA owner (creator)
      mintPubkey,             // token mint
      TOKEN_2022_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID,
    ),
  );

  // Transfer FIT from tipper → creator
  tx.add(
    createTransferCheckedInstruction(
      fromATA,
      mintPubkey,
      toATA,
      fromPubkey,
      rawAmount,
      TOKEN_DECIMALS,
      [],
      TOKEN_2022_PROGRAM_ID,
    ),
  );

  const { signature } = await provider.signAndSendTransaction(tx);
  await connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight });

  return signature;
}
