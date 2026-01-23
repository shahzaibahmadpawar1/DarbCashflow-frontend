import { useState } from 'react';
import api from '../../services/api';
import { getLocalDateTimeString, convertLocalToUTC } from '../../utils/dateTimeUtils';

interface PurchaseRequest {
    id: string;
    fuelType: string;
    quantityLiters: number;
    paymentAmount: number;
    requestedDeliveryDate: string;
    receiptUrl?: string;
    bankDepositAmount?: number;
    bankDepositReceiptUrl?: string;
    status: string;
    createdAt: string;
    usingCredits?: boolean;
    paymentVerified?: boolean;
    paymentVerifiedBy?: { name: string; employeeId: string };
    paymentVerifiedAt?: string;
    station: {
        id: string;
        name: string;
        purchaseCredits: number;
        totalCreditLimit?: number;
        utilizedCredits?: number;
        hasCreditFacility?: boolean;
    };
    creator: {
        name: string;
        employeeId: string;
    };
}

interface PurchaseRequestReviewModalProps {
    purchaseRequest: PurchaseRequest;
    onClose: () => void;
    onSuccess: () => void;
    userRole?: string;
}

export const PurchaseRequestReviewModal = ({ purchaseRequest, onClose, onSuccess, userRole }: PurchaseRequestReviewModalProps) => {
    const [action, setAction] = useState<'approve' | 'reject' | 'verify' | null>(null);
    const [comment, setComment] = useState('');
    const [expectedDeliveryDate, setExpectedDeliveryDate] = useState(getLocalDateTimeString()); // Fixed: Use local time
    const [submitting, setSubmitting] = useState(false);

    const availableCredits = (purchaseRequest.station.totalCreditLimit || 0) - (purchaseRequest.station.utilizedCredits || 0);
    const hasReceipt = !!(purchaseRequest.receiptUrl || purchaseRequest.bankDepositReceiptUrl);
    const needsPaymentVerification = !!(hasReceipt && !purchaseRequest.paymentVerified);
    const isAccountant = userRole === 'Accountant' || userRole === 'Admin';

    const handleVerifyPayment = async () => {
        try {
            setSubmitting(true);
            await api.put(`/api/purchase-requests/${purchaseRequest.id}/verify-payment`);
            alert('Payment verified successfully!');
            onSuccess();
            onClose();
        } catch (error: any) {
            alert(error.response?.data?.error || 'Failed to verify payment');
        } finally {
            setSubmitting(false);
        }
    };

    const handleApprove = async () => {
        try {
            setSubmitting(true);
            // First approve the PR
            await api.put(`/api/purchase-requests/${purchaseRequest.id}/approve`, {
                comment: comment.trim() || undefined,
            });

            // Then create the PO
            await api.post('/api/purchase-orders', {
                purchaseRequestId: purchaseRequest.id,
                expectedDeliveryDate: convertLocalToUTC(expectedDeliveryDate), // Fixed: Convert to UTC
            });

            alert('Purchase request approved and PO generated!');
            onSuccess();
            onClose();
        } catch (error: any) {
            alert(error.response?.data?.error || 'Failed to approve purchase request');
        } finally {
            setSubmitting(false);
        }
    };

    const handleReject = async () => {
        if (!comment.trim()) {
            alert('Please provide a rejection comment');
            return;
        }

        try {
            setSubmitting(true);
            await api.put(`/api/purchase-requests/${purchaseRequest.id}/reject`, {
                comment: comment,
            });

            alert('Purchase request rejected');
            onSuccess();
            onClose();
        } catch (error: any) {
            alert(error.response?.data?.error || 'Failed to reject purchase request');
        } finally {
            setSubmitting(false);
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

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full border border-gray-200 max-h-[90vh] overflow-y-auto">
                <div className="p-6">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h3 className="text-2xl font-bold text-gray-900">Review Purchase Request</h3>
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

                    {/* Payment Verification Status */}
                    {hasReceipt && (
                        <div className={`p-4 rounded-lg border mb-4 ${purchaseRequest.paymentVerified
                            ? 'bg-green-50 border-green-200'
                            : 'bg-orange-50 border-orange-200'
                            }`}>
                            <div className="flex items-center justify-between">
                                <div>
                                    <h4 className="text-sm font-semibold mb-1">Payment Status</h4>
                                    {purchaseRequest.paymentVerified ? (
                                        <p className="text-sm text-green-700">
                                            ✓ Payment verified by {purchaseRequest.paymentVerifiedBy?.name} on{' '}
                                            {purchaseRequest.paymentVerifiedAt && new Date(purchaseRequest.paymentVerifiedAt).toLocaleString()}
                                        </p>
                                    ) : (
                                        <p className="text-sm text-orange-700">⚠ Payment verification pending</p>
                                    )}
                                </div>
                                {!purchaseRequest.paymentVerified && isAccountant && (
                                    <button
                                        onClick={() => setAction('verify')}
                                        className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors font-medium"
                                    >
                                        Verify Payment
                                    </button>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Request Details */}
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-6">
                        <h4 className="text-md font-semibold text-gray-900 mb-3">Request Details</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <p className="text-sm text-gray-600">Requested By</p>
                                <p className="text-sm font-semibold text-gray-900">{purchaseRequest.creator.name} ({purchaseRequest.creator.employeeId})</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-600">Request Date</p>
                                <p className="text-sm font-semibold text-gray-900">{new Date(purchaseRequest.createdAt).toLocaleString()}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-600">Fuel Type</p>
                                <p className="text-sm font-semibold text-gray-900">{getFuelTypeLabel(purchaseRequest.fuelType)}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-600">Quantity</p>
                                <p className="text-sm font-semibold text-gray-900">{purchaseRequest.quantityLiters.toLocaleString()} L</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-600">Payment Amount</p>
                                <p className="text-sm font-semibold text-gray-900">{purchaseRequest.paymentAmount.toLocaleString()} SAR</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-600">Payment Method</p>
                                <p className={`text-sm font-semibold ${purchaseRequest.usingCredits ? 'text-green-600' : 'text-orange-600'}`}>
                                    {purchaseRequest.usingCredits ? 'Using Credits' : 'Cash Payment'}
                                </p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-600">Requested Delivery</p>
                                <p className="text-sm font-semibold text-gray-900">{new Date(purchaseRequest.requestedDeliveryDate).toLocaleString()}</p>
                            </div>
                            {purchaseRequest.bankDepositAmount !== undefined && purchaseRequest.bankDepositAmount > 0 && (
                                <div>
                                    <p className="text-sm text-gray-600">Bank Deposit</p>
                                    <p className="text-sm font-semibold text-gray-900">{purchaseRequest.bankDepositAmount.toLocaleString()} SAR</p>
                                </div>
                            )}
                        </div>
                        <div className="mt-4 pt-4 border-t border-gray-200 flex flex-wrap gap-4">
                            {purchaseRequest.receiptUrl && (
                                <a
                                    href={purchaseRequest.receiptUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100 transition-colors"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                    </svg>
                                    View Fuel Receipt
                                </a>
                            )}
                            {purchaseRequest.bankDepositReceiptUrl && (
                                <a
                                    href={purchaseRequest.bankDepositReceiptUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100 transition-colors"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                    </svg>
                                    View Deposit Receipt
                                </a>
                            )}
                        </div>
                    </div>

                    {/* Credits Information */}
                    {purchaseRequest.station.hasCreditFacility && (
                        <div className={`p-4 rounded-lg border mb-6 ${purchaseRequest.usingCredits ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'
                            }`}>
                            <h4 className="text-md font-semibold text-gray-900 mb-3">Station Credits</h4>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <p className="text-sm text-gray-600">Total Limit</p>
                                    <p className="text-sm font-semibold text-gray-900">{(purchaseRequest.station.totalCreditLimit || 0).toLocaleString()} SAR</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-600">Available Credits</p>
                                    <p className="text-sm font-semibold text-green-600">{availableCredits.toLocaleString()} SAR</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-600">After This Request</p>
                                    <p className="text-sm font-semibold text-gray-900">
                                        {purchaseRequest.usingCredits
                                            ? (availableCredits - purchaseRequest.paymentAmount).toLocaleString()
                                            : availableCredits.toLocaleString()
                                        } SAR
                                    </p>
                                </div>
                            </div>
                            {purchaseRequest.usingCredits && (
                                <div className="mt-3 pt-3 border-t border-blue-200">
                                    <p className="text-sm text-blue-700">ℹ️ This request will utilize station credits. Credits will be deducted when PO is received.</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Warning if payment verification needed */}
                    {needsPaymentVerification && (
                        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
                            <p className="text-sm text-orange-700 font-medium">
                                ⚠ Payment verification required before approval.
                                This request has an attached receipt or bank deposit that must be verified by an accountant.
                            </p>
                        </div>
                    )}

                    {/* Actions */}
                    {!action && (
                        <div className="flex gap-3">
                            <button
                                onClick={() => setAction('reject')}
                                className="flex-1 px-4 py-3 border border-red-300 text-red-700 rounded-lg hover:bg-red-50 transition-colors font-medium"
                            >
                                Reject
                            </button>
                            <button
                                onClick={() => setAction('approve')}
                                disabled={needsPaymentVerification}
                                className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                                title={needsPaymentVerification ? 'Payment verification required' : ''}
                            >
                                Approve & Generate PO
                            </button>
                        </div>
                    )}

                    {/* Verify Payment Form */}
                    {action === 'verify' && (
                        <div className="space-y-4">
                            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                                <h4 className="text-md font-semibold text-gray-900 mb-3">Verify Payment</h4>
                                <p className="text-sm text-gray-700 mb-4">
                                    Please confirm that you have verified the payment receipt and the payment has been received.
                                </p>
                                {purchaseRequest.receiptUrl && (
                                    <a
                                        href={purchaseRequest.receiptUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1 mb-4"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                        </svg>
                                        View Receipt
                                    </a>
                                )}
                            </div>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setAction(null)}
                                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleVerifyPayment}
                                    disabled={submitting}
                                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {submitting ? 'Verifying...' : 'Confirm Verification'}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Approve Form */}
                    {action === 'approve' && (
                        <div className="space-y-4">
                            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                                <h4 className="text-md font-semibold text-gray-900 mb-3">Generate Purchase Order</h4>
                                <div className="space-y-3">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Expected Delivery Date & Time *</label>
                                        <input
                                            type="datetime-local"
                                            required
                                            value={expectedDeliveryDate}
                                            onChange={(e) => setExpectedDeliveryDate(e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Approval Comment (Optional)</label>
                                        <textarea
                                            value={comment}
                                            onChange={(e) => setComment(e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent"
                                            rows={3}
                                            placeholder="Add any notes or comments..."
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setAction(null)}
                                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleApprove}
                                    disabled={submitting || needsPaymentVerification}
                                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {submitting ? 'Processing...' : (needsPaymentVerification ? 'Waiting for Verification' : 'Confirm Approval')}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Reject Form */}
                    {action === 'reject' && (
                        <div className="space-y-4">
                            <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                                <h4 className="text-md font-semibold text-gray-900 mb-3">Rejection Comment</h4>
                                <textarea
                                    required
                                    value={comment}
                                    onChange={(e) => setComment(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent"
                                    rows={4}
                                    placeholder="Please provide a reason for rejection..."
                                />
                            </div>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setAction(null)}
                                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleReject}
                                    disabled={submitting}
                                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {submitting ? 'Processing...' : 'Confirm Rejection'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
