import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useState, useEffect } from 'react';
import api from '../services/api';
import { LoadingSpinner } from '../components/shared/LoadingSpinner';
import { AdminInventoryView } from '../components/inventory/AdminInventoryView';
import { FuelTankInventoryDashboard } from '../components/FuelTankInventoryDashboard';

interface Station {
  id: string;
  name: string;
}

interface StationManager {
  id: string;
  name: string;
  employeeId: string;
  station?: Station;
}

interface AreaManager {
  id: string;
  name: string;
  employeeId: string;
  stationManagers?: StationManager[];
}

interface CashSummary {
  totalCash: number;
  cashWithStationManagers: number;
  cashWithAreaManager: number;
  cashDepositedInBank: number;
}

export const Dashboard = () => {
  const { user, isSM, isAM, isAdmin, isOfficeUser, isViewOnly } = useAuth();
  const navigate = useNavigate();

  const [stationManagers, setStationManagers] = useState<StationManager[]>([]);
  const [areaManager, setAreaManager] = useState<AreaManager | null>(null);
  const [station, setStation] = useState<Station | null>(null);
  const [loading, setLoading] = useState(true);
  const [assignedStations, setAssignedStations] = useState<Station[]>([]);
  const [cashSummary, setCashSummary] = useState<CashSummary | null>(null);
  const [cashLoading, setCashLoading] = useState(false);

  useEffect(() => {
    loadDashboardData();
  }, [user]);

  const loadDashboardData = async () => {
    try {
      const usersRes = await api.get('/api/users');
      const allUsers = usersRes.data.users;

      if (isAdmin) {
        loadCashSummary();
      } else if (isAM) {
        const sms = allUsers.filter((u: any) => u.role === 'SM' && u.areaManagerId === user?.id);
        const stationsRes = await api.get('/api/stations');
        const stations = stationsRes.data.stations;

        const smsWithStations = sms.map((sm: any) => ({
          ...sm,
          station: stations.find((s: any) => s.id === sm.stationId)
        }));

        setStationManagers(smsWithStations);
      } else if (isSM) {
        if (user?.areaManagerId) {
          const am = allUsers.find((u: any) => u.id === user.areaManagerId);
          setAreaManager(am);
        }

        if (user?.stationId) {
          const stationsRes = await api.get('/api/stations');
          const st = stationsRes.data.stations.find((s: any) => s.id === user.stationId);
          setStation(st);
        }
      } else if (isOfficeUser || isViewOnly) {
        // Load assigned stations for Office User or ViewOnly user
        const res = await api.get(`/api/office-users/${user?.id}/stations`);
        setAssignedStations(res.data.stations);
      }
    } catch (error) {
      console.error('Failed to load dashboard data', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCashSummary = async () => {
    try {
      setCashLoading(true);
      const res = await api.get('/api/cash/admin-summary');
      setCashSummary(res.data);
    } catch (error) {
      console.error('Failed to load cash summary', error);
    } finally {
      setCashLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome, {user?.name}!</h1>
            <p className="text-gray-600">
              You are logged in as <span className="font-semibold text-primary">{user?.role}</span>
            </p>
          </div>
          <Link
            to="/dashboard"
            className="flex items-center gap-2 text-gray-600 hover:text-primary transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            <span className="text-sm font-medium">Back to Dashboard</span>
          </Link>
        </div>
      </div>

      {/* Admin: Cash Overview Cards */}
      {isAdmin && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-xl shadow-sm border-l-4 border-primary p-6 card-hover">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-gray-600 uppercase tracking-wide">Total Cash</h3>
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <p className="text-3xl font-bold text-gray-900">
              {cashLoading ? '...' : cashSummary ? `${cashSummary.totalCash.toFixed(2)} SAR` : '0.00 SAR'}
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border-l-4 border-blue-500 p-6 card-hover">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-gray-600 uppercase tracking-wide">With Station Managers</h3>
              <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
            </div>
            <p className="text-3xl font-bold text-gray-900">
              {cashLoading ? '...' : cashSummary ? `${cashSummary.cashWithStationManagers.toFixed(2)} SAR` : '0.00 SAR'}
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border-l-4 border-green-500 p-6 card-hover">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-gray-600 uppercase tracking-wide">With Area Manager</h3>
              <div className="w-12 h-12 bg-green-50 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <p className="text-3xl font-bold text-gray-900">
              {cashLoading ? '...' : cashSummary ? `${cashSummary.cashWithAreaManager.toFixed(2)} SAR` : '0.00 SAR'}
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border-l-4 border-emerald-500 p-6 card-hover">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-gray-600 uppercase tracking-wide">Deposited in Bank</h3>
              <div className="w-12 h-12 bg-emerald-50 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
              </div>
            </div>
            <p className="text-3xl font-bold text-gray-900">
              {cashLoading ? '...' : cashSummary ? `${cashSummary.cashDepositedInBank.toFixed(2)} SAR` : '0.00 SAR'}
            </p>
          </div>
        </div>
      )}

      {/* Admin: Inventory Overview */}
      {isAdmin && (
        <div className="space-y-6">
          <AdminInventoryView onSelectStation={(id) => navigate(`/inventory?stationId=${id}`)} />
          <FuelTankInventoryDashboard />
        </div>
      )}

      {/* SM: Assignment Info */}
      {isSM && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Your Assignment</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <p className="text-sm text-gray-600 font-medium mb-2">Assigned Station</p>
              <p className="text-lg font-semibold text-gray-900">
                {station ? station.name : <span className="text-red-500">Not Assigned</span>}
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <p className="text-sm text-gray-600 font-medium mb-2">Reports To (Area Manager)</p>
              <p className="text-lg font-semibold text-gray-900">
                {areaManager ? `${areaManager.name} (${areaManager.employeeId})` : <span className="text-red-500">Not Assigned</span>}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* AM: Station Managers */}
      {isAM && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Station Managers Under You</h2>
          {stationManagers.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {stationManagers.map((sm) => (
                <div key={sm.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200 card-hover">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-semibold text-gray-900">{sm.name}</p>
                      <p className="text-sm text-gray-500">Employee ID: {sm.employeeId}</p>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <p className="text-sm text-gray-600">Station:</p>
                    <p className="font-medium text-gray-900">
                      {sm.station?.name || <span className="text-red-500">Not Assigned</span>}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">No station managers assigned to you yet.</p>
          )}
        </div>
      )}

      {/* OU / ViewOnly: Assigned Stations */}
      {(isOfficeUser || isViewOnly) && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Your Assigned Stations</h2>
          {assignedStations.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {assignedStations.map((s) => (
                <div key={s.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200 card-hover flex justify-between items-center">
                  <div>
                    <p className="font-semibold text-gray-900">{s.name}</p>
                  </div>
                  <button
                    onClick={() => navigate(`/inventory?stationId=${s.id}`)}
                    className="text-primary hover:text-primary/80"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500 mb-2">No stations assigned to you yet.</p>
              <p className="text-xs text-gray-400">Please contact administrator to assign stations.</p>
            </div>
          )}
        </div>
      )}

      {/* Module Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Hide Cash Flow Module from Accountant users (ViewOnly users CAN view) */}
        {user?.role !== 'Accountant' && (
          <Link
            to="/cash-flow"
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 card-hover group"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center group-hover:bg-primary transition-colors">
                <svg className="w-6 h-6 text-primary group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <svg className="w-5 h-5 text-gray-400 group-hover:text-primary transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Cash Flow Module</h2>
            <p className="text-gray-600">
              Track revenue and cash movement from station to bank
            </p>
          </Link>
        )}

        <Link
          to="/inventory"
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 card-hover group"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center group-hover:bg-primary transition-colors">
              <svg className="w-6 h-6 text-primary group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <svg className="w-5 h-5 text-gray-400 group-hover:text-primary transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Inventory Module</h2>
          <p className="text-gray-600">
            Track fuel levels in tanks and nozzle meter readings
          </p>
        </Link>

        {(isAdmin || user?.role === 'Procurement') && (
          <Link
            to="/procurement"
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 card-hover group"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center group-hover:bg-primary transition-colors">
                <svg className="w-6 h-6 text-primary group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
              </div>
              <svg className="w-5 h-5 text-gray-400 group-hover:text-primary transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Procurement Module</h2>
            <p className="text-gray-600">
              Confirm purchase orders and manage Aramco tickets
            </p>
          </Link>
        )}
      </div>
    </div>
  );
};
