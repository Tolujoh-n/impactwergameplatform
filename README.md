# WeRgame - Social Market Platform for Sports

A fully functional, professional, and responsive social market platform for sports predictions. Users can predict match outcomes, buy shares of teams, build streaks, compete for jackpots, and share their performance socially.

## 🏗️ Architecture

- **Frontend**: React (Create React App) + Tailwind CSS
- **Backend**: Node.js + Express + MongoDB
- **Smart Contracts**: Solidity (Ethereum)
- **Wallet Integration**: @web3-onboard

## 🎮 Three-Layer Economic System

### 1. FREE Layer
- **Type**: Prediction Game
- **Currency**: Tickets and Points
- **Mechanics**: 
  - One free ticket daily
  - Free users can predict on only one game daily
  - Earn points for correct predictions
  - Build streaks
  - Compete in Free Jackpot

### 2. BOOST Layer
- **Type**: Prize Pool Contests
- **Currency**: ETH
- **Fee Structure**:
  - 10% Platform Fee
  - 10% Boost Jackpot Fee Pool
  - Rest paid to correct predictors proportionally
- **Mechanics**:
  - Game locked at kickoff
  - No prices, no trading, no exit before result
  - Losers directly pay winners
  - Compete in Boost Jackpot

### 3. MARKET Layer
- **Type**: Trading System (Fixed-Sum AMM)
- **Currency**: ETH
- **Fee Structure**:
  - 5% Platform Fees
  - 5% Free Jackpot Fee Pool
- **Mechanics**:
  - Admin sets initial liquidity for YES and NO
  - Users can enter and exit anytime
  - Prices move before and after the game
  - Based on buying/selling YES/NO shares
  - Market traders get one free ticket for that day

## 📋 Project Structure

```
wergame/
├── frontend/           # React frontend application
│   ├── src/
│   │   ├── components/ # Reusable components
│   │   ├── pages/      # Page components
│   │   ├── context/    # React context providers
│   │   └── utils/      # Utility functions
│   └── package.json
├── backend/            # Node.js backend server
│   ├── models/         # MongoDB models
│   ├── routes/         # API routes
│   ├── middleware/     # Auth middleware
│   ├── scripts/        # Data seeding scripts
│   └── server.js       # Express server
└── contracts/          # Solidity smart contracts
    └── WeRgame.sol     # Main contract
```

## 🚀 Getting Started

### Prerequisites

- Node.js (v14 or higher)
- MongoDB (local or cloud instance)
- npm or yarn

### Frontend Setup

1. Navigate to frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env` file (copy from `.env.example`):
```env
REACT_APP_API_URL=http://localhost:5000/api
```

4. Start development server:
```bash
npm start
```

The frontend will be available at `http://localhost:3000`

### Backend Setup

1. Navigate to backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env` file:
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/wergame
JWT_SECRET=your-secret-key-change-this-in-production
```

4. Seed dummy data:
```bash
npm run seed
```

5. Start the server:
```bash
npm start
# Or for development with auto-reload:
npm run dev
```

The backend API will be available at `http://localhost:5000`

### Smart Contract Setup

The Solidity smart contract is located in `contracts/WeRgame.sol`. 

**Note**: The smart contract is written but not yet integrated with the frontend/backend. Integration will be done in a later phase.

To compile and deploy:
1. Use Hardhat, Truffle, or Remix IDE
2. Deploy to your preferred network (testnet/mainnet)
3. Update frontend/backend with contract address and ABI

## 📚 API Documentation

### Authentication Endpoints

#### POST `/api/auth/signup`
Create a new user account with email/password.
- **Body**: `{ email, password, username }`
- **Response**: `{ token, user }`

#### POST `/api/auth/login`
Login with email/password.
- **Body**: `{ email, password }`
- **Response**: `{ token, user }`

#### POST `/api/auth/wallet-login`
Login with wallet address.
- **Body**: `{ address }`
- **Response**: `{ token, user }`

#### POST `/api/auth/wallet-signup`
Create account with wallet address.
- **Body**: `{ address }`
- **Response**: `{ token, user }`

#### GET `/api/auth/me`
Get current authenticated user.
- **Headers**: `Authorization: Bearer <token>`
- **Response**: `{ user }`

### User Endpoints

#### GET `/api/users/profile`
Get user profile.
- **Headers**: `Authorization: Bearer <token>`
- **Response**: `{ user }`

#### GET `/api/users/leaderboard`
Get leaderboard.
- **Response**: `{ users[] }`

### Cup Endpoints

#### GET `/api/cups`
Get all cups/tournaments.
- **Response**: `Cup[]`

#### GET `/api/cups/slug/:slug`
Get cup by slug.
- **Response**: `Cup`

#### GET `/api/cups/:cupSlug/stages`
Get stages for a cup.
- **Response**: `Stage[]`

### Match Endpoints

#### GET `/api/matches`
Get all matches.
- **Response**: `Match[]`

#### GET `/api/matches/:id`
Get match by ID.
- **Response**: `Match`

