import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import api from '../services/api';
import { StationPurchaseRequests } from '../components/StationPurchaseRequests';
import { LoadingSpinner } from '../components/shared/LoadingSpinner';

export const StationPurchaseRequestsPage = () => {
    const { user } = useAuth();
    const [stationName, setStationName] = useState('Loading...');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadStation = async () => {
            if (user?.stationId) {
                try {
                    const res = await api.get(`/api/stations/${user.stationId}`);
                    setStationName(res.data.station.name);
                } catch (error) {
                    console.error('Failed to load station:', error);
                    setStationName('My Station');
                } finally {
                    setLoading(false);
                }
            } else {
                setLoading(false);
            }
        };

        loadStation();
    }, [user?.stationId]);

    if (loading) return <LoadingSpinner />;

    if (!user?.stationId) {
        return (
            <div className="p-6">
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
                    <h2 className="text-xl font-semibold text-gray-900 mb-2">No Station Assigned</h2>
                    <p className="text-gray-600">
                        You need to be assigned to a station to access purchase requests.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Purchase Requests</h1>
                    <p className="text-gray-600 mt-1">Manage fuel purchase requests for {stationName}</p>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <StationPurchaseRequests
                    stationId={user.stationId}
                    stationName={stationName}
                />
            </div>
        </div>
    );
};
