import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useState, useEffect } from 'react';
import api from '../services/api';

interface Station {
  id: string;
  name: string;
}

interface User {
  id: string;
  name: string;
  employeeId: string;
  station?: Station;
}

interface AreaManager {
  id: string;
  name: string;
  employeeId: string;
}

export const Dashboard = () => {
  const { user, isSM, isAM } = useAuth();
  const [stationManagers, setStationManagers] = useState<User[]>([]);
  const [areaManager, setAreaManager] = useState<AreaManager | null>(null);
  const [station, setStation] = useState<Station | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, [user]);

  const loadDashboardData = async () => {
    try {
      if (isAM) {
        // Load station managers under this area manager
        const res = await api.get('/api/users');
        const allUsers = res.data.users;
        const sms = allUsers.filter((u: any) => u.role === 'SM' && u.areaManagerId === user?.id);
        setStationManagers(sms);
      } else if (isSM) {
        // Load area manager and station info
        const res = await api.get('/api/users');
        const allUsers = res.data.users;

        if (user?.areaManagerId) {
          const am = allUsers.find((u: any) => u.id === user.areaManagerId);
          setAreaManager(am);
        }

        if (user?.stationId) {
          const stationsRes = await api.get('/api/stations');
          const st = stationsRes.data.stations.find((s: any) => s.id === user.stationId);
          setStation(st);
        }
      }
    } catch (error) {
      console.error('Failed to load dashboard data', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Welcome, {user?.name}!</h1>
        <p className="text-gray-600 mb-6">
          You are logged in as <span className="font-semibold">{user?.role}</span>
        </p>

        {/* Role-specific information */}
        {isSM && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <h3 className="text-lg font-semibold text-blue-900 mb-3">Your Assignment</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-blue-700 font-medium">Assigned Station:</p>
                <p className="text-blue-900 text-lg">
                  {station ? station.name : <span className="text-red-600">Not Assigned</span>}
                </p>
              </div>
              <div>
                <p className="text-sm text-blue-700 font-medium">Reports To (Area Manager):</p>
                <p className="text-blue-900 text-lg">
                  {areaManager ? `${areaManager.name} (${areaManager.employeeId})` : <span className="text-red-600">Not Assigned</span>}
                </p>
              </div>
            </div>
          </div>
        )}

        {isAM && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <h3 className="text-lg font-semibold text-green-900 mb-3">Station Managers Under You</h3>
            {loading ? (
              <p className="text-green-700">Loading...</p>
            ) : stationManagers.length > 0 ? (
              <div className="space-y-2">
                {stationManagers.map((sm) => (
                  <div key={sm.id} className="bg-white rounded p-3 border border-green-200">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-medium text-green-900">{sm.name}</p>
                        <p className="text-sm text-green-700">Employee ID: {sm.employeeId}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-green-700">Station:</p>
                        <p className="font-medium text-green-900">
                          {sm.station?.name || <span className="text-red-600">Not Assigned</span>}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-green-700">No station managers assigned to you yet.</p>
            )}
          </div>
        )}

        {/* Module Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-primary-50 p-6 rounded-lg">
            <h2 className="text-xl font-semibold text-primary-900 mb-2">Cash Flow Module</h2>
            <p className="text-primary-700 mb-4">
              Track revenue and cash movement from station to bank
            </p>
            <Link
              to="/cash-flow"
              className="text-primary-600 hover:text-primary-800 font-medium inline-flex items-center"
            >
              Go to Cash Flow
              <svg className="ml-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
          <div className="bg-primary-50 p-6 rounded-lg">
            <h2 className="text-xl font-semibold text-primary-900 mb-2">Inventory Module</h2>
            <p className="text-primary-700 mb-4">
              Track fuel levels in tanks and nozzle meter readings
            </p>
            <Link
              to="/inventory"
              className="text-primary-600 hover:text-primary-800 font-medium inline-flex items-center"
            >
              Go to Inventory
              <svg className="ml-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
