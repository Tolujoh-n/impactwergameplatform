import { ethers } from 'ethers';
import WeRgame from "../abi/WeRgame.json";

// Base Sepolia Testnet configuration
export const BASE_TESTNET_PARAMS = {
  chainId: '0x14a34', // 84532 in hex
  chainName: "Base Sepolia Testnet",
  nativeCurrency: {
    name: "ETH",
    symbol: "ETH",
    decimals: 18,
  },
  rpcUrls: ["https://sepolia.base.org"],
  blockExplorerUrls: ["https://sepolia-explorer.base.org"],
};

// Contract ABI (will be generated from compilation)
export const WERGAME_ABI = WeRgame.abi;

// Contract address (will be set after deployment)
let CONTRACT_ADDRESS = process.env.REACT_APP_CONTRACT_ADDRESS || '0x19596fb8e21921A54a19A85E3FaD34Efcf10ad5D';

export const setContractAddress = (address) => {
  CONTRACT_ADDRESS = address;
};

export const getContractAddress = () => CONTRACT_ADDRESS;

/**
 * Check if wallet is connected
 */
export const isWalletConnected = async () => {
  if (typeof window.ethereum !== 'undefined') {
    const accounts = await window.ethereum.request({ method: 'eth_accounts' });
    return accounts.length > 0;
  }
  return false;
};

/**
 * Connect wallet and switch to Base Sepolia
 */
export const connectWallet = async () => {
  if (typeof window.ethereum === 'undefined') {
    throw new Error('MetaMask is not installed. Please install MetaMask to continue.');
  }

  try {
    // Request account access
    const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
    
    // Check current chain
    const chainId = await window.ethereum.request({ method: 'eth_chainId' });
    
    // Switch to Base Sepolia if not already on it
    if (chainId !== BASE_TESTNET_PARAMS.chainId) {
      try {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: BASE_TESTNET_PARAMS.chainId }],
        });
      } catch (switchError) {
        // If chain doesn't exist, add it
        if (switchError.code === 4902) {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [BASE_TESTNET_PARAMS],
          });
        } else {
          throw switchError;
        }
      }
    }
    
    return accounts[0];
  } catch (error) {
    console.error('Error connecting wallet:', error);
    throw error;
  }
};

/**
 * Get current account
 */
export const getCurrentAccount = async () => {
  if (typeof window.ethereum === 'undefined') {
    return null;
  }
  
  const accounts = await window.ethereum.request({ method: 'eth_accounts' });
  return accounts.length > 0 ? accounts[0] : null;
};

/**
 * Ensure wallet is connected before proceeding with transaction
 * This allows any wallet to be connected for transaction signing purposes
 * (doesn't restrict based on registered wallet address)
 */
export const ensureWalletConnected = async () => {
  if (typeof window.ethereum === 'undefined') {
    throw new Error('MetaMask is not installed. Please install MetaMask to continue.');
  }

  // Check if wallet is already connected
  const connected = await isWalletConnected();
  
  if (!connected) {
    // Auto-connect wallet if not connected
    await connectWallet();
  } else {
    // Ensure we're on the correct network
    const chainId = await window.ethereum.request({ method: 'eth_chainId' });
    if (chainId !== BASE_TESTNET_PARAMS.chainId) {
      try {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: BASE_TESTNET_PARAMS.chainId }],
        });
      } catch (switchError) {
        // If chain doesn't exist, add it
        if (switchError.code === 4902) {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [BASE_TESTNET_PARAMS],
          });
        } else {
          throw switchError;
        }
      }
    }
  }

  // Return the connected address
  return await getCurrentAccount();
};

/**
 * Get contract instance
 */
export const getContract = async () => {
  // Ensure wallet is connected first
  await ensureWalletConnected();
  
  if (typeof window.ethereum === 'undefined') {
    throw new Error('MetaMask is not installed');
  }
  
  if (!CONTRACT_ADDRESS) {
    throw new Error('Contract address not set');
  }
  
  const provider = new ethers.BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();
  return new ethers.Contract(CONTRACT_ADDRESS, WERGAME_ABI, signer);
};

/**
 * Get contract instance with read-only provider
 */
export const getContractReadOnly = () => {
  if (!CONTRACT_ADDRESS) {
    throw new Error('Contract address not set');
  }
  
  const provider = new ethers.JsonRpcProvider(BASE_TESTNET_PARAMS.rpcUrls[0]);
  return new ethers.Contract(CONTRACT_ADDRESS, WERGAME_ABI, provider);
};

