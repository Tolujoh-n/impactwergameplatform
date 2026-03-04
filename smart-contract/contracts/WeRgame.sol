// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title WeRgame
 * @dev Comprehensive smart contract for prediction market platform
 * Handles market creation, trading, boost predictions, and jackpot management
 */
contract WeRgame {
    address public deployer;
    address public superAdmin;
    
    // Fee structure (in basis points, 10000 = 100%)
    uint256 public platformFee; // For boost predictions
    uint256 public boostJackpotFee;
    uint256 public marketPlatformFee;
    uint256 public freeJackpotFee;
    
    // Market status enum
    enum MarketStatus {
        Upcoming,
        Active,
        Locked,
        Resolved
    }
    
    // Market structure
    struct Market {
        uint256 marketId;
        bool isPoll; // true for poll, false for match
        MarketStatus status;
        string[] options; // Options/outcomes for this market
        mapping(string => uint256) liquidity; // Liquidity per option
        mapping(string => uint256) shares; // Total shares per option
        uint256 totalLiquidity;
        bool resolved;
        string winningOption; // Set when resolved
        uint256 createdAt;
        uint256 resolvedAt;
    }
    
    // Boost prediction structure
    struct BoostPrediction {
        address user;
        uint256 marketId;
        string outcome;
        uint256 stakeAmount;
        uint256 totalStake;
        bool claimed;
    }
    
    // Market trading position
    struct MarketPosition {
        address user;
        string outcome;
        uint256 shares;
        uint256 totalInvested;
    }
    
    // Mappings
    mapping(uint256 => Market) public markets;
    mapping(uint256 => mapping(address => mapping(string => BoostPrediction))) public boostPredictions; // marketId => user => outcome => prediction
    mapping(uint256 => mapping(address => mapping(string => MarketPosition))) public marketPositions; // marketId => user => outcome => position
    mapping(uint256 => mapping(address => uint256)) public claimableBalances; // marketId => user => claimable amount (legacy/total)
    mapping(uint256 => mapping(address => uint256)) public claimableBoost;    // marketId => user => boost claimable
    mapping(uint256 => mapping(address => uint256)) public claimableMarket;  // marketId => user => market claimable
    mapping(address => uint256) public jackpotBalances; // user => jackpot balance
    
    uint256 public nextMarketId;
    uint256 public jackpotPool;
    /// @dev Pool for paying Boost and Market prediction wins; funded by deployer and by boost stakes
    uint256 public claimPredictionWinsPool;
    
    // Events
    event MarketCreated(uint256 indexed marketId, bool isPoll, string[] options);
    event MarketStatusUpdated(uint256 indexed marketId, MarketStatus status);
    event MarketResolved(uint256 indexed marketId, string winningOption);
    event LiquidityAdded(uint256 indexed marketId, string option, uint256 amount);
    event FeesUpdated(uint256 platformFee, uint256 boostJackpotFee, uint256 marketPlatformFee, uint256 freeJackpotFee);
    event BoostStaked(uint256 indexed marketId, address indexed user, string outcome, uint256 amount);
    event BoostStakeAdded(uint256 indexed marketId, address indexed user, uint256 amount);
    event BoostStakeWithdrawn(uint256 indexed marketId, address indexed user, uint256 amount);
    event BoostClaimed(uint256 indexed marketId, address indexed user, uint256 amount);
    event MarketBought(uint256 indexed marketId, address indexed user, string outcome, uint256 ethAmount, uint256 shares);
    event MarketSold(uint256 indexed marketId, address indexed user, string outcome, uint256 shares, uint256 ethAmount);
    event MarketClaimed(uint256 indexed marketId, address indexed user, string outcome, uint256 amount);
    event JackpotFunded(uint256 amount);
    event JackpotWithdrawn(address indexed user, uint256 amount);
    event JackpotPoolWithdrawn(address indexed to, uint256 amount);
    event FundsTransferred(address indexed to, uint256 amount);
    event ClaimPredictionWinsPoolFunded(uint256 amount);
    event ClaimPredictionWinsPoolWithdrawn(address indexed to, uint256 amount);
    event PredictionWinsClaimed(uint256 indexed marketId, address indexed user, uint256 amount);
    
    modifier onlyDeployer() {
        require(msg.sender == deployer, "Only deployer");
        _;
    }
    
    modifier onlySuperAdmin() {
        require(msg.sender == superAdmin || msg.sender == deployer, "Only superAdmin");
        _;
    }
    
    modifier validMarket(uint256 marketId) {
        require(markets[marketId].marketId != 0, "Market does not exist");
        _;
    }
    
    uint256 private _locked = 0;
    modifier nonReentrant() {
        require(_locked == 0, "ReentrancyGuard: reentrant call");
        _locked = 1;
        _;
        _locked = 0;
    }
    
    constructor() {
        deployer = msg.sender;
        superAdmin = msg.sender;
        
        // Default fees (in basis points: 1000 = 10%, 500 = 5%)
        platformFee = 1000; // 10%
        boostJackpotFee = 500; // 5%
        marketPlatformFee = 500; // 5%
        freeJackpotFee = 500; // 5%
        
        nextMarketId = 1;
    }
    
    /**
     * @dev Create a new market (match or poll)
     * @param isPoll true if poll, false if match
     * @param options array of outcome options
     */
    function createMarket(bool isPoll, string[] memory options) external onlyDeployer returns (uint256) {
        require(options.length >= 2, "Must have at least 2 options");
        
        uint256 marketId = nextMarketId++;
        Market storage market = markets[marketId];
        market.marketId = marketId;
        market.isPoll = isPoll;
        market.status = MarketStatus.Upcoming;
        market.createdAt = block.timestamp;
        
        // Initialize options
        for (uint256 i = 0; i < options.length; i++) {
            market.options.push(options[i]);
            market.liquidity[options[i]] = 0;
            market.shares[options[i]] = 0;
        }
        
        emit MarketCreated(marketId, isPoll, options);
        return marketId;
    }
    
    /**
     * @dev Update market status
     */
    function updateMarketStatus(uint256 marketId, MarketStatus status) external onlyDeployer validMarket(marketId) {
        markets[marketId].status = status;
        emit MarketStatusUpdated(marketId, status);
    }
    
    /**
     * @dev Add initial liquidity to a market option
     */
    function addLiquidity(uint256 marketId, string memory option, uint256 amount) external payable onlyDeployer validMarket(marketId) {
        require(msg.value >= amount, "Insufficient ETH sent");
        require(msg.value > 0, "Amount must be greater than 0");
        
        Market storage market = markets[marketId];
        require(market.status == MarketStatus.Upcoming || market.status == MarketStatus.Active, "Market not active");
        
        // Verify option exists
        bool optionExists = false;
        for (uint256 i = 0; i < market.options.length; i++) {
            if (keccak256(bytes(market.options[i])) == keccak256(bytes(option))) {
                optionExists = true;
                break;
            }
        }
        require(optionExists, "Invalid option");
        
        market.liquidity[option] += amount;
        market.totalLiquidity += amount;
        
        emit LiquidityAdded(marketId, option, amount);
    }
    
    /**
     * @dev Resolve a market
     */
    function resolveMarket(uint256 marketId, string memory winningOption) external onlyDeployer validMarket(marketId) {
        Market storage market = markets[marketId];
        require(market.status != MarketStatus.Resolved, "Already resolved");
        
        // Verify option exists
        bool optionExists = false;
        for (uint256 i = 0; i < market.options.length; i++) {
            if (keccak256(bytes(market.options[i])) == keccak256(bytes(winningOption))) {
                optionExists = true;
                break;
            }
        }
        require(optionExists, "Invalid winning option");
        
        market.status = MarketStatus.Resolved;
        market.resolved = true;
        market.winningOption = winningOption;
        market.resolvedAt = block.timestamp;
        
        emit MarketResolved(marketId, winningOption);
    }
    
    /**
     * @dev Set fees (in basis points)
     */
    function setFees(
        uint256 _platformFee,
        uint256 _boostJackpotFee,
        uint256 _marketPlatformFee,
        uint256 _freeJackpotFee
    ) external onlySuperAdmin {
        require(_platformFee <= 10000 && _boostJackpotFee <= 10000 && 
                _marketPlatformFee <= 10000 && _freeJackpotFee <= 10000, "Fees cannot exceed 100%");
        
        platformFee = _platformFee;
        boostJackpotFee = _boostJackpotFee;
        marketPlatformFee = _marketPlatformFee;
        freeJackpotFee = _freeJackpotFee;
        
        emit FeesUpdated(_platformFee, _boostJackpotFee, _marketPlatformFee, _freeJackpotFee);
    }
    
    /**
     * @dev Get current fees
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
     * @dev Stake ETH for boost prediction
     */
    function stakeBoost(uint256 marketId, string memory outcome) external payable validMarket(marketId) {
        require(msg.value > 0, "Amount must be greater than 0");
        Market storage market = markets[marketId];
        require(market.status == MarketStatus.Upcoming || market.status == MarketStatus.Active, "Market not active");
        
        // Verify option exists
        bool optionExists = false;
        for (uint256 i = 0; i < market.options.length; i++) {
            if (keccak256(bytes(market.options[i])) == keccak256(bytes(outcome))) {
                optionExists = true;
                break;
            }
        }
        require(optionExists, "Invalid outcome");
        
        // Calculate fees
        uint256 platformFeeAmount = (msg.value * platformFee) / 10000;
        uint256 boostJackpotFeeAmount = (msg.value * boostJackpotFee) / 10000;
        uint256 netStake = msg.value - platformFeeAmount - boostJackpotFeeAmount;
        
        // Update or create boost prediction
        BoostPrediction storage prediction = boostPredictions[marketId][msg.sender][outcome];
        if (prediction.user == address(0)) {
            // New prediction
            prediction.user = msg.sender;
            prediction.marketId = marketId;
            prediction.outcome = outcome;
            prediction.stakeAmount = netStake;
            prediction.totalStake = netStake;
        } else {
            // Update existing prediction
            prediction.totalStake += netStake;
        }
        
        // Boost stakes fund the claim prediction wins pool
        claimPredictionWinsPool += msg.value;
        
        emit BoostStaked(marketId, msg.sender, outcome, netStake);
    }
    
    /**
     * @dev Add more stake to existing boost prediction
     */
    function addBoostStake(uint256 marketId, string memory outcome) external payable validMarket(marketId) {
        require(msg.value > 0, "Amount must be greater than 0");
        Market storage market = markets[marketId];
        require(market.status == MarketStatus.Upcoming || market.status == MarketStatus.Active, "Market not active");
        
        BoostPrediction storage prediction = boostPredictions[marketId][msg.sender][outcome];
        require(prediction.user == msg.sender, "No existing prediction");
        
        // Calculate fees
        uint256 platformFeeAmount = (msg.value * platformFee) / 10000;
        uint256 boostJackpotFeeAmount = (msg.value * boostJackpotFee) / 10000;
        uint256 netStake = msg.value - platformFeeAmount - boostJackpotFeeAmount;
        
        prediction.totalStake += netStake;
        
        // Additional boost stake funds the claim prediction wins pool
        claimPredictionWinsPool += msg.value;
        
        emit BoostStakeAdded(marketId, msg.sender, netStake);
    }
    
    /**
     * @dev Withdraw stake from boost prediction (only before resolution)
     */
    function withdrawBoostStake(uint256 marketId, string memory outcome, uint256 amount) external validMarket(marketId) nonReentrant {
        Market storage market = markets[marketId];
        require(market.status == MarketStatus.Upcoming || market.status == MarketStatus.Active, "Market not active");
        
        BoostPrediction storage prediction = boostPredictions[marketId][msg.sender][outcome];
        require(prediction.user == msg.sender, "No prediction found");
        require(prediction.totalStake >= amount, "Insufficient stake");
        
        prediction.totalStake -= amount;
        require(claimPredictionWinsPool >= amount, "Insufficient claim pool");
        claimPredictionWinsPool -= amount;
        
        // Transfer ETH back to user
        (bool success, ) = payable(msg.sender).call{value: amount}("");
        require(success, "Transfer failed");
        
        emit BoostStakeWithdrawn(marketId, msg.sender, amount);
    }
    
    /**
     * @dev Claim boost prediction winnings
     */
    function claimBoost(uint256 marketId, string memory outcome) external validMarket(marketId) nonReentrant {
        Market storage market = markets[marketId];
        require(market.resolved, "Market not resolved");
        require(keccak256(bytes(market.winningOption)) == keccak256(bytes(outcome)), "Not winning outcome");
        
        BoostPrediction storage prediction = boostPredictions[marketId][msg.sender][outcome];
        require(prediction.user == msg.sender, "No prediction found");
        require(!prediction.claimed, "Already claimed");
        require(prediction.totalStake > 0, "No stake to claim");
        
        // Calculate claimable amount (backend will set this via setClaimableBalance)
        uint256 claimable = claimableBalances[marketId][msg.sender];
        require(claimable > 0, "No claimable balance");
        require(claimPredictionWinsPool >= claimable, "Insufficient claim pool");
        
        prediction.claimed = true;
        claimableBalances[marketId][msg.sender] = 0;
        claimPredictionWinsPool -= claimable;
        
        // Transfer winnings
        (bool success, ) = payable(msg.sender).call{value: claimable}("");
        require(success, "Transfer failed");
        
        emit BoostClaimed(marketId, msg.sender, claimable);
    }
    
    /**
     * @dev Set claimable balance for a user (legacy; prefer setClaimableBoost/setClaimableMarket)
     */
    function setClaimableBalance(uint256 marketId, address user, uint256 amount) external onlyDeployer {
        claimableBalances[marketId][user] = amount;
    }
    
    /**
     * @dev Set claimable boost amount for a user (called after resolution).
     */
    function setClaimableBoost(uint256 marketId, address user, uint256 amount) external onlyDeployer {
        claimableBoost[marketId][user] = amount;
    }
    
    /**
     * @dev Set claimable market amount for a user (called after resolution).
     */
    function setClaimableMarket(uint256 marketId, address user, uint256 amount) external onlyDeployer {
        claimableMarket[marketId][user] = amount;
    }
    
    /**
     * @dev Claim prediction winnings (Boost or Market) for a resolved market.
     * @param marketId Market id
     * @param isBoost true to claim boost winnings, false to claim market winnings. Pays from claimPredictionWinsPool.
     */
    function claimPredictionWins(uint256 marketId, bool isBoost) external validMarket(marketId) nonReentrant {
        Market storage market = markets[marketId];
        require(market.resolved, "Market not resolved");
        
        string memory winningOption = market.winningOption;
        uint256 amount;
        
        if (isBoost) {
            amount = claimableBoost[marketId][msg.sender];
            require(amount > 0, "No claimable balance");
            BoostPrediction storage boostPred = boostPredictions[marketId][msg.sender][winningOption];
            require(boostPred.user == msg.sender && boostPred.totalStake > 0 && !boostPred.claimed, "Not a participant");
            require(claimPredictionWinsPool >= amount, "Insufficient claim pool");
            claimableBoost[marketId][msg.sender] = 0;
            boostPred.claimed = true;
        } else {
            amount = claimableMarket[marketId][msg.sender];
            require(amount > 0, "No claimable balance");
            MarketPosition storage pos = marketPositions[marketId][msg.sender][winningOption];
            require(pos.user == msg.sender && pos.shares > 0, "Not a participant");
            require(claimPredictionWinsPool >= amount, "Insufficient claim pool");
            claimableMarket[marketId][msg.sender] = 0;
        }
        
        claimPredictionWinsPool -= amount;
        (bool success, ) = payable(msg.sender).call{value: amount}("");
        require(success, "Transfer failed");
        emit PredictionWinsClaimed(marketId, msg.sender, amount);
    }
    
    /**
     * @dev Fund the claim prediction wins pool (deployer only).
     */
    function fundClaimPredictionWinsPool() external payable onlyDeployer {
        require(msg.value > 0, "Amount must be greater than 0");
        claimPredictionWinsPool += msg.value;
        emit ClaimPredictionWinsPoolFunded(msg.value);
    }
    
    /**
     * @dev Withdraw from claim prediction wins pool (deployer only).
     */
    function withdrawFromClaimPredictionWinsPool(address payable to, uint256 amount) external onlyDeployer nonReentrant {
        require(to != address(0), "Invalid recipient");
        require(claimPredictionWinsPool >= amount, "Insufficient pool balance");
        claimPredictionWinsPool -= amount;
        (bool success, ) = to.call{value: amount}("");
        require(success, "Transfer failed");
        emit ClaimPredictionWinsPoolWithdrawn(to, amount);
    }
    
    /**
     * @dev Buy shares in market (fixed-sum AMM)
     */
    function buyMarketShares(uint256 marketId, string memory outcome) external payable validMarket(marketId) {
        require(msg.value > 0, "Amount must be greater than 0");
        Market storage market = markets[marketId];
        require(market.status == MarketStatus.Upcoming || market.status == MarketStatus.Active, "Market not active");
        
        // Verify option exists
        bool optionExists = false;
        for (uint256 i = 0; i < market.options.length; i++) {
            if (keccak256(bytes(market.options[i])) == keccak256(bytes(outcome))) {
                optionExists = true;
                break;
            }
        }
        require(optionExists, "Invalid outcome");
        
        // Calculate fees
        uint256 platformFeeAmount = (msg.value * marketPlatformFee) / 10000;
        uint256 freeJackpotFeeAmount = (msg.value * freeJackpotFee) / 10000;
        uint256 netAmount = msg.value - platformFeeAmount - freeJackpotFeeAmount;
        
        // Calculate current price (liquidity / total liquidity)
        uint256 currentPrice = market.totalLiquidity > 0 
            ? (market.liquidity[outcome] * 10000) / market.totalLiquidity 
            : (10000 / market.options.length); // Equal distribution if no liquidity
        
        // Calculate shares received
        uint256 shares = (netAmount * 10000) / currentPrice;
        
        // Update liquidity (fixed-sum AMM: buying increases selected option's liquidity)
        market.liquidity[outcome] += netAmount;
        market.totalLiquidity += netAmount;
        market.shares[outcome] += shares;
        
        // Update user position
        MarketPosition storage position = marketPositions[marketId][msg.sender][outcome];
        if (position.user == address(0)) {
            position.user = msg.sender;
            position.outcome = outcome;
        }
        position.shares += shares;
        position.totalInvested += netAmount;
        
        // Market buys fund the claim prediction wins pool
        claimPredictionWinsPool += msg.value;
        
        emit MarketBought(marketId, msg.sender, outcome, netAmount, shares);
    }
    
    /**
     * @dev Sell shares in market
     */
    function sellMarketShares(uint256 marketId, string memory outcome, uint256 shares) external validMarket(marketId) nonReentrant {
        Market storage market = markets[marketId];
        require(market.status == MarketStatus.Upcoming || market.status == MarketStatus.Active, "Market not active");
        
        MarketPosition storage position = marketPositions[marketId][msg.sender][outcome];
        require(position.user == msg.sender, "No position found");
        require(position.shares >= shares, "Insufficient shares");
        
        // Calculate current price
        uint256 currentPrice = market.totalLiquidity > 0 
            ? (market.liquidity[outcome] * 10000) / market.totalLiquidity 
            : (10000 / market.options.length);
        
        // Calculate payout
        uint256 payout = (shares * currentPrice) / 10000;
        
        // Update liquidity (selling decreases selected option's liquidity)
        market.liquidity[outcome] -= payout;
        market.totalLiquidity -= payout;
        market.shares[outcome] -= shares;
        
        // Update user position
        position.shares -= shares;
        position.totalInvested -= (payout * position.totalInvested) / (position.shares + shares);
        
        // Deduct from claim prediction wins pool when user sells (pool was credited on buy)
        require(claimPredictionWinsPool >= payout, "Insufficient claim pool");
        claimPredictionWinsPool -= payout;
        
        // Transfer ETH to user
        (bool success, ) = payable(msg.sender).call{value: payout}("");
        require(success, "Transfer failed");
        
        emit MarketSold(marketId, msg.sender, outcome, shares, payout);
    }
    
    /**
     * @dev Claim market winnings after resolution
     */
    function claimMarket(uint256 marketId, string memory outcome) external validMarket(marketId) nonReentrant {
        Market storage market = markets[marketId];
        require(market.resolved, "Market not resolved");
        require(keccak256(bytes(market.winningOption)) == keccak256(bytes(outcome)), "Not winning outcome");
        
        MarketPosition storage position = marketPositions[marketId][msg.sender][outcome];
        require(position.user == msg.sender, "No position found");
        require(position.shares > 0, "No shares to claim");
        
        // Calculate claimable amount (backend will set this)
        uint256 claimable = claimableBalances[marketId][msg.sender];
        require(claimable > 0, "No claimable balance");
        require(claimPredictionWinsPool >= claimable, "Insufficient claim pool");
        
        claimableBalances[marketId][msg.sender] = 0;
        claimPredictionWinsPool -= claimable;
        
        // Transfer winnings
        (bool success, ) = payable(msg.sender).call{value: claimable}("");
        require(success, "Transfer failed");
        
        emit MarketClaimed(marketId, msg.sender, outcome, claimable);
    }
    
    /**
     * @dev Get current price for an option (in basis points)
     */
    function getPrice(uint256 marketId, string memory outcome) external view validMarket(marketId) returns (uint256) {
        Market storage market = markets[marketId];
        if (market.totalLiquidity == 0) {
            return (10000 / market.options.length);
        }
        return (market.liquidity[outcome] * 10000) / market.totalLiquidity;
    }
    
    /**
     * @dev Get user's market position
     */
    function getUserPosition(uint256 marketId, address user, string memory outcome) external view validMarket(marketId) returns (uint256 shares, uint256 totalInvested) {
        MarketPosition storage position = marketPositions[marketId][user][outcome];
        return (position.shares, position.totalInvested);
    }
    
    /**
     * @dev Get user's boost prediction
     */
    function getBoostPrediction(uint256 marketId, address user, string memory outcome) external view validMarket(marketId) returns (
        address _user,
        uint256 _totalStake,
        bool _claimed
    ) {
        BoostPrediction storage prediction = boostPredictions[marketId][user][outcome];
        return (prediction.user, prediction.totalStake, prediction.claimed);
    }
    
    /**
     * @dev Fund jackpot pool (deployer only)
     */
    function fundJackpotPool() external payable onlyDeployer {
        require(msg.value > 0, "Amount must be greater than 0");
        jackpotPool += msg.value;
        emit JackpotFunded(msg.value);
    }
    
    /**
     * @dev User withdraw from jackpot pool
     */
    function withdrawJackpot(uint256 amount) external nonReentrant {
        require(amount > 0, "Amount must be greater than 0");
        require(jackpotPool >= amount, "Insufficient jackpot pool");
        require(jackpotBalances[msg.sender] >= amount, "Insufficient balance");
        
        jackpotBalances[msg.sender] -= amount;
        jackpotPool -= amount;
        
        (bool success, ) = payable(msg.sender).call{value: amount}("");
        require(success, "Transfer failed");
        
        emit JackpotWithdrawn(msg.sender, amount);
    }
    
    /**
     * @dev Set user's jackpot balance (called by backend)
     */
    function setJackpotBalance(address user, uint256 amount) external onlyDeployer {
        jackpotBalances[user] = amount;
    }
    
    /**
     * @dev Withdraw from jackpot pool (deployer only)
     */
    function withdrawFromJackpotPool(address payable to, uint256 amount) external onlyDeployer nonReentrant {
        require(jackpotPool >= amount, "Insufficient pool balance");
        jackpotPool -= amount;
        
        (bool success, ) = to.call{value: amount}("");
        require(success, "Transfer failed");
        
        emit JackpotPoolWithdrawn(to, amount);
    }
    
    /**
     * @dev Get contract balance
     */
    function getContractBalance() external view returns (uint256) {
        return address(this).balance;
    }
    
    /**
     * @dev Transfer funds from contract (deployer only)
     */
    function transferFunds(address payable to, uint256 amount) external onlyDeployer {
        require(address(this).balance >= amount, "Insufficient contract balance");
        
        (bool success, ) = to.call{value: amount}("");
        require(success, "Transfer failed");
        
        emit FundsTransferred(to, amount);
    }
    
    /**
     * @dev Set superAdmin address
     */
    function setSuperAdmin(address _superAdmin) external onlySuperAdmin {
        require(_superAdmin != address(0), "Invalid address");
        superAdmin = _superAdmin;
    }
    
    /**
     * @dev Get jackpot balance for user
     */
    function getJackpotBalance(address user) external view returns (uint256) {
        return jackpotBalances[user];
    }
    
    /**
     * @dev Get claimable balance for user
     */
    function getClaimableBalance(uint256 marketId, address user) external view returns (uint256) {
        return claimableBalances[marketId][user];
    }
    
    // Receive ETH
    receive() external payable {
        // Allow contract to receive ETH
    }
    
    fallback() external payable {
        // Allow contract to receive ETH
    }
}
