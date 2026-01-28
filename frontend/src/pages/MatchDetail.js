import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../components/Notification';
import Modal from '../components/Modal';

const MatchDetail = () => {
  const { matchId, type } = useParams();
  const [match, setMatch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [prediction, setPrediction] = useState(null);
  const [claimableAmount, setClaimableAmount] = useState(0);
  const { user } = useAuth();
  const navigate = useNavigate();
  const { showNotification } = useNotification();

  useEffect(() => {
    fetchMatchData();
    if (user) {
      fetchUserPrediction();
    }
  }, [matchId, user]);

  const fetchMatchData = async () => {
    try {
      const response = await api.get(`/matches/${matchId}`);
      setMatch(response.data);
    } catch (error) {
      console.error('Error fetching match:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserPrediction = async () => {
    try {
      // Fetch prediction by type to avoid mixing free and boost predictions
      const response = await api.get(`/predictions/match/${matchId}/user?type=${type}`);
      setPrediction(response.data);
    } catch (error) {
      // User hasn't predicted yet for this type
      setPrediction(null);
    }
  };

  const handlePredict = async (outcome, amount = null) => {
    if (!user) {
      showNotification('Please login to make predictions', 'warning');
      return;
    }

    try {
      if (type === 'free') {
        await api.post('/predictions/free', {
          matchId,
          outcome,
          type: 'free',
        });
        showNotification('Free prediction submitted successfully!', 'success');
      } else if (type === 'boost') {
        if (!amount) {
          showNotification('Please enter an amount to stake', 'warning');
          return;
        }
        await api.post('/predictions/boost', {
          matchId,
          outcome,
          amount: parseFloat(amount),
          type: 'boost',
        });
        showNotification('Boost prediction submitted successfully!', 'success');
      }
      await fetchUserPrediction();
    } catch (error) {
      showNotification(error.response?.data?.message || 'Failed to submit prediction', 'error');
    }
  };

  const handleClaim = async () => {
    try {
      const predictions = await api.get('/claims/user');
      const claimable = predictions.data.filter(p => p.status === 'won' && p.payout > 0);
      
      if (claimable.length === 0) {
        showNotification('No claims available', 'info');
        return;
      }

      await api.post('/claims/claim/all');
      showNotification('All claims processed successfully!', 'success');
      await fetchUserPrediction();
    } catch (error) {
      showNotification(error.response?.data?.message || 'Failed to claim', 'error');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!match) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-600 dark:text-gray-400">Match not found</p>
      </div>
    );
  }

  if (type === 'free') {
    return <FreeMatchView match={match} prediction={prediction} onPredict={handlePredict} onClaim={handleClaim} />;
  } else if (type === 'boost') {
    return <BoostMatchView match={match} prediction={prediction} onPredict={handlePredict} onClaim={handleClaim} />;
  } else if (type === 'market') {
    return <MarketMatchView match={match} navigate={navigate} user={user} showNotification={showNotification} />;
  }

  return null;
};

const FreeMatchView = ({ match, prediction, onPredict, onClaim }) => {
  const [showPredictModal, setShowPredictModal] = useState(false);
  const [selectedOutcome, setSelectedOutcome] = useState(null);
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            {match.teamA} vs {match.teamB}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {new Date(match.date).toLocaleDateString()} • {match.stageName}
          </p>

          <div className="bg-blue-50 dark:bg-blue-900 rounded-lg p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              FREE Prediction
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Use your daily free ticket to predict the outcome. Earn points and compete for jackpots!
            </p>
          </div>

          {prediction ? (
            <div className="bg-green-50 dark:bg-green-900 rounded-lg p-6 mb-6">
              <p className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Your Prediction: {prediction.outcome}
              </p>
              {prediction.status === 'won' && match.isResolved && (
                <button
                  onClick={onClaim}
                  className="mt-4 px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                >
                  Claim Rewards
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <button
                onClick={() => {
                  setSelectedOutcome(match.teamA);
                  setShowPredictModal(true);
                }}
                className="w-full px-6 py-4 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg text-lg font-semibold text-gray-900 dark:text-white transition-colors"
              >
                {match.teamA} Wins
              </button>
              <button
                onClick={() => {
                  setSelectedOutcome('Draw');
                  setShowPredictModal(true);
                }}
                className="w-full px-6 py-4 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg text-lg font-semibold text-gray-900 dark:text-white transition-colors"
              >
                Draw
              </button>
              <button
                onClick={() => {
                  setSelectedOutcome(match.teamB);
                  setShowPredictModal(true);
                }}
                className="w-full px-6 py-4 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg text-lg font-semibold text-gray-900 dark:text-white transition-colors"
              >
                {match.teamB} Wins
              </button>
            </div>
          )}

          {showPredictModal && (
            <Modal isOpen={true} onClose={() => setShowPredictModal(false)} title="Confirm Prediction">
              <div className="space-y-4">
                <p className="text-gray-700 dark:text-gray-300">
                  You are predicting: <strong>{selectedOutcome}</strong>
                </p>
                <div className="flex space-x-2">
                  <button
                    onClick={() => {
                      onPredict(selectedOutcome);
                      setShowPredictModal(false);
                    }}
                    className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                  >
                    Confirm
                  </button>
                  <button
                    onClick={() => setShowPredictModal(false)}
                    className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </Modal>
          )}
        </div>
      </div>
    </div>
  );
};

const BoostMatchView = ({ match, prediction, onPredict, onClaim }) => {
  const [showPredictModal, setShowPredictModal] = useState(false);
  const [selectedOutcome, setSelectedOutcome] = useState(null);
  const [amount, setAmount] = useState('');
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            {match.teamA} vs {match.teamB}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {new Date(match.date).toLocaleDateString()} • {match.stageName}
          </p>

          <div className="bg-purple-50 dark:bg-purple-900 rounded-lg p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              BOOST Prize Pool Contest
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-2">
              Stake ETH to enter the prize pool. Winners split the pool proportionally.
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              10% platform fee • 10% boost jackpot fee • Game locks at kickoff
            </p>
          </div>

          {prediction ? (
            <div className="bg-green-50 dark:bg-green-900 rounded-lg p-6 mb-6">
              <p className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Your Prediction: {prediction.outcome}
              </p>
              <p className="text-gray-600 dark:text-gray-400 mb-2">
                Staked Amount: {prediction.amount} ETH
              </p>
              {prediction.status === 'won' && match.isResolved && (
                <div>
                  <p className="text-gray-600 dark:text-gray-400 mb-2">
                    Payout: {prediction.payout || 0} ETH
                  </p>
                  <button
                    onClick={onClaim}
                    className="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                  >
                    Claim Rewards
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <button
                onClick={() => {
                  setSelectedOutcome(match.teamA);
                  setShowPredictModal(true);
                }}
                className="w-full px-6 py-4 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg text-lg font-semibold text-gray-900 dark:text-white transition-colors"
              >
                {match.teamA} Wins
              </button>
              <button
                onClick={() => {
                  setSelectedOutcome('Draw');
                  setShowPredictModal(true);
                }}
                className="w-full px-6 py-4 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg text-lg font-semibold text-gray-900 dark:text-white transition-colors"
              >
                Draw
              </button>
              <button
                onClick={() => {
                  setSelectedOutcome(match.teamB);
                  setShowPredictModal(true);
                }}
                className="w-full px-6 py-4 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg text-lg font-semibold text-gray-900 dark:text-white transition-colors"
              >
                {match.teamB} Wins
              </button>
            </div>
          )}

          {showPredictModal && (
            <Modal isOpen={true} onClose={() => setShowPredictModal(false)} title="Enter Boost Prediction">
              <div className="space-y-4">
                <p className="text-gray-700 dark:text-gray-300">
                  Prediction: <strong>{selectedOutcome}</strong>
                </p>
                <input
                  type="number"
                  step="0.01"
                  placeholder="ETH Amount"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:text-white"
                  required
                />
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  <p>10% platform fee • 10% boost jackpot fee</p>
                  <p>Game locks at kickoff</p>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => {
                      if (amount) {
                        onPredict(selectedOutcome, amount);
                        setShowPredictModal(false);
                        setAmount('');
                      }
                    }}
                    className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                  >
                    Confirm
                  </button>
                  <button
                    onClick={() => {
                      setShowPredictModal(false);
                      setAmount('');
                    }}
                    className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </Modal>
          )}
        </div>
      </div>
    </div>
  );
};

const MarketMatchView = ({ match, navigate, user, showNotification }) => {
  const [selectedOption, setSelectedOption] = useState(null); // 'yes' or 'no'
  const [tradeType, setTradeType] = useState('buy'); // 'buy' or 'sell'
  const [amount, setAmount] = useState('');
  const [trades, setTrades] = useState([]);
  const [userShares, setUserShares] = useState({ yes: 0, no: 0 });

  // Calculate price based on liquidity (simplified AMM)
  const totalLiquidity = (match.marketYesLiquidity || 0) + (match.marketNoLiquidity || 0);
  const yesPrice = totalLiquidity === 0 ? 0.5 : (match.marketYesLiquidity || 0) / totalLiquidity;
  const noPrice = totalLiquidity === 0 ? 0.5 : (match.marketNoLiquidity || 0) / totalLiquidity;

  useEffect(() => {
    // Fetch user's shares and recent trades
    fetchMarketData();
  }, [match._id, user]);

  const fetchMarketData = async () => {
    try {
      // In a real implementation, fetch user shares and trades from API
      // For now, using mock data
      setTrades([
        { id: 1, type: 'buy', option: 'yes', amount: 0.5, price: yesPrice, timestamp: new Date() },
        { id: 2, type: 'sell', option: 'no', amount: 0.3, price: noPrice, timestamp: new Date() },
      ]);
    } catch (error) {
      console.error('Error fetching market data:', error);
    }
  };

  const handleTrade = async () => {
    if (!user) {
      showNotification('Please login to trade', 'warning');
      return;
    }

    if (!selectedOption) {
      showNotification('Please select YES or NO', 'warning');
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      showNotification('Please enter a valid amount', 'warning');
      return;
    }

    try {
      // In real implementation, call API to execute trade
      showNotification(`${tradeType === 'buy' ? 'Buy' : 'Sell'} order placed successfully!`, 'success');
      setAmount('');
      fetchMarketData();
    } catch (error) {
      showNotification(error.response?.data?.message || 'Trade failed', 'error');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            {match.teamA} vs {match.teamB}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {new Date(match.date).toLocaleDateString()} • {match.stageName}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main Content - Chart and Trades Table */}
          <div className="lg:col-span-3 space-y-6">
            {/* Price Chart */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                Price Chart
              </h2>
              <div className="h-64 flex items-center justify-center border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
                <div className="text-center">
                  <p className="text-gray-500 dark:text-gray-400 mb-2">Price Chart</p>
                  <div className="flex items-center justify-center space-x-8">
                    <div className="text-center">
                      <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                        {(yesPrice * 100).toFixed(1)}%
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">YES</p>
                    </div>
                    <div className="text-center">
                      <p className="text-3xl font-bold text-red-600 dark:text-red-400">
                        {(noPrice * 100).toFixed(1)}%
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">NO</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Trades Table */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                Recent Trades
              </h2>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Type</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Option</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Amount</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Price</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Time</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {trades.length > 0 ? (
                      trades.map((trade) => (
                        <tr key={trade.id}>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className={`px-2 py-1 rounded text-xs ${
                              trade.type === 'buy' 
                                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                            }`}>
                              {trade.type.toUpperCase()}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm font-medium">
                            <span className={trade.option === 'yes' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                              {trade.option.toUpperCase()}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                            {trade.amount} ETH
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                            {(trade.price * 100).toFixed(2)}%
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            {trade.timestamp.toLocaleTimeString()}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="5" className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                          No trades yet
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Sidebar - Trading Panel */}
          <aside className="lg:col-span-1">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 sticky top-24">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                Trade
              </h2>

              {/* Trade Type Toggle */}
              <div className="flex mb-4 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                <button
                  onClick={() => setTradeType('buy')}
                  className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    tradeType === 'buy'
                      ? 'bg-green-500 text-white'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  Buy
                </button>
                <button
                  onClick={() => setTradeType('sell')}
                  className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    tradeType === 'sell'
                      ? 'bg-red-500 text-white'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  Sell
                </button>
              </div>

              {/* Option Selection */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Select Option
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setSelectedOption('yes')}
                    className={`px-4 py-3 rounded-lg font-semibold transition-colors ${
                      selectedOption === 'yes'
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    YES
                    <div className="text-xs mt-1">{(yesPrice * 100).toFixed(1)}%</div>
                  </button>
                  <button
                    onClick={() => setSelectedOption('no')}
                    className={`px-4 py-3 rounded-lg font-semibold transition-colors ${
                      selectedOption === 'no'
                        ? 'bg-red-500 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    NO
                    <div className="text-xs mt-1">{(noPrice * 100).toFixed(1)}%</div>
                  </button>
                </div>
              </div>

              {/* Amount Input */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Amount (ETH)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                  placeholder="0.0"
                />
                {selectedOption && amount && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    You'll receive ~{((parseFloat(amount) || 0) / (selectedOption === 'yes' ? yesPrice : noPrice)).toFixed(4)} shares
                  </p>
                )}
              </div>

              {/* Trade Button */}
              <button
                onClick={handleTrade}
                disabled={!selectedOption || !amount}
                className={`w-full px-4 py-3 rounded-lg font-semibold transition-colors ${
                  tradeType === 'buy'
                    ? 'bg-green-500 hover:bg-green-600 text-white'
                    : 'bg-red-500 hover:bg-red-600 text-white'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {tradeType === 'buy' ? 'Buy' : 'Sell'} {selectedOption?.toUpperCase() || ''}
              </button>

              {/* User Holdings */}
              {user && (
                <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
                    Your Holdings
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">YES Shares:</span>
                      <span className="font-medium text-gray-900 dark:text-white">{userShares.yes}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">NO Shares:</span>
                      <span className="font-medium text-gray-900 dark:text-white">{userShares.no}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};

export default MatchDetail;
