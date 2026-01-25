import { useState, useEffect } from 'react';
import api from '../../services/api';

interface PrintTankInventoryModalProps {
    stationId: string;
    stationName: string;
    onClose: () => void;
}

interface TankerDelivery {
    id: string;
    fuelType: string;
    litersDelivered: number;
    deliveryDate: string;
    aramcoTicket?: string;
    invoiceNumber?: string;
    notes?: string;
}

export const PrintTankInventoryModal = ({ stationId, stationName, onClose }: PrintTankInventoryModalProps) => {
    const [dateFilterType, setDateFilterType] = useState<'all' | 'single' | 'range'>('all');
    const [singleDate, setSingleDate] = useState(new Date().toISOString().slice(0, 10));
    const [startDate, setStartDate] = useState(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10));
    const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10));
    const [deliveries, setDeliveries] = useState<TankerDelivery[]>([]);
    const [loading, setLoading] = useState(false);

    const loadDeliveries = async () => {
        try {
            setLoading(true);
            const res = await api.get(`/api/inventory/stations/${stationId}/deliveries`);
            console.log('Raw API response:', res.data);
            console.log('Deliveries:', res.data.deliveries);
            if (res.data.deliveries && res.data.deliveries.length > 0) {
                console.log('First delivery object:', res.data.deliveries[0]);
                console.log('First delivery keys:', Object.keys(res.data.deliveries[0]));
                console.log('First delivery fuelType:', res.data.deliveries[0].fuelType);
            }
            setDeliveries(res.data.deliveries || []);
        } catch (error) {
            console.error('Failed to load deliveries:', error);
            alert('Failed to load tank inventory data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadDeliveries();
    }, [stationId]);

    const filterByDate = (deliveriesData: TankerDelivery[]) => {
        if (dateFilterType === 'all') return deliveriesData;

        return deliveriesData.filter(delivery => {
            const deliveryDate = new Date(delivery.deliveryDate);

            if (dateFilterType === 'single') {
                const filterDate = new Date(singleDate);
                return deliveryDate.toDateString() === filterDate.toDateString();
            } else if (dateFilterType === 'range') {
                const start = new Date(startDate);
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                return deliveryDate >= start && deliveryDate <= end;
            }
            return true;
        });
    };

    const filteredDeliveries = filterByDate(deliveries);

    const getFuelTypeLabel = (fuelType: string) => {
        if (!fuelType) return 'Unknown';
        switch (fuelType) {
            case '91_GASOLINE': return '91 Gasoline';
            case '95_GASOLINE': return '95 Gasoline';
            case '98_GASOLINE': return '98 Gasoline';
            case 'DIESEL': return 'Diesel';
            default: return fuelType;
        }
    };

    // Calculate totals by fuel type
    const fuelTypeTotals = filteredDeliveries.reduce((acc, delivery) => {
        const fuelType = delivery.fuelType || 'undefined';
        if (!acc[fuelType]) {
            acc[fuelType] = 0;
        }
        acc[fuelType] += delivery.litersDelivered;
        return acc;
    }, {} as Record<string, number>);

    console.log('Fuel type totals:', fuelTypeTotals);
    console.log('Filtered deliveries:', filteredDeliveries);

    const totalLiters = filteredDeliveries.reduce((sum, d) => sum + d.litersDelivered, 0);

    const handlePrint = () => {
        const printWindow = window.open('', '', 'width=1200,height=800');
        if (!printWindow) return;

        // Group deliveries by fuel type
        const deliveriesByFuelType = filteredDeliveries.reduce((acc, delivery) => {
            if (!acc[delivery.fuelType]) {
                acc[delivery.fuelType] = [];
            }
            acc[delivery.fuelType].push(delivery);
            return acc;
        }, {} as Record<string, TankerDelivery[]>);

        const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <title>Tank Inventory Report - ${stationName}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: Arial, sans-serif; padding: 8px; font-size: 9pt; }
        .report-container { width: 100%; }
        h1 { color: #1f2937; margin-bottom: 3px; border-bottom: 2px solid #3b82f6; padding-bottom: 3px; font-size: 16pt; }
        .date-info { color: #6b7280; font-size: 8pt; margin-bottom: 2px; line-height: 1.2; }
        .summary-line { background-color: #f9fafb; border: 1px solid #e5e7eb; border-left: 3px solid #3b82f6; padding: 6px 8px; margin: 6px 0; font-size: 8pt; display: flex; flex-wrap: wrap; gap: 15px; }
        .summary-item { display: inline-block; }
        .summary-item strong { color: #1f2937; font-weight: 600; }
        .fuel-section { margin-top: 12px; page-break-inside: avoid; }
        .fuel-header { background-color: #f3f4f6; border-left: 4px solid #3b82f6; padding: 6px 10px; margin-bottom: 6px; display: flex; justify-content: space-between; align-items: center; }
        .fuel-title { font-size: 11pt; font-weight: bold; color: #1f2937; }
        .fuel-total { font-size: 10pt; font-weight: 600; color: #3b82f6; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
        th, td { border: 1px solid #e5e7eb; padding: 3px 5px; text-align: left; font-size: 7.5pt; }
        th { background-color: #f9fafb; font-weight: 600; color: #374151; }
        .footer { margin-top: 12px; text-align: center; color: #6b7280; font-size: 7pt; page-break-inside: avoid; }
        @media print {
            @page { margin: 0.25in 0.35in; size: portrait; }
            body { print-color-adjust: exact; -webkit-print-color-adjust: exact; padding: 0; }
            .fuel-section { page-break-inside: avoid; }
            table { page-break-inside: auto; }
            tr { page-break-inside: avoid; page-break-after: auto; }
            thead { display: table-header-group; }
        }
    </style>
</head>
<body>
    <div class="report-container">
        <h1>Tank Inventory Report - ${stationName}</h1>
        <div class="date-info">Generated: ${new Date().toLocaleString()} | Filter: ${dateFilterType === 'single' ? `Date: ${singleDate}` : dateFilterType === 'range' ? `${startDate} to ${endDate}` : 'All Time'}</div>
        <div class="summary-line">
            <span class="summary-item"><strong>Total Deliveries:</strong> ${filteredDeliveries.length}</span>
            <span class="summary-item"><strong>Total Volume:</strong> ${totalLiters.toFixed(2)} L</span>
        </div>
        ${Object.entries(deliveriesByFuelType).map(([fuelType, fuelDeliveries]) => {
            const fuelTotal = fuelDeliveries.reduce((sum, d) => sum + d.litersDelivered, 0);
            return `
                <div class="fuel-section">
                    <div class="fuel-header">
                        <span class="fuel-title">${getFuelTypeLabel(fuelType)}</span>
                        <span class="fuel-total">Total: ${fuelTotal.toLocaleString()} L</span>
                    </div>
                    <table>
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Station</th>
                                <th>Aramco Ticket</th>
                                <th>Notes</th>
                                <th style="text-align: right;">Liters</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${fuelDeliveries.map((delivery) => `
                                <tr>
                                    <td>${new Date(delivery.deliveryDate).toLocaleDateString()}</td>
                                    <td>${stationName}</td>
                                    <td>${delivery.aramcoTicket || delivery.invoiceNumber || '-'}</td>
                                    <td>${delivery.notes || '-'}</td>
                                    <td style="text-align: right;">${delivery.litersDelivered.toLocaleString()}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `;
        }).join('')}
        <div class="footer">
            <p>Darb Station - Fuel Management System | Developed and Powered by Nocastra</p>
        </div>
    </div>
</body>
</html>
        `;

        printWindow.document.write(htmlContent);
        printWindow.document.close();

        setTimeout(() => {
            printWindow.print();
            printWindow.close();
        }, 250);
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-7xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-blue-700">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-2xl font-bold text-white">Tank Inventory Report - {stationName}</h2>
                            <p className="text-white/90 mt-1">Filter and print tank delivery reports</p>
                        </div>
                        <button
                            onClick={onClose}
                            className="text-white/80 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-lg"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Date Filter */}
                <div className="p-6 bg-gray-50 border-b border-gray-200">
                    <label className="block text-sm font-medium text-gray-700 mb-3">Date Filter</label>
                    <div className="flex flex-wrap gap-2 items-end">
                        <div className="flex gap-2">
                            <button
                                onClick={() => setDateFilterType('all')}
                                className={`px-4 py-2 rounded-lg font-medium transition-colors ${dateFilterType === 'all'
                                    ? 'bg-green-600 text-white'
                                    : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
                                    }`}
                            >
                                All Time
                            </button>
                            <button
                                onClick={() => setDateFilterType('single')}
                                className={`px-4 py-2 rounded-lg font-medium transition-colors ${dateFilterType === 'single'
                                    ? 'bg-green-600 text-white'
                                    : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
                                    }`}
                            >
                                Single Date
                            </button>
                            <button
                                onClick={() => setDateFilterType('range')}
                                className={`px-4 py-2 rounded-lg font-medium transition-colors ${dateFilterType === 'range'
                                    ? 'bg-green-600 text-white'
                                    : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
                                    }`}
                            >
                                Date Range
                            </button>
                        </div>

                        {dateFilterType === 'single' && (
                            <div className="flex items-center gap-2">
                                <label className="text-sm text-gray-600">Date:</label>
                                <input
                                    type="date"
                                    value={singleDate}
                                    onChange={(e) => setSingleDate(e.target.value)}
                                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                />
                            </div>
                        )}

                        {dateFilterType === 'range' && (
                            <div className="flex items-center gap-2">
                                <label className="text-sm text-gray-600">From:</label>
                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                />
                                <label className="text-sm text-gray-600">To:</label>
                                <input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                />
                            </div>
                        )}
                    </div>
                </div>

                {/* Summary Cards */}
                <div className="p-6 bg-white border-b border-gray-200">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="bg-white rounded-lg p-4 border-l-4 border-blue-500 shadow-sm border border-gray-200">
                            <p className="text-sm text-gray-600 mb-1">Total Deliveries</p>
                            <p className="text-2xl font-bold text-gray-900">{filteredDeliveries.length}</p>
                        </div>
                        <div className="bg-white rounded-lg p-4 border-l-4 border-green-500 shadow-sm border border-gray-200">
                            <p className="text-sm text-gray-600 mb-1">Total Volume</p>
                            <p className="text-2xl font-bold text-green-600">{totalLiters.toFixed(2)} L</p>
                        </div>
                        {Object.entries(fuelTypeTotals).map(([fuelType, total]) => (
                            <div key={fuelType} className="bg-white rounded-lg p-4 border-l-4 border-purple-500 shadow-sm border border-gray-200">
                                <p className="text-sm text-gray-600 mb-1">{getFuelTypeLabel(fuelType)}</p>
                                <p className="text-2xl font-bold text-purple-600">{total.toFixed(2)} L</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Data Preview - Grouped by Fuel Type */}
                <div className="flex-1 overflow-y-auto p-6">
                    {loading ? (
                        <div className="text-center py-12">
                            <p className="text-gray-500">Loading...</p>
                        </div>
                    ) : filteredDeliveries.length === 0 ? (
                        <div className="text-center py-12">
                            <p className="text-gray-500">No tank deliveries found for the selected date range</p>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {Object.entries(fuelTypeTotals).map(([fuelType, total]) => {
                                const fuelDeliveries = filteredDeliveries.filter(d => d.fuelType === fuelType);
                                return (
                                    <div key={fuelType} className="border border-gray-200 rounded-lg overflow-hidden">
                                        <div className="bg-gradient-to-r from-blue-50 to-blue-100 px-4 py-3 border-b border-blue-200 flex justify-between items-center">
                                            <h3 className="text-lg font-semibold text-gray-900">{getFuelTypeLabel(fuelType)}</h3>
                                            <span className="text-blue-700 font-semibold">Total: {total.toLocaleString()} L</span>
                                        </div>
                                        <div className="overflow-x-auto">
                                            <table className="min-w-full divide-y divide-gray-200">
                                                <thead className="bg-gray-50">
                                                    <tr>
                                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Aramco Ticket</th>
                                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Notes</th>
                                                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Liters</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="bg-white divide-y divide-gray-200">
                                                    {fuelDeliveries.map((delivery) => (
                                                        <tr key={delivery.id} className="hover:bg-gray-50">
                                                            <td className="px-4 py-3 text-sm text-gray-900">{new Date(delivery.deliveryDate).toLocaleDateString()}</td>
                                                            <td className="px-4 py-3 text-sm text-gray-600">{delivery.aramcoTicket || delivery.invoiceNumber || '-'}</td>
                                                            <td className="px-4 py-3 text-sm text-gray-600">{delivery.notes || '-'}</td>
                                                            <td className="px-4 py-3 text-sm text-gray-900 text-right font-medium">{delivery.litersDelivered.toLocaleString()}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-gray-200 bg-gray-50">
                    <div className="flex justify-between items-center">
                        <p className="text-sm text-gray-600">
                            Showing {filteredDeliveries.length} deliver{filteredDeliveries.length !== 1 ? 'ies' : 'y'}
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={handlePrint}
                                disabled={filteredDeliveries.length === 0}
                                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                                </svg>
                                Print Report
                            </button>
                            <button
                                onClick={onClose}
                                className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
