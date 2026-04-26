/**
 * Rewards & Solana Integration Service
 * 
 * MOCK IMPLEMENTATION — In production, this would integrate with:
 * - @solana/web3.js for blockchain transactions
 * - Phantom Wallet or Solflare for user wallet connection
 * - SPL Token program for minting/transferring reward tokens
 * 
 * Integration points:
 * 1. connectWallet() — prompt user to connect Solana wallet
 * 2. mintRewardToken() — mint FIT tokens to user's wallet
 * 3. checkBalance() — query user's FIT token balance
 * 4. redeemRewards() — exchange tokens for perks/NFTs
 */

export function calculateReward(score, passed, difficulty) {
  if (!passed) return 0;

  const baseReward = {
    beginner: 10,
    intermediate: 20,
    advanced: 35
  };

  const base = baseReward[difficulty] || 10;
  const performanceBonus = score > 90 ? 25 : score > 80 ? 10 : 0;

  return base + performanceBonus;
}

export function formatTokenAmount(amount) {
  return `${amount} FIT`;
}

// Mock wallet state
export function getWalletStatus() {
  return {
    connected: true,
    address: '7xKX...m4Fp', // Truncated mock Solana address
    balance: 1250,
    tokenSymbol: 'FIT',
    // In production: connection = new Connection(clusterApiUrl('devnet'))
  };
}