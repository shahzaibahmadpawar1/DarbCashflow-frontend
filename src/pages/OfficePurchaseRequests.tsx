import { useState, useEffect } from 'react';
import api from '../services/api';
import { PurchaseRequestReviewModal } from '../components/purchase/PurchaseRequestReviewModal';

interface PurchaseRequest {
    id: string;
    fuelType: string;
    quantityLiters: number;
    paymentAmount: number;
    requestedDeliveryDate: string;
    receiptUrl?: string;
    status: string;
    createdAt: string;
    rejectionReason?: string;
    station: {
        id: string;
        name: string;
        purchaseCredits: number;
        stationType?: 'OPERATIONAL' | 'RENTAL' | 'FRANCHISE';
    };
    creator: {
        name: string;
        employeeId: string;
    };
    purchaseOrder?: {
        poNumber: string;
    };
}

export const OfficePurchaseRequests = () => {
    const [purchaseRequests, setPurchaseRequests] = useState<PurchaseRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedPR, setSelectedPR] = useState<PurchaseRequest | null>(null);
    const [statusFilter, setStatusFilter] = useState<'all' | 'PENDING' | 'APPROVED' | 'REJECTED'>('all');
    const [categoryFilter, setCategoryFilter] = useState<'all' | 'OPERATIONAL' | 'RENTAL' | 'FRANCHISE'>('all');

    useEffect(() => {
        loadPurchaseRequests();
    }, []);

    const loadPurchaseRequests = async () => {
        try {
            setLoading(true);
            const res = await api.get('/api/purchase-requests/office-user');
            setPurchaseRequests(res.data.purchaseRequests || []);
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
                return <span className="px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">⏳ Pending</span>;
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

    // Apply both status and category filters
    let filteredRequests = purchaseRequests;

    if (statusFilter !== 'all') {
        filteredRequests = filteredRequests.filter(pr => pr.status === statusFilter);
    }

    if (categoryFilter !== 'all') {
        filteredRequests = filteredRequests.filter(pr => pr.station.stationType === categoryFilter);
    }

    if (loading) {
        return (
            <div className="flex justify-center items-center p-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex flex-col gap-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Purchase Requests</h1>
                        <p className="text-gray-600 mt-1">Review and manage fuel purchase requests</p>
                    </div>
                </div>

                {/* Filters */}
                <div className="flex flex-col gap-3">
                    {/* Status Filter */}
                    <div>
                        <label className="text-sm font-medium text-gray-700 mb-2 block">Filter by Status</label>
                        <div className="flex flex-wrap gap-2">
                            <button
                                onClick={() => setStatusFilter('all')}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${statusFilter === 'all' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                    }`}
                            >
                                All ({purchaseRequests.length})
                            </button>
                            <button
                                onClick={() => setStatusFilter('PENDING')}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${statusFilter === 'PENDING' ? 'bg-yellow-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                    }`}
                            >
                                Pending ({purchaseRequests.filter(pr => pr.status === 'PENDING').length})
                            </button>
                            <button
                                onClick={() => setStatusFilter('APPROVED')}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${statusFilter === 'APPROVED' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                    }`}
                            >
                                Approved ({purchaseRequests.filter(pr => pr.status === 'APPROVED' || pr.status === 'RECEIVED').length})
                            </button>
                        </div>
                    </div>

                    {/* Category Filter */}
                    <div>
                        <label className="text-sm font-medium text-gray-700 mb-2 block">Filter by Station Type</label>
                        <div className="flex flex-wrap gap-2">
                            <button
                                onClick={() => setCategoryFilter('all')}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${categoryFilter === 'all' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                    }`}
                            >
                                All Stations
                            </button>
                            <button
                                onClick={() => setCategoryFilter('OPERATIONAL')}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${categoryFilter === 'OPERATIONAL' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                    }`}
                            >
                                Operational ({purchaseRequests.filter(pr => pr.station.stationType === 'OPERATIONAL').length})
                            </button>
                            <button
                                onClick={() => setCategoryFilter('RENTAL')}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${categoryFilter === 'RENTAL' ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                    }`}
                            >
                                Rental ({purchaseRequests.filter(pr => pr.station.stationType === 'RENTAL').length})
                            </button>
                            <button
                                onClick={() => setCategoryFilter('FRANCHISE')}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${categoryFilter === 'FRANCHISE' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                    }`}
                            >
                                Franchise ({purchaseRequests.filter(pr => pr.station.stationType === 'FRANCHISE').length})
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Purchase Requests List */}
            {filteredRequests.length === 0 ? (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
                    <p className="text-gray-500">No purchase requests found</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4">
                    {filteredRequests.map((pr) => {
                        const hasInsufficientCredits = pr.station.purchaseCredits < pr.paymentAmount;

                        return (
                            <div
                                key={pr.id}
                                className={`bg-white rounded-xl shadow-sm border-2 p-6 transition-all hover:shadow-md ${pr.status === 'PENDING' && hasInsufficientCredits
                                    ? 'border-red-300 bg-red-50/30'
                                    : 'border-gray-200 hover:border-primary'
                                    }`}
                            >
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <h3 className="text-lg font-semibold text-gray-900">{pr.station.name}</h3>
                                            {getStatusBadge(pr.status)}
                                            {pr.status === 'PENDING' && hasInsufficientCredits && (
                                                <span className="px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                                    ⚠️ Insufficient Credits
                                                </span>
                                            )}
                                        </div>
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3">
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
                                                <p className="text-xs text-gray-500">Requested By</p>
                                                <p className="text-sm font-semibold text-gray-900">{pr.creator.name}</p>
                                            </div>
                                        </div>
                                        {pr.receiptUrl && (
                                            <div className="mt-2 text-sm">
                                                <a
                                                    href={pr.receiptUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 font-medium"
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                                                    </svg>
                                                    View Request Attachment
                                                </a>
                                            </div>
                                        )}
                                        {pr.status === 'REJECTED' && pr.rejectionReason && (
                                            <div className="mt-3 p-3 bg-red-50 rounded-lg border border-red-200">
                                                <p className="text-xs text-red-600 font-medium">Rejection Reason:</p>
                                                <p className="text-sm text-red-700">{pr.rejectionReason}</p>
                                            </div>
                                        )}
                                        {pr.purchaseOrder && (
                                            <div className="mt-3 p-3 bg-green-50 rounded-lg border border-green-200">
                                                <p className="text-xs text-green-600 font-medium">PO Generated: {pr.purchaseOrder.poNumber}</p>
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        {pr.status === 'PENDING' && (
                                            <button
                                                onClick={() => setSelectedPR(pr)}
                                                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-medium text-sm whitespace-nowrap"
                                            >
                                                Review Request
                                            </button>
                                        )}
                                        <p className="text-xs text-gray-500 text-center">
                                            {new Date(pr.createdAt).toLocaleDateString()}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Review Modal */}
            {selectedPR && (
                <PurchaseRequestReviewModal
                    purchaseRequest={selectedPR}
                    onClose={() => setSelectedPR(null)}
                    onSuccess={() => {
                        loadPurchaseRequests();
                        setSelectedPR(null);
                    }}
                />
            )}
        </div>
    );
};
