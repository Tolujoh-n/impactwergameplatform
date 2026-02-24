# Blockchain Integration Guide

## Overview
This platform now integrates with Base Sepolia Testnet for all blockchain operations. All transactions happen on-chain first, then backend processes the results.

## Setup Instructions

### 1. Install Dependencies

```bash
cd frontend
npm install ethers@^6.0.0
```

### 2. Deploy Smart Contract

1. Navigate to `smart-contract` directory
2. Install dependencies:
   ```bash
   npm install
   ```
3. Configure `truffle-config.js` for Base Sepolia Testnet
4. Deploy contract:
   ```bash
   truffle migrate --network baseSepolia
   ```
5. Copy the deployed contract address
6. Set environment variable:
   ```bash
   # In frontend/.env
   REACT_APP_CONTRACT_ADDRESS=0x...your_contract_address
   ```

### 3. Smart Contract Features

#### Market Management
- `createMarket(bool isPoll, string[] options)` - Create new market
- `updateMarketStatus(uint256 marketId, uint8 status)` - Update market status
- `addLiquidity(uint256 marketId, string option, uint256 amount)` - Add initial liquidity
- `resolveMarket(uint256 marketId, string winningOption)` - Resolve market

#### Fee Management
- `setFees(...)` - Set all fee percentages (only deployer/superAdmin)
- `getFees()` - Get current fees

#### Boost Predictions
- `stakeBoost(uint256 marketId, string outcome)` - Stake ETH for boost prediction
- `addBoostStake(uint256 marketId, string outcome)` - Add more stake
- `withdrawBoostStake(uint256 marketId, string outcome, uint256 amount)` - Withdraw stake
- `claimBoost(uint256 marketId, string outcome)` - Claim winnings

#### Market Trading
- `buyMarketShares(uint256 marketId, string outcome)` - Buy shares
- `sellMarketShares(uint256 marketId, string outcome, uint256 shares)` - Sell shares
- `claimMarket(uint256 marketId, string outcome)` - Claim market winnings

#### Jackpot Pool
- `fundJackpotPool()` - Fund the pool (deployer only)
- `withdrawJackpot(uint256 amount)` - User withdraw from pool
- `withdrawFromJackpotPool(address to, uint256 amount)` - Deployer withdraw from pool

## Integration Flow

### Market Creation (Admin)
1. Admin creates match/poll in backend
2. Admin calls `createMarket()` on blockchain
3. Admin adds initial liquidity via `addLiquidity()`
4. Backend stores marketId

### Boost Predictions
1. User connects wallet
2. User calls `stakeBoost()` on blockchain (ETH sent to contract)
3. Backend processes the transaction result
4. Backend updates user's prediction record

### Market Trading
1. User connects wallet
2. User calls `buyMarketShares()` or `sellMarketShares()` on blockchain
3. Backend processes transaction and updates liquidity/shares
4. Frontend updates prices in real-time

### Jackpot Withdrawals
1. User connects wallet
2. User calls `withdrawJackpot(amount)` on blockchain
3. Contract transfers ETH to user
4. Backend updates user's jackpot balance

## Wallet Connection

The platform automatically:
- Prompts users to connect MetaMask
- Switches to Base Sepolia Testnet on connection
- Maintains connection state across page reloads

## Important Notes

1. **All blockchain transactions must succeed before backend processing**
2. **Contract address must be set in environment variables**
3. **Deployer address has special permissions (market creation, fee setting, etc.)**
4. **Users must have ETH on Base Sepolia Testnet for transactions**

## Testing

1. Get Base Sepolia ETH from faucet: https://www.coinbase.com/faucets/base-ethereum-goerli-faucet
2. Connect MetaMask wallet
3. Test market creation, trading, and predictions
4. Verify transactions on Base Sepolia Explorer

## Troubleshooting

- **"MetaMask not installed"**: Install MetaMask browser extension
- **"Wrong network"**: Platform will prompt to switch to Base Sepolia
- **"Insufficient funds"**: Get test ETH from faucet
- **"Contract address not set"**: Set REACT_APP_CONTRACT_ADDRESS in .env
