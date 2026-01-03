import { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../hooks/useAuth';

interface Station {
    id: string;
    name: string;
    address: string;
    stationType?: string;
}

interface FuelPrice {
    fuelType: string;
    pricePerLiter: string;
}

export const Stations = () => {
    const { isAdmin } = useAuth();
    const [stations, setStations] = useState<Station[]>([]);
    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        address: '',
        stationType: 'OPERATIONAL',
    });

    // Fuel pricing state
    const [showPriceModal, setShowPriceModal] = useState(false);
    const [selectedStation, setSelectedStation] = useState<Station | null>(null);
    const [fuelPrices, setFuelPrices] = useState<FuelPrice[]>([
        { fuelType: '91_GASOLINE', pricePerLiter: '' },
        { fuelType: '95_GASOLINE', pricePerLiter: '' },
        { fuelType: 'DIESEL', pricePerLiter: '' },
    ]);

    // Station type edit state
    const [editingStationType, setEditingStationType] = useState<string | null>(null);
    const [newStationType, setNewStationType] = useState<string>('');

    // Store prices for all stations
    const [stationPrices, setStationPrices] = useState<Record<string, any[]>>({});
    const [selectedStationCard, setSelectedStationCard] = useState<string | null>(null);

    useEffect(() => {
        loadStations();
    }, []);

    const loadStations = async () => {
        try {
            const res = await api.get('/api/stations');
            setStations(res.data.stations);

            // Load prices for each station
            const pricesMap: Record<string, any[]> = {};
            for (const station of res.data.stations) {
                try {
                    const pricesRes = await api.get(`/api/fuel/prices/station/${station.id}`);
                    pricesMap[station.id] = pricesRes.data.prices || [];
                } catch (error) {
                    pricesMap[station.id] = [];
                }
            }
            setStationPrices(pricesMap);
        } catch (error) {
            console.error('Failed to load stations', error);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.post('/api/stations', formData);
            setShowForm(false);
            setFormData({ name: '', address: '', stationType: 'OPERATIONAL' });
            loadStations();
            alert('Station created successfully');
        } catch (error: any) {
            alert(error.response?.data?.error || 'Failed to create station');
        }
    };

    const handleSetRates = (station: Station) => {
        setSelectedStation(station);
        setShowPriceModal(true);
        setFuelPrices([
            { fuelType: '91_GASOLINE', pricePerLiter: '' },
            { fuelType: '95_GASOLINE', pricePerLiter: '' },
            { fuelType: 'DIESEL', pricePerLiter: '' },
        ]);
    };

    const handlePriceChange = (index: number, value: string) => {
        const updated = [...fuelPrices];
        updated[index].pricePerLiter = value;
        setFuelPrices(updated);
    };

    const handleSubmitPrices = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedStation) return;

        try {
            for (const price of fuelPrices) {
                if (price.pricePerLiter) {
                    await api.post('/api/fuel/prices', {
                        stationId: selectedStation.id,
                        fuelType: price.fuelType,
                        pricePerLiter: parseFloat(price.pricePerLiter),
                    });
                }
            }
            alert('Fuel prices set successfully!');
            setShowPriceModal(false);
            setSelectedStation(null);
            loadStations();
        } catch (error: any) {
            alert(error.response?.data?.error || 'Failed to set prices');
        }
    };

    const handleEditStationType = (station: Station) => {
        setEditingStationType(station.id);
        setNewStationType(station.stationType || 'OPERATIONAL');
    };

    const handleCancelEditStationType = () => {
        setEditingStationType(null);
        setNewStationType('');
    };

    const handleSaveStationType = async (stationId: string) => {
        try {
            await api.patch(`/api/stations/${stationId}`, {
                stationType: newStationType,
            });
            alert('Station type updated successfully');
            setEditingStationType(null);
            setNewStationType('');
            loadStations();
        } catch (error: any) {
            alert(error.response?.data?.error || 'Failed to update station type');
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

    const getStationTypeLabel = (type?: string) => {
        switch (type) {
            case 'OPERATIONAL': return 'Operational';
            case 'RENTAL': return 'Rental';
            case 'FRANCHISE': return 'Franchise';
            default: return 'Operational';
        }
    };

    const getStationTypeColor = (type?: string) => {
        switch (type) {
            case 'OPERATIONAL': return 'bg-green-100 text-green-800 border-green-200';
            case 'RENTAL': return 'bg-blue-100 text-blue-800 border-blue-200';
            case 'FRANCHISE': return 'bg-purple-100 text-purple-800 border-purple-200';
            default: return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 mb-2">All Stations</h1>
                        <p className="text-gray-600">Manage stations and their configurations</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => window.print()}
                            className="flex items-center gap-2 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                            </svg>
                            <span className="font-medium">Print</span>
                        </button>
                        {isAdmin && (
                            <button
                                onClick={() => setShowForm(!showForm)}
                                className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-medium"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                                <span>Add Station</span>
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Add Station Form */}
            {showForm && isAdmin && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">Create New Station</h2>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Station Name</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Location / Address</label>
                                <input
                                    type="text"
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                                    value={formData.address}
                                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Station Type</label>
                                <select
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                                    value={formData.stationType}
                                    onChange={(e) => setFormData({ ...formData, stationType: e.target.value })}
                                >
                                    <option value="OPERATIONAL">Operational</option>
                                    <option value="RENTAL">Rental</option>
                                    <option value="FRANCHISE">Franchise</option>
                                </select>
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <button
                                type="submit"
                                className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-medium"
                            >
                                Create Station
                            </button>
                            <button
                                type="button"
                                onClick={() => setShowForm(false)}
                                className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                            >
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Stations Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {stations.map((station) => {
                    const prices = stationPrices[station.id] || [];
                    const isSelected = selectedStationCard === station.id;

                    return (
                        <div
                            key={station.id}
                            className={`bg-white rounded-xl shadow-sm border-2 transition-all duration-200 card-hover ${
                                isSelected ? 'border-primary' : 'border-gray-200'
                            }`}
                            onClick={() => setSelectedStationCard(station.id)}
                        >
                            <div className="p-6">
                                {/* Station Header */}
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex-1">
                                        <h3 className="text-lg font-bold text-gray-900 mb-1">{station.name}</h3>
                                        <p className="text-sm text-gray-600 flex items-center gap-1">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                            </svg>
                                            {station.address || 'No address'}
                                        </p>
                                    </div>
                                </div>

                                {/* Station Type */}
                                <div className="mb-4">
                                    {editingStationType === station.id && isAdmin ? (
                                        <div className="flex items-center gap-2">
                                            <select
                                                value={newStationType}
                                                onChange={(e) => setNewStationType(e.target.value)}
                                                className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                <option value="OPERATIONAL">Operational</option>
                                                <option value="RENTAL">Rental</option>
                                                <option value="FRANCHISE">Franchise</option>
                                            </select>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleSaveStationType(station.id);
                                                }}
                                                className="px-3 py-1.5 bg-primary text-white text-sm rounded-lg hover:bg-primary/90"
                                            >
                                                Save
                                            </button>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleCancelEditStationType();
                                                }}
                                                className="px-3 py-1.5 bg-gray-100 text-gray-700 text-sm rounded-lg hover:bg-gray-200"
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-2">
                                            <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStationTypeColor(station.stationType)}`}>
                                                {getStationTypeLabel(station.stationType)}
                                            </span>
                                            {isAdmin && (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleEditStationType(station);
                                                    }}
                                                    className="text-xs text-primary hover:underline"
                                                >
                                                    Edit
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Fuel Prices */}
                                <div className="mb-4">
                                    <p className="text-xs font-medium text-gray-500 mb-2">Current Rates (SAR/L)</p>
                                    {prices.length > 0 ? (
                                        <div className="space-y-1">
                                            {prices.map((price) => (
                                                <div key={price.fuelType} className="flex justify-between text-sm">
                                                    <span className="text-gray-600">{getFuelTypeLabel(price.fuelType)}:</span>
                                                    <span className="font-semibold text-gray-900">{price.pricePerLiter.toFixed(2)}</span>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-sm text-gray-400 italic">Not set</p>
                                    )}
                                </div>

                                {/* Actions */}
                                {isAdmin && (
                                    <div className="pt-4 border-t border-gray-200">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleSetRates(station);
                                            }}
                                            className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium text-sm"
                                        >
                                            Set Rates
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {stations.length === 0 && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
                    <p className="text-gray-500 text-lg">No stations found. Create your first station above.</p>
                </div>
            )}

            {/* Set Rates Modal */}
            {showPriceModal && selectedStation && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl max-w-md w-full border border-gray-200">
                        <div className="p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-xl font-semibold text-gray-900">
                                    Set Fuel Rates for {selectedStation.name}
                                </h3>
                                <button
                                    onClick={() => {
                                        setShowPriceModal(false);
                                        setSelectedStation(null);
                                    }}
                                    className="text-gray-400 hover:text-gray-600"
                                >
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                            <form onSubmit={handleSubmitPrices} className="space-y-4">
                                {fuelPrices.map((price, index) => (
                                    <div key={price.fuelType}>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            {getFuelTypeLabel(price.fuelType)} (SAR/Liter)
                                        </label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={price.pricePerLiter}
                                            onChange={(e) => handlePriceChange(index, e.target.value)}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                                            placeholder="Enter price"
                                        />
                                    </div>
                                ))}
                                <div className="flex gap-3 pt-4">
                                    <button
                                        type="submit"
                                        className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-medium"
                                    >
                                        Set Rates
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowPriceModal(false);
                                            setSelectedStation(null);
                                        }}
                                        className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
