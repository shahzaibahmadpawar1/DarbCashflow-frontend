import { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../hooks/useAuth';

interface Station {
    id: string;
    name: string;
    address: string;
    stationType?: string;
}

interface Nozzle {
    id: string;
    name: string;
    fuelType: string;
    openingReading: number;
}

interface NozzleConfig {
    name: string;
    fuelType: string;
    openingReading: number;
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
        stationManagerId: '',
    });

    // Station managers for assignment
    const [stationManagers, setStationManagers] = useState<any[]>([]);

    // Nozzle configuration for new station
    const [nozzleConfigs, setNozzleConfigs] = useState<NozzleConfig[]>([
        { name: '91-1', fuelType: '91_GASOLINE', openingReading: 0 },
        { name: '91-2', fuelType: '91_GASOLINE', openingReading: 0 },
        { name: '95-1', fuelType: '95_GASOLINE', openingReading: 0 },
        { name: '95-2', fuelType: '95_GASOLINE', openingReading: 0 },
        { name: 'D-1', fuelType: 'DIESEL', openingReading: 0 },
        { name: 'D-2', fuelType: 'DIESEL', openingReading: 0 },
    ]);

    const [fuelPrices, setFuelPrices] = useState<FuelPrice[]>([
        { fuelType: '91_GASOLINE', pricePerLiter: '' },
        { fuelType: '95_GASOLINE', pricePerLiter: '' },
        { fuelType: 'DIESEL', pricePerLiter: '' },
    ]);

    // Station nozzles viewing/editing
    const [selectedStation, setSelectedStation] = useState<Station | null>(null);
    const [stationNozzles, setStationNozzles] = useState<Nozzle[]>([]);
    const [showNozzlesModal, setShowNozzlesModal] = useState(false);
    const [editingNozzle, setEditingNozzle] = useState<string | null>(null);
    const [newOpeningReading, setNewOpeningReading] = useState<number>(0);

    // Store prices for all stations
    const [stationPrices, setStationPrices] = useState<Record<string, any[]>>({});

    useEffect(() => {
        loadStations();
        loadStationManagers();
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

    const loadStationManagers = async () => {
        try {
            const res = await api.get('/api/users?role=SM');
            setStationManagers(res.data.users || []);
        } catch (error) {
            console.error('Failed to load station managers', error);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            // Prepare nozzle configuration
            const nozzles = nozzleConfigs.filter(n => n.name.trim() !== '');

            // Prepare fuel prices
            const prices = fuelPrices.filter(p => p.pricePerLiter && parseFloat(p.pricePerLiter) > 0);

            // Create station with nozzle configuration and station manager assignment
            await api.post('/api/stations', {
                ...formData,
                nozzles,
                fuelPrices: prices.map(p => ({
                    fuelType: p.fuelType,
                    pricePerLiter: parseFloat(p.pricePerLiter),
                })),
            });

            setShowForm(false);
            resetForm();
            loadStations();
            alert('Station created successfully with nozzle configuration!');
        } catch (error: any) {
            alert(error.response?.data?.error || 'Failed to create station');
        }
    };

    const resetForm = () => {
        setFormData({ name: '', address: '', stationType: 'OPERATIONAL', stationManagerId: '' });
        setNozzleConfigs([
            { name: '91-1', fuelType: '91_GASOLINE', openingReading: 0 },
            { name: '91-2', fuelType: '91_GASOLINE', openingReading: 0 },
            { name: '95-1', fuelType: '95_GASOLINE', openingReading: 0 },
            { name: '95-2', fuelType: '95_GASOLINE', openingReading: 0 },
            { name: 'D-1', fuelType: 'DIESEL', openingReading: 0 },
            { name: 'D-2', fuelType: 'DIESEL', openingReading: 0 },
        ]);
        setFuelPrices([
            { fuelType: '91_GASOLINE', pricePerLiter: '' },
            { fuelType: '95_GASOLINE', pricePerLiter: '' },
            { fuelType: 'DIESEL', pricePerLiter: '' },
        ]);
    };

    const handleViewNozzles = async (station: Station) => {
        try {
            const res = await api.get(`/api/inventory/stations/${station.id}/nozzles`);
            setStationNozzles(res.data.nozzles || []);
            setSelectedStation(station);
            setShowNozzlesModal(true);
        } catch (error: any) {
            alert(error.response?.data?.error || 'Failed to load nozzles');
        }
    };

    const handleEditOpeningReading = (nozzle: Nozzle) => {
        setEditingNozzle(nozzle.id);
        setNewOpeningReading(nozzle.openingReading);
    };

    const handleSaveOpeningReading = async (nozzleId: string) => {
        try {
            await api.patch(`/api/inventory/nozzles/${nozzleId}/opening-reading`, {
                openingReading: newOpeningReading,
            });
            alert('Opening reading updated successfully!');
            setEditingNozzle(null);

            // Reload nozzles
            if (selectedStation) {
                const res = await api.get(`/api/inventory/stations/${selectedStation.id}/nozzles`);
                setStationNozzles(res.data.nozzles || []);
            }
        } catch (error: any) {
            alert(error.response?.data?.error || 'Failed to update opening reading');
        }
    };

    const handleNozzleConfigChange = (index: number, field: keyof NozzleConfig, value: string | number) => {
        const updated = [...nozzleConfigs];
        updated[index] = { ...updated[index], [field]: value };
        setNozzleConfigs(updated);
    };

    const handlePriceChange = (index: number, value: string) => {
        const updated = [...fuelPrices];
        updated[index].pricePerLiter = value;
        setFuelPrices(updated);
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

    return (
        <div className="space-y-6 p-6">
            {/* Header */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 mb-2">All Stations</h1>
                        <p className="text-gray-600">Manage stations and their nozzle configurations</p>
                    </div>
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

            {/* Add Station Form */}
            {showForm && isAdmin && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">Create New Station</h2>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Basic Info */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Station Name *</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
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
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Assign Station Manager</label>
                                <select
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                                    value={formData.stationManagerId}
                                    onChange={(e) => setFormData({ ...formData, stationManagerId: e.target.value })}
                                >
                                    <option value="">None (Assign Later)</option>
                                    {stationManagers.map((manager) => (
                                        <option key={manager.id} value={manager.id}>
                                            {manager.name} ({manager.email})
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Nozzle Configuration */}
                        <div className="border-t border-gray-200 pt-4">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">Nozzle Configuration (6 Nozzles)</h3>
                            <div className="space-y-3">
                                {nozzleConfigs.map((nozzle, index) => (
                                    <div key={index} className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Nozzle Name</label>
                                            <input
                                                type="text"
                                                value={nozzle.name}
                                                onChange={(e) => handleNozzleConfigChange(index, 'name', e.target.value)}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                                placeholder="e.g., 91-1"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Fuel Type</label>
                                            <select
                                                value={nozzle.fuelType}
                                                onChange={(e) => handleNozzleConfigChange(index, 'fuelType', e.target.value)}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                            >
                                                <option value="91_GASOLINE">91 Gasoline</option>
                                                <option value="95_GASOLINE">95 Gasoline</option>
                                                <option value="DIESEL">Diesel</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Opening Reading</label>
                                            <input
                                                type="number"
                                                value={nozzle.openingReading}
                                                onChange={(e) => handleNozzleConfigChange(index, 'openingReading', parseFloat(e.target.value) || 0)}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                                step="0.01"
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Fuel Prices */}
                        <div className="border-t border-gray-200 pt-4">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">Fuel Prices</h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {fuelPrices.map((price, index) => (
                                    <div key={price.fuelType}>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            {getFuelTypeLabel(price.fuelType)} (SAR/Liter)
                                        </label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                                            placeholder="0.00"
                                            value={price.pricePerLiter}
                                            onChange={(e) => handlePriceChange(index, e.target.value)}
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="flex gap-3 pt-4">
                            <button
                                type="submit"
                                className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-medium"
                            >
                                Create Station
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setShowForm(false);
                                    resetForm();
                                }}
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

                    return (
                        <div
                            key={station.id}
                            className="bg-white rounded-xl shadow-sm border-2 border-gray-200 transition-all duration-200 hover:shadow-md"
                        >
                            <div className="p-6">
                                <h3 className="text-lg font-bold text-gray-900 mb-1">{station.name}</h3>
                                <p className="text-sm text-gray-600 mb-3">{station.address || 'No address'}</p>

                                <span className="inline-block px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 mb-4">
                                    {getStationTypeLabel(station.stationType)}
                                </span>

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
                                    <div className="pt-4 border-t border-gray-200 space-y-2">
                                        <button
                                            onClick={() => handleViewNozzles(station)}
                                            className="w-full px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-medium text-sm"
                                        >
                                            View/Edit Nozzles
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Nozzles Modal */}
            {showNozzlesModal && selectedStation && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full border border-gray-200 max-h-[90vh] overflow-y-auto">
                        <div className="p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-xl font-semibold text-gray-900">
                                    Nozzles - {selectedStation.name}
                                </h3>
                                <button
                                    onClick={() => {
                                        setShowNozzlesModal(false);
                                        setSelectedStation(null);
                                        setEditingNozzle(null);
                                    }}
                                    className="text-gray-400 hover:text-gray-600"
                                >
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="bg-gray-50 border-b border-gray-200">
                                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Nozzle</th>
                                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Fuel Type</th>
                                            <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Opening Reading</th>
                                            <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {stationNozzles.map((nozzle) => (
                                            <tr key={nozzle.id} className="border-b border-gray-100">
                                                <td className="px-4 py-3 text-sm font-medium text-gray-900">{nozzle.name}</td>
                                                <td className="px-4 py-3 text-sm text-gray-600">{getFuelTypeLabel(nozzle.fuelType)}</td>
                                                <td className="px-4 py-3 text-sm text-right">
                                                    {editingNozzle === nozzle.id ? (
                                                        <input
                                                            type="number"
                                                            value={newOpeningReading}
                                                            onChange={(e) => setNewOpeningReading(parseFloat(e.target.value) || 0)}
                                                            className="w-32 px-2 py-1 border border-gray-300 rounded text-right"
                                                            step="0.01"
                                                        />
                                                    ) : (
                                                        <span className="font-semibold text-gray-900">{nozzle.openingReading.toFixed(2)}</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    {editingNozzle === nozzle.id ? (
                                                        <div className="flex items-center justify-center gap-2">
                                                            <button
                                                                onClick={() => handleSaveOpeningReading(nozzle.id)}
                                                                className="px-3 py-1 bg-primary text-white rounded text-sm hover:bg-primary/90"
                                                            >
                                                                Save
                                                            </button>
                                                            <button
                                                                onClick={() => setEditingNozzle(null)}
                                                                className="px-3 py-1 bg-gray-100 text-gray-700 rounded text-sm hover:bg-gray-200"
                                                            >
                                                                Cancel
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <button
                                                            onClick={() => handleEditOpeningReading(nozzle)}
                                                            className="px-3 py-1 bg-blue-100 text-blue-700 rounded text-sm hover:bg-blue-200"
                                                        >
                                                            Edit
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
