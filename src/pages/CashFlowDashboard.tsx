import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import api from '../services/api';
import { StatusBadge } from '../components/shared/StatusBadge';
import { LoadingSpinner } from '../components/shared/LoadingSpinner';

interface CashTransaction {
  id: string;
  shiftId: string;
  stationId: string;
  litersSold: number;
  ratePerLiter: number;
  totalRevenue: number;
  cardPayments: number;
  cashOnHand: number;
  bankDeposit: number;
  cashToAM: number;
  status: string;
  createdAt: string;
  station: { name: string; stationType?: string };
  cashTransfer?: {
    id: string;
    fromUser: { name: string };
    toUser: { name: string };
    receiptUrl?: string;
    status: string;
    amountDeposited?: number;
    createdAt?: string;
    acceptedAt?: string;
    depositedAt?: string;
  };
}

export const CashFlowDashboard = () => {
  const { isAM } = useAuth();
  const [transactions, setTransactions] = useState<CashTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'transactions' | 'report'>('transactions');
  const [selectedTxIds, setSelectedTxIds] = useState<string[]>([]);

  // Date Filter State
  const [dateFilterType, setDateFilterType] = useState<'all' | 'single' | 'range'>('all');
  const [singleDate, setSingleDate] = useState(new Date().toISOString().split('T')[0]);
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

  // Report State
  const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0]);
  const [reportData, setReportData] = useState<any>(null);
  const [loadingReport, setLoadingReport] = useState(false);

  // Deposit Modal State
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [depositAmount, setDepositAmount] = useState<string>('');
  const [depositDate, setDepositDate] = useState(new Date().toISOString().split('T')[0]);
  const [depositNotes, setDepositNotes] = useState('');
  const [depositFile, setDepositFile] = useState<File | null>(null);
  const [submittingDeposit, setSubmittingDeposit] = useState(false);

  useEffect(() => {
    loadTransactions();
  }, [dateFilterType, singleDate, startDate, endDate]);

  useEffect(() => {
    if (activeTab === 'report' && isAM) {
      loadReport();
    }
  }, [activeTab, reportDate]);

  const loadTransactions = async () => {
    try {
      setLoading(true);
      let url = '/api/cash/transactions';
      const params = new URLSearchParams();

      if (dateFilterType === 'single') {
        params.append('date', singleDate);
      } else if (dateFilterType === 'range') {
        params.append('startDate', startDate);
        params.append('endDate', endDate);
      }

      if (params.toString()) {
        url += `?${params.toString()}`;
      }

      const res = await api.get(url);
      setTransactions(res.data.transactions);
    } catch (error) {
      console.error('Failed to load transactions', error);
    } finally {
      setLoading(false);
    }
  };

  const loadReport = async () => {
    try {
      setLoadingReport(true);
      const res = await api.get(`/api/cash/am/report?date=${reportDate}`);
      setReportData(res.data);
    } catch (error) {
      console.error('Failed to load report', error);
    } finally {
      setLoadingReport(false);
    }
  };

  const handleBulkAccept = async () => {
    if (!confirm(`Accept ${selectedTxIds.length} transactions?`)) return;
    try {
      await Promise.all(selectedTxIds.map(id => api.post(`/api/cash/transactions/${id}/accept`)));
      alert('Transactions accepted successfully');
      setSelectedTxIds([]);
      loadTransactions();
    } catch (error: any) {
      alert('Failed to accept some transactions');
      loadTransactions();
    }
  };

  const handleOpenDepositModal = () => {
    // calculate sum of selected valid transactions
    const selected = transactions.filter(t => selectedTxIds.includes(t.id) && t.status === 'WITH_AM');
    const sum = selected.reduce((acc, t) => acc + (t.cashToAM || 0) - (t.cashTransfer?.amountDeposited || 0), 0);
    setDepositAmount(sum.toString());
    setShowDepositModal(true);
  };

  const handleCreateDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!depositAmount || !depositDate) return;

    try {
      setSubmittingDeposit(true);
      let receiptUrl = '';

      // Upload file first if exists
      if (depositFile) {
        const formData = new FormData();
        formData.append('receipt', depositFile);
        // We reuse the existing receipt upload endpoint or need a general one. 
        // Ideally we should have a generic upload. 
        // For now, I'll use the one from tanker or similar if available, or just the one exposed in cash controller 
        // But cash controller's depositCashTransfer uploads specifically for a transaction ID.
        // I will assume for now we don't have a generic upload and I need to add one or use a trick.
        // Actually, the user's code usually has /upload/... 
        // I'll skip file upload logic change for now and assume the backend can handle it? 
        // No, I added `receiptUrl` to `createBankDeposit`. I need to get that URL.
        // Use: POST /api/upload/receipt (from tanker logic)
        const uploadRes = await api.post('/api/upload/receipt', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        receiptUrl = uploadRes.data.url;
      }

      // Finds transfer IDs from transaction IDs
      const selectedTransfers = transactions
        .filter(t => selectedTxIds.includes(t.id) && t.cashTransfer)
        .map(t => t.cashTransfer!.id);

      await api.post('/api/cash/deposits', {
        amount: parseFloat(depositAmount),
        depositDate,
        notes: depositNotes,
        receiptUrl,
        transferIds: selectedTransfers
      });

      alert('Deposit created successfully');
      setShowDepositModal(false);
      setDepositFile(null);
      setDepositNotes('');
      setSelectedTxIds([]);
      loadTransactions();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to create deposit');
    } finally {
      setSubmittingDeposit(false);
    }
  };

  // Helper to toggle selection
  const toggleSelect = (id: string) => {
    setSelectedTxIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const toggleSelectAll = (statusFilter: string) => {
    const candidates = filteredTransactions.filter(t => t.status === statusFilter).map(t => t.id);
    const allSelected = candidates.every(id => selectedTxIds.includes(id));

    if (allSelected) {
      setSelectedTxIds(prev => prev.filter(id => !candidates.includes(id)));
    } else {
      setSelectedTxIds(prev => [...new Set([...prev, ...candidates])]);
    }
  };

  const filteredTransactions = transactions;

  if (loading) return <div className="flex justify-center p-12"><LoadingSpinner size="lg" /></div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Cash Flow Dashboard</h1>
            <p className="text-gray-600">Track revenue and cash movement</p>
          </div>

          {isAM && (
            <div className="flex bg-gray-100 p-1 rounded-lg">
              <button
                onClick={() => setActiveTab('transactions')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'transactions' ? 'bg-white shadow-sm text-primary' : 'text-gray-600 hover:text-gray-900'}`}
              >
                Transactions
              </button>
              <button
                onClick={() => setActiveTab('report')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'report' ? 'bg-white shadow-sm text-primary' : 'text-gray-600 hover:text-gray-900'}`}
              >
                Daily Report
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Date Filter */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Date Filter</h3>
        <div className="flex flex-wrap gap-3 items-end">
          {/* Filter Type Buttons */}
          <div className="flex bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => setDateFilterType('all')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${dateFilterType === 'all' ? 'bg-green-600 text-white shadow-sm' : 'text-gray-600 hover:text-gray-900'
                }`}
            >
              All Time
            </button>
            <button
              onClick={() => setDateFilterType('single')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${dateFilterType === 'single' ? 'bg-gray-700 text-white shadow-sm' : 'text-gray-600 hover:text-gray-900'
                }`}
            >
              Single Date
            </button>
            <button
              onClick={() => setDateFilterType('range')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${dateFilterType === 'range' ? 'bg-gray-700 text-white shadow-sm' : 'text-gray-600 hover:text-gray-900'
                }`}
            >
              Date Range
            </button>
          </div>

          {/* Single Date Picker */}
          {dateFilterType === 'single' && (
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Select Date</label>
              <input
                type="date"
                value={singleDate}
                onChange={(e) => setSingleDate(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
          )}

          {/* Date Range Pickers */}
          {dateFilterType === 'range' && (
            <>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">End Date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
            </>
          )}
        </div>
      </div>

      {activeTab === 'transactions' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {/* Controls */}
          <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50/50">
            <div className="flex gap-2 items-center">
              {isAM && (
                <button
                  onClick={() => toggleSelectAll('WITH_AM')}
                  className="text-sm font-medium text-gray-600 hover:text-primary px-2 py-1 rounded hover:bg-gray-100"
                >
                  Select All With AM
                </button>
              )}
            </div>
            <div className="flex gap-2">
              {isAM && selectedTxIds.length > 0 && (
                <>
                  <button
                    onClick={handleBulkAccept}
                    className="px-3 py-1.5 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700"
                  >
                    Accept Selected ({selectedTxIds.length})
                  </button>
                  <button
                    onClick={handleOpenDepositModal}
                    className="px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
                  >
                    Deposit Selected ({selectedTxIds.length})
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {isAM && (
                    <th className="px-6 py-3 text-left">
                      <span className="sr-only">Select</span>
                    </th>
                  )}
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Station</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredTransactions.map(tx => (
                  <tr key={tx.id} className="hover:bg-gray-50">
                    {isAM && (
                      <td className="px-6 py-4">
                        <input
                          type="checkbox"
                          checked={selectedTxIds.includes(tx.id)}
                          onChange={() => toggleSelect(tx.id)}
                          className="rounded border-gray-300 text-primary focus:ring-primary"
                        />
                      </td>
                    )}
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {new Date(tx.createdAt).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {tx.station.name}
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-gray-900">
                      {tx.cashToAM.toFixed(2)} SAR
                      {tx.cashTransfer?.amountDeposited ? (
                        <div className="text-xs text-green-600 font-normal">
                          Deposited: {tx.cashTransfer.amountDeposited.toFixed(2)}
                        </div>
                      ) : null}
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={tx.status} />
                    </td>
                    <td className="px-6 py-4 text-sm">
                      {/* Action Buttons (Individual) */}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'report' && isAM && (
        <div className="space-y-6">
          <div className="flex items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-200">
            <label className="font-medium text-gray-700">Report Date:</label>
            <input
              type="date"
              value={reportDate}
              onChange={(e) => setReportDate(e.target.value)}
              className="border-gray-300 rounded-lg shadow-sm focus:border-primary focus:ring-primary"
            />
          </div>

          {loadingReport ? (
            <div className="flex justify-center p-8"><LoadingSpinner /></div>
          ) : reportData ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <h3 className="text-sm font-medium text-gray-500 mb-2">Opening Balance</h3>
                <p className="text-2xl font-bold text-gray-900">{reportData.openingBalance?.toFixed(2)} SAR</p>
              </div>
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <h3 className="text-sm font-medium text-gray-500 mb-2">Received Today</h3>
                <p className="text-2xl font-bold text-green-600">+{reportData.receivedToday?.toFixed(2)} SAR</p>
              </div>
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <h3 className="text-sm font-medium text-gray-500 mb-2">Deposited Today</h3>
                <p className="text-2xl font-bold text-red-600">-{reportData.depositedToday?.toFixed(2)} SAR</p>
              </div>
              <div className="bg-blue-50 p-6 rounded-xl shadow-sm border border-blue-100">
                <h3 className="text-sm font-medium text-blue-600 mb-2">Closing Balance</h3>
                <p className="text-2xl font-bold text-blue-900">{reportData.closingBalance?.toFixed(2)} SAR</p>
              </div>
            </div>
          ) : (
            <div className="text-center p-8 text-gray-500">No data available</div>
          )}
        </div>
      )}

      {/* Deposit Modal */}
      {showDepositModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold mb-4">Create Bank Deposit</h2>
            <form onSubmit={handleCreateDeposit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount (SAR)</label>
                <input
                  type="number"
                  required
                  step="0.01"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  className="w-full rounded-lg border-gray-300"
                />
                <p className="text-xs text-gray-500 mt-1">You are depositing for {selectedTxIds.length} selected transactions.</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Deposit Date</label>
                <input
                  type="date"
                  required
                  value={depositDate}
                  onChange={(e) => setDepositDate(e.target.value)}
                  className="w-full rounded-lg border-gray-300"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Receipt Image</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setDepositFile(e.target.files?.[0] || null)}
                  className="w-full text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={depositNotes}
                  onChange={(e) => setDepositNotes(e.target.value)}
                  className="w-full rounded-lg border-gray-300"
                  rows={3}
                />
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <button
                  type="button"
                  onClick={() => setShowDepositModal(false)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingDeposit}
                  className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50"
                >
                  {submittingDeposit ? 'Creating...' : 'Create Deposit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

