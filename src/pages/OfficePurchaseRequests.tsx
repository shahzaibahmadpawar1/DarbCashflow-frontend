import { useState, useEffect } from 'react';
import api from '../services/api';
import { PurchaseRequestReviewModal } from '../components/purchase/PurchaseRequestReviewModal';
import { PaymentVerificationModal } from '../components/purchase/PaymentVerificationModal';
import { DailyPOReportModal } from '../components/purchase/DailyPOReportModal';
import { PurchaseOrderDetailsModal, PurchaseOrder } from '../components/purchase/PurchaseOrderDetailsModal';
import { useAuth } from '../hooks/useAuth';

interface PurchaseRequest {
    id: string;
    fuelType: string;
    quantityLiters: number;
    paymentAmount: number;
    bankDepositAmount?: number;
    bankDepositReceiptUrl?: string;
    requestedDeliveryDate: string;
    receiptUrl?: string;
    usingCredits?: boolean;
    paymentVerified?: boolean;
    paymentVerifiedAt?: string;
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
        id: string;
        name: string;
        employeeId: string;
    };
    paymentVerifiedBy?: { id: string; name: string; employeeId: string };
    purchaseOrder?: PurchaseOrder;
    totalAmount?: number;
    buyingPricePerLiter?: number;
    transportationCost?: number;
}

export const OfficePurchaseRequests = () => {
    const { user } = useAuth();
    const [purchaseRequests, setPurchaseRequests] = useState<PurchaseRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedPR, setSelectedPR] = useState<PurchaseRequest | null>(null);
    const [selectedPaymentPR, setSelectedPaymentPR] = useState<PurchaseRequest | null>(null);
    const [statusFilter, setStatusFilter] = useState<'all' | 'PENDING' | 'APPROVED' | 'REJECTED'>('all');
    const [categoryFilter, setCategoryFilter] = useState<'all' | 'OPERATIONAL' | 'RENTAL' | 'FRANCHISE'>('all');
    const [showDailyReport, setShowDailyReport] = useState(false);
    const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0]);
    const [dailyPOs, setDailyPOs] = useState<any[]>([]);
    const [viewingPO, setViewingPO] = useState<PurchaseOrder | null>(null);

    const isAccountant = user?.role === 'Accountant';
    const isAdmin = user?.role === 'Admin';
    const isOU = user?.role === 'OU';
    const isViewOnly = user?.role === 'ViewOnly';

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



    const loadDailyPOs = async (date: string) => {
        try {
            const res = await api.get(`/api/purchase-orders/daily-report?date=${date}`);
            setDailyPOs(res.data);
            setShowDailyReport(true);
        } catch (error: any) {
            alert(error.response?.data?.error || 'Failed to load daily PO report');
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

                    {/* Daily PO Report Button */}
                    <div className="flex items-center gap-3">
                        <input
                            type="date"
                            value={reportDate}
                            onChange={(e) => setReportDate(e.target.value)}
                            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        <button
                            onClick={() => loadDailyPOs(reportDate)}
                            className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium whitespace-nowrap"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            Daily PO Report
                        </button>
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
                                                {pr.bankDepositAmount && pr.bankDepositAmount > 0 && (
                                                    <p className="text-xs text-green-600 font-medium">+{pr.bankDepositAmount.toLocaleString()} SAR deposit</p>
                                                )}
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
                                        {/* Payment Verification Status */}
                                        {(pr.receiptUrl || pr.bankDepositReceiptUrl) && (
                                            <div className={`mt-3 p-3 rounded-lg border ${pr.paymentVerified
                                                ? 'bg-green-50 border-green-200'
                                                : 'bg-orange-50 border-orange-200'
                                                }`}>
                                                {pr.paymentVerified ? (
                                                    <div>
                                                        <p className="text-xs text-green-600 font-medium flex items-center gap-1">
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                            </svg>
                                                            Payment Verified by Accountant
                                                        </p>
                                                        {pr.paymentVerifiedAt && (
                                                            <p className="text-xs text-green-600 mt-1">
                                                                {new Date(pr.paymentVerifiedAt).toLocaleString()}
                                                            </p>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <p className="text-xs text-orange-700 font-medium flex items-center gap-1">
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                        </svg>
                                                        Awaiting Payment Verification
                                                    </p>
                                                )}
                                            </div>
                                        )}
                                        {pr.status === 'REJECTED' && pr.rejectionReason && (
                                            <div className="mt-3 p-3 bg-red-50 rounded-lg border border-red-200">
                                                <p className="text-xs text-red-600 font-medium">Rejection Reason:</p>
                                                <p className="text-sm text-red-700">{pr.rejectionReason}</p>
                                            </div>
                                        )}
                                        {pr.purchaseOrder && (
                                            <div className="mt-3 p-3 bg-green-50 rounded-lg border border-green-200 flex items-center justify-between">
                                                <p className="text-xs text-green-600 font-medium">PO Generated: {pr.purchaseOrder.poNumber}</p>
                                                <button
                                                    onClick={() => {
                                                        const poForModal = {
                                                            ...pr.purchaseOrder,
                                                            purchaseRequest: {
                                                                ...pr,
                                                                station: pr.station
                                                            }
                                                        };
                                                        setViewingPO(poForModal as any);
                                                    }}
                                                    className="text-xs bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 transition-colors font-medium"
                                                >
                                                    View PO
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        {/* Accountant: Review Payment Button */}
                                        {(isAccountant || isAdmin) && pr.status === 'PENDING' && (pr.receiptUrl || pr.bankDepositReceiptUrl) && !pr.paymentVerified && (
                                            <button
                                                onClick={() => setSelectedPaymentPR(pr)}
                                                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium text-sm whitespace-nowrap flex items-center justify-center gap-2"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                                Review Payment
                                            </button>
                                        )}
                                        {/* OU/Admin: Review Request Button */}
                                        {!isAccountant && !isViewOnly && (isAdmin || isOU) && pr.status === 'PENDING' && (
                                            <button
                                                onClick={() => setSelectedPR(pr)}
                                                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-medium text-sm whitespace-nowrap"
                                            >
                                                Review Request
                                            </button>
                                        )}
                                        <p className="text-xs text-gray-500 text-center">
                                            {new Date(pr.createdAt).toLocaleString()}
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
                    userRole={user?.role}
                    onClose={() => setSelectedPR(null)}
                    onSuccess={() => {
                        loadPurchaseRequests();
                        setSelectedPR(null);
                    }}
                />
            )}

            {/* Payment Verification Modal */}
            {selectedPaymentPR && (
                <PaymentVerificationModal
                    purchaseRequest={selectedPaymentPR}
                    onClose={() => setSelectedPaymentPR(null)}
                    onSuccess={() => {
                        loadPurchaseRequests();
                        setSelectedPaymentPR(null);
                    }}
                />
            )}

            {/* Daily PO Report Modal */}
            {showDailyReport && (
                <DailyPOReportModal
                    purchaseOrders={dailyPOs}
                    selectedDate={reportDate}
                    onClose={() => setShowDailyReport(false)}
                />
            )}
            {/* PO Details Modal */}
            {viewingPO && (
                <PurchaseOrderDetailsModal
                    purchaseOrder={viewingPO}
                    onClose={() => setViewingPO(null)}
                    onSuccess={() => {
                        setViewingPO(null);
                        loadPurchaseRequests();
                    }}
                />
            )}
        </div>
    );
};
