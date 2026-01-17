

interface PurchaseOrder {
    id: string;
    poNumber: string;
    expectedDeliveryDate: string;
    actualDeliveryDate?: string;
    invoiceNumber?: string;
    receivedAt?: string;
    createdAt: string;
    purchaseRequest: {
        fuelType: string;
        quantityLiters: number;
        paymentAmount: number;
        station: {
            name: string;
            stationType?: string;
        };
    };
}

interface DailyPOReportModalProps {
    purchaseOrders: PurchaseOrder[];
    selectedDate: string;
    onClose: () => void;
}

export const DailyPOReportModal = ({ purchaseOrders, selectedDate, onClose }: DailyPOReportModalProps) => {
    const getFuelTypeLabel = (fuelType: string) => {
        switch (fuelType) {
            case '91_GASOLINE': return '91 Gasoline';
            case '95_GASOLINE': return '95 Gasoline';
            case 'DIESEL': return 'Diesel';
            default: return fuelType;
        }
    };

    const handlePrint = () => {
        window.print();
    };

    const handleExportCSV = () => {
        let csv = 'Daily Purchase Order Report\n\n';
        csv += `Report Date: ${new Date(selectedDate).toLocaleDateString()}\n`;
        csv += `Total POs: ${purchaseOrders.length}\n\n`;

        csv += 'PO Number,Station,Station Type,Fuel Type,Quantity (L),Amount (SAR),Expected Delivery,Status,Issued At\n';

        purchaseOrders.forEach(po => {
            const status = po.receivedAt ? 'Received' : 'Pending';
            const issuedAt = new Date(po.createdAt).toLocaleString();
            const expectedDelivery = new Date(po.expectedDeliveryDate).toLocaleString();

            csv += `${po.poNumber},`;
            csv += `${po.purchaseRequest.station.name},`;
            csv += `${po.purchaseRequest.station.stationType || 'N/A'},`;
            csv += `${getFuelTypeLabel(po.purchaseRequest.fuelType)},`;
            csv += `${po.purchaseRequest.quantityLiters},`;
            csv += `${po.purchaseRequest.paymentAmount},`;
            csv += `${expectedDelivery},`;
            csv += `${status},`;
            csv += `${issuedAt}\n`;
        });

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `daily-po-report-${selectedDate}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
    };

    // Calculate totals
    const totalAmount = purchaseOrders.reduce((sum, po) => sum + po.purchaseRequest.paymentAmount, 0);
    const receivedCount = purchaseOrders.filter(po => po.receivedAt).length;
    const pendingCount = purchaseOrders.length - receivedCount;

    // Group by station
    const stationGroups = purchaseOrders.reduce((groups, po) => {
        const stationName = po.purchaseRequest.station.name;
        if (!groups[stationName]) {
            groups[stationName] = [];
        }
        groups[stationName].push(po);
        return groups;
    }, {} as Record<string, PurchaseOrder[]>);

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-blue-700 print:bg-white print:border-b-2">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-2xl font-bold text-white print:text-gray-900">Daily Purchase Order Report</h2>
                            <p className="text-white/90 mt-1 print:text-gray-600">
                                {new Date(selectedDate).toLocaleDateString('en-US', {
                                    weekday: 'long',
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric'
                                })}
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            className="text-white/80 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-lg print:hidden"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Summary Cards */}
                <div className="p-6 bg-gray-50 border-b border-gray-200 print:bg-white">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-white rounded-lg p-4 border-l-4 border-blue-500 shadow-sm">
                            <p className="text-sm text-gray-600 mb-1">Total POs Issued</p>
                            <p className="text-2xl font-bold text-gray-900">{purchaseOrders.length}</p>
                        </div>
                        <div className="bg-white rounded-lg p-4 border-l-4 border-green-500 shadow-sm">
                            <p className="text-sm text-gray-600 mb-1">Received</p>
                            <p className="text-2xl font-bold text-green-600">{receivedCount}</p>
                        </div>
                        <div className="bg-white rounded-lg p-4 border-l-4 border-orange-500 shadow-sm">
                            <p className="text-sm text-gray-600 mb-1">Pending</p>
                            <p className="text-2xl font-bold text-orange-600">{pendingCount}</p>
                        </div>
                        <div className="bg-white rounded-lg p-4 border-l-4 border-purple-500 shadow-sm">
                            <p className="text-sm text-gray-600 mb-1">Total Amount</p>
                            <p className="text-2xl font-bold text-purple-600">{totalAmount.toLocaleString()} SAR</p>
                        </div>
                    </div>
                </div>

                {/* PO List by Station */}
                <div className="flex-1 overflow-y-auto p-6">
                    {Object.keys(stationGroups).length === 0 ? (
                        <div className="text-center py-12">
                            <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <p className="text-gray-500 text-lg">No purchase orders found for this date</p>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {Object.entries(stationGroups).map(([stationName, pos]) => {
                                const stationTotal = pos.reduce((sum, po) => sum + po.purchaseRequest.paymentAmount, 0);
                                const stationQuantity = pos.reduce((sum, po) => sum + po.purchaseRequest.quantityLiters, 0);

                                return (
                                    <div key={stationName} className="border border-gray-200 rounded-lg overflow-hidden">
                                        <div className="bg-gray-100 px-4 py-3 border-b border-gray-200">
                                            <div className="flex justify-between items-center">
                                                <h3 className="font-bold text-lg text-gray-900">{stationName}</h3>
                                                <div className="text-sm text-gray-600">
                                                    <span className="font-medium">{pos.length} PO{pos.length > 1 ? 's' : ''}</span>
                                                    <span className="mx-2">•</span>
                                                    <span>{stationQuantity.toLocaleString()} L</span>
                                                    <span className="mx-2">•</span>
                                                    <span className="font-semibold">{stationTotal.toLocaleString()} SAR</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="overflow-x-auto">
                                            <table className="w-full">
                                                <thead className="bg-gray-50">
                                                    <tr>
                                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">PO Number</th>
                                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Fuel Type</th>
                                                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700">Quantity (L)</th>
                                                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700">Amount (SAR)</th>
                                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Expected Delivery</th>
                                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Status</th>
                                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Issued At</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {pos.map((po) => (
                                                        <tr key={po.id} className="border-t border-gray-100 hover:bg-gray-50">
                                                            <td className="px-4 py-3 text-sm font-medium text-blue-600">{po.poNumber}</td>
                                                            <td className="px-4 py-3 text-sm text-gray-900">{getFuelTypeLabel(po.purchaseRequest.fuelType)}</td>
                                                            <td className="px-4 py-3 text-sm text-right text-gray-900">{po.purchaseRequest.quantityLiters.toLocaleString()}</td>
                                                            <td className="px-4 py-3 text-sm text-right font-medium text-gray-900">{po.purchaseRequest.paymentAmount.toLocaleString()}</td>
                                                            <td className="px-4 py-3 text-sm text-gray-600">{new Date(po.expectedDeliveryDate).toLocaleString()}</td>
                                                            <td className="px-4 py-3 text-sm">
                                                                {po.receivedAt ? (
                                                                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                                        Received
                                                                    </span>
                                                                ) : (
                                                                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                                                                        Pending
                                                                    </span>
                                                                )}
                                                            </td>
                                                            <td className="px-4 py-3 text-sm text-gray-600">{new Date(po.createdAt).toLocaleString()}</td>
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
                <div className="p-4 border-t border-gray-200 bg-gray-50 print:hidden">
                    <div className="flex justify-between items-center">
                        <p className="text-sm text-gray-600">
                            Generated on {new Date().toLocaleString()}
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={handleExportCSV}
                                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                            >
                                Export CSV
                            </button>
                            <button
                                onClick={handlePrint}
                                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                            >
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

            {/* Print Styles */}
            <style>{`
                @media print {
                    body * {
                        visibility: hidden;
                    }
                    .fixed, .fixed * {
                        visibility: visible;
                    }
                    .fixed {
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 100%;
                        height: auto;
                        overflow: visible;
                    }
                    .print\\:hidden {
                        display: none !important;
                    }
                    .print\\:bg-white {
                        background-color: white !important;
                    }
                    .print\\:text-gray-900 {
                        color: #111827 !important;
                    }
                    .print\\:text-gray-600 {
                        color: #4b5563 !important;
                    }
                    .print\\:border-b-2 {
                        border-bottom-width: 2px !important;
                    }
                }
            `}</style>
        </div>
    );
};
