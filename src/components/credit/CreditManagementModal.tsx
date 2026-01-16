import { useState, useEffect } from 'react';
import api from '../../services/api';

interface CreditTransaction {
    id: string;
    type: 'ALLOCATION' | 'UTILIZATION' | 'PAYMENT' | 'ADJUSTMENT';
    amount: number;
    description: string;
    receiptUrl?: string;
    verifiedBy?: { name: string; employeeId: string };
    verifiedAt?: string;
    createdBy: { name: string; employeeId: string };
    createdAt: string;
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
}

interface CreditManagementModalProps {
    stationId: string;
    stationName: string;
    onClose: () => void;
}

export const CreditManagementModal = ({ stationId, stationName, onClose }: CreditManagementModalProps) => {
    const [creditSummary, setCreditSummary] = useState<CreditSummary | null>(null);
    const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [showPaymentForm, setShowPaymentForm] = useState(false);
    const [paymentAmount, setPaymentAmount] = useState(0);
    const [paymentDescription, setPaymentDescription] = useState('');
    const [receiptUrl, setReceiptUrl] = useState('');
    const [uploading, setUploading] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        fetchCreditData();
    }, [stationId]);

    const fetchCreditData = async () => {
        try {
            setLoading(true);
            const [summaryRes, transactionsRes] = await Promise.all([
                api.get(`/api/credit-transactions/${stationId}/summary`),
                api.get(`/api/credit-transactions/${stationId}?limit=20`)
            ]);
            setCreditSummary(summaryRes.data);
            setTransactions(transactionsRes.data.transactions || []);
        } catch (error) {
            console.error('Failed to fetch credit data:', error);
            alert('Failed to load credit information');
        } finally {
            setLoading(false);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('receipt', file);

        try {
            setUploading(true);
            const res = await api.post('/api/upload/receipt', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setReceiptUrl(res.data.url);
        } catch (error) {
            alert('Failed to upload receipt');
        } finally {
            setUploading(false);
        }
    };

    const handleSubmitPayment = async () => {
        if (paymentAmount <= 0) {
            alert('Please enter a valid payment amount');
            return;
        }

        if (!receiptUrl) {
            alert('Please upload a payment receipt');
            return;
        }

        try {
            setSubmitting(true);
            await api.post('/api/credit-transactions/payment', {
                stationId,
                amount: paymentAmount,
                description: paymentDescription || `Payment of ${paymentAmount} SAR`,
                receiptUrl,
            });

            alert('Payment submitted successfully! Awaiting accountant verification.');
            setShowPaymentForm(false);
            setPaymentAmount(0);
            setPaymentDescription('');
            setReceiptUrl('');
            fetchCreditData();
        } catch (error: any) {
            alert(error.response?.data?.error || 'Failed to submit payment');
        } finally {
            setSubmitting(false);
        }
    };

    const getTransactionTypeLabel = (type: string) => {
        switch (type) {
            case 'ALLOCATION': return 'Credit Allocated';
            case 'UTILIZATION': return 'Credit Used';
            case 'PAYMENT': return 'Payment';
            case 'ADJUSTMENT': return 'Adjustment';
            default: return type;
        }
    };

    const getTransactionTypeColor = (type: string) => {
        switch (type) {
            case 'ALLOCATION': return 'text-blue-600 bg-blue-50';
            case 'UTILIZATION': return 'text-red-600 bg-red-50';
            case 'PAYMENT': return 'text-green-600 bg-green-50';
            case 'ADJUSTMENT': return 'text-purple-600 bg-purple-50';
            default: return 'text-gray-600 bg-gray-50';
        }
    };

    if (loading) {
        return (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-xl shadow-xl p-8">
                    <p className="text-gray-600">Loading credit information...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full border border-gray-200 max-h-[90vh] overflow-y-auto">
                <div className="p-6">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h3 className="text-2xl font-bold text-gray-900">Credit Management</h3>
                            <p className="text-gray-600 mt-1">{stationName}</p>
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

                    {/* Credit Summary */}
                    {creditSummary?.station.hasCreditFacility ? (
                        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6 mb-6">
                            <h4 className="text-lg font-bold text-gray-900 mb-4">Credit Overview</h4>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div>
                                    <p className="text-sm text-gray-600 mb-1">Total Credit Limit</p>
                                    <p className="text-3xl font-bold text-gray-900">
                                        {creditSummary.station.totalCreditLimit.toLocaleString()}
                                        <span className="text-lg text-gray-600 ml-2">SAR</span>
                                    </p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-600 mb-1">Utilized Credits</p>
                                    <p className="text-3xl font-bold text-red-600">
                                        {creditSummary.station.utilizedCredits.toLocaleString()}
                                        <span className="text-lg text-gray-600 ml-2">SAR</span>
                                    </p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-600 mb-1">Available Credits</p>
                                    <p className="text-3xl font-bold text-green-600">
                                        {creditSummary.station.availableCredits.toLocaleString()}
                                        <span className="text-lg text-gray-600 ml-2">SAR</span>
                                    </p>
                                </div>
                            </div>
                            <div className="mt-4 pt-4 border-t border-blue-200">
                                <button
                                    onClick={() => setShowPaymentForm(!showPaymentForm)}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                                >
                                    {showPaymentForm ? 'Cancel Payment' : 'Submit Payment'}
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
                            <p className="text-sm text-orange-700">This station does not have a credit facility.</p>
                        </div>
                    )}

                    {/* Payment Form */}
                    {showPaymentForm && (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
                            <h4 className="text-lg font-semibold text-gray-900 mb-4">Submit Payment</h4>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Payment Amount (SAR) *</label>
                                    <input
                                        type="number"
                                        required
                                        min="0.01"
                                        step="0.01"
                                        value={paymentAmount || ''}
                                        onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || 0)}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                                        placeholder="Enter amount"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Description (Optional)</label>
                                    <input
                                        type="text"
                                        value={paymentDescription}
                                        onChange={(e) => setPaymentDescription(e.target.value)}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                                        placeholder="Payment description"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Payment Receipt *</label>
                                    <input
                                        type="file"
                                        accept="image/*,application/pdf"
                                        onChange={handleFileUpload}
                                        disabled={uploading}
                                        required
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                                    />
                                    {uploading && <p className="mt-1 text-sm text-blue-600">Uploading...</p>}
                                    {receiptUrl && <p className="mt-1 text-sm text-green-600">✓ Receipt uploaded</p>}
                                </div>
                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                                    <p className="text-sm text-blue-700">
                                        ℹ️ After submission, your payment will be verified by the accounts team.
                                        Credits will be updated once verified.
                                    </p>
                                </div>
                                <button
                                    onClick={handleSubmitPayment}
                                    disabled={submitting || uploading || !receiptUrl}
                                    className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {submitting ? 'Submitting...' : 'Submit Payment'}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Transaction History */}
                    <div>
                        <h4 className="text-lg font-semibold text-gray-900 mb-4">Transaction History</h4>
                        {transactions.length === 0 ? (
                            <div className="text-center py-8 text-gray-500">
                                <p>No transactions yet</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {transactions.map((transaction) => (
                                    <div key={transaction.id} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <span className={`px-2 py-1 rounded text-xs font-medium ${getTransactionTypeColor(transaction.type)}`}>
                                                        {getTransactionTypeLabel(transaction.type)}
                                                    </span>
                                                    <span className="text-sm text-gray-500">
                                                        {new Date(transaction.createdAt).toLocaleDateString()}
                                                    </span>
                                                </div>
                                                <p className="text-sm text-gray-700 mb-1">{transaction.description}</p>
                                                <p className="text-xs text-gray-500">
                                                    By: {transaction.createdBy.name}
                                                </p>
                                                {transaction.verifiedBy && (
                                                    <p className="text-xs text-green-600 mt-1">
                                                        ✓ Verified by {transaction.verifiedBy.name} on{' '}
                                                        {transaction.verifiedAt && new Date(transaction.verifiedAt).toLocaleDateString()}
                                                    </p>
                                                )}
                                                {transaction.type === 'PAYMENT' && !transaction.verifiedAt && (
                                                    <p className="text-xs text-orange-600 mt-1">
                                                        ⏳ Awaiting verification
                                                    </p>
                                                )}
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
                                            <div className="text-right">
                                                <p className={`text-lg font-bold ${transaction.type === 'UTILIZATION' ? 'text-red-600' : 'text-green-600'
                                                    }`}>
                                                    {transaction.type === 'UTILIZATION' ? '-' : '+'}
                                                    {transaction.amount.toLocaleString()} SAR
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Close Button */}
                    <div className="mt-6 pt-6 border-t border-gray-200">
                        <button
                            onClick={onClose}
                            className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                        >
                            Close
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
