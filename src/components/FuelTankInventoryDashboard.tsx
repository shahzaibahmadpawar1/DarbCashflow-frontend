import { useState, useEffect } from 'react';
import api from '../services/api';

interface FuelTypeSummary {
    totalLiters: number;
    deliveryCount: number;
    stations: any[];
}

interface InventorySummary {
    '91_GASOLINE': FuelTypeSummary;
    '95_GASOLINE': FuelTypeSummary;
    'DIESEL': FuelTypeSummary;
}

interface StationDelivery {
    stationId: string;
    stationName: string;
    stationAddress?: string;
    totalLiters: number;
    deliveries: Array<{
        id: string;
        litersDelivered: number;
        deliveryDate: string;
        aramcoTicket?: string;
        receiptUrl?: string;
        notes?: string;
        deliveredBy?: string;
    }>;
}

export const FuelTankInventoryDashboard = () => {
    const [summary, setSummary] = useState<InventorySummary | null>(null);
    const [loading, setLoading] = useState(true);
    const [selectedFuelType, setSelectedFuelType] = useState<'91_GASOLINE' | '95_GASOLINE' | 'DIESEL' | null>(null);
    const [fuelTypeDetails, setFuelTypeDetails] = useState<any>(null);
    const [loadingDetails, setLoadingDetails] = useState(false);

    // Date Filter State
    const [dateFilterType, setDateFilterType] = useState<'all' | 'single' | 'range'>('all');
    const [singleDate, setSingleDate] = useState(new Date().toISOString().split('T')[0]);
    const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

    useEffect(() => {
        loadSummary();
    }, [dateFilterType, singleDate, startDate, endDate]);

    const loadSummary = async () => {
        try {
            setLoading(true);
            let url = '/api/fuel-inventory/tank-inventory/summary';
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
            setSummary(res.data.summary);
        } catch (error) {
            console.error('Failed to load fuel tank inventory', error);
        } finally {
            setLoading(false);
        }
    };

    const handleFuelTypeClick = async (fuelType: '91_GASOLINE' | '95_GASOLINE' | 'DIESEL') => {
        try {
            setSelectedFuelType(fuelType);
            setLoadingDetails(true);

            let url = `/api/fuel-inventory/tank-inventory/${fuelType}/details`;
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
            setFuelTypeDetails(res.data);
        } catch (error) {
            console.error('Failed to load fuel type details', error);
        } finally {
            setLoadingDetails(false);
        }
    };

    const getFuelTypeLabel = (fuelType: string) => {
        switch (fuelType) {
            case '91_GASOLINE': return '91 Gasoline';
            case '95_GASOLINE': return '95 Gasoline';
            case 'DIESEL': return 'Diesel';
            default: return fuelType;
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center p-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Fuel Tank Inventory</h2>
                <p className="text-gray-600">Overview of fuel tank deliveries across all stations</p>
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

            {/* Fuel Type Summary Cards */}
            {summary && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* 91 Gasoline */}
                    <div
                        onClick={() => handleFuelTypeClick('91_GASOLINE')}
                        className="bg-white rounded-xl shadow-sm border-2 border-gray-200 hover:border-blue-500 transition-all cursor-pointer p-6"
                    >
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-gray-900">91 Gasoline</h3>
                            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                                </svg>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-600">Total Liters:</span>
                                <span className="text-2xl font-bold text-gray-900">{summary['91_GASOLINE'].totalLiters.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-600">Deliveries:</span>
                                <span className="text-lg font-semibold text-gray-700">{summary['91_GASOLINE'].deliveryCount}</span>
                            </div>
                        </div>
                        <div className="mt-4 pt-4 border-t border-gray-200">
                            <p className="text-xs text-blue-600 font-medium">Click to view details →</p>
                        </div>
                    </div>

                    {/* 95 Gasoline */}
                    <div
                        onClick={() => handleFuelTypeClick('95_GASOLINE')}
                        className="bg-white rounded-xl shadow-sm border-2 border-gray-200 hover:border-green-500 transition-all cursor-pointer p-6"
                    >
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-gray-900">95 Gasoline</h3>
                            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                                </svg>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-600">Total Liters:</span>
                                <span className="text-2xl font-bold text-gray-900">{summary['95_GASOLINE'].totalLiters.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-600">Deliveries:</span>
                                <span className="text-lg font-semibold text-gray-700">{summary['95_GASOLINE'].deliveryCount}</span>
                            </div>
                        </div>
                        <div className="mt-4 pt-4 border-t border-gray-200">
                            <p className="text-xs text-green-600 font-medium">Click to view details →</p>
                        </div>
                    </div>

                    {/* Diesel */}
                    <div
                        onClick={() => handleFuelTypeClick('DIESEL')}
                        className="bg-white rounded-xl shadow-sm border-2 border-gray-200 hover:border-yellow-500 transition-all cursor-pointer p-6"
                    >
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-gray-900">Diesel</h3>
                            <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                                <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                                </svg>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-600">Total Liters:</span>
                                <span className="text-2xl font-bold text-gray-900">{summary['DIESEL'].totalLiters.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-600">Deliveries:</span>
                                <span className="text-lg font-semibold text-gray-700">{summary['DIESEL'].deliveryCount}</span>
                            </div>
                        </div>
                        <div className="mt-4 pt-4 border-t border-gray-200">
                            <p className="text-xs text-yellow-600 font-medium">Click to view details →</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Details Modal */}
            {selectedFuelType && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl max-w-6xl w-full border border-gray-200 max-h-[90vh] overflow-y-auto">
                        <div className="p-6">
                            {/* Modal Header */}
                            <div className="flex items-center justify-between mb-6">
                                <div>
                                    <h3 className="text-2xl font-bold text-gray-900">{getFuelTypeLabel(selectedFuelType)} Deliveries</h3>
                                    {fuelTypeDetails && (
                                        <p className="text-gray-600 mt-1">
                                            Total: {fuelTypeDetails.totalLiters.toLocaleString()} liters • {fuelTypeDetails.deliveryCount} deliveries
                                        </p>
                                    )}
                                </div>
                                <button
                                    onClick={() => {
                                        setSelectedFuelType(null);
                                        setFuelTypeDetails(null);
                                    }}
                                    className="text-gray-400 hover:text-gray-600"
                                >
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>

                            {/* Loading State */}
                            {loadingDetails && (
                                <div className="flex justify-center items-center p-12">
                                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                                </div>
                            )}

                            {/* Stations List */}
                            {!loadingDetails && fuelTypeDetails && (
                                <div className="space-y-6">
                                    {fuelTypeDetails.stations.map((station: StationDelivery) => (
                                        <div key={station.stationId} className="border border-gray-200 rounded-lg p-6 bg-gray-50">
                                            {/* Station Header */}
                                            <div className="flex items-center justify-between mb-4">
                                                <div>
                                                    <h4 className="text-lg font-semibold text-gray-900">{station.stationName}</h4>
                                                    {station.stationAddress && (
                                                        <p className="text-sm text-gray-600">{station.stationAddress}</p>
                                                    )}
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-sm text-gray-600">Total Received</p>
                                                    <p className="text-xl font-bold text-gray-900">{station.totalLiters.toLocaleString()} L</p>
                                                </div>
                                            </div>

                                            {/* Deliveries Table */}
                                            <div className="overflow-x-auto">
                                                <table className="min-w-full divide-y divide-gray-200">
                                                    <thead className="bg-gray-100">
                                                        <tr>
                                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Liters</th>
                                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Aramco Ticket</th>
                                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Delivered By</th>
                                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Invoice</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="bg-white divide-y divide-gray-200">
                                                        {station.deliveries.map((delivery) => (
                                                            <tr key={delivery.id} className="hover:bg-gray-50">
                                                                <td className="px-4 py-3 text-sm text-gray-900">
                                                                    {new Date(delivery.deliveryDate).toLocaleDateString()}
                                                                </td>
                                                                <td className="px-4 py-3 text-sm font-semibold text-gray-900">
                                                                    {delivery.litersDelivered.toLocaleString()} L
                                                                </td>
                                                                <td className="px-4 py-3 text-sm text-gray-600">
                                                                    {delivery.aramcoTicket || '-'}
                                                                </td>
                                                                <td className="px-4 py-3 text-sm text-gray-600">
                                                                    {delivery.deliveredBy || '-'}
                                                                </td>
                                                                <td className="px-4 py-3 text-sm">
                                                                    {delivery.receiptUrl ? (
                                                                        <a
                                                                            href={delivery.receiptUrl}
                                                                            target="_blank"
                                                                            rel="noopener noreferrer"
                                                                            className="text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
                                                                        >
                                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                                            </svg>
                                                                            View
                                                                        </a>
                                                                    ) : (
                                                                        <span className="text-gray-400">No invoice</span>
                                                                    )}
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    ))}

                                    {fuelTypeDetails.stations.length === 0 && (
                                        <div className="text-center py-12 text-gray-500">
                                            No deliveries found for this fuel type in the selected date range.
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
