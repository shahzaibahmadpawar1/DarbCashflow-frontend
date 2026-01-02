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

  const handlePaymentChange = (saleId: string, field: 'cardAmount' | 'cashAmount', value: string) => {
    // Update local state immediately
    setNozzleSales(prev => prev.map(sale =>
      sale.id === saleId
        ? { ...sale, [field]: parseFloat(value) || 0 }
        : sale
    ));

    // Debounce API call
    const timeoutId = setTimeout(async () => {
      try {
        await api.put(`/api/fuel/sales/${saleId}`, {
          [field]: parseFloat(value) || 0,
        });
      } catch (error: any) {
        console.error('Failed to update payment:', error);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
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
    <div className="px-4 py-6 sm:px-0">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-foreground">Fuel Sales Dashboard</h1>
        {isAdmin && (
          <button
            onClick={() => setShowPriceForm(true)}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover-elevate active-elevate-2 border border-primary-border"
          >
            Set Fuel Prices
          </button>
        )}
      </div>

      {/* Current Prices */}
      <div className="bg-card shadow rounded-lg p-6 mb-6 border border-card-border">
        <h2 className="text-xl font-semibold mb-4 text-card-foreground">Current Fuel Prices</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {fuelPrices.map((price) => (
            <div key={price.id} className="border border-border rounded-lg p-4 bg-card">
              <h3 className="font-semibold text-foreground">{getFuelTypeLabel(price.fuelType)}</h3>
              <p className="text-2xl font-bold text-primary">{price.pricePerLiter.toFixed(2)} SAR/L</p>
            </div>
          ))}
        </div>
      </div>

      {/* Shift Info */}
      {currentShift && (
        <div className="bg-card shadow rounded-lg p-6 mb-6 border border-card-border">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-card-foreground">
              Current Shift: {currentShift.shiftType}
            </h2>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${currentShift.locked
              ? 'bg-destructive/10 text-destructive-foreground'
              : 'bg-status.online/10 text-[rgb(34_197_94)]'
              }`}>
              {currentShift.locked ? 'Locked' : 'Open'}
            </span>
          </div>

          {/* Nozzle Sales Table */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border">
              <thead className="bg-muted">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Nozzle</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Fuel Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Price/L</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Quantity (L)</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Total Amount</th>
                </tr>
              </thead>
              <tbody className="bg-card divide-y divide-border">
                {nozzleSales.map((sale) => {
                  const totalAmount = parseFloat(calculateTotal(sale.quantityLiters, sale.pricePerLiter));
                  return (
                    <tr key={sale.id}>
                      <td className="px-6 py-4 whitespace-nowrap font-medium text-foreground">{sale.nozzle.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-foreground">{getFuelTypeLabel(sale.nozzle.fuelType)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-foreground">{sale.pricePerLiter.toFixed(2)}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {currentShift.locked ? (
                          <span className="text-foreground">{sale.quantityLiters.toFixed(2)}</span>
                        ) : (
                          <input
                            type="text"
                            value={sale.quantityLiters === 0 ? '' : String(sale.quantityLiters)}
                            onChange={(e) => {
                              const value = e.target.value;
                              // Allow only numbers and decimal point
                              if (value === '' || /^\d*\.?\d*$/.test(value)) {
                                handleQuantityChange(sale.id, value || '0');
                              }
                            }}
                            className="w-32 px-2 py-1 border border-input rounded focus:outline-none focus:ring-2 focus:ring-ring bg-background text-foreground"
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
                    <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">
                      No nozzle sales data. Please run the setup SQL scripts and refresh the page.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Summary Section - Total with Card/Cash Split */}
          {nozzleSales.length > 0 && (
            <div className="mt-6 bg-muted/50 rounded-lg p-6 border border-border">
              <h3 className="text-lg font-semibold mb-4 text-foreground">Payment Summary</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Total Amount */}
                <div className="bg-card rounded-lg p-4 border-2 border-primary border border-card-border">
                  <label className="block text-sm font-medium text-foreground mb-2">Total Amount</label>
                  <div className="text-3xl font-bold text-primary">
                    {nozzleSales.reduce((sum, sale) => sum + (sale.quantityLiters * sale.pricePerLiter), 0).toFixed(2)} SAR
                  </div>
                </div>

                {/* Card Amount */}
                <div className="bg-card rounded-lg p-4 border border-card-border">
                  <label className="block text-sm font-medium text-foreground mb-2">Card Amount (SAR)</label>
                  {currentShift.locked ? (
                    <div className="text-2xl font-semibold text-foreground">
                      {nozzleSales.reduce((sum, sale) => sum + (sale.cardAmount || 0), 0).toFixed(2)}
                    </div>
                  ) : (
                    <input
                      type="text"
                      value={nozzleSales[0]?.cardAmount === 0 ? '' : String(nozzleSales[0]?.cardAmount || '')}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value === '' || /^\d*\.?\d*$/.test(value)) {
                          handlePaymentChange(nozzleSales[0].id, 'cardAmount', value || '0');
                        }
                      }}
                      className="w-full px-4 py-3 text-xl border-2 border-input rounded-lg focus:border-ring focus:outline-none bg-background text-foreground"
                      placeholder="0.00"
                    />
                  )}
                </div>

                {/* Cash Amount */}
                <div className="bg-card rounded-lg p-4 border border-card-border">
                  <label className="block text-sm font-medium text-foreground mb-2">Cash Amount (SAR)</label>
                  {currentShift.locked ? (
                    <div className="text-2xl font-semibold text-foreground">
                      {nozzleSales.reduce((sum, sale) => sum + (sale.cashAmount || 0), 0).toFixed(2)}
                    </div>
                  ) : (
                    <input
                      type="text"
                      value={nozzleSales[0]?.cashAmount === 0 ? '' : String(nozzleSales[0]?.cashAmount || '')}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value === '' || /^\d*\.?\d*$/.test(value)) {
                          handlePaymentChange(nozzleSales[0].id, 'cashAmount', value || '0');
                        }
                      }}
                      className="w-full px-4 py-3 text-xl border-2 border-input rounded-lg focus:border-ring focus:outline-none bg-background text-foreground"
                      placeholder="0.00"
                    />
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Submit Button */}
          {!currentShift.locked && canManageStation && (
            <div className="mt-6">
              <button
                onClick={handleSubmitSales}
                disabled={submitting}
                className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover-elevate active-elevate-2 disabled:opacity-50 disabled:cursor-not-allowed border border-primary-border"
              >
                {submitting ? 'Submitting...' : 'Submit Sales & Lock Shift'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Price Form Modal */}
      {showPriceForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-card/80 backdrop-blur-sm rounded-lg p-6 max-w-md w-full border border-card-border">
            <h3 className="text-lg font-semibold mb-4 text-card-foreground">Set Fuel Price</h3>
            <form onSubmit={handleSetPrice}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-foreground mb-2">Fuel Type</label>
                <select
                  value={priceFormData.fuelType}
                  onChange={(e) => setPriceFormData({ ...priceFormData, fuelType: e.target.value })}
                  className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground"
                  required
                >
                  <option value="91_GASOLINE">91 Gasoline</option>
                  <option value="95_GASOLINE">95 Gasoline</option>
                  <option value="DIESEL">Diesel</option>
                </select>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-foreground mb-2">Price Per Liter (SAR)</label>
                <input
                  type="number"
                  step="0.01"
                  value={priceFormData.pricePerLiter}
                  onChange={(e) => setPriceFormData({ ...priceFormData, pricePerLiter: e.target.value })}
                  className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground"
                  required
                />
              </div>
              <div className="flex gap-4">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover-elevate active-elevate-2 border border-primary-border"
                >
                  Set Price
                </button>
                <button
                  type="button"
                  onClick={() => setShowPriceForm(false)}
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