#### GET `/api/matches/cup/:cupSlug`
Get matches by cup.
- **Response**: `Match[]`

#### POST `/api/matches` (Admin)
Create a new match.
- **Headers**: `Authorization: Bearer <token>`
- **Body**: `{ teamA, teamB, date, cup, stage }`
- **Response**: `Match`

#### PUT `/api/matches/:id` (Admin)
Update a match.
- **Headers**: `Authorization: Bearer <token>`
- **Body**: `{ ...matchUpdates }`
- **Response**: `Match`

#### POST `/api/matches/:id/result` (Admin)
Set match result.
- **Headers**: `Authorization: Bearer <token>`
- **Body**: `{ result }`
- **Response**: `Match`

### Poll Endpoints

#### GET `/api/polls`
Get all polls.
- **Query**: `?type=<match|team|stage|award>`
- **Response**: `Poll[]`

#### GET `/api/polls/:id`
Get poll by ID.
- **Response**: `Poll`

#### GET `/api/polls/cup/:cupSlug`
Get polls by cup.
- **Query**: `?type=<match|team|stage|award>`
- **Response**: `Poll[]`

#### POST `/api/polls` (Admin)
Create a poll.
- **Headers**: `Authorization: Bearer <token>`
- **Body**: `{ question, description, type, cup, stage }`
- **Response**: `Poll`

#### PUT `/api/polls/:id` (Admin)
Update a poll.
- **Headers**: `Authorization: Bearer <token>`
- **Body**: `{ ...pollUpdates }`
- **Response**: `Poll`

### Prediction Endpoints

#### POST `/api/predictions/free`
Create a free prediction.
- **Headers**: `Authorization: Bearer <token>`
- **Body**: `{ matchId, outcome }`
- **Response**: `Prediction`

#### POST `/api/predictions/boost`
Create a boost prediction (stake ETH).
- **Headers**: `Authorization: Bearer <token>`
- **Body**: `{ matchId, outcome, amount }`
- **Response**: `Prediction`

#### GET `/api/predictions/match/:matchId/user`
Get user's prediction for a match.
- **Headers**: `Authorization: Bearer <token>`
- **Response**: `Prediction`

### Admin Endpoints

All admin endpoints require authentication and admin role.

#### GET `/api/admin/stats`
Get admin dashboard statistics.
- **Headers**: `Authorization: Bearer <token>`
- **Response**: `{ ...stats }`

### SuperAdmin Endpoints

All superAdmin endpoints require authentication and superAdmin role.

#### POST `/api/superadmin/set-fees`
Set fee structure.
- **Headers**: `Authorization: Bearer <token>`
- **Body**: `{ platformFee, boostJackpotFee, marketPlatformFee, freeJackpotFee }`
- **Response**: `{ message, fees }`

#### GET `/api/superadmin/get-fees`
Get current fee structure.
- **Headers**: `Authorization: Bearer <token>`
- **Response**: `{ platformFee, boostJackpotFee, marketPlatformFee, freeJackpotFee }`

#### GET `/api/superadmin/contract-balance`
Get smart contract balance.
- **Headers**: `Authorization: Bearer <token>`
- **Response**: `{ balance }`

#### POST `/api/superadmin/transfer`
Transfer funds from contract.
- **Headers**: `Authorization: Bearer <token>`
- **Body**: `{ to, amount }`
- **Response**: `{ message, to, amount }`

#### POST `/api/superadmin/set-superadmin`
Set superAdmin address.
- **Headers**: `Authorization: Bearer <token>`
- **Body**: `{ address }`
- **Response**: `{ message, address }`

## smart Contract Functions

### Main Functions

#### `createMarket(uint256 _initialYesLiquidity, uint256 _initialNoLiquidity)`
Creates a new market with initial liquidity.
- **Access**: Only deployer/superAdmin
- **Returns**: Market ID
- **Emits**: `MarketCreated`

#### `addLiquidity(uint256 marketId, uint256 yesAmount, uint256 noAmount)`
Adds liquidity to an existing market.
- **Access**: Only deployer/superAdmin
- **Payable**: Yes
- **Emits**: `LiquidityAdded`

#### `buyShares(uint256 marketId, bool side)`
Buy YES or NO shares in a market.
- **Access**: Public
- **Payable**: Yes
- **Parameters**: `side` (true = YES, false = NO)
- **Emits**: `SharesBought`

#### `sellShares(uint256 marketId, uint256 shares)`
Sell market shares.
- **Access**: Public
- **Emits**: `SharesSold`

#### `makeBoostPrediction(uint256 matchId, bool outcome)`
Make a boost prediction (stake ETH).
- **Access**: Public
- **Payable**: Yes
- **Parameters**: `outcome` (true = YES, false = NO)
- **Emits**: `BoostPredictionMade`

#### `settleMarket(uint256 marketId, bool outcome)`
Settle a market with outcome.
- **Access**: Only deployer/superAdmin
- **Parameters**: `outcome` (true = YES won, false = NO won)
- **Emits**: `MarketSettled`

