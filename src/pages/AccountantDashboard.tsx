import { useState, useEffect } from 'react';
import { CreditPaymentVerification } from '../components/credit';
import api from '../services/api';

interface PendingPRPayment {
    id: string;
    station: { name: string };
    paymentAmount: number;
    receiptUrl?: string;
    creator: { name: string };
    createdAt: string;
}

export const AccountantDashboard = () => {
    const [pendingPRPayments, setPendingPRPayments] = useState<PendingPRPayment[]>([]);
    const [loading, setLoading] = useState(true);
    const [verifying, setVerifying] = useState<string | null>(null);

    useEffect(() => {
        fetchPendingPRPayments();
    }, []);

    const fetchPendingPRPayments = async () => {
        try {
            setLoading(true);
            // Fetch all PRs and filter for those with receipts but not verified
            const res = await api.get('/api/purchase-requests/office-user');
            const allPRs = res.data.purchaseRequests || [];
            const pending = allPRs.filter((pr: any) =>
                pr.status === 'PENDING' &&
                pr.receiptUrl &&
                !pr.paymentVerified
            );
            setPendingPRPayments(pending);
        } catch (error) {
            console.error('Failed to fetch pending PR payments:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyPRPayment = async (prId: string) => {
        if (!confirm('Are you sure you want to verify this payment?')) {
            return;
        }

        try {
            setVerifying(prId);
            await api.put(`/api/purchase-requests/${prId}/verify-payment`);
            alert('Payment verified successfully!');
            fetchPendingPRPayments();
        } catch (error: any) {
            alert(error.response?.data?.error || 'Failed to verify payment');
        } finally {
            setVerifying(null);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">Accountant Dashboard</h1>
                    <p className="text-gray-600 mt-2">Manage payment verifications and credit transactions</p>
                </div>

                {/* Stats Overview */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600 mb-1">PR Payments Pending</p>
                                <p className="text-3xl font-bold text-orange-600">{pendingPRPayments.length}</p>
                            </div>
                            <div className="bg-orange-100 rounded-full p-3">
                                <svg className="w-8 h-8 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600 mb-1">Total PR Amount</p>
                                <p className="text-2xl font-bold text-gray-900">
                                    {pendingPRPayments.reduce((sum, pr) => sum + pr.paymentAmount, 0).toLocaleString()} SAR
                                </p>
                            </div>
                            <div className="bg-blue-100 rounded-full p-3">
                                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600 mb-1">Quick Actions</p>
                                <p className="text-sm text-gray-500 mt-2">Verify payments below</p>
                            </div>
                            <div className="bg-green-100 rounded-full p-3">
                                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main Content - Two Columns */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Purchase Request Payment Verifications */}
                    <div className="bg-white rounded-xl shadow-lg border border-gray-200">
                        <div className="p-6">
                            <h2 className="text-xl font-bold text-gray-900 mb-4">Purchase Request Payments</h2>
                            {loading ? (
                                <p className="text-gray-600">Loading...</p>
                            ) : pendingPRPayments.length === 0 ? (
                                <div className="text-center py-12">
                                    <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <p className="text-gray-500">No pending PR payment verifications</p>
                                </div>
                            ) : (
                                <div className="space-y-4 max-h-[600px] overflow-y-auto">
                                    {pendingPRPayments.map((pr) => (
                                        <div key={pr.id} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                                            <div className="flex items-start justify-between mb-3">
                                                <div>
                                                    <h3 className="font-semibold text-gray-900">{pr.station.name}</h3>
                                                    <p className="text-sm text-gray-600">By: {pr.creator.name}</p>
                                                    <p className="text-xs text-gray-500 mt-1">
                                                        {new Date(pr.createdAt).toLocaleDateString()}
                                                    </p>
                                                </div>
                                                <p className="text-lg font-bold text-green-600">
                                                    {pr.paymentAmount.toLocaleString()} SAR
                                                </p>
                                            </div>
                                            <div className="flex gap-2">
                                                {pr.receiptUrl && (
                                                    <a
                                                        href={pr.receiptUrl}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="flex-1 px-3 py-2 border border-blue-300 text-blue-700 text-sm rounded-lg hover:bg-blue-50 transition-colors text-center"
                                                    >
                                                        View Receipt
                                                    </a>
                                                )}
                                                <button
                                                    onClick={() => handleVerifyPRPayment(pr.id)}
                                                    disabled={verifying === pr.id}
                                                    className="flex-1 px-3 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                                                >
                                                    {verifying === pr.id ? 'Verifying...' : 'Verify'}
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Credit Payment Verifications */}
                    <div>
                        <CreditPaymentVerification />
                    </div>
                </div>
            </div>
        </div>
    );
};
