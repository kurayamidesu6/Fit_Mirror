/**
 * reward-tokens — Supabase Edge Function (Deno runtime)
 *
 * Sends your custom SPL token from the treasury wallet to a user's Phantom wallet.
 * Called by the frontend after a user earns tokens (passing a workout, etc.)
 *
 * Required Supabase secrets (set once via CLI):
 *   supabase secrets set TREASURY_PRIVATE_KEY='[1,2,3,...]'   # Uint8Array as JSON
 *   supabase secrets set TOKEN_MINT_ADDRESS='<mint pubkey>'
 *   supabase secrets set TOKEN_DECIMALS='0'
 *
 * Deploy: supabase functions deploy reward-tokens
 */

import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';
import {
  clusterApiUrl,
  Connection,
  Keypair,
  PublicKey,
} from 'npm:@solana/web3.js@1';
import {
  getOrCreateAssociatedTokenAccount,
  transferChecked,
  TOKEN_2022_PROGRAM_ID,
} from 'npm:@solana/spl-token@0.4';
import { corsHeaders } from '../_shared/cors.ts';

// Caps per request — prevents abuse
const MAX_REWARD_PER_CALL = 50;

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // ── 1. Verify Supabase auth ──────────────────────────────────────────────
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Missing Authorization header');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error('Unauthorized');

    // ── 2. Parse + validate request body ────────────────────────────────────
    const { walletAddress, amount, reason } = await req.json();

    if (!walletAddress || typeof walletAddress !== 'string') {
      throw new Error('walletAddress is required');
    }
    if (!amount || typeof amount !== 'number' || amount <= 0) {
      throw new Error('amount must be a positive number');
    }
    if (amount > MAX_REWARD_PER_CALL) {
      throw new Error(`amount exceeds max allowed per call (${MAX_REWARD_PER_CALL})`);
    }

    // ── 3. Load treasury keypair from secret ────────────────────────────────
    const secretKeyJson = Deno.env.get('TREASURY_PRIVATE_KEY');
    if (!secretKeyJson) throw new Error('TREASURY_PRIVATE_KEY secret not set');
    const treasury = Keypair.fromSecretKey(
      new Uint8Array(JSON.parse(secretKeyJson)),
    );

    const mintAddress = new PublicKey(Deno.env.get('TOKEN_MINT_ADDRESS')!);
    const decimals = parseInt(Deno.env.get('TOKEN_DECIMALS') ?? '9', 10);

    // ── 4. Connect to Solana devnet ──────────────────────────────────────────
    const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');

    // ── 5. Resolve token accounts (creates recipient's ATA if it doesn't exist)
    const recipientPubkey = new PublicKey(walletAddress);

    const [treasuryTokenAcc, recipientTokenAcc] = await Promise.all([
      getOrCreateAssociatedTokenAccount(connection, treasury, mintAddress, treasury.publicKey, false, 'confirmed', {}, TOKEN_2022_PROGRAM_ID),
      getOrCreateAssociatedTokenAccount(connection, treasury, mintAddress, recipientPubkey, false, 'confirmed', {}, TOKEN_2022_PROGRAM_ID),
    ]);

    // ── 6. Transfer tokens treasury → recipient ──────────────────────────────
    const rawAmount = BigInt(amount) * BigInt(10 ** decimals);
    const signature = await transferChecked(
      connection,
      treasury,                      // fee payer
      treasuryTokenAcc.address,      // from
      mintAddress,                   // mint (required for transferChecked)
      recipientTokenAcc.address,     // to
      treasury,                      // owner (full Keypair so it can sign)
      rawAmount,                     // amount in raw units
      decimals,                      // decimals
      [],
      {},
      TOKEN_2022_PROGRAM_ID,
    );

    console.log(`Rewarded ${amount} tokens to ${walletAddress} | tx: ${signature} | reason: ${reason}`);

    return new Response(
      JSON.stringify({ success: true, signature, amount }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('reward-tokens error:', message);
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
