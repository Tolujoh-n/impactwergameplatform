import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../components/Notification';
import Modal from '../components/Modal';

const MatchDetail = () => {
  const { matchId, pollId, type } = useParams();
  const [match, setMatch] = useState(null);
  const [poll, setPoll] = useState(null);
  const [loading, setLoading] = useState(true);
  const [prediction, setPrediction] = useState(null);
  const [claimableAmount, setClaimableAmount] = useState(0);
  const { user } = useAuth();
  const navigate = useNavigate();
  const { showNotification } = useNotification();

  const isPoll = !!pollId;
  const itemId = pollId || matchId;

  useEffect(() => {
    fetchData();
    if (user) {
      fetchUserPrediction();
    }
  }, [itemId, user, isPoll]);

  const fetchData = async () => {
    try {
      if (isPoll) {
        const response = await api.get(`/polls/${pollId}`);
        setPoll(response.data);
      } else {
        const response = await api.get(`/matches/${matchId}`);
        setMatch(response.data);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserPrediction = async () => {
    try {
      // Fetch prediction by type to avoid mixing free and boost predictions
      const endpoint = isPoll 
        ? `/predictions/poll/${pollId}/user?type=${type}`
        : `/predictions/match/${matchId}/user?type=${type}`;
      const response = await api.get(endpoint);
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
          [isPoll ? 'pollId' : 'matchId']: itemId,
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
          [isPoll ? 'pollId' : 'matchId']: itemId,
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

  if (!match && !poll) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-600 dark:text-gray-400">{isPoll ? 'Poll' : 'Match'} not found</p>
      </div>
    );
  }

  const item = match || poll;

  if (type === 'free') {
    return <FreeMatchView item={item} isPoll={isPoll} prediction={prediction} onPredict={handlePredict} onClaim={handleClaim} navigate={navigate} />;
  } else if (type === 'boost') {
    return <BoostMatchView item={item} isPoll={isPoll} prediction={prediction} onPredict={handlePredict} onClaim={handleClaim} navigate={navigate} />;
  } else if (type === 'market') {
    return <MarketMatchView item={item} isPoll={isPoll} navigate={navigate} user={user} showNotification={showNotification} />;
  }

  return null;
};

const FreeMatchView = ({ item, isPoll, prediction, onPredict, onClaim, navigate }) => {
  const [showPredictModal, setShowPredictModal] = useState(false);
  const [selectedOutcome, setSelectedOutcome] = useState(null);
  
  const isResolved = item.isResolved;
  const resolvedOutcome = item.result;
  const hasWon = prediction && prediction.status === 'won';
  
  const getOutcomeOptions = () => {
    if (isPoll) {
      return ['YES', 'NO'];
    }
    return [item.teamA, 'Draw', item.teamB];
  };

  const handleBack = () => {
    if (item.cup && item.cup.slug) {
      navigate(`/cup/${item.cup.slug}`);
    } else {
      navigate(-1);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8">
          {/* Back Button */}
          <button
            onClick={handleBack}
            className="flex items-center text-gray-600 dark:text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 mb-6 transition-colors"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span className="font-medium">Back to Cup</span>
          </button>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            {isPoll ? item.question : `${item.teamA} vs ${item.teamB}`}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {isPoll ? item.description : `${new Date(item.date).toLocaleDateString()} • ${item.stageName || ''}`}
          </p>

          {isResolved && (
            <div className="bg-blue-50 dark:bg-blue-900 rounded-lg p-6 mb-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                Resolved Outcome
              </h2>
              <p className="text-lg text-gray-900 dark:text-white">
                Result: <strong>{resolvedOutcome}</strong>
              </p>
            </div>
          )}

          <div className="bg-blue-50 dark:bg-blue-900 rounded-lg p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              FREE Prediction
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Use your daily free ticket to predict the outcome. Earn points and compete for jackpots!
            </p>
          </div>

          {prediction ? (
            <div className={`rounded-lg p-6 mb-6 ${hasWon ? 'bg-green-50 dark:bg-green-900' : 'bg-gray-50 dark:bg-gray-700'}`}>
              <p className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Your Prediction: {prediction.outcome}
              </p>
              {isResolved && (
                <p className={`text-lg mb-2 ${hasWon ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}`}>
                  Status: {prediction.status === 'won' ? '✅ Won' : '❌ Lost'}
                </p>
              )}
              {hasWon && isResolved && (
                <button
                  onClick={onClaim}
                  className="mt-4 px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                >
                  Claim Rewards
                </button>
              )}
            </div>
          ) : !isResolved ? (
            <div className="space-y-4">
              {getOutcomeOptions().map((option) => (
                <button
                  key={option}
                  onClick={() => {
                    setSelectedOutcome(option);
                    setShowPredictModal(true);
                  }}
                  className="w-full px-6 py-4 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg text-lg font-semibold text-gray-900 dark:text-white transition-colors"
                >
                  {option} {isPoll ? '' : 'Wins'}
                </button>
              ))}
            </div>
          ) : (
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6">
              <p className="text-gray-600 dark:text-gray-400">This {isPoll ? 'poll' : 'match'} has been resolved. Predictions are closed.</p>
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

const BoostMatchView = ({ item, isPoll, prediction, onPredict, onClaim, navigate }) => {
  const [showPredictModal, setShowPredictModal] = useState(false);
  const [selectedOutcome, setSelectedOutcome] = useState(null);
  const [amount, setAmount] = useState('');
  
  const isResolved = item.isResolved;
  const resolvedOutcome = item.result;
  const hasWon = prediction && prediction.status === 'won';
  
  const getOutcomeOptions = () => {
    if (isPoll) {
      return ['YES', 'NO'];
    }
    return [item.teamA, 'Draw', item.teamB];
  };

  const handleBack = () => {
    if (item.cup && item.cup.slug) {
      navigate(`/cup/${item.cup.slug}`);
    } else {
      navigate(-1);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8">
          {/* Back Button */}
          <button
            onClick={handleBack}
            className="flex items-center text-gray-600 dark:text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 mb-6 transition-colors"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span className="font-medium">Back to Cup</span>
          </button>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            {isPoll ? item.question : `${item.teamA} vs ${item.teamB}`}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {isPoll ? item.description : `${new Date(item.date).toLocaleDateString()} • ${item.stageName || ''}`}
          </p>

          {isResolved && (
            <div className="bg-blue-50 dark:bg-blue-900 rounded-lg p-6 mb-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                Resolved Outcome
              </h2>
              <p className="text-lg text-gray-900 dark:text-white">
                Result: <strong>{resolvedOutcome}</strong>
              </p>
            </div>
          )}

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
            <div className={`rounded-lg p-6 mb-6 ${hasWon ? 'bg-green-50 dark:bg-green-900' : 'bg-gray-50 dark:bg-gray-700'}`}>
              <p className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Your Prediction: {prediction.outcome}
              </p>
              <p className="text-gray-600 dark:text-gray-400 mb-2">
                Staked Amount: {prediction.amount} ETH
              </p>
              {isResolved && (
                <p className={`text-lg mb-2 ${hasWon ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}`}>
                  Status: {prediction.status === 'won' ? '✅ Won' : '❌ Lost'}
                </p>
              )}
              {hasWon && isResolved && (
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
          ) : !isResolved ? (
            <div className="space-y-4">
              {getOutcomeOptions().map((option) => (
                <button
                  key={option}
                  onClick={() => {
                    setSelectedOutcome(option);
                    setShowPredictModal(true);
                  }}
                  className="w-full px-6 py-4 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg text-lg font-semibold text-gray-900 dark:text-white transition-colors"
                >
                  {option} {isPoll ? '' : 'Wins'}
                </button>
              ))}
            </div>
          ) : (
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6">
              <p className="text-gray-600 dark:text-gray-400">This {isPoll ? 'poll' : 'match'} has been resolved. Predictions are closed.</p>
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

const MarketMatchView = ({ item, isPoll, navigate, user, showNotification }) => {
  const [selectedOption, setSelectedOption] = useState(null);
  const [tradeType, setTradeType] = useState('buy');
  const [amount, setAmount] = useState('');
  const [trades, setTrades] = useState([]);
  const [userShares, setUserShares] = useState(isPoll ? { yes: 0, no: 0 } : { teamA: 0, teamB: 0, draw: 0 });
  const [prediction, setPrediction] = useState(null);

  // Calculate prices based on liquidity
  let prices = {};
  let totalLiquidity = 0;
  
  if (isPoll) {
    // Poll: YES/NO
    totalLiquidity = (item.marketYesLiquidity || 0) + (item.marketNoLiquidity || 0);
    prices.yes = totalLiquidity === 0 ? 0.5 : (item.marketYesLiquidity || 0) / totalLiquidity;
    prices.no = totalLiquidity === 0 ? 0.5 : (item.marketNoLiquidity || 0) / totalLiquidity;
  } else {
    // Match: TeamA/TeamB/Draw
    totalLiquidity = (item.marketTeamALiquidity || 0) + (item.marketTeamBLiquidity || 0) + (item.marketDrawLiquidity || 0);
    prices.teamA = totalLiquidity === 0 ? 0.333 : (item.marketTeamALiquidity || 0) / totalLiquidity;
    prices.teamB = totalLiquidity === 0 ? 0.333 : (item.marketTeamBLiquidity || 0) / totalLiquidity;
    prices.draw = totalLiquidity === 0 ? 0.333 : (item.marketDrawLiquidity || 0) / totalLiquidity;
  }

  const isResolved = item.isResolved;
  const resolvedOutcome = item.result;
  const hasWon = prediction && prediction.status === 'won';

  useEffect(() => {
    fetchMarketData();
    if (user) {
      fetchUserMarketPrediction();
    }
  }, [item._id, user, isPoll]);

  const fetchMarketData = async () => {
    try {
      // In a real implementation, fetch user shares and trades from API
      // For now, using mock data
      const mockTrades = isPoll 
        ? [
            { id: 1, type: 'buy', option: 'yes', amount: 0.5, price: prices.yes, timestamp: new Date() },
            { id: 2, type: 'sell', option: 'no', amount: 0.3, price: prices.no, timestamp: new Date() },
          ]
        : [
            { id: 1, type: 'buy', option: 'teamA', amount: 0.5, price: prices.teamA, timestamp: new Date() },
            { id: 2, type: 'buy', option: 'draw', amount: 0.3, price: prices.draw, timestamp: new Date() },
          ];
      setTrades(mockTrades);
    } catch (error) {
      console.error('Error fetching market data:', error);
    }
  };

  const fetchUserMarketPrediction = async () => {
    try {
      const endpoint = isPoll 
        ? `/predictions/poll/${item._id}/user?type=market`
        : `/predictions/match/${item._id}/user?type=market`;
      const response = await api.get(endpoint);
      setPrediction(response.data);
    } catch (error) {
      setPrediction(null);
    }
  };

  const handleTrade = async () => {
    if (!user) {
      showNotification('Please login to trade', 'warning');
      return;
    }

    if (!selectedOption) {
      showNotification(`Please select ${isPoll ? 'YES or NO' : 'TeamA, TeamB, or Draw'}`, 'warning');
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
      fetchUserMarketPrediction();
    } catch (error) {
      showNotification(error.response?.data?.message || 'Trade failed', 'error');
    }
  };

  const handleClaim = async () => {
    try {
      await api.post('/claims/claim/all');
      showNotification('Claims processed successfully!', 'success');
      fetchUserMarketPrediction();
    } catch (error) {
      showNotification(error.response?.data?.message || 'Failed to claim', 'error');
    }
  };

  const handleBack = () => {
    if (item.cup && item.cup.slug) {
      navigate(`/cup/${item.cup.slug}`);
    } else {
      navigate(-1);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Back Button */}
        <button
          onClick={handleBack}
          className="flex items-center text-gray-600 dark:text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 mb-4 transition-colors"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          <span className="font-medium">Back to Cup</span>
        </button>
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            {isPoll ? item.question : `${item.teamA} vs ${item.teamB}`}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {isPoll ? item.description : `${new Date(item.date).toLocaleDateString()} • ${item.stageName || ''}`}
          </p>
          {isResolved && (
            <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900 rounded-lg">
              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                Resolved: <strong>{resolvedOutcome}</strong>
              </p>
            </div>
          )}
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
                  <p className="text-gray-500 dark:text-gray-400 mb-4">Price Chart</p>
                  <div className={`flex items-center justify-center ${isPoll ? 'space-x-8' : 'space-x-4'}`}>
                    {isPoll ? (
                      <>
                        <div className="text-center">
                          <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                            {(prices.yes * 100).toFixed(1)}%
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">YES</p>
                        </div>
                        <div className="text-center">
                          <p className="text-3xl font-bold text-red-600 dark:text-red-400">
                            {(prices.no * 100).toFixed(1)}%
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">NO</p>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="text-center">
                          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                            {(prices.teamA * 100).toFixed(1)}%
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{item.teamA}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                            {(prices.draw * 100).toFixed(1)}%
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">Draw</p>
                        </div>
                        <div className="text-center">
                          <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                            {(prices.teamB * 100).toFixed(1)}%
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{item.teamB}</p>
                        </div>
                      </>
                    )}
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
                            <span className={
                              trade.option === 'yes' || trade.option === 'teamA' ? 'text-green-600 dark:text-green-400' :
                              trade.option === 'no' || trade.option === 'teamB' ? 'text-red-600 dark:text-red-400' :
                              'text-purple-600 dark:text-purple-400'
                            }>
                              {trade.option === 'teamA' ? item.teamA : trade.option === 'teamB' ? item.teamB : trade.option.toUpperCase()}
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
                {isPoll ? (
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
                      <div className="text-xs mt-1">{(prices.yes * 100).toFixed(1)}%</div>
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
                      <div className="text-xs mt-1">{(prices.no * 100).toFixed(1)}%</div>
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => setSelectedOption('teamA')}
                      className={`px-3 py-3 rounded-lg font-semibold transition-colors text-sm ${
                        selectedOption === 'teamA'
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                      title={`${item.teamA} Win`}
                    >
                      <div className="truncate">{item.teamA}</div>
                      <div className="text-xs mt-1">{(prices.teamA * 100).toFixed(1)}%</div>
                    </button>
                    <button
                      onClick={() => setSelectedOption('draw')}
                      className={`px-3 py-3 rounded-lg font-semibold transition-colors text-sm ${
                        selectedOption === 'draw'
                          ? 'bg-purple-500 text-white'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      Draw
                      <div className="text-xs mt-1">{(prices.draw * 100).toFixed(1)}%</div>
                    </button>
                    <button
                      onClick={() => setSelectedOption('teamB')}
                      className={`px-3 py-3 rounded-lg font-semibold transition-colors text-sm ${
                        selectedOption === 'teamB'
                          ? 'bg-red-500 text-white'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                      title={`${item.teamB} Win`}
                    >
                      <div className="truncate">{item.teamB}</div>
                      <div className="text-xs mt-1">{(prices.teamB * 100).toFixed(1)}%</div>
                    </button>
                  </div>
                )}
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
                    You'll receive ~{((parseFloat(amount) || 0) / (prices[selectedOption] || 1)).toFixed(4)} shares
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
                {tradeType === 'buy' ? 'Buy' : 'Sell'}{' '}
                {selectedOption === 'yes' ? 'YES' :
                 selectedOption === 'no' ? 'NO' :
                 selectedOption === 'teamA' ? item.teamA :
                 selectedOption === 'teamB' ? item.teamB :
                 selectedOption === 'draw' ? 'Draw' : ''}
              </button>

              {/* User Holdings */}
              {user && (
                <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
                    Your Holdings
                  </h3>
                  <div className="space-y-2 text-sm">
                    {isPoll ? (
                      <>
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">YES Shares:</span>
                          <span className="font-medium text-gray-900 dark:text-white">{userShares.yes}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">NO Shares:</span>
                          <span className="font-medium text-gray-900 dark:text-white">{userShares.no}</span>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">{item.teamA} Shares:</span>
                          <span className="font-medium text-gray-900 dark:text-white">{userShares.teamA}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Draw Shares:</span>
                          <span className="font-medium text-gray-900 dark:text-white">{userShares.draw}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">{item.teamB} Shares:</span>
                          <span className="font-medium text-gray-900 dark:text-white">{userShares.teamB}</span>
                        </div>
                      </>
                    )}
                  </div>
                  {isResolved && hasWon && (
                    <button
                      onClick={handleClaim}
                      className="w-full mt-4 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                    >
                      Claim Winnings
                    </button>
                  )}
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
