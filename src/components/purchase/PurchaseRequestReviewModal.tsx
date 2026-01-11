import { useState } from 'react';
import api from '../../services/api';

interface PurchaseRequest {
    id: string;
    fuelType: string;
    quantityLiters: number;
    paymentAmount: number;
    requestedDeliveryDate: string;
    receiptUrl?: string;
    status: string;
    createdAt: string;
    station: {
        id: string;
        name: string;
        purchaseCredits: number;
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
}

export const PurchaseRequestReviewModal = ({ purchaseRequest, onClose, onSuccess }: PurchaseRequestReviewModalProps) => {
    const [action, setAction] = useState<'approve' | 'reject' | null>(null);
    const [rejectionReason, setRejectionReason] = useState('');
    const [expectedDeliveryDate, setExpectedDeliveryDate] = useState(new Date().toISOString().split('T')[0]);
    const [submitting, setSubmitting] = useState(false);

    const creditsAfterApproval = purchaseRequest.station.purchaseCredits - purchaseRequest.paymentAmount;
    const hasInsufficientCredits = creditsAfterApproval < 0;

    const handleApprove = async () => {
        try {
            setSubmitting(true);
            // First approve the PR
            await api.put(`/api/purchase-requests/${purchaseRequest.id}/approve`);

            // Then create the PO
            await api.post('/api/purchase-orders', {
                purchaseRequestId: purchaseRequest.id,
                expectedDeliveryDate,
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
        if (!rejectionReason.trim()) {
            alert('Please provide a rejection reason');
            return;
        }

        try {
            setSubmitting(true);
            await api.put(`/api/purchase-requests/${purchaseRequest.id}/reject`, {
                reason: rejectionReason,
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
                                <p className="text-sm font-semibold text-gray-900">{new Date(purchaseRequest.createdAt).toLocaleDateString()}</p>
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
                                <p className="text-sm text-gray-600">Requested Delivery</p>
                                <p className="text-sm font-semibold text-gray-900">{new Date(purchaseRequest.requestedDeliveryDate).toLocaleDateString()}</p>
                            </div>
                        </div>
                        {purchaseRequest.receiptUrl && (
                            <div className="mt-4 pt-4 border-t border-gray-200">
                                <a
                                    href={purchaseRequest.receiptUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                    </svg>
                                    View Receipt
                                </a>
                            </div>
                        )}
                    </div>

                    {/* Credits Information */}
                    <div className={`p-4 rounded-lg border mb-6 ${hasInsufficientCredits ? 'bg-red-50 border-red-200' : 'bg-blue-50 border-blue-200'}`}>
                        <h4 className="text-md font-semibold text-gray-900 mb-3">Station Credits</h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <p className="text-sm text-gray-600">Current Credits</p>
                                <p className="text-sm font-semibold text-gray-900">{purchaseRequest.station.purchaseCredits.toLocaleString()} SAR</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-600">Request Amount</p>
                                <p className="text-sm font-semibold text-gray-900">-{purchaseRequest.paymentAmount.toLocaleString()} SAR</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-600">After Approval</p>
                                <p className={`text-sm font-semibold ${hasInsufficientCredits ? 'text-red-600' : 'text-green-600'}`}>
                                    {creditsAfterApproval.toLocaleString()} SAR
                                </p>
                            </div>
                        </div>
                        {hasInsufficientCredits && (
                            <div className="mt-3 pt-3 border-t border-red-200">
                                <p className="text-sm text-red-700 font-medium">⚠️ Warning: This station has insufficient credits for this request!</p>
                            </div>
                        )}
                    </div>

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
                                className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                            >
                                Approve & Generate PO
                            </button>
                        </div>
                    )}

                    {/* Approve Form */}
                    {action === 'approve' && (
                        <div className="space-y-4">
                            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                                <h4 className="text-md font-semibold text-gray-900 mb-3">Generate Purchase Order</h4>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Expected Delivery Date *</label>
                                    <input
                                        type="date"
                                        required
                                        value={expectedDeliveryDate}
                                        onChange={(e) => setExpectedDeliveryDate(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent"
                                    />
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
                                    disabled={submitting}
                                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {submitting ? 'Processing...' : 'Confirm Approval'}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Reject Form */}
                    {action === 'reject' && (
                        <div className="space-y-4">
                            <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                                <h4 className="text-md font-semibold text-gray-900 mb-3">Rejection Reason</h4>
                                <textarea
                                    required
                                    value={rejectionReason}
                                    onChange={(e) => setRejectionReason(e.target.value)}
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
