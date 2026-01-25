import { useState, useRef, useEffect } from 'react';
import api from '../../services/api';

interface PurchaseRequest {
    id: string;
    fuelType: string;
    quantityLiters: number;
    paymentAmount: number;
    totalAmount: number;
    status: string;
    createdAt: string;
    station: {
        name: string;
        stationType?: string;
    };
    creator: {
        name: string;
        employeeId: string;
    };
    purchaseOrder?: {
        id: string;
        poNumber: string;
        aramcoPoNumber?: string;
        receivedAt?: string;
        receivedQuantityLiters?: number;
        receivedAmount?: number;
    };
}

interface PrintPOReportModalProps {
    onClose: () => void;
    stationId?: string; // Optional: if provided, load only this station's PRs
}

export const PrintPOReportModal = ({ onClose, stationId }: PrintPOReportModalProps) => {
    const [dateFilterType, setDateFilterType] = useState<'all' | 'single' | 'range'>('all');
    const [singleDate, setSingleDate] = useState(new Date().toISOString().slice(0, 10));
    const [startDate, setStartDate] = useState(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10));
    const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10));
    const [purchaseRequests, setPurchaseRequests] = useState<PurchaseRequest[]>([]);
    const [loading, setLoading] = useState(false);
    const printRef = useRef<HTMLDivElement>(null);

    const loadData = async () => {
        try {
            setLoading(true);
            // Use station-specific endpoint if stationId is provided, otherwise use office-user endpoint
            const endpoint = stationId
                ? `/api/purchase-requests/station/${stationId}`
                : '/api/purchase-requests/office-user';
            const res = await api.get(endpoint);
            setPurchaseRequests(res.data.purchaseRequests || []);
        } catch (error) {
            console.error('Failed to load purchase requests:', error);
            alert('Failed to load data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const getFuelTypeLabel = (fuelType: string) => {
        switch (fuelType) {
            case '91_GASOLINE': return '91 Gasoline';
            case '95_GASOLINE': return '95 Gasoline';
            case '98_GASOLINE': return '98 Gasoline';
            case 'DIESEL': return 'Diesel';
            default: return fuelType;
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'PENDING':
                return 'Pending';
            case 'APPROVED':
                return 'Approved';
            case 'REJECTED':
                return 'Rejected';
            case 'RECEIVED':
                return 'Received';
            default:
                return status;
        }
    };

    const filterByDate = (prs: PurchaseRequest[]) => {
        if (dateFilterType === 'all') return prs;

        return prs.filter(pr => {
            const prDate = new Date(pr.createdAt);

            if (dateFilterType === 'single') {
                const filterDate = new Date(singleDate);
                return prDate.toDateString() === filterDate.toDateString();
            } else if (dateFilterType === 'range') {
                const start = new Date(startDate);
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                return prDate >= start && prDate <= end;
            }
            return true;
        });
    };

    const filteredData = filterByDate(purchaseRequests);

    const handlePrint = () => {
        const printContent = printRef.current;
        if (!printContent) return;

        const printWindow = window.open('', '', 'width=1200,height=800');
        if (!printWindow) return;

        printWindow.document.write('<html><head><title>Purchase Requests & Orders Report</title>');
        printWindow.document.write('<style>');
        printWindow.document.write(`
            body { font-family: Arial, sans-serif; margin: 20px; }
            h1 { color: #1f2937; margin-bottom: 10px; border-bottom: 3px solid #3b82f6; padding-bottom: 10px; }
            .header { margin-bottom: 20px; }
            .date-info { color: #6b7280; font-size: 14px; margin-bottom: 10px; }
            .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 20px; }
            .summary-card { border: 1px solid #e5e7eb; padding: 10px; border-radius: 4px; }
            .summary-card.blue { border-left: 4px solid #3b82f6; }
            .summary-card.green { border-left: 4px solid #22c55e; }
            .summary-card.orange { border-left: 4px solid #f97316; }
            .summary-card.purple { border-left: 4px solid #a855f7; }
            .summary-label { font-size: 9pt; color: #6b7280; margin: 0 0 5px 0; }
            .summary-value { font-size: 16pt; font-weight: bold; margin: 0; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #e5e7eb; padding: 8px; text-align: left; font-size: 10px; }
            th { background-color: #f9fafb; font-weight: 600; color: #374151; }
            .status-pending { background-color: #fef3c7; color: #92400e; padding: 4px 8px; border-radius: 9999px; font-size: 9px; }
            .status-approved { background-color: #dbeafe; color: #1e40af; padding: 4px 8px; border-radius: 9999px; font-size: 9px; }
            .status-received { background-color: #d1fae5; color: #065f46; padding: 4px 8px; border-radius: 9999px; font-size: 9px; }
            .status-rejected { background-color: #fee2e2; color: #991b1b; padding: 4px 8px; border-radius: 9999px; font-size: 9px; }
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

    // Calculate statistics
    const totalPRs = filteredData.length;
    const totalPOs = filteredData.filter(pr => pr.purchaseOrder).length;
    const pendingPRs = filteredData.filter(pr => pr.status === 'PENDING').length;
    const approvedPRs = filteredData.filter(pr => pr.status === 'APPROVED' || pr.status === 'RECEIVED').length;
    const totalAmount = filteredData.reduce((sum, pr) => sum + (pr.totalAmount || pr.paymentAmount), 0);

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-7xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-blue-700">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-2xl font-bold text-white">Purchase Requests & Orders Report</h2>
                            <p className="text-white/90 mt-1">Filter and print PR/PO reports</p>
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
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        <div className="bg-white rounded-lg p-4 border-l-4 border-blue-500 shadow-sm border border-gray-200">
                            <p className="text-sm text-gray-600 mb-1">Total PRs</p>
                            <p className="text-2xl font-bold text-gray-900">{totalPRs}</p>
                        </div>
                        <div className="bg-white rounded-lg p-4 border-l-4 border-purple-500 shadow-sm border border-gray-200">
                            <p className="text-sm text-gray-600 mb-1">Total POs</p>
                            <p className="text-2xl font-bold text-purple-600">{totalPOs}</p>
                        </div>
                        <div className="bg-white rounded-lg p-4 border-l-4 border-yellow-500 shadow-sm border border-gray-200">
                            <p className="text-sm text-gray-600 mb-1">Pending</p>
                            <p className="text-2xl font-bold text-yellow-600">{pendingPRs}</p>
                        </div>
                        <div className="bg-white rounded-lg p-4 border-l-4 border-green-500 shadow-sm border border-gray-200">
                            <p className="text-sm text-gray-600 mb-1">Approved</p>
                            <p className="text-2xl font-bold text-green-600">{approvedPRs}</p>
                        </div>
                        <div className="bg-white rounded-lg p-4 border-l-4 border-orange-500 shadow-sm border border-gray-200">
                            <p className="text-sm text-gray-600 mb-1">Total Amount</p>
                            <p className="text-xl font-bold text-orange-600">{totalAmount.toLocaleString()} SAR</p>
                        </div>
                    </div>
                </div>

                {/* Data Preview */}
                <div className="flex-1 overflow-y-auto p-6">
                    {loading ? (
                        <div className="text-center py-12">
                            <p className="text-gray-500">Loading...</p>
                        </div>
                    ) : filteredData.length === 0 ? (
                        <div className="text-center py-12">
                            <p className="text-gray-500">No purchase requests found for the selected date range</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Station</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fuel Type</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quantity (L)</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount (SAR)</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">PO Number</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created At</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {filteredData.map((pr) => (
                                        <tr key={pr.id} className="hover:bg-gray-50">
                                            <td className="px-4 py-3 text-sm text-gray-900">{pr.station.name}</td>
                                            <td className="px-4 py-3 text-sm text-gray-900">{getFuelTypeLabel(pr.fuelType)}</td>
                                            <td className="px-4 py-3 text-sm text-gray-900">{pr.quantityLiters.toLocaleString()}</td>
                                            <td className="px-4 py-3 text-sm text-gray-900">{(pr.totalAmount || pr.paymentAmount).toLocaleString()}</td>
                                            <td className="px-4 py-3 text-sm text-blue-600">{pr.purchaseOrder?.poNumber || '-'}</td>
                                            <td className="px-4 py-3 text-sm">
                                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${pr.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                                                    pr.status === 'APPROVED' ? 'bg-blue-100 text-blue-800' :
                                                        pr.status === 'RECEIVED' ? 'bg-green-100 text-green-800' :
                                                            'bg-red-100 text-red-800'
                                                    }`}>
                                                    {getStatusBadge(pr.status)}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-600">{new Date(pr.createdAt).toLocaleDateString()}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-gray-200 bg-gray-50">
                    <div className="flex justify-between items-center">
                        <p className="text-sm text-gray-600">
                            Showing {filteredData.length} record{filteredData.length !== 1 ? 's' : ''}
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={handlePrint}
                                disabled={filteredData.length === 0}
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

            {/* Hidden Printable Report */}
            <div className="hidden">
                <div ref={printRef}>
                    <div className="header">
                        <h1>Purchase Requests & Orders Report</h1>
                        <div className="date-info">
                            Generated on: {new Date().toLocaleString()}
                            {dateFilterType === 'single' && ` | Date: ${singleDate}`}
                            {dateFilterType === 'range' && ` | Period: ${startDate} to ${endDate}`}
                        </div>
                        <div className="date-info">
                            Total Records: {filteredData.length} | Total Amount: {totalAmount.toLocaleString()} SAR
                        </div>
                    </div>

                    <div className="summary-grid">
                        <div className="summary-card blue">
                            <p className="summary-label">Total PRs</p>
                            <p className="summary-value">{totalPRs}</p>
                        </div>
                        <div className="summary-card purple">
                            <p className="summary-label">Total POs</p>
                            <p className="summary-value">{totalPOs}</p>
                        </div>
                        <div className="summary-card orange">
                            <p className="summary-label">Pending</p>
                            <p className="summary-value">{pendingPRs}</p>
                        </div>
                        <div className="summary-card green">
                            <p className="summary-label">Approved</p>
                            <p className="summary-value">{approvedPRs}</p>
                        </div>
                    </div>

                    <table>
                        <thead>
                            <tr>
                                <th>Station</th>
                                <th>Fuel Type</th>
                                <th>Quantity (L)</th>
                                <th>Amount (SAR)</th>
                                <th>PO Number</th>
                                <th>Aramco PO</th>
                                <th>Status</th>
                                <th>Created At</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredData.map((pr) => (
                                <tr key={pr.id}>
                                    <td>{pr.station.name}</td>
                                    <td>{getFuelTypeLabel(pr.fuelType)}</td>
                                    <td>{pr.quantityLiters.toLocaleString()}</td>
                                    <td>{(pr.totalAmount || pr.paymentAmount).toLocaleString()}</td>
                                    <td>{pr.purchaseOrder?.poNumber || '-'}</td>
                                    <td>{pr.purchaseOrder?.aramcoPoNumber || '-'}</td>
                                    <td>
                                        <span className={`status-${pr.status.toLowerCase()}`}>
                                            {getStatusBadge(pr.status)}
                                        </span>
                                    </td>
                                    <td>{new Date(pr.createdAt).toLocaleDateString()}</td>
                                </tr>
                            ))}
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
