import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { useNotification } from '../components/Notification';
import Modal from '../components/Modal';
import SlateEditor from '../components/SlateEditor';

const Admin = () => {
  const [activeTab, setActiveTab] = useState('matches');
  const [matches, setMatches] = useState([]);
  const [cups, setCups] = useState([]);
  const [stages, setStages] = useState([]);
  const [polls, setPolls] = useState([]);
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const { showNotification } = useNotification();

  useEffect(() => {
    fetchData();
    if (activeTab === 'matches' || activeTab === 'polls' || activeTab === 'stages') {
      fetchCups();
      if (activeTab === 'stages') {
        fetchAllStages();
      } else {
        fetchStages();
      }
    }
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'matches') {
        const response = await api.get('/matches');
        setMatches(response.data || []);
      } else if (activeTab === 'cups') {
        const response = await api.get('/cups');
        setCups(response.data || []);
      } else if (activeTab === 'polls') {
        const response = await api.get('/polls');
        setPolls(response.data || []);
      } else if (activeTab === 'blogs') {
        const response = await api.get('/admin/blogs');
        setBlogs(response.data || []);
      } else if (activeTab === 'settings') {
        // Settings will be handled separately
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      showNotification(error.response?.data?.message || 'Error fetching data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchCups = async () => {
    try {
      const response = await api.get('/cups');
      setCups(response.data);
    } catch (error) {
      console.error('Error fetching cups:', error);
    }
  };

  const fetchStages = async () => {
    try {
      // Fetch stages for all cups
      const allStages = [];
      for (const cup of cups) {
        const response = await api.get(`/cups/${cup.slug}/stages`);
        allStages.push(...response.data);
      }
      setStages(allStages);
    } catch (error) {
      console.error('Error fetching stages:', error);
    }
  };

  const fetchAllStages = async () => {
    try {
      const response = await api.get('/stages');
      setStages(response.data);
    } catch (error) {
      console.error('Error fetching all stages:', error);
    }
  };

  const handleCreateStage = async (stageData) => {
    try {
      await api.post('/admin/stages', stageData);
      fetchAllStages();
      showNotification('Stage created successfully!', 'success');
    } catch (error) {
      showNotification(error.response?.data?.message || 'Failed to create stage', 'error');
    }
  };

  const handleUpdateStage = async (stageId, updates) => {
    try {
      await api.put(`/stages/${stageId}`, updates);
      fetchAllStages();
      showNotification('Stage updated successfully!', 'success');
    } catch (error) {
      showNotification(error.response?.data?.message || 'Failed to update stage', 'error');
    }
  };

  const handleDeleteStage = async (stageId) => {
    try {
      await api.delete(`/stages/${stageId}`);
      fetchAllStages();
      showNotification('Stage deleted successfully!', 'success');
    } catch (error) {
      showNotification(error.response?.data?.message || 'Failed to delete stage', 'error');
    }
  };

  const handleCreateMatch = async (matchData) => {
    try {
      await api.post('/admin/matches', matchData);
      fetchData();
      showNotification('Match created successfully!', 'success');
    } catch (error) {
      showNotification(error.response?.data?.message || 'Failed to create match', 'error');
    }
  };

  const handleUpdateMatch = async (matchId, updates) => {
    try {
      await api.put(`/admin/matches/${matchId}`, updates);
      fetchData();
      showNotification('Match updated successfully!', 'success');
    } catch (error) {
      showNotification(error.response?.data?.message || 'Failed to update match', 'error');
    }
  };

  const handleResolveMatch = async (matchId, result) => {
    try {
      await api.post(`/admin/matches/${matchId}/resolve`, { result });
      fetchData();
      showNotification('Match resolved successfully!', 'success');
    } catch (error) {
      showNotification(error.response?.data?.message || 'Failed to resolve match', 'error');
    }
  };

  const handleCreatePoll = async (pollData) => {
    try {
      await api.post('/admin/polls', pollData);
      fetchData();
      showNotification('Poll created successfully!', 'success');
    } catch (error) {
      showNotification(error.response?.data?.message || 'Failed to create poll', 'error');
    }
  };

  const handleResolvePoll = async (pollId, result) => {
    try {
      await api.post(`/admin/polls/${pollId}/resolve`, { result });
      fetchData();
      showNotification('Poll resolved successfully!', 'success');
    } catch (error) {
      showNotification(error.response?.data?.message || 'Failed to resolve poll', 'error');
    }
  };

  const handleCreateCup = async (cupData) => {
    try {
      await api.post('/admin/cups', cupData);
      fetchData();
      showNotification('Cup created successfully!', 'success');
    } catch (error) {
      showNotification(error.response?.data?.message || 'Failed to create cup', 'error');
    }
  };

  const handleCreateBlog = async (blogData) => {
    try {
      await api.post('/admin/blogs', blogData);
      fetchData();
      showNotification('Blog created successfully!', 'success');
    } catch (error) {
      showNotification(error.response?.data?.message || 'Failed to create blog', 'error');
    }
  };

  const handleUpdateBlog = async (blogId, updates) => {
    try {
      await api.put(`/admin/blogs/${blogId}`, updates);
      fetchData();
      showNotification('Blog updated successfully!', 'success');
    } catch (error) {
      showNotification(error.response?.data?.message || 'Failed to update blog', 'error');
    }
  };

  const handleDeleteBlog = async (blogId) => {
    try {
      await api.delete(`/admin/blogs/${blogId}`);
      fetchData();
      showNotification('Blog deleted successfully!', 'success');
    } catch (error) {
      showNotification(error.response?.data?.message || 'Failed to delete blog', 'error');
    }
  };

  const handleUpdateStatus = async (matchId, status) => {
    try {
      await api.post(`/admin/matches/${matchId}/status`, { status });
      fetchData();
      showNotification('Status updated successfully!', 'success');
    } catch (error) {
      showNotification(error.response?.data?.message || 'Failed to update status', 'error');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-8">
          Admin Dashboard
        </h1>

        {/* Tabs */}
        <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
          <nav className="-mb-px flex space-x-8">
            {['matches', 'polls', 'cups', 'stages', 'blogs', 'settings'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        {activeTab === 'matches' && (
          <MatchesTab
            matches={matches}
            cups={cups}
            stages={stages}
            loading={loading}
            onCreateMatch={handleCreateMatch}
            onUpdateMatch={handleUpdateMatch}
            onResolveMatch={handleResolveMatch}
            onUpdateStatus={handleUpdateStatus}
          />
        )}
        {activeTab === 'polls' && (
          <PollsTab
            polls={polls}
            cups={cups}
            stages={stages}
            loading={loading}
            onCreatePoll={handleCreatePoll}
            onResolvePoll={handleResolvePoll}
          />
        )}
        {activeTab === 'cups' && (
          <CupsTab cups={cups} loading={loading} onCreateCup={handleCreateCup} />
        )}
        {activeTab === 'stages' && (
          <StagesTab
            cups={cups}
            stages={stages}
            loading={loading}
            onCreateStage={handleCreateStage}
            onUpdateStage={handleUpdateStage}
            onDeleteStage={handleDeleteStage}
          />
        )}
        {activeTab === 'blogs' && (
          <BlogsTab
            blogs={blogs}
            loading={loading}
            onCreateBlog={handleCreateBlog}
            onUpdateBlog={handleUpdateBlog}
            onDeleteBlog={handleDeleteBlog}
          />
        )}
        {activeTab === 'settings' && (
          <SettingsTab />
        )}
      </div>
    </div>
  );
};

const MatchesTab = ({ matches, cups, stages, loading, onCreateMatch, onUpdateMatch, onResolveMatch, onUpdateStatus }) => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showResolveModal, setShowResolveModal] = useState(null);
  const [showStatusModal, setShowStatusModal] = useState(null);

  if (loading) {
    return <div className="text-center py-12">Loading...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Matches</h2>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
        >
          Create Match
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Teams</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Result</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {matches.map((match) => (
              <tr key={match._id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                  {match.teamA} vs {match.teamB}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  {new Date(match.date).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    match.status === 'upcoming' ? 'bg-yellow-100 text-yellow-800' :
                    match.status === 'live' ? 'bg-green-100 text-green-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {match.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  {match.result || 'Pending'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                  <button
                    onClick={() => setShowStatusModal(match)}
                    className="text-blue-600 hover:text-blue-900"
                  >
                    Update Status
                  </button>
                  {match.status === 'completed' && !match.isResolved && (
                    <button
                      onClick={() => setShowResolveModal(match)}
                      className="text-green-600 hover:text-green-900"
                    >
                      Resolve
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showCreateModal && (
        <CreateMatchModal
          cups={cups}
          stages={stages}
          onClose={() => setShowCreateModal(false)}
          onSubmit={onCreateMatch}
        />
      )}

      {showResolveModal && (
        <ResolveModal
          item={showResolveModal}
          type="match"
          onClose={() => setShowResolveModal(null)}
          onSubmit={onResolveMatch}
        />
      )}

      {showStatusModal && (
        <StatusModal
          match={showStatusModal}
          onClose={() => setShowStatusModal(null)}
          onSubmit={onUpdateStatus}
        />
      )}
    </div>
  );
};

const CreateMatchModal = ({ cups, stages, onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    teamA: '',
    teamB: '',
    date: '',
    cup: '',
    stage: '',
    stageName: '',
    marketYesLiquidity: '',
    marketNoLiquidity: '',
    isFeatured: false,
  });
  const [availableStages, setAvailableStages] = useState([]);

  useEffect(() => {
    if (formData.cup) {
      // Find the cup to get its slug
      const selectedCup = cups.find(c => c._id === formData.cup || c.slug === formData.cup);
      if (selectedCup) {
        // Fetch stages for the selected cup
        api.get(`/cups/${selectedCup.slug}/stages`)
          .then(response => {
            setAvailableStages(response.data);
          })
          .catch(error => {
            console.error('Error fetching stages:', error);
            setAvailableStages([]);
          });
      } else {
        setAvailableStages([]);
      }
    } else {
      setAvailableStages([]);
    }
  }, [formData.cup, cups]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const selectedStage = availableStages.find(s => s._id === formData.stage);
    onSubmit({
      ...formData,
      stageName: selectedStage?.name || formData.stageName,
      marketYesLiquidity: parseFloat(formData.marketYesLiquidity) || 0,
      marketNoLiquidity: parseFloat(formData.marketNoLiquidity) || 0,
    });
    onClose();
  };

  return (
    <Modal isOpen={true} onClose={onClose} title="Create Match" size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <input
            type="text"
            placeholder="Team A"
            value={formData.teamA}
            onChange={(e) => setFormData({ ...formData, teamA: e.target.value })}
            className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:text-white"
            required
          />
          <input
            type="text"
            placeholder="Team B"
            value={formData.teamB}
            onChange={(e) => setFormData({ ...formData, teamB: e.target.value })}
            className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:text-white"
            required
          />
        </div>
        <input
          type="datetime-local"
          value={formData.date}
          onChange={(e) => setFormData({ ...formData, date: e.target.value })}
          className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:text-white"
          required
        />
        <select
          value={formData.cup}
          onChange={(e) => {
            setFormData({ ...formData, cup: e.target.value, stage: '', stageName: '' });
          }}
          className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:text-white"
          required
        >
          <option value="">Select Cup</option>
          {cups.map((cup) => (
            <option key={cup._id} value={cup._id}>{cup.name}</option>
          ))}
        </select>
        {formData.cup && availableStages.length > 0 ? (
          <select
            value={formData.stage}
            onChange={(e) => {
              const selectedStage = availableStages.find(s => s._id === e.target.value);
              setFormData({ ...formData, stage: e.target.value, stageName: selectedStage?.name || '' });
            }}
            className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:text-white"
          >
            <option value="">Select Stage (optional)</option>
            {availableStages.map((stage) => (
              <option key={stage._id} value={stage._id}>{stage.name}</option>
            ))}
          </select>
        ) : formData.cup ? (
          <div className="text-sm text-gray-500 dark:text-gray-400">
            No stages found for this cup. Create stages in the Stages tab first.
          </div>
        ) : null}
        {!formData.stage && (
          <input
            type="text"
            placeholder="Stage Name (optional, if no stage selected)"
            value={formData.stageName}
            onChange={(e) => setFormData({ ...formData, stageName: e.target.value })}
            className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:text-white"
          />
        )}
        <div className="grid grid-cols-2 gap-4">
          <input
            type="number"
            step="0.01"
            placeholder="Market YES Liquidity (ETH)"
            value={formData.marketYesLiquidity}
            onChange={(e) => setFormData({ ...formData, marketYesLiquidity: e.target.value })}
            className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:text-white"
          />
          <input
            type="number"
            step="0.01"
            placeholder="Market NO Liquidity (ETH)"
            value={formData.marketNoLiquidity}
            onChange={(e) => setFormData({ ...formData, marketNoLiquidity: e.target.value })}
            className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:text-white"
          />
        </div>
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={formData.isFeatured}
            onChange={(e) => setFormData({ ...formData, isFeatured: e.target.checked })}
            className="mr-2"
          />
          <span className="text-gray-700 dark:text-gray-300">Featured Match</span>
        </label>
        <div className="flex space-x-2">
          <button
            type="submit"
            className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            Create
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
          >
            Cancel
          </button>
        </div>
      </form>
    </Modal>
  );
};

const ResolveModal = ({ item, type, onClose, onSubmit }) => {
  const [result, setResult] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(item._id, result);
    onClose();
  };

  const options = type === 'match' 
    ? [item.teamA, 'Draw', item.teamB]
    : ['YES', 'NO'];

  return (
    <Modal isOpen={true} onClose={onClose} title={`Resolve ${type === 'match' ? 'Match' : 'Poll'}`}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Result
          </label>
          <select
            value={result}
            onChange={(e) => setResult(e.target.value)}
            className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:text-white"
            required
          >
            <option value="">Select result</option>
            {options.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </div>
        <div className="flex space-x-2">
          <button
            type="submit"
            className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
          >
            Resolve
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
          >
            Cancel
          </button>
        </div>
      </form>
    </Modal>
  );
};

const StatusModal = ({ match, onClose, onSubmit }) => {
  const [status, setStatus] = useState(match.status);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(match._id, status);
    onClose();
  };

  return (
    <Modal isOpen={true} onClose={onClose} title="Update Match Status">
      <form onSubmit={handleSubmit} className="space-y-4">
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:text-white"
          required
        >
          <option value="upcoming">Upcoming</option>
          <option value="live">Live</option>
          <option value="locked">Locked</option>
          <option value="completed">Completed</option>
        </select>
        <div className="flex space-x-2">
          <button
            type="submit"
            className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            Update
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
          >
            Cancel
          </button>
        </div>
      </form>
    </Modal>
  );
};

const PollsTab = ({ polls, cups, stages, loading, onCreatePoll, onResolvePoll }) => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showResolveModal, setShowResolveModal] = useState(null);

  if (loading) return <div className="text-center py-12">Loading...</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Polls</h2>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
        >
          Create Poll
        </button>
      </div>
      
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Question</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Type</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Result</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {polls.length > 0 ? (
              polls.map((poll) => (
                <tr key={poll._id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                    {poll.question}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {poll.type}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      poll.status === 'active' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                      poll.status === 'settled' ? 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200' :
                      'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                    }`}>
                      {poll.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {poll.result || 'Pending'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                    {poll.status === 'settled' && !poll.isResolved && (
                      <button
                        onClick={() => setShowResolveModal(poll)}
                        className="text-green-600 hover:text-green-900 dark:text-green-400"
                      >
                        Resolve
                      </button>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="5" className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                  No polls found. Create one to get started!
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      
      {showCreateModal && (
        <CreatePollModal
          cups={cups}
          stages={stages}
          onClose={() => setShowCreateModal(false)}
          onSubmit={onCreatePoll}
        />
      )}
      {showResolveModal && (
        <ResolveModal
          item={showResolveModal}
          type="poll"
          onClose={() => setShowResolveModal(null)}
          onSubmit={onResolvePoll}
        />
      )}
    </div>
  );
};

const CreatePollModal = ({ cups, stages, onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    question: '',
    description: '',
    type: 'match',
    cup: '',
    marketYesLiquidity: '',
    marketNoLiquidity: '',
    isFeatured: false,
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      marketYesLiquidity: parseFloat(formData.marketYesLiquidity) || 0,
      marketNoLiquidity: parseFloat(formData.marketNoLiquidity) || 0,
    });
    onClose();
  };

  return (
    <Modal isOpen={true} onClose={onClose} title="Create Poll" size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="text"
          placeholder="Question"
          value={formData.question}
          onChange={(e) => setFormData({ ...formData, question: e.target.value })}
          className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:text-white"
          required
        />
        <textarea
          placeholder="Description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:text-white"
          rows="3"
        />
        <select
          value={formData.type}
          onChange={(e) => setFormData({ ...formData, type: e.target.value })}
          className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:text-white"
        >
          <option value="match">Match</option>
          <option value="team">Team</option>
          <option value="stage">Stage</option>
          <option value="award">Award</option>
        </select>
        <select
          value={formData.cup}
          onChange={(e) => setFormData({ ...formData, cup: e.target.value })}
          className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:text-white"
          required
        >
          <option value="">Select Cup</option>
          {cups.map((cup) => (
            <option key={cup._id} value={cup._id}>{cup.name}</option>
          ))}
        </select>
        <div className="grid grid-cols-2 gap-4">
          <input
            type="number"
            step="0.01"
            placeholder="Market YES Liquidity (ETH)"
            value={formData.marketYesLiquidity}
            onChange={(e) => setFormData({ ...formData, marketYesLiquidity: e.target.value })}
            className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:text-white"
          />
          <input
            type="number"
            step="0.01"
            placeholder="Market NO Liquidity (ETH)"
            value={formData.marketNoLiquidity}
            onChange={(e) => setFormData({ ...formData, marketNoLiquidity: e.target.value })}
            className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:text-white"
          />
        </div>
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={formData.isFeatured}
            onChange={(e) => setFormData({ ...formData, isFeatured: e.target.checked })}
            className="mr-2"
          />
          <span className="text-gray-700 dark:text-gray-300">Featured Poll</span>
        </label>
        <div className="flex space-x-2">
          <button type="submit" className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">
            Create
          </button>
          <button type="button" onClick={onClose} className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg">
            Cancel
          </button>
        </div>
      </form>
    </Modal>
  );
};

const CupsTab = ({ cups, loading, onCreateCup }) => {
  const [showCreateModal, setShowCreateModal] = useState(false);

  if (loading) return <div className="text-center py-12">Loading...</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Cups</h2>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
        >
          Create Cup
        </button>
      </div>
      
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Slug</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Active Matches</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Active Polls</th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {cups.length > 0 ? (
              cups.map((cup) => (
                <tr key={cup._id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                    {cup.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {cup.slug}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      cup.status === 'active' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                      cup.status === 'completed' ? 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200' :
                      'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                    }`}>
                      {cup.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {cup.activeMatches || 0}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {cup.activePolls || 0}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="5" className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                  No cups found. Create one to get started!
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      
      {showCreateModal && (
        <CreateCupModal
          onClose={() => setShowCreateModal(false)}
          onSubmit={onCreateCup}
        />
      )}
    </div>
  );
};

const CreateCupModal = ({ onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    status: 'upcoming',
    startDate: '',
    endDate: '',
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
    onClose();
  };

  return (
    <Modal isOpen={true} onClose={onClose} title="Create Cup">
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="text"
          placeholder="Name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value, slug: e.target.value.toLowerCase().replace(/\s+/g, '') })}
          className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:text-white"
          required
        />
        <input
          type="text"
          placeholder="Slug"
          value={formData.slug}
          onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
          className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:text-white"
          required
        />
        <textarea
          placeholder="Description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:text-white"
          rows="3"
        />
        <select
          value={formData.status}
          onChange={(e) => setFormData({ ...formData, status: e.target.value })}
          className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:text-white"
        >
          <option value="upcoming">Upcoming</option>
          <option value="active">Active</option>
          <option value="completed">Completed</option>
        </select>
        <div className="grid grid-cols-2 gap-4">
          <input
            type="date"
            value={formData.startDate}
            onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
            className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:text-white"
          />
          <input
            type="date"
            value={formData.endDate}
            onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
            className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:text-white"
          />
        </div>
        <div className="flex space-x-2">
          <button type="submit" className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">
            Create
          </button>
          <button type="button" onClick={onClose} className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg">
            Cancel
          </button>
        </div>
      </form>
    </Modal>
  );
};

const StagesTab = ({ cups, stages, loading, onCreateStage, onUpdateStage, onDeleteStage }) => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(null);
  const [selectedCup, setSelectedCup] = useState(null);
  const [filteredStages, setFilteredStages] = useState([]);
  const [updatingCurrentId, setUpdatingCurrentId] = useState(null);

  useEffect(() => {
    if (selectedCup) {
      setFilteredStages(stages.filter(s => s.cup?._id === selectedCup || s.cup === selectedCup));
    } else {
      setFilteredStages(stages);
    }
  }, [selectedCup, stages]);

  if (loading) {
    return <div className="text-center py-12">Loading...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Stages</h2>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
        >
          Create Stage
        </button>
      </div>

      {/* Cup Filter */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Filter by Cup
        </label>
        <select
          value={selectedCup || ''}
          onChange={(e) => setSelectedCup(e.target.value || null)}
          className="px-4 py-2 border rounded-lg dark:bg-gray-700 dark:text-white"
        >
          <option value="">All Cups</option>
          {cups.map((cup) => (
            <option key={cup._id} value={cup._id}>{cup.name}</option>
          ))}
        </select>
      </div>

      {/* Stages List */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Order</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Cup</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Current</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Start Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">End Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {filteredStages.map((stage) => (
              <tr key={stage._id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                  {stage.order}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                  {stage.name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  {stage.cup?.name || 'Unknown'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  {stage.isCurrent ? (
                    <span className="px-2 py-1 rounded-full text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                      Current
                    </span>
                  ) : (
                    <button
                      disabled={updatingCurrentId === stage._id}
                      onClick={async () => {
                        try {
                          setUpdatingCurrentId(stage._id);
                          await api.post(`/admin/stages/${stage._id}/set-current`);
                          // Refresh stages list
                          window.location.reload();
                        } catch (err) {
                          console.error('Failed to set current stage', err);
                        } finally {
                          setUpdatingCurrentId(null);
                        }
                      }}
                      className="text-xs text-blue-600 hover:text-blue-900 dark:text-blue-400 disabled:opacity-50"
                    >
                      Set Current
                    </button>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  {stage.startDate ? new Date(stage.startDate).toLocaleDateString() : '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  {stage.endDate ? new Date(stage.endDate).toLocaleDateString() : '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                  <button
                    onClick={() => setShowEditModal(stage)}
                    className="text-blue-600 hover:text-blue-900 dark:text-blue-400"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => {
                      if (window.confirm('Are you sure you want to delete this stage?')) {
                        onDeleteStage(stage._id);
                      }
                    }}
                    className="text-red-600 hover:text-red-900 dark:text-red-400"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filteredStages.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-600 dark:text-gray-400">No stages found. Create one to get started!</p>
        </div>
      )}

      {showCreateModal && (
        <CreateStageModal
          cups={cups}
          onClose={() => setShowCreateModal(false)}
          onSubmit={onCreateStage}
        />
      )}

      {showEditModal && (
        <EditStageModal
          stage={showEditModal}
          cups={cups}
          onClose={() => setShowEditModal(null)}
          onSubmit={(updates) => {
            onUpdateStage(showEditModal._id, updates);
            setShowEditModal(null);
          }}
        />
      )}
    </div>
  );
};

const CreateStageModal = ({ cups, onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    name: '',
    cup: '',
    order: 0,
    startDate: '',
    endDate: '',
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
    onClose();
  };

  return (
    <Modal isOpen={true} onClose={onClose} title="Create Stage" size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="text"
          placeholder="Stage Name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:text-white"
          required
        />
        <select
          value={formData.cup}
          onChange={(e) => setFormData({ ...formData, cup: e.target.value })}
          className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:text-white"
          required
        >
          <option value="">Select Cup</option>
          {cups.map((cup) => (
            <option key={cup._id} value={cup._id}>{cup.name}</option>
          ))}
        </select>
        <input
          type="number"
          placeholder="Order"
          value={formData.order}
          onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) || 0 })}
          className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:text-white"
        />
        <div className="grid grid-cols-2 gap-4">
          <input
            type="date"
            value={formData.startDate}
            onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
            className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:text-white"
          />
          <input
            type="date"
            value={formData.endDate}
            onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
            className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:text-white"
          />
        </div>
        <div className="flex space-x-2">
          <button
            type="submit"
            className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            Create
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
          >
            Cancel
          </button>
        </div>
      </form>
    </Modal>
  );
};

const EditStageModal = ({ stage, cups, onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    name: stage.name || '',
    cup: stage.cup?._id || stage.cup || '',
    order: stage.order || 0,
    startDate: stage.startDate ? new Date(stage.startDate).toISOString().split('T')[0] : '',
    endDate: stage.endDate ? new Date(stage.endDate).toISOString().split('T')[0] : '',
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <Modal isOpen={true} onClose={onClose} title="Edit Stage" size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="text"
          placeholder="Stage Name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:text-white"
          required
        />
        <select
          value={formData.cup}
          onChange={(e) => setFormData({ ...formData, cup: e.target.value })}
          className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:text-white"
          required
        >
          <option value="">Select Cup</option>
          {cups.map((cup) => (
            <option key={cup._id} value={cup._id}>{cup.name}</option>
          ))}
        </select>
        <input
          type="number"
          placeholder="Order"
          value={formData.order}
          onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) || 0 })}
          className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:text-white"
        />
        <div className="grid grid-cols-2 gap-4">
          <input
            type="date"
            value={formData.startDate}
            onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
            className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:text-white"
          />
          <input
            type="date"
            value={formData.endDate}
            onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
            className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:text-white"
          />
        </div>
        <div className="flex space-x-2">
          <button
            type="submit"
            className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            Update
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
          >
            Cancel
          </button>
        </div>
      </form>
    </Modal>
  );
};

const BlogsTab = ({ blogs, loading, onCreateBlog, onUpdateBlog, onDeleteBlog }) => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(null);

  if (loading) return <div className="text-center py-12">Loading...</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Blogs</h2>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
        >
          Create Blog
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Title</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Category</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Featured</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Views</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {blogs.map((blog) => (
              <tr key={blog._id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                  {blog.title}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  {blog.category}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    blog.isPublished 
                      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                      : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                  }`}>
                    {blog.isPublished ? 'Published' : 'Draft'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {blog.isFeatured && (
                    <span className="px-2 py-1 bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 rounded-full text-xs">
                      Featured
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  {blog.views || 0}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                  <button
                    onClick={() => setShowEditModal(blog)}
                    className="text-blue-600 hover:text-blue-900 dark:text-blue-400"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => setShowDeleteModal(blog)}
                    className="text-red-600 hover:text-red-900 dark:text-red-400"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {blogs.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-600 dark:text-gray-400">No blogs found. Create one to get started!</p>
        </div>
      )}

      {showCreateModal && (
        <CreateBlogModal
          onClose={() => setShowCreateModal(false)}
          onSubmit={onCreateBlog}
        />
      )}

      {showEditModal && (
        <EditBlogModal
          blog={showEditModal}
          onClose={() => setShowEditModal(null)}
          onSubmit={(updates) => {
            onUpdateBlog(showEditModal._id, updates);
            setShowEditModal(null);
          }}
        />
      )}
      
      {showDeleteModal && (
        <Modal isOpen={true} onClose={() => setShowDeleteModal(null)} title="Delete Blog">
          <div className="space-y-4">
            <p className="text-gray-700 dark:text-gray-300">
              Are you sure you want to delete <strong>{showDeleteModal.title}</strong>? This action cannot be undone.
            </p>
            <div className="flex space-x-2">
              <button
                onClick={() => {
                  onDeleteBlog(showDeleteModal._id);
                  setShowDeleteModal(null);
                }}
                className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
              >
                Delete
              </button>
              <button
                onClick={() => setShowDeleteModal(null)}
                className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

const CreateBlogModal = ({ onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    content: [{ type: 'paragraph', children: [{ text: '' }] }],
    thumbnail: '',
    category: 'General',
    tags: '',
    isFeatured: false,
    isPublished: false,
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      tags: formData.tags.split(',').map(t => t.trim()).filter(t => t),
    });
    onClose();
  };

  return (
    <Modal isOpen={true} onClose={onClose} title="Create Blog" size="full">
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="text"
          placeholder="Title"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:text-white"
          required
        />
        <textarea
          placeholder="Short Description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:text-white"
          rows="3"
          required
        />
        <input
          type="url"
          placeholder="Thumbnail Image URL"
          value={formData.thumbnail}
          onChange={(e) => setFormData({ ...formData, thumbnail: e.target.value })}
          className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:text-white"
        />
        <div className="grid grid-cols-2 gap-4">
          <input
            type="text"
            placeholder="Category"
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:text-white"
          />
          <input
            type="text"
            placeholder="Tags (comma separated)"
            value={formData.tags}
            onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
            className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:text-white"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Content
          </label>
          <BlogEditor
            value={formData.content}
            onChange={(content) => setFormData({ ...formData, content })}
          />
        </div>
        <div className="flex items-center space-x-4">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={formData.isFeatured}
              onChange={(e) => setFormData({ ...formData, isFeatured: e.target.checked })}
              className="mr-2"
            />
            <span className="text-gray-700 dark:text-gray-300">Featured</span>
          </label>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={formData.isPublished}
              onChange={(e) => setFormData({ ...formData, isPublished: e.target.checked })}
              className="mr-2"
            />
            <span className="text-gray-700 dark:text-gray-300">Publish</span>
          </label>
        </div>
        <div className="flex space-x-2">
          <button
            type="submit"
            className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            Create
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
          >
            Cancel
          </button>
        </div>
      </form>
    </Modal>
  );
};

const EditBlogModal = ({ blog, onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    title: blog.title || '',
    description: blog.description || '',
    content: blog.content || [{ type: 'paragraph', children: [{ text: '' }] }],
    thumbnail: blog.thumbnail || '',
    category: blog.category || 'General',
    tags: blog.tags?.join(', ') || '',
    isFeatured: blog.isFeatured || false,
    isPublished: blog.isPublished || false,
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      tags: formData.tags.split(',').map(t => t.trim()).filter(t => t),
    });
  };

  return (
    <Modal isOpen={true} onClose={onClose} title="Edit Blog" size="full">
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="text"
          placeholder="Title"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:text-white"
          required
        />
        <textarea
          placeholder="Short Description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:text-white"
          rows="3"
          required
        />
        <input
          type="url"
          placeholder="Thumbnail Image URL"
          value={formData.thumbnail}
          onChange={(e) => setFormData({ ...formData, thumbnail: e.target.value })}
          className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:text-white"
        />
        <div className="grid grid-cols-2 gap-4">
          <input
            type="text"
            placeholder="Category"
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:text-white"
          />
          <input
            type="text"
            placeholder="Tags (comma separated)"
            value={formData.tags}
            onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
            className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:text-white"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Content
          </label>
          <BlogEditor
            value={formData.content}
            onChange={(content) => setFormData({ ...formData, content })}
          />
        </div>
        <div className="flex items-center space-x-4">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={formData.isFeatured}
              onChange={(e) => setFormData({ ...formData, isFeatured: e.target.checked })}
              className="mr-2"
            />
            <span className="text-gray-700 dark:text-gray-300">Featured</span>
          </label>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={formData.isPublished}
              onChange={(e) => setFormData({ ...formData, isPublished: e.target.checked })}
              className="mr-2"
            />
            <span className="text-gray-700 dark:text-gray-300">Publish</span>
          </label>
        </div>
        <div className="flex space-x-2">
          <button
            type="submit"
            className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            Update
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
          >
            Cancel
          </button>
        </div>
      </form>
    </Modal>
  );
};

// Simple Blog Editor wrapper - SlateToolbar needs to be inside Slate context
const BlogEditor = ({ value, onChange }) => {
  const [editorValue, setEditorValue] = React.useState(value || [{ type: 'paragraph', children: [{ text: '' }] }]);

  React.useEffect(() => {
    if (value) {
      setEditorValue(value);
    }
  }, [value]);

  const handleChange = (newValue) => {
    setEditorValue(newValue);
    if (onChange) {
      onChange(newValue);
    }
  };

  return (
    <div>
      <SlateEditor value={editorValue} onChange={handleChange} showToolbar />
    </div>
  );
};

// Settings Tab Component
const SettingsTab = () => {
  const [dailyFreePlayLimit, setDailyFreePlayLimit] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { showNotification } = useNotification();

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await api.get('/admin/settings/dailyFreePlayLimit');
      if (response.data) {
        setDailyFreePlayLimit(response.data.value || 1);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.post('/admin/settings/dailyFreePlayLimit', { value: parseInt(dailyFreePlayLimit) });
      showNotification('Settings saved successfully!', 'success');
    } catch (error) {
      showNotification(error.response?.data?.message || 'Failed to save settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="text-center py-12">Loading...</div>;
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Settings</h2>
      
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Daily Free Play Limit
            </label>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
              Number of free predictions a user can make per day
            </p>
            <input
              type="number"
              min="1"
              value={dailyFreePlayLimit}
              onChange={(e) => setDailyFreePlayLimit(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:text-white"
            />
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Admin;