#### `settleBoostPredictions(uint256 matchId, bool winningOutcome)`
Settle boost predictions and calculate winnings.
- **Access**: Only deployer/superAdmin
- **Emits**: Updates claimable balances

#### `claim(uint256 matchId)`
Claim winnings from boost or market.
- **Access**: Public
- **Emits**: `FundsClaimed`

### Admin Functions

#### `setFees(uint256 _platformFee, uint256 _boostJackpotFee, uint256 _marketPlatformFee, uint256 _freeJackpotFee)`
Set fee structure (in basis points).
- **Access**: Only deployer/superAdmin
- **Emits**: `FeesUpdated`

#### `getFees()`
Get current fee structure.
- **Access**: Public view
- **Returns**: All four fee values

#### `setSuperAdmin(address _superAdmin)`
Set superAdmin address.
- **Access**: Only superAdmin
- **Emits**: `SuperAdminSet`

#### `getContractBalance()`
Get contract ETH balance.
- **Access**: Public view
- **Returns**: Balance in wei

#### `transferFunds(address payable to, uint256 amount)`
Transfer funds from contract.
- **Access**: Only deployer/superAdmin
- **Emits**: `FundsTransferred`

### View Functions

#### `getPrice(uint256 marketId, bool side)`
Get current price for a market side (in basis points).
- **Access**: Public view
- **Returns**: Price in basis points (10000 = 100%)

#### `getUserPosition(uint256 marketId, address user)`
Get user's market position.
- **Access**: Public view
- **Returns**: `(bool side, uint256 shares)`

#### `getClaimableBalance(uint256 matchId, address user)`
Get user's claimable balance.
- **Access**: Public view
- **Returns**: Balance in wei

## 🎯 Workflow

### User Journey

1. **Registration/Login**
   - User signs up with email/password OR connects wallet
   - Account is created with initial points and tickets

2. **Browse Tournaments**
   - User navigates to a cup/tournament (e.g., World Cup)
   - Sees tournament timeline with stages
   - Views available matches and polls

3. **Make Predictions**
   - **FREE**: Uses daily free ticket to predict (one per day)
   - **BOOST**: Stakes ETH to enter prize pool contest
   - **MARKET**: Buys/sells YES/NO shares anytime

4. **Track Performance**
   - View streaks and points
   - Check leaderboard position
   - Monitor jackpot eligibility

5. **Claim Winnings**
   - After match results, winners can claim earnings
   - Boost predictions: Proportional payout from pool
   - Market positions: Sell shares or claim if market settled

### Admin Workflow

1. **Create Tournament Structure**
   - Create cup/tournament
   - Add stages (Group Stage, Quarter Finals, etc.)
   - Create matches and polls

2. **Manage Matches**
   - Set match status (upcoming, live, completed)
   - Lock matches at kickoff (for Boost)
   - Set results after match completion

3. **Settle Markets**
   - Set market outcome (YES/NO)
   - Settle boost predictions
   - Process payouts

### SuperAdmin Workflow

1. **Configure Fees**
   - Set platform fees
   - Set jackpot fees
   - Update fee structure dynamically

2. **Manage Contract**
   - Monitor contract balance
   - Transfer funds if needed
   - Set superAdmin addresses

3. **Market Management**
   - Create markets with initial liquidity
   - Add liquidity to existing markets
   - Manage market lifecycle

## 🎨 Features

### Frontend Features
- ✅ Responsive design with Tailwind CSS
- ✅ Dark/Light mode toggle
- ✅ Wallet connection via @web3-onboard
- ✅ Email/Password authentication
- ✅ Tournament browsing with filters
- ✅ Match prediction interfaces (Free/Boost/Market)
- ✅ Admin dashboard
- ✅ SuperAdmin dashboard
- ✅ Social sharing capabilities

### Backend Features
- ✅ RESTful API with Express
- ✅ MongoDB database with Mongoose
- ✅ JWT authentication
- ✅ Role-based access control (user/admin/superAdmin)
- ✅ Comprehensive API endpoints
- ✅ Data seeding script

### Smart Contract Features
- ✅ Three-layer economic system
- ✅ Fixed-Sum AMM for markets
- ✅ Dynamic fee configuration
- ✅ Secure admin functions
- ✅ Claimable balance system
- ✅ Boost prediction pooling

## 🔐 Security Considerations

- Smart contract uses access control modifiers
- Fee limits prevent excessive fees
- Safe math operations (Solidity 0.8+)
- Input validation on all functions
- JWT tokens for API authentication
- Password hashing with bcrypt

## 📝 Test Accounts (After Seeding)

- **Admin**: admin@wergame.com / admin123
- **SuperAdmin**: superadmin@wergame.com / superadmin123
- **User**: test@wergame.com / test123

## 🚧 Future Enhancements

- Smart contract integration with frontend/backend
- Real-time updates via WebSockets
- Enhanced social sharing features
- Mobile app
- Advanced analytics and statistics
- More tournament types
- Multi-chain support

## 📄 License

ISC

## 👥 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
