import { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import { PurchaseOrderDetailsModal } from '../components/purchase/PurchaseOrderDetailsModal';

interface PurchaseOrder {
    id: string;
    poNumber: string;
    expectedDeliveryDate: string;
    receivedAt?: string;
    procurementConfirmedAt?: string;
    aramcoPoNumber?: string;
    aramcoPoDate?: string;
    aramcoPoUrl?: string;
    receivedQuantityLiters?: number;
    receivedAmount?: number;
    creditVariance?: number;
    actualTransportationCost?: number;
    transporter?: { name: string };
    purchaseRequest: {
        fuelType: string;
        quantityLiters: number;
        buyingPricePerLiter: number;
        transportationCost: number;
        totalAmount: number;
        paymentAmount: number;
        paymentVerified?: boolean;
        paymentVerifiedAt?: string;
        paymentVerifiedBy?: { id: string; name: string; employeeId?: string };
        approvedAt?: string;
        approvedBy?: { id: string; name: string; employeeId?: string };
        createdAt?: string;
        creator?: { id: string; name: string; employeeId?: string };
        station: {
            name: string;
        };
    };
}

export const ProcurementDashboard = () => {
    const [pendingPOs, setPendingPOs] = useState<PurchaseOrder[]>([]);
    const [allPOs, setAllPOs] = useState<PurchaseOrder[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedPO, setSelectedPO] = useState<any>(null);
    const [activeTab, setActiveTab] = useState<'pending' | 'all'>('pending');

    // Date filtering state
    const [dateFilterType, setDateFilterType] = useState<'all' | 'single' | 'range'>('all');
    const [singleDate, setSingleDate] = useState(new Date().toISOString().slice(0, 10));
    const [startDate, setStartDate] = useState(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10));
    const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10));

    const printRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        fetchPOs();
    }, []);

    const fetchPOs = async () => {
        try {
            setLoading(true);
            const [pendingRes, allRes] = await Promise.all([
                api.get('/api/procurement/pending'),
                api.get('/api/procurement/all'),
            ]);

            setPendingPOs(pendingRes.data.purchaseOrders || []);
            setAllPOs(allRes.data.purchaseOrders || []);
        } catch (error) {
            console.error('Error fetching POs:', error);
            alert('Failed to fetch purchase orders');
        } finally {
            setLoading(false);
        }
    };

    const getFuelTypeLabel = (fuelType: string) => {
        switch (fuelType) {
            case '91_GASOLINE': return '91 Gasoline';
            case '95_GASOLINE': return '95 Gasoline';
            case '98_GASOLINE': return '98 Gasoline';
            case 'DIESEL': return 'Diesel';
            default: return fuelType;
        }
    };

    const getStatusBadge = (po: PurchaseOrder) => {
        if (po.receivedAt) {
            return <span className="px-3 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded-full">Received</span>;
        }
        if (po.procurementConfirmedAt) {
            return <span className="px-3 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded-full">Confirmed</span>;
        }
        return <span className="px-3 py-1 bg-yellow-100 text-yellow-800 text-xs font-semibold rounded-full">Pending</span>;
    };

    const filterPOsByDate = (pos: PurchaseOrder[]) => {
        if (dateFilterType === 'all') return pos;

        return pos.filter(po => {
            const poDate = new Date(po.receivedAt || po.expectedDeliveryDate);

            if (dateFilterType === 'single') {
                const filterDate = new Date(singleDate);
                return poDate.toDateString() === filterDate.toDateString();
            } else if (dateFilterType === 'range') {
                const start = new Date(startDate);
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                return poDate >= start && poDate <= end;
            }
            return true;
        });
    };

    const handlePrint = () => {
        const printContent = printRef.current;
        if (!printContent) return;

        const printWindow = window.open('', '', 'width=1200,height=800');
        if (!printWindow) return;

        printWindow.document.write('<html><head><title>Procurement Report</title>');
        printWindow.document.write('<style>');
        printWindow.document.write(`
            body { font-family: Arial, sans-serif; margin: 20px; }
            h1 { color: #1f2937; margin-bottom: 10px; }
            .header { margin-bottom: 20px; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px; }
            .date-info { color: #6b7280; font-size: 14px; margin-bottom: 10px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #e5e7eb; padding: 8px; text-align: left; font-size: 12px; }
            th { background-color: #f9fafb; font-weight: 600; color: #374151; }
            .status-received { background-color: #d1fae5; color: #065f46; padding: 4px 8px; border-radius: 9999px; font-size: 11px; }
            .status-confirmed { background-color: #dbeafe; color: #1e40af; padding: 4px 8px; border-radius: 9999px; font-size: 11px; }
            .status-pending { background-color: #fef3c7; color: #92400e; padding: 4px 8px; border-radius: 9999px; font-size: 11px; }
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

    const displayPOs = filterPOsByDate(activeTab === 'pending' ? pendingPOs : allPOs);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-gray-600">Loading...</div>
            </div>
        );
    }

    return (
        <div className="p-6">
            <div className="mb-6 flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Procurement Dashboard</h1>
                    <p className="text-gray-600 mt-2">Manage purchase orders for your assigned stations</p>
                </div>
                <button
                    onClick={handlePrint}
                    disabled={displayPOs.length === 0}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                    </svg>
                    Print Report
                </button>
            </div>

            {/* Tabs */}
            <div className="mb-6 border-b border-gray-200">
                <nav className="flex gap-4">
                    <button
                        onClick={() => setActiveTab('pending')}
                        className={`pb-3 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === 'pending'
                            ? 'border-primary text-primary'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                    >
                        Pending Confirmation ({pendingPOs.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('all')}
                        className={`pb-3 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === 'all'
                            ? 'border-primary text-primary'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                    >
                        All Purchase Orders ({allPOs.length})
                    </button>
                </nav>
            </div>

            {/* Date Filter */}
            <div className="mb-6 bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                <label className="block text-sm font-medium text-gray-700 mb-3">Date Filter</label>
                <div className="flex flex-wrap gap-2 items-end">
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

            {/* Info Box */}
            <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-blue-900 mb-2">📋 Your Responsibilities</h3>
                <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                    <li>Review and confirm purchase orders after Office User approval</li>
                    <li>Enter Aramco PO number and date</li>
                    <li>Upload Aramco PO document (optional)</li>
                    <li>After confirmation, PO will be sent to Station Manager for receiving</li>
                </ul>
            </div>

            {/* Purchase Orders Table */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
                {displayPOs.length === 0 ? (
                    <div className="text-center py-12">
                        <p className="text-gray-500">
                            {activeTab === 'pending'
                                ? 'No pending purchase orders'
                                : 'No purchase orders found'}
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        PO Number
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Station
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Fuel Type
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Ordered Qty (L)
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Ordered Amt (SAR)
                                    </th>
                                    {activeTab === 'all' && (
                                        <>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Received Qty (L)
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Received Amt (SAR)
                                            </th>
                                        </>
                                    )}
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Expected Delivery
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Status
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {displayPOs.map((po) => (
                                    <tr key={po.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-medium text-gray-900">{po.poNumber}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-900">{po.purchaseRequest.station.name}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-900">
                                                {getFuelTypeLabel(po.purchaseRequest.fuelType)}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-900">
                                                {po.purchaseRequest.quantityLiters.toLocaleString()}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-900">
                                                {po.purchaseRequest.totalAmount.toLocaleString()}
                                            </div>
                                        </td>
                                        {activeTab === 'all' && (
                                            <>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-sm text-gray-900">
                                                        {po.receivedQuantityLiters
                                                            ? po.receivedQuantityLiters.toLocaleString()
                                                            : <span className="text-gray-400">-</span>
                                                        }
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-sm text-gray-900">
                                                        {po.receivedAmount
                                                            ? po.receivedAmount.toLocaleString()
                                                            : <span className="text-gray-400">-</span>
                                                        }
                                                    </div>
                                                </td>
                                            </>
                                        )}
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-900">
                                                {new Date(po.expectedDeliveryDate).toLocaleString()}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {getStatusBadge(po)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                                            <button
                                                onClick={() => setSelectedPO(po)}
                                                className="text-primary hover:text-primary/80 font-medium"
                                            >
                                                {po.procurementConfirmedAt ? 'View Details' : 'Confirm'}
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Hidden Printable Report */}
            <div className="hidden">
                <div ref={printRef}>
                    <div className="header">
                        <h1>Procurement Report</h1>
                        <div className="date-info">
                            Generated on: {new Date().toLocaleString()}
                            {dateFilterType === 'single' && ` | Date: ${singleDate}`}
                            {dateFilterType === 'range' && ` | Period: ${startDate} to ${endDate}`}
                        </div>
                        <div className="date-info">
                            Tab: {activeTab === 'pending' ? 'Pending Confirmation' : 'All Purchase Orders'} |
                            Total Records: {displayPOs.length}
                        </div>
                    </div>

                    <table>
                        <thead>
                            <tr>
                                <th>PO Number</th>
                                <th>Station</th>
                                <th>Fuel Type</th>
                                <th>Ordered Qty (L)</th>
                                <th>Ordered Amt (SAR)</th>
                                <th>Received Qty (L)</th>
                                <th>Received Amt (SAR)</th>
                                <th>Expected Delivery</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {displayPOs.map((po) => (
                                <tr key={po.id}>
                                    <td>{po.poNumber}</td>
                                    <td>{po.purchaseRequest.station.name}</td>
                                    <td>{getFuelTypeLabel(po.purchaseRequest.fuelType)}</td>
                                    <td>{po.purchaseRequest.quantityLiters.toLocaleString()}</td>
                                    <td>{po.purchaseRequest.totalAmount.toLocaleString()}</td>
                                    <td>{po.receivedQuantityLiters?.toLocaleString() || '-'}</td>
                                    <td>{po.receivedAmount?.toLocaleString() || '-'}</td>
                                    <td>{new Date(po.expectedDeliveryDate).toLocaleDateString()}</td>
                                    <td>
                                        {po.receivedAt ? (
                                            <span className="status-received">Received</span>
                                        ) : po.procurementConfirmedAt ? (
                                            <span className="status-confirmed">Confirmed</span>
                                        ) : (
                                            <span className="status-pending">Pending</span>
                                        )}
                                    </td>
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

            {/* PO Details Modal */}
            {selectedPO && (
                <PurchaseOrderDetailsModal
                    purchaseOrder={selectedPO}
                    onClose={() => setSelectedPO(null)}
                    onSuccess={() => {
                        setSelectedPO(null);
                        fetchPOs();
                    }}
                />
            )}
        </div>
    );
};
