import { useState, useEffect } from 'react';
import api from '../services/api';
import { StatusBadge } from '../components/shared/StatusBadge';
import { LoadingSpinner } from '../components/shared/LoadingSpinner';

interface FloatingCashData {
  totalFloating: number;
  transactions: any[];
  breakdown: {
    pendingAcceptance: number;
    withAM: number;
  };
}

export const FloatingCashView = () => {
  const [data, setData] = useState<FloatingCashData | null>(null);
  const [loading, setLoading] = useState(true);
  const [stationTypeFilter, setStationTypeFilter] = useState<string>('ALL');

  useEffect(() => {
    loadFloatingCash();
  }, [stationTypeFilter]);

  const loadFloatingCash = async () => {
    try {
      setLoading(true);
      const params = stationTypeFilter !== 'ALL' ? { stationType: stationTypeFilter } : {};
      const res = await api.get('/api/cash/floating-cash', { params });
      setData(res.data);
    } catch (error) {
      console.error('Failed to load floating cash', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!data) {
    return <div className="text-center py-8">No data available</div>;
  }

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-foreground">Live Floating Cash</h1>
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium text-foreground">Filter by Station Type:</label>
          <select
            value={stationTypeFilter}
            onChange={(e) => setStationTypeFilter(e.target.value)}
            className="px-4 py-2 border border-input rounded-md shadow-sm focus:ring-2 focus:ring-ring focus:border-transparent bg-background text-foreground"
          >
            <option value="ALL">All Stations</option>
            <option value="OPERATIONAL">Operational</option>
            <option value="RENTAL">Rental</option>
            <option value="FRANCHISE">Franchise</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-card shadow rounded-lg p-6 border border-card-border">
          <h3 className="text-sm font-medium text-muted-foreground">Total Floating Cash</h3>
          <p className="text-3xl font-bold text-primary mt-2">
            ${data.totalFloating.toFixed(2)}
          </p>
        </div>
        <div className="bg-card shadow rounded-lg p-6 border border-card-border">
          <h3 className="text-sm font-medium text-muted-foreground">Pending Acceptance</h3>
          <p className="text-3xl font-bold text-[rgb(245_158_11)] mt-2">
            ${data.breakdown.pendingAcceptance.toFixed(2)}
          </p>
        </div>
        <div className="bg-card shadow rounded-lg p-6 border border-card-border">
          <h3 className="text-sm font-medium text-muted-foreground">With Area Managers</h3>
          <p className="text-3xl font-bold text-primary mt-2">
            ${data.breakdown.withAM.toFixed(2)}
          </p>
        </div>
      </div>

      <div className="bg-card shadow rounded-lg overflow-hidden border border-card-border">
        <table className="min-w-full divide-y divide-border">
          <thead className="bg-muted">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                Station
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                Amount
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                From
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                To
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                Created
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                Updated
              </th>
            </tr>
          </thead>
          <tbody className="bg-card divide-y divide-border">
            {data.transactions.map((tx) => (
              <tr key={tx.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                  {tx.station.name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                  ${tx.cashToAM.toFixed(2)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <StatusBadge status={tx.status} />
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                  {tx.cashTransfer?.fromUser?.name || 'N/A'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                  {tx.cashTransfer?.toUser?.name || 'N/A'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                  {tx.cashTransfer?.createdAt 
                    ? new Date(tx.cashTransfer.createdAt).toLocaleString()
                    : new Date(tx.createdAt).toLocaleString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                  {tx.cashTransfer?.updatedAt 
                    ? new Date(tx.cashTransfer.updatedAt).toLocaleString()
                    : new Date(tx.updatedAt).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

