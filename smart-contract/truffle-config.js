require("dotenv").config();
const HDWalletProvider = require("@truffle/hdwallet-provider");

// Override in .env with BASE_RPC_URL to avoid TLS/connection issues (e.g. https://base-sepolia-rpc.publicnode.com)
const BASE_RPC = process.env.BASE_RPC_URL || "https://base-sepolia-rpc.publicnode.com";

module.exports = {
  networks: {
    baseTestnet: {
      provider: () =>
        new HDWalletProvider(process.env.MNEMONIC, BASE_RPC),
      network_id: 84532, // Base Sepolia chain ID (required for block tracker)
      gas: 8000000,
      gasPrice: 1000000000,
      timeoutBlocks: 200,
      skipDryRun: true,
    },
  },

  // Compiler settings
  compilers: {
    solc: {
      version: "0.8.20", // Specify the Solidity compiler version
      settings: {
        optimizer: {
          enabled: true,
          runs: 200, // Optimize for gas usage
        },
      },
    },
  },
};