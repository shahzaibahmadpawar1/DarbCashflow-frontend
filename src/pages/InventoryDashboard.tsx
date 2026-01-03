import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import api from '../services/api';
import { LoadingSpinner } from '../components/shared/LoadingSpinner';

interface Nozzle {
  id: string;
  name: string;
  fuelType: string;
  tank: {
    id: string;
    fuelType: string;
    currentLevel: number;
  };
}

interface NozzleSale {
  id: string;
  nozzleId: string;
  quantityLiters: number;
  pricePerLiter: number;
  cardAmount: number;
  cashAmount: number;
  nozzle: Nozzle;
}

interface Shift {
  id: string;
  shiftType: string;
  status: string;
  locked: boolean;
  startTime?: string;
}

interface FuelPrice {
  id: string;
  fuelType: string;
  pricePerLiter: number;
}

export const InventoryDashboard = () => {
  const { user, canManageStation, isAdmin } = useAuth();
  const [stationId, setStationId] = useState<string>('');
  const [currentShift, setCurrentShift] = useState<Shift | null>(null);
  const [nozzleSales, setNozzleSales] = useState<NozzleSale[]>([]);
  const [fuelPrices, setFuelPrices] = useState<FuelPrice[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Admin price management
  const [showPriceForm, setShowPriceForm] = useState(false);
  const [priceFormData, setPriceFormData] = useState({
    fuelType: '91_GASOLINE',
    pricePerLiter: '',
  });

  // Shift creation
  const [showCreateShiftModal, setShowCreateShiftModal] = useState(false);
  const [shiftType, setShiftType] = useState<'DAY' | 'NIGHT'>('DAY');
  const [creatingShift, setCreatingShift] = useState(false);
  const [paymentValidationError, setPaymentValidationError] = useState<string>('');

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
      const [shiftRes, pricesRes] = await Promise.all([
        api.get(`/api/inventory/shifts/stations/${sid}/current`),
        api.get(`/api/fuel/prices/station/${sid}`),
      ]);

      console.log('Shift data:', shiftRes.data);
      console.log('Prices data:', pricesRes.data);

      setCurrentShift(shiftRes.data.shift);
      setFuelPrices(pricesRes.data.prices || []);

      // Load nozzle sales if shift exists
      if (shiftRes.data.shift) {
        try {
          const salesRes = await api.get(`/api/fuel/sales/shift/${shiftRes.data.shift.id}`);
          console.log('Sales data:', salesRes.data);
          setNozzleSales(salesRes.data.sales || []);
        } catch (salesError) {
          console.error('Failed to load sales:', salesError);
          setNozzleSales([]);
        }
      }
    } catch (error: any) {
      console.error('Failed to load data:', error);
      alert('Failed to load inventory data. Please check console for details.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuantityChange = (saleId: string, quantity: string) => {
    // Clear validation error when quantity changes
    setPaymentValidationError('');

    // Update local state immediately for responsive input
    setNozzleSales(prev => prev.map(sale =>
      sale.id === saleId
        ? { ...sale, quantityLiters: parseFloat(quantity) || 0 }
        : sale
    ));

    // Debounce API call
    const timeoutId = setTimeout(async () => {
      try {
        await api.put(`/api/fuel/sales/${saleId}`, {
          quantityLiters: parseFloat(quantity) || 0,
        });
      } catch (error: any) {
        console.error('Failed to update quantity:', error);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  };

  const handlePaymentChange = async (field: 'cardAmount' | 'cashAmount', value: string) => {
    if (!currentShift) return;

    const numValue = parseFloat(value) || 0;
    
    // Calculate total amount from all nozzles
    const totalAmount = nozzleSales.reduce((sum, sale) => 
      sum + (sale.quantityLiters * sale.pricePerLiter), 0
    );

    // Get current card and cash amounts (from first sale, as they should be the same for all)
    const currentCardAmount = field === 'cardAmount' ? numValue : (nozzleSales[0]?.cardAmount || 0);
    const currentCashAmount = field === 'cashAmount' ? numValue : (nozzleSales[0]?.cashAmount || 0);
    const sum = currentCardAmount + currentCashAmount;

    // Validate that card + cash doesn't exceed total
    if (sum > totalAmount && totalAmount > 0) {
      setPaymentValidationError(
        `Card + Cash amount (${sum.toFixed(2)} SAR) exceeds Total Amount (${totalAmount.toFixed(2)} SAR) by ${(sum - totalAmount).toFixed(2)} SAR`
      );
      return;
    } else {
      setPaymentValidationError('');
    }

    // Update local state immediately (update all sales with same value)
    setNozzleSales(prev => prev.map(sale => ({
      ...sale,
      [field]: numValue
    })));

    // Update all nozzle sales with the same card/cash amount
    try {
      await api.put(`/api/fuel/sales/shift/${currentShift.id}/payments`, {
        [field]: numValue,
      });
    } catch (error: any) {
      console.error('Failed to update payment:', error);
      alert(error.response?.data?.error || 'Failed to update payment');
      // Reload data on error
      if (stationId) {
        loadData(stationId);
      }
    }
  };

  const handleCreateShift = async () => {
    if (!stationId) return;

    try {
      setCreatingShift(true);
      await api.post(`/api/inventory/shifts/stations/${stationId}/create`, {
        shiftType,
      });
      alert('Shift created successfully!');
      setShowCreateShiftModal(false);
      setShiftType('DAY');
      loadData(stationId);
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to create shift');
    } finally {
      setCreatingShift(false);
    }
  };

  const handleSubmitSales = async () => {
    if (!currentShift) return;

    const confirmed = window.confirm(
      'Are you sure you want to submit sales and lock this shift? This action cannot be undone.'
    );

    if (!confirmed) return;

    try {
      setSubmitting(true);
      await api.post(`/api/fuel/sales/shift/${currentShift.id}/submit`);
      alert('Sales submitted successfully! Shift has been locked.');
      if (stationId) {
        loadData(stationId);
      }
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to submit sales');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSetPrice = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/api/fuel/prices', {
        stationId,
        fuelType: priceFormData.fuelType,
        pricePerLiter: parseFloat(priceFormData.pricePerLiter),
      });

      alert('Fuel price set successfully!');
      setShowPriceForm(false);
      setPriceFormData({ fuelType: '91_GASOLINE', pricePerLiter: '' });
      if (stationId) {
        loadData(stationId);
      }
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to set price');
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

  const calculateTotal = (quantity: number, price: number) => {
    return (quantity * price).toFixed(2);
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!stationId) {
    return (
      <div className="px-4 py-6">
        <div className="bg-accent/50 border border-border rounded-lg p-6">
          <h2 className="text-xl font-semibold text-foreground mb-2">No Station Assigned</h2>
          <p className="text-muted-foreground">
            You need to be assigned to a station to access the inventory dashboard.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Fuel Sales Dashboard</h1>
            <p className="text-gray-600">Track fuel levels in tanks and nozzle meter readings</p>
          </div>
          {isAdmin && (
            <button
              onClick={() => setShowPriceForm(true)}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-medium"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Set Fuel Prices
            </button>
          )}
        </div>
      </div>

      {/* Current Prices */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold mb-4 text-gray-900">Current Fuel Prices</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {fuelPrices.map((price) => (
            <div key={price.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50 card-hover">
              <h3 className="font-semibold text-gray-700 mb-2">{getFuelTypeLabel(price.fuelType)}</h3>
              <p className="text-2xl font-bold text-primary">{price.pricePerLiter.toFixed(2)} SAR/L</p>
            </div>
          ))}
        </div>
      </div>

      {/* Create Shift Button (when no shift exists) */}
      {!currentShift && canManageStation && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="text-center py-8">
            <div className="mb-4">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Active Shift</h3>
            <p className="text-gray-600 mb-6">Create a new shift to start recording fuel sales</p>
            <button
              onClick={() => setShowCreateShiftModal(true)}
              className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-medium"
            >
              Create Shift
            </button>
          </div>
        </div>
      )}

      {/* Shift Info */}
      {currentShift && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Current Shift: {currentShift.shiftType}
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Started: {new Date(currentShift.startTime || new Date()).toLocaleString()}
              </p>
            </div>
            <span className={`px-3 py-1 rounded-full text-sm font-medium border ${
              currentShift.locked
                ? 'bg-red-50 text-red-700 border-red-200'
                : 'bg-green-50 text-green-700 border-green-200'
            }`}>
              {currentShift.locked ? 'Locked' : 'Open'}
            </span>
          </div>

          {/* Nozzle Sales Table */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nozzle</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fuel Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price/L</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity (L)</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Amount</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {nozzleSales.map((sale) => {
                  const totalAmount = parseFloat(calculateTotal(sale.quantityLiters, sale.pricePerLiter));
                  
                  return (
                    <tr key={sale.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{sale.nozzle.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-700">{getFuelTypeLabel(sale.nozzle.fuelType)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-700">{sale.pricePerLiter.toFixed(2)}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {currentShift.locked ? (
                          <span className="text-gray-900">{sale.quantityLiters.toFixed(2)}</span>
                        ) : (
                          <input
                            type="text"
                            value={sale.quantityLiters === 0 ? '' : String(sale.quantityLiters)}
                            onChange={(e) => {
                              const value = e.target.value;
                              if (value === '' || /^\d*\.?\d*$/.test(value)) {
                                handleQuantityChange(sale.id, value || '0');
                              }
                            }}
                            className="w-32 px-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-white text-gray-900"
                            placeholder="0.00"
                          />
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap font-bold text-primary">
                        {totalAmount.toFixed(2)} SAR
                      </td>
                    </tr>
                  );
                })}
                {nozzleSales.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                      No nozzle sales data. Please run the setup SQL scripts and refresh the page.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Summary Section - Total with Card/Cash Split */}
          {nozzleSales.length > 0 && (
            <div className="mt-6 bg-gray-50 rounded-lg p-6 border border-gray-200">
              <h3 className="text-lg font-semibold mb-4 text-gray-900">Payment Summary</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Total Amount */}
                <div className="bg-white rounded-lg p-4 border-2 border-primary">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Total Amount (All Nozzles)</label>
                  <div className="text-3xl font-bold text-primary">
                    {nozzleSales.reduce((sum, sale) => sum + (sale.quantityLiters * sale.pricePerLiter), 0).toFixed(2)} SAR
                  </div>
                </div>

                {/* Card Amount */}
                <div className="bg-white rounded-lg p-4 border border-gray-200">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Card Amount (SAR)</label>
                  {currentShift.locked ? (
                    <div className="text-2xl font-semibold text-gray-900">
                      {(nozzleSales[0]?.cardAmount || 0).toFixed(2)}
                    </div>
                  ) : (
                    <input
                      type="text"
                      value={(nozzleSales[0]?.cardAmount || 0) === 0 ? '' : String(nozzleSales[0]?.cardAmount || 0)}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value === '' || /^\d*\.?\d*$/.test(value)) {
                          handlePaymentChange('cardAmount', value || '0');
                        }
                      }}
                      className={`w-full px-4 py-3 text-xl border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-white text-gray-900 ${
                        paymentValidationError ? 'border-red-300 bg-red-50' : 'border-gray-300'
                      }`}
                      placeholder="0.00"
                    />
                  )}
                </div>

                {/* Cash Amount */}
                <div className="bg-white rounded-lg p-4 border border-gray-200">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Cash Amount (SAR)</label>
                  {currentShift.locked ? (
                    <div className="text-2xl font-semibold text-gray-900">
                      {(nozzleSales[0]?.cashAmount || 0).toFixed(2)}
                    </div>
                  ) : (
                    <input
                      type="text"
                      value={(nozzleSales[0]?.cashAmount || 0) === 0 ? '' : String(nozzleSales[0]?.cashAmount || 0)}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value === '' || /^\d*\.?\d*$/.test(value)) {
                          handlePaymentChange('cashAmount', value || '0');
                        }
                      }}
                      className={`w-full px-4 py-3 text-xl border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-white text-gray-900 ${
                        paymentValidationError ? 'border-red-300 bg-red-50' : 'border-gray-300'
                      }`}
                      placeholder="0.00"
                    />
                  )}
                </div>
              </div>
              {!currentShift.locked && (() => {
                const totalAmount = nozzleSales.reduce((sum, sale) => sum + (sale.quantityLiters * sale.pricePerLiter), 0);
                const cardAmount = nozzleSales[0]?.cardAmount || 0;
                const cashAmount = nozzleSales[0]?.cashAmount || 0;
                const paymentSum = cardAmount + cashAmount;
                const exceedsTotal = paymentSum > totalAmount && totalAmount > 0;
                
                return (
                  <div className={`mt-4 p-3 rounded-lg border ${
                    exceedsTotal || paymentValidationError
                      ? 'bg-red-50 border-red-200' 
                      : 'bg-blue-50 border-blue-200'
                  }`}>
                    <p className={`text-sm ${
                      exceedsTotal || paymentValidationError ? 'text-red-800' : 'text-blue-800'
                    }`}>
                      {paymentValidationError ? (
                        <><strong>Error:</strong> {paymentValidationError}</>
                      ) : exceedsTotal ? (
                        <>
                          <strong>Warning:</strong> Card + Cash amount ({paymentSum.toFixed(2)} SAR) exceeds Total Amount ({totalAmount.toFixed(2)} SAR) by {(paymentSum - totalAmount).toFixed(2)} SAR
                        </>
                      ) : (
                        <>
                          <strong>Note:</strong> Card + Cash amount should not exceed Total Amount from all nozzles. 
                          {totalAmount > 0 && (
                            <> Remaining: {(totalAmount - paymentSum).toFixed(2)} SAR</>
                          )}
                        </>
                      )}
                    </p>
                  </div>
                );
              })()}
            </div>
          )}

          {/* Submit Button */}
          {!currentShift.locked && canManageStation && (
            <div className="mt-6">
              <button
                onClick={handleSubmitSales}
                disabled={submitting}
                className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {submitting ? 'Submitting...' : 'Submit Sales & Lock Shift'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Create Shift Modal */}
      {showCreateShiftModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full border border-gray-200">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Create New Shift</h3>
                <button
                  onClick={() => {
                    setShowCreateShiftModal(false);
                    setShiftType('DAY');
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Shift Type</label>
                  <select
                    value={shiftType}
                    onChange={(e) => setShiftType(e.target.value as 'DAY' | 'NIGHT')}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  >
                    <option value="DAY">Day Shift</option>
                    <option value="NIGHT">Night Shift</option>
                  </select>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-sm text-gray-600">
                    <strong>Date & Time:</strong> {new Date().toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Automatically set based on current date and time
                  </p>
                </div>
                <div className="flex gap-3 pt-4">
                  <button
                    onClick={handleCreateShift}
                    disabled={creatingShift}
                    className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {creatingShift ? 'Creating...' : 'Create Shift'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateShiftModal(false);
                      setShiftType('DAY');
                    }}
                    className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Price Form Modal */}
      {showPriceForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full border border-gray-200">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Set Fuel Price</h3>
                <button
                  onClick={() => setShowPriceForm(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <form onSubmit={handleSetPrice}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Fuel Type</label>
                  <select
                    value={priceFormData.fuelType}
                    onChange={(e) => setPriceFormData({ ...priceFormData, fuelType: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    required
                  >
                    <option value="91_GASOLINE">91 Gasoline</option>
                    <option value="95_GASOLINE">95 Gasoline</option>
                    <option value="DIESEL">Diesel</option>
                  </select>
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Price Per Liter (SAR)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={priceFormData.pricePerLiter}
                    onChange={(e) => setPriceFormData({ ...priceFormData, pricePerLiter: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    required
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-medium"
                  >
                    Set Price
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowPriceForm(false)}
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

