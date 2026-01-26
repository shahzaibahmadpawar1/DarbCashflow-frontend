import { useState, useEffect } from 'react';
import api from '../services/api';

interface CreditTransaction {
    id: string;
    type: 'ALLOCATION' | 'UTILIZATION' | 'PAYMENT' | 'ADJUSTMENT';
    amount: number;
    description: string;
    receiptUrl?: string;
    createdAt: string;
    verifiedAt?: string;
    creator: {
        name: string;
        employeeId: string;
    };
    verifier?: {
        name: string;
        employeeId: string;
    };
    purchaseRequest?: {
        id: string;
        fuelType: string;
        quantityLiters: number;
    };
    purchaseOrder?: {
        id: string;
        poNumber: string;
    };
}

interface CreditHistoryModalProps {
    stationId: string;
    stationName: string;
    onClose: () => void;
}

export const CreditHistoryModal = ({ stationId, stationName, onClose }: CreditHistoryModalProps) => {
    const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [creditSummary, setCreditSummary] = useState<{
        totalCreditLimit: number;
        utilizedCredits: number;
        availableCredits: number;
    } | null>(null);

    const [dateFilterType, setDateFilterType] = useState<'all' | 'single' | 'range'>('all');
    const [singleDate, setSingleDate] = useState(new Date().toISOString().slice(0, 10));
    const [startDate, setStartDate] = useState(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10));
    const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10));

    useEffect(() => {
        loadCreditHistory();
    }, [stationId]);

    const loadCreditHistory = async () => {
        try {
            setLoading(true);
            const [historyRes, summaryRes] = await Promise.all([
                api.get(`/api/credit-transactions/${stationId}`),
                api.get(`/api/credit-transactions/${stationId}/summary`),
            ]);
            setTransactions(historyRes.data.transactions || []);
            setCreditSummary(summaryRes.data.station || null);
        } catch (error) {
            console.error('Failed to load credit history:', error);
        } finally {
            setLoading(false);
        }
    };

    // Help group transactions by PO and cycle
    const groupTransactionsByCycle = () => {
        // First, calculate running balance for all individual transactions (oldest first)
        const sorted = [...transactions].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

        let currentBal = 0;
        const withBalance = sorted.map(t => {
            if (t.type === 'UTILIZATION') {
                currentBal -= t.amount;
            } else {
                currentBal += t.amount;
            }
            return { ...t, runningBalance: currentBal };
        });

        // Group by PO ID or PR ID
        const groups: Record<string, any> = {};
        const standalone: any[] = [];

        withBalance.forEach(t => {
            const cycleKey = t.purchaseOrder?.id || t.purchaseRequest?.id;

            if (cycleKey) {
                if (!groups[cycleKey]) {
                    groups[cycleKey] = {
                        id: cycleKey,
                        date: t.createdAt,
                        poNumber: t.purchaseOrder?.poNumber || 'N/A',
                        description: t.description,
                        creditUsed: 0,
                        bankDeposit: 0,
                        otherAmount: 0,
                        balance: 0,
                        isCycle: true,
                        transactions: []
                    };
                }

                groups[cycleKey].transactions.push(t);
                // Update latest balance for this cycle
                groups[cycleKey].balance = t.runningBalance;
                groups[cycleKey].date = t.createdAt; // Use latest transaction date for the cycle

                if (t.type === 'UTILIZATION') {
                    groups[cycleKey].creditUsed += t.amount;
                } else if (t.type === 'PAYMENT') {
                    groups[cycleKey].bankDeposit += t.amount;
                } else {
                    groups[cycleKey].otherAmount += t.amount;
                }

                // Keep the description if it contains PO info
                if (t.description.includes('PO-') || t.description.includes('PO ')) {
                    groups[cycleKey].description = t.description;
                }
            } else {
                standalone.push({
                    ...t,
                    isCycle: false,
                    creditUsed: t.type === 'UTILIZATION' ? t.amount : 0,
                    bankDeposit: t.type === 'PAYMENT' ? t.amount : 0,
                    otherAmount: (t.type !== 'UTILIZATION' && t.type !== 'PAYMENT') ? t.amount : 0,
                    balance: t.runningBalance
                });
            }
        });

        const allGrouped = [...Object.values(groups), ...standalone];
        return allGrouped.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    };

    const filterByDate = (history: any[]) => {
        if (dateFilterType === 'all') return history;

        return history.filter(item => {
            const itemDate = new Date(item.date || item.createdAt);

            if (dateFilterType === 'single') {
                const filterDate = new Date(singleDate);
                // Adjust for timezone to compare dates correctly
                return itemDate.getFullYear() === filterDate.getFullYear() &&
                    itemDate.getMonth() === filterDate.getMonth() &&
                    itemDate.getDate() === filterDate.getDate();
            } else if (dateFilterType === 'range') {
                const start = new Date(startDate);
                const end = new Date(endDate);
                start.setHours(0, 0, 0, 0);
                end.setHours(23, 59, 59, 999);
                return itemDate >= start && itemDate <= end;
            }
            return true;
        });
    };

    const groupedHistory = groupTransactionsByCycle();
    const filteredHistory = filterByDate(groupedHistory);

    const handlePrint = () => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        // Generate transaction rows HTML
        const transactionRowsHTML = filteredHistory.map(t => {
            const creditIn = (t.bankDeposit || 0) + (t.otherAmount || 0);
            return `
                <tr>
                    <td style="border: 1px solid #e5e7eb; padding: 6px 4px; font-size: 8pt;">${new Date(t.date).toLocaleString()}</td>
                    <td style="border: 1px solid #e5e7eb; padding: 6px 4px; font-size: 8pt;">${t.isCycle ? (t.poNumber || 'N/A') : '-'}</td>
                    <td style="border: 1px solid #e5e7eb; padding: 6px 4px; font-size: 8pt;">${t.description}</td>
                    <td style="border: 1px solid #e5e7eb; padding: 6px 4px; font-size: 8pt; text-align: right; color: #dc2626;">
                        ${t.creditUsed > 0 ? `-${t.creditUsed.toLocaleString()} SAR` : '-'}
                    </td>
                    <td style="border: 1px solid #e5e7eb; padding: 6px 4px; font-size: 8pt; text-align: right; color: #16a34a;">
                        ${creditIn !== 0 ? `${creditIn > 0 ? '+' : ''}${creditIn.toLocaleString()} SAR` : '-'}
                    </td>
                    <td style="border: 1px solid #e5e7eb; padding: 6px 4px; font-size: 8pt; text-align: right; font-weight: 600;">
                        ${t.balance.toLocaleString()} SAR
                    </td>
                </tr>
            `;
        }).join('');

        printWindow.document.write(`
            <html>
                <head>
                    <title>Credit History - ${stationName}</title>
                    <style>
                        body {
                            font-family: Arial, sans-serif;
                            padding: 20px;
                            margin: 0;
                        }
                        h1 {
                            color: #111827;
                            border-bottom: 3px solid #f97316;
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
                            grid-template-columns: repeat(3, 1fr);
                            gap: 10px;
                            margin-bottom: 20px;
                        }
                        .summary-card {
                            border: 1px solid #e5e7eb;
                            padding: 10px;
                            border-radius: 4px;
                        }
                        .summary-card.blue { border-left: 4px solid #3b82f6; }
                        .summary-card.red { border-left: 4px solid #ef4444; }
                        .summary-card.green { border-left: 4px solid #22c55e; }
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
                        .summary-value.red { color: #dc2626; }
                        .summary-value.green { color: #16a34a; }
                        table {
                            width: 100%;
                            border-collapse: collapse;
                            margin-top: 20px;
                        }
                        th {
                            background: #f9fafb;
                            border: 1px solid #d1d5db;
                            padding: 8px 4px;
                            text-align: left;
                            font-size: 9pt;
                            font-weight: 600;
                        }
                        td {
                            border: 1px solid #e5e7eb;
                            padding: 6px 4px;
                            font-size: 9pt;
                        }
                        .text-right {
                            text-align: right;
                        }
                        @media print {
                            button { display: none; }
                            @page {
                                size: A4 landscape;
                                margin: 15mm;
                            }
                        }
                    </style>
                </head>
                <body>
                    <h1>Credit History Report</h1>
                    <p class="subtitle">${stationName} • Generated on ${new Date().toLocaleString()}${dateFilterType === 'single' ? ` • Date: ${singleDate}` :
                dateFilterType === 'range' ? ` • Period: ${startDate} to ${endDate}` : ''
            }</p>

                    <div class="summary-grid">
                        <div class="summary-card blue">
                            <p class="summary-label">Total Credit Limit</p>
                            <p class="summary-value blue">${creditSummary?.totalCreditLimit.toLocaleString() || 0} SAR</p>
                        </div>
                        <div class="summary-card red">
                            <p class="summary-label">Utilized Credits</p>
                            <p class="summary-value red">${creditSummary?.utilizedCredits.toLocaleString() || 0} SAR</p>
                        </div>
                        <div class="summary-card green">
                            <p class="summary-label">Available Credits</p>
                            <p class="summary-value green">${creditSummary?.availableCredits.toLocaleString() || 0} SAR</p>
                        </div>
                    </div>

                    <h2 style="font-size: 14pt; color: #374151; margin: 20px 0 10px 0;">Transaction History</h2>
                    <p style="font-size: 9pt; color: #6b7280; margin: 0 0 10px 0;">Total Transactions: ${filteredHistory.length}</p>

                    <table>
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>PO #</th>
                                <th>Description</th>
                                <th class="text-right">Credit Used</th>
                                <th class="text-right">Credit In / Payment</th>
                                <th class="text-right">Balance</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${transactionRowsHTML}
                        </tbody>
                    </table>

                    <button onclick="window.print()" style="margin-top: 20px; padding: 10px 20px; background: #3b82f6; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 11pt;">Print Report</button>
                </body>
            </html>
        `);
        printWindow.document.close();
    };

    const handleExportToExcel = () => {
        if (filteredHistory.length === 0) {
            alert('No transactions to export');
            return;
        }

        // Create CSV content
        const headers = ['Date', 'PO #', 'Description', 'Credit Used (SAR)', 'Credit In / Payment (SAR)', 'Balance (SAR)'];
        const csvRows = [headers.join(',')];

        filteredHistory.forEach(t => {
            const creditIn = (t.bankDeposit || 0) + (t.otherAmount || 0);
            const row = [
                new Date(t.date).toLocaleString(),
                t.poNumber || '-',
                `"${t.description.replace(/"/g, '""')}"`,
                t.creditUsed > 0 ? `-${t.creditUsed}` : '0',
                creditIn !== 0 ? `${creditIn > 0 ? '+' : ''}${creditIn}` : '0',
                t.balance
            ];
            csvRows.push(row.join(','));
        });

        // Add summary at the end
        csvRows.push('');
        csvRows.push('Summary');
        csvRows.push(`Total Credit Limit,${creditSummary?.totalCreditLimit || 0}`);
        csvRows.push(`Utilized Credits,${creditSummary?.utilizedCredits || 0}`);
        csvRows.push(`Available Credits,${creditSummary?.availableCredits || 0}`);

        // Create and download file
        const csvContent = csvRows.join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `credit_history_${stationName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const getTypeLabel = (type: string) => {
        switch (type) {
            case 'ALLOCATION': return 'Credit Allocated';
            case 'UTILIZATION': return 'Credit Used';
            case 'PAYMENT': return 'Payment Made';
            case 'ADJUSTMENT': return 'Adjustment';
            default: return type;
        }
    };

    const getTypeColor = (type: string) => {
        switch (type) {
            case 'ALLOCATION': return 'bg-green-100 text-green-800';
            case 'UTILIZATION': return 'bg-red-100 text-red-800';
            case 'PAYMENT': return 'bg-blue-100 text-blue-800';
            case 'ADJUSTMENT': return 'bg-yellow-100 text-yellow-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'ALLOCATION':
                return (
                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                );
            case 'UTILIZATION':
                return (
                    <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                    </svg>
                );
            case 'PAYMENT':
                return (
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                );
            case 'ADJUSTMENT':
                return (
                    <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                );
            default:
                return null;
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-primary to-primary/80">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-2xl font-bold text-white">Credit History</h2>
                            <p className="text-white/90 mt-1">{stationName}</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={handleExportToExcel}
                                disabled={loading || transactions.length === 0}
                                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Export to Excel"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                Export
                            </button>
                            <button
                                onClick={handlePrint}
                                disabled={loading || transactions.length === 0}
                                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Print Report"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                                </svg>
                                Print
                            </button>
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
                </div>

                {/* Credit Summary */}
                {creditSummary && (
                    <div className="p-6 bg-gray-50 border-b border-gray-200">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="bg-white rounded-lg p-4 border-l-4 border-blue-500">
                                <p className="text-sm text-gray-600 mb-1">Total Credit Limit</p>
                                <p className="text-2xl font-bold text-gray-900">{creditSummary.totalCreditLimit.toLocaleString()} SAR</p>
                            </div>
                            <div className="bg-white rounded-lg p-4 border-l-4 border-red-500">
                                <p className="text-sm text-gray-600 mb-1">Utilized Credits</p>
                                <p className="text-2xl font-bold text-red-600">{creditSummary.utilizedCredits.toLocaleString()} SAR</p>
                            </div>
                            <div className="bg-white rounded-lg p-4 border-l-4 border-green-500">
                                <p className="text-sm text-gray-600 mb-1">Available Credits</p>
                                <p className="text-2xl font-bold text-green-600">{creditSummary.availableCredits.toLocaleString()} SAR</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Date Filter Selection */}
                <div className="p-6 bg-white border-b border-gray-100">
                    <div className="flex flex-wrap gap-4 items-end">
                        <div className="flex-1">
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Date Filter</label>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setDateFilterType('all')}
                                    className={`px-4 py-2 rounded-lg font-medium transition-all ${dateFilterType === 'all'
                                        ? 'bg-primary text-white shadow-md'
                                        : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200'
                                        }`}
                                >
                                    All Time
                                </button>
                                <button
                                    onClick={() => setDateFilterType('single')}
                                    className={`px-4 py-2 rounded-lg font-medium transition-all ${dateFilterType === 'single'
                                        ? 'bg-primary text-white shadow-md'
                                        : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200'
                                        }`}
                                >
                                    Single Date
                                </button>
                                <button
                                    onClick={() => setDateFilterType('range')}
                                    className={`px-4 py-2 rounded-lg font-medium transition-all ${dateFilterType === 'range'
                                        ? 'bg-primary text-white shadow-md'
                                        : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200'
                                        }`}
                                >
                                    Date Range
                                </button>
                            </div>
                        </div>

                        {dateFilterType === 'single' && (
                            <div className="animate-in fade-in slide-in-from-left-2 duration-300">
                                <label className="block text-xs font-medium text-gray-500 mb-1">Select Date</label>
                                <input
                                    type="date"
                                    value={singleDate}
                                    onChange={(e) => setSingleDate(e.target.value)}
                                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none bg-white shadow-sm"
                                />
                            </div>
                        )}

                        {dateFilterType === 'range' && (
                            <div className="flex gap-3 animate-in fade-in slide-in-from-left-2 duration-300">
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 mb-1">From</label>
                                    <input
                                        type="date"
                                        value={startDate}
                                        onChange={(e) => setStartDate(e.target.value)}
                                        className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none bg-white shadow-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 mb-1">To</label>
                                    <input
                                        type="date"
                                        value={endDate}
                                        onChange={(e) => setEndDate(e.target.value)}
                                        className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none bg-white shadow-sm"
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Transactions List */}
                <div className="flex-1 overflow-y-auto p-6 bg-gray-50/30">
                    {loading ? (
                        <div className="flex justify-center items-center py-12">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                        </div>
                    ) : filteredHistory.length === 0 ? (
                        <div className="text-center py-12 bg-white rounded-xl border border-dashed border-gray-300">
                            <svg className="w-16 h-16 text-gray-200 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <p className="text-gray-400 text-lg font-medium">No transactions found for the selected period</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {filteredHistory.map((group) => (
                                <div
                                    key={group.id}
                                    className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow"
                                >
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex items-start gap-3 flex-1">
                                            <div className="p-2 bg-gray-50 rounded-lg">
                                                {group.creditUsed > 0 ? getTypeIcon('UTILIZATION') : getTypeIcon('PAYMENT')}
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${group.isCycle ? 'bg-primary/10 text-primary' : getTypeColor(group.transactions?.[0]?.type || 'ALLOCATION')}`}>
                                                        {group.isCycle ? 'PO Cycle' : getTypeLabel(group.transactions?.[0]?.type || 'ALLOCATION')}
                                                    </span>
                                                    <span className="text-xs text-gray-500">
                                                        {new Date(group.date).toLocaleString()}
                                                    </span>
                                                </div>
                                                <p className="text-sm text-gray-900 font-medium mb-1">{group.description}</p>
                                                <div className="flex flex-wrap gap-3 text-xs text-gray-600">
                                                    {group.poNumber && group.poNumber !== 'N/A' && (
                                                        <span>• PO: {group.poNumber}</span>
                                                    )}
                                                    {group.isCycle && (
                                                        <span className="text-gray-400">Contains {group.transactions.length} events</span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex gap-8">
                                            {group.creditUsed > 0 && (
                                                <div className="text-right min-w-[100px]">
                                                    <p className="text-xs text-gray-500 mb-1 font-medium">Credit Used</p>
                                                    <p className="text-sm font-bold text-red-600">
                                                        -{group.creditUsed.toLocaleString()} SAR
                                                    </p>
                                                </div>
                                            )}
                                            {group.bankDeposit > 0 && (
                                                <div className="text-right min-w-[100px]">
                                                    <p className="text-xs text-gray-500 mb-1 font-medium">Bank Deposit</p>
                                                    <p className="text-sm font-bold text-green-600">
                                                        +{group.bankDeposit.toLocaleString()} SAR
                                                    </p>
                                                </div>
                                            )}
                                            {group.otherAmount !== 0 && (
                                                <div className="text-right min-w-[100px]">
                                                    <p className="text-xs text-gray-500 mb-1 font-medium">Amount</p>
                                                    <p className={`text-sm font-bold ${group.otherAmount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                        {group.otherAmount >= 0 ? '+' : ''}{group.otherAmount.toLocaleString()} SAR
                                                    </p>
                                                </div>
                                            )}
                                            <div className="text-right min-w-[120px]">
                                                <p className="text-xs text-gray-500 mb-1 font-medium">Running Balance</p>
                                                <p className="text-sm font-bold text-gray-900 bg-gray-50 px-2 py-0.5 rounded">
                                                    {group.balance.toLocaleString()} SAR
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-gray-200 bg-gray-50">
                    <div className="flex justify-between items-center">
                        <p className="text-sm text-gray-600">
                            Total Items: {filteredHistory.length}
                        </p>
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
