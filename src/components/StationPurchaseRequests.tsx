import { useState, useEffect } from 'react';
import api from '../services/api';
import { CreatePurchaseRequestModal } from './purchase/CreatePurchaseRequestModal';
import { PurchaseOrderDetailsModal } from './purchase/PurchaseOrderDetailsModal';

interface PurchaseRequest {
    id: string;
    fuelType: string;
    quantityLiters: number;
    paymentAmount: number;
    requestedDeliveryDate: string;
    status: string;
    createdAt: string;
    rejectionReason?: string;
    receiptUrl?: string;
    purchaseOrder?: {
        id: string;
        poNumber: string;
        expectedDeliveryDate: string;
        actualDeliveryDate?: string;
        invoiceNumber?: string;
        invoiceUrl?: string;
        receivedAt?: string;
        purchaseRequest: {
            fuelType: string;
            quantityLiters: number;
            paymentAmount: number;
            requestedDeliveryDate: string;
            receiptUrl?: string;
        };
    };
}

interface StationPurchaseRequestsProps {
    stationId: string;
    stationName: string;
}

export const StationPurchaseRequests = ({ stationId, stationName }: StationPurchaseRequestsProps) => {
    const [purchaseRequests, setPurchaseRequests] = useState<PurchaseRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [selectedPO, setSelectedPO] = useState<any>(null);

    useEffect(() => {
        loadPurchaseRequests();
    }, [stationId]);

    const loadPurchaseRequests = async () => {
        try {
            setLoading(true);
            const res = await api.get(`/api/purchase-requests/station/${stationId}`);
            setPurchaseRequests(res.data.purchaseRequests);
        } catch (error) {
            console.error('Failed to load purchase requests:', error);
        } finally {
            setLoading(false);
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

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'PENDING':
                return <span className="px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">⏳ Pending Review</span>;
            case 'APPROVED':
                return <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">✓ Approved</span>;
            case 'REJECTED':
                return <span className="px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">✗ Rejected</span>;
            case 'RECEIVED':
                return <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">✓ Received</span>;
            default:
                return <span className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">{status}</span>;
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold text-gray-900">Purchase Requests</h3>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-medium flex items-center gap-2"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Create Request
                </button>
            </div>

            {/* Purchase Requests List */}
            {purchaseRequests.length === 0 ? (
                <div className="bg-gray-50 rounded-lg border border-gray-200 p-8 text-center">
                    <p className="text-gray-500">No purchase requests yet</p>
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="mt-4 text-primary hover:text-primary/80 font-medium"
                    >
                        Create your first request →
                    </button>
                </div>
            ) : (
                <div className="space-y-3">
                    {purchaseRequests.map((pr) => (
                        <div
                            key={pr.id}
                            className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow"
                        >
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                        {getStatusBadge(pr.status)}
                                        <span className="text-xs text-gray-500">
                                            {new Date(pr.createdAt).toLocaleDateString()}
                                        </span>
                                    </div>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                        <div>
                                            <p className="text-xs text-gray-500">Fuel Type</p>
                                            <p className="text-sm font-semibold text-gray-900">{getFuelTypeLabel(pr.fuelType)}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500">Quantity</p>
                                            <p className="text-sm font-semibold text-gray-900">{pr.quantityLiters.toLocaleString()} L</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500">Amount</p>
                                            <p className="text-sm font-semibold text-gray-900">{pr.paymentAmount.toLocaleString()} SAR</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500">Delivery Date</p>
                                            <p className="text-sm font-semibold text-gray-900">
                                                {new Date(pr.requestedDeliveryDate).toLocaleDateString()}
                                            </p>
                                        </div>
                                    </div>

                                    {pr.receiptUrl && (
                                        <div className="mt-2 text-left">
                                            <a
                                                href={pr.receiptUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 font-medium"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                                                </svg>
                                                View Request Attachment
                                            </a>
                                        </div>
                                    )}

                                    {pr.status === 'REJECTED' && pr.rejectionReason && (
                                        <div className="mt-3 p-2 bg-red-50 rounded border border-red-200">
                                            <p className="text-xs text-red-600 font-medium">Rejection Reason:</p>
                                            <p className="text-sm text-red-700">{pr.rejectionReason}</p>
                                        </div>
                                    )}

                                    {pr.purchaseOrder && (
                                        <div className="mt-3 p-2 bg-green-50 rounded border border-green-200">
                                            <p className="text-xs text-green-600 font-medium">
                                                PO Generated: {pr.purchaseOrder.poNumber}
                                            </p>
                                        </div>
                                    )}
                                </div>

                                {pr.purchaseOrder && (
                                    <button
                                        onClick={() => setSelectedPO({
                                            ...pr.purchaseOrder,
                                            purchaseRequest: {
                                                fuelType: pr.fuelType,
                                                quantityLiters: pr.quantityLiters,
                                                paymentAmount: pr.paymentAmount,
                                                requestedDeliveryDate: pr.requestedDeliveryDate,
                                                receiptUrl: pr.receiptUrl,
                                            }
                                        })}
                                        className="px-3 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors font-medium text-sm whitespace-nowrap"
                                    >
                                        View PO
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Create Modal */}
            {showCreateModal && (
                <CreatePurchaseRequestModal
                    stationId={stationId}
                    stationName={stationName}
                    onClose={() => setShowCreateModal(false)}
                    onSuccess={loadPurchaseRequests}
                />
            )}

            {/* PO Details Modal */}
            {selectedPO && (
                <PurchaseOrderDetailsModal
                    purchaseOrder={selectedPO}
                    onClose={() => setSelectedPO(null)}
                    onSuccess={loadPurchaseRequests}
                />
            )}
        </div>
    );
};
