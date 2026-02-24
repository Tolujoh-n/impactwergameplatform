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

- Deploy a specific contract by selecting it's migration number `truffle migrate --network baseTestnet --f 3 --to 3`

##

- LOB_TOKEN_ADDRESS: 0x4db5fFE1230AF924e9C13904D01c5143B9920111
- STAKING_ADDRESS: 0xb00a82d6a02E2F02E854D4BC2a8752DFCfe8a6b8
- WORKLOBJOB_ADDRESS:0xA6788bB9F14dc2663cdB6bE57685cc6eD25B69C7

- WORKLOOBDAO_ADDRESS : 0xED262B4cED8B35b22715Be242a322973eFb3041d

##

- Replace the Token contract address in the stacking and job_contract migration file if you redeploy the token contract. as the contract address will change

- And update your constants.js file in the frontend with the updated contract build and contract addresses
