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
  station: { name: string };
  cashTransfer?: {
    id: string;
    fromUser: { name: string };
    toUser: { name: string };
    receiptUrl?: string;
    createdAt?: string;
    updatedAt?: string;
    depositedAt?: string;
  };
}

interface Station {
  id: string;
  name: string;
}

export const CashFlowDashboard = () => {
  const { isSM, isAM } = useAuth();
  const [transactions, setTransactions] = useState<CashTransaction[]>([]);
  const [stations, setStations] = useState<Station[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEntryForm, setShowEntryForm] = useState(false);
  const [formData, setFormData] = useState({
    stationId: '',
    litersSold: '',
    ratePerLiter: '',
    cardPayments: '',
    bankDeposit: '',
  });

  useEffect(() => {
    loadTransactions();
    loadStations();
  }, []);

  const loadStations = async () => {
    try {
      const res = await api.get('/api/stations');
      setStations(res.data.stations);
    } catch (error) {
      console.error('Failed to load stations', error);
    }
  };

  const loadTransactions = async () => {
    try {
      const res = await api.get('/api/cash/transactions');
      setTransactions(res.data.transactions);
    } catch (error) {
      console.error('Failed to load transactions', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/api/cash/transactions', {
        stationId: formData.stationId,
        litersSold: parseFloat(formData.litersSold),
        ratePerLiter: parseFloat(formData.ratePerLiter),
        cardPayments: parseFloat(formData.cardPayments || '0'),
        bankDeposit: parseFloat(formData.bankDeposit || '0'),
      });
      setShowEntryForm(false);
      setFormData({
        stationId: '',
        litersSold: '',
        ratePerLiter: '',
        cardPayments: '',
        bankDeposit: '',
      });
      loadTransactions();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to create transaction');
    }
  };

  const handleTransfer = async (transactionId: string) => {
    try {
      await api.post(`/api/cash/transactions/${transactionId}/transfer`);
      alert('Transfer initiated successfully');
      loadTransactions();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to initiate transfer');
    }
  };

  const handleAccept = async (transactionId: string) => {
    if (!confirm('Accept this cash transfer?')) return;
    try {
      await api.post(`/api/cash/transactions/${transactionId}/accept`);
      alert('Cash accepted successfully');
      loadTransactions();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to accept cash');
    }
  };

  const handleDeposit = async (transactionId: string, file: File) => {
    try {
      const formData = new FormData();
      formData.append('receipt', file);
      await api.post(`/api/cash/transactions/${transactionId}/deposit`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      alert('Cash deposited successfully');
      loadTransactions();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to deposit cash');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Cash Flow Dashboard</h1>
            <p className="text-gray-600">Track revenue and cash movement from station to bank</p>
          </div>
          {isSM && (
            <button
              onClick={() => setShowEntryForm(!showEntryForm)}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-medium"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              {showEntryForm ? 'Cancel' : 'New Transaction'}
            </button>
          )}
        </div>
      </div>

      {showEntryForm && isSM && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-900">Enter Cash Transaction</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Station</label>
                <select
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  value={formData.stationId}
                  onChange={(e) => setFormData({ ...formData, stationId: e.target.value })}
                >
                  <option value="">Select Station</option>
                  {stations.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Liters Sold</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  value={formData.litersSold}
                  onChange={(e) => setFormData({ ...formData, litersSold: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Rate per Liter</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  value={formData.ratePerLiter}
                  onChange={(e) => setFormData({ ...formData, ratePerLiter: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Card Payments</label>
                <input
                  type="number"
                  step="0.01"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  value={formData.cardPayments}
                  onChange={(e) => setFormData({ ...formData, cardPayments: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Bank Deposit</label>
                <input
                  type="number"
                  step="0.01"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  value={formData.bankDeposit}
                  onChange={(e) => setFormData({ ...formData, bankDeposit: e.target.value })}
                />
              </div>
            </div>
            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-medium"
              >
                Submit
              </button>
              <button
                type="button"
                onClick={() => setShowEntryForm(false)}
                className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Transactions Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Station</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Liters</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Revenue</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cash to AM</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sent At</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Accepted At</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Deposited At</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-6 py-12 text-center text-gray-500">
                    No transactions found. Create your first transaction above.
                  </td>
                </tr>
              ) : (
                transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {new Date(tx.createdAt).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {tx.station.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {tx.litersSold.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                      {tx.totalRevenue.toFixed(2)} SAR
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                      {tx.cashToAM.toFixed(2)} SAR
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <StatusBadge status={tx.status} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {tx.cashTransfer?.createdAt 
                        ? new Date(tx.cashTransfer.createdAt).toLocaleString()
                        : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {tx.status === 'WITH_AM' || tx.status === 'DEPOSITED'
                        ? (tx.cashTransfer?.updatedAt 
                            ? new Date(tx.cashTransfer.updatedAt).toLocaleString()
                            : '-')
                        : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {tx.cashTransfer?.depositedAt 
                        ? new Date(tx.cashTransfer.depositedAt).toLocaleString()
                        : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center gap-2">
                        {tx.status === 'PENDING_ACCEPTANCE' && isSM && !tx.cashTransfer && (
                          <button
                            onClick={() => handleTransfer(tx.id)}
                            className="text-primary hover:text-primary/80 font-medium"
                          >
                            Transfer to AM
                          </button>
                        )}
                        {tx.status === 'PENDING_ACCEPTANCE' && isAM && (
                          <button
                            onClick={() => handleAccept(tx.id)}
                            className="text-primary hover:text-primary/80 font-medium"
                          >
                            Accept Cash
                          </button>
                        )}
                        {tx.status === 'WITH_AM' && isAM && (
                          <label className="text-primary hover:text-primary/80 cursor-pointer font-medium">
                            Deposit to Bank
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleDeposit(tx.id, file);
                              }}
                            />
                          </label>
                        )}
                        {tx.cashTransfer?.receiptUrl && (
                          <a
                            href={tx.cashTransfer.receiptUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:text-primary/80 font-medium"
                          >
                            Receipt
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