/**
 * Convert ETH to Wei
 */
export const ethToWei = (eth) => {
  return ethers.parseEther(eth.toString());
};

/**
 * Convert Wei to ETH
 */
export const weiToEth = (wei) => {
  return ethers.formatEther(wei);
};

/**
 * Market Management Functions
 */

// Create market
export const createMarket = async (isPoll, options) => {
  const contract = await getContract();
  const tx = await contract.createMarket(isPoll, options);
  const receipt = await tx.wait();
  
  // Find MarketCreated event in receipt
  if (receipt && receipt.logs) {
    for (const log of receipt.logs) {
      try {
        const parsed = contract.interface.parseLog(log);
        if (parsed && parsed.name === 'MarketCreated') {
          return parsed.args.marketId.toString();
        }
      } catch (e) {
        // Continue to next log
        continue;
      }
    }
  }
  
  // If event not found in receipt, try to get from transaction
  throw new Error('Market creation event not found. Transaction hash: ' + receipt.hash);
};

// Update market status
export const updateMarketStatus = async (marketId, status) => {
  const contract = await getContract();
  const tx = await contract.updateMarketStatus(marketId, status);
  await tx.wait();
  return tx.hash;
};

// Add liquidity
export const addLiquidity = async (marketId, option, amountEth) => {
  const contract = await getContract();
  const amountWei = ethToWei(amountEth);
  const tx = await contract.addLiquidity(marketId, option, amountWei, { value: amountWei });
  await tx.wait();
  return tx.hash;
};

// Resolve market
export const resolveMarket = async (marketId, winningOption) => {
  const contract = await getContract();
  const tx = await contract.resolveMarket(marketId, winningOption);
  await tx.wait();
  return tx.hash;
};

/**
 * Fee Management Functions
 */

// Set fees
export const setFees = async (platformFee, boostJackpotFee, marketPlatformFee, freeJackpotFee) => {
  const contract = await getContract();
  // Convert percentages to basis points (multiply by 100)
  const platformFeeBP = Math.round(platformFee * 100);
  const boostJackpotFeeBP = Math.round(boostJackpotFee * 100);
  const marketPlatformFeeBP = Math.round(marketPlatformFee * 100);
  const freeJackpotFeeBP = Math.round(freeJackpotFee * 100);
  
  const tx = await contract.setFees(platformFeeBP, boostJackpotFeeBP, marketPlatformFeeBP, freeJackpotFeeBP);
  await tx.wait();
  return tx.hash;
};

// Get fees
export const getFees = async () => {
  const contract = getContractReadOnly();
  const fees = await contract.getFees();
  return {
    platformFee: parseFloat(fees[0].toString()) / 100, // Convert from basis points to percentage
    boostJackpotFee: parseFloat(fees[1].toString()) / 100,
    marketPlatformFee: parseFloat(fees[2].toString()) / 100,
    freeJackpotFee: parseFloat(fees[3].toString()) / 100,
  };
};

/**
 * Boost Prediction Functions
 */

// Stake boost
export const stakeBoost = async (marketId, outcome, amountEth) => {
  const contract = await getContract();
  const amountWei = ethToWei(amountEth);
  const tx = await contract.stakeBoost(marketId, outcome, { value: amountWei });
  await tx.wait();
  return tx.hash;
};

// Add boost stake
export const addBoostStake = async (marketId, outcome, amountEth) => {
  const contract = await getContract();
  const amountWei = ethToWei(amountEth);
  const tx = await contract.addBoostStake(marketId, outcome, { value: amountWei });
  await tx.wait();
  return tx.hash;
};

// Withdraw boost stake
export const withdrawBoostStake = async (marketId, outcome, amountEth) => {
  const contract = await getContract();
  const amountWei = ethToWei(amountEth);
  const tx = await contract.withdrawBoostStake(marketId, outcome, amountWei);
  await tx.wait();
  return tx.hash;
};

// Claim boost
export const claimBoost = async (marketId, outcome) => {
  const contract = await getContract();
  const tx = await contract.claimBoost(marketId, outcome);
  await tx.wait();
  return tx.hash;
};

// Get boost prediction
export const getBoostPrediction = async (marketId, userAddress, outcome) => {
  const contract = getContractReadOnly();
  const result = await contract.getBoostPrediction(marketId, userAddress, outcome);
  return {
    user: result[0],
    totalStake: weiToEth(result[1]),
    claimed: result[2],
  };
};

