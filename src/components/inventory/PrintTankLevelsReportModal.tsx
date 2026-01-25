import { useState, useEffect } from 'react';
import api from '../../services/api';

interface TankerDelivery {
    id: string;
    fuelType: string;
    litersDelivered: number;
    deliveryDate: string;
    openingBalance?: number;
    consumption?: number;
    tankId: string;
}

interface PrintTankDeliveryReportModalProps {
    stationId: string;
    stationName: string;
    onClose: () => void;
}

export const PrintTankDeliveryReportModal = ({ stationId, stationName, onClose }: PrintTankDeliveryReportModalProps) => {
    const [deliveries, setDeliveries] = useState<TankerDelivery[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        loadDeliveries();
    }, [stationId]);

    const loadDeliveries = async () => {
        try {
            setLoading(true);
            const res = await api.get(`/api/inventory/stations/${stationId}/deliveries`);
            setDeliveries(res.data.deliveries || []);
        } catch (error) {
            console.error('Failed to load deliveries:', error);
            alert('Failed to load delivery data');
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

    const handlePrint = () => {
        const printWindow = window.open('', '', 'width=1200,height=800');
        if (!printWindow) return;

        const reportDate = new Date().toLocaleDateString();
        const generatedOn = new Date().toLocaleString();

        const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <title>Fuel Tank Delivery Report</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: Arial, sans-serif; 
            padding: 40px;
            color: #333;
        }
        .header {
            border-bottom: 2px solid #333;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }
        h1 { 
            font-size: 24pt;
            margin-bottom: 20px;
            color: #000;
        }
        .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin-bottom: 30px;
        }
        .info-item {
            display: flex;
            flex-direction: column;
        }
        .info-label {
            font-size: 10pt;
            color: #666;
            margin-bottom: 4px;
        }
        .info-value {
            font-size: 12pt;
            color: #000;
            font-weight: normal;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 30px;
        }
        th {
            background-color: #2563eb;
            color: white;
            padding: 10px 8px;
            text-align: left;
            font-size: 9pt;
            font-weight: 600;
            text-transform: uppercase;
        }
        td {
            padding: 8px;
            border-bottom: 1px solid #e5e7eb;
            font-size: 9pt;
        }
        tr:nth-child(even) {
            background-color: #f9fafb;
        }
        .text-right {
            text-align: right;
        }
        .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #ddd;
            text-align: center;
            font-size: 9pt;
            color: #666;
        }
        @media print {
            @page { 
                margin: 0.5in;
                size: landscape;
            }
            body { 
                print-color-adjust: exact; 
                -webkit-print-color-adjust: exact;
                padding: 0;
            }
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>Fuel Tank Delivery Report</h1>
        <div class="info-grid">
            <div class="info-item">
                <span class="info-label">Station Name:</span>
                <span class="info-value">${stationName}</span>
            </div>
            <div class="info-item">
                <span class="info-label">Report Date:</span>
                <span class="info-value">${reportDate}</span>
            </div>
            <div class="info-item">
                <span class="info-label">Generated On:</span>
                <span class="info-value">${generatedOn}</span>
            </div>
        </div>
    </div>

    <table>
        <thead>
            <tr>
                <th>Date</th>
                <th>Fuel Type</th>
                <th class="text-right">Opening Balance (L)</th>
                <th class="text-right">Consumption (L)</th>
                <th class="text-right">Tanker Liter (L)</th>
                <th class="text-right">Total Liters (L)</th>
            </tr>
        </thead>
        <tbody>
            ${deliveries.map(d => {
            const opening = d.openingBalance || 0;
            const consumption = d.consumption || 0;
            const delivery = d.litersDelivered || 0;
            const total = (opening + delivery) - consumption;

            return `
                    <tr>
                        <td>${new Date(d.deliveryDate).toLocaleDateString()}</td>
                        <td>${getFuelTypeLabel(d.fuelType)}</td>
                        <td class="text-right">${opening.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        <td class="text-right">${consumption.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        <td class="text-right">${delivery.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        <td class="text-right">${total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    </tr>
                `;
        }).join('')}
        </tbody>
    </table>

    <div class="footer">
        <p>This is a computer-generated report. No signature is required.</p>
        <p>Darb Station - Fuel Management System</p>
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
            <div className="bg-white rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-blue-700">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-2xl font-bold text-white">Fuel Tank Delivery Report</h2>
                            <p className="text-white/90 mt-1">{stationName}</p>
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

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {loading ? (
                        <div className="text-center py-12">
                            <p className="text-gray-500">Loading...</p>
                        </div>
                    ) : deliveries.length === 0 ? (
                        <div className="text-center py-12">
                            <p className="text-gray-500">No delivery records found</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto border border-gray-200 rounded-lg">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-blue-600">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Date</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Fuel Type</th>
                                        <th className="px-4 py-3 text-right text-xs font-medium text-white uppercase tracking-wider">Opening Balance</th>
                                        <th className="px-4 py-3 text-right text-xs font-medium text-white uppercase tracking-wider">Consumption</th>
                                        <th className="px-4 py-3 text-right text-xs font-medium text-white uppercase tracking-wider">Tanker Liter</th>
                                        <th className="px-4 py-3 text-right text-xs font-medium text-white uppercase tracking-wider">Total Liters</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {deliveries.map((d) => {
                                        const opening = d.openingBalance || 0;
                                        const consumption = d.consumption || 0;
                                        const delivery = d.litersDelivered || 0;
                                        const total = (opening + delivery) - consumption;

                                        return (
                                            <tr key={d.id} className="hover:bg-gray-50">
                                                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                                    {new Date(d.deliveryDate).toLocaleDateString()}
                                                </td>
                                                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                                    {getFuelTypeLabel(d.fuelType)}
                                                </td>
                                                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                                                    {opening.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                </td>
                                                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                                                    {consumption.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                </td>
                                                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-medium">
                                                    {delivery.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                </td>
                                                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-bold text-blue-600">
                                                    {total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
                    <div className="flex justify-end gap-3">
                        <button
                            onClick={handlePrint}
                            disabled={loading || deliveries.length === 0}
                            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                            </svg>
                            Print
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
    );
};
