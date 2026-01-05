import { useState, useEffect } from 'react';
import api from '../services/api';
import { LoadingSpinner } from '../components/shared/LoadingSpinner';

interface Station {
    id: string;
    name: string;
}

interface StationManager {
    id: string;
    name: string;
    employeeId: string;
    station?: Station;
    areaManagerId?: string;
}

interface AreaManager {
    id: string;
    name: string;
    employeeId: string;
    stationManagers?: StationManager[];
}

export const OrganizationStructure = () => {
    const [areaManagers, setAreaManagers] = useState<AreaManager[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const usersRes = await api.get('/api/users');
            const allUsers = usersRes.data.users;
            const stationsRes = await api.get('/api/stations');
            const stations = stationsRes.data.stations;

            const ams = allUsers.filter((u: any) => u.role === 'AM');
            const sms = allUsers.filter((u: any) => u.role === 'SM');

            const smsWithStations = sms.map((sm: any) => ({
                ...sm,
                station: stations.find((s: any) => s.id === sm.stationId)
            }));

            const amsWithSMs = ams.map((am: any) => ({
                ...am,
                stationManagers: smsWithStations.filter((sm: any) => sm.areaManagerId === am.id)
            }));

            setAreaManagers(amsWithSMs);
        } catch (error) {
            console.error('Failed to load organization structure', error);
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

    return (
        <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h1 className="text-3xl font-bold text-gray-900">Organization Structure</h1>
                <p className="text-gray-600 mt-2">Overview of Area Managers and Station Allocations</p>
            </div>

            {areaManagers.length > 0 ? (
                <div className="space-y-4">
                    {areaManagers.map((am) => (
                        <div key={am.id} className="bg-gray-50 rounded-lg border border-gray-200 overflow-hidden">
                            <div className="bg-gradient-to-r from-primary to-primary/80 p-4">
                                <div className="flex items-center text-white">
                                    <div className="w-12 h-12 bg-white/20 rounded-full p-3 mr-4 flex items-center justify-center">
                                        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                                        </svg>
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium opacity-90">Area Manager</p>
                                        <p className="text-xl font-bold">{am.name}</p>
                                        <p className="text-sm opacity-75">ID: {am.employeeId}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="p-4">
                                {am.stationManagers && am.stationManagers.length > 0 ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {am.stationManagers.map((sm) => (
                                            <div key={sm.id} className="bg-white rounded-lg p-4 border border-gray-200 card-hover">
                                                <div className="flex items-start gap-3">
                                                    <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                                                        <svg className="w-5 h-5 text-primary" fill="currentColor" viewBox="0 0 20 20">
                                                            <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                                                        </svg>
                                                    </div>
                                                    <div className="flex-1">
                                                        <p className="text-xs text-gray-500 font-medium mb-1">Station Manager</p>
                                                        <p className="font-semibold text-gray-900">{sm.name}</p>
                                                        <p className="text-xs text-gray-500">ID: {sm.employeeId}</p>
                                                        <div className="mt-2 pt-2 border-t border-gray-100">
                                                            <div className="flex items-center text-sm">
                                                                <svg className="w-4 h-4 text-primary mr-1" fill="currentColor" viewBox="0 0 20 20">
                                                                    <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                                                                </svg>
                                                                <span className="font-medium text-gray-700">
                                                                    {sm.station ? sm.station.name : <span className="text-red-500">Not Assigned</span>}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-gray-500 text-center py-4">No station managers assigned</p>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <p className="text-gray-500 text-center py-8">No area managers found</p>
            )}
        </div>
    );
};
