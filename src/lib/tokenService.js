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
  createTransferInstruction,
  getAssociatedTokenAddress,
  TOKEN_PROGRAM_ID,
} from '@solana/spl-token';
import { supabase } from '@/api/supabaseClient';
import { getPhantomProvider, TOKEN_MINT_ADDRESS, DEVNET_RPC } from './wallet';

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

  if (error) throw new Error(`Edge function error: ${error.message}`);
  if (!data?.success) throw new Error(data?.error ?? 'reward-tokens failed');

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
    getAssociatedTokenAddress(mintPubkey, userPubkey),
    getAssociatedTokenAddress(mintPubkey, treasuryPubkey),
  ]);

  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();

  const tx = new Transaction({
    recentBlockhash: blockhash,
    feePayer: userPubkey,
  }).add(
    createTransferInstruction(
      userTokenAcc,
      treasuryTokenAcc,
      userPubkey,
      amount, // assumes TOKEN_DECIMALS = 0; multiply by 10^decimals if needed
      [],
      TOKEN_PROGRAM_ID,
    ),
  );

  // Phantom signs and broadcasts the transaction
  const { signature } = await provider.signAndSendTransaction(tx);
  await connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight });

  return signature;
}
