import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import Modal from '../components/Modal';
import { useNotification } from '../components/Notification';

const SuperAdmin = () => {
  const [activeTab, setActiveTab] = useState('fees');
  const [feeSettings, setFeeSettings] = useState({
    platformFee: '',
    boostJackpotFee: '',
    marketPlatformFee: '',
    freeJackpotFee: '',
  });
  const [contractBalance, setContractBalance] = useState('');
  const [transferAmount, setTransferAmount] = useState('');
  const [transferTo, setTransferTo] = useState('');
  const [superAdminAddress, setSuperAdminAddress] = useState('');
  const [matches, setMatches] = useState([]);
  const [polls, setPolls] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [modalContent, setModalContent] = useState({ title: '', message: '', type: 'success' });
  const { showNotification } = useNotification();

  const showModalMessage = (title, message, type = 'success') => {
    setModalContent({ title, message, type });
    setShowModal(true);
  };

  const handleSetFees = async () => {
    try {
      await api.post('/superadmin/set-fees', feeSettings);
      showModalMessage('Success', 'Fees updated successfully!', 'success');
      await handleGetFees();
    } catch (error) {
      showModalMessage('Error', error.response?.data?.message || 'Failed to set fees', 'error');
    }
  };

  const handleGetFees = async () => {
    try {
      const response = await api.get('/superadmin/get-fees');
      setFeeSettings(response.data);
    } catch (error) {
      showModalMessage('Error', error.response?.data?.message || 'Failed to get fees', 'error');
    }
  };

  const handleGetBalance = async () => {
    try {
      const response = await api.get('/superadmin/contract-balance');
      setContractBalance(response.data.balance);
    } catch (error) {
      showModalMessage('Error', error.response?.data?.message || 'Failed to get balance', 'error');
    }
  };

  const handleTransfer = async () => {
    try {
      await api.post('/superadmin/transfer', {
        to: transferTo,
        amount: transferAmount,
      });
      showModalMessage('Success', 'Transfer successful!', 'success');
      setTransferAmount('');
      setTransferTo('');
    } catch (error) {
      showModalMessage('Error', error.response?.data?.message || 'Transfer failed', 'error');
    }
  };

  const handleSetSuperAdmin = async () => {
    try {
      await api.post('/superadmin/set-superadmin', {
        address: superAdminAddress,
      });
      showModalMessage('Success', 'SuperAdmin address set successfully!', 'success');
      setSuperAdminAddress('');
    } catch (error) {
      showModalMessage('Error', error.response?.data?.message || 'Failed to set SuperAdmin', 'error');
    }
  };

  const fetchMatches = async () => {
    setLoading(true);
    try {
      const response = await api.get('/superadmin/matches');
      setMatches(response.data || []);
    } catch (error) {
      showModalMessage('Error', 'Failed to fetch matches', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchPolls = async () => {
    setLoading(true);
    try {
      const response = await api.get('/superadmin/polls');
      setPolls(response.data || []);
    } catch (error) {
      showModalMessage('Error', 'Failed to fetch polls', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'matches') {
      fetchMatches();
    } else if (activeTab === 'polls') {
      fetchPolls();
    } else if (activeTab === 'fees') {
      handleGetFees();
    }
  }, [activeTab]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-8">
          Super Admin Dashboard
        </h1>

        {/* Tabs */}
        <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
          <nav className="-mb-px flex space-x-8">
            {['fees', 'matches', 'polls', 'contract', 'superadmin'].map((tab) => (
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
        {activeTab === 'fees' && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
              Fee Management
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Platform Fee (%)
                </label>
                <input
                  type="number"
                  value={feeSettings.platformFee}
                  onChange={(e) => setFeeSettings({ ...feeSettings, platformFee: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:text-white"
                  placeholder="10"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Boost Jackpot Fee (%)
                </label>
                <input
                  type="number"
                  value={feeSettings.boostJackpotFee}
                  onChange={(e) => setFeeSettings({ ...feeSettings, boostJackpotFee: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:text-white"
                  placeholder="10"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Market Platform Fee (%)
                </label>
                <input
                  type="number"
                  value={feeSettings.marketPlatformFee}
                  onChange={(e) => setFeeSettings({ ...feeSettings, marketPlatformFee: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:text-white"
                  placeholder="5"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Free Jackpot Fee (%)
                </label>
                <input
                  type="number"
                  value={feeSettings.freeJackpotFee}
                  onChange={(e) => setFeeSettings({ ...feeSettings, freeJackpotFee: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:text-white"
                  placeholder="5"
                />
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={handleSetFees}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                >
                  Set Fees
                </button>
                <button
                  onClick={handleGetFees}
                  className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
                >
                  Get Current Fees
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'matches' && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Matches Data
            </h2>
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Match</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Cup</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Free Jackpot</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Boost Jackpot</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Platform Fees</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {matches.map((match) => (
                      <tr key={match._id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                          {match.teamA} vs {match.teamB}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                          {match.cup?.name || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            match.isResolved ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200' :
                            'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
                          }`}>
                            {match.isResolved ? 'Resolved' : match.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                          {((match.isResolved && match.originalFreeJackpotPool) ? match.originalFreeJackpotPool : (match.freeJackpotPool || 0)).toFixed(4)} ETH
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                          {((match.isResolved && match.originalBoostJackpotPool) ? match.originalBoostJackpotPool : (match.boostJackpotPool || 0)).toFixed(4)} ETH
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                          {(match.platformFees || 0).toFixed(4)} ETH
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {matches.length === 0 && (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    No matches found
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'polls' && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Polls Data
            </h2>
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Question</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Cup</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Free Jackpot</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Boost Jackpot</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Platform Fees</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {polls.map((poll) => (
                      <tr key={poll._id}>
                        <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">
                          {poll.question}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                          {poll.cup?.name || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            poll.isResolved ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200' :
                            'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
                          }`}>
                            {poll.isResolved ? 'Resolved' : poll.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                          {((poll.isResolved && poll.originalFreeJackpotPool) ? poll.originalFreeJackpotPool : (poll.freeJackpotPool || 0)).toFixed(4)} ETH
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                          {((poll.isResolved && poll.originalBoostJackpotPool) ? poll.originalBoostJackpotPool : (poll.boostJackpotPool || 0)).toFixed(4)} ETH
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                          {(poll.platformFees || 0).toFixed(4)} ETH
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {polls.length === 0 && (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    No polls found
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'contract' && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                Contract Balance
              </h2>
              <div className="flex items-center space-x-4">
                <p className="text-lg text-gray-700 dark:text-gray-300">
                  Balance: {contractBalance || 'N/A'} ETH
                </p>
                <button
                  onClick={handleGetBalance}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                >
                  Refresh
                </button>
              </div>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                Transfer Funds
              </h2>
              <div className="space-y-4">
                <input
                  type="text"
                  value={transferTo}
                  onChange={(e) => setTransferTo(e.target.value)}
                  placeholder="Recipient Address"
                  className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:text-white"
                />
                <input
                  type="number"
                  value={transferAmount}
                  onChange={(e) => setTransferAmount(e.target.value)}
                  placeholder="Amount (ETH)"
                  className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:text-white"
                />
                <button
                  onClick={handleTransfer}
                  className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
                >
                  Transfer
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'superadmin' && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Set SuperAdmin Address
            </h2>
            <div className="space-y-4">
              <input
                type="text"
                value={superAdminAddress}
                onChange={(e) => setSuperAdminAddress(e.target.value)}
                placeholder="SuperAdmin Address"
                className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:text-white"
              />
              <button
                onClick={handleSetSuperAdmin}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
              >
                Set SuperAdmin
              </button>
            </div>
          </div>
        )}

        {/* Modal for notifications */}
        {showModal && (
          <Modal
            isOpen={showModal}
            onClose={() => setShowModal(false)}
            title={modalContent.title}
          >
            <div className="p-4">
              <p className={`mb-4 ${
                modalContent.type === 'error' ? 'text-red-600 dark:text-red-400' : 'text-gray-700 dark:text-gray-300'
              }`}>
                {modalContent.message}
              </p>
              <button
                onClick={() => setShowModal(false)}
                className={`w-full px-4 py-2 rounded-lg ${
                  modalContent.type === 'error'
                    ? 'bg-red-500 hover:bg-red-600'
                    : 'bg-blue-500 hover:bg-blue-600'
                } text-white transition-colors`}
              >
                OK
              </button>
            </div>
          </Modal>
        )}
      </div>
    </div>
  );
};

export default SuperAdmin;
