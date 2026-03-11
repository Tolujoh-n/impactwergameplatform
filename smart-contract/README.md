# wergame Contract

## Install

- `cd smart-contract`

```
npm install --save @truffle/hdwallet-provider
npm install --save dotenv
npm install --save @openzeppelin/contracts
```

## Deploy

- `truffle migrate --network baseTestnet`

- Deploy a specific contract by selecting it's migration number: `truffle migrate --network baseTestnet --f 2 --to 2`

### If you see SSL/TLS or PollingBlockTracker errors – use standalone deploy

When `truffle migrate` keeps failing with "PollingBlockTracker" or "socket disconnected", deploy **without Truffle**:

1. Compile once: `truffle compile`
2. Install deps: `npm install`
3. Deploy: `node scripts/deploy-standalone.js` (or `npm run deploy`)

This uses ethers.js only (no Truffle block tracker). The script reads `MNEMONIC` and `BASE_RPC_URL` from `.env`, deploys WeRgame, and writes the contract address to `deployed-address.txt`.

Set `BASE_RPC_URL` in `.env` to a **Base Sepolia** RPC (chainId 84532), e.g. `https://base-sepolia-rpc.publicnode.com`. Do not use `base.llamarpc.com` for testnet (that is Base Mainnet).

If Truffle migration fails **after** you see a transaction hash, the tx may still have been mined. Check it on [Base Sepolia Explorer](https://sepolia.basescan.org/) and use the "Created" contract address.

##

- Wergame wallet address : 0x148cCBaf340adE10Cc0e57dD43Ab127D5Abfc728


