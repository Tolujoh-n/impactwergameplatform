import React, { useState, useEffect, useCallback } from 'react';
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
  const { user } = useAuth();
  const navigate = useNavigate();
  const { showNotification } = useNotification();

  const isPoll = !!pollId;
  const itemId = pollId || matchId;

  // Check if predictions are locked
  const isLocked = useCallback(() => {
    const item = match || poll;
    if (!item) return false;
    if (item.status === 'locked') return true;
    if (item.lockedTime) {
      const now = new Date();
      const lockedTime = new Date(item.lockedTime);
      return now >= lockedTime;
    }
    return false;
  }, [match, poll]);

  const fetchData = useCallback(async () => {
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
  }, [isPoll, pollId, matchId]);

  const fetchUserPrediction = useCallback(async () => {
    try {
      // Fetch prediction by type to avoid mixing free and boost predictions
      const endpoint = isPoll 
        ? `/predictions/poll/${pollId}/user?type=${type}`
        : `/predictions/match/${matchId}/user?type=${type}`;
      const response = await api.get(endpoint);
      // Handle both single prediction and array (for market type)
      const predictionData = Array.isArray(response.data) ? response.data[0] : response.data;
      setPrediction(predictionData);
    } catch (error) {
      // User hasn't predicted yet for this type - 404 is expected
      if (error.response?.status !== 404) {
        console.error('Error fetching prediction:', error);
      }
      setPrediction(null);
    }
  }, [isPoll, pollId, matchId, type]);

  useEffect(() => {
    fetchData();
    if (user) {
      fetchUserPrediction();
    }
  }, [itemId, user, isPoll, type, fetchData, fetchUserPrediction]);
  
  // Refresh prediction when item resolution status changes
  useEffect(() => {
    if (user && (match || poll)) {
      const item = match || poll;
      if (item && item.isResolved) {
        // Refresh prediction data when item is resolved
        const timer = setTimeout(() => {
          fetchUserPrediction();
        }, 1000); // Small delay to ensure backend has saved the prediction
        return () => clearTimeout(timer);
      }
    }
  }, [match?.isResolved, poll?.isResolved, user, fetchUserPrediction]);

  const handlePredict = async (outcome, amount = null) => {
    if (!user) {
      showNotification('Please login to make predictions', 'warning');
      return;
    }

    // Check if locked
    const item = match || poll;
    if (item && (item.status === 'locked' || (item.lockedTime && new Date() >= new Date(item.lockedTime)))) {
      showNotification('Predictions are locked for this match/poll', 'error');
      return;
    }

    try {
      // Check if prediction exists and item is still upcoming
      const canUpdate = prediction && item && (item.status === 'upcoming' || item.status === 'active');
      
      if (type === 'free') {
        if (canUpdate) {
          // Update existing prediction
          await api.put(`/predictions/${prediction._id}`, { outcome });
          showNotification('Prediction updated successfully!', 'success');
        } else {
          // Create new prediction
          console.log(`[FREE PREDICTION] Attempting to create prediction for ${isPoll ? 'poll' : 'match'}: ${itemId}, outcome: ${outcome}`);
          try {
            const response = await api.post('/predictions/free', {
              [isPoll ? 'pollId' : 'matchId']: itemId,
              outcome,
              type: 'free',
            });
            console.log('[FREE PREDICTION] Prediction created successfully:', response.data);
            showNotification('Free prediction submitted successfully!', 'success');
          } catch (error) {
            console.error('[FREE PREDICTION] Error creating prediction:', error.response?.data || error.message);
            showNotification(error.response?.data?.message || 'Failed to create prediction', 'error');
            throw error; // Re-throw to prevent further execution
          }
        }
      } else if (type === 'boost') {
        if (canUpdate) {
          // Update existing prediction - amount is automatically preserved
          await api.put(`/predictions/${prediction._id}`, { outcome });
          showNotification('Prediction updated successfully! Your stake amount has been preserved.', 'success');
        } else {
          // Create new prediction - amount is required
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
      }
      
      // Refresh item data to get updated stats (like freePredictions count, boostPool, etc.)
      await fetchData();
      await fetchUserPrediction();
    } catch (error) {
      showNotification(error.response?.data?.message || 'Failed to submit prediction', 'error');
    }
  };

  const handleStakeAction = async (predictionId, action, amount) => {
    try {
      await api.post(`/predictions/boost/${predictionId}/stake`, {
        action, // 'add' or 'withdraw'
        amount: parseFloat(amount),
      });
      showNotification(`Stake ${action === 'add' ? 'added' : 'withdrawn'} successfully!`, 'success');
      await fetchUserPrediction();
      await fetchData(); // Refresh match/poll data to update boost pool
    } catch (error) {
      showNotification(error.response?.data?.message || `Failed to ${action} stake`, 'error');
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

  const locked = isLocked();

  if (type === 'free') {
    return <FreeMatchView item={item} isPoll={isPoll} prediction={prediction} onPredict={handlePredict} onClaim={handleClaim} navigate={navigate} locked={locked} />;
  } else if (type === 'boost') {
    return <BoostMatchView item={item} isPoll={isPoll} prediction={prediction} onPredict={handlePredict} onStakeAction={handleStakeAction} onClaim={handleClaim} navigate={navigate} locked={locked} onRefreshPrediction={fetchUserPrediction} />;
  } else if (type === 'market') {
    return <MarketMatchView 
      item={item} 
      isPoll={isPoll} 
      navigate={navigate} 
      user={user} 
      showNotification={showNotification} 
      locked={locked}
      onItemUpdate={(updatedItem) => {
        if (isPoll) {
          setPoll(updatedItem);
        } else {
          setMatch(updatedItem);
        }
      }}
    />;
  }

  return null;
};

const FreeMatchView = ({ item, isPoll, prediction, onPredict, onClaim, navigate, locked = false }) => {
  const [showPredictModal, setShowPredictModal] = useState(false);
  const [selectedOutcome, setSelectedOutcome] = useState(null);
  
  const isResolved = item.isResolved;
  // Map result to display name: TeamA -> teamA name, TeamB -> teamB name, Draw -> Draw
  const getDisplayResult = () => {
    if (!item.result) return '';
    const result = item.result.trim();
    if (result === 'TeamA' || result.toLowerCase() === 'teama') {
      return item.teamA || 'Team A';
    } else if (result === 'TeamB' || result.toLowerCase() === 'teamb') {
      return item.teamB || 'Team B';
    } else if (result === 'Draw' || result.toLowerCase() === 'draw') {
      return 'Draw';
    }
    // If result is already a team name, return it as is
    return result;
  };
  const resolvedOutcome = getDisplayResult();
  // Check if won: status is 'won' (more robust check like boost)
  const hasWon = prediction && (
    prediction.status === 'won' ||
    (prediction.status === 'settled' && prediction.status !== 'lost') ||
    (isResolved && prediction.outcome && resolvedOutcome && 
     (prediction.outcome.trim().toUpperCase() === resolvedOutcome.trim().toUpperCase() ||
      prediction.outcome.trim() === resolvedOutcome.trim() ||
      (prediction.outcome.trim().toLowerCase() === 'yes' && resolvedOutcome.trim().toUpperCase() === 'YES') ||
      (prediction.outcome.trim().toUpperCase() === 'YES' && resolvedOutcome.trim().toLowerCase() === 'yes')))
  );
  const canPredict = !locked && !isResolved && (item.status === 'upcoming' || item.status === 'active');
  
  const getOutcomeOptions = () => {
    if (isPoll) {
      if (item.optionType === 'options' && item.options) {
        return item.options.map(opt => ({ text: opt.text, image: opt.image }));
      }
      return ['YES', 'NO'];
    }
    return [
      { text: item.teamA, image: item.teamAImage },
      { text: 'Draw', image: null },
      { text: item.teamB, image: item.teamBImage }
    ];
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
          {/* Back Button and Status Tags */}
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={handleBack}
              className="flex items-center text-gray-600 dark:text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 transition-colors"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span className="font-medium">Back to Cup</span>
            </button>
            <div className="flex items-center gap-2">
              {/* Status Tag */}
              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                isPoll 
                  ? (item.status === 'upcoming' ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200' :
                     item.status === 'active' ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200' :
                     item.status === 'locked' ? 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200' :
                     'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200')
                  : (item.status === 'upcoming' ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200' :
                     item.status === 'live' ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200' :
                     item.status === 'locked' ? 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200' :
                     'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200')
              }`}>
                {item.status?.toUpperCase() || 'N/A'}
              </span>
              {/* Resolved Tag */}
              {item.isResolved && (
                <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full text-xs font-semibold">
                  RESOLVED
                </span>
              )}
            </div>
          </div>
          {/* Header with Images */}
          {!isPoll && (
            <div className="flex items-center justify-center gap-8 mb-6">
              <div className="flex flex-col items-center">
                {item.teamAImage && (
                  <img src={item.teamAImage} alt={item.teamA} className="w-24 h-24 object-cover rounded-full mb-2 border-4 border-gray-200 dark:border-gray-700" />
                )}
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">{item.teamA}</h2>
              </div>
              <div className="text-2xl font-bold text-gray-500 dark:text-gray-400">VS</div>
              <div className="flex flex-col items-center">
                {item.teamBImage && (
                  <img src={item.teamBImage} alt={item.teamB} className="w-24 h-24 object-cover rounded-full mb-2 border-4 border-gray-200 dark:border-gray-700" />
                )}
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">{item.teamB}</h2>
              </div>
            </div>
          )}
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4 text-center">
            {isPoll ? item.question : `${item.teamA} vs ${item.teamB}`}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6 text-center">
            {isPoll ? item.description : `${new Date(item.date).toLocaleDateString()} • ${item.stageName || ''}`}
          </p>

          {/* Jackpot Pools Display */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 border border-green-200 dark:border-green-800">
              <div className="text-sm text-green-600 dark:text-green-400 font-semibold mb-1">Free Jackpot Pool</div>
              <div className="text-xl font-bold text-green-700 dark:text-green-300">
                {((item.isResolved && item.originalFreeJackpotPool) ? item.originalFreeJackpotPool : (item.freeJackpotPool || 0)).toFixed(4)} ETH
              </div>
            </div>
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
              <div className="text-sm text-blue-600 dark:text-blue-400 font-semibold mb-1">Boost Jackpot Pool</div>
              <div className="text-xl font-bold text-blue-700 dark:text-blue-300">
                {((item.isResolved && item.originalBoostJackpotPool) ? item.originalBoostJackpotPool : (item.boostJackpotPool || 0)).toFixed(4)} ETH
              </div>
            </div>
          </div>

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
                  Status: {hasWon ? '✅ Won' : '❌ Lost'}
                </p>
              )}
              {!isResolved && (
                <p className="text-gray-600 dark:text-gray-400 mb-2">
                  Status: Pending
                </p>
              )}
              {canPredict && (
                <button
                  onClick={() => {
                    setSelectedOutcome(prediction.outcome);
                    setShowPredictModal(true);
                  }}
                  className="mt-4 px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                >
                  Update Prediction
                </button>
              )}
              {locked && (
                <p className="mt-4 px-4 py-2 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 rounded-lg">
                  Predictions are locked for this match/poll
                </p>
              )}
            </div>
          ) : isResolved ? (
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6 mb-6">
              <p className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                You did not predict
              </p>
              <p className="text-gray-600 dark:text-gray-400">
                This {isPoll ? 'poll' : 'match'} has been resolved, but you did not make a prediction for it.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {getOutcomeOptions().map((option, index) => {
                const optionText = typeof option === 'string' ? option : option.text;
                const optionImage = typeof option === 'object' ? option.image : null;
                return (
                  <button
                    key={optionText}
                    onClick={() => {
                      setSelectedOutcome(optionText);
                      setShowPredictModal(true);
                    }}
                    className="w-full px-6 py-4 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg text-lg font-semibold text-gray-900 dark:text-white transition-colors flex items-center justify-center gap-3"
                  >
                    {optionImage && (
                      <img src={optionImage} alt={optionText} className="w-12 h-12 object-cover rounded-full" />
                    )}
                    <span>{optionText} {isPoll ? '' : 'Wins'}</span>
                  </button>
                );
              })}
            </div>
          )}

          {showPredictModal && (
            <Modal isOpen={true} onClose={() => setShowPredictModal(false)} title={prediction ? "Update Prediction" : "Confirm Prediction"}>
              <div className="space-y-4">
                <p className="text-gray-700 dark:text-gray-300 mb-4">
                  {prediction ? "Select a new outcome:" : "Select your prediction:"}
                </p>
                <div className="space-y-2">
                  {getOutcomeOptions().map((option, index) => {
                    const optionText = typeof option === 'string' ? option : option.text;
                    const optionImage = typeof option === 'object' ? option.image : null;
                    return (
                      <button
                        key={optionText}
                        onClick={() => {
                          if (!locked) {
                            onPredict(optionText);
                            setShowPredictModal(false);
                          }
                        }}
                        disabled={locked}
                        className={`w-full px-4 py-3 rounded-lg font-semibold transition-colors flex items-center justify-center gap-3 ${
                          locked
                            ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                            : selectedOutcome === optionText
                            ? 'bg-blue-500 text-white'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                        }`}
                      >
                        {optionImage && (
                          <img src={optionImage} alt={optionText} className="w-8 h-8 object-cover rounded-full" />
                        )}
                        <span>{optionText} {isPoll ? '' : 'Wins'}</span>
                      </button>
                    );
                  })}
                </div>
                <button
                  onClick={() => setShowPredictModal(false)}
                  className="w-full px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
                >
                  Cancel
                </button>
              </div>
            </Modal>
          )}
        </div>
      </div>
    </div>
  );
};

const BoostMatchView = ({ item, isPoll, prediction, onPredict, onStakeAction, onClaim, navigate, locked = false, onRefreshPrediction }) => {
  const [showPredictModal, setShowPredictModal] = useState(false);
  const [showStakeModal, setShowStakeModal] = useState(false);
  const [selectedOutcome, setSelectedOutcome] = useState(null);
  const [amount, setAmount] = useState('');
  const [stakeAction, setStakeAction] = useState('add'); // 'add' or 'withdraw'
  const [stakeAmount, setStakeAmount] = useState('');
  const [fees, setFees] = useState({ platformFee: 10, boostJackpotFee: 10 });
  const { showNotification } = useNotification();
  
  // Fetch fees on mount
  useEffect(() => {
    const fetchFees = async () => {
      try {
        const response = await api.get('/superadmin/get-fees');
        setFees(response.data);
      } catch (error) {
        console.error('Error fetching fees:', error);
      }
    };
    fetchFees();
  }, []);
  
  const isResolved = item.isResolved;
  // Map result to display name: TeamA -> teamA name, TeamB -> teamB name, Draw -> Draw
  const getDisplayResult = () => {
    if (!item.result) return '';
    const result = item.result.trim();
    if (result === 'TeamA' || result.toLowerCase() === 'teama') {
      return item.teamA || 'Team A';
    } else if (result === 'TeamB' || result.toLowerCase() === 'teamb') {
      return item.teamB || 'Team B';
    } else if (result === 'Draw' || result.toLowerCase() === 'draw') {
      return 'Draw';
    }
    // If result is already a team name, return it as is
    return result;
  };
  const resolvedOutcome = getDisplayResult();
  // Check if won: status is 'won' OR (status is 'settled' and payout > 0) OR (payout > 0 and status is not 'lost')
  const hasWon = prediction && (
    prediction.status === 'won' || 
    (prediction.status === 'settled' && (prediction.payout || 0) > 0) ||
    ((prediction.payout || 0) > 0 && prediction.status !== 'lost')
  );
  const canModify = !locked && !isResolved && (item.status === 'upcoming' || item.status === 'active');
  
  const getOutcomeOptions = () => {
    if (isPoll) {
      if (item.optionType === 'options' && item.options) {
        return item.options.map(opt => ({ text: opt.text, image: opt.image }));
      }
      return ['YES', 'NO'];
    }
    return [
      { text: item.teamA, image: item.teamAImage },
      { text: 'Draw', image: null },
      { text: item.teamB, image: item.teamBImage }
    ];
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
          {/* Back Button and Status Tags */}
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={handleBack}
              className="flex items-center text-gray-600 dark:text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 transition-colors"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span className="font-medium">Back to Cup</span>
            </button>
            <div className="flex items-center gap-2">
              {/* Status Tag */}
              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                isPoll 
                  ? (item.status === 'upcoming' ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200' :
                     item.status === 'active' ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200' :
                     item.status === 'locked' ? 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200' :
                     'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200')
                  : (item.status === 'upcoming' ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200' :
                     item.status === 'live' ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200' :
                     item.status === 'locked' ? 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200' :
                     'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200')
              }`}>
                {item.status?.toUpperCase() || 'N/A'}
              </span>
              {/* Resolved Tag */}
              {item.isResolved && (
                <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full text-xs font-semibold">
                  RESOLVED
                </span>
              )}
            </div>
          </div>
          {/* Header with Images */}
          {!isPoll && (
            <div className="flex items-center justify-center gap-8 mb-6">
              <div className="flex flex-col items-center">
                {item.teamAImage && (
                  <img src={item.teamAImage} alt={item.teamA} className="w-24 h-24 object-cover rounded-full mb-2 border-4 border-gray-200 dark:border-gray-700" />
                )}
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">{item.teamA}</h2>
              </div>
              <div className="text-2xl font-bold text-gray-500 dark:text-gray-400">VS</div>
              <div className="flex flex-col items-center">
                {item.teamBImage && (
                  <img src={item.teamBImage} alt={item.teamB} className="w-24 h-24 object-cover rounded-full mb-2 border-4 border-gray-200 dark:border-gray-700" />
                )}
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">{item.teamB}</h2>
              </div>
            </div>
          )}
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4 text-center">
            {isPoll ? item.question : `${item.teamA} vs ${item.teamB}`}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6 text-center">
            {isPoll ? item.description : `${new Date(item.date).toLocaleDateString()} • ${item.stageName || ''}`}
          </p>

          {/* Jackpot Pools Display */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 border border-green-200 dark:border-green-800">
              <div className="text-sm text-green-600 dark:text-green-400 font-semibold mb-1">Free Jackpot Pool</div>
              <div className="text-xl font-bold text-green-700 dark:text-green-300">
                {((item.isResolved && item.originalFreeJackpotPool) ? item.originalFreeJackpotPool : (item.freeJackpotPool || 0)).toFixed(4)} ETH
              </div>
            </div>
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
              <div className="text-sm text-blue-600 dark:text-blue-400 font-semibold mb-1">Boost Jackpot Pool</div>
              <div className="text-xl font-bold text-blue-700 dark:text-blue-300">
                {((item.isResolved && item.originalBoostJackpotPool) ? item.originalBoostJackpotPool : (item.boostJackpotPool || 0)).toFixed(4)} ETH
              </div>
            </div>
          </div>

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
              {fees.platformFee || 10}% platform fee • {fees.boostJackpotFee || 10}% boost jackpot fee • Game locks at kickoff
            </p>
          </div>

          {prediction ? (
            <div className={`rounded-lg p-6 mb-6 ${hasWon ? 'bg-green-50 dark:bg-green-900' : 'bg-gray-50 dark:bg-gray-700'}`}>
              <p className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Your Prediction: {prediction.outcome}
              </p>
              <p className="text-gray-600 dark:text-gray-400 mb-2">
                Staked Amount: {(prediction.totalStake || prediction.amount || 0).toFixed(4)} ETH
              </p>
              {isResolved && (
                <>
                  <p className={`text-lg mb-2 ${hasWon ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}`}>
                    Status: {hasWon ? '✅ Won' : '❌ Lost'}
                  </p>
                  {hasWon ? (
                    prediction.claimed ? (
                      <div className="mt-4 p-3 bg-gray-100 dark:bg-gray-700 rounded-lg">
                        <p className="text-sm text-gray-600 dark:text-gray-400">Reward claimed</p>
                        <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                          Payout: {(prediction.payout || 0).toFixed(4)} ETH
                        </p>
                      </div>
                    ) : (
                      <div className="mt-4">
                        <p className="text-gray-600 dark:text-gray-400 mb-2">
                          Your Win: {(prediction.payout || 0).toFixed(4)} ETH
                        </p>
                        <button
                          onClick={async () => {
                            try {
                              await api.post(`/predictions/${prediction._id}/claim`);
                              showNotification('Payout claimed successfully!', 'success');
                              // Refresh prediction data
                              if (onRefreshPrediction) {
                                await onRefreshPrediction();
                              } else {
                                window.location.reload();
                              }
                            } catch (error) {
                              showNotification(error.response?.data?.message || 'Failed to claim', 'error');
                            }
                          }}
                          disabled={prediction.claimed}
                          className={`px-6 py-2 rounded-lg transition-colors ${
                            prediction.claimed
                              ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                              : 'bg-green-500 text-white hover:bg-green-600'
                          }`}
                        >
                          {prediction.claimed ? 'Reward Claimed' : 'Claim Rewards'}
                        </button>
                      </div>
                    )
                  ) : (
                    <div className="mt-4 p-3 bg-gray-100 dark:bg-gray-700 rounded-lg">
                      <p className="text-sm text-gray-600 dark:text-gray-400">You did not win this prediction</p>
                      <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                        Your stake was moved to the winning option
                      </p>
                    </div>
                  )}
                </>
              )}
              {canModify && !isResolved && (
                <div className="flex flex-wrap gap-2 mt-4">
                  <button
                    onClick={() => {
                      if (!locked) {
                        setSelectedOutcome(prediction.outcome);
                        setShowPredictModal(true);
                      }
                    }}
                    disabled={locked}
                    className={`px-4 py-2 rounded-lg transition-colors ${
                      locked
                        ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                        : 'bg-blue-500 text-white hover:bg-blue-600'
                    }`}
                  >
                    Update Prediction
                  </button>
                  <button
                    onClick={() => {
                      if (!locked) {
                        setStakeAction('add');
                        setShowStakeModal(true);
                      }
                    }}
                    disabled={locked}
                    className={`px-4 py-2 rounded-lg transition-colors ${
                      locked
                        ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                        : 'bg-green-500 text-white hover:bg-green-600'
                    }`}
                  >
                    Add Stake
                  </button>
                  <button
                    onClick={() => {
                      if (!locked) {
                        setStakeAction('withdraw');
                        setShowStakeModal(true);
                      }
                    }}
                    disabled={locked}
                    className={`px-4 py-2 rounded-lg transition-colors ${
                      locked
                        ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                        : 'bg-orange-500 text-white hover:bg-orange-600'
                    }`}
                  >
                    Withdraw Stake
                  </button>
                </div>
              )}
              {locked && !isResolved && (
                <p className="mt-4 px-4 py-2 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 rounded-lg">
                  Predictions are locked for this match/poll
                </p>
              )}
            </div>
          ) : !isResolved ? (
            <div className="space-y-4">
              {getOutcomeOptions().map((option, index) => {
                const optionText = typeof option === 'string' ? option : option.text;
                const optionImage = typeof option === 'object' ? option.image : null;
                return (
                  <button
                    key={optionText}
                    onClick={() => {
                      setSelectedOutcome(optionText);
                      setShowPredictModal(true);
                    }}
                    className="w-full px-6 py-4 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg text-lg font-semibold text-gray-900 dark:text-white transition-colors flex items-center justify-center gap-3"
                  >
                    {optionImage && (
                      <img src={optionImage} alt={optionText} className="w-12 h-12 object-cover rounded-full" />
                    )}
                    <span>{optionText} {isPoll ? '' : 'Wins'}</span>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6">
              <p className="text-gray-600 dark:text-gray-400">This {isPoll ? 'poll' : 'match'} has been resolved. Predictions are closed.</p>
            </div>
          )}

          {showPredictModal && (
            <Modal isOpen={true} onClose={() => setShowPredictModal(false)} title={prediction ? "Update Boost Prediction" : "Enter Boost Prediction"}>
              <div className="space-y-4">
                {prediction && (
                  <div className="bg-blue-50 dark:bg-blue-900 rounded-lg p-4 mb-4">
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      <strong>Current Stake:</strong> {(prediction.totalStake || prediction.amount || 0).toFixed(4)} ETH
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                      Your stake amount will be automatically preserved when you update the outcome.
                    </p>
                  </div>
                )}
                <p className="text-gray-700 dark:text-gray-300 mb-4">
                  {prediction ? "Select a new outcome:" : "Select your prediction:"}
                </p>
                <div className="space-y-2">
                  {getOutcomeOptions().map((option, index) => {
                    const optionText = typeof option === 'string' ? option : option.text;
                    const optionImage = typeof option === 'object' ? option.image : null;
                    return (
                      <button
                        key={optionText}
                        onClick={() => {
                          if (!locked) {
                            setSelectedOutcome(optionText);
                          }
                        }}
                        disabled={locked}
                        className={`w-full px-4 py-3 rounded-lg font-semibold transition-colors flex items-center justify-center gap-3 ${
                          locked
                            ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                            : selectedOutcome === optionText
                            ? 'bg-blue-500 text-white'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                        }`}
                      >
                        {optionImage && (
                          <img src={optionImage} alt={optionText} className="w-8 h-8 object-cover rounded-full" />
                        )}
                        <span>{optionText} {isPoll ? '' : 'Wins'}</span>
                      </button>
                    );
                  })}
                </div>
                {!prediction && selectedOutcome && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      ETH Amount
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="ETH Amount"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:text-white"
                      required
                    />
                  </div>
                )}
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  <p>{fees.platformFee || 10}% platform fee • {fees.boostJackpotFee || 10}% boost jackpot fee</p>
                  <p>Game locks at kickoff</p>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => {
                      if (!locked) {
                        if (prediction && selectedOutcome) {
                          // Update existing prediction - amount is automatically preserved
                          onPredict(selectedOutcome);
                          setShowPredictModal(false);
                        } else if (selectedOutcome && amount) {
                          // Create new prediction
                          onPredict(selectedOutcome, amount);
                          setShowPredictModal(false);
                          setAmount('');
                        }
                      }
                    }}
                    disabled={locked || !selectedOutcome || (!prediction && !amount)}
                    className={`flex-1 px-4 py-2 rounded-lg ${
                      locked
                        ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                        : 'bg-blue-500 text-white hover:bg-blue-600'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {prediction ? 'Update' : 'Confirm'}
                  </button>
                  <button
                    onClick={() => {
                      setShowPredictModal(false);
                      setAmount('');
                      setSelectedOutcome(null);
                    }}
                    className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </Modal>
          )}

          {showStakeModal && prediction && (
            <Modal isOpen={true} onClose={() => setShowStakeModal(false)} title={stakeAction === 'add' ? 'Add Stake' : 'Withdraw Stake'}>
              <div className="space-y-4">
                <p className="text-gray-700 dark:text-gray-300">
                  Current Stake: <strong>{(prediction.totalStake || prediction.amount || 0).toFixed(4)} ETH</strong>
                </p>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {stakeAction === 'add' ? 'Amount to Add' : 'Amount to Withdraw'}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder={`ETH Amount (Max: ${stakeAction === 'withdraw' ? (prediction.totalStake || prediction.amount || 0).toFixed(4) : 'unlimited'})`}
                    value={stakeAmount}
                    onChange={(e) => setStakeAmount(e.target.value)}
                    className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:text-white"
                    required
                  />
                </div>
                {stakeAction === 'withdraw' && (
                  <button
                    onClick={() => {
                      const maxAmount = (prediction.totalStake || prediction.amount || 0).toFixed(4);
                      setStakeAmount(maxAmount);
                    }}
                    className="w-full px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
                  >
                    Max
                  </button>
                )}
                <div className="flex space-x-2">
                  <button
                    onClick={() => {
                      if (!locked && stakeAmount) {
                        onStakeAction(prediction._id, stakeAction, stakeAmount);
                        setShowStakeModal(false);
                        setStakeAmount('');
                      }
                    }}
                    disabled={locked}
                    className={`flex-1 px-4 py-2 rounded-lg ${
                      locked
                        ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                        : stakeAction === 'add' 
                        ? 'bg-green-500 text-white hover:bg-green-600' 
                        : 'bg-orange-500 text-white hover:bg-orange-600'
                    }`}
                  >
                    {stakeAction === 'add' ? 'Add' : 'Withdraw'}
                  </button>
                  <button
                    onClick={() => {
                      setShowStakeModal(false);
                      setStakeAmount('');
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

const MarketMatchView = ({ item, isPoll, navigate, user, showNotification, locked = false, onItemUpdate }) => {
  const [selectedOption, setSelectedOption] = useState(null);
  const [tradeType, setTradeType] = useState('buy');
  const [amount, setAmount] = useState('');
  const [trades, setTrades] = useState([]);
  const [predictions, setPredictions] = useState({}); // Map of outcome -> prediction
  const [prices, setPrices] = useState({});
  const [priceAmounts, setPriceAmounts] = useState({}); // ETH amounts for each option
  const [currentItem, setCurrentItem] = useState(item);

  // Computed value for itemData - always use currentItem if available, fallback to item
  const itemData = currentItem || item;
  
  // Check if resolved
  const isResolved = itemData.isResolved || itemData.status === 'settled' || itemData.status === 'completed';
  // Map result to display name: TeamA -> teamA name, TeamB -> teamB name, Draw -> Draw
  const getDisplayResult = () => {
    if (!itemData.result) return '';
    const result = itemData.result.trim();
    if (result === 'TeamA' || result.toLowerCase() === 'teama') {
      return itemData.teamA || 'Team A';
    } else if (result === 'TeamB' || result.toLowerCase() === 'teamb') {
      return itemData.teamB || 'Team B';
    } else if (result === 'Draw' || result.toLowerCase() === 'draw') {
      return 'Draw';
    }
    // If result is already a team name, return it as is
    return result;
  };
  const resolvedOutcome = getDisplayResult();
  
  // Calculate winning predictions
  const winningPredictions = Object.values(predictions).filter(pred => 
    pred.status === 'won' || pred.status === 'settled'
  );
  const hasWon = winningPredictions.length > 0;

  // Update currentItem when item prop changes
  useEffect(() => {
    setCurrentItem(item);
  }, [item]);

  // Calculate prices and price amounts (ETH) based on liquidity
  useEffect(() => {
    let calculatedPrices = {};
    let calculatedPriceAmounts = {};
    let totalLiquidity = 0;
    
    if (isPoll) {
      // Poll: Handle option-based or Yes/No
      if (itemData.optionType === 'options' && itemData.options && Array.isArray(itemData.options)) {
        totalLiquidity = itemData.options.reduce((sum, opt) => sum + (parseFloat(opt.liquidity) || 0), 0);
        itemData.options.forEach(opt => {
          const optLiquidity = parseFloat(opt.liquidity) || 0;
          const defaultPrice = 1 / itemData.options.length;
          // Round all prices to 4 decimal places
          calculatedPrices[opt.text] = totalLiquidity === 0 
            ? parseFloat(defaultPrice.toFixed(4)) 
            : parseFloat((optLiquidity / totalLiquidity).toFixed(4));
          calculatedPriceAmounts[opt.text] = optLiquidity;
        });
      } else {
        // Normal Yes/No poll
        const yesLiq = parseFloat(itemData.marketYesLiquidity) || 0;
        const noLiq = parseFloat(itemData.marketNoLiquidity) || 0;
        totalLiquidity = yesLiq + noLiq;
        // Round all prices to 4 decimal places
        calculatedPrices.yes = totalLiquidity === 0 
          ? parseFloat((0.5).toFixed(4)) 
          : parseFloat((yesLiq / totalLiquidity).toFixed(4));
        calculatedPrices.no = totalLiquidity === 0 
          ? parseFloat((0.5).toFixed(4)) 
          : parseFloat((noLiq / totalLiquidity).toFixed(4));
        calculatedPriceAmounts.yes = yesLiq;
        calculatedPriceAmounts.no = noLiq;
      }
    } else {
      // Match: TeamA/TeamB/Draw
      // Parse liquidity values to ensure they're numbers
      const teamALiq = parseFloat(itemData.marketTeamALiquidity) || 0;
      const teamBLiq = parseFloat(itemData.marketTeamBLiquidity) || 0;
      const drawLiq = parseFloat(itemData.marketDrawLiquidity) || 0;
      totalLiquidity = teamALiq + teamBLiq + drawLiq;
      
      // Price = liquidity / total (ensures sum = 1.0)
      // Example: TeamA=2, Draw=1, TeamB=1, Total=4
      // TeamA price = 2/4 = 0.50, Draw = 1/4 = 0.25, TeamB = 1/4 = 0.25
      // Round all prices to 4 decimal places
      calculatedPrices.teamA = totalLiquidity === 0 
        ? parseFloat((0.333).toFixed(4)) 
        : parseFloat((teamALiq / totalLiquidity).toFixed(4));
      calculatedPrices.teamB = totalLiquidity === 0 
        ? parseFloat((0.333).toFixed(4)) 
        : parseFloat((teamBLiq / totalLiquidity).toFixed(4));
      calculatedPrices.draw = totalLiquidity === 0 
        ? parseFloat((0.333).toFixed(4)) 
        : parseFloat((drawLiq / totalLiquidity).toFixed(4));
      calculatedPriceAmounts.teamA = teamALiq;
      calculatedPriceAmounts.teamB = teamBLiq;
      calculatedPriceAmounts.draw = drawLiq;
      
      // Debug logging for matches
      console.log('Match Price Calculation:', {
        teamALiq,
        teamBLiq,
        drawLiq,
        totalLiquidity,
        prices: calculatedPrices,
        priceSum: calculatedPrices.teamA + calculatedPrices.teamB + calculatedPrices.draw
      });
    }
    
    setPrices(calculatedPrices);
    setPriceAmounts(calculatedPriceAmounts);
    
    // Debug: Log price sum to verify it equals 1.0
    const priceSum = Object.values(calculatedPrices).reduce((sum, price) => sum + price, 0);
    if (Math.abs(priceSum - 1.0) > 0.01) {
      console.warn('Prices do not sum to 1.0:', priceSum, calculatedPrices);
    }
  }, [currentItem, item, isPoll, itemData.marketTeamALiquidity, itemData.marketTeamBLiquidity, itemData.marketDrawLiquidity, itemData.marketYesLiquidity, itemData.marketNoLiquidity, itemData.options]);

  const fetchMarketData = useCallback(async () => {
    try {
      const itemId = (currentItem || item)?._id || item?._id;
      const response = await api.get(`/predictions/market/${itemId}/data?type=${isPoll ? 'poll' : 'match'}`);
      setTrades(response.data.recentTrades || []);
      
      // Update prices from API
      if (response.data.prices) {
        setPrices(response.data.prices);
      }
    } catch (error) {
      console.error('Error fetching market data:', error);
    }
  }, [currentItem, item, isPoll]);

  const fetchUserMarketPrediction = useCallback(async () => {
    try {
      const itemId = (currentItem || item)?._id || item?._id;
      const endpoint = isPoll 
        ? `/predictions/poll/${itemId}/user?type=market`
        : `/predictions/match/${itemId}/user?type=market`;
      const response = await api.get(endpoint);
      
      // Handle array of predictions (one per option)
      const predictionsArray = Array.isArray(response.data) ? response.data : (response.data ? [response.data] : []);
      
      // Convert to map by outcome
      const predictionsMap = {};
      predictionsArray.forEach(pred => {
        const outcome = pred.outcome;
        predictionsMap[outcome] = pred;
      });
      
      setPredictions(predictionsMap);
    } catch (error) {
      setPredictions({});
    }
  }, [currentItem, item, isPoll]);

  useEffect(() => {
    fetchMarketData();
    if (user) {
      fetchUserMarketPrediction();
    }
    
    // Set up polling to refresh market data every 2 seconds for real-time updates
    const interval = setInterval(() => {
      fetchMarketData();
      if (user) {
        fetchUserMarketPrediction();
      }
      // Also refresh item data to get latest liquidity
      const itemId = (currentItem || item)?._id || item?._id;
      if (itemId) {
        const refreshItem = async () => {
          try {
            const itemResponse = isPoll 
              ? await api.get(`/polls/${itemId}`)
              : await api.get(`/matches/${itemId}`);
            setCurrentItem(itemResponse.data);
            if (onItemUpdate) {
              onItemUpdate(itemResponse.data);
            }
          } catch (error) {
            console.error('Error refreshing item:', error);
          }
        };
        refreshItem();
      }
    }, 2000);
    
    return () => clearInterval(interval);
  }, [currentItem, item, user, isPoll, fetchMarketData, fetchUserMarketPrediction]);

  const handleTrade = async () => {
    if (!user) {
      showNotification('Please login to trade', 'warning');
      return;
    }

    // Check if locked
    if (locked || itemData.status === 'locked' || (itemData.lockedTime && new Date() >= new Date(itemData.lockedTime))) {
      showNotification('Trading is locked for this match/poll', 'error');
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
      if (tradeType === 'buy') {
        const buyResponse = await api.post('/predictions/market/buy', {
          [isPoll ? 'pollId' : 'matchId']: itemData._id,
          outcome: selectedOption,
          amount: parseFloat(amount),
        });
        
        // Update item immediately with response data if available
        if (buyResponse.data.updatedItem) {
          setCurrentItem(buyResponse.data.updatedItem);
          if (onItemUpdate) {
            onItemUpdate(buyResponse.data.updatedItem);
          }
        }
        
        // Update prices if provided - this ensures ALL prices update (not just the traded one)
        if (buyResponse.data.updatedPrices) {
          setPrices(buyResponse.data.updatedPrices);
        }
        
        // Force refresh user predictions to get updated share values
        await fetchUserMarketPrediction();
        
        showNotification('Buy order executed successfully!', 'success');
      } else {
        // For sell, we need to specify outcome, shares or use 'max'
        if (!selectedOption) {
          showNotification('Please select an option to sell', 'warning');
          return;
        }
        
        // Find the prediction for this option (try multiple variations)
        let optionPrediction = predictions[selectedOption];
        if (!optionPrediction) {
          optionPrediction = predictions[selectedOption.toUpperCase()] || 
                           predictions[selectedOption.toLowerCase()] ||
                           predictions[selectedOption.charAt(0).toUpperCase() + selectedOption.slice(1).toLowerCase()];
        }
        
        // For matches, also try normalized versions
        if (!optionPrediction && !isPoll) {
          const normalized = selectedOption === 'teamA' ? 'TEAMA' : 
                            selectedOption === 'teamB' ? 'TEAMB' : 
                            selectedOption === 'draw' ? 'DRAW' : selectedOption.toUpperCase();
          optionPrediction = predictions[normalized];
        }
        
        if (!optionPrediction || (optionPrediction.shares || 0) <= 0) {
          showNotification('No shares to sell for this option', 'warning');
          return;
        }
        
        // Use the prediction's stored outcome (this is what's in the database)
        const outcomeToSend = optionPrediction.outcome || selectedOption;
        const availableShares = optionPrediction.shares || 0;
        
        // Handle max button - convert to actual number
        let sharesToSell;
        if (amount === 'max' || amount === 'all') {
          sharesToSell = 'max';
        } else {
          const parsedAmount = parseFloat(amount);
          if (isNaN(parsedAmount) || parsedAmount <= 0) {
            showNotification('Please enter a valid amount', 'warning');
            return;
          }
          if (parsedAmount > availableShares) {
            showNotification(`Cannot sell more than ${availableShares.toFixed(4)} shares`, 'warning');
            return;
          }
          sharesToSell = parsedAmount;
        }
        
        const sellResponse = await api.post('/predictions/market/sell', {
          [isPoll ? 'pollId' : 'matchId']: itemData._id,
          outcome: outcomeToSend, // Use the stored outcome from prediction
          shares: sharesToSell,
        });
        
        // Update item immediately with response data if available
        if (sellResponse.data.updatedItem) {
          setCurrentItem(sellResponse.data.updatedItem);
          if (onItemUpdate) {
            onItemUpdate(sellResponse.data.updatedItem);
          }
        }
        
        // Update prices if provided - this ensures ALL prices update (not just the traded one)
        if (sellResponse.data.updatedPrices) {
          setPrices(sellResponse.data.updatedPrices);
        }
        
        // Force refresh user predictions to get updated share values
        await fetchUserMarketPrediction();
        
        showNotification('Sell order executed successfully!', 'success');
      }
      setAmount('');
      
      // Immediately refresh all data after trade
      // Refresh item data to get updated liquidity
      const itemResponse = isPoll 
        ? await api.get(`/polls/${itemData._id}`)
        : await api.get(`/matches/${itemData._id}`);
      
      // Update current item state
      setCurrentItem(itemResponse.data);
      
      // Update item in parent component if callback provided
      if (onItemUpdate) {
        onItemUpdate(itemResponse.data);
      }
      
      // Refresh market data and user predictions
      await Promise.all([
        fetchMarketData(),
        fetchUserMarketPrediction()
      ]);
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
        {/* Back Button and Status Tags */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={handleBack}
            className="flex items-center text-gray-600 dark:text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 transition-colors"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span className="font-medium">Back to Cup</span>
          </button>
          <div className="flex items-center gap-2">
            {/* Status Tag */}
            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
              isPoll 
                ? (itemData.status === 'upcoming' ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200' :
                   itemData.status === 'active' ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200' :
                   itemData.status === 'locked' ? 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200' :
                   'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200')
                : (itemData.status === 'upcoming' ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200' :
                   itemData.status === 'live' ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200' :
                   itemData.status === 'locked' ? 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200' :
                   'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200')
            }`}>
              {itemData.status?.toUpperCase() || 'N/A'}
            </span>
            {/* Resolved Tag */}
            {itemData.isResolved && (
              <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full text-xs font-semibold">
                RESOLVED
              </span>
            )}
          </div>
        </div>
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
          {!isPoll && (
            <div className="flex items-center justify-center gap-8 mb-6">
              <div className="flex flex-col items-center">
                {itemData.teamAImage && (
                  <img src={itemData.teamAImage} alt={itemData.teamA} className="w-24 h-24 object-cover rounded-full mb-2 border-4 border-gray-200 dark:border-gray-700" />
                )}
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">{itemData.teamA}</h2>
              </div>
              <div className="text-2xl font-bold text-gray-500 dark:text-gray-400">VS</div>
              <div className="flex flex-col items-center">
                {itemData.teamBImage && (
                  <img src={itemData.teamBImage} alt={itemData.teamB} className="w-24 h-24 object-cover rounded-full mb-2 border-4 border-gray-200 dark:border-gray-700" />
                )}
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">{itemData.teamB}</h2>
              </div>
            </div>
          )}
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2 text-center">
            {isPoll ? itemData.question : `${itemData.teamA} vs ${itemData.teamB}`}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 text-center">
            {isPoll ? itemData.description : `${new Date(itemData.date).toLocaleDateString()} • ${itemData.stageName || ''}`}
          </p>
          {isResolved && (
            <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900 rounded-lg">
              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                Resolved: <strong>{resolvedOutcome}</strong>
              </p>
            </div>
          )}
          {/* Jackpot Pools Display */}
          <div className="mt-4 grid grid-cols-2 gap-4">
            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 border border-green-200 dark:border-green-800">
              <div className="text-sm text-green-600 dark:text-green-400 font-semibold mb-1">Free Jackpot Pool</div>
              <div className="text-xl font-bold text-green-700 dark:text-green-300">
                {((itemData.isResolved && itemData.originalFreeJackpotPool) ? itemData.originalFreeJackpotPool : (itemData.freeJackpotPool || 0)).toFixed(4)} ETH
              </div>
            </div>
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
              <div className="text-sm text-blue-600 dark:text-blue-400 font-semibold mb-1">Boost Jackpot Pool</div>
              <div className="text-xl font-bold text-blue-700 dark:text-blue-300">
                {((itemData.isResolved && itemData.originalBoostJackpotPool) ? itemData.originalBoostJackpotPool : (itemData.boostJackpotPool || 0)).toFixed(4)} ETH
              </div>
            </div>
          </div>
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
                  <div className={`flex items-center justify-center ${isPoll ? (itemData.optionType === 'options' && itemData.options ? 'space-x-4 flex-wrap' : 'space-x-8') : 'space-x-4'}`}>
                    {isPoll ? (
                      itemData.optionType === 'options' && itemData.options ? (
                        itemData.options.map((opt, idx) => {
                          const optPrice = prices[opt.text] || 0;
                          return (
                            <div key={idx} className="text-center flex flex-col items-center">
                              {opt.image && (
                                <img src={opt.image} alt={opt.text} className="w-16 h-16 object-cover rounded-full mb-2 border-2 border-gray-300 dark:border-gray-600" />
                              )}
                              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                                {(optPrice * 100).toFixed(1)}%
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400 font-semibold">
                                {(priceAmounts[opt.text] || 0).toFixed(4)} ETH
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">{opt.text}</p>
                            </div>
                          );
                        })
                      ) : (
                        <>
                          <div className="text-center">
                            <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                              {(prices.yes * 100).toFixed(1)}%
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 font-semibold">
                              {(priceAmounts.yes || 0).toFixed(4)} ETH
                            </p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">YES</p>
                          </div>
                          <div className="text-center">
                            <p className="text-3xl font-bold text-red-600 dark:text-red-400">
                              {(prices.no * 100).toFixed(1)}%
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 font-semibold">
                              {(priceAmounts.no || 0).toFixed(4)} ETH
                            </p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">NO</p>
                          </div>
                        </>
                      )
                    ) : (
                      <>
                        <div className="text-center flex flex-col items-center">
                          {itemData.teamAImage && (
                            <img src={itemData.teamAImage} alt={itemData.teamA} className="w-16 h-16 object-cover rounded-full mb-2 border-2 border-gray-300 dark:border-gray-600" />
                          )}
                          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                            {(prices.teamA * 100).toFixed(1)}%
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 font-semibold">
                            {(priceAmounts.teamA || 0).toFixed(4)} ETH
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{itemData.teamA}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                            {(prices.draw * 100).toFixed(1)}%
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 font-semibold">
                            {(priceAmounts.draw || 0).toFixed(4)} ETH
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">Draw</p>
                        </div>
                        <div className="text-center flex flex-col items-center">
                          {itemData.teamBImage && (
                            <img src={itemData.teamBImage} alt={itemData.teamB} className="w-16 h-16 object-cover rounded-full mb-2 border-2 border-gray-300 dark:border-gray-600" />
                          )}
                          <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                            {(prices.teamB * 100).toFixed(1)}%
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 font-semibold">
                            {(priceAmounts.teamB || 0).toFixed(4)} ETH
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{itemData.teamB}</p>
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
                      trades.map((trade, index) => {
                        // Handle API response format
                        const tradeOption = trade.outcome || '';
                        const tradeShares = trade.shares || 0;
                        const tradeInvested = trade.totalInvested || 0;
                        const tradeTimestamp = trade.timestamp ? new Date(trade.timestamp) : new Date();
                        
                        // Calculate price based on current prices
                        let tradePrice = 0;
                        if (tradeOption) {
                          const normalizedOption = tradeOption.toUpperCase();
                          if (isPoll) {
                            tradePrice = normalizedOption === 'YES' ? prices.yes : prices.no;
                          } else {
                            tradePrice = normalizedOption === 'TEAMA' ? prices.teamA :
                                        normalizedOption === 'TEAMB' ? prices.teamB :
                                        normalizedOption === 'DRAW' ? prices.draw : 0;
                          }
                        }
                        
                        const tradeType = trade.type || 'buy';
                        const tradeAmount = trade.amount || tradeInvested || 0;
                        const tradePriceValue = trade.price || tradePrice || 0;
                        
                        return (
                          <tr key={trade.id || trade._id || index}>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span className={`px-2 py-1 rounded text-xs ${
                                tradeType === 'buy' 
                                  ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                  : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                              }`}>
                                {tradeType.toUpperCase()}
                              </span>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm font-medium">
                              <span className={
                                tradeOption === 'yes' || tradeOption === 'YES' || tradeOption === 'teamA' || tradeOption === 'TeamA' || tradeOption === 'TEAMA' ? 'text-green-600 dark:text-green-400' :
                                tradeOption === 'no' || tradeOption === 'NO' || tradeOption === 'teamB' || tradeOption === 'TeamB' || tradeOption === 'TEAMB' ? 'text-red-600 dark:text-red-400' :
                                'text-purple-600 dark:text-purple-400'
                              }>
                                {tradeOption === 'teamA' || tradeOption === 'TeamA' || tradeOption === 'TEAMA' ? itemData.teamA : 
                                 tradeOption === 'teamB' || tradeOption === 'TeamB' || tradeOption === 'TEAMB' ? itemData.teamB : 
                                 tradeOption ? (isPoll && itemData.optionType === 'options' ? tradeOption : tradeOption.toUpperCase()) : 'N/A'}
                              </span>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                              {tradeShares > 0 ? `${tradeShares.toFixed(4)} Shares` : `${tradeAmount.toFixed(4)} ETH`}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                              {(() => {
                                // Calculate ETH price per share at time of trade
                                // If we have both amount and shares, price = amount / shares
                                if (tradeShares > 0 && tradeAmount > 0) {
                                  return `${(tradeAmount / tradeShares).toFixed(4)} ETH`;
                                }
                                // Fallback: calculate from stored price (percentage) and current market state
                                if (tradePriceValue > 0) {
                                  const normalizedOption = tradeOption.toUpperCase();
                                  let optionLiquidity = 0;
                                  let totalSharesForOption = 0;
                                  
                                  if (isPoll) {
                                    if (itemData.optionType === 'options' && itemData.options) {
                                      const opt = itemData.options.find(o => o.text === tradeOption);
                                      if (opt) {
                                        optionLiquidity = opt.liquidity || 0;
                                        totalSharesForOption = opt.shares || 0;
                                      }
                                    } else {
                                      optionLiquidity = normalizedOption === 'YES' ? (itemData.marketYesLiquidity || 0) : (itemData.marketNoLiquidity || 0);
                                      totalSharesForOption = normalizedOption === 'YES' ? (itemData.marketYesShares || 0) : (itemData.marketNoShares || 0);
                                    }
                                  } else {
                                    if (normalizedOption === 'TEAMA') {
                                      optionLiquidity = itemData.marketTeamALiquidity || 0;
                                      totalSharesForOption = itemData.marketTeamAShares || 0;
                                    } else if (normalizedOption === 'TEAMB') {
                                      optionLiquidity = itemData.marketTeamBLiquidity || 0;
                                      totalSharesForOption = itemData.marketTeamBShares || 0;
                                    } else if (normalizedOption === 'DRAW') {
                                      optionLiquidity = itemData.marketDrawLiquidity || 0;
                                      totalSharesForOption = itemData.marketDrawShares || 0;
                                    }
                                  }
                                  
                                  // Calculate ETH price per share: (price percentage) * (option liquidity) / (total shares)
                                  if (totalSharesForOption > 0) {
                                    const ethPrice = tradePriceValue * optionLiquidity / totalSharesForOption;
                                    return `${ethPrice.toFixed(4)} ETH`;
                                  }
                                }
                                return 'N/A';
                              })()}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                              {tradeTimestamp.toLocaleTimeString()}
                            </td>
                          </tr>
                        );
                      })
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
              {/* Check if resolved */}
              {itemData.isResolved || itemData.status === 'settled' || itemData.status === 'completed' ? (
                // Show only Holdings when resolved
                <>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                    Your Holdings
                  </h2>
                  {user && (
                    <div className="space-y-2 text-sm">
                      {isPoll ? (
                        itemData.optionType === 'options' && itemData.options ? (
                          // Option-based poll
                          itemData.options.map((opt, idx) => {
                            const optionPrediction = predictions[opt.text] || {};
                            const shares = optionPrediction.shares || 0;
                            return (
                              <div key={idx} className="flex justify-between">
                                <span className="text-gray-600 dark:text-gray-400">{opt.text} Shares:</span>
                                <span className="font-medium text-gray-900 dark:text-white">{shares.toFixed(4)}</span>
                              </div>
                            );
                          })
                        ) : (
                          // Normal Yes/No poll
                          <>
                            <div className="flex justify-between">
                              <span className="text-gray-600 dark:text-gray-400">YES Shares:</span>
                              <span className="font-medium text-gray-900 dark:text-white">{(predictions['YES']?.shares || predictions['yes']?.shares || 0).toFixed(4)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600 dark:text-gray-400">NO Shares:</span>
                              <span className="font-medium text-gray-900 dark:text-white">{(predictions['NO']?.shares || predictions['no']?.shares || 0).toFixed(4)}</span>
                            </div>
                          </>
                        )
                      ) : (
                        // Match
                        <>
                          <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-400">{itemData.teamA} Shares:</span>
                            <span className="font-medium text-gray-900 dark:text-white">{(predictions['TEAMA']?.shares || predictions['TeamA']?.shares || predictions['teamA']?.shares || 0).toFixed(4)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-400">Draw Shares:</span>
                            <span className="font-medium text-gray-900 dark:text-white">{(predictions['DRAW']?.shares || predictions['Draw']?.shares || predictions['draw']?.shares || 0).toFixed(4)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-400">{itemData.teamB} Shares:</span>
                            <span className="font-medium text-gray-900 dark:text-white">{(predictions['TEAMB']?.shares || predictions['TeamB']?.shares || predictions['teamB']?.shares || 0).toFixed(4)}</span>
                          </div>
                        </>
                      )}
                      <div className="flex justify-between pt-2 border-t border-gray-200 dark:border-gray-700">
                        <span className="text-gray-600 dark:text-gray-400">Total Value:</span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {(() => {
                            // Calculate current ETH value of all holdings
                            let totalValue = 0;
                            
                            if (isPoll) {
                              if (itemData.optionType === 'options' && itemData.options) {
                                // Option-based poll
                                itemData.options.forEach(opt => {
                                  const optionPrediction = predictions[opt.text];
                                  if (optionPrediction && optionPrediction.shares > 0) {
                                    const userShares = optionPrediction.shares || 0;
                                    const totalSharesForOption = opt.shares || 0;
                                    const optionLiquidity = opt.liquidity || 0;
                                    if (totalSharesForOption > 0) {
                                      totalValue += (userShares / totalSharesForOption) * optionLiquidity;
                                    }
                                  }
                                });
                              } else {
                                // Normal Yes/No poll
                                const yesPrediction = predictions['YES'] || predictions['yes'] || {};
                                const noPrediction = predictions['NO'] || predictions['no'] || {};
                                
                                if (yesPrediction.shares > 0) {
                                  const userShares = yesPrediction.shares || 0;
                                  const totalShares = itemData.marketYesShares || 0;
                                  const liquidity = itemData.marketYesLiquidity || 0;
                                  if (totalShares > 0) {
                                    totalValue += (userShares / totalShares) * liquidity;
                                  }
                                }
                                
                                if (noPrediction.shares > 0) {
                                  const userShares = noPrediction.shares || 0;
                                  const totalShares = itemData.marketNoShares || 0;
                                  const liquidity = itemData.marketNoLiquidity || 0;
                                  if (totalShares > 0) {
                                    totalValue += (userShares / totalShares) * liquidity;
                                  }
                                }
                              }
                            } else {
                              // Match
                              const teamAPrediction = predictions['TEAMA'] || predictions['TeamA'] || predictions['teamA'] || {};
                              const teamBPrediction = predictions['TEAMB'] || predictions['TeamB'] || predictions['teamB'] || {};
                              const drawPrediction = predictions['DRAW'] || predictions['Draw'] || predictions['draw'] || {};
                              
                              if (teamAPrediction.shares > 0) {
                                const userShares = teamAPrediction.shares || 0;
                                const totalShares = itemData.marketTeamAShares || 0;
                                const liquidity = itemData.marketTeamALiquidity || 0;
                                if (totalShares > 0) {
                                  totalValue += (userShares / totalShares) * liquidity;
                                }
                              }
                              
                              if (drawPrediction.shares > 0) {
                                const userShares = drawPrediction.shares || 0;
                                const totalShares = itemData.marketDrawShares || 0;
                                const liquidity = itemData.marketDrawLiquidity || 0;
                                if (totalShares > 0) {
                                  totalValue += (userShares / totalShares) * liquidity;
                                }
                              }
                              
                              if (teamBPrediction.shares > 0) {
                                const userShares = teamBPrediction.shares || 0;
                                const totalShares = itemData.marketTeamBShares || 0;
                                const liquidity = itemData.marketTeamBLiquidity || 0;
                                if (totalShares > 0) {
                                  totalValue += (userShares / totalShares) * liquidity;
                                }
                              }
                            }
                            
                            return totalValue.toFixed(4);
                          })()} ETH
                        </span>
                      </div>
                    </div>
                  )}
                  
                  {/* Resolved State - Claim buttons */}
                  {isResolved && (
                    <div className="mt-4">
                      {hasWon ? (
                        winningPredictions.map((pred, idx) => {
                          if (pred.claimed) {
                            return (
                              <div key={idx} className="mb-2 p-3 bg-gray-100 dark:bg-gray-700 rounded-lg">
                                <p className="text-sm text-gray-600 dark:text-gray-400">Reward claimed</p>
                                <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                                  {pred.outcome}: {(pred.payout || 0).toFixed(4)} ETH
                                </p>
                              </div>
                            );
                          }
                          return (
                            <button
                              key={idx}
                              onClick={async () => {
                                try {
                                  await api.post(`/predictions/${pred._id}/claim`);
                                  showNotification('Payout claimed successfully!', 'success');
                                  fetchUserMarketPrediction();
                                } catch (error) {
                                  showNotification(error.response?.data?.message || 'Failed to claim', 'error');
                                }
                              }}
                              className="w-full mb-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                            >
                              Claim {pred.outcome}: {(pred.payout || 0).toFixed(4)} ETH
                            </button>
                          );
                        })
                      ) : (
                        <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded-lg">
                          <p className="text-sm text-gray-600 dark:text-gray-400">You did not win this prediction</p>
                        </div>
                      )}
                    </div>
                  )}
                </>
              ) : (
                // Show full trading UI when not resolved
                <>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                    Trade
                  </h2>

                  {/* Locked Message */}
                  {locked && (
                    <div className="mb-4 p-3 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 rounded-lg">
                      <p className="text-sm font-semibold">Trading is locked for this match/poll</p>
                      {itemData.lockedTime && (
                        <p className="text-xs mt-1">Locked since: {new Date(itemData.lockedTime).toLocaleString()}</p>
                      )}
                    </div>
                  )}

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
                {selectedOption && (() => {
                  // Get current price for selected option
                  let currentPrice = 0;
                  if (isPoll) {
                    if (itemData.optionType === 'options' && itemData.options) {
                      currentPrice = prices[selectedOption] || 0;
                    } else {
                      currentPrice = selectedOption.toLowerCase() === 'yes' ? (prices.yes || 0) : (prices.no || 0);
                    }
                  } else {
                    if (selectedOption === 'teamA') currentPrice = prices.teamA || 0;
                    else if (selectedOption === 'teamB') currentPrice = prices.teamB || 0;
                    else if (selectedOption === 'draw') currentPrice = prices.draw || 0;
                  }
                  return currentPrice > 0 && (
                    <div className="mb-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        Current Price: <span className="font-semibold text-blue-600 dark:text-blue-400">{currentPrice.toFixed(4)} ETH per share</span>
                      </p>
                    </div>
                  );
                })()}
                {isPoll ? (
                  itemData.optionType === 'options' && itemData.options ? (
                    <div className="grid grid-cols-1 gap-2">
                      {itemData.options.map((opt, idx) => {
                        const optPrice = prices[opt.text] || 0;
                        return (
                          <button
                            key={idx}
                            onClick={() => {
                              if (!locked) {
                                setSelectedOption(opt.text);
                              }
                            }}
                            disabled={locked}
                            className={`px-4 py-3 rounded-lg font-semibold transition-colors flex items-center gap-3 ${
                              locked
                                ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                                : selectedOption === opt.text
                                ? 'bg-blue-500 text-white'
                                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                            }`}
                          >
                            {opt.image && (
                              <img src={opt.image} alt={opt.text} className="w-10 h-10 object-cover rounded-full" />
                            )}
                            <div className="flex-1 text-left">
                              <div>{opt.text}</div>
                              <div className="text-xs mt-1">{(optPrice * 100).toFixed(1)}%</div>
                              <div className="text-xs mt-0.5 font-semibold">{(priceAmounts[opt.text] || 0).toFixed(4)} ETH</div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => {
                          if (!locked) {
                            setSelectedOption('yes');
                          }
                        }}
                        disabled={locked}
                        className={`px-4 py-3 rounded-lg font-semibold transition-colors ${
                          locked
                            ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                            : selectedOption === 'yes'
                            ? 'bg-green-500 text-white'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                        }`}
                      >
                        YES
                        <div className="text-xs mt-1">{(prices.yes * 100).toFixed(1)}%</div>
                        <div className="text-xs mt-0.5 font-semibold">{(priceAmounts.yes || 0).toFixed(4)} ETH</div>
                      </button>
                      <button
                        onClick={() => {
                          if (!locked) {
                            setSelectedOption('no');
                          }
                        }}
                        disabled={locked}
                        className={`px-4 py-3 rounded-lg font-semibold transition-colors ${
                          locked
                            ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                            : selectedOption === 'no'
                            ? 'bg-red-500 text-white'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                        }`}
                      >
                        NO
                        <div className="text-xs mt-1">{(prices.no * 100).toFixed(1)}%</div>
                        <div className="text-xs mt-0.5 font-semibold">{(priceAmounts.no || 0).toFixed(4)} ETH</div>
                      </button>
                    </div>
                  )
                ) : (
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => {
                        if (!locked) {
                          setSelectedOption('teamA');
                        }
                      }}
                      disabled={locked}
                      className={`px-3 py-3 rounded-lg font-semibold transition-colors text-sm flex flex-col items-center ${
                        locked
                          ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                          : selectedOption === 'teamA'
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                      title={`${itemData.teamA} Win`}
                    >
                      {itemData.teamAImage && (
                        <img src={itemData.teamAImage} alt={itemData.teamA} className="w-8 h-8 object-cover rounded-full mb-1" />
                      )}
                      <div className="truncate text-xs">{itemData.teamA}</div>
                      <div className="text-xs mt-1">{(prices.teamA * 100).toFixed(1)}%</div>
                      <div className="text-xs mt-0.5 font-semibold">{(priceAmounts.teamA || 0).toFixed(4)} ETH</div>
                    </button>
                    <button
                      onClick={() => {
                        if (!locked) {
                          setSelectedOption('draw');
                        }
                      }}
                      disabled={locked}
                      className={`px-3 py-3 rounded-lg font-semibold transition-colors text-sm ${
                        locked
                          ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                          : selectedOption === 'draw'
                          ? 'bg-purple-500 text-white'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      Draw
                      <div className="text-xs mt-1">{(prices.draw * 100).toFixed(1)}%</div>
                      <div className="text-xs mt-0.5 font-semibold">{(priceAmounts.draw || 0).toFixed(4)} ETH</div>
                    </button>
                    <button
                      onClick={() => {
                        if (!locked) {
                          setSelectedOption('teamB');
                        }
                      }}
                      disabled={locked}
                      className={`px-3 py-3 rounded-lg font-semibold transition-colors text-sm flex flex-col items-center ${
                        locked
                          ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                          : selectedOption === 'teamB'
                          ? 'bg-red-500 text-white'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                      title={`${itemData.teamB} Win`}
                    >
                      {itemData.teamBImage && (
                        <img src={itemData.teamBImage} alt={itemData.teamB} className="w-8 h-8 object-cover rounded-full mb-1" />
                      )}
                      <div className="truncate text-xs">{itemData.teamB}</div>
                      <div className="text-xs mt-1">{(prices.teamB * 100).toFixed(1)}%</div>
                      <div className="text-xs mt-0.5 font-semibold">{(priceAmounts.teamB || 0).toFixed(4)} ETH</div>
                    </button>
                  </div>
                )}
              </div>

              {/* Amount Input */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {tradeType === 'buy' ? 'Amount (ETH)' : 'Shares to Sell'}
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    step={tradeType === 'buy' ? "0.01" : "0.0001"}
                    min="0"
                    max={tradeType === 'sell' && selectedOption ? (() => {
                      // Find the prediction for this option
                      let optionPrediction = predictions[selectedOption];
                      if (!optionPrediction) {
                        optionPrediction = predictions[selectedOption.toUpperCase()] || 
                                         predictions[selectedOption.toLowerCase()] ||
                                         predictions[selectedOption.charAt(0).toUpperCase() + selectedOption.slice(1).toLowerCase()];
                      }
                      if (!optionPrediction && !isPoll) {
                        const normalized = selectedOption === 'teamA' ? 'TEAMA' : 
                                          selectedOption === 'teamB' ? 'TEAMB' : 
                                          selectedOption === 'draw' ? 'DRAW' : selectedOption.toUpperCase();
                        optionPrediction = predictions[normalized];
                      }
                      return optionPrediction?.shares || 0;
                    })() : undefined}
                    value={amount}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (tradeType === 'sell') {
                        // Find the prediction for this option
                        let optionPrediction = predictions[selectedOption];
                        if (!optionPrediction) {
                          optionPrediction = predictions[selectedOption.toUpperCase()] || 
                                           predictions[selectedOption.toLowerCase()] ||
                                           predictions[selectedOption.charAt(0).toUpperCase() + selectedOption.slice(1).toLowerCase()];
                        }
                        if (!optionPrediction && !isPoll) {
                          const normalized = selectedOption === 'teamA' ? 'TEAMA' : 
                                            selectedOption === 'teamB' ? 'TEAMB' : 
                                            selectedOption === 'draw' ? 'DRAW' : selectedOption.toUpperCase();
                          optionPrediction = predictions[normalized];
                        }
                        const maxShares = optionPrediction?.shares || 0;
                        const inputValue = parseFloat(value);
                        if (!isNaN(inputValue) && inputValue > maxShares) {
                          // Don't allow more than max
                          setAmount(maxShares.toFixed(4));
                        } else {
                          setAmount(value);
                        }
                      } else {
                        setAmount(value);
                      }
                    }}
                    disabled={locked}
                    className={`flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white ${
                      locked ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                    placeholder={tradeType === 'buy' ? "0.0" : "0"}
                  />
                  {tradeType === 'sell' && selectedOption && (() => {
                    // Find the prediction for this option (try multiple variations)
                    let optionPrediction = predictions[selectedOption];
                    if (!optionPrediction) {
                      optionPrediction = predictions[selectedOption.toUpperCase()] || 
                                       predictions[selectedOption.toLowerCase()] ||
                                       predictions[selectedOption.charAt(0).toUpperCase() + selectedOption.slice(1).toLowerCase()];
                    }
                    // For matches, also try normalized versions
                    if (!optionPrediction && !isPoll) {
                      const normalized = selectedOption === 'teamA' ? 'TEAMA' : 
                                        selectedOption === 'teamB' ? 'TEAMB' : 
                                        selectedOption === 'draw' ? 'DRAW' : selectedOption.toUpperCase();
                      optionPrediction = predictions[normalized];
                    }
                    const availableShares = optionPrediction?.shares || 0;
                    return availableShares > 0 && (
                      <button
                        onClick={() => {
                          if (!locked) {
                            setAmount(availableShares.toFixed(4));
                          }
                        }}
                        disabled={locked}
                        className={`px-3 py-2 rounded-lg text-sm ${
                          locked
                            ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                            : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                        }`}
                      >
                        Max
                      </button>
                    );
                  })()}
                </div>
                {tradeType === 'buy' && selectedOption && amount && (() => {
                  // Get current price for selected option
                  let currentPrice = 0;
                  if (isPoll) {
                    if (itemData.optionType === 'options' && itemData.options) {
                      currentPrice = prices[selectedOption] || 0;
                    } else {
                      currentPrice = selectedOption.toLowerCase() === 'yes' ? (prices.yes || 0) : (prices.no || 0);
                    }
                  } else {
                    if (selectedOption === 'teamA') currentPrice = prices.teamA || 0;
                    else if (selectedOption === 'teamB') currentPrice = prices.teamB || 0;
                    else if (selectedOption === 'draw') currentPrice = prices.draw || 0;
                  }
                  const ethAmount = parseFloat(amount) || 0;
                  const estimatedShares = currentPrice > 0 ? (ethAmount / currentPrice) : 0;
                  return ethAmount > 0 && currentPrice > 0 && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      You'll receive ~<span className="font-semibold">{estimatedShares.toFixed(4)}</span> shares at {currentPrice.toFixed(4)} ETH per share
                    </p>
                  );
                })()}
                {tradeType === 'sell' && selectedOption && (() => {
                  // Find the prediction for this option (try multiple variations)
                  let optionPrediction = predictions[selectedOption];
                  if (!optionPrediction) {
                    optionPrediction = predictions[selectedOption.toUpperCase()] || 
                                     predictions[selectedOption.toLowerCase()] ||
                                     predictions[selectedOption.charAt(0).toUpperCase() + selectedOption.slice(1).toLowerCase()];
                  }
                  // For matches, also try normalized versions
                  if (!optionPrediction && !isPoll) {
                    const normalized = selectedOption === 'teamA' ? 'TEAMA' : 
                                      selectedOption === 'teamB' ? 'TEAMB' : 
                                      selectedOption === 'draw' ? 'DRAW' : selectedOption.toUpperCase();
                    optionPrediction = predictions[normalized];
                  }
                  const availableShares = optionPrediction?.shares || 0;
                  
                  // Calculate equivalent ETH if user entered amount
                  let equivalentETH = 0;
                  if (amount && amount !== 'max' && amount !== 'all') {
                    const sharesToSell = parseFloat(amount);
                    if (!isNaN(sharesToSell) && sharesToSell > 0 && availableShares > 0) {
                      // Calculate ETH based on current option liquidity and shares
                      let optionLiquidity = 0;
                      let totalSharesForOption = 0;
                      
                      if (isPoll) {
                        if (itemData.optionType === 'options' && itemData.options) {
                          const selectedOpt = itemData.options.find(opt => opt.text === (optionPrediction?.outcome || selectedOption));
                          if (selectedOpt) {
                            optionLiquidity = selectedOpt.liquidity || 0;
                            totalSharesForOption = selectedOpt.shares || 0;
                          }
                        } else {
                          // Yes/No poll
                          const normalized = (optionPrediction?.outcome || selectedOption).toUpperCase();
                          optionLiquidity = normalized === 'YES' ? (itemData.marketYesLiquidity || 0) : (itemData.marketNoLiquidity || 0);
                          totalSharesForOption = normalized === 'YES' ? (itemData.marketYesShares || 0) : (itemData.marketNoShares || 0);
                        }
                      } else {
                        // Match
                        const normalized = (optionPrediction?.outcome || selectedOption).toUpperCase();
                        if (normalized === 'TEAMA') {
                          optionLiquidity = itemData.marketTeamALiquidity || 0;
                          totalSharesForOption = itemData.marketTeamAShares || 0;
                        } else if (normalized === 'TEAMB') {
                          optionLiquidity = itemData.marketTeamBLiquidity || 0;
                          totalSharesForOption = itemData.marketTeamBShares || 0;
                        } else if (normalized === 'DRAW') {
                          optionLiquidity = itemData.marketDrawLiquidity || 0;
                          totalSharesForOption = itemData.marketDrawShares || 0;
                        }
                      }
                      
                      // Use current price: payout = shares * currentPrice
                      let currentPrice = 0;
                      if (isPoll) {
                        if (itemData.optionType === 'options' && itemData.options) {
                          currentPrice = prices[selectedOption] || 0;
                        } else {
                          currentPrice = selectedOption.toLowerCase() === 'yes' ? (prices.yes || 0) : (prices.no || 0);
                        }
                      } else {
                        if (selectedOption === 'teamA') currentPrice = prices.teamA || 0;
                        else if (selectedOption === 'teamB') currentPrice = prices.teamB || 0;
                        else if (selectedOption === 'draw') currentPrice = prices.draw || 0;
                      }
                      
                      if (currentPrice > 0) {
                        equivalentETH = sharesToSell * currentPrice;
                      }
                    }
                  }
                  
                  return (
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 space-y-1">
                      <p>Available: {availableShares.toFixed(4)} shares</p>
                      {amount && amount !== 'max' && amount !== 'all' && !isNaN(parseFloat(amount)) && parseFloat(amount) > 0 && equivalentETH > 0 && (
                        <p className="font-semibold text-gray-700 dark:text-gray-300">
                          You'll receive ≈ {equivalentETH.toFixed(4)} ETH
                        </p>
                      )}
                    </div>
                  );
                })()}
              </div>

              {/* Trade Button */}
              <button
                onClick={handleTrade}
                disabled={(() => {
                  if (locked) return true;
                  if (tradeType === 'buy') {
                    return !selectedOption || !amount;
                  } else {
                    // For sell, check holdings for selected option
                    if (!selectedOption || !amount) return true;
                    
                    // Find the prediction for this option (try multiple variations)
                    let optionPrediction = predictions[selectedOption];
                    if (!optionPrediction) {
                      optionPrediction = predictions[selectedOption.toUpperCase()] || 
                                       predictions[selectedOption.toLowerCase()] ||
                                       predictions[selectedOption.charAt(0).toUpperCase() + selectedOption.slice(1).toLowerCase()];
                    }
                    // For matches, also try normalized versions
                    if (!optionPrediction && !isPoll) {
                      const normalized = selectedOption === 'teamA' ? 'TEAMA' : 
                                        selectedOption === 'teamB' ? 'TEAMB' : 
                                        selectedOption === 'draw' ? 'DRAW' : selectedOption.toUpperCase();
                      optionPrediction = predictions[normalized];
                    }
                    
                    const availableShares = optionPrediction?.shares || 0;
                    if (availableShares <= 0) return true;
                    if (amount !== 'max' && amount !== 'all') {
                      const parsedAmount = parseFloat(amount);
                      if (isNaN(parsedAmount) || parsedAmount <= 0 || parsedAmount > availableShares) return true;
                    }
                    return false;
                  }
                })()}
                className={`w-full px-4 py-3 rounded-lg font-semibold transition-colors ${
                  locked
                    ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                    : tradeType === 'buy'
                    ? 'bg-green-500 hover:bg-green-600 text-white'
                    : 'bg-red-500 hover:bg-red-600 text-white'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {tradeType === 'buy' ? 'Buy' : 'Sell'}{' '}
                {tradeType === 'buy' ? (
                  selectedOption === 'yes' ? 'YES' :
                  selectedOption === 'no' ? 'NO' :
                  selectedOption === 'teamA' ? itemData.teamA :
                  selectedOption === 'teamB' ? itemData.teamB :
                  selectedOption === 'draw' ? 'Draw' :
                  isPoll && itemData.optionType === 'options' ? selectedOption : ''
                ) : (
                  selectedOption === 'yes' ? 'YES' :
                  selectedOption === 'no' ? 'NO' :
                  selectedOption === 'teamA' ? itemData.teamA :
                  selectedOption === 'teamB' ? itemData.teamB :
                  selectedOption === 'draw' ? 'Draw' :
                  isPoll && itemData.optionType === 'options' ? selectedOption : 'Shares'
                )}
              </button>

                  {/* User Holdings */}
                  {user && (
                    <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
                        Your Holdings
                      </h3>
                      <div className="space-y-2 text-sm">
                    {isPoll ? (
                      itemData.optionType === 'options' && itemData.options ? (
                        // Option-based poll
                        itemData.options.map((opt, idx) => {
                          const optionPrediction = predictions[opt.text] || {};
                          const shares = optionPrediction.shares || 0;
                          return (
                            <div key={idx} className="flex justify-between">
                              <span className="text-gray-600 dark:text-gray-400">{opt.text} Shares:</span>
                              <span className="font-medium text-gray-900 dark:text-white">{shares.toFixed(4)}</span>
                            </div>
                          );
                        })
                      ) : (
                        // Normal Yes/No poll
                        <>
                          <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-400">YES Shares:</span>
                            <span className="font-medium text-gray-900 dark:text-white">{(predictions['YES']?.shares || predictions['yes']?.shares || 0).toFixed(4)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-400">NO Shares:</span>
                            <span className="font-medium text-gray-900 dark:text-white">{(predictions['NO']?.shares || predictions['no']?.shares || 0).toFixed(4)}</span>
                          </div>
                        </>
                      )
                    ) : (
                      // Match
                      <>
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">{itemData.teamA} Shares:</span>
                          <span className="font-medium text-gray-900 dark:text-white">{(predictions['TEAMA']?.shares || predictions['TeamA']?.shares || predictions['teamA']?.shares || 0).toFixed(4)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Draw Shares:</span>
                          <span className="font-medium text-gray-900 dark:text-white">{(predictions['DRAW']?.shares || predictions['Draw']?.shares || predictions['draw']?.shares || 0).toFixed(4)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">{itemData.teamB} Shares:</span>
                          <span className="font-medium text-gray-900 dark:text-white">{(predictions['TEAMB']?.shares || predictions['TeamB']?.shares || predictions['teamB']?.shares || 0).toFixed(4)}</span>
                        </div>
                      </>
                    )}
                    <div className="flex justify-between pt-2 border-t border-gray-200 dark:border-gray-700">
                      <span className="text-gray-600 dark:text-gray-400">Total Value:</span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {(() => {
                          // Calculate current ETH value of all holdings
                          let totalValue = 0;
                          
                          if (isPoll) {
                            if (itemData.optionType === 'options' && itemData.options) {
                              // Option-based poll
                              itemData.options.forEach(opt => {
                                const optionPrediction = predictions[opt.text];
                                if (optionPrediction && optionPrediction.shares > 0) {
                                  const userShares = optionPrediction.shares || 0;
                                  const totalSharesForOption = opt.shares || 0;
                                  const optionLiquidity = opt.liquidity || 0;
                                  if (totalSharesForOption > 0) {
                                    totalValue += (userShares / totalSharesForOption) * optionLiquidity;
                                  }
                                }
                              });
                            } else {
                              // Normal Yes/No poll
                              const yesPrediction = predictions['YES'] || predictions['yes'] || {};
                              const noPrediction = predictions['NO'] || predictions['no'] || {};
                              
                              if (yesPrediction.shares > 0) {
                                const userShares = yesPrediction.shares || 0;
                                const totalShares = itemData.marketYesShares || 0;
                                const liquidity = itemData.marketYesLiquidity || 0;
                                if (totalShares > 0) {
                                  totalValue += (userShares / totalShares) * liquidity;
                                }
                              }
                              
                              if (noPrediction.shares > 0) {
                                const userShares = noPrediction.shares || 0;
                                const totalShares = itemData.marketNoShares || 0;
                                const liquidity = itemData.marketNoLiquidity || 0;
                                if (totalShares > 0) {
                                  totalValue += (userShares / totalShares) * liquidity;
                                }
                              }
                            }
                          } else {
                            // Match
                            const teamAPrediction = predictions['TEAMA'] || predictions['TeamA'] || predictions['teamA'] || {};
                            const teamBPrediction = predictions['TEAMB'] || predictions['TeamB'] || predictions['teamB'] || {};
                            const drawPrediction = predictions['DRAW'] || predictions['Draw'] || predictions['draw'] || {};
                            
                            if (teamAPrediction.shares > 0) {
                              const userShares = teamAPrediction.shares || 0;
                              const totalShares = itemData.marketTeamAShares || 0;
                              const liquidity = itemData.marketTeamALiquidity || 0;
                              if (totalShares > 0) {
                                totalValue += (userShares / totalShares) * liquidity;
                              }
                            }
                            
                            if (drawPrediction.shares > 0) {
                              const userShares = drawPrediction.shares || 0;
                              const totalShares = itemData.marketDrawShares || 0;
                              const liquidity = itemData.marketDrawLiquidity || 0;
                              if (totalShares > 0) {
                                totalValue += (userShares / totalShares) * liquidity;
                              }
                            }
                            
                            if (teamBPrediction.shares > 0) {
                              const userShares = teamBPrediction.shares || 0;
                              const totalShares = itemData.marketTeamBShares || 0;
                              const liquidity = itemData.marketTeamBLiquidity || 0;
                              if (totalShares > 0) {
                                totalValue += (userShares / totalShares) * liquidity;
                              }
                            }
                          }
                          
                          return totalValue.toFixed(4);
                        })()} ETH
                      </span>
                    </div>
                  </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};

export default MatchDetail;
