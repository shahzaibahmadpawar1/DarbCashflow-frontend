import { useState, useEffect, useRef } from 'react';
import api from '../../services/api';
import { PrintableInventoryReport } from './PrintableInventoryReport';

interface AdminStationStats {
    id: string;
    name: string;
    stationType: string;
    totalRevenue: number;
    totalLiters: number;
    fuelBreakdown: {
        gasoline91: { liters: number; amount: number };
        gasoline95: { liters: number; amount: number };
        diesel: { liters: number; amount: number };
    };
}

interface AdminInventoryViewProps {
    onSelectStation?: (stationId: string) => void;
}

export const AdminInventoryView = ({ onSelectStation }: AdminInventoryViewProps) => {
    const [adminStats, setAdminStats] = useState<AdminStationStats[]>([]);
    const [loadingStats, setLoadingStats] = useState(true);
    const [stationFilter, setStationFilter] = useState<'all' | 'operational' | 'rental' | 'franchise'>('all');

    // Date filtering state
    const [dateFilterType, setDateFilterType] = useState<'all' | 'single' | 'range'>('all');
    const [singleDate, setSingleDate] = useState(new Date().toISOString().slice(0, 10));
    const [startDate, setStartDate] = useState(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10));
    const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10));

    // Print functionality
    const printRef = useRef<HTMLDivElement>(null);
    const handlePrint = () => {
        const printContent = printRef.current;
        if (!printContent) return;

        const printWindow = window.open('', '', 'width=800,height=600');
        if (!printWindow) return;

        printWindow.document.write('<html><head><title>Inventory Report</title>');
        printWindow.document.write('<style>');
        printWindow.document.write(`
            body { font-family: Arial, sans-serif; margin: 0; padding: 0; }
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

    useEffect(() => {
        loadAdminStats();
    }, [dateFilterType, singleDate, startDate, endDate]);

    const loadAdminStats = async () => {
        try {
            setLoadingStats(true);

            // Build query parameters based on date filter type
            let queryParams = '';
            if (dateFilterType === 'single') {
                queryParams = `?date=${singleDate}`;
            } else if (dateFilterType === 'range') {
                queryParams = `?startDate=${startDate}&endDate=${endDate}`;
            }

            const res = await api.get(`/api/inventory/admin/stats${queryParams}`);
            setAdminStats(res.data.stats);
        } catch (error) {
            console.error('Failed to load admin stats', error);
        } finally {
            setLoadingStats(false);
        }
    };

    const filteredStats = adminStats.filter(s =>
        stationFilter === 'all' || s.stationType.toLowerCase() === stationFilter
    );
    const totalRevenue = filteredStats.reduce((sum, s) => sum + (s.totalRevenue || 0), 0);
    const totalLiters = filteredStats.reduce((sum, s) => sum + (s.totalLiters || 0), 0);

    return (
        <div className="space-y-6">
            {/* Header with Totals */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 mb-2">All Stations Inventory</h1>
                        <p className="text-gray-600">Overview of inventory across all stations</p>
                    </div>
                    <div className="flex items-start gap-4">
                        {/* Print Button */}
                        <button
                            onClick={handlePrint}
                            disabled={filteredStats.length === 0}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                            </svg>
                            Print Report
                        </button>

                        {/* Totals */}
                        <div className="text-right space-y-2">
                            <div>
                                <p className="text-sm text-gray-600">Total Sales (Revenue)</p>
                                <p className="text-3xl font-bold text-green-600">{totalRevenue.toFixed(2)} SAR</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-600">Total Volume</p>
                                <p className="text-xl font-semibold text-blue-600">{totalLiters.toFixed(2)} L</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Filters */}
                <div className="space-y-4">
                    {/* Station Type Filters */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Station Type</label>
                        <div className="flex gap-2">
                            {['all', 'operational', 'rental', 'franchise'].map(type => (
                                <button
                                    key={type}
                                    onClick={() => setStationFilter(type as any)}
                                    className={`px-4 py-2 rounded-lg font-medium capitalize transition-colors ${stationFilter === type
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                        }`}
                                >
                                    {type}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Date Filters */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Date Filter</label>
                        <div className="flex flex-wrap gap-2 items-end">
                            {/* Date Filter Type Buttons */}
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setDateFilterType('all')}
                                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${dateFilterType === 'all'
                                        ? 'bg-green-600 text-white'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                        }`}
                                >
                                    All Time
                                </button>
                                <button
                                    onClick={() => setDateFilterType('single')}
                                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${dateFilterType === 'single'
                                        ? 'bg-green-600 text-white'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                        }`}
                                >
                                    Single Date
                                </button>
                                <button
                                    onClick={() => setDateFilterType('range')}
                                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${dateFilterType === 'range'
                                        ? 'bg-green-600 text-white'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                        }`}
                                >
                                    Date Range
                                </button>
                            </div>

                            {/* Single Date Input */}
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

                            {/* Date Range Inputs */}
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
                </div>
            </div>

            {/* Stations Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loadingStats ? (
                    <div className="col-span-full text-center py-12 text-gray-500">Loading stations data...</div>
                ) : filteredStats.length === 0 ? (
                    <div className="col-span-full text-center py-12 text-gray-500">No stations found.</div>
                ) : (
                    filteredStats.map(station => (
                        <div
                            key={station.id}
                            onClick={() => onSelectStation && onSelectStation(station.id)}
                            className={`bg-white rounded-xl shadow-sm border border-gray-200 p-6 transition-shadow hover:border-blue-300 group ${onSelectStation ? 'cursor-pointer hover:shadow-md' : ''}`}
                        >
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h3 className="text-xl font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                                        {station.name}
                                    </h3>
                                    <span className={`inline-block px-2 py-1 text-xs rounded-full mt-2 font-medium ${station.stationType === 'OPERATIONAL' ? 'bg-green-100 text-green-800' :
                                        station.stationType === 'RENTAL' ? 'bg-blue-100 text-blue-800' :
                                            'bg-purple-100 text-purple-800'
                                        }`}>
                                        {station.stationType}
                                    </span>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-600">Total Revenue</span>
                                    <span className="font-semibold">{Number(station.totalRevenue || 0).toFixed(2)} SAR</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-600">Total Volume</span>
                                    <span className="font-semibold">{Number(station.totalLiters || 0).toFixed(2)} L</span>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Hidden Printable Report */}
            <div className="hidden">
                <PrintableInventoryReport
                    ref={printRef}
                    stations={filteredStats}
                    stationFilter={stationFilter}
                    dateFilterType={dateFilterType}
                    singleDate={singleDate}
                    startDate={startDate}
                    endDate={endDate}
                />
            </div>
        </div>
    );
};
