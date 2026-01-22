import { useState, useEffect } from 'react';
import api from '../services/api';

interface Station {
    id: string;
    name: string;
}

interface BuyingRate {
    id: string;
    stationId: string;
    fuelType: string;
    buyingPricePerLiter: number;
    effectiveFrom: string;
    createdAt: string;
}

interface StationRates {
    stationId: string;
    stationName: string;
    rates: {
        '91_GASOLINE'?: number;
        '95_GASOLINE'?: number;
        '98_GASOLINE'?: number;
        'DIESEL'?: number;
    };
}

export const AdminFuelBuyingRates = () => {
    const [stationRates, setStationRates] = useState<StationRates[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingStation, setEditingStation] = useState<string | null>(null);
    const [editingFuelType, setEditingFuelType] = useState<string | null>(null);
    const [editValue, setEditValue] = useState('');

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            // Fetch all stations
            const stationsRes = await api.get('/api/stations');
            const stationsData = stationsRes.data.stations || stationsRes.data;

            // Fetch buying rates for each station
            const ratesPromises = stationsData.map(async (station: Station) => {
                try {
                    const res = await api.get(`/api/fuel-buying-rates/station/${station.id}`);
                    const rates = res.data.rates || [];

                    const rateMap: any = {};
                    rates.forEach((rate: BuyingRate) => {
                        rateMap[rate.fuelType] = rate.buyingPricePerLiter;
                    });

                    return {
                        stationId: station.id,
                        stationName: station.name,
                        rates: rateMap,
                    };
                } catch (error) {
                    return {
                        stationId: station.id,
                        stationName: station.name,
                        rates: {},
                    };
                }
            });

            const ratesData = await Promise.all(ratesPromises);
            setStationRates(ratesData);
        } catch (error) {
            console.error('Error fetching data:', error);
            alert('Failed to fetch data');
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (stationId: string, fuelType: string, currentValue?: number) => {
        setEditingStation(stationId);
        setEditingFuelType(fuelType);
        setEditValue(currentValue?.toString() || '');
    };

    const handleSave = async () => {
        if (!editingStation || !editingFuelType || !editValue) return;

        try {
            await api.post('/api/fuel-buying-rates', {
                stationId: editingStation,
                fuelType: editingFuelType,
                buyingPricePerLiter: parseFloat(editValue),
            });

            alert('Buying rate updated successfully');
            setEditingStation(null);
            setEditingFuelType(null);
            setEditValue('');
            fetchData();
        } catch (error: any) {
            console.error('Error saving rate:', error);
            alert(error.response?.data?.error || 'Failed to save buying rate');
        }
    };

    const handleCancel = () => {
        setEditingStation(null);
        setEditingFuelType(null);
        setEditValue('');
    };



    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-gray-600">Loading...</div>
            </div>
        );
    }

    return (
        <div className="p-6">
            <div className="mb-6">
                <h1 className="text-3xl font-bold text-gray-900">Fuel Buying Rates</h1>
                <p className="text-gray-600 mt-2">Manage fuel buying prices per station and fuel type</p>
            </div>

            <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Station
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    91 Gasoline (SAR/L)
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    95 Gasoline (SAR/L)
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    98 Gasoline (SAR/L)
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Diesel (SAR/L)
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {stationRates.map((stationRate) => (
                                <tr key={stationRate.stationId} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-medium text-gray-900">
                                            {stationRate.stationName}
                                        </div>
                                    </td>
                                    {['91_GASOLINE', '95_GASOLINE', '98_GASOLINE', 'DIESEL'].map((fuelType) => (
                                        <td key={fuelType} className="px-6 py-4 whitespace-nowrap">
                                            {editingStation === stationRate.stationId && editingFuelType === fuelType ? (
                                                <div className="flex items-center gap-2">
                                                    <input
                                                        type="number"
                                                        step="0.0000000001"
                                                        value={editValue}
                                                        onChange={(e) => setEditValue(e.target.value)}
                                                        className="w-32 px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-primary focus:border-transparent"
                                                        autoFocus
                                                    />
                                                    <button
                                                        onClick={handleSave}
                                                        className="px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700"
                                                    >
                                                        Save
                                                    </button>
                                                    <button
                                                        onClick={handleCancel}
                                                        className="px-2 py-1 bg-gray-300 text-gray-700 text-xs rounded hover:bg-gray-400"
                                                    >
                                                        Cancel
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm text-gray-900">
                                                        {stationRate.rates[fuelType as keyof typeof stationRate.rates]?.toFixed(10) || '-'}
                                                    </span>
                                                    <button
                                                        onClick={() => handleEdit(
                                                            stationRate.stationId,
                                                            fuelType,
                                                            stationRate.rates[fuelType as keyof typeof stationRate.rates]
                                                        )}
                                                        className="text-primary hover:text-primary/80 text-xs"
                                                    >
                                                        {stationRate.rates[fuelType as keyof typeof stationRate.rates] ? 'Edit' : 'Set'}
                                                    </button>
                                                </div>
                                            )}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-blue-900 mb-2">💡 Important Notes</h3>
                <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                    <li>Buying rates must be set before station managers can create purchase requests</li>
                    <li>When you update a rate, the new rate will be used for all future purchase requests</li>
                    <li>Existing purchase requests will retain their original buying rate</li>
                    <li>The total amount in PR is auto-calculated as: (Quantity × Buying Rate) + Transportation Cost</li>
                </ul>
            </div>
        </div>
    );
};
