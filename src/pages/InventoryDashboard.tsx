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
  stationId: string;
  shiftType: 'DAY' | 'NIGHT';
  status: string;
  locked: boolean;
  startTime?: string;
  endTime?: string;
  createdAt?: string;
  nozzleSales?: NozzleSale[];
}

interface FuelPrice {
  id: string;
  fuelType: string;
  pricePerLiter: number;
}

interface Tank {
  id: string;
  fuelType: string;
  capacity: number;
  currentLevel: number;
}

export const InventoryDashboard = () => {
  const { user, canManageStation, isAdmin } = useAuth();
  const [stationId, setStationId] = useState<string>('');
  const [currentShift, setCurrentShift] = useState<Shift | null>(null);
  const [nozzleSales, setNozzleSales] = useState<NozzleSale[]>([]);
  const [fuelPrices, setFuelPrices] = useState<FuelPrice[]>([]);
  const [tanks, setTanks] = useState<Tank[]>([]);
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

  // Admin: Station Manager selection
  const [stationManagers, setStationManagers] = useState<Array<{ id: string; name: string; employeeId: string; station: { id: string; name: string } }>>([]);

  // Previous shifts
  const [previousShifts, setPreviousShifts] = useState<Shift[]>([]);
  const [selectedShiftDetails, setSelectedShiftDetails] = useState<Shift | null>(null);
  const [showShiftDetailsModal, setShowShiftDetailsModal] = useState(false);

  // Tanker delivery modal
  const [showTankerModal, setShowTankerModal] = useState(false);
  const [submittingTanker, setSubmittingTanker] = useState(false);
  const [tankerFormData, setTankerFormData] = useState({
    fuelType: '',
    litersDelivered: '',
    deliveryDate: new Date().toISOString().slice(0, 16), // Format: YYYY-MM-DDTHH:mm
    aramcoTicket: '',
    notes: '',
  });

  useEffect(() => {
    if (isAdmin) {
      // Load station managers for admin
      loadStationManagers();
    } else if (user?.stationId) {
      setStationId(user.stationId);
      loadData(user.stationId);
    } else {
      setLoading(false);
    }
  }, [user, isAdmin]);

  const loadStationManagers = async () => {
    try {
      const res = await api.get('/api/users?role=SM');
      setStationManagers(res.data.users || []);
      setLoading(false);
    } catch (error) {
      console.error('Failed to load station managers', error);
      setLoading(false);
    }
  };

  const handleSelectManager = (stationId: string) => {
    if (!stationId) {
      alert('This manager is not assigned to a station');
      return;
    }
    setStationId(stationId);
    loadData(stationId);
  };

  const handleBackToStationList = () => {
    setStationId('');
  };

  const loadData = async (sid: string) => {
    try {
      const [shiftRes, pricesRes, allShiftsRes, tanksRes] = await Promise.all([
        api.get(`/api/inventory/shifts/stations/${sid}/current`),
        api.get(`/api/fuel/prices/station/${sid}`),
        api.get(`/api/inventory/shifts/stations/${sid}/all`),
        api.get(`/api/inventory/stations/${sid}/tanks`),
      ]);

      console.log('Shift data:', shiftRes.data);
      console.log('Prices data:', pricesRes.data);
      console.log('Tanks data:', tanksRes.data);

      setCurrentShift(shiftRes.data.shift);
      setFuelPrices(pricesRes.data.prices || []);
      setTanks(tanksRes.data.tanks || []);

      // Set previous shifts (exclude current shift if it exists)
      const allShifts = allShiftsRes.data.shifts || [];
      const currentShiftId = shiftRes.data.shift?.id;
      setPreviousShifts(allShifts.filter((s: Shift) => s.id !== currentShiftId));

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

  const handleViewShiftDetails = async (shiftId: string) => {
    try {
      const res = await api.get(`/api/inventory/shifts/${shiftId}/details`);
      setSelectedShiftDetails(res.data.shift);
      setShowShiftDetailsModal(true);
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to load shift details');
    }
  };

  const handlePrintShift = async (shiftId: string) => {
    try {
      const res = await api.get(`/api/inventory/shifts/${shiftId}/details`);
      const shift = res.data.shift;

      // Create print window
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        alert('Please allow popups to print shift details');
        return;
      }

      // Calculate totals
      const totalAmount = shift.nozzleSales?.reduce((sum: number, sale: any) =>
        sum + ((sale.quantityLiters || 0) * (sale.pricePerLiter || 0)), 0) || 0;
      const totalCard = shift.nozzleSales?.reduce((sum: number, sale: any) =>
        sum + (sale.cardAmount || 0), 0) || 0;
      const totalCash = shift.nozzleSales?.reduce((sum: number, sale: any) =>
        sum + (sale.cashAmount || 0), 0) || 0;

      // Generate print HTML
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Shift Details - ${shift.shiftType}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h1 { color: #333; border-bottom: 2px solid #f97316; padding-bottom: 10px; }
            .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 20px 0; }
            .info-item { margin-bottom: 10px; }
            .info-label { font-weight: bold; color: #666; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
            th { background-color: #f97316; color: white; }
            .total-row { background-color: #f3f4f6; font-weight: bold; }
            .status-badge { display: inline-block; padding: 4px 12px; border-radius: 12px; background-color: #fee2e2; color: #991b1b; font-size: 12px; }
            @media print { button { display: none; } }
          </style>
        </head>
        <body>
          <h1>Shift Details</h1>
          <div class="info-grid">
            <div class="info-item">
              <div class="info-label">Shift Type:</div>
              <div>${shift.shiftType}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Status:</div>
              <span class="status-badge">Locked</span>
            </div>
            <div class="info-item">
              <div class="info-label">Shift End Time:</div>
              <div>${shift.createdAt ? new Date(shift.createdAt).toLocaleString() : (shift.startTime ? new Date(shift.startTime).toLocaleString() : '-')}</div>
            </div>
          </div>

          <h2>Nozzle Sales</h2>
          <table>
            <thead>
              <tr>
                <th>Nozzle</th>
                <th>Fuel Type</th>
                <th>Price/L</th>
                <th>Quantity (L)</th>
                <th>Total Amount</th>
              </tr>
            </thead>
            <tbody>
              ${shift.nozzleSales?.map((sale: any) => {
        const total = (sale.quantityLiters || 0) * (sale.pricePerLiter || 0);
        return `
                  <tr>
                    <td>${sale.nozzle?.name || '-'}</td>
                    <td>${getFuelTypeLabel(sale.nozzle?.fuelType || '')}</td>
                    <td>${(sale.pricePerLiter || 0).toFixed(2)}</td>
                    <td>${(sale.quantityLiters || 0).toFixed(2)}</td>
                    <td>${total.toFixed(2)} SAR</td>
                  </tr>
                `;
      }).join('') || '<tr><td colspan="5">No sales data</td></tr>'}
              <tr class="total-row">
                <td colspan="4" style="text-align: right;">Total:</td>
                <td>${totalAmount.toFixed(2)} SAR</td>
              </tr>
              <tr class="total-row">
                <td colspan="4" style="text-align: right;">Card Amount:</td>
                <td>${totalCard.toFixed(2)} SAR</td>
              </tr>
              <tr class="total-row">
                <td colspan="4" style="text-align: right;">Cash Amount:</td>
                <td>${totalCash.toFixed(2)} SAR</td>
              </tr>
            </tbody>
          </table>

          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
        </html>
      `);
      printWindow.document.close();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to load shift details');
    }
  };

  const handleDeleteShift = async (shiftId: string) => {
    if (!window.confirm('Are you sure you want to delete this shift? This action cannot be undone and will also delete all associated sales data.')) {
      return;
    }

    try {
      await api.delete(`/api/inventory/shifts/${shiftId}`);
      alert('Shift deleted successfully');

      // Reload shifts
      if (stationId) {
        loadData(stationId);
      }
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to delete shift');
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

  const handleAddTankerDelivery = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!tankerFormData.fuelType || !tankerFormData.litersDelivered) {
      alert('Please select a fuel type and enter liters delivered');
      return;
    }

    try {
      setSubmittingTanker(true);

      // Use the new endpoint that accepts stationId and fuelType
      await api.post(`/api/inventory/stations/${stationId}/deliveries`, {
        fuelType: tankerFormData.fuelType, // Send fuel type
        litersDelivered: parseFloat(tankerFormData.litersDelivered),
        deliveryDate: new Date(tankerFormData.deliveryDate).toISOString(),
        aramcoTicket: tankerFormData.aramcoTicket,
        notes: tankerFormData.notes,
      });

      alert('Tanker delivery recorded successfully!');
      setShowTankerModal(false);
      setTankerFormData({
        fuelType: '',
        litersDelivered: '',
        deliveryDate: new Date().toISOString().slice(0, 16),
        aramcoTicket: '',
        notes: '',
      });

      // Reload data to update tank levels
      if (stationId) {
        loadData(stationId);
      }
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to record tanker delivery');
    } finally {
      setSubmittingTanker(false);
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
    if (isAdmin) {
      return (
        <div className="px-4 py-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Station Inventory Management</h1>
            <p className="text-gray-600 mb-6">Select a Station Manager to view and manage their station's inventory</p>

            {loading ? (
              <LoadingSpinner />
            ) : stationManagers.length === 0 ? (
              <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
                <p>No Station Managers found.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {stationManagers.map((manager) => (
                  <div
                    key={manager.id}
                    onClick={() => handleSelectManager(manager.station?.id)}
                    className="border border-gray-200 rounded-xl p-6 hover:shadow-md transition-shadow cursor-pointer bg-white group"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                      </div>
                      <svg className="w-5 h-5 text-gray-400 group-hover:text-primary transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 mb-1">{manager.station?.name || 'Unassigned Station'}</h3>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      <span>{manager.name}</span>
                    </div>
                    <div className="mt-2 text-xs text-gray-500">ID: {manager.employeeId}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      );
    }

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
            {isAdmin && (
              <button
                onClick={handleBackToStationList}
                className="flex items-center gap-1 text-gray-500 hover:text-primary mb-2 transition-colors text-sm font-medium"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back to Station List
              </button>
            )}
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Fuel Sales Dashboard</h1>
            <p className="text-gray-600">Track fuel levels in tanks and nozzle meter readings</p>
          </div>
          <div className="flex gap-3">
            {canManageStation && (
              <button
                onClick={() => setShowTankerModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Add Tanker Delivery
              </button>
            )}
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

      {/* Tank Details Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold mb-4 text-gray-900">Fuel Tank Levels</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {tanks.map((tank) => {
            // Add null checks with default values
            const currentLevel = tank.currentLevel ?? 0;
            const isLow = currentLevel < 1000; // Low if less than 1000 liters
            const isMedium = currentLevel >= 1000 && currentLevel < 5000; // Medium between 1000-5000

            return (
              <div key={tank.id} className="border border-gray-200 rounded-lg p-5 bg-gradient-to-br from-gray-50 to-white">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-lg text-gray-900">{getFuelTypeLabel(tank.fuelType)}</h3>
                  <div className={`w-3 h-3 rounded-full ${isLow ? 'bg-red-500' : isMedium ? 'bg-yellow-500' : 'bg-green-500'
                    }`} title={isLow ? 'Low' : isMedium ? 'Medium' : 'Good'}></div>
                </div>

                {/* Current Level Display */}
                <div className="mb-3">
                  <div className="text-center py-6 bg-gray-100 rounded-lg border-2 border-gray-200">
                    <p className="text-sm text-gray-600 mb-1">Current Fuel Level</p>
                    <p className="text-4xl font-bold text-primary">{currentLevel.toFixed(2)}</p>
                    <p className="text-sm text-gray-500 mt-1">Liters</p>
                  </div>
                </div>

                {/* Low Level Warning */}
                {isLow && (
                  <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-xs text-red-800 font-medium flex items-center gap-1">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      Low fuel level!
                    </p>
                  </div>
                )}
              </div>
            );
          })}

          {tanks.length === 0 && (
            <div className="col-span-3 text-center py-8 text-gray-500">
              <p>No tank data available. Please contact administrator.</p>
            </div>
          )}
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

      {/* Previous Shifts Section */}
      {previousShifts.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-900">Previous Shifts</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Shift Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Shift End Time</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {previousShifts.map((shift) => (
                  <tr key={shift.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{shift.shiftType}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-700">
                      {shift.createdAt ? new Date(shift.createdAt).toLocaleString() : (shift.startTime ? new Date(shift.startTime).toLocaleString() : '-')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        Locked
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleViewShiftDetails(shift.id)}
                          className="px-3 py-1 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium"
                        >
                          Details
                        </button>
                        <button
                          onClick={() => handlePrintShift(shift.id)}
                          className="px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium flex items-center gap-1"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                          </svg>
                          Print
                        </button>
                        {isAdmin && (
                          <button
                            onClick={() => handleDeleteShift(shift.id)}
                            className="px-3 py-1 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium flex items-center gap-1"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            Delete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
            <span className={`px-3 py-1 rounded-full text-sm font-medium border ${currentShift.locked
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
                      className={`w-full px-4 py-3 text-xl border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-white text-gray-900 ${paymentValidationError ? 'border-red-300 bg-red-50' : 'border-gray-300'
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
                      className={`w-full px-4 py-3 text-xl border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-white text-gray-900 ${paymentValidationError ? 'border-red-300 bg-red-50' : 'border-gray-300'
                        }`}
                      placeholder="0.00"
                    />
                  )}
                </div>
              </div>
              {!currentShift.locked && paymentValidationError && (
                <div className="mt-4 p-3 rounded-lg border bg-red-50 border-red-200">
                  <p className="text-sm text-red-800">
                    <strong>Error:</strong> {paymentValidationError}
                  </p>
                </div>
              )}
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
              <form onSubmit={(e) => {
                e.preventDefault();
                handleCreateShift();
              }}>
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
                      type="submit"
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
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Shift Details Modal */}
      {showShiftDetailsModal && selectedShiftDetails && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full border border-gray-200 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Shift Details</h3>
                <button
                  onClick={() => {
                    setShowShiftDetailsModal(false);
                    setSelectedShiftDetails(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Shift Type</label>
                    <p className="text-gray-900">{selectedShiftDetails.shiftType}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                      Locked
                    </span>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Shift End Time</label>
                    <p className="text-gray-900">{selectedShiftDetails.createdAt ? new Date(selectedShiftDetails.createdAt).toLocaleString() : (selectedShiftDetails.startTime ? new Date(selectedShiftDetails.startTime).toLocaleString() : '-')}</p>
                  </div>
                </div>

                {selectedShiftDetails.nozzleSales && selectedShiftDetails.nozzleSales.length > 0 && (
                  <div className="mt-6">
                    <h4 className="text-md font-semibold text-gray-900 mb-3">Nozzle Sales</h4>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Nozzle</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Fuel Type</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Price/L</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Quantity (L)</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Total Amount</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {selectedShiftDetails.nozzleSales.map((sale: any) => {
                            const totalAmount = (sale.quantityLiters || 0) * (sale.pricePerLiter || 0);
                            return (
                              <tr key={sale.id}>
                                <td className="px-4 py-2 text-sm text-gray-900">{sale.nozzle?.name || '-'}</td>
                                <td className="px-4 py-2 text-sm text-gray-700">{getFuelTypeLabel(sale.nozzle?.fuelType || '')}</td>
                                <td className="px-4 py-2 text-sm text-gray-700">{(sale.pricePerLiter || 0).toFixed(2)}</td>
                                <td className="px-4 py-2 text-sm text-gray-900">{(sale.quantityLiters || 0).toFixed(2)}</td>
                                <td className="px-4 py-2 text-sm font-bold text-primary">{totalAmount.toFixed(2)} SAR</td>
                              </tr>
                            );
                          })}
                        </tbody>
                        <tfoot className="bg-gray-50">
                          <tr>
                            <td colSpan={4} className="px-4 py-3 text-sm font-semibold text-gray-900 text-right">Total:</td>
                            <td className="px-4 py-3 text-sm font-bold text-primary">
                              {selectedShiftDetails.nozzleSales.reduce((sum: number, sale: any) =>
                                sum + ((sale.quantityLiters || 0) * (sale.pricePerLiter || 0)), 0
                              ).toFixed(2)} SAR
                            </td>
                          </tr>
                          <tr>
                            <td colSpan={4} className="px-4 py-2 text-sm font-semibold text-gray-900 text-right">Card Amount:</td>
                            <td className="px-4 py-2 text-sm font-semibold text-gray-900">
                              {selectedShiftDetails.nozzleSales.reduce((sum: number, sale: any) =>
                                sum + (sale.cardAmount || 0), 0
                              ).toFixed(2)} SAR
                            </td>
                          </tr>
                          <tr>
                            <td colSpan={4} className="px-4 py-2 text-sm font-semibold text-gray-900 text-right">Cash Amount:</td>
                            <td className="px-4 py-2 text-sm font-semibold text-gray-900">
                              {selectedShiftDetails.nozzleSales.reduce((sum: number, sale: any) =>
                                sum + (sale.cashAmount || 0), 0
                              ).toFixed(2)} SAR
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => {
                    setShowShiftDetailsModal(false);
                    setSelectedShiftDetails(null);
                  }}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                >
                  Close
                </button>
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

      {/* Tanker Delivery Modal */}
      {showTankerModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full border border-gray-200">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Add Tanker Delivery</h3>
                <button
                  onClick={() => setShowTankerModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <form onSubmit={handleAddTankerDelivery}>
                <div className="space-y-4">
                  {/* Tank Selection */}
                  {/* Fuel Type Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Select Fuel Type *</label>
                    <select
                      value={tankerFormData.fuelType}
                      onChange={(e) => setTankerFormData({ ...tankerFormData, fuelType: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      required
                    >
                      <option value="">Choose Fuel Type...</option>
                      {['91_GASOLINE', '95_GASOLINE', 'DIESEL'].map((ft) => {
                        const tank = tanks.find(t => t.fuelType === ft);
                        return (
                          <option key={ft} value={ft}>
                            {getFuelTypeLabel(ft)} {tank ? `(Current: ${(tank.currentLevel ?? 0).toFixed(2)} L)` : ''}
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  {/* Liters Delivered */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Liters Delivered *</label>
                    <input
                      type="number"
                      step="0.01"
                      value={tankerFormData.litersDelivered}
                      onChange={(e) => setTankerFormData({ ...tankerFormData, litersDelivered: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      placeholder="Enter liters delivered"
                      required
                    />
                  </div>

                  {/* Delivery Date */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Delivery Date & Time *</label>
                    <input
                      type="datetime-local"
                      value={tankerFormData.deliveryDate}
                      onChange={(e) => setTankerFormData({ ...tankerFormData, deliveryDate: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      required
                    />
                  </div>

                  {/* Aramco Ticket */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Aramco Ticket Number</label>
                    <input
                      type="text"
                      value={tankerFormData.aramcoTicket}
                      onChange={(e) => setTankerFormData({ ...tankerFormData, aramcoTicket: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      placeholder="Enter Aramco ticket number"
                    />
                  </div>

                  {/* Notes */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Notes (Optional)</label>
                    <textarea
                      value={tankerFormData.notes}
                      onChange={(e) => setTankerFormData({ ...tankerFormData, notes: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      placeholder="Add any additional notes..."
                      rows={3}
                    />
                  </div>

                  {/* Buttons */}
                  <div className="flex gap-3 pt-4">
                    <button
                      type="submit"
                      disabled={submittingTanker}
                      className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {submittingTanker ? 'Recording...' : 'Record Delivery'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowTankerModal(false)}
                      className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

