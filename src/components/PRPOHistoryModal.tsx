import { useState } from 'react';
import api from '../services/api';
import { PurchaseOrderDetailsModal } from './purchase/PurchaseOrderDetailsModal';

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
    rejectionReason?: string;
    createdAt: string;
    createdBy: {
        name: string;
    };
    purchaseOrder?: {
        id: string;
        poNumber: string;
        expectedDeliveryDate: string;
        actualDeliveryDate?: string;
        invoiceNumber?: string;
        invoiceUrl?: string;
        receivedAt?: string;
        procurementConfirmedAt?: string;
        aramcoPoNumber?: string;
        aramcoPoDate?: string;
        aramcoPoUrl?: string;
        receivedQuantityLiters?: number;
        receivedAmount?: number;
        creditVariance?: number;
        actualTransportationCost?: number;
        transporter?: { name: string };
    };
}

interface PRPOHistoryModalProps {
    stationId: string;
    stationName: string;
    onClose: () => void;
}

export const PRPOHistoryModal = ({ stationId, stationName, onClose }: PRPOHistoryModalProps) => {
    const [requests, setRequests] = useState<PurchaseRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedPO, setSelectedPO] = useState<any | null>(null);
    const [showPOModal, setShowPOModal] = useState(false);

    const loadRequests = async () => {
        try {
            setLoading(true);
            const res = await api.get(`/api/purchase-requests/station/${stationId}`);
            setRequests(res.data.requests || []);
        } catch (error) {
            console.error('Failed to load purchase requests:', error);
        } finally {
            setLoading(false);
        }
    };

    useState(() => {
        loadRequests();
    });

    const getFuelTypeLabel = (fuelType: string) => {
        switch (fuelType) {
            case '91_GASOLINE': return '91 Gasoline';
            case '95_GASOLINE': return '95 Gasoline';
            case '98_GASOLINE': return '98 Gasoline';
            case 'DIESEL': return 'Diesel';
            default: return fuelType;
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'PENDING':
                return <span className="px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">⏳ Pending Review</span>;
            case 'APPROVED':
                return <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">✓ Approved</span>;
            case 'REJECTED':
                return <span className="px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">✗ Rejected</span>;
            default:
                return <span className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">{status}</span>;
        }
    };

    const getPOStatusBadge = (po: any) => {
        if (po.receivedAt) {
            return <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">✓ Received</span>;
        }
        return <span className="px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">⏳ Pending Delivery</span>;
    };

    const handleViewPO = (request: PurchaseRequest) => {
        if (request.purchaseOrder) {
            setSelectedPO({
                ...request.purchaseOrder,
                purchaseRequest: {
                    fuelType: request.fuelType,
                    quantityLiters: request.quantityLiters,
                    paymentAmount: request.paymentAmount,
                    requestedDeliveryDate: request.requestedDeliveryDate,
                    receiptUrl: request.receiptUrl,
                    bankDepositAmount: request.bankDepositAmount,
                    bankDepositReceiptUrl: request.bankDepositReceiptUrl,
                    station: { name: stationName }
                }
            });
            setShowPOModal(true);
        }
    };

    return (
        <>
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-xl shadow-xl max-w-6xl w-full border border-gray-200 max-h-[90vh] overflow-y-auto">
                    <div className="p-6">
                        {/* Header */}
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h3 className="text-2xl font-bold text-gray-900">Purchase Requests & Orders History</h3>
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

                        {/* Content */}
                        {loading ? (
                            <div className="text-center py-12">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                                <p className="text-gray-600 mt-4">Loading history...</p>
                            </div>
                        ) : requests.length === 0 ? (
                            <div className="text-center py-12">
                                <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                <p className="text-gray-600">No purchase requests found</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {requests.map((request) => (
                                    <div key={request.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                                        <div className="flex items-start justify-between mb-3">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-3 mb-2">
                                                    <h4 className="text-lg font-semibold text-gray-900">
                                                        {getFuelTypeLabel(request.fuelType)}
                                                    </h4>
                                                    {getStatusBadge(request.status)}
                                                    {request.purchaseOrder && getPOStatusBadge(request.purchaseOrder)}
                                                </div>
                                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                                    <div>
                                                        <p className="text-gray-600">Quantity</p>
                                                        <p className="font-semibold text-gray-900">{request.quantityLiters.toLocaleString()} L</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-gray-600">Amount</p>
                                                        <p className="font-semibold text-gray-900">{request.paymentAmount.toLocaleString()} SAR</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-gray-600">Requested Date</p>
                                                        <p className="font-semibold text-gray-900">{new Date(request.requestedDeliveryDate).toLocaleString()}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-gray-600">Created By</p>
                                                        <p className="font-semibold text-gray-900">{request.createdBy.name}</p>
                                                    </div>
                                                    {request.bankDepositAmount !== undefined && request.bankDepositAmount > 0 && (
                                                        <div>
                                                            <p className="text-gray-600">Bank Deposit</p>
                                                            <p className="font-semibold text-gray-900">{request.bankDepositAmount.toLocaleString()} SAR</p>
                                                        </div>
                                                    )}
                                                </div>

                                                {request.receiptUrl && (
                                                    <div className="mt-2 text-sm">
                                                        <a
                                                            href={request.receiptUrl}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="text-blue-600 hover:text-blue-800 flex items-center gap-1 font-medium"
                                                        >
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                                                            </svg>
                                                            View Fuel Receipt
                                                        </a>
                                                    </div>
                                                )}

                                                {request.bankDepositReceiptUrl && (
                                                    <div className="mt-1 text-sm">
                                                        <a
                                                            href={request.bankDepositReceiptUrl}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="text-blue-600 hover:text-blue-800 flex items-center gap-1 font-medium"
                                                        >
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                                                            </svg>
                                                            View Deposit Receipt
                                                        </a>
                                                    </div>
                                                )}

                                                {/* PO Details if approved */}
                                                {request.purchaseOrder && (
                                                    <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex-1 grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                                                                <div>
                                                                    <p className="text-gray-600">PO Number</p>
                                                                    <p className="font-semibold text-green-800">{request.purchaseOrder.poNumber}</p>
                                                                </div>
                                                                <div>
                                                                    <p className="text-gray-600">Expected Delivery</p>
                                                                    <p className="font-semibold text-gray-900">{new Date(request.purchaseOrder.expectedDeliveryDate).toLocaleString()}</p>
                                                                </div>
                                                                {request.purchaseOrder.receivedAt && (
                                                                    <div>
                                                                        <p className="text-gray-600">Received On</p>
                                                                        <p className="font-semibold text-gray-900">{new Date(request.purchaseOrder.receivedAt).toLocaleString()}</p>
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <button
                                                                onClick={() => handleViewPO(request)}
                                                                className="ml-4 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                                                            >
                                                                {request.purchaseOrder.receivedAt ? 'View Details' : 'Mark as Received'}
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Rejection Reason if rejected */}
                                                {request.status === 'REJECTED' && request.rejectionReason && (
                                                    <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                                                        <p className="text-sm text-gray-600">Rejection Reason:</p>
                                                        <p className="text-sm font-medium text-red-800">{request.rejectionReason}</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="text-xs text-gray-500 mt-2">
                                            Created: {new Date(request.createdAt).toLocaleString()}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Close Button */}
                        <div className="mt-6 flex justify-end">
                            <button
                                onClick={onClose}
                                className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* PO Details Modal */}
            {showPOModal && selectedPO && (
                <PurchaseOrderDetailsModal
                    purchaseOrder={selectedPO}
                    onClose={() => {
                        setShowPOModal(false);
                        setSelectedPO(null);
                    }}
                    onSuccess={() => {
                        loadRequests();
                        setShowPOModal(false);
                        setSelectedPO(null);
                    }}
                />
            )}
        </>
    );
};
