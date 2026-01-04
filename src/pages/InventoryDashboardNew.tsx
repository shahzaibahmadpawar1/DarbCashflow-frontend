import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import api from '../services/api';
import { LoadingSpinner } from '../components/shared/LoadingSpinner';

interface DailyShiftReading {
    id: string;
    nozzleId: string;
    openingReading: number;
    shiftAReading: number | null;
    shiftBReading: number | null;
    shiftALiters: number;
    shiftBLiters: number;
    pricePerLiter: number;
    shiftAAmount: number;
    shiftBAmount: number;
    totalAmount: number;
    nozzle: {
        id: string;
        name: string;
        fuelType: string;
    };
}

interface PaymentSummary {
    cardAmount: number;
    cashAmount: number;
    option3Amount: number;
    option4Amount: number;
    totalCollected: number;
    difference: number;
}

interface DailyShift {
    id: string;
    stationId: string;
    shiftDate: string;
    status: 'OPEN' | 'SAVED' | 'LOCKED';
    locked: boolean;
    dailyShiftReadings?: DailyShiftReading[];
    paymentSummary?: PaymentSummary;
}

interface Tank {
    id: string;
    fuelType: string;
    capacity: number;
    currentLevel: number;
}

export const InventoryDashboard = () => {
    const { user, canManageStation } = useAuth();
    const [stationId, setStationId] = useState<string>('');
    const [currentShift, setCurrentShift] = useState<DailyShift | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Tank levels state
    const [tanks, setTanks] = useState<Tank[]>([]);

    // Tanker delivery modal
    const [showTankerModal, setShowTankerModal] = useState(false);
    const [submittingTanker, setSubmittingTanker] = useState(false);
    const [tankerFormData, setTankerFormData] = useState({
        fuelType: '',
        litersDelivered: '',
        deliveryDate: new Date().toISOString().slice(0, 16),
        aramcoTicket: '',
        notes: '',
        receiptUrl: '',
    });
    const [uploadingReceipt, setUploadingReceipt] = useState(false);

    // History modals
    const [showShiftHistory, setShowShiftHistory] = useState(false);
    const [showTankerHistory, setShowTankerHistory] = useState(false);
    const [shiftHistory, setShiftHistory] = useState<any[]>([]);
    const [tankerHistory, setTankerHistory] = useState<any[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(false);

    // Payment summary state
    const [paymentData, setPaymentData] = useState({
        cardAmount: 0,
        cashAmount: 0,
        option3Amount: 0,
        option4Amount: 0,
    });

    useEffect(() => {
        if (user?.stationId) {
            setStationId(user.stationId);
            loadCurrentShift(user.stationId);
        } else {
            setLoading(false);
        }
    }, [user]);

    const loadCurrentShift = async (sid: string) => {
        try {
            setLoading(true);
            const [shiftRes, tanksRes] = await Promise.all([
                api.get(`/api/inventory/shifts/stations/${sid}/current`),
                api.get(`/api/inventory/stations/${sid}/tanks`),
            ]);

            if (shiftRes.data.shift) {
                setCurrentShift(shiftRes.data.shift);

                // Load payment summary if exists
                if (shiftRes.data.shift.paymentSummary) {
                    setPaymentData({
                        cardAmount: shiftRes.data.shift.paymentSummary.cardAmount || 0,
                        cashAmount: shiftRes.data.shift.paymentSummary.cashAmount || 0,
                        option3Amount: shiftRes.data.shift.paymentSummary.option3Amount || 0,
                        option4Amount: shiftRes.data.shift.paymentSummary.option4Amount || 0,
                    });
                }
            }

            // Load tank levels
            setTanks(tanksRes.data.tanks || []);
        } catch (error: any) {
            console.error('Failed to load shift:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenShift = async () => {
        if (!stationId) return;

        try {
            setSaving(true);
            await api.post(`/api/inventory/shifts/stations/${stationId}/daily`);
            alert('Daily shift created successfully!');
            loadCurrentShift(stationId);
        } catch (error: any) {
            alert(error.response?.data?.error || 'Failed to create shift');
        } finally {
            setSaving(false);
        }
    };

    const handleReadingChange = (readingId: string, field: 'shiftAReading' | 'shiftBReading', value: string) => {
        if (!currentShift?.dailyShiftReadings) return;

        const numValue = parseFloat(value) || null;

        setCurrentShift({
            ...currentShift,
            dailyShiftReadings: currentShift.dailyShiftReadings.map(r =>
                r.id === readingId ? { ...r, [field]: numValue } : r
            ),
        });
    };

    const handleSaveReadings = async () => {
        if (!currentShift) return;

        try {
            setSaving(true);
            const readings = currentShift.dailyShiftReadings?.map(r => ({
                id: r.id,
                shiftAReading: r.shiftAReading,
                shiftBReading: r.shiftBReading,
            })) || [];

            await api.put(`/api/inventory/shifts/${currentShift.id}/daily/readings`, { readings });
            alert('Readings saved successfully!');
            loadCurrentShift(stationId);
        } catch (error: any) {
            alert(error.response?.data?.error || 'Failed to save readings');
        } finally {
            setSaving(false);
        }
    };

    const handlePaymentChange = (field: keyof typeof paymentData, value: string) => {
        const numValue = parseFloat(value) || 0;
        setPaymentData(prev => ({ ...prev, [field]: numValue }));
    };

    const handleSavePayment = async () => {
        if (!currentShift) return;

        try {
            setSaving(true);
            await api.post(`/api/inventory/shifts/${currentShift.id}/daily/payment-summary`, paymentData);
            alert('Payment summary saved successfully!');
            loadCurrentShift(stationId);
        } catch (error: any) {
            alert(error.response?.data?.error || 'Failed to save payment summary');
        } finally {
            setSaving(false);
        }
    };

    const handleLockShift = async () => {
        if (!currentShift) return;

        const confirmed = window.confirm(
            'Are you sure you want to lock this shift? This action cannot be undone.'
        );

        if (!confirmed) return;

        try {
            setSaving(true);
            await api.post(`/api/inventory/shifts/${currentShift.id}/daily/lock`);
            alert('Shift locked successfully!');
            loadCurrentShift(stationId);
        } catch (error: any) {
            alert(error.response?.data?.error || 'Failed to lock shift');
        } finally {
            setSaving(false);
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

            await api.post(`/api/inventory/stations/${stationId}/deliveries`, {
                fuelType: tankerFormData.fuelType,
                litersDelivered: parseFloat(tankerFormData.litersDelivered),
                deliveryDate: new Date(tankerFormData.deliveryDate).toISOString(),
                aramcoTicket: tankerFormData.aramcoTicket,
                notes: tankerFormData.notes,
                receiptUrl: tankerFormData.receiptUrl,
            });

            alert('Tanker delivery recorded successfully!');
            setShowTankerModal(false);
            setTankerFormData({
                fuelType: '',
                litersDelivered: '',
                deliveryDate: new Date().toISOString().slice(0, 16),
                aramcoTicket: '',
                notes: '',
                receiptUrl: '',
            });

            // Reload data to update tank levels
            if (stationId) {
                loadCurrentShift(stationId);
            }
        } catch (error: any) {
            alert(error.response?.data?.error || 'Failed to record tanker delivery');
        } finally {
            setSubmittingTanker(false);
        }
    };

    const handleReceiptUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            alert('Please upload an image file');
            return;
        }

        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            alert('File size must be less than 5MB');
            return;
        }

        try {
            setUploadingReceipt(true);
            const formData = new FormData();
            formData.append('receipt', file);

            const res = await api.post('/api/upload/receipt', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });

            setTankerFormData({ ...tankerFormData, receiptUrl: res.data.url });
        } catch (error: any) {
            alert(error.response?.data?.error || 'Failed to upload receipt');
        } finally {
            setUploadingReceipt(false);
        }
    };

    const loadShiftHistory = async () => {
        if (!stationId) return;
        try {
            setLoadingHistory(true);
            const res = await api.get(`/api/inventory/shifts/stations/${stationId}/all`);
            setShiftHistory(res.data.shifts || []);
            setShowShiftHistory(true);
        } catch (error: any) {
            alert(error.response?.data?.error || 'Failed to load shift history');
        } finally {
            setLoadingHistory(false);
        }
    };

    const loadTankerHistory = async () => {
        if (!stationId) return;
        try {
            setLoadingHistory(true);
            const res = await api.get('/api/inventory/deliveries');
            // Filter by station if needed
            setTankerHistory(res.data.deliveries || []);
            setShowTankerHistory(true);
        } catch (error: any) {
            alert(error.response?.data?.error || 'Failed to load tanker history');
        } finally {
            setLoadingHistory(false);
        }
    };

    const handlePrintShift = (shift: any) => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        printWindow.document.write(`
            <html>
                <head>
                    <title>Shift Details - ${shift.id}</title>
                    <style>
                        body { font-family: Arial, sans-serif; padding: 20px; }
                        h1 { color: #333; }
                        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                        th { background-color: #f2f2f2; }
                    </style>
                </head>
                <body>
                    <h1>Shift Details</h1>
                    <p><strong>Date:</strong> ${new Date(shift.shiftDate || shift.startTime).toLocaleDateString()}</p>
                    <p><strong>Status:</strong> ${shift.status}</p>
                    <p><strong>Total Revenue:</strong> ${shift.dailyShiftReadings?.reduce((sum: number, r: any) => sum + (r.totalAmount || 0), 0).toFixed(2)} SAR</p>
                    <button onclick="window.print()">Print</button>
                </body>
            </html>
        `);
        printWindow.document.close();
    };

    const handleExportShiftCSV = (shift: any) => {
        const csvData = [
            ['Shift ID', 'Date', 'Status', 'Total Revenue'],
            [
                shift.id,
                new Date(shift.shiftDate || shift.startTime).toLocaleDateString(),
                shift.status,
                shift.dailyShiftReadings?.reduce((sum: number, r: any) => sum + (r.totalAmount || 0), 0).toFixed(2)
            ]
        ];

        const csvContent = csvData.map(row => row.join(',')).join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `shift_${shift.id}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
    };

    const handlePrintTanker = (delivery: any) => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        printWindow.document.write(`
            <html>
                <head>
                    <title>Tanker Delivery - ${delivery.id}</title>
                    <style>
                        body { font-family: Arial, sans-serif; padding: 20px; }
                        h1 { color: #333; }
                        p { margin: 10px 0; }
                    </style>
                </head>
                <body>
                    <h1>Tanker Delivery Details</h1>
                    <p><strong>Fuel Type:</strong> ${getFuelTypeLabel(delivery.fuelType)}</p>
                    <p><strong>Liters:</strong> ${delivery.litersDelivered}</p>
                    <p><strong>Date:</strong> ${new Date(delivery.deliveryDate).toLocaleString()}</p>
                    <p><strong>Aramco Ticket:</strong> ${delivery.aramcoTicket || 'N/A'}</p>
                    <p><strong>Notes:</strong> ${delivery.notes || 'N/A'}</p>
                    <button onclick="window.print()">Print</button>
                </body>
            </html>
        `);
        printWindow.document.close();
    };

    const handleExportTankerCSV = (delivery: any) => {
        const csvData = [
            ['Delivery ID', 'Fuel Type', 'Liters', 'Date', 'Aramco Ticket', 'Notes'],
            [
                delivery.id,
                getFuelTypeLabel(delivery.fuelType),
                delivery.litersDelivered,
                new Date(delivery.deliveryDate).toLocaleString(),
                delivery.aramcoTicket || 'N/A',
                delivery.notes || 'N/A'
            ]
        ];

        const csvContent = csvData.map(row => row.join(',')).join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `tanker_delivery_${delivery.id}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
    };

    const getFuelTypeLabel = (fuelType: string) => {
        switch (fuelType) {
            case '91_GASOLINE': return '91 Gasoline';
            case '95_GASOLINE': return '95 Gasoline';
            case 'DIESEL': return 'Diesel';
            default: return fuelType;
        }
    };

    const calculateTotalRevenue = () => {
        return currentShift?.dailyShiftReadings?.reduce((sum, r) => sum + r.totalAmount, 0) || 0;
    };

    const calculateDifference = () => {
        const total = calculateTotalRevenue();
        const collected = paymentData.cardAmount + paymentData.cashAmount +
            paymentData.option3Amount + paymentData.option4Amount;
        return total - collected;
    };

    if (loading) {
        return <LoadingSpinner />;
    }

    if (!stationId) {
        return (
            <div className="px-4 py-6">
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
                    <h2 className="text-xl font-semibold text-gray-900 mb-2">No Station Assigned</h2>
                    <p className="text-gray-600">
                        You need to be assigned to a station to access the inventory dashboard.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 p-6">
            {/* Header */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 mb-2">Daily Shift Management</h1>
                        <p className="text-gray-600">Record meter readings for Shift A and Shift B</p>
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={loadShiftHistory}
                            disabled={loadingHistory}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Shift History
                        </button>
                        <button
                            onClick={loadTankerHistory}
                            disabled={loadingHistory}
                            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium disabled:opacity-50"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            Tanker History
                        </button>
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
                        {!currentShift && canManageStation && (
                            <button
                                onClick={handleOpenShift}
                                disabled={saving}
                                className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-medium disabled:opacity-50"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                </svg>
                                Open Shift
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Tank Levels Section */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h2 className="text-xl font-semibold mb-4 text-gray-900">Fuel Tank Levels</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {tanks.map((tank) => {
                        const currentLevel = tank.currentLevel ?? 0;
                        const isLow = currentLevel < 1000;
                        const isMedium = currentLevel >= 1000 && currentLevel < 5000;

                        return (
                            <div key={tank.id} className="border border-gray-200 rounded-lg p-5 bg-gradient-to-br from-gray-50 to-white">
                                <div className="flex items-center justify-between mb-3">
                                    <h3 className="font-bold text-lg text-gray-900">{getFuelTypeLabel(tank.fuelType)}</h3>
                                    <div className={`w-3 h-3 rounded-full ${isLow ? 'bg-red-500' : isMedium ? 'bg-yellow-500' : 'bg-green-500'}`}
                                        title={isLow ? 'Low' : isMedium ? 'Medium' : 'Good'}></div>
                                </div>

                                <div className="mb-3">
                                    <div className="text-center py-6 bg-gray-100 rounded-lg border-2 border-gray-200">
                                        <p className="text-sm text-gray-600 mb-1">Current Fuel Level</p>
                                        <p className="text-4xl font-bold text-primary">{currentLevel.toFixed(2)}</p>
                                        <p className="text-sm text-gray-500 mt-1">Liters</p>
                                    </div>
                                </div>

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

            {/* Current Shift Status */}
            {currentShift && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-semibold text-gray-900">Current Shift</h2>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${currentShift.status === 'OPEN' ? 'bg-green-100 text-green-800' :
                            currentShift.status === 'SAVED' ? 'bg-blue-100 text-blue-800' :
                                'bg-gray-100 text-gray-800'
                            }`}>
                            {currentShift.status}
                        </span>
                    </div>

                    {/* Readings Table */}
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-200">
                                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Nozzle</th>
                                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Fuel Type</th>
                                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Price/L</th>
                                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Opening</th>
                                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Shift A</th>
                                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Shift B</th>
                                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">A Liters</th>
                                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">B Liters</th>
                                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">A Amount</th>
                                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">B Amount</th>
                                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                {currentShift.dailyShiftReadings?.map((reading) => (
                                    <tr key={reading.id} className="border-b border-gray-100 hover:bg-gray-50">
                                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{reading.nozzle.name}</td>
                                        <td className="px-4 py-3 text-sm text-gray-600">{getFuelTypeLabel(reading.nozzle.fuelType)}</td>
                                        <td className="px-4 py-3 text-sm text-right text-gray-900">{reading.pricePerLiter.toFixed(2)}</td>
                                        <td className="px-4 py-3 text-sm text-right text-gray-600">{reading.openingReading.toFixed(2)}</td>
                                        <td className="px-4 py-3">
                                            <input
                                                type="number"
                                                value={reading.shiftAReading || ''}
                                                onChange={(e) => handleReadingChange(reading.id, 'shiftAReading', e.target.value)}
                                                disabled={currentShift.locked}
                                                className="w-24 px-2 py-1 text-sm text-right border border-gray-300 rounded focus:ring-2 focus:ring-primary focus:border-transparent disabled:bg-gray-100"
                                                step="0.01"
                                            />
                                        </td>
                                        <td className="px-4 py-3">
                                            <input
                                                type="number"
                                                value={reading.shiftBReading || ''}
                                                onChange={(e) => handleReadingChange(reading.id, 'shiftBReading', e.target.value)}
                                                disabled={currentShift.locked}
                                                className="w-24 px-2 py-1 text-sm text-right border border-gray-300 rounded focus:ring-2 focus:ring-primary focus:border-transparent disabled:bg-gray-100"
                                                step="0.01"
                                            />
                                        </td>
                                        <td className="px-4 py-3 text-sm text-right text-gray-900">{reading.shiftALiters.toFixed(2)}</td>
                                        <td className="px-4 py-3 text-sm text-right text-gray-900">{reading.shiftBLiters.toFixed(2)}</td>
                                        <td className="px-4 py-3 text-sm text-right text-gray-900">{reading.shiftAAmount.toFixed(2)}</td>
                                        <td className="px-4 py-3 text-sm text-right text-gray-900">{reading.shiftBAmount.toFixed(2)}</td>
                                        <td className="px-4 py-3 text-sm text-right font-semibold text-primary">{reading.totalAmount.toFixed(2)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Action Buttons */}
                    {!currentShift.locked && canManageStation && (
                        <div className="mt-6 flex gap-3">
                            <button
                                onClick={handleSaveReadings}
                                disabled={saving}
                                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50"
                            >
                                {saving ? 'Saving...' : 'Save Readings'}
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Payment Summary */}
            {currentShift && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">Payment Summary</h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                        <div className="border-2 border-orange-500 rounded-lg p-4 bg-orange-50">
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Total Amount (All Nozzles)
                            </label>
                            <p className="text-3xl font-bold text-orange-600">
                                {calculateTotalRevenue().toFixed(2)} SAR
                            </p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Card Amount (SAR)</label>
                            <input
                                type="number"
                                value={paymentData.cardAmount}
                                onChange={(e) => handlePaymentChange('cardAmount', e.target.value)}
                                disabled={currentShift.locked}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent disabled:bg-gray-100"
                                step="0.01"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Cash Amount (SAR)</label>
                            <input
                                type="number"
                                value={paymentData.cashAmount}
                                onChange={(e) => handlePaymentChange('cashAmount', e.target.value)}
                                disabled={currentShift.locked}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent disabled:bg-gray-100"
                                step="0.01"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Option 3 (SAR)</label>
                            <input
                                type="number"
                                value={paymentData.option3Amount}
                                onChange={(e) => handlePaymentChange('option3Amount', e.target.value)}
                                disabled={currentShift.locked}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent disabled:bg-gray-100"
                                step="0.01"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Option 4 (SAR)</label>
                            <input
                                type="number"
                                value={paymentData.option4Amount}
                                onChange={(e) => handlePaymentChange('option4Amount', e.target.value)}
                                disabled={currentShift.locked}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent disabled:bg-gray-100"
                                step="0.01"
                            />
                        </div>

                        <div className="border-2 border-gray-300 rounded-lg p-4 bg-gray-50">
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Difference</label>
                            <p className={`text-2xl font-bold ${calculateDifference() >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {calculateDifference().toFixed(2)} SAR
                            </p>
                        </div>
                    </div>

                    {!currentShift.locked && canManageStation && (
                        <div className="flex gap-3">
                            <button
                                onClick={handleSavePayment}
                                disabled={saving}
                                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50"
                            >
                                {saving ? 'Saving...' : 'Save Payment Summary'}
                            </button>
                            <button
                                onClick={handleLockShift}
                                disabled={saving}
                                className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium disabled:opacity-50"
                            >
                                {saving ? 'Locking...' : 'Lock Shift'}
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Tanker Delivery Modal */}
            {showTankerModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl max-w-md w-full border border-gray-200 max-h-[90vh] overflow-y-auto">
                        <div className="p-6">
                            <div className="flex items-center justify-between mb-4 sticky top-0 bg-white pb-2 border-b border-gray-100">
                                <h3 className="text-xl font-semibold text-gray-900">Add Tanker Delivery</h3>
                                <button
                                    onClick={() => setShowTankerModal(false)}
                                    className="text-gray-400 hover:text-gray-600"
                                >
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                            <form onSubmit={handleAddTankerDelivery} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Fuel Type *</label>
                                    <select
                                        required
                                        value={tankerFormData.fuelType}
                                        onChange={(e) => setTankerFormData({ ...tankerFormData, fuelType: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                                    >
                                        <option value="">Select fuel type</option>
                                        <option value="91_GASOLINE">91 Gasoline</option>
                                        <option value="95_GASOLINE">95 Gasoline</option>
                                        <option value="DIESEL">Diesel</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Liters Delivered *</label>
                                    <input
                                        type="number"
                                        required
                                        step="0.01"
                                        value={tankerFormData.litersDelivered}
                                        onChange={(e) => setTankerFormData({ ...tankerFormData, litersDelivered: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                                        placeholder="Enter liters"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Delivery Date & Time</label>
                                    <input
                                        type="datetime-local"
                                        value={tankerFormData.deliveryDate}
                                        onChange={(e) => setTankerFormData({ ...tankerFormData, deliveryDate: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Aramco Ticket Number</label>
                                    <input
                                        type="text"
                                        value={tankerFormData.aramcoTicket}
                                        onChange={(e) => setTankerFormData({ ...tankerFormData, aramcoTicket: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                                        placeholder="Optional"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Upload Receipt/Ticket Image
                                    </label>
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-3">
                                            <label className="flex-1 cursor-pointer">
                                                <div className="flex items-center justify-center px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg hover:border-primary hover:bg-gray-50 transition-colors">
                                                    <svg className="w-5 h-5 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                    </svg>
                                                    <span className="text-sm text-gray-600">
                                                        {uploadingReceipt ? 'Uploading...' : 'Choose Image'}
                                                    </span>
                                                </div>
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    onChange={handleReceiptUpload}
                                                    disabled={uploadingReceipt}
                                                    className="hidden"
                                                />
                                            </label>
                                        </div>
                                        {tankerFormData.receiptUrl && (
                                            <div className="relative border border-gray-200 rounded-lg p-2 bg-gray-50">
                                                <img
                                                    src={tankerFormData.receiptUrl}
                                                    alt="Receipt preview"
                                                    className="w-full h-32 object-contain rounded"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setTankerFormData({ ...tankerFormData, receiptUrl: '' })}
                                                    className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                    </svg>
                                                </button>
                                            </div>
                                        )}
                                        <p className="text-xs text-gray-500">
                                            Upload a photo of the Aramco ticket or delivery receipt (Max 5MB)
                                        </p>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                                    <textarea
                                        value={tankerFormData.notes}
                                        onChange={(e) => setTankerFormData({ ...tankerFormData, notes: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                                        rows={3}
                                        placeholder="Optional notes"
                                    />
                                </div>
                                <div className="flex gap-3 pt-4">
                                    <button
                                        type="submit"
                                        disabled={submittingTanker}
                                        className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50"
                                    >
                                        {submittingTanker ? 'Adding...' : 'Add Delivery'}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setShowTankerModal(false)}
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

            {/* Shift History Modal */}
            {showShiftHistory && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full border border-gray-200 max-h-[90vh] overflow-y-auto">
                        <div className="p-6">
                            <div className="flex items-center justify-between mb-4 sticky top-0 bg-white pb-2 border-b border-gray-100">
                                <h3 className="text-xl font-semibold text-gray-900">Shift History</h3>
                                <button
                                    onClick={() => setShowShiftHistory(false)}
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
                                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Date</th>
                                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Status</th>
                                            <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Total Revenue</th>
                                            <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {shiftHistory.map((shift) => (
                                            <tr key={shift.id} className="border-b border-gray-100 hover:bg-gray-50">
                                                <td className="px-4 py-3 text-sm text-gray-900">
                                                    {new Date(shift.shiftDate || shift.startTime).toLocaleDateString()}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${shift.status === 'LOCKED' ? 'bg-gray-100 text-gray-800' :
                                                            shift.status === 'SAVED' ? 'bg-blue-100 text-blue-800' :
                                                                'bg-green-100 text-green-800'
                                                        }`}>
                                                        {shift.status}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-sm text-right font-semibold text-gray-900">
                                                    {shift.dailyShiftReadings?.reduce((sum: number, r: any) => sum + (r.totalAmount || 0), 0).toFixed(2)} SAR
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center justify-center gap-2">
                                                        <button
                                                            onClick={() => handlePrintShift(shift)}
                                                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                            title="Print"
                                                        >
                                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                                                            </svg>
                                                        </button>
                                                        <button
                                                            onClick={() => handleExportShiftCSV(shift)}
                                                            className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                                            title="Export CSV"
                                                        >
                                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                            </svg>
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                        {shiftHistory.length === 0 && (
                                            <tr>
                                                <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                                                    No shift history found
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Tanker History Modal */}
            {showTankerHistory && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full border border-gray-200 max-h-[90vh] overflow-y-auto">
                        <div className="p-6">
                            <div className="flex items-center justify-between mb-4 sticky top-0 bg-white pb-2 border-b border-gray-100">
                                <h3 className="text-xl font-semibold text-gray-900">Tanker Delivery History</h3>
                                <button
                                    onClick={() => setShowTankerHistory(false)}
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
                                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Date</th>
                                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Fuel Type</th>
                                            <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Liters</th>
                                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Ticket #</th>
                                            <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {tankerHistory.map((delivery) => (
                                            <tr key={delivery.id} className="border-b border-gray-100 hover:bg-gray-50">
                                                <td className="px-4 py-3 text-sm text-gray-900">
                                                    {new Date(delivery.deliveryDate).toLocaleDateString()}
                                                </td>
                                                <td className="px-4 py-3 text-sm text-gray-900">
                                                    {getFuelTypeLabel(delivery.fuelType)}
                                                </td>
                                                <td className="px-4 py-3 text-sm text-right font-semibold text-gray-900">
                                                    {delivery.litersDelivered}
                                                </td>
                                                <td className="px-4 py-3 text-sm text-gray-600">
                                                    {delivery.aramcoTicket || 'N/A'}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center justify-center gap-2">
                                                        <button
                                                            onClick={() => handlePrintTanker(delivery)}
                                                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                            title="Print"
                                                        >
                                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                                                            </svg>
                                                        </button>
                                                        <button
                                                            onClick={() => handleExportTankerCSV(delivery)}
                                                            className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                                            title="Export CSV"
                                                        >
                                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                            </svg>
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                        {tankerHistory.length === 0 && (
                                            <tr>
                                                <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                                                    No tanker delivery history found
                                                </td>
                                            </tr>
                                        )}
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
