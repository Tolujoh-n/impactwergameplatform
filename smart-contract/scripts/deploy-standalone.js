/**
 * Standalone deploy script using ethers.js (no Truffle block tracker).
 * Use this when "truffle migrate" fails with PollingBlockTracker / TLS errors.
 *
 * Run from smart-contract folder:
 *   npm install
 *   node scripts/deploy-standalone.js
 *
 * Or: npm run deploy
 */
require('dotenv').config();
const path = require('path');
const fs = require('fs');
const { ethers } = require('ethers');

// Use a Base Sepolia RPC (chainId 84532). base.llamarpc.com is Base Mainnet (8453).
const RPC = process.env.BASE_RPC_URL || process.env.BASE_RPC || 'https://base-sepolia-rpc.publicnode.com';
const MNEMONIC = process.env.MNEMONIC;

if (!MNEMONIC || !MNEMONIC.trim()) {
  console.error('Missing MNEMONIC in .env');
  process.exit(1);
}

async function main() {
  const artifactPath = path.join(__dirname, '..', 'build', 'contracts', 'WeRgame.json');
  if (!fs.existsSync(artifactPath)) {
    console.error('Run "truffle compile" first so build/contracts/WeRgame.json exists.');
    process.exit(1);
  }

  const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
  const abi = artifact.abi;
  const bytecode = artifact.bytecode;
  if (!bytecode || bytecode === '0x') {
    console.error('WeRgame.json has no bytecode. Run truffle compile.');
    process.exit(1);
  }

  console.log('Connecting to', RPC);
  const provider = new ethers.providers.JsonRpcProvider(RPC);
  const wallet = ethers.Wallet.fromMnemonic(MNEMONIC.trim()).connect(provider);
  const network = await provider.getNetwork();
  console.log('Network:', network.name, 'chainId:', network.chainId);

  if (Number(network.chainId) !== 84532) {
    console.warn('Warning: Base Sepolia chainId is 84532. Current chainId:', network.chainId);
  }

  const balance = await wallet.getBalance();
  console.log('Deployer:', wallet.address, 'Balance:', ethers.utils.formatEther(balance), 'ETH');

  console.log('Deploying WeRgame...');
  const factory = new ethers.ContractFactory(abi, bytecode, wallet);
  const contract = await factory.deploy({ gasLimit: 8000000 });
  console.log('Tx hash:', contract.deployTransaction.hash);

  await contract.deployed();
  console.log('\nDeployed WeRgame at:', contract.address);
  console.log('BaseScan:', `https://sepolia.basescan.org/address/${contract.address}`);

  // Write address to a file so you can copy to frontend .env
  const outPath = path.join(__dirname, '..', 'deployed-address.txt');
  fs.writeFileSync(outPath, contract.address + '\n', 'utf8');
  console.log('Address saved to', outPath);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
