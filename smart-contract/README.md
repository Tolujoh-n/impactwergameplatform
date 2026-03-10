# Worklob Contract

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

### If you see SSL/TLS or PollingBlockTracker errors

The default RPC is set to `https://base-sepolia-rpc.publicnode.com` to avoid Windows SSL issues. To use another RPC, set in `.env`:

```
BASE_RPC_URL=https://sepolia.base.org
# or
BASE_SEPOLIA_RPC=https://base-sepolia.drpc.org
```

If migration fails **after** you see a transaction hash, the tx may still have been mined. Check it on [Base Sepolia Explorer](https://sepolia.basescan.org/) and update your app’s contract address if it’s a new deployment.

##

- Wergame wallet address : 0x3F45457e69e1eae0B044141E2AE0cf61cc77E6C0


