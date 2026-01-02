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

    // Store prices for all stations
    const [stationPrices, setStationPrices] = useState<Record<string, any[]>>({});

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
        // Reset prices
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
            // Submit each fuel price
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
        } catch (error: any) {
            alert(error.response?.data?.error || 'Failed to set prices');
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

    return (
        <div className="px-4 py-6 sm:px-0">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-foreground">Stations Management</h1>
                <button
                    onClick={() => setShowForm(!showForm)}
                    className="bg-primary text-primary-foreground px-4 py-2 rounded-md hover-elevate active-elevate-2 border border-primary-border"
                >
                    {showForm ? 'Cancel' : 'Add Station'}
                </button>
            </div>

            {showForm && (
                <div className="bg-card shadow rounded-lg p-6 mb-6 border border-card-border">
                    <h2 className="text-xl font-semibold mb-4 text-card-foreground">Create New Station</h2>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-foreground">Station Name</label>
                                <input
                                    type="text"
                                    required
                                    className="mt-1 block w-full rounded-md border border-input shadow-sm p-2 bg-background text-foreground"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-foreground">Location / Address</label>
                                <input
                                    type="text"
                                    className="mt-1 block w-full rounded-md border border-input shadow-sm p-2 bg-background text-foreground"
                                    value={formData.address}
                                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-foreground">Station Type</label>
                            <select
                                className="mt-1 block w-full rounded-md border border-input shadow-sm p-2 bg-background text-foreground"
                                value={formData.stationType}
                                onChange={(e) => setFormData({ ...formData, stationType: e.target.value })}
                            >
                                <option value="OPERATIONAL">Operational</option>
                                <option value="RENTAL">Rental</option>
                                <option value="FRANCHISE">Franchise</option>
                            </select>
                        </div>
                        <button
                            type="submit"
                            className="bg-primary text-primary-foreground px-4 py-2 rounded-md hover-elevate active-elevate-2 border border-primary-border"
                        >
                            Create Station
                        </button>
                    </form>
                </div>
            )}

            <div className="bg-card shadow rounded-lg overflow-hidden border border-card-border">
                <table className="min-w-full divide-y divide-border">
                    <thead className="bg-muted">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Station Name</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Location</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Station Type</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Current Rates (SAR/L)</th>
                            {isAdmin && (
                                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Actions</th>
                            )}
                        </tr>
                    </thead>
                    <tbody className="bg-card divide-y divide-border">
                        {stations.map((s) => {
                            const prices = stationPrices[s.id] || [];

                            return (
                                <tr key={s.id}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">{s.name}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">{s.address || '-'}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                                        {s.stationType === 'OPERATIONAL' ? 'Operational' : 
                                         s.stationType === 'RENTAL' ? 'Rental' : 
                                         s.stationType === 'FRANCHISE' ? 'Franchise' : 'Operational'}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-foreground">
                                        {prices.length > 0 ? (
                                            <div className="space-y-1">
                                                {prices.map(p => (
                                                    <div key={p.fuelType} className="text-xs">
                                                        <span className="font-medium">{getFuelTypeLabel(p.fuelType)}:</span> {p.pricePerLiter.toFixed(2)}
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <span className="text-muted-foreground italic">Not set</span>
                                        )}
                                    </td>
                                    {isAdmin && (
                                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                                            <button
                                                onClick={() => handleSetRates(s)}
                                                className="bg-primary text-primary-foreground px-3 py-1 rounded hover-elevate active-elevate-2 border border-primary-border"
                                            >
                                                Set Rates
                                            </button>
                                        </td>
                                    )}
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Set Rates Modal */}
            {showPriceModal && selectedStation && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-card/80 backdrop-blur-sm rounded-lg p-6 max-w-md w-full border border-card-border">
                        <h3 className="text-lg font-semibold mb-4 text-card-foreground">
                            Set Fuel Rates for {selectedStation.name}
                        </h3>
                        <form onSubmit={handleSubmitPrices}>
                            <div className="space-y-4 mb-6">
                                {fuelPrices.map((price, index) => (
                                    <div key={price.fuelType}>
                                        <label className="block text-sm font-medium text-foreground mb-2">
                                            {getFuelTypeLabel(price.fuelType)} (SAR/Liter)
                                        </label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={price.pricePerLiter}
                                            onChange={(e) => handlePriceChange(index, e.target.value)}
                                            className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground"
                                            placeholder="Enter price"
                                        />
                                    </div>
                                ))}
                            </div>
                            <div className="flex gap-4">
                                <button
                                    type="submit"
                                    className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover-elevate active-elevate-2 border border-primary-border"
                                >
                                    Set Rates
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowPriceModal(false);
                                        setSelectedStation(null);
                                    }}
                                    className="flex-1 px-4 py-2 bg-muted text-muted-foreground rounded-lg hover-elevate active-elevate-2 border border-muted-border"
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
