require("dotenv").config();
const HDWalletProvider = require("@truffle/hdwallet-provider");

// Use an RPC that avoids Windows SSL issues; override in .env with BASE_RPC_URL or BASE_SEPOLIA_RPC
const BASE_RPC = process.env.BASE_SEPOLIA_RPC || process.env.BASE_RPC_URL || "https://base-sepolia-rpc.publicnode.com";

module.exports = {
  networks: {
    baseTestnet: {
      provider: () =>
        new HDWalletProvider(process.env.MNEMONIC, BASE_RPC),
      network_id: 84532,
      gas: 8000000,
      gasPrice: 1000000000,
      timeoutBlocks: 200,
      skipDryRun: true,
      networkCheckTimeout: 10000,
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