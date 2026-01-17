

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
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        const reportDate = new Date(selectedDate).toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

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
        }, {} as Record<string, typeof purchaseOrders>);

        let stationTablesHTML = '';
        Object.entries(stationGroups).forEach(([stationName, pos]) => {
            const stationTotal = pos.reduce((sum, po) => sum + po.purchaseRequest.paymentAmount, 0);
            const stationQuantity = pos.reduce((sum, po) => sum + po.purchaseRequest.quantityLiters, 0);

            stationTablesHTML += `
                <div style="margin-bottom: 20px; border: 1px solid #d1d5db; page-break-inside: avoid;">
                    <div style="background: #f3f4f6; padding: 10px; border-bottom: 1px solid #d1d5db;">
                        <h3 style="margin: 0; font-size: 14pt;">${stationName}</h3>
                        <p style="margin: 5px 0 0 0; font-size: 10pt; color: #666;">
                            ${pos.length} PO${pos.length > 1 ? 's' : ''} • ${stationQuantity.toLocaleString()} L • ${stationTotal.toLocaleString()} SAR
                        </p>
                    </div>
                    <table style="width: 100%; border-collapse: collapse;">
                        <thead>
                            <tr style="background: #f9fafb;">
                                <th style="border: 1px solid #d1d5db; padding: 8px 4px; text-align: left; font-size: 9pt;">PO Number</th>
                                <th style="border: 1px solid #d1d5db; padding: 8px 4px; text-align: left; font-size: 9pt;">Fuel Type</th>
                                <th style="border: 1px solid #d1d5db; padding: 8px 4px; text-align: right; font-size: 9pt;">Quantity (L)</th>
                                <th style="border: 1px solid #d1d5db; padding: 8px 4px; text-align: right; font-size: 9pt;">Amount (SAR)</th>
                                <th style="border: 1px solid #d1d5db; padding: 8px 4px; text-align: left; font-size: 9pt;">Expected Delivery</th>
                                <th style="border: 1px solid #d1d5db; padding: 8px 4px; text-align: left; font-size: 9pt;">Status</th>
                                <th style="border: 1px solid #d1d5db; padding: 8px 4px; text-align: left; font-size: 9pt;">Issued At</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${pos.map(po => `
                                <tr>
                                    <td style="border: 1px solid #e5e7eb; padding: 6px 4px; font-size: 9pt; color: #2563eb;">${po.poNumber}</td>
                                    <td style="border: 1px solid #e5e7eb; padding: 6px 4px; font-size: 9pt;">${getFuelTypeLabel(po.purchaseRequest.fuelType)}</td>
                                    <td style="border: 1px solid #e5e7eb; padding: 6px 4px; font-size: 9pt; text-align: right;">${po.purchaseRequest.quantityLiters.toLocaleString()}</td>
                                    <td style="border: 1px solid #e5e7eb; padding: 6px 4px; font-size: 9pt; text-align: right; font-weight: 600;">${po.purchaseRequest.paymentAmount.toLocaleString()}</td>
                                    <td style="border: 1px solid #e5e7eb; padding: 6px 4px; font-size: 9pt;">${new Date(po.expectedDeliveryDate).toLocaleString()}</td>
                                    <td style="border: 1px solid #e5e7eb; padding: 6px 4px; font-size: 9pt;">
                                        <span style="padding: 2px 6px; border-radius: 10px; font-size: 8pt; ${po.receivedAt ? 'background: #dcfce7; color: #166534;' : 'background: #ffedd5; color: #9a3412;'}">
                                            ${po.receivedAt ? 'Received' : 'Pending'}
                                        </span>
                                    </td>
                                    <td style="border: 1px solid #e5e7eb; padding: 6px 4px; font-size: 9pt;">${new Date(po.createdAt).toLocaleString()}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `;
        });

        printWindow.document.write(`
            <html>
                <head>
                    <title>Daily PO Report - ${new Date(selectedDate).toLocaleDateString()}</title>
                    <style>
                        body {
                            font-family: Arial, sans-serif;
                            padding: 20px;
                            margin: 0;
                        }
                        h1 {
                            color: #111827;
                            border-bottom: 3px solid #3b82f6;
                            padding-bottom: 10px;
                            margin: 0 0 5px 0;
                            font-size: 20pt;
                        }
                        .subtitle {
                            color: #6b7280;
                            font-size: 11pt;
                            margin: 0 0 20px 0;
                        }
                        .summary-grid {
                            display: grid;
                            grid-template-columns: repeat(4, 1fr);
                            gap: 10px;
                            margin-bottom: 20px;
                        }
                        .summary-card {
                            border: 1px solid #e5e7eb;
                            padding: 10px;
                            border-radius: 4px;
                        }
                        .summary-card.blue { border-left: 4px solid #3b82f6; }
                        .summary-card.green { border-left: 4px solid #22c55e; }
                        .summary-card.orange { border-left: 4px solid #f97316; }
                        .summary-card.purple { border-left: 4px solid #a855f7; }
                        .summary-label {
                            font-size: 9pt;
                            color: #6b7280;
                            margin: 0 0 5px 0;
                        }
                        .summary-value {
                            font-size: 16pt;
                            font-weight: bold;
                            margin: 0;
                        }
                        .summary-value.blue { color: #111827; }
                        .summary-value.green { color: #16a34a; }
                        .summary-value.orange { color: #ea580c; }
                        .summary-value.purple { color: #9333ea; }
                        @media print {
                            button { display: none; }
                            @page {
                                size: A4 portrait;
                                margin: 15mm;
                            }
                        }
                    </style>
                </head>
                <body>
                    <h1>Daily Purchase Order Report</h1>
                    <p class="subtitle">${reportDate}</p>

                    <div class="summary-grid">
                        <div class="summary-card blue">
                            <p class="summary-label">Total POs Issued</p>
                            <p class="summary-value blue">${purchaseOrders.length}</p>
                        </div>
                        <div class="summary-card green">
                            <p class="summary-label">Received</p>
                            <p class="summary-value green">${receivedCount}</p>
                        </div>
                        <div class="summary-card orange">
                            <p class="summary-label">Pending</p>
                            <p class="summary-value orange">${pendingCount}</p>
                        </div>
                        <div class="summary-card purple">
                            <p class="summary-label">Total Amount</p>
                            <p class="summary-value purple">${totalAmount.toLocaleString()} SAR</p>
                        </div>
                    </div>

                    ${stationTablesHTML}

                    <button onclick="window.print()" style="margin-top: 20px; padding: 10px 20px; background: #3b82f6; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 11pt;">Print Report</button>
                </body>
            </html>
        `);
        printWindow.document.close();
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
                    /* Page setup */
                    @page {
                        size: A4 portrait;
                        margin: 15mm;
                    }

                    /* Reset and color preservation */
                    * {
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                        color-adjust: exact !important;
                    }

                    /* Hide everything except our content */
                    body > *:not(.fixed) {
                        display: none !important;
                    }

                    body {
                        margin: 0 !important;
                        padding: 0 !important;
                        background: white !important;
                    }

                    /* Make modal take full page */
                    .fixed {
                        position: static !important;
                        inset: 0 !important;
                        background: white !important;
                        padding: 0 !important;
                        margin: 0 !important;
                        width: 100% !important;
                        height: auto !important;
                        max-width: 100% !important;
                        max-height: none !important;
                        overflow: visible !important;
                        display: block !important;
                    }

                    /* Remove modal container styling */
                    .fixed > div {
                        max-width: 100% !important;
                        max-height: none !important;
                        box-shadow: none !important;
                        border-radius: 0 !important;
                        overflow: visible !important;
                        display: block !important;
                    }

                    /* Hide buttons and interactive elements */
                    button,
                    .print\\:hidden {
                        display: none !important;
                    }

                    /* Header */
                    .bg-gradient-to-r {
                        background: white !important;
                        border-bottom: 3px solid #3b82f6 !important;
                        padding: 15px 0 !important;
                    }

                    h2 {
                        color: #111827 !important;
                        font-size: 20pt !important;
                        margin: 0 0 5px 0 !important;
                    }

                    /* Date subtitle */
                    .text-white\\/90 {
                        color: #4b5563 !important;
                        font-size: 11pt !important;
                    }

                    /* Summary cards section */
                    .bg-gray-50 {
                        background: white !important;
                        padding: 15px 0 !important;
                        border: none !important;
                    }

                    /* Summary cards grid */
                    .grid.grid-cols-2 {
                        display: grid !important;
                        grid-template-columns: repeat(4, 1fr) !important;
                        gap: 10px !important;
                        margin-bottom: 15px !important;
                    }

                    /* Individual summary cards */
                    .bg-white.rounded-lg {
                        border: 1px solid #e5e7eb !important;
                        padding: 10px !important;
                        page-break-inside: avoid !important;
                    }

                    .border-l-4 {
                        border-left-width: 4px !important;
                    }

                    /* Summary card text */
                    .text-sm.text-gray-600 {
                        font-size: 8pt !important;
                        color: #6b7280 !important;
                    }

                    .text-2xl {
                        font-size: 14pt !important;
                    }

                    /* Content area */
                    .flex-1.overflow-y-auto {
                        overflow: visible !important;
                        padding: 0 !important;
                    }

                    /* Station groups spacing */
                    .space-y-6 > * + * {
                        margin-top: 15px !important;
                    }

                    /* Station group container */
                    .border.border-gray-200.rounded-lg {
                        border: 1px solid #d1d5db !important;
                        border-radius: 0 !important;
                        page-break-inside: avoid !important;
                        margin-bottom: 15px !important;
                    }

                    /* Station header */
                    .bg-gray-100 {
                        background-color: #f3f4f6 !important;
                        border-bottom: 1px solid #d1d5db !important;
                        padding: 8px 10px !important;
                    }

                    h3 {
                        font-size: 12pt !important;
                        margin: 0 !important;
                    }

                    /* Station summary text */
                    .text-sm.text-gray-600 {
                        font-size: 9pt !important;
                    }

                    /* Tables */
                    .overflow-x-auto {
                        overflow: visible !important;
                    }

                    table {
                        width: 100% !important;
                        border-collapse: collapse !important;
                        font-size: 9pt !important;
                    }

                    thead {
                        background-color: #f9fafb !important;
                    }

                    th {
                        background-color: #f9fafb !important;
                        border: 1px solid #d1d5db !important;
                        padding: 6px 4px !important;
                        font-size: 8pt !important;
                        font-weight: 600 !important;
                        text-align: left !important;
                    }

                    td {
                        border: 1px solid #e5e7eb !important;
                        padding: 5px 4px !important;
                        font-size: 8pt !important;
                    }

                    /* Text alignment in tables */
                    .text-right {
                        text-align: right !important;
                    }

                    .text-left {
                        text-align: left !important;
                    }

                    /* Status badges */
                    .rounded-full {
                        display: inline-block !important;
                        padding: 2px 6px !important;
                        border-radius: 10px !important;
                        font-size: 7pt !important;
                        border: 1px solid currentColor !important;
                    }

                    .bg-green-100 {
                        background-color: #dcfce7 !important;
                    }

                    .text-green-800 {
                        color: #166534 !important;
                    }

                    .bg-orange-100 {
                        background-color: #ffedd5 !important;
                    }

                    .text-orange-800 {
                        color: #9a3412 !important;
                    }

                    /* Color borders for summary cards */
                    .border-blue-500 {
                        border-left-color: #3b82f6 !important;
                    }

                    .border-green-500 {
                        border-left-color: #22c55e !important;
                    }

                    .border-orange-500 {
                        border-left-color: #f97316 !important;
                    }

                    .border-purple-500 {
                        border-left-color: #a855f7 !important;
                    }

                    /* Text colors for summary cards */
                    .text-gray-900 {
                        color: #111827 !important;
                    }

                    .text-green-600 {
                        color: #16a34a !important;
                    }

                    .text-orange-600 {
                        color: #ea580c !important;
                    }

                    .text-purple-600 {
                        color: #9333ea !important;
                    }

                    .text-blue-600 {
                        color: #2563eb !important;
                    }

                    /* Remove any transforms or positioning */
                    * {
                        transform: none !important;
                        position: static !important;
                    }

                    .fixed,
                    .fixed > div {
                        position: static !important;
                    }

                    /* Ensure no blank pages */
                    .p-6 {
                        padding: 0 !important;
                    }

                    .p-4 {
                        padding: 0 !important;
                    }

                    /* Footer - hide it */
                    .border-t.border-gray-200.bg-gray-50 {
                        display: none !important;
                    }
                }
            `}</style>
        </div>
    );
};
