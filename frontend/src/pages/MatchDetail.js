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
      const response = await api.get(`/predictions/match/${matchId}/user`);
      setPrediction(response.data);
    } catch (error) {
      // User hasn't predicted yet
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
  const [yesShares, setYesShares] = useState(match.marketYesShares || 0);
  const [noShares, setNoShares] = useState(match.marketNoShares || 0);
  const [buyAmount, setBuyAmount] = useState('');
  const [sellAmount, setSellAmount] = useState('');

  // Calculate price based on liquidity (simplified AMM)
  const totalLiquidity = (match.marketYesLiquidity || 0) + (match.marketNoLiquidity || 0);
  const yesPrice = totalLiquidity === 0 ? 0.5 : (match.marketYesLiquidity || 0) / totalLiquidity;
  const noPrice = totalLiquidity === 0 ? 0.5 : (match.marketNoLiquidity || 0) / totalLiquidity;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            {match.teamA} vs {match.teamB}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {new Date(match.date).toLocaleDateString()} • {match.stageName}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Market Stats */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                Market Statistics
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-green-50 dark:bg-green-900 rounded-lg p-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400">YES Price</p>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {(yesPrice * 100).toFixed(2)}%
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {yesShares} shares
                  </p>
                </div>
                <div className="bg-red-50 dark:bg-red-900 rounded-lg p-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400">NO Price</p>
                  <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                    {(noPrice * 100).toFixed(2)}%
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {noShares} shares
                  </p>
                </div>
              </div>
            </div>

            {/* Trading Interface */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                Trade
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Buy YES Shares (ETH)
                  </label>
                  <input
                    type="number"
                    value={buyAmount}
                    onChange={(e) => setBuyAmount(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                    placeholder="0.0"
                  />
                  <button 
                    onClick={() => {
                      if (!user) {
                        showNotification('Please login to trade', 'warning');
                        return;
                      }
                      showNotification('Market trading functionality coming soon', 'info');
                    }}
                    className="w-full mt-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                  >
                    Buy YES
                  </button>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Sell Shares (ETH)
                  </label>
                  <input
                    type="number"
                    value={sellAmount}
                    onChange={(e) => setSellAmount(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                    placeholder="0.0"
                  />
                  <button 
                    onClick={() => {
                      if (!user) {
                        showNotification('Please login to trade', 'warning');
                        return;
                      }
                      showNotification('Market trading functionality coming soon', 'info');
                    }}
                    className="w-full mt-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                  >
                    Sell
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar - Sentiment & Comments */}
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
                Market Sentiment
              </h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">YES</span>
                  <span className="font-semibold text-green-600 dark:text-green-400">
                    {(yesPrice * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-green-500 h-2 rounded-full"
                    style={{ width: `${yesPrice * 100}%` }}
                  ></div>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">NO</span>
                  <span className="font-semibold text-red-600 dark:text-red-400">
                    {(noPrice * 100).toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
                Comments
              </h3>
              <div className="space-y-4">
                <textarea
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                  placeholder="Share your thoughts..."
                  rows="3"
                ></textarea>
                <button 
                  onClick={() => {
                    if (!user) {
                      showNotification('Please login to comment', 'warning');
                      return;
                    }
                    showNotification('Comment functionality coming soon', 'info');
                  }}
                  className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                >
                  Comment
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MatchDetail;
