// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title WeRgame Smart Contract
 * @notice Social market platform for sports predictions with Free, Boost, and Market layers
 */
contract WeRgame {
    address public deployer;
    address public superAdmin;
    
    // Fee structure (in basis points, 10000 = 100%)
    uint256 public platformFee; // For boost layer
    uint256 public boostJackpotFee; // Boost jackpot fee
    uint256 public marketPlatformFee; // For market layer
    uint256 public freeJackpotFee; // Free jackpot fee
    
    // Market structure
    struct Market {
        uint256 marketId;
        bool initialized;
        uint256 yesShares;
        uint256 noShares;
        uint256 initialYesLiquidity;
        uint256 initialNoLiquidity;
        bool settled;
        bool outcome; // true = YES won, false = NO won
    }
    
    // Boost prediction structure
    struct BoostPrediction {
        address user;
        uint256 matchId;
        bool outcome; // true = YES, false = NO
        uint256 amount;
        bool claimed;
    }
    
    // Market position structure
    struct MarketPosition {
        address user;
        uint256 marketId;
        bool side; // true = YES, false = NO
        uint256 shares;
    }
    
    mapping(uint256 => Market) public markets;
    mapping(uint256 => BoostPrediction[]) public boostPredictions;
    mapping(address => mapping(uint256 => MarketPosition)) public marketPositions;
    mapping(uint256 => mapping(address => uint256)) public claimableBalances;
    
    uint256 public marketCounter;
    
    event MarketCreated(uint256 indexed marketId, uint256 initialYesLiquidity, uint256 initialNoLiquidity);
    event LiquidityAdded(uint256 indexed marketId, uint256 yesAmount, uint256 noAmount);
    event SharesBought(uint256 indexed marketId, address indexed buyer, bool side, uint256 amount, uint256 shares);
    event SharesSold(uint256 indexed marketId, address indexed seller, bool side, uint256 shares, uint256 amount);
    event MarketSettled(uint256 indexed marketId, bool outcome);
    event FundsClaimed(uint256 indexed marketId, address indexed user, uint256 amount);
    event BoostPredictionMade(uint256 indexed matchId, address indexed user, bool outcome, uint256 amount);
    event FeesUpdated(uint256 platformFee, uint256 boostJackpotFee, uint256 marketPlatformFee, uint256 freeJackpotFee);
    event SuperAdminSet(address indexed newSuperAdmin);
    event FundsTransferred(address indexed to, uint256 amount);
    
    modifier onlyDeployer() {
        require(msg.sender == deployer || msg.sender == superAdmin, "Not authorized");
        _;
    }
    
    modifier onlySuperAdmin() {
        require(msg.sender == superAdmin, "Not superAdmin");
        _;
    }
    
    constructor() {
        deployer = msg.sender;
        superAdmin = msg.sender;
        
        // Default fees (in basis points: 1000 = 10%, 500 = 5%)
        platformFee = 1000; // 10%
        boostJackpotFee = 1000; // 10%
        marketPlatformFee = 500; // 5%
        freeJackpotFee = 500; // 5%
    }
    
    /**
     * @notice Set fee structure (only deployer/superAdmin)
     */
    function setFees(
        uint256 _platformFee,
        uint256 _boostJackpotFee,
        uint256 _marketPlatformFee,
        uint256 _freeJackpotFee
    ) external onlyDeployer {
        require(_platformFee <= 5000 && _boostJackpotFee <= 5000, "Fees too high");
        require(_marketPlatformFee <= 5000 && _freeJackpotFee <= 5000, "Fees too high");
        
        platformFee = _platformFee;
        boostJackpotFee = _boostJackpotFee;
        marketPlatformFee = _marketPlatformFee;
        freeJackpotFee = _freeJackpotFee;
        
        emit FeesUpdated(_platformFee, _boostJackpotFee, _marketPlatformFee, _freeJackpotFee);
    }
    
    /**
     * @notice Get current fee structure
     */
    function getFees() external view returns (
        uint256 _platformFee,
        uint256 _boostJackpotFee,
        uint256 _marketPlatformFee,
        uint256 _freeJackpotFee
    ) {
        return (platformFee, boostJackpotFee, marketPlatformFee, freeJackpotFee);
    }
    
    /**
     * @notice Set superAdmin address
     */
    function setSuperAdmin(address _superAdmin) external onlySuperAdmin {
        require(_superAdmin != address(0), "Invalid address");
        superAdmin = _superAdmin;
        emit SuperAdminSet(_superAdmin);
    }
    
    /**
     * @notice Get contract balance
     */
    function getContractBalance() external view returns (uint256) {
        return address(this).balance;
    }
    
    /**
     * @notice Transfer funds from contract (only deployer/superAdmin)
     */
    function transferFunds(address payable to, uint256 amount) external onlyDeployer {
        require(to != address(0), "Invalid address");
        require(amount <= address(this).balance, "Insufficient balance");
        to.transfer(amount);
        emit FundsTransferred(to, amount);
    }
    
    /**
     * @notice Create a new market with initial liquidity
     */
    function createMarket(uint256 _initialYesLiquidity, uint256 _initialNoLiquidity) 
        external 
        onlyDeployer 
        returns (uint256) 
    {
        require(_initialYesLiquidity > 0 && _initialNoLiquidity > 0, "Invalid liquidity");
        
        uint256 marketId = marketCounter++;
        markets[marketId] = Market({
            marketId: marketId,
            initialized: true,
            yesShares: _initialYesLiquidity,
            noShares: _initialNoLiquidity,
            initialYesLiquidity: _initialYesLiquidity,
            initialNoLiquidity: _initialNoLiquidity,
            settled: false,
            outcome: false
        });
        
        emit MarketCreated(marketId, _initialYesLiquidity, _initialNoLiquidity);
        return marketId;
    }
    
    /**
     * @notice Add liquidity to an existing market
     */
    function addLiquidity(uint256 marketId, uint256 yesAmount, uint256 noAmount) 
        external 
        payable 
        onlyDeployer 
    {
        Market storage market = markets[marketId];
        require(market.initialized && !market.settled, "Market not available");
        require(msg.value >= yesAmount + noAmount, "Insufficient funds");
        
        market.yesShares += yesAmount;
        market.noShares += noAmount;
        market.initialYesLiquidity += yesAmount;
        market.initialNoLiquidity += noAmount;
        
        emit LiquidityAdded(marketId, yesAmount, noAmount);
    }
    
    /**
     * @notice Buy shares in a market (Fixed-Sum AMM)
     * Price = shares / total shares
     */
    function buyShares(uint256 marketId, bool side) external payable {
        Market storage market = markets[marketId];
        require(market.initialized && !market.settled, "Market not available");
        require(msg.value > 0, "Must send ETH");
        
        uint256 totalShares = market.yesShares + market.noShares;
        require(totalShares > 0, "Market not initialized");
        
        // Calculate shares using fixed-sum AMM formula
        uint256 shares;
        if (side) { // Buying YES
            shares = (msg.value * market.yesShares) / (totalShares + msg.value);
            market.yesShares += shares;
        } else { // Buying NO
            shares = (msg.value * market.noShares) / (totalShares + msg.value);
            market.noShares += shares;
        }
        
        // Calculate platform fee (5% for market)
        uint256 fee = (msg.value * marketPlatformFee) / 10000;
        uint256 freeJackpotFeeAmount = (msg.value * freeJackpotFee) / 10000;
        
        // Update user position
        MarketPosition storage position = marketPositions[msg.sender][marketId];
        if (position.shares == 0) {
            position.user = msg.sender;
            position.marketId = marketId;
            position.side = side;
        }
        position.shares += shares;
        
        emit SharesBought(marketId, msg.sender, side, msg.value, shares);
    }
    
    /**
     * @notice Sell shares in a market
     */
    function sellShares(uint256 marketId, uint256 shares) external {
        Market storage market = markets[marketId];
        MarketPosition storage position = marketPositions[msg.sender][marketId];
        
        require(market.initialized && !market.settled, "Market not available");
        require(position.shares >= shares, "Insufficient shares");
        
        uint256 totalShares = market.yesShares + market.noShares;
        require(totalShares > 0, "Market not initialized");
        
        // Calculate payout using fixed-sum AMM formula
        uint256 payout;
        if (position.side) { // Selling YES
            market.yesShares -= shares;
            payout = (shares * totalShares) / (market.yesShares + market.noShares + shares);
        } else { // Selling NO
            market.noShares -= shares;
            payout = (shares * totalShares) / (market.yesShares + market.noShares + shares);
        }
        
        // Apply fees
        uint256 fee = (payout * marketPlatformFee) / 10000;
        uint256 freeJackpotFeeAmount = (payout * freeJackpotFee) / 10000;
        uint256 netPayout = payout - fee - freeJackpotFeeAmount;
        
        position.shares -= shares;
        
        payable(msg.sender).transfer(netPayout);
        emit SharesSold(marketId, msg.sender, position.side, shares, netPayout);
    }
    
    /**
     * @notice Make a boost prediction (stake ETH)
     */
    function makeBoostPrediction(uint256 matchId, bool outcome) external payable {
        require(msg.value > 0, "Must send ETH");
        
        boostPredictions[matchId].push(BoostPrediction({
            user: msg.sender,
            matchId: matchId,
            outcome: outcome,
            amount: msg.value,
            claimed: false
        }));
        
        emit BoostPredictionMade(matchId, msg.sender, outcome, msg.value);
    }
    
    /**
     * @notice Settle a market (set outcome)
     */
    function settleMarket(uint256 marketId, bool outcome) external onlyDeployer {
        Market storage market = markets[marketId];
        require(market.initialized && !market.settled, "Market already settled");
        
        market.settled = true;
        market.outcome = outcome;
        
        emit MarketSettled(marketId, outcome);
    }
    
    /**
     * @notice Settle boost predictions for a match
     */
    function settleBoostPredictions(uint256 matchId, bool winningOutcome) external onlyDeployer {
        BoostPrediction[] storage predictions = boostPredictions[matchId];
        require(predictions.length > 0, "No predictions");
        
        // Calculate total pool and winners' total
        uint256 totalPool = 0;
        uint256 winnersTotal = 0;
        
        for (uint256 i = 0; i < predictions.length; i++) {
            totalPool += predictions[i].amount;
            if (predictions[i].outcome == winningOutcome && !predictions[i].claimed) {
                winnersTotal += predictions[i].amount;
            }
        }
        
        // Calculate fees
        uint256 platformFeeAmount = (totalPool * platformFee) / 10000;
        uint256 boostJackpotFeeAmount = (totalPool * boostJackpotFee) / 10000;
        uint256 distributablePool = totalPool - platformFeeAmount - boostJackpotFeeAmount;
        
        // Distribute to winners proportionally
        for (uint256 i = 0; i < predictions.length; i++) {
            if (predictions[i].outcome == winningOutcome && !predictions[i].claimed) {
                uint256 share = (predictions[i].amount * distributablePool) / winnersTotal;
                claimableBalances[matchId][predictions[i].user] += share;
            }
        }
    }
    
    /**
     * @notice Claim winnings from boost prediction or market
     */
    function claim(uint256 matchId) external {
        uint256 amount = claimableBalances[matchId][msg.sender];
        require(amount > 0, "Nothing to claim");
        
        claimableBalances[matchId][msg.sender] = 0;
        payable(msg.sender).transfer(amount);
        
        emit FundsClaimed(matchId, msg.sender, amount);
    }
    
    /**
     * @notice Get current price for a market side (in basis points)
     */
    function getPrice(uint256 marketId, bool side) external view returns (uint256) {
        Market storage market = markets[marketId];
        if (!market.initialized) return 0;
        
        uint256 totalShares = market.yesShares + market.noShares;
        if (totalShares == 0) return 5000; // 50% if no shares
        
        if (side) {
            return (market.yesShares * 10000) / totalShares;
        } else {
            return (market.noShares * 10000) / totalShares;
        }
    }
    
    /**
     * @notice Get user's market position
     */
    function getUserPosition(uint256 marketId, address user) 
        external 
        view 
        returns (bool side, uint256 shares) 
    {
        MarketPosition storage position = marketPositions[user][marketId];
        return (position.side, position.shares);
    }
    
    /**
     * @notice Get user's claimable balance
     */
    function getClaimableBalance(uint256 matchId, address user) external view returns (uint256) {
        return claimableBalances[matchId][user];
    }
    
    /**
     * @notice Receive ETH
     */
    receive() external payable {}
    
    /**
     * @notice Fallback function
     */
    fallback() external payable {}
}
