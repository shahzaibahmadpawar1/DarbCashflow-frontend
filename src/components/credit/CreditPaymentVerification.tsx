import { useState, useEffect } from 'react';
import api from '../../services/api';

interface PendingPayment {
    id: string;
    stationId: string;
    amount: number;
    description: string;
    receiptUrl?: string;
    createdBy: { name: string; employeeId: string };
    createdAt: string;
    station: {
        id: string;
        name: string;
    };
}

interface CreditPaymentVerificationProps {
    onClose?: () => void;
}

export const CreditPaymentVerification = ({ onClose }: CreditPaymentVerificationProps) => {
    const [pendingPayments, setPendingPayments] = useState<PendingPayment[]>([]);
    const [loading, setLoading] = useState(true);
    const [verifying, setVerifying] = useState<string | null>(null);

    useEffect(() => {
        fetchPendingPayments();
    }, []);

    const fetchPendingPayments = async () => {
        try {
            setLoading(true);
            const res = await api.get('/api/credit-transactions/pending/payments');
            setPendingPayments(res.data.pendingPayments || []);
        } catch (error) {
            console.error('Failed to fetch pending payments:', error);
            alert('Failed to load pending payments');
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyPayment = async (paymentId: string) => {
        if (!confirm('Are you sure you want to verify this payment? This will update the station\'s credit balance.')) {
            return;
        }

        try {
            setVerifying(paymentId);
            await api.put(`/api/credit-transactions/${paymentId}/verify`);
            alert('Payment verified successfully!');
            fetchPendingPayments();
        } catch (error: any) {
            alert(error.response?.data?.error || 'Failed to verify payment');
        } finally {
            setVerifying(null);
        }
    };

    if (loading) {
        return (
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
                <p className="text-gray-600">Loading pending payments...</p>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-xl shadow-lg border border-gray-200">
            <div className="p-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h3 className="text-2xl font-bold text-gray-900">Payment Verification</h3>
                        <p className="text-gray-600 mt-1">Review and verify station payments</p>
                    </div>
                    {onClose && (
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-600"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    )}
                </div>

                {/* Stats */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600">Pending Verifications</p>
                            <p className="text-3xl font-bold text-blue-600">{pendingPayments.length}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-sm text-gray-600">Total Amount</p>
                            <p className="text-2xl font-bold text-gray-900">
                                {pendingPayments.reduce((sum, p) => sum + p.amount, 0).toLocaleString()} SAR
                            </p>
                        </div>
                    </div>
                </div>

                {/* Pending Payments List */}
                {pendingPayments.length === 0 ? (
                    <div className="text-center py-12">
                        <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <p className="text-gray-500 text-lg">No pending payment verifications</p>
                        <p className="text-gray-400 text-sm mt-1">All payments have been verified</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {pendingPayments.map((payment) => (
                            <div key={payment.id} className="bg-gray-50 border border-gray-200 rounded-lg p-5 hover:shadow-md transition-shadow">
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <h4 className="text-lg font-semibold text-gray-900">{payment.station.name}</h4>
                                            <span className="px-2 py-1 bg-orange-100 text-orange-700 text-xs font-medium rounded">
                                                Pending
                                            </span>
                                        </div>
                                        <p className="text-sm text-gray-600 mb-1">{payment.description}</p>
                                        <div className="flex items-center gap-4 text-xs text-gray-500">
                                            <span>Submitted by: {payment.createdBy.name}</span>
                                            <span>•</span>
                                            <span>{new Date(payment.createdAt).toLocaleDateString()} at {new Date(payment.createdAt).toLocaleTimeString()}</span>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-2xl font-bold text-green-600">
                                            {payment.amount.toLocaleString()} SAR
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 pt-4 border-t border-gray-200">
                                    {payment.receiptUrl && (
                                        <a
                                            href={payment.receiptUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex-1 px-4 py-2 border border-blue-300 text-blue-700 rounded-lg hover:bg-blue-50 transition-colors font-medium text-center flex items-center justify-center gap-2"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                            </svg>
                                            View Receipt
                                        </a>
                                    )}
                                    <button
                                        onClick={() => handleVerifyPayment(payment.id)}
                                        disabled={verifying === payment.id}
                                        className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                    >
                                        {verifying === payment.id ? (
                                            <>
                                                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                </svg>
                                                Verifying...
                                            </>
                                        ) : (
                                            <>
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                                Verify Payment
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Refresh Button */}
                <div className="mt-6 pt-6 border-t border-gray-200">
                    <button
                        onClick={fetchPendingPayments}
                        disabled={loading}
                        className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium disabled:opacity-50"
                    >
                        {loading ? 'Refreshing...' : 'Refresh List'}
                    </button>
                </div>
            </div>
        </div>
    );
};