/**
 * Market Trading Functions
 */

// Buy market shares
export const buyMarketShares = async (marketId, outcome, amountEth) => {
  const contract = await getContract();
  const amountWei = ethToWei(amountEth);
  const tx = await contract.buyMarketShares(marketId, outcome, { value: amountWei });
  const receipt = await tx.wait();
  return receipt.hash;
};

// Sell market shares
export const sellMarketShares = async (marketId, outcome, shares) => {
  const contract = await getContract();
  // Shares are stored as wei in contract (1 share = 1e18 wei for precision)
  // Convert shares (as decimal ETH amount) to wei
  const sharesWei = ethToWei(shares.toString());
  const tx = await contract.sellMarketShares(marketId, outcome, sharesWei);
  const receipt = await tx.wait();
  return receipt.hash;
};

// Claim market
export const claimMarket = async (marketId, outcome) => {
  const contract = await getContract();
  const tx = await contract.claimMarket(marketId, outcome);
  await tx.wait();
  return tx.hash;
};

// Get price
export const getPrice = async (marketId, outcome) => {
  const contract = getContractReadOnly();
  const priceBP = await contract.getPrice(marketId, outcome);
  // Price is in basis points (10000 = 100%), convert to decimal
  return parseFloat(priceBP.toString()) / 10000;
};

// Get user position
export const getUserPosition = async (marketId, userAddress, outcome) => {
  const contract = getContractReadOnly();
  const result = await contract.getUserPosition(marketId, userAddress, outcome);
  return {
    shares: weiToEth(result[0]),
    totalInvested: weiToEth(result[1]),
  };
};

/**
 * Jackpot Functions
 */

// Fund jackpot pool
export const fundJackpotPool = async (amountEth) => {
  const contract = await getContract();
  const amountWei = ethToWei(amountEth);
  const tx = await contract.fundJackpotPool({ value: amountWei });
  await tx.wait();
  return tx.hash;
};

// Withdraw jackpot
export const withdrawJackpot = async (amountEth) => {
  const contract = await getContract();
  const amountWei = ethToWei(amountEth);
  const tx = await contract.withdrawJackpot(amountWei);
  await tx.wait();
  return tx.hash;
};

// Get jackpot balance
export const getJackpotBalance = async (userAddress) => {
  const contract = getContractReadOnly();
  const balance = await contract.getJackpotBalance(userAddress);
  return weiToEth(balance);
};

// Withdraw from jackpot pool (deployer only)
export const withdrawFromJackpotPool = async (toAddress, amountEth) => {
  const contract = await getContract();
  const amountWei = ethToWei(amountEth);
  const tx = await contract.withdrawFromJackpotPool(toAddress, amountWei);
  await tx.wait();
  return tx.hash;
};

/**
 * Admin Functions
 */

// Get contract balance
export const getContractBalance = async () => {
  const contract = getContractReadOnly();
  const balance = await contract.getContractBalance();
  return weiToEth(balance);
};

// Transfer funds
export const transferFunds = async (toAddress, amountEth) => {
  const contract = await getContract();
  const amountWei = ethToWei(amountEth);
  const tx = await contract.transferFunds(toAddress, amountWei);
  await tx.wait();
  return tx.hash;
};

// Set super admin
export const setSuperAdmin = async (superAdminAddress) => {
  const contract = await getContract();
  const tx = await contract.setSuperAdmin(superAdminAddress);
  await tx.wait();
  return tx.hash;
};

// Get claimable balance
export const getClaimableBalance = async (marketId, userAddress) => {
  const contract = getContractReadOnly();
  const balance = await contract.getClaimableBalance(marketId, userAddress);
  return weiToEth(balance);
};

/**
 * Listen for account changes
 */
export const onAccountsChanged = (callback) => {
  if (typeof window.ethereum !== 'undefined') {
    window.ethereum.on('accountsChanged', callback);
  }
};

/**
 * Listen for chain changes
 */
export const onChainChanged = (callback) => {
  if (typeof window.ethereum !== 'undefined') {
    window.ethereum.on('chainChanged', callback);
  }
};

/**
 * Remove event listeners
 */
export const removeListeners = () => {
  if (typeof window.ethereum !== 'undefined') {
    window.ethereum.removeAllListeners('accountsChanged');
    window.ethereum.removeAllListeners('chainChanged');
  }
};
