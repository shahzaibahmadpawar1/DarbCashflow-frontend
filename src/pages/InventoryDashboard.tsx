import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import api from '../services/api';
import { LoadingSpinner } from '../components/shared/LoadingSpinner';

interface Nozzle {
  id: string;
  name: string;
  tankId: string;
  fuelType: string;
  meterLimit: number;
  tank: {
    id: string;
    fuelType: string;
    currentLevel: number;
    capacity: number | null;
  };
}

interface Tank {
  id: string;
  fuelType: string;
  capacity: number | null;
  currentLevel: number;
}

interface NozzleReading {
  id: string;
  nozzleId: string;
  openingReading: number;
  closingReading: number | null;
  consumption: number | null;
  isRollover: boolean;
  pricePerLiter: number | null;
  nozzle: Nozzle;
}

interface Shift {
  id: string;
  shiftType: string;
  status: string;
  locked: boolean;
  nozzleReadings: NozzleReading[];
}

interface TankerDelivery {
  id: string;
  tankId: string;
  litersDelivered: number;
  deliveryDate: string;
  notes: string | null;
  deliveredBy: {
    name: string;
    employeeId: string;
  };
  tank: {
    fuelType: string;
  };
}

export const InventoryDashboard = () => {
  const { user, canManageStation } = useAuth();
  const [stationId, setStationId] = useState<string>('');
  const [nozzles, setNozzles] = useState<Nozzle[]>([]);
  const [tanks, setTanks] = useState<Tank[]>([]);
  const [currentShift, setCurrentShift] = useState<Shift | null>(null);
  const [closingReadings, setClosingReadings] = useState<Record<string, { value: number; isRollover: boolean }>>({});
  const [pricePerLiter, setPricePerLiter] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Tanker delivery state
  const [showDeliveryForm, setShowDeliveryForm] = useState(false);
  const [deliveryData, setDeliveryData] = useState({
    tankId: '',
    litersDelivered: '',
    deliveryDate: new Date().toISOString().slice(0, 16),
    notes: ''
  });
  const [deliveries, setDeliveries] = useState<TankerDelivery[]>([]);
  const [showDeliveries, setShowDeliveries] = useState(false);

  // Rollover confirmation
  const [rolloverConfirm, setRolloverConfirm] = useState<{ nozzleId: string; nozzleName: string } | null>(null);

  useEffect(() => {
    if (user?.stationId) {
      setStationId(user.stationId);
      loadData(user.stationId);
    } else {
      setLoading(false);
    }
  }, [user]);

  const loadData = async (sid: string) => {
    try {
      const [nozzlesRes, tanksRes, shiftRes] = await Promise.all([
        api.get(`/api/inventory/stations/${sid}/nozzles`),
        api.get(`/api/inventory/stations/${sid}/tanks`),
        api.get(`/api/inventory/shifts/stations/${sid}/current`),
      ]);

      setNozzles(nozzlesRes.data.nozzles);
      setTanks(tanksRes.data.tanks);
      setCurrentShift(shiftRes.data.shift);

      // Initialize closing readings from existing shift readings
      const readingsMap: Record<string, { value: number; isRollover: boolean }> = {};
      shiftRes.data.shift.nozzleReadings.forEach((sr: NozzleReading) => {
        if (sr.closingReading !== null) {
          readingsMap[sr.nozzleId] = {
            value: sr.closingReading,
            isRollover: sr.isRollover
          };
        }
        if (sr.pricePerLiter && !pricePerLiter) {
          setPricePerLiter(sr.pricePerLiter);
        }
      });
      setClosingReadings(readingsMap);
    } catch (error) {
      console.error('Failed to load data', error);
    } finally {
      setLoading(false);
    }
  };

  const loadDeliveries = async () => {
    try {
      const res = await api.get('/api/inventory/deliveries');
      setDeliveries(res.data.deliveries);
      setShowDeliveries(true);
    } catch (error) {
      console.error('Failed to load deliveries', error);
    }
  };

  const handleReadingChange = (nozzleId: string, value: string) => {
    const numValue = parseFloat(value) || 0;
    const reading = currentShift?.nozzleReadings.find(r => r.nozzleId === nozzleId);

    if (reading && numValue < reading.openingReading) {
      // Potential rollover - ask user
      setRolloverConfirm({ nozzleId, nozzleName: reading.nozzle.name });
    }

    setClosingReadings({
      ...closingReadings,
      [nozzleId]: {
        value: numValue,
        isRollover: closingReadings[nozzleId]?.isRollover || false
      }
    });
  };

  const handleRolloverConfirm = (confirmed: boolean) => {
    if (rolloverConfirm) {
      setClosingReadings({
        ...closingReadings,
        [rolloverConfirm.nozzleId]: {
          ...closingReadings[rolloverConfirm.nozzleId],
          isRollover: confirmed,
        }
      });
    }
    setRolloverConfirm(null);
  };

  const toggleRollover = (nozzleId: string) => {
    setClosingReadings({
      ...closingReadings,
      [nozzleId]: {
        ...closingReadings[nozzleId],
        isRollover: !closingReadings[nozzleId]?.isRollover,
      }
    });
  };

  const handleSubmitReadings = async () => {
    if (!pricePerLiter || pricePerLiter <= 0) {
      alert('Please enter a valid price per liter');
      return;
    }

    try {
      setSubmitting(true);
      const readingsArray = Object.entries(closingReadings).map(([nozzleId, data]) => ({
        nozzleId,
        closingReading: data.value,
        isRollover: data.isRollover,
      }));

      await api.post(`/api/inventory/shifts/${currentShift?.id}/readings`, {
        readings: readingsArray,
      });

      alert('Readings submitted successfully! Shift has been locked.');
      if (stationId) {
        loadData(stationId);
      }
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to submit readings');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeliverySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post(`/api/inventory/tanks/${deliveryData.tankId}/deliveries`, {
        litersDelivered: parseFloat(deliveryData.litersDelivered),
        deliveryDate: new Date(deliveryData.deliveryDate).toISOString(),
        notes: deliveryData.notes || undefined,
      });

      alert('Tanker delivery recorded successfully!');
      setShowDeliveryForm(false);
      setDeliveryData({ tankId: '', litersDelivered: '', deliveryDate: new Date().toISOString().slice(0, 16), notes: '' });
      if (stationId) {
        loadData(stationId);
      }
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to record delivery');
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

  const getTankColor = (fuelType: string) => {
    switch (fuelType) {
      case '91_GASOLINE': return 'bg-blue-500';
      case '95_GASOLINE': return 'bg-green-500';
      case 'DIESEL': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!stationId) {
    return (
      <div className="px-4 py-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-yellow-900 mb-2">No Station Assigned</h2>
          <p className="text-yellow-700">
            You need to be assigned to a station to access the inventory dashboard.
            Please contact your administrator.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-6 sm:px-0">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Inventory Dashboard</h1>
        <div className="flex gap-2">
          <button
            onClick={loadDeliveries}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
          >
            View Deliveries
          </button>
          {canManageStation && (
            <button
              onClick={() => setShowDeliveryForm(true)}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              + Record Tanker Delivery
            </button>
          )}
        </div>
      </div>

      {/* Tank Overview */}
      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Tank Levels</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {tanks.map((tank) => {
            const percentage = tank.capacity ? (tank.currentLevel / tank.capacity) * 100 : 0;
            return (
              <div key={tank.id} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold">{getFuelTypeLabel(tank.fuelType)}</h3>
                  <span className={`w-4 h-4 rounded-full ${getTankColor(tank.fuelType)}`}></span>
                </div>
                <div className="text-2xl font-bold text-gray-900 mb-1">
                  {tank.currentLevel.toFixed(2)} L
                </div>
                {tank.capacity && (
                  <>
                    <div className="text-sm text-gray-600 mb-2">
                      of {tank.capacity.toFixed(2)} L ({percentage.toFixed(1)}%)
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${getTankColor(tank.fuelType)}`}
                        style={{ width: `${Math.min(percentage, 100)}%` }}
                      ></div>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Shift Info */}
      {currentShift && (
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">
              Current Shift: {currentShift.shiftType}
            </h2>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${currentShift.locked
                ? 'bg-red-100 text-red-800'
                : 'bg-green-100 text-green-800'
              }`}>
              {currentShift.locked ? 'Locked' : 'Open'}
            </span>
          </div>

          {/* Price Per Liter Input */}
          {!currentShift.locked && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Price Per Liter (for this shift)
              </label>
              <input
                type="number"
                step="0.01"
                value={pricePerLiter}
                onChange={(e) => setPricePerLiter(parseFloat(e.target.value) || 0)}
                className="w-full md:w-64 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                placeholder="Enter price per liter"
              />
            </div>
          )}

          {/* Nozzle Readings Table */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nozzle</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fuel Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Opening</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Closing</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Consumption</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rollover</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {currentShift.nozzleReadings.map((reading) => {
                  const closingValue = closingReadings[reading.nozzleId]?.value || reading.closingReading || 0;
                  const isRollover = closingReadings[reading.nozzleId]?.isRollover || reading.isRollover;
                  const consumption = reading.consumption ||
                    (closingValue && closingValue >= reading.openingReading
                      ? closingValue - reading.openingReading
                      : 0);

                  return (
                    <tr key={reading.id}>
                      <td className="px-6 py-4 whitespace-nowrap font-medium">{reading.nozzle.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{getFuelTypeLabel(reading.nozzle.fuelType)}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{reading.openingReading.toFixed(2)}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {currentShift.locked ? (
                          reading.closingReading?.toFixed(2) || '-'
                        ) : (
                          <input
                            type="number"
                            step="0.01"
                            value={closingReadings[reading.nozzleId]?.value || ''}
                            onChange={(e) => handleReadingChange(reading.nozzleId, e.target.value)}
                            className="w-32 px-2 py-1 border border-gray-300 rounded"
                            placeholder="Enter reading"
                          />
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {consumption > 0 ? `${consumption.toFixed(2)} L` : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {currentShift.locked ? (
                          isRollover ? <span className="text-orange-600 font-medium">Yes</span> : 'No'
                        ) : (
                          <button
                            onClick={() => toggleRollover(reading.nozzleId)}
                            className={`px-3 py-1 rounded text-sm ${isRollover
                                ? 'bg-orange-100 text-orange-800'
                                : 'bg-gray-100 text-gray-600'
                              }`}
                          >
                            {isRollover ? 'Yes' : 'No'}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Submit Button */}
          {!currentShift.locked && canManageStation && (
            <div className="mt-6">
              <button
                onClick={handleSubmitReadings}
                disabled={submitting || Object.keys(closingReadings).length === 0}
                className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {submitting ? 'Submitting...' : 'Submit Closing Readings & Lock Shift'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Rollover Confirmation Modal */}
      {rolloverConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md">
            <h3 className="text-lg font-semibold mb-4">Meter Rollover Detected</h3>
            <p className="text-gray-700 mb-6">
              The closing reading for <strong>{rolloverConfirm.nozzleName}</strong> is less than the opening reading.
              Did the meter roll over?
            </p>
            <div className="flex gap-4">
              <button
                onClick={() => handleRolloverConfirm(true)}
                className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
              >
                Yes, Rollover
              </button>
              <button
                onClick={() => handleRolloverConfirm(false)}
                className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
              >
                No, I Made a Mistake
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tanker Delivery Form Modal */}
      {showDeliveryForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">Record Tanker Delivery</h3>
            <form onSubmit={handleDeliverySubmit}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Tank</label>
                <select
                  value={deliveryData.tankId}
                  onChange={(e) => setDeliveryData({ ...deliveryData, tankId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  required
                >
                  <option value="">Select Tank</option>
                  {tanks.map((tank) => (
                    <option key={tank.id} value={tank.id}>
                      {getFuelTypeLabel(tank.fuelType)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Liters Delivered</label>
                <input
                  type="number"
                  step="0.01"
                  value={deliveryData.litersDelivered}
                  onChange={(e) => setDeliveryData({ ...deliveryData, litersDelivered: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Delivery Date & Time</label>
                <input
                  type="datetime-local"
                  value={deliveryData.deliveryDate}
                  onChange={(e) => setDeliveryData({ ...deliveryData, deliveryDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Notes (Optional)</label>
                <textarea
                  value={deliveryData.notes}
                  onChange={(e) => setDeliveryData({ ...deliveryData, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  rows={3}
                />
              </div>
              <div className="flex gap-4">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  Record Delivery
                </button>
                <button
                  type="button"
                  onClick={() => setShowDeliveryForm(false)}
                  className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Deliveries List Modal */}
      {showDeliveries && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Tanker Delivery History</h3>
              <button
                onClick={() => setShowDeliveries(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tank</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Liters</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Delivered By</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Notes</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {deliveries.map((delivery) => (
                    <tr key={delivery.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {new Date(delivery.deliveryDate).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getFuelTypeLabel(delivery.tank.fuelType)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap font-medium">
                        {delivery.litersDelivered.toFixed(2)} L
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {delivery.deliveredBy.name} ({delivery.deliveredBy.employeeId})
                      </td>
                      <td className="px-6 py-4 text-sm">
                        {delivery.notes || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
