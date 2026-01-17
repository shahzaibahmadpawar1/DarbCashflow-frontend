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

    const getFuelTypeLabel = (fuelType: string) => {
        switch (fuelType) {
            case '91_GASOLINE': return '91 Gasoline';
            case '95_GASOLINE': return '95 Gasoline';
            case 'DIESEL': return 'Diesel';
            default: return fuelType;
        }
    };

    // Calculate running balance
    let runningBalance = creditSummary?.totalCreditLimit || 0;
    const transactionsWithBalance = transactions.map(t => {
        const balanceBefore = runningBalance;
        if (t.type === 'UTILIZATION') {
            runningBalance -= t.amount;
        } else if (t.type === 'ALLOCATION' || t.type === 'ADJUSTMENT' || t.type === 'PAYMENT') {
            runningBalance += t.amount;
        }
        return { ...t, balanceBefore, balanceAfter: runningBalance };
    }).reverse(); // Reverse to show oldest first with correct running balance

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

                {/* Transactions List */}
                <div className="flex-1 overflow-y-auto p-6">
                    {loading ? (
                        <div className="flex justify-center items-center py-12">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                        </div>
                    ) : transactions.length === 0 ? (
                        <div className="text-center py-12">
                            <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <p className="text-gray-500 text-lg">No credit transactions found</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {transactionsWithBalance.map((transaction) => (
                                <div
                                    key={transaction.id}
                                    className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow"
                                >
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex items-start gap-3 flex-1">
                                            <div className="p-2 bg-gray-50 rounded-lg">
                                                {getTypeIcon(transaction.type)}
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(transaction.type)}`}>
                                                        {getTypeLabel(transaction.type)}
                                                    </span>
                                                    <span className="text-xs text-gray-500">
                                                        {new Date(transaction.createdAt).toLocaleString()}
                                                    </span>
                                                </div>
                                                <p className="text-sm text-gray-900 font-medium mb-1">{transaction.description}</p>
                                                <div className="flex flex-wrap gap-3 text-xs text-gray-600">
                                                    <span>By: {transaction.creator.name}</span>
                                                    {transaction.verifier && (
                                                        <span>• Verified by: {transaction.verifier.name}</span>
                                                    )}
                                                    {transaction.purchaseRequest && (
                                                        <span>• PR: {getFuelTypeLabel(transaction.purchaseRequest.fuelType)} - {transaction.purchaseRequest.quantityLiters}L</span>
                                                    )}
                                                    {transaction.purchaseOrder && (
                                                        <span>• PO: {transaction.purchaseOrder.poNumber}</span>
                                                    )}
                                                </div>
                                                {transaction.receiptUrl && (
                                                    <a
                                                        href={transaction.receiptUrl}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 mt-2"
                                                    >
                                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                                                        </svg>
                                                        View Receipt
                                                    </a>
                                                )}
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className={`text-lg font-bold ${transaction.type === 'UTILIZATION' ? 'text-red-600' : 'text-green-600'}`}>
                                                {transaction.type === 'UTILIZATION' ? '-' : '+'}{transaction.amount.toLocaleString()} SAR
                                            </p>
                                            <p className="text-xs text-gray-500 mt-1">
                                                Balance: {transaction.balanceAfter.toLocaleString()} SAR
                                            </p>
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
                            Total Transactions: {transactions.length}
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
