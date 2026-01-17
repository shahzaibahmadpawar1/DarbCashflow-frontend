import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import api from '../services/api';
import { LoadingSpinner } from '../components/shared/LoadingSpinner';
import { AdminInventoryView } from '../components/inventory/AdminInventoryView';
import { StationPurchaseRequests } from '../components/StationPurchaseRequests';

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
    shiftAPhotoUrl?: string;
    shiftBPhotoUrl?: string;
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
    const { user, canManageStation, canViewAllStations } = useAuth();
    const [searchParams] = useSearchParams();
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
    const [viewReceiptUrl, setViewReceiptUrl] = useState<string | null>(null);
    const [showConsumptionReport, setShowConsumptionReport] = useState(false);
    const [showPurchaseRequests, setShowPurchaseRequests] = useState(false);

    const [shiftHistory, setShiftHistory] = useState<any[]>([]);
    const [tankerHistory, setTankerHistory] = useState<any[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [stationStats, setStationStats] = useState<{ totalRevenue: number; totalLiters: number } | null>(null);
    const [stationCredits, setStationCredits] = useState<number>(0);

    // View Shift Modal
    const [showViewShiftModal, setShowViewShiftModal] = useState(false);
    const [viewShiftData, setViewShiftData] = useState<DailyShift | null>(null);

    // Edit Tanker Modal
    const [showEditTankerModal, setShowEditTankerModal] = useState(false);
    const [editTankerData, setEditTankerData] = useState<any | null>(null);
    const [savingTanker, setSavingTanker] = useState(false);

    // Payment summary state
    const [paymentData, setPaymentData] = useState({
        cardAmount: 0,
        cashAmount: 0,
        option3Amount: 0,
        option4Amount: 0,
    });

    // Open shift modal state
    const [showOpenShiftModal, setShowOpenShiftModal] = useState(false);
    const [shiftDateTime, setShiftDateTime] = useState(new Date().toISOString().slice(0, 16));

    // Moved user effect to bottom

    // Moved stationId effect to bottom

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
            await api.post(`/api/inventory/shifts/stations/${stationId}/daily`, {
                shiftDate: new Date(shiftDateTime).toISOString(),
            });
            alert('Daily shift created successfully!');
            setShowOpenShiftModal(false);
            setShiftDateTime(new Date().toISOString().slice(0, 16)); // Reset to current time
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
                shiftAPhotoUrl: r.shiftAPhotoUrl,
                shiftBPhotoUrl: r.shiftBPhotoUrl,
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

    const handleDeleteCurrentShift = async () => {
        if (!currentShift) return;

        const confirmed = window.confirm(
            'Are you sure you want to delete this shift? This action cannot be undone and will delete all associated data.'
        );

        if (!confirmed) return;

        try {
            setSaving(true);
            await api.delete(`/api/inventory/shifts/${currentShift.id}`);
            alert('Shift deleted successfully!');
            loadCurrentShift(stationId); // Reload to show no current shift
        } catch (error: any) {
            alert(error.response?.data?.error || 'Failed to delete shift');
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

    const handleReadingPhotoUpload = async (readingId: string, field: 'shiftAPhotoUrl' | 'shiftBPhotoUrl', e: React.ChangeEvent<HTMLInputElement>) => {
        if (!currentShift?.dailyShiftReadings) return;

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
            // Use same upload endpoint as receipt
            const formData = new FormData();
            formData.append('receipt', file);

            const res = await api.post('/api/upload/receipt', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });

            setCurrentShift({
                ...currentShift,
                dailyShiftReadings: currentShift.dailyShiftReadings.map(r =>
                    r.id === readingId ? { ...r, [field]: res.data.url } : r
                ),
            });
        } catch (error: any) {
            alert(error.response?.data?.error || 'Failed to upload photo');
        }
    };

    const handleViewShift = (shift: any) => {
        setViewShiftData(shift);
        setShowViewShiftModal(true);
    };

    const handleEditTanker = (delivery: any) => {
        setEditTankerData({
            ...delivery,
            deliveryDate: new Date(delivery.deliveryDate).toISOString().split('T')[0],
        });
        setShowEditTankerModal(true);
    };

    const handleSaveEditedTanker = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editTankerData) return;

        try {
            setSavingTanker(true);
            await api.put(`/api/inventory/tanker-deliveries/${editTankerData.id}`, {
                litersDelivered: editTankerData.litersDelivered,
                deliveryDate: editTankerData.deliveryDate,
                aramcoTicket: editTankerData.aramcoTicket,
                notes: editTankerData.notes,
                receiptUrl: editTankerData.receiptUrl
            });

            await loadTankerHistory();
            setShowEditTankerModal(false);
            setEditTankerData(null);
            alert('Delivery updated successfully');
        } catch (error: any) {
            alert(error.response?.data?.error || 'Failed to update delivery');
        } finally {
            setSavingTanker(false);
        }
    };

    const handleToggleTankerLock = async (delivery: any) => {
        if (!user || user.role !== 'Admin') return;

        // Confirm action
        if (!window.confirm(`Are you sure you want to ${delivery.isUnlocked ? 'lock' : 'unlock'} this delivery for editing?`)) {
            return;
        }

        try {
            await api.put(`/api/inventory/tanker-deliveries/${delivery.id}/lock`, {
                isUnlocked: !delivery.isUnlocked
            });
            await loadTankerHistory();
        } catch (error: any) {
            alert(error.response?.data?.error || 'Failed to update lock status');
        }
    };

    const handleEditReceiptUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            alert('Please upload an image file');
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            alert('File size must be less than 5MB');
            return;
        }

        try {
            const formData = new FormData();
            formData.append('receipt', file);

            const res = await api.post('/api/upload/receipt', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });

            setEditTankerData({ ...editTankerData, receiptUrl: res.data.url });
        } catch (error: any) {
            alert(error.response?.data?.error || 'Failed to upload receipt');
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
            // Use station-specific endpoint to get only this station's deliveries
            const res = await api.get(`/api/inventory/stations/${stationId}/deliveries`);
            setTankerHistory(res.data.deliveries || []);
            setShowTankerHistory(true);
        } catch (error: any) {
            alert(error.response?.data?.error || 'Failed to load tanker history');
        } finally {
            setLoadingHistory(false);
        }
    };

    const loadStationStats = async (sId: string) => {
        try {
            const res = await api.get(`/api/inventory/stations/${sId}/stats`);
            setStationStats(res.data.stats);
        } catch (error) {
            console.error('Failed to load station stats', error);
        }
    };

    const handleUnlockShift = async (shiftId: string) => {
        const confirmed = window.confirm(
            'Are you sure you want to unlock this shift? The station manager will be able to edit it again.'
        );

        if (!confirmed) return;

        try {
            setSaving(true);
            await api.post(`/api/inventory/shifts/${shiftId}/unlock`);
            alert('Shift unlocked successfully!');
            loadShiftHistory(); // Reload history
        } catch (error: any) {
            alert(error.response?.data?.error || 'Failed to unlock shift');
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteShift = async (shiftId: string) => {
        const confirmed = window.confirm(
            'Are you sure you want to delete this shift? This action cannot be undone and will delete all associated data.'
        );

        if (!confirmed) return;

        try {
            setSaving(true);
            await api.delete(`/api/inventory/shifts/${shiftId}`);
            alert('Shift deleted successfully!');
            loadShiftHistory(); // Reload history
            // If the deleted shift was the current shift, reload current shift
            if (currentShift?.id === shiftId) {
                loadCurrentShift(stationId);
            }
        } catch (error: any) {
            alert(error.response?.data?.error || 'Failed to delete shift');
        } finally {
            setSaving(false);
        }
    };



    const handlePrintShift = (shift: any) => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        const shiftDate = new Date(shift.shiftDate || shift.startTime).toLocaleDateString();
        const shiftTime = new Date(shift.startTime).toLocaleTimeString();
        const endTime = shift.endTime ? new Date(shift.endTime).toLocaleTimeString() : 'N/A';
        const lockedTime = shift.lockedAt ? new Date(shift.lockedAt).toLocaleTimeString() : 'N/A';

        const totalRevenue = shift.dailyShiftReadings?.reduce((sum: number, r: any) => sum + (r.totalAmount || 0), 0) || 0;
        const paymentSum = shift.paymentSummary || {};
        const totalCollected = (paymentSum.cardAmount || 0) + (paymentSum.cashAmount || 0) + (paymentSum.option3Amount || 0) + (paymentSum.option4Amount || 0);

        printWindow.document.write(`
            <html>
                <head>
                    <title>Shift Report - ${shiftDate}</title>
                    <style>
                        body { font-family: Arial, sans-serif; padding: 20px; }
                        h1 { color: #333; border-bottom: 2px solid #007bff; padding-bottom: 10px; }
                        h2 { color: #555; margin-top: 20px; }
                        .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin: 20px 0; }
                        .info-item { padding: 8px; background: #f5f5f5; border-radius: 4px; }
                        .info-label { font-weight: bold; color: #666; }
                        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
                        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                        th { background-color: #007bff; color: white; }
                        tr:nth-child(even) { background-color: #f9f9f9; }
                        .status { padding: 4px 8px; border-radius: 4px; font-weight: bold; }
                        .status-open { background: #d4edda; color: #155724; }
                        .status-saved { background: #d1ecf1; color: #0c5460; }
                        .status-locked { background: #d6d8db; color: #383d41; }
                        .payment-summary { background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0; }
                        .total { font-size: 18px; font-weight: bold; color: #007bff; }
                        @media print { button { display: none; } }
                    </style>
                </head>
                <body>
                    <h1>Daily Shift Report</h1>
                    
                    <div class="info-grid">
                        <div class="info-item"><span class="info-label">Date:</span> ${shiftDate}</div>
                        <div class="info-item"><span class="info-label">Status:</span> <span class="status status-${shift.status.toLowerCase()}">${shift.status}</span></div>
                        <div class="info-item"><span class="info-label">Start Time:</span> ${shiftTime}</div>
                        <div class="info-item"><span class="info-label">End Time:</span> ${endTime}</div>
                        <div class="info-item"><span class="info-label">Locked At:</span> ${lockedTime}</div>
                        <div class="info-item"><span class="info-label">Shift ID:</span> ${shift.id}</div>
                    </div>

                    <h2>Nozzle Readings</h2>
                    <table>
                        <thead>
                            <tr><th>Nozzle</th><th>Fuel Type</th><th>Price/L</th><th>Opening</th><th>Shift A</th><th>Shift B</th><th>A Liters</th><th>B Liters</th><th>A Amount</th><th>B Amount</th><th>Total</th></tr>
                        </thead>
                        <tbody>
                            ${shift.dailyShiftReadings?.map((r: any) => `
                                <tr>
                                    <td>${r.nozzle?.name || 'N/A'}</td>
                                    <td>${getFuelTypeLabel(r.nozzle?.fuelType || '')}</td>
                                    <td>${r.pricePerLiter.toFixed(2)}</td>
                                    <td>${r.openingReading.toFixed(2)}</td>
                                    <td>${r.shiftAReading?.toFixed(2) || 'N/A'}</td>
                                    <td>${r.shiftBReading?.toFixed(2) || 'N/A'}</td>
                                    <td>${r.shiftALiters.toFixed(2)}</td>
                                    <td>${r.shiftBLiters.toFixed(2)}</td>
                                    <td>${r.shiftAAmount.toFixed(2)}</td>
                                    <td>${r.shiftBAmount.toFixed(2)}</td>
                                    <td><strong>${r.totalAmount.toFixed(2)}</strong></td>
                                </tr>
                            `).join('') || '<tr><td colspan="11">No readings available</td></tr>'}
                        </tbody>
                    </table>

                    <h2>Payment Summary</h2>
                    <div class="payment-summary">
                        <table>
                            <tr><td><strong>Total Revenue (All Nozzles):</strong></td><td class="total">${totalRevenue.toFixed(2)} SAR</td></tr>
                            <tr><td>Card Amount:</td><td>${(paymentSum.cardAmount || 0).toFixed(2)} SAR</td></tr>
                            <tr><td>Cash Amount:</td><td>${(paymentSum.cashAmount || 0).toFixed(2)} SAR</td></tr>
                            <tr><td>Option 3:</td><td>${(paymentSum.option3Amount || 0).toFixed(2)} SAR</td></tr>
                            <tr><td>Option 4:</td><td>${(paymentSum.option4Amount || 0).toFixed(2)} SAR</td></tr>
                            <tr><td><strong>Total Collected:</strong></td><td><strong>${totalCollected.toFixed(2)} SAR</strong></td></tr>
                            <tr><td><strong>Difference:</strong></td><td><strong>${(totalRevenue - totalCollected).toFixed(2)} SAR</strong></td></tr>
                        </table>
                    </div>

                    <button onclick="window.print()" style="margin-top: 20px; padding: 10px 20px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">Print</button>
                </body>
            </html>
        `);
        printWindow.document.close();
    };

    const handleExportShiftCSV = (shift: any) => {
        const shiftDate = new Date(shift.shiftDate || shift.startTime).toLocaleDateString();
        const shiftTime = new Date(shift.startTime).toLocaleTimeString();
        const endTime = shift.endTime ? new Date(shift.endTime).toLocaleTimeString() : 'N/A';
        const lockedTime = shift.lockedAt ? new Date(shift.lockedAt).toLocaleTimeString() : 'N/A';

        const totalRevenue = shift.dailyShiftReadings?.reduce((sum: number, r: any) => sum + (r.totalAmount || 0), 0) || 0;
        const paymentSum = shift.paymentSummary || {};
        const totalCollected = (paymentSum.cardAmount || 0) + (paymentSum.cashAmount || 0) + (paymentSum.option3Amount || 0) + (paymentSum.option4Amount || 0);

        let csv = 'Daily Shift Report\n\n';
        csv += 'Shift Information\n';
        csv += `Date,${shiftDate}\n`;
        csv += `Status,${shift.status}\n`;
        csv += `Start Time,${shiftTime}\n`;
        csv += `End Time,${endTime}\n`;
        csv += `Locked At,${lockedTime}\n`;
        csv += `Shift ID,${shift.id}\n\n`;

        csv += 'Nozzle Readings\n';
        csv += 'Nozzle,Fuel Type,Price/L,Opening,Shift A,Shift B,A Liters,B Liters,A Amount,B Amount,Total\n';

        shift.dailyShiftReadings?.forEach((r: any) => {
            csv += `${r.nozzle?.name || 'N/A'},${getFuelTypeLabel(r.nozzle?.fuelType || '')},${r.pricePerLiter.toFixed(2)},${r.openingReading.toFixed(2)},${r.shiftAReading?.toFixed(2) || 'N/A'},${r.shiftBReading?.toFixed(2) || 'N/A'},${r.shiftALiters.toFixed(2)},${r.shiftBLiters.toFixed(2)},${r.shiftAAmount.toFixed(2)},${r.shiftBAmount.toFixed(2)},${r.totalAmount.toFixed(2)}\n`;
        });

        csv += '\nPayment Summary\n';
        csv += `Total Revenue (All Nozzles),${totalRevenue.toFixed(2)} SAR\n`;
        csv += `Card Amount,${(paymentSum.cardAmount || 0).toFixed(2)} SAR\n`;
        csv += `Cash Amount,${(paymentSum.cashAmount || 0).toFixed(2)} SAR\n`;
        csv += `Option 3,${(paymentSum.option3Amount || 0).toFixed(2)} SAR\n`;
        csv += `Option 4,${(paymentSum.option4Amount || 0).toFixed(2)} SAR\n`;
        csv += `Total Collected,${totalCollected.toFixed(2)} SAR\n`;
        csv += `Difference,${(totalRevenue - totalCollected).toFixed(2)} SAR\n`;

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `shift-report-${shiftDate.replace(/\//g, '-')}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
    };

    const handlePrintTanker = (delivery: any) => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        const deliveryDate = new Date(delivery.deliveryDate).toLocaleDateString();
        const deliveryTime = new Date(delivery.deliveryDate).toLocaleTimeString();

        // Get station name from the current station or delivery data
        const stationName = delivery.tank?.station?.name || delivery.station?.name || 'N/A';

        printWindow.document.write(`
            <html>
                <head>
                    <title>Tanker Delivery - ${deliveryDate}</title>
                    <style>
                        body { font-family: Arial, sans-serif; padding: 20px; }
                        h1 { color: #333; border-bottom: 2px solid #28a745; padding-bottom: 10px; }
                        .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin: 20px 0; }
                        .info-item { padding: 8px; background: #f5f5f5; border-radius: 4px; }
                        .info-label { font-weight: bold; color: #666; }
                        .receipt-img { max-width: 400px; margin: 20px 0; border: 1px solid #ddd; border-radius: 4px; }
                        .notes { background: #fff3cd; padding: 10px; border-radius: 4px; margin: 20px 0; }
                        @media print { button { display: none; } }
                    </style>
                </head>
                <body>
                    <h1>Tanker Delivery Report</h1>
                    
                    <div class="info-grid">
                        <div class="info-item"><span class="info-label">Station:</span> ${stationName}</div>
                        <div class="info-item"><span class="info-label">Fuel Type:</span> ${getFuelTypeLabel(delivery.fuelType || delivery.tank?.fuelType)}</div>
                        <div class="info-item"><span class="info-label">Liters Delivered:</span> ${delivery.litersDelivered}</div>
                        <div class="info-item"><span class="info-label">Delivery Date:</span> ${deliveryDate}</div>
                        <div class="info-item"><span class="info-label">Delivery Time:</span> ${deliveryTime}</div>
                        <div class="info-item"><span class="info-label">Aramco Ticket #:</span> ${delivery.aramcoTicket || 'N/A'}</div>
                        <div class="info-item"><span class="info-label">Delivery ID:</span> ${delivery.id}</div>
                    </div>

                    ${delivery.notes ? `
                        <div class="notes">
                            <strong>Notes:</strong><br/>
                            ${delivery.notes}
                        </div>
                    ` : ''}

                    ${delivery.receiptUrl ? `
                        <h2>Receipt Image</h2>
                        <img src="${delivery.receiptUrl}" class="receipt-img" alt="Delivery Receipt" />
                    ` : ''}

                    <button onclick="window.print()" style="margin-top: 20px; padding: 10px 20px; background: #28a745; color: white; border: none; border-radius: 4px; cursor: pointer;">Print</button>
                </body>
            </html>
        `);
        printWindow.document.close();
    };

    const handleExportTankerCSV = (delivery: any) => {
        const deliveryDate = new Date(delivery.deliveryDate).toLocaleDateString();
        const deliveryTime = new Date(delivery.deliveryDate).toLocaleTimeString();

        let csv = 'Tanker Delivery Report\n\n';
        csv += 'Delivery Information\n';
        csv += `Fuel Type,${getFuelTypeLabel(delivery.fuelType || delivery.tank?.fuelType)}\n`;
        csv += `Liters Delivered,${delivery.litersDelivered}\n`;
        csv += `Delivery Date,${deliveryDate}\n`;
        csv += `Delivery Time,${deliveryTime}\n`;
        csv += `Aramco Ticket Number,${delivery.aramcoTicket || 'N/A'}\n`;
        csv += `Delivery ID,${delivery.id}\n`;
        csv += `Notes,${delivery.notes || 'N/A'}\n`;
        csv += `Receipt URL,${delivery.receiptUrl || 'N/A'}\n`;

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `tanker-delivery-${deliveryDate.replace(/\//g, '-')}.csv`;
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

    useEffect(() => {
        const queryStationId = searchParams.get('stationId');
        if (queryStationId) {
            setStationId(queryStationId);
            loadCurrentShift(queryStationId);
        } else if (user?.stationId) {
            setStationId(user.stationId);
            loadCurrentShift(user.stationId);
        } else {
            setLoading(false);
        }
    }, [user, searchParams]);

    useEffect(() => {
        console.log('StationId effect triggered', stationId);
        if (stationId) {
            loadStationStats(stationId);
            api.get(`/api/stations/${stationId}`).then(res => {
                setStationCredits(res.data.station?.purchaseCredits || 0);
            }).catch(err => {
                console.error('Failed to load station credits:', err);
            });
        } else {
            setStationStats(null);
            setStationCredits(0);
        }
    }, [stationId]);

    if (loading) {
        return <LoadingSpinner />;
    }

    if (!stationId) {
        if (canViewAllStations) {
            return (
                <div className="p-6">
                    <AdminInventoryView onSelectStation={(id) => {
                        setStationId(id);
                        loadCurrentShift(id);
                    }} />
                </div>
            );
        }

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
                        {canViewAllStations && (
                            <button
                                onClick={() => setStationId('')}
                                className="text-sm text-gray-500 hover:text-gray-700 mb-2 flex items-center gap-1"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                                </svg>
                                Back to Stations
                            </button>
                        )}
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
                        <button
                            onClick={() => {
                                if (shiftHistory.length === 0) loadShiftHistory();
                                setShowConsumptionReport(true);
                            }}
                            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                            </svg>
                            Consumption Report
                        </button>
                        {canManageStation && (
                            <button
                                onClick={() => setShowPurchaseRequests(!showPurchaseRequests)}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors font-medium ${showPurchaseRequests
                                    ? 'bg-yellow-600 text-white hover:bg-yellow-700'
                                    : 'bg-yellow-600 text-white hover:bg-yellow-700'
                                    }`}
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                Purchase Requests
                            </button>
                        )}
                        {!currentShift && canManageStation && (
                            <button
                                onClick={() => setShowOpenShiftModal(true)}
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

            {/* Station Summary Stats */}
            {stationStats && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-semibold text-gray-900">Total Station Inventory</h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="p-4 bg-green-50 rounded-lg border border-green-100 flex justify-between items-center">
                            <div>
                                <p className="text-sm text-gray-600 mb-1">Total Sales (Revenue)</p>
                                <p className="text-2xl font-bold text-green-700">{stationStats.totalRevenue?.toFixed(2) || '0.00'} SAR</p>
                            </div>
                            <div className="p-3 bg-green-100 rounded-full text-green-600">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                        </div>
                        <div className="p-4 bg-blue-50 rounded-lg border border-blue-100 flex justify-between items-center">
                            <div>
                                <p className="text-sm text-gray-600 mb-1">Total Volume Dispensed</p>
                                <p className="text-2xl font-bold text-blue-700">{stationStats.totalLiters?.toFixed(2) || '0.00'} L</p>
                            </div>
                            <div className="p-3 bg-blue-100 rounded-full text-blue-600">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                                </svg>
                            </div>
                        </div>
                        <div className="p-4 bg-purple-50 rounded-lg border border-purple-100 flex justify-between items-center">
                            <div>
                                <p className="text-sm text-gray-600 mb-1">Purchase Credits</p>
                                <p className="text-2xl font-bold text-purple-700">{stationCredits.toLocaleString()} SAR</p>
                            </div>
                            <div className="p-3 bg-purple-100 rounded-full text-purple-600">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                        </div>
                    </div>
                </div>
            )}

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
                                {currentShift.dailyShiftReadings?.map((reading) => {
                                    const isShiftAInvalid = reading.shiftAReading !== null && reading.shiftAReading < reading.openingReading;
                                    const previousForB = reading.shiftAReading || reading.openingReading;
                                    const isShiftBInvalid = reading.shiftBReading !== null && reading.shiftBReading < previousForB;

                                    return (
                                        <tr key={reading.id} className="border-b border-gray-100 hover:bg-gray-50">
                                            <td className="px-4 py-3 text-sm font-medium text-gray-900">{reading.nozzle.name}</td>
                                            <td className="px-4 py-3 text-sm text-gray-600">{getFuelTypeLabel(reading.nozzle.fuelType)}</td>
                                            <td className="px-4 py-3 text-sm text-right text-gray-900">{reading.pricePerLiter.toFixed(2)}</td>
                                            <td className="px-4 py-3 text-sm text-right text-gray-600">{reading.openingReading.toFixed(2)}</td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center justify-end gap-2">
                                                    <label className={`cursor-pointer text-gray-400 hover:text-primary ${reading.shiftAPhotoUrl ? 'text-green-500' : ''}`}>
                                                        <input
                                                            type="file"
                                                            className="hidden"
                                                            accept="image/*"
                                                            onChange={(e) => handleReadingPhotoUpload(reading.id, 'shiftAPhotoUrl', e)}
                                                            disabled={currentShift.locked}
                                                        />
                                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                                                        </svg>
                                                    </label>
                                                    <input
                                                        type="number"
                                                        value={reading.shiftAReading || ''}
                                                        onChange={(e) => handleReadingChange(reading.id, 'shiftAReading', e.target.value)}
                                                        disabled={currentShift.locked}
                                                        className={`w-24 px-2 py-1 text-sm text-right border rounded focus:ring-2 focus:ring-primary focus:border-transparent disabled:bg-gray-100 ${isShiftAInvalid ? 'border-red-500 bg-red-50 text-red-900' : 'border-gray-300'}`}
                                                        step="0.01"
                                                    />
                                                </div>
                                                {isShiftAInvalid && <div className="text-xs text-red-600 text-right mt-1">Below Opening</div>}
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center justify-end gap-2">
                                                    <label className={`cursor-pointer text-gray-400 hover:text-primary ${reading.shiftBPhotoUrl ? 'text-green-500' : ''}`}>
                                                        <input
                                                            type="file"
                                                            className="hidden"
                                                            accept="image/*"
                                                            onChange={(e) => handleReadingPhotoUpload(reading.id, 'shiftBPhotoUrl', e)}
                                                            disabled={currentShift.locked}
                                                        />
                                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                                                        </svg>
                                                    </label>
                                                    <input
                                                        type="number"
                                                        value={reading.shiftBReading || ''}
                                                        onChange={(e) => handleReadingChange(reading.id, 'shiftBReading', e.target.value)}
                                                        disabled={currentShift.locked}
                                                        className={`w-24 px-2 py-1 text-sm text-right border rounded focus:ring-2 focus:ring-primary focus:border-transparent disabled:bg-gray-100 ${isShiftBInvalid ? 'border-red-500 bg-red-50 text-red-900' : 'border-gray-300'}`}
                                                        step="0.01"
                                                    />
                                                </div>
                                                {isShiftBInvalid && <div className="text-xs text-red-600 text-right mt-1">Below Previous</div>}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-right text-gray-900">{reading.shiftALiters.toFixed(2)}</td>
                                            <td className="px-4 py-3 text-sm text-right text-gray-900">{reading.shiftBLiters.toFixed(2)}</td>
                                            <td className="px-4 py-3 text-sm text-right text-gray-900">{reading.shiftAAmount.toFixed(2)}</td>
                                            <td className="px-4 py-3 text-sm text-right text-gray-900">{reading.shiftBAmount.toFixed(2)}</td>
                                            <td className="px-4 py-3 text-sm text-right font-semibold text-primary">{reading.totalAmount.toFixed(2)}</td>
                                        </tr>
                                    );
                                })}
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
                                value={paymentData.cardAmount || ''}
                                onChange={(e) => handlePaymentChange('cardAmount', e.target.value)}
                                disabled={currentShift.locked}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent disabled:bg-gray-100"
                                step="0.01"
                                min="0"
                                placeholder="0.00"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Cash Amount (SAR)</label>
                            <input
                                type="number"
                                value={paymentData.cashAmount || ''}
                                onChange={(e) => handlePaymentChange('cashAmount', e.target.value)}
                                disabled={currentShift.locked}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent disabled:bg-gray-100"
                                step="0.01"
                                min="0"
                                placeholder="0.00"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Option 3 (SAR)</label>
                            <input
                                type="number"
                                value={paymentData.option3Amount || ''}
                                onChange={(e) => handlePaymentChange('option3Amount', e.target.value)}
                                disabled={currentShift.locked}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent disabled:bg-gray-100"
                                step="0.01"
                                min="0"
                                placeholder="0.00"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Option 4 (SAR)</label>
                            <input
                                type="number"
                                value={paymentData.option4Amount || ''}
                                onChange={(e) => handlePaymentChange('option4Amount', e.target.value)}
                                disabled={currentShift.locked}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent disabled:bg-gray-100"
                                step="0.01"
                                min="0"
                                placeholder="0.00"
                            />
                        </div>

                        <div className="border-2 border-gray-300 rounded-lg p-4 bg-gray-50">
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Difference</label>
                            <p className={`text-2xl font-bold ${calculateDifference() >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {calculateDifference().toFixed(2)} SAR
                            </p>
                        </div>
                    </div>

                    <div className="flex gap-3 flex-wrap mt-6">
                        {!currentShift.locked && canManageStation && (
                            <>
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
                                <button
                                    onClick={handleDeleteCurrentShift}
                                    disabled={saving}
                                    className="px-6 py-2 bg-red-700 text-white rounded-lg hover:bg-red-800 transition-colors font-medium disabled:opacity-50 border-2 border-red-800"
                                >
                                    {saving ? 'Deleting...' : 'Delete Shift'}
                                </button>
                            </>
                        )}
                        <button
                            onClick={() => handlePrintShift(currentShift)}
                            className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium"
                        >
                            Print Shift
                        </button>
                    </div>
                </div>
            )}

            {/* Purchase Requests Section */}
            {canManageStation && showPurchaseRequests && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <StationPurchaseRequests
                        stationId={stationId}
                        stationName="Your Station"
                    />
                </div>
            )}

            {/* Open Shift Modal */}
            {showOpenShiftModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl max-w-md w-full border border-gray-200">
                        <div className="p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-xl font-semibold text-gray-900">Open New Shift</h3>
                                <button
                                    onClick={() => setShowOpenShiftModal(false)}
                                    className="text-gray-400 hover:text-gray-600"
                                >
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Shift Date and Time *
                                    </label>
                                    <input
                                        type="datetime-local"
                                        value={shiftDateTime}
                                        onChange={(e) => setShiftDateTime(e.target.value)}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                                        required
                                    />
                                    <p className="text-sm text-gray-500 mt-1">
                                        Select the date and time for this shift
                                    </p>
                                </div>

                                <div className="flex gap-3 pt-4">
                                    <button
                                        onClick={handleOpenShift}
                                        disabled={saving}
                                        className="flex-1 px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-medium disabled:opacity-50"
                                    >
                                        {saving ? 'Opening...' : 'Open Shift'}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setShowOpenShiftModal(false)}
                                        disabled={saving}
                                        className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium disabled:opacity-50"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
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
                                                            onClick={() => handleViewShift(shift)}
                                                            className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                                            title="View Details"
                                                        >
                                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                            </svg>
                                                        </button>
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
                                                        {/* Unlock button - Admin only, for locked shifts */}
                                                        {user?.role === 'Admin' && shift.locked && (
                                                            <button
                                                                onClick={() => handleUnlockShift(shift.id)}
                                                                disabled={saving}
                                                                className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors disabled:opacity-50"
                                                                title="Unlock Shift"
                                                            >
                                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                                                                </svg>
                                                            </button>
                                                        )}
                                                        {/* Delete button - Admin can delete any shift, SM can delete unlocked shifts */}
                                                        {(user?.role === 'Admin' || (user?.role === 'SM' && !shift.locked)) && (
                                                            <button
                                                                onClick={() => handleDeleteShift(shift.id)}
                                                                disabled={saving}
                                                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                                                                title="Delete Shift"
                                                            >
                                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                                </svg>
                                                            </button>
                                                        )}
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

            {/* View Shift Details Modal */}
            {showViewShiftModal && viewShiftData && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl max-w-5xl w-full border border-gray-200 max-h-[90vh] overflow-y-auto">
                        <div className="p-6">
                            <div className="flex items-center justify-between mb-4 sticky top-0 bg-white pb-2 border-b border-gray-100">
                                <div>
                                    <h3 className="text-xl font-semibold text-gray-900">Shift Details</h3>
                                    <p className="text-sm text-gray-500">
                                        {new Date(viewShiftData.shiftDate).toLocaleDateString()} - {viewShiftData.status}
                                    </p>
                                </div>
                                <button
                                    onClick={() => setShowViewShiftModal(false)}
                                    className="text-gray-400 hover:text-gray-600"
                                >
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>

                            <div className="space-y-6">
                                {/* Readings Table */}
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead>
                                            <tr className="bg-gray-50 border-b border-gray-200">
                                                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Nozzle</th>
                                                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Info</th>
                                                <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Shift A</th>
                                                <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Shift B</th>
                                                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Total</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {viewShiftData.dailyShiftReadings?.map((reading) => (
                                                <tr key={reading.id} className="border-b border-gray-100">
                                                    <td className="px-4 py-3">
                                                        <div className="font-medium text-gray-900">{reading.nozzle.name}</div>
                                                        <div className="text-sm text-gray-500">{getFuelTypeLabel(reading.nozzle.fuelType)}</div>
                                                    </td>
                                                    <td className="px-4 py-3 text-right text-sm">
                                                        <div className="text-gray-600">Price: {reading.pricePerLiter.toFixed(2)}</div>
                                                        <div className="text-gray-600">Open: {reading.openingReading.toFixed(2)}</div>
                                                    </td>
                                                    <td className="px-4 py-3 text-center">
                                                        <div className="text-gray-900 font-medium">{reading.shiftAReading?.toFixed(2) || '-'}</div>
                                                        <div className="text-xs text-gray-500">{reading.shiftALiters.toFixed(2)} L</div>
                                                        <div className="text-xs text-gray-500">{reading.shiftAAmount.toFixed(2)} SAR</div>
                                                        {reading.shiftAPhotoUrl && (
                                                            <button
                                                                onClick={() => setViewReceiptUrl(reading.shiftAPhotoUrl || null)}
                                                                className="mt-1 text-xs text-blue-600 hover:underline flex items-center justify-center gap-1 mx-auto"
                                                            >
                                                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                                </svg>
                                                                View Photo
                                                            </button>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3 text-center">
                                                        <div className="text-gray-900 font-medium">{reading.shiftBReading?.toFixed(2) || '-'}</div>
                                                        <div className="text-xs text-gray-500">{reading.shiftBLiters.toFixed(2)} L</div>
                                                        <div className="text-xs text-gray-500">{reading.shiftBAmount.toFixed(2)} SAR</div>
                                                        {reading.shiftBPhotoUrl && (
                                                            <button
                                                                onClick={() => setViewReceiptUrl(reading.shiftBPhotoUrl || null)}
                                                                className="mt-1 text-xs text-blue-600 hover:underline flex items-center justify-center gap-1 mx-auto"
                                                            >
                                                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                                </svg>
                                                                View Photo
                                                            </button>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3 text-right">
                                                        <div className="text-primary font-bold">{reading.totalAmount.toFixed(2)} SAR</div>
                                                        <div className="text-xs text-gray-500">{(reading.shiftALiters + reading.shiftBLiters).toFixed(2)} L</div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                <div className="flex justify-end pt-4 border-t border-gray-100">
                                    <button
                                        onClick={() => setShowViewShiftModal(false)}
                                        className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                                    >
                                        Close
                                    </button>
                                </div>
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
                                                    {getFuelTypeLabel(delivery.tank?.fuelType || delivery.fuelType)}
                                                </td>
                                                <td className="px-4 py-3 text-sm text-right font-semibold text-gray-900">
                                                    {delivery.litersDelivered}
                                                </td>
                                                <td className="px-4 py-3 text-sm text-gray-600">
                                                    {delivery.aramcoTicket || 'N/A'}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center justify-center gap-2">
                                                        {delivery.receiptUrl && (
                                                            <button
                                                                onClick={() => setViewReceiptUrl(delivery.receiptUrl)}
                                                                className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                                                                title="View Receipt"
                                                            >
                                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                                </svg>
                                                            </button>
                                                        )}

                                                        {/* Edit Button */}
                                                        {(user?.role === 'Admin' || (user?.role === 'SM' && delivery.isUnlocked)) && (
                                                            <button
                                                                onClick={() => handleEditTanker(delivery)}
                                                                className="p-2 text-yellow-600 hover:bg-yellow-50 rounded-lg transition-colors"
                                                                title="Edit"
                                                            >
                                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                                </svg>
                                                            </button>
                                                        )}

                                                        {/* Admin Unlock/Lock Button */}
                                                        {user?.role === 'Admin' && (
                                                            <button
                                                                onClick={() => handleToggleTankerLock(delivery)}
                                                                className={`p-2 rounded-lg transition-colors ${delivery.isUnlocked ? 'text-green-600 hover:bg-green-50' : 'text-gray-400 hover:bg-gray-50'}`}
                                                                title={delivery.isUnlocked ? 'Click to Lock' : 'Click to Unlock for SM'}
                                                            >
                                                                {delivery.isUnlocked ? (
                                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                                                                    </svg>
                                                                ) : (
                                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                                                    </svg>
                                                                )}
                                                            </button>
                                                        )}

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

            {/* Edit Tanker Modal */}
            {showEditTankerModal && editTankerData && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[55] p-4">
                    <div className="bg-white rounded-xl shadow-xl max-w-lg w-full border border-gray-200">
                        <div className="p-6">
                            <h3 className="text-xl font-semibold text-gray-900 mb-6">Edit Tanker Delivery</h3>
                            <form onSubmit={handleSaveEditedTanker} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                                    <input
                                        type="date"
                                        required
                                        value={editTankerData.deliveryDate}
                                        onChange={(e) => setEditTankerData({ ...editTankerData, deliveryDate: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Liters Delivered</label>
                                    <input
                                        type="number"
                                        required
                                        step="0.01"
                                        value={editTankerData.litersDelivered}
                                        onChange={(e) => setEditTankerData({ ...editTankerData, litersDelivered: parseFloat(e.target.value) })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Aramco Ticket #</label>
                                    <input
                                        type="text"
                                        value={editTankerData.aramcoTicket || ''}
                                        onChange={(e) => setEditTankerData({ ...editTankerData, aramcoTicket: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                                    <textarea
                                        value={editTankerData.notes || ''}
                                        onChange={(e) => setEditTankerData({ ...editTankerData, notes: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                                        rows={3}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Receipt</label>
                                    <div className="flex items-center gap-4">
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={handleEditReceiptUpload}
                                            className="w-full text-sm text-gray-500
                                                file:mr-4 file:py-2 file:px-4
                                                file:rounded-full file:border-0
                                                file:text-sm file:font-semibold
                                                file:bg-primary file:text-white
                                                hover:file:bg-primary/90"
                                        />
                                        {editTankerData.receiptUrl && (
                                            <button
                                                type="button"
                                                onClick={() => setViewReceiptUrl(editTankerData.receiptUrl)}
                                                className="text-primary hover:text-primary/80 text-sm font-medium"
                                            >
                                                View Current
                                            </button>
                                        )}
                                    </div>
                                </div>

                                <div className="flex justify-end gap-3 mt-6">
                                    <button
                                        type="button"
                                        onClick={() => setShowEditTankerModal(false)}
                                        className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={savingTanker}
                                        className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
                                    >
                                        {savingTanker ? 'Saving...' : 'Save Changes'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Receipt Viewer Modal */}
            {viewReceiptUrl && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[60] p-4" onClick={() => setViewReceiptUrl(null)}>
                    <div className="relative max-w-4xl max-h-[90vh]">
                        <button
                            onClick={() => setViewReceiptUrl(null)}
                            className="absolute -top-10 right-0 text-white hover:text-gray-300"
                        >
                            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                        <img
                            src={viewReceiptUrl}
                            alt="Receipt"
                            className="max-w-full max-h-[90vh] rounded-lg shadow-2xl"
                            onClick={(e) => e.stopPropagation()}
                        />
                    </div>
                </div>
            )}

            {/* Consumption Report Modal */}
            {showConsumptionReport && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full border border-gray-200 max-h-[90vh] overflow-y-auto">
                        <div className="p-6">
                            <div className="flex items-center justify-between mb-6 sticky top-0 bg-white pb-2 border-b border-gray-100">
                                <h3 className="text-xl font-semibold text-gray-900">Consumption Report</h3>
                                <button
                                    onClick={() => setShowConsumptionReport(false)}
                                    className="text-gray-400 hover:text-gray-600"
                                >
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>

                            <div className="space-y-8">
                                {/* Current Tank Levels */}
                                <div>
                                    <h4 className="text-lg font-medium text-gray-900 mb-4">Current Tank Levels</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {tanks.map(tank => (
                                            <div key={tank.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                                                <div className="flex justify-between items-start mb-2">
                                                    <div>
                                                        <h5 className="font-semibold text-gray-900">{getFuelTypeLabel(tank.fuelType)}</h5>
                                                        <span className="text-sm text-gray-500">Capacity: {tank.capacity.toLocaleString()}L</span>
                                                    </div>
                                                    <div className={`p-2 rounded-full ${(tank.currentLevel / tank.capacity) < 0.2 ? 'bg-red-100 text-red-600' :
                                                        (tank.currentLevel / tank.capacity) < 0.5 ? 'bg-yellow-100 text-yellow-600' :
                                                            'bg-green-100 text-green-600'
                                                        }`}>
                                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                                                        </svg>
                                                    </div>
                                                </div>
                                                <div className="mt-2">
                                                    <div className="flex justify-between text-sm mb-1">
                                                        <span className="font-medium text-gray-700">{tank.currentLevel.toLocaleString()} L</span>
                                                        <span className="text-gray-500">{Math.round((tank.currentLevel / tank.capacity) * 100)}%</span>
                                                    </div>
                                                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                                                        <div
                                                            className={`h-2.5 rounded-full ${(tank.currentLevel / tank.capacity) < 0.2 ? 'bg-red-600' :
                                                                (tank.currentLevel / tank.capacity) < 0.5 ? 'bg-yellow-500' :
                                                                    'bg-green-600'
                                                                }`}
                                                            style={{ width: `${Math.min(100, Math.max(0, (tank.currentLevel / tank.capacity) * 100))}%` }}
                                                        ></div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Historical Consumption (Calculated from loaded history) */}
                                <div>
                                    <div className="flex items-center justify-between mb-4">
                                        <h4 className="text-lg font-medium text-gray-900">Recorded Consumption (From History)</h4>
                                        <div className="text-sm text-gray-500">
                                            Based on {shiftHistory.length} recorded shifts
                                        </div>
                                    </div>
                                    <div className="overflow-x-auto">
                                        <table className="w-full">
                                            <thead>
                                                <tr className="bg-gray-50 border-b border-gray-200">
                                                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Date</th>
                                                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">91 Gasoline</th>
                                                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">95 Gasoline</th>
                                                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Diesel</th>
                                                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Total Liters</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {shiftHistory.slice(0, 10).map((shift) => {
                                                    const consumption = { '91_GASOLINE': 0, '95_GASOLINE': 0, 'DIESEL': 0 };
                                                    let total = 0;
                                                    shift.dailyShiftReadings?.forEach((r: any) => {
                                                        const type = r.nozzle?.fuelType;
                                                        const liters = (r.shiftALiters || 0) + (r.shiftBLiters || 0);
                                                        if (type && type in consumption) {
                                                            consumption[type as keyof typeof consumption] += liters;
                                                            total += liters;
                                                        }
                                                    });

                                                    return (
                                                        <tr key={shift.id} className="border-b border-gray-100 hover:bg-gray-50">
                                                            <td className="px-4 py-3 text-sm text-gray-900">
                                                                {new Date(shift.shiftDate || shift.startTime).toLocaleDateString()}
                                                            </td>
                                                            <td className="px-4 py-3 text-sm text-right text-gray-600">
                                                                {consumption['91_GASOLINE'].toFixed(2)}
                                                            </td>
                                                            <td className="px-4 py-3 text-sm text-right text-gray-600">
                                                                {consumption['95_GASOLINE'].toFixed(2)}
                                                            </td>
                                                            <td className="px-4 py-3 text-sm text-right text-gray-600">
                                                                {consumption['DIESEL'].toFixed(2)}
                                                            </td>
                                                            <td className="px-4 py-3 text-sm text-right font-medium text-gray-900">
                                                                {total.toFixed(2)}
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                                {shiftHistory.length === 0 && (
                                                    <tr>
                                                        <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                                                            No consumption history available. Load shift history to view data.
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-8 flex justify-end gap-3 print:hidden">
                                <button
                                    onClick={() => {
                                        const printWindow = window.open('', '_blank');
                                        if (printWindow) {
                                            printWindow.document.write(`
                                                <html>
                                                    <head>
                                                        <title>Consumption Report</title>
                                                        <style>
                                                            body { font-family: Arial, sans-serif; padding: 20px; }
                                                            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                                                            th, td { border: 1px solid #ddd; padding: 8px; text-align: right; }
                                                            th:first-child, td:first-child { text-align: left; }
                                                            th { background-color: #f2f2f2; }
                                                            h1, h2 { color: #333; }
                                                            .tank-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-bottom: 40px; }
                                                            .tank-card { border: 1px solid #ddd; padding: 15px; border-radius: 8px; }
                                                        </style>
                                                    </head>
                                                    <body>
                                                        <h1>Consumption Report</h1>
                                                        <p>Date: ${new Date().toLocaleDateString()}</p>
                                                        
                                                        <h2>Current Tank Levels</h2>
                                                        <div class="tank-grid">
                                                            ${tanks.map(tank => `
                                                                <div class="tank-card">
                                                                    <h3>${getFuelTypeLabel(tank.fuelType)}</h3>
                                                                    <p>Level: ${tank.currentLevel.toLocaleString()} L</p>
                                                                    <p>Capacity: ${tank.capacity.toLocaleString()} L</p>
                                                                    <p>Fill: ${Math.round((tank.currentLevel / tank.capacity) * 100)}%</p>
                                                                </div>
                                                            `).join('')}
                                                        </div>

                                                        <h2>Recent Daily Consumption</h2>
                                                        <table>
                                                            <thead>
                                                                <tr>
                                                                    <th>Date</th>
                                                                    <th>91 Gasoline</th>
                                                                    <th>95 Gasoline</th>
                                                                    <th>Diesel</th>
                                                                    <th>Total Liters</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                ${shiftHistory.slice(0, 30).map(shift => {
                                                const consumption = { '91_GASOLINE': 0, '95_GASOLINE': 0, 'DIESEL': 0 };
                                                let total = 0;
                                                shift.dailyShiftReadings?.forEach((r: any) => {
                                                    const type = r.nozzle?.fuelType;
                                                    const liters = (r.shiftALiters || 0) + (r.shiftBLiters || 0);
                                                    if (type && type in consumption) {
                                                        consumption[type as keyof typeof consumption] += liters;
                                                        total += liters;
                                                    }
                                                });
                                                return `
                                                                        <tr>
                                                                            <td>${new Date(shift.shiftDate || shift.startTime).toLocaleDateString()}</td>
                                                                            <td>${consumption['91_GASOLINE'].toFixed(2)}</td>
                                                                            <td>${consumption['95_GASOLINE'].toFixed(2)}</td>
                                                                            <td>${consumption['DIESEL'].toFixed(2)}</td>
                                                                            <td>${total.toFixed(2)}</td>
                                                                        </tr>
                                                                    `;
                                            }).join('')}
                                                            </tbody>
                                                        </table>
                                                        <script>window.print()</script>
                                                    </body>
                                                </html>
                                            `);
                                            printWindow.document.close();
                                        }
                                    }}
                                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                                >
                                    Print Report
                                </button>
                                <button
                                    onClick={() => {
                                        const headers = ['Date', '91 Gasoline', '95 Gasoline', 'Diesel', 'Total Liters'];
                                        const rows = shiftHistory.map(shift => {
                                            const consumption: any = { '91_GASOLINE': 0, '95_GASOLINE': 0, 'DIESEL': 0 };
                                            let total = 0;
                                            shift.dailyShiftReadings?.forEach((r: any) => {
                                                const type = r.nozzle?.fuelType;
                                                const liters = (r.shiftALiters || 0) + (r.shiftBLiters || 0);
                                                if (type && type in consumption) {
                                                    consumption[type] += liters;
                                                    total += liters;
                                                }
                                            });
                                            return [
                                                new Date(shift.shiftDate || shift.startTime).toLocaleDateString(),
                                                consumption['91_GASOLINE'].toFixed(2),
                                                consumption['95_GASOLINE'].toFixed(2),
                                                consumption['DIESEL'].toFixed(2),
                                                total.toFixed(2)
                                            ].join(',');
                                        });

                                        const csvContent = [headers.join(','), ...rows].join('\n');
                                        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                                        const link = document.createElement('a');
                                        link.href = URL.createObjectURL(blob);
                                        link.download = 'consumption_report.csv';
                                        link.click();
                                    }}
                                    className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                                >
                                    Export CSV
                                </button>
                                <button
                                    onClick={() => setShowConsumptionReport(false)}
                                    className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
