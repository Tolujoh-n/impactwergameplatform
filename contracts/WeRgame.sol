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
    
    // Market type enum
    enum MarketType { Poll, Match }
    
    // Market structure for Polls (YES/NO)
    struct PollMarket {
        uint256 marketId;
        bool initialized;
        uint256 yesShares;
        uint256 noShares;
        uint256 initialYesLiquidity;
        uint256 initialNoLiquidity;
        bool settled;
        bool outcome; // true = YES won, false = NO won
    }
    
    // Market structure for Matches (TeamA/TeamB/Draw)
    struct MatchMarket {
        uint256 marketId;
        bool initialized;
        uint256 teamAShares;
        uint256 teamBShares;
        uint256 drawShares;
        uint256 initialTeamALiquidity;
        uint256 initialTeamBLiquidity;
        uint256 initialDrawLiquidity;
        bool settled;
        uint8 outcome; // 0 = TeamA, 1 = TeamB, 2 = Draw
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
    
    mapping(uint256 => PollMarket) public pollMarkets;
    mapping(uint256 => MatchMarket) public matchMarkets;
    mapping(uint256 => MarketType) public marketTypes; // Track market type
    mapping(uint256 => BoostPrediction[]) public boostPredictions;
    mapping(address => mapping(uint256 => MarketPosition)) public pollMarketPositions;
    mapping(address => mapping(uint256 => MatchMarketPosition)) public matchMarketPositions;
    mapping(uint256 => mapping(address => uint256)) public claimableBalances;
    
    uint256 public marketCounter;
    
    // Match market position structure
    struct MatchMarketPosition {
        address user;
        uint256 marketId;
        uint8 side; // 0 = TeamA, 1 = TeamB, 2 = Draw
        uint256 shares;
    }
    
    event PollMarketCreated(uint256 indexed marketId, uint256 initialYesLiquidity, uint256 initialNoLiquidity);
    event MatchMarketCreated(uint256 indexed marketId, uint256 initialTeamALiquidity, uint256 initialTeamBLiquidity, uint256 initialDrawLiquidity);
    event PollLiquidityAdded(uint256 indexed marketId, uint256 yesAmount, uint256 noAmount);
    event MatchLiquidityAdded(uint256 indexed marketId, uint256 teamAAmount, uint256 teamBAmount, uint256 drawAmount);
    event PollSharesBought(uint256 indexed marketId, address indexed buyer, bool side, uint256 amount, uint256 shares);
    event MatchSharesBought(uint256 indexed marketId, address indexed buyer, uint8 side, uint256 amount, uint256 shares);
    event PollSharesSold(uint256 indexed marketId, address indexed seller, bool side, uint256 shares, uint256 amount);
    event MatchSharesSold(uint256 indexed marketId, address indexed seller, uint8 side, uint256 shares, uint256 amount);
    event PollMarketSettled(uint256 indexed marketId, bool outcome);
    event MatchMarketSettled(uint256 indexed marketId, uint8 outcome);
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
     * @notice Create a new poll market (YES/NO) with initial liquidity
     */
    function createPollMarket(uint256 _initialYesLiquidity, uint256 _initialNoLiquidity) 
        external 
        onlyDeployer 
        returns (uint256) 
    {
        require(_initialYesLiquidity > 0 && _initialNoLiquidity > 0, "Invalid liquidity");
        
        uint256 marketId = marketCounter++;
        marketTypes[marketId] = MarketType.Poll;
        pollMarkets[marketId] = PollMarket({
            marketId: marketId,
            initialized: true,
            yesShares: _initialYesLiquidity,
            noShares: _initialNoLiquidity,
            initialYesLiquidity: _initialYesLiquidity,
            initialNoLiquidity: _initialNoLiquidity,
            settled: false,
            outcome: false
        });
        
        emit PollMarketCreated(marketId, _initialYesLiquidity, _initialNoLiquidity);
        return marketId;
    }
    
    /**
     * @notice Create a new match market (TeamA/TeamB/Draw) with initial liquidity
     */
    function createMatchMarket(uint256 _initialTeamALiquidity, uint256 _initialTeamBLiquidity, uint256 _initialDrawLiquidity) 
        external 
        onlyDeployer 
        returns (uint256) 
    {
        require(_initialTeamALiquidity > 0 && _initialTeamBLiquidity > 0 && _initialDrawLiquidity > 0, "Invalid liquidity");
        
        uint256 marketId = marketCounter++;
        marketTypes[marketId] = MarketType.Match;
        matchMarkets[marketId] = MatchMarket({
            marketId: marketId,
            initialized: true,
            teamAShares: _initialTeamALiquidity,
            teamBShares: _initialTeamBLiquidity,
            drawShares: _initialDrawLiquidity,
            initialTeamALiquidity: _initialTeamALiquidity,
            initialTeamBLiquidity: _initialTeamBLiquidity,
            initialDrawLiquidity: _initialDrawLiquidity,
            settled: false,
            outcome: 0
        });
        
        emit MatchMarketCreated(marketId, _initialTeamALiquidity, _initialTeamBLiquidity, _initialDrawLiquidity);
        return marketId;
    }
    
    /**
     * @notice Add liquidity to a poll market
     */
    function addPollLiquidity(uint256 marketId, uint256 yesAmount, uint256 noAmount) 
        external 
        payable 
        onlyDeployer 
    {
        require(marketTypes[marketId] == MarketType.Poll, "Not a poll market");
        PollMarket storage market = pollMarkets[marketId];
        require(market.initialized && !market.settled, "Market not available");
        require(msg.value >= yesAmount + noAmount, "Insufficient funds");
        
        market.yesShares += yesAmount;
        market.noShares += noAmount;
        market.initialYesLiquidity += yesAmount;
        market.initialNoLiquidity += noAmount;
        
        emit PollLiquidityAdded(marketId, yesAmount, noAmount);
    }
    
    /**
     * @notice Add liquidity to a match market
     */
    function addMatchLiquidity(uint256 marketId, uint256 teamAAmount, uint256 teamBAmount, uint256 drawAmount) 
        external 
        payable 
        onlyDeployer 
    {
        require(marketTypes[marketId] == MarketType.Match, "Not a match market");
        MatchMarket storage market = matchMarkets[marketId];
        require(market.initialized && !market.settled, "Market not available");
        require(msg.value >= teamAAmount + teamBAmount + drawAmount, "Insufficient funds");
        
        market.teamAShares += teamAAmount;
        market.teamBShares += teamBAmount;
        market.drawShares += drawAmount;
        market.initialTeamALiquidity += teamAAmount;
        market.initialTeamBLiquidity += teamBAmount;
        market.initialDrawLiquidity += drawAmount;
        
        emit MatchLiquidityAdded(marketId, teamAAmount, teamBAmount, drawAmount);
    }
    
    /**
     * @notice Buy shares in a poll market (YES/NO)
     */
    function buyPollShares(uint256 marketId, bool side) external payable {
        require(marketTypes[marketId] == MarketType.Poll, "Not a poll market");
        PollMarket storage market = pollMarkets[marketId];
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
        
        // Update user position
        MarketPosition storage position = pollMarketPositions[msg.sender][marketId];
        if (position.shares == 0) {
            position.user = msg.sender;
            position.marketId = marketId;
            position.side = side;
        }
        position.shares += shares;
        
        emit PollSharesBought(marketId, msg.sender, side, msg.value, shares);
    }
    
    /**
     * @notice Buy shares in a match market (TeamA/TeamB/Draw)
     * @param side 0 = TeamA, 1 = TeamB, 2 = Draw
     */
    function buyMatchShares(uint256 marketId, uint8 side) external payable {
        require(marketTypes[marketId] == MarketType.Match, "Not a match market");
        require(side < 3, "Invalid side");
        MatchMarket storage market = matchMarkets[marketId];
        require(market.initialized && !market.settled, "Market not available");
        require(msg.value > 0, "Must send ETH");
        
        uint256 totalShares = market.teamAShares + market.teamBShares + market.drawShares;
        require(totalShares > 0, "Market not initialized");
        
        // Calculate shares using fixed-sum AMM formula
        uint256 shares;
        if (side == 0) { // TeamA
            shares = (msg.value * market.teamAShares) / (totalShares + msg.value);
            market.teamAShares += shares;
        } else if (side == 1) { // TeamB
            shares = (msg.value * market.teamBShares) / (totalShares + msg.value);
            market.teamBShares += shares;
        } else { // Draw
            shares = (msg.value * market.drawShares) / (totalShares + msg.value);
            market.drawShares += shares;
        }
        
        // Update user position
        MatchMarketPosition storage position = matchMarketPositions[msg.sender][marketId];
        if (position.shares == 0) {
            position.user = msg.sender;
            position.marketId = marketId;
            position.side = side;
        }
        position.shares += shares;
        
        emit MatchSharesBought(marketId, msg.sender, side, msg.value, shares);
    }
    
    /**
     * @notice Sell shares in a poll market
     */
    function sellPollShares(uint256 marketId, uint256 shares) external {
        require(marketTypes[marketId] == MarketType.Poll, "Not a poll market");
        PollMarket storage market = pollMarkets[marketId];
        MarketPosition storage position = pollMarketPositions[msg.sender][marketId];
        
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
        emit PollSharesSold(marketId, msg.sender, position.side, shares, netPayout);
    }
    
    /**
     * @notice Sell shares in a match market
     */
    function sellMatchShares(uint256 marketId, uint256 shares) external {
        require(marketTypes[marketId] == MarketType.Match, "Not a match market");
        MatchMarket storage market = matchMarkets[marketId];
        MatchMarketPosition storage position = matchMarketPositions[msg.sender][marketId];
        
        require(market.initialized && !market.settled, "Market not available");
        require(position.shares >= shares, "Insufficient shares");
        
        uint256 totalShares = market.teamAShares + market.teamBShares + market.drawShares;
        require(totalShares > 0, "Market not initialized");
        
        // Calculate payout using fixed-sum AMM formula
        uint256 payout;
        if (position.side == 0) { // Selling TeamA
            market.teamAShares -= shares;
            payout = (shares * totalShares) / (market.teamAShares + market.teamBShares + market.drawShares + shares);
        } else if (position.side == 1) { // Selling TeamB
            market.teamBShares -= shares;
            payout = (shares * totalShares) / (market.teamAShares + market.teamBShares + market.drawShares + shares);
        } else { // Selling Draw
            market.drawShares -= shares;
            payout = (shares * totalShares) / (market.teamAShares + market.teamBShares + market.drawShares + shares);
        }
        
        // Apply fees
        uint256 fee = (payout * marketPlatformFee) / 10000;
        uint256 freeJackpotFeeAmount = (payout * freeJackpotFee) / 10000;
        uint256 netPayout = payout - fee - freeJackpotFeeAmount;
        
        position.shares -= shares;
        
        payable(msg.sender).transfer(netPayout);
        emit MatchSharesSold(marketId, msg.sender, position.side, shares, netPayout);
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
     * @notice Add stake to existing boost prediction
     */
    function addBoostStake(uint256 matchId, uint256 predictionIndex) external payable {
        require(msg.value > 0, "Must send ETH");
        require(predictionIndex < boostPredictions[matchId].length, "Invalid prediction index");
        
        BoostPrediction storage prediction = boostPredictions[matchId][predictionIndex];
        require(prediction.user == msg.sender, "Not your prediction");
        require(!prediction.claimed, "Already claimed");
        
        prediction.amount += msg.value;
        
        emit BoostPredictionMade(matchId, msg.sender, prediction.outcome, msg.value);
    }
    
    /**
     * @notice Withdraw stake from existing boost prediction
     */
    function withdrawBoostStake(uint256 matchId, uint256 predictionIndex, uint256 amount) external {
        require(predictionIndex < boostPredictions[matchId].length, "Invalid prediction index");
        
        BoostPrediction storage prediction = boostPredictions[matchId][predictionIndex];
        require(prediction.user == msg.sender, "Not your prediction");
        require(!prediction.claimed, "Already claimed");
        require(amount > 0 && amount <= prediction.amount, "Invalid amount");
        
        prediction.amount -= amount;
        payable(msg.sender).transfer(amount);
        
        emit BoostPredictionMade(matchId, msg.sender, prediction.outcome, amount);
    }
    
    /**
     * @notice Settle a poll market (set outcome)
     */
    function settlePollMarket(uint256 marketId, bool outcome) external onlyDeployer {
        require(marketTypes[marketId] == MarketType.Poll, "Not a poll market");
        PollMarket storage market = pollMarkets[marketId];
        require(market.initialized && !market.settled, "Market already settled");
        
        market.settled = true;
        market.outcome = outcome;
        
        emit PollMarketSettled(marketId, outcome);
    }
    
    /**
     * @notice Settle a match market (set outcome)
     * @param outcome 0 = TeamA, 1 = TeamB, 2 = Draw
     */
    function settleMatchMarket(uint256 marketId, uint8 outcome) external onlyDeployer {
        require(marketTypes[marketId] == MarketType.Match, "Not a match market");
        require(outcome < 3, "Invalid outcome");
        MatchMarket storage market = matchMarkets[marketId];
        require(market.initialized && !market.settled, "Market already settled");
        
        market.settled = true;
        market.outcome = outcome;
        
        emit MatchMarketSettled(marketId, outcome);
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
     * @notice Get current price for a poll market side (in basis points)
     */
    function getPollPrice(uint256 marketId, bool side) external view returns (uint256) {
        PollMarket storage market = pollMarkets[marketId];
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
     * @notice Get current price for a match market side (in basis points)
     * @param side 0 = TeamA, 1 = TeamB, 2 = Draw
     */
    function getMatchPrice(uint256 marketId, uint8 side) external view returns (uint256) {
        MatchMarket storage market = matchMarkets[marketId];
        if (!market.initialized) return 0;
        
        uint256 totalShares = market.teamAShares + market.teamBShares + market.drawShares;
        if (totalShares == 0) return 3333; // ~33% if no shares
        
        if (side == 0) {
            return (market.teamAShares * 10000) / totalShares;
        } else if (side == 1) {
            return (market.teamBShares * 10000) / totalShares;
        } else {
            return (market.drawShares * 10000) / totalShares;
        }
    }
    
    /**
     * @notice Get user's poll market position
     */
    function getPollUserPosition(uint256 marketId, address user) 
        external 
        view 
        returns (bool side, uint256 shares) 
    {
        MarketPosition storage position = pollMarketPositions[user][marketId];
        return (position.side, position.shares);
    }
    
    /**
     * @notice Get user's match market position
     */
    function getMatchUserPosition(uint256 marketId, address user) 
        external 
        view 
        returns (uint8 side, uint256 shares) 
    {
        MatchMarketPosition storage position = matchMarketPositions[user][marketId];
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
