import { useState, useEffect } from 'react';
import api from '../../services/api';

interface PaymentVerificationModalProps {
    purchaseRequest: {
        id: string;
        fuelType: string;
        quantityLiters: number;
        paymentAmount: number;
        bankDepositAmount?: number;
        bankDepositReceiptUrl?: string;
        requestedDeliveryDate: string;
        receiptUrl?: string;
        usingCredits?: boolean;
        createdAt: string;
        station: {
            id: string;
            name: string;
            stationType?: string;
        };
        creator: {
            name: string;
            employeeId: string;
        };
    };
    onClose: () => void;
    onSuccess: () => void;
}

interface CreditTransaction {
    id: string;
    type: 'PAYMENT' | 'UTILIZATION' | 'ADJUSTMENT' | 'LIMIT_CHANGE';
    amount: number;
    description: string;
    createdAt: string;
    createdBy?: { name: string; employeeId: string };
    verifiedBy?: { name: string; employeeId: string };
    verifiedAt?: string;
    receiptUrl?: string;
}

interface CreditSummary {
    station: {
        id: string;
        name: string;
        hasCreditFacility: boolean;
        totalCreditLimit: number;
        utilizedCredits: number;
        availableCredits: number;
    };
    transactions: CreditTransaction[];
}

export const PaymentVerificationModal = ({ purchaseRequest, onClose, onSuccess }: PaymentVerificationModalProps) => {
    const [loading, setLoading] = useState(false);
    const [creditSummary, setCreditSummary] = useState<CreditSummary | null>(null);
    const [loadingCredit, setLoadingCredit] = useState(true);
    const [rejectionComment, setRejectionComment] = useState('');
    const [showRejectForm, setShowRejectForm] = useState(false);

    useEffect(() => {
        fetchCreditHistory();
    }, [purchaseRequest.station.id]);

    const fetchCreditHistory = async () => {
        try {
            setLoadingCredit(true);
            const res = await api.get(`/api/credit-transactions/${purchaseRequest.station.id}/summary`);
            setCreditSummary(res.data);
        } catch (error) {
            console.error('Failed to fetch credit history:', error);
        } finally {
            setLoadingCredit(false);
        }
    };

    const handleApprove = async () => {
        if (!confirm('Are you sure you want to approve this payment?')) return;

        try {
            setLoading(true);
            await api.put(`/api/purchase-requests/${purchaseRequest.id}/verify-payment`);
            alert('Payment verified successfully!');
            onSuccess();
        } catch (error: any) {
            alert(error.response?.data?.error || 'Failed to verify payment');
        } finally {
            setLoading(false);
        }
    };

    const handleReject = async () => {
        if (!rejectionComment.trim()) {
            alert('Please provide a rejection reason');
            return;
        }

        if (!confirm('Are you sure you want to reject this payment?')) return;

        try {
            setLoading(true);
            await api.put(`/api/purchase-requests/${purchaseRequest.id}/reject`, {
                rejectionComment: rejectionComment.trim(),
            });
            alert('Payment rejected successfully!');
            onSuccess();
        } catch (error: any) {
            alert(error.response?.data?.error || 'Failed to reject payment');
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

    const getTransactionTypeLabel = (type: string) => {
        switch (type) {
            case 'PAYMENT': return 'Payment';
            case 'UTILIZATION': return 'Credit Used';
            case 'ADJUSTMENT': return 'Adjustment';
            case 'LIMIT_CHANGE': return 'Limit Change';
            default: return type;
        }
    };

    const getTransactionColor = (type: string) => {
        switch (type) {
            case 'PAYMENT': return 'text-green-600';
            case 'UTILIZATION': return 'text-red-600';
            case 'ADJUSTMENT': return 'text-blue-600';
            case 'LIMIT_CHANGE': return 'text-purple-600';
            default: return 'text-gray-600';
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-5xl w-full border border-gray-200 max-h-[90vh] overflow-y-auto">
                <div className="p-6">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h3 className="text-2xl font-bold text-gray-900">Payment Verification</h3>
                            <p className="text-gray-600 mt-1">{purchaseRequest.station.name}</p>
                        </div>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-600"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Left Column - Purchase Request Details */}
                        <div className="space-y-4">
                            {/* PR Details */}
                            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                                <h4 className="text-sm font-semibold text-gray-900 mb-3">Purchase Request Details</h4>
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Fuel Type:</span>
                                        <span className="font-medium text-gray-900">{getFuelTypeLabel(purchaseRequest.fuelType)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Quantity:</span>
                                        <span className="font-medium text-gray-900">{purchaseRequest.quantityLiters.toLocaleString()} L</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Payment Amount:</span>
                                        <span className="font-bold text-gray-900">{purchaseRequest.paymentAmount.toLocaleString()} SAR</span>
                                    </div>
                                    {purchaseRequest.bankDepositAmount && purchaseRequest.bankDepositAmount > 0 && (
                                        <div className="flex justify-between pt-2 border-t border-gray-300">
                                            <span className="text-gray-600">Bank Deposit:</span>
                                            <span className="font-bold text-green-600">+{purchaseRequest.bankDepositAmount.toLocaleString()} SAR</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Requested By:</span>
                                        <span className="font-medium text-gray-900">{purchaseRequest.creator.name}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Created:</span>
                                        <span className="font-medium text-gray-900">{new Date(purchaseRequest.createdAt).toLocaleString()}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Attachments */}
                            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                                <h4 className="text-sm font-semibold text-gray-900 mb-3">Attachments</h4>
                                <div className="space-y-2">
                                    {purchaseRequest.receiptUrl && (
                                        <a
                                            href={purchaseRequest.receiptUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-2 text-blue-600 hover:text-blue-800 font-medium text-sm"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                                            </svg>
                                            View Payment Receipt
                                        </a>
                                    )}
                                    {purchaseRequest.bankDepositReceiptUrl && (
                                        <a
                                            href={purchaseRequest.bankDepositReceiptUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-2 text-blue-600 hover:text-blue-800 font-medium text-sm"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                                            </svg>
                                            View Bank Deposit Receipt
                                        </a>
                                    )}
                                    {!purchaseRequest.receiptUrl && !purchaseRequest.bankDepositReceiptUrl && (
                                        <p className="text-sm text-gray-500">No attachments</p>
                                    )}
                                </div>
                            </div>

                            {/* Credit Summary */}
                            {loadingCredit ? (
                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                    <p className="text-sm text-blue-700">Loading credit information...</p>
                                </div>
                            ) : creditSummary && (
                                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200">
                                    <h4 className="text-sm font-semibold text-gray-900 mb-3">Current Credit Status</h4>
                                    <div className="grid grid-cols-3 gap-3 text-sm">
                                        <div>
                                            <p className="text-gray-600 text-xs">Total Limit</p>
                                            <p className="font-bold text-gray-900">{creditSummary.station.totalCreditLimit.toLocaleString()} SAR</p>
                                        </div>
                                        <div>
                                            <p className="text-gray-600 text-xs">Utilized</p>
                                            <p className="font-bold text-red-600">{creditSummary.station.utilizedCredits.toLocaleString()} SAR</p>
                                        </div>
                                        <div>
                                            <p className="text-gray-600 text-xs">Available</p>
                                            <p className="font-bold text-green-600">{creditSummary.station.availableCredits.toLocaleString()} SAR</p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Right Column - Credit History */}
                        <div className="space-y-4">
                            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                                <h4 className="text-sm font-semibold text-gray-900 mb-3">Credit Transaction History</h4>
                                {loadingCredit ? (
                                    <p className="text-sm text-gray-500">Loading...</p>
                                ) : creditSummary && creditSummary.transactions && creditSummary.transactions.length > 0 ? (
                                    <div className="space-y-2 max-h-96 overflow-y-auto">
                                        {creditSummary.transactions.slice(0, 20).map((transaction) => (
                                            <div key={transaction.id} className="bg-white rounded-lg p-3 border border-gray-200">
                                                <div className="flex justify-between items-start mb-1">
                                                    <span className={`text-xs font-semibold ${getTransactionColor(transaction.type)}`}>
                                                        {getTransactionTypeLabel(transaction.type)}
                                                    </span>
                                                    <span className={`text-sm font-bold ${transaction.type === 'PAYMENT' ? 'text-green-600' : 'text-red-600'}`}>
                                                        {transaction.type === 'PAYMENT' ? '+' : '-'}{transaction.amount.toLocaleString()} SAR
                                                    </span>
                                                </div>
                                                <p className="text-xs text-gray-600 mb-1">{transaction.description}</p>
                                                <div className="flex justify-between items-center text-xs text-gray-500">
                                                    <span>{new Date(transaction.createdAt).toLocaleDateString()}</span>
                                                    {transaction.verifiedBy && (
                                                        <span className="text-green-600">✓ Verified</span>
                                                    )}
                                                </div>
                                                {transaction.receiptUrl && (
                                                    <a
                                                        href={transaction.receiptUrl}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-xs text-blue-600 hover:text-blue-800 mt-1 inline-block"
                                                    >
                                                        View Receipt
                                                    </a>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-sm text-gray-500">No transaction history</p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Rejection Form */}
                    {showRejectForm && (
                        <div className="mt-6 bg-red-50 border border-red-200 rounded-lg p-4">
                            <label className="block text-sm font-medium text-gray-900 mb-2">
                                Rejection Reason *
                            </label>
                            <textarea
                                value={rejectionComment}
                                onChange={(e) => setRejectionComment(e.target.value)}
                                rows={3}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                                placeholder="Please provide a reason for rejecting this payment..."
                            />
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-3 pt-6 border-t border-gray-200 mt-6">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={loading}
                            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium disabled:opacity-50"
                        >
                            Cancel
                        </button>
                        {!showRejectForm ? (
                            <>
                                <button
                                    type="button"
                                    onClick={() => setShowRejectForm(true)}
                                    disabled={loading}
                                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium disabled:opacity-50"
                                >
                                    Reject Payment
                                </button>
                                <button
                                    type="button"
                                    onClick={handleApprove}
                                    disabled={loading}
                                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {loading ? (
                                        <>
                                            <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            Approving...
                                        </>
                                    ) : (
                                        <>
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            Approve Payment
                                        </>
                                    )}
                                </button>
                            </>
                        ) : (
                            <>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowRejectForm(false);
                                        setRejectionComment('');
                                    }}
                                    disabled={loading}
                                    className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium disabled:opacity-50"
                                >
                                    Cancel Rejection
                                </button>
                                <button
                                    type="button"
                                    onClick={handleReject}
                                    disabled={loading || !rejectionComment.trim()}
                                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {loading ? (
                                        <>
                                            <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            Rejecting...
                                        </>
                                    ) : (
                                        'Confirm Rejection'
                                    )}
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
