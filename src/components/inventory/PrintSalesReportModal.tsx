import { useState, useRef, useEffect } from 'react';
import api from '../../services/api';

interface PrintSalesReportModalProps {
    stationId: string;
    stationName: string;
    onClose: () => void;
}

interface ShiftData {
    id: string;
    shiftDate: string;
    status: string;
    dailyShiftReadings: {
        nozzle: {
            name: string;
            fuelType: string;
        };
        shiftALiters: number;
        shiftBLiters: number;
        shiftAAmount: number;
        shiftBAmount: number;
        totalAmount: number;
    }[];
    paymentSummary?: {
        cardAmount: number;
        cashAmount: number;
        option3Amount: number;
        option4Amount: number;
        totalCollected: number;
    };
}

export const PrintSalesReportModal = ({ stationId, stationName, onClose }: PrintSalesReportModalProps) => {
    const [dateFilterType, setDateFilterType] = useState<'all' | 'single' | 'range'>('all');
    const [singleDate, setSingleDate] = useState(new Date().toISOString().slice(0, 10));
    const [startDate, setStartDate] = useState(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10));
    const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10));
    const [shifts, setShifts] = useState<ShiftData[]>([]);
    const [loading, setLoading] = useState(false);
    const printRef = useRef<HTMLDivElement>(null);

    const loadShifts = async () => {
        try {
            setLoading(true);
            const res = await api.get(`/api/inventory/shifts/stations/${stationId}/all`);
            setShifts(res.data.shifts || []);
        } catch (error) {
            console.error('Failed to load shifts:', error);
            alert('Failed to load sales data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadShifts();
    }, [stationId]);

    const filterByDate = (shiftsData: ShiftData[]) => {
        if (dateFilterType === 'all') return shiftsData;

        return shiftsData.filter(shift => {
            const shiftDate = new Date(shift.shiftDate);

            if (dateFilterType === 'single') {
                const filterDate = new Date(singleDate);
                return shiftDate.toDateString() === filterDate.toDateString();
            } else if (dateFilterType === 'range') {
                const start = new Date(startDate);
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                return shiftDate >= start && shiftDate <= end;
            }
            return true;
        });
    };

    const filteredShifts = filterByDate(shifts);


    // Calculate totals
    const totalRevenue = filteredShifts.reduce((sum, shift) => {
        const shiftTotal = shift.dailyShiftReadings?.reduce((s, r) => s + r.totalAmount, 0) || 0;
        return sum + shiftTotal;
    }, 0);

    const totalLiters = filteredShifts.reduce((sum, shift) => {
        const shiftLiters = shift.dailyShiftReadings?.reduce((s, r) => s + r.shiftALiters + r.shiftBLiters, 0) || 0;
        return sum + shiftLiters;
    }, 0);

    const handlePrint = () => {
        const printContent = printRef.current;
        if (!printContent) return;

        const printWindow = window.open('', '', 'width=1200,height=800');
        if (!printWindow) return;

        printWindow.document.write('<html><head><title>Sales Report - ' + stationName + '</title>');
        printWindow.document.write('<style>');
        printWindow.document.write(`
            body { font-family: Arial, sans-serif; margin: 20px; }
            h1 { color: #1f2937; margin-bottom: 10px; border-bottom: 3px solid #3b82f6; padding-bottom: 10px; }
            .header { margin-bottom: 20px; }
            .date-info { color: #6b7280; font-size: 14px; margin-bottom: 10px; }
            .summary-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 20px; }
            .summary-card { border: 1px solid #e5e7eb; padding: 10px; border-radius: 4px; }
            .summary-card.blue { border-left: 4px solid #3b82f6; }
            .summary-card.green { border-left: 4px solid #22c55e; }
            .summary-card.purple { border-left: 4px solid #a855f7; }
            .summary-label { font-size: 9pt; color: #6b7280; margin: 0 0 5px 0; }
            .summary-value { font-size: 16pt; font-weight: bold; margin: 0; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #e5e7eb; padding: 8px; text-align: left; font-size: 10px; }
            th { background-color: #f9fafb; font-weight: 600; color: #374151; }
            .footer { margin-top: 30px; text-align: center; color: #6b7280; font-size: 12px; }
            @media print {
                @page { margin: 0.5in; }
                body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
            }
        `);
        printWindow.document.write('</style></head><body>');
        printWindow.document.write(printContent.innerHTML);
        printWindow.document.write('</body></html>');
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
                <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-gray-600 to-gray-700">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-2xl font-bold text-white">Sales Report - {stationName}</h2>
                            <p className="text-white/90 mt-1">Filter and print sales reports</p>
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
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-white rounded-lg p-4 border-l-4 border-blue-500 shadow-sm border border-gray-200">
                            <p className="text-sm text-gray-600 mb-1">Total Shifts</p>
                            <p className="text-2xl font-bold text-gray-900">{filteredShifts.length}</p>
                        </div>
                        <div className="bg-white rounded-lg p-4 border-l-4 border-green-500 shadow-sm border border-gray-200">
                            <p className="text-sm text-gray-600 mb-1">Total Revenue</p>
                            <p className="text-2xl font-bold text-green-600">{totalRevenue.toFixed(2)} SAR</p>
                        </div>
                        <div className="bg-white rounded-lg p-4 border-l-4 border-purple-500 shadow-sm border border-gray-200">
                            <p className="text-sm text-gray-600 mb-1">Total Volume</p>
                            <p className="text-2xl font-bold text-purple-600">{totalLiters.toFixed(2)} L</p>
                        </div>
                    </div>
                </div>

                {/* Data Preview */}
                <div className="flex-1 overflow-y-auto p-6">
                    {loading ? (
                        <div className="text-center py-12">
                            <p className="text-gray-500">Loading...</p>
                        </div>
                    ) : filteredShifts.length === 0 ? (
                        <div className="text-center py-12">
                            <p className="text-gray-500">No sales data found for the selected date range</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Shift A (L)</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Shift B (L)</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total (L)</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Revenue (SAR)</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {filteredShifts.map((shift) => {
                                        const shiftALiters = shift.dailyShiftReadings?.reduce((s, r) => s + r.shiftALiters, 0) || 0;
                                        const shiftBLiters = shift.dailyShiftReadings?.reduce((s, r) => s + r.shiftBLiters, 0) || 0;
                                        const totalLiters = shiftALiters + shiftBLiters;
                                        const revenue = shift.dailyShiftReadings?.reduce((s, r) => s + r.totalAmount, 0) || 0;

                                        return (
                                            <tr key={shift.id} className="hover:bg-gray-50">
                                                <td className="px-4 py-3 text-sm text-gray-900">{new Date(shift.shiftDate).toLocaleDateString()}</td>
                                                <td className="px-4 py-3 text-sm text-gray-900">{shiftALiters.toFixed(2)}</td>
                                                <td className="px-4 py-3 text-sm text-gray-900">{shiftBLiters.toFixed(2)}</td>
                                                <td className="px-4 py-3 text-sm text-gray-900">{totalLiters.toFixed(2)}</td>
                                                <td className="px-4 py-3 text-sm text-gray-900">{revenue.toFixed(2)}</td>
                                                <td className="px-4 py-3 text-sm">
                                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${shift.status === 'LOCKED' ? 'bg-gray-100 text-gray-800' :
                                                        shift.status === 'SAVED' ? 'bg-blue-100 text-blue-800' :
                                                            'bg-green-100 text-green-800'
                                                        }`}>
                                                        {shift.status}
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-gray-200 bg-gray-50">
                    <div className="flex justify-between items-center">
                        <p className="text-sm text-gray-600">
                            Showing {filteredShifts.length} shift{filteredShifts.length !== 1 ? 's' : ''}
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={handlePrint}
                                disabled={filteredShifts.length === 0}
                                className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
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

            {/* Hidden Printable Report */}
            <div className="hidden">
                <div ref={printRef}>
                    <div className="header">
                        <h1>Sales Report - {stationName}</h1>
                        <div className="date-info">
                            Generated on: {new Date().toLocaleString()}
                            {dateFilterType === 'single' && ` | Date: ${singleDate}`}
                            {dateFilterType === 'range' && ` | Period: ${startDate} to ${endDate}`}
                        </div>
                        <div className="date-info">
                            Total Shifts: {filteredShifts.length} | Total Revenue: {totalRevenue.toFixed(2)} SAR | Total Volume: {totalLiters.toFixed(2)} L
                        </div>
                    </div>

                    <div className="summary-grid">
                        <div className="summary-card blue">
                            <p className="summary-label">Total Shifts</p>
                            <p className="summary-value">{filteredShifts.length}</p>
                        </div>
                        <div className="summary-card green">
                            <p className="summary-label">Total Revenue</p>
                            <p className="summary-value">{totalRevenue.toFixed(2)} SAR</p>
                        </div>
                        <div className="summary-card purple">
                            <p className="summary-label">Total Volume</p>
                            <p className="summary-value">{totalLiters.toFixed(2)} L</p>
                        </div>
                    </div>

                    <table>
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Shift A (L)</th>
                                <th>Shift B (L)</th>
                                <th>Total (L)</th>
                                <th>Revenue (SAR)</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredShifts.map((shift) => {
                                const shiftALiters = shift.dailyShiftReadings?.reduce((s, r) => s + r.shiftALiters, 0) || 0;
                                const shiftBLiters = shift.dailyShiftReadings?.reduce((s, r) => s + r.shiftBLiters, 0) || 0;
                                const totalLiters = shiftALiters + shiftBLiters;
                                const revenue = shift.dailyShiftReadings?.reduce((s, r) => s + r.totalAmount, 0) || 0;

                                return (
                                    <tr key={shift.id}>
                                        <td>{new Date(shift.shiftDate).toLocaleDateString()}</td>
                                        <td>{shiftALiters.toFixed(2)}</td>
                                        <td>{shiftBLiters.toFixed(2)}</td>
                                        <td>{totalLiters.toFixed(2)}</td>
                                        <td>{revenue.toFixed(2)}</td>
                                        <td>{shift.status}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>

                    <div className="footer">
                        <p>Darb Station - Fuel Management System</p>
                        <p>Developed and Powered by Nocastra</p>
                    </div>
                </div>
            </div>
        </div>
    );
};
