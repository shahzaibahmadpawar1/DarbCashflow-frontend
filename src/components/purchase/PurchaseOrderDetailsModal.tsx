import { useState, useEffect } from 'react';
import api from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import { ProcurementConfirmModal } from './ProcurementConfirmModal';

interface PurchaseOrder {
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
    transporter?: { name: string };
    actualTransportationCost?: number;
    purchaseRequest: {
        fuelType: string;
        quantityLiters: number;
        paymentAmount: number;
        totalAmount?: number;
        buyingPricePerLiter?: number;
        transportationCost?: number;
        requestedDeliveryDate: string;
        receiptUrl?: string;
        station: { name: string };
    };
}

interface PurchaseOrderDetailsModalProps {
    purchaseOrder: PurchaseOrder;
    onClose: () => void;
    onSuccess: () => void;
}

interface Transporter {
    id: string;
    name: string;
    defaultCost: number;
}

export const PurchaseOrderDetailsModal = ({ purchaseOrder, onClose, onSuccess }: PurchaseOrderDetailsModalProps) => {
    const { user } = useAuth();
    const [showReceiveForm, setShowReceiveForm] = useState(false);
    const [showProcurementModal, setShowProcurementModal] = useState(false);
    const [transporters, setTransporters] = useState<Transporter[]>([]);
    const [receiveData, setReceiveData] = useState({
        actualDeliveryDate: new Date().toISOString().split('T')[0],
        invoiceNumber: '',
        invoiceUrl: '',
        receivedQuantityLiters: purchaseOrder.purchaseRequest.quantityLiters,
        transporterId: '',
        actualTransportationCost: purchaseOrder.purchaseRequest.transportationCost || 0,
    });
    const [uploading, setUploading] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const isAdmin = user?.role === 'Admin';
    const isProcurement = user?.role === 'Procurement';
    const isSM = user?.role === 'SM';

    useEffect(() => {
        fetchTransporters();
    }, []);

    const fetchTransporters = async () => {
        try {
            const res = await api.get('/api/transporters?activeOnly=true');
            setTransporters(res.data.transporters || []);
            if (res.data.transporters?.length > 0) {
                setReceiveData(prev => ({
                    ...prev,
                    transporterId: res.data.transporters[0].id,
                    actualTransportationCost: res.data.transporters[0].defaultCost,
                }));
            }
        } catch (error) {
            console.error('Failed to fetch transporters:', error);
        }
    };

    const handleTransporterChange = (transporterId: string) => {
        const transporter = transporters.find(t => t.id === transporterId);
        setReceiveData({
            ...receiveData,
            transporterId,
            actualTransportationCost: transporter?.defaultCost || 0,
        });
    };

    const calculateReceivedAmount = () => {
        const buyingRate = purchaseOrder.purchaseRequest.buyingPricePerLiter || 0;
        const fuelCost = receiveData.receivedQuantityLiters * buyingRate;
        return fuelCost + receiveData.actualTransportationCost;
    };

    const calculateVariance = () => {
        const orderedAmount = purchaseOrder.purchaseRequest.totalAmount || purchaseOrder.purchaseRequest.paymentAmount;
        const receivedAmount = calculateReceivedAmount();
        return orderedAmount - receivedAmount;
    };

    const receivedAmount = calculateReceivedAmount();
    const variance = calculateVariance();
    const varianceType = variance > 0 ? 'CREDIT' : variance < 0 ? 'DEBIT' : 'NONE';

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
            setReceiveData({ ...receiveData, invoiceUrl: res.data.url });
        } catch (error) {
            alert('Failed to upload invoice');
        } finally {
            setUploading(false);
        }
    };

    const handleMarkReceived = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!receiveData.invoiceNumber || !receiveData.transporterId) {
            alert('Please fill in all required fields');
            return;
        }

        try {
            setSubmitting(true);
            const response = await api.put(`/api/purchase-orders/${purchaseOrder.id}/receive`, receiveData);

            const varianceInfo = response.data.variance;
            let message = 'Purchase order marked as received!';

            if (varianceInfo?.varianceType === 'CREDIT') {
                message += `\n\n✓ Station credited ${Math.abs(varianceInfo.creditVariance).toLocaleString()} SAR (received less than ordered)`;
            } else if (varianceInfo?.varianceType === 'DEBIT') {
                message += `\n\n⚠ Station debited ${Math.abs(varianceInfo.creditVariance).toLocaleString()} SAR (received more than ordered)`;
            }

            alert(message);
            onSuccess();
            onClose();
        } catch (error: any) {
            alert(error.response?.data?.error || 'Failed to mark as received');
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

    const isReceived = !!purchaseOrder.receivedAt;
    const isProcurementConfirmed = !!purchaseOrder.procurementConfirmedAt;
    const canReceive = isProcurementConfirmed && !isReceived && (isSM || isAdmin);
    const canConfirmProcurement = !isProcurementConfirmed && !isReceived && (isProcurement || isAdmin);

    return (
        <>
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full border border-gray-200 max-h-[90vh] overflow-y-auto">
                    <div className="p-6">
                        {/* Header */}
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h3 className="text-2xl font-bold text-gray-900">Purchase Order Details</h3>
                                <p className="text-gray-600 mt-1">PO #{purchaseOrder.poNumber}</p>
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

                        {/* Status Badges */}
                        <div className="mb-6 flex gap-2">
                            {isReceived ? (
                                <span className="inline-block px-4 py-2 rounded-full text-sm font-medium bg-green-100 text-green-800">
                                    ✓ Received
                                </span>
                            ) : isProcurementConfirmed ? (
                                <span className="inline-block px-4 py-2 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                                    ✓ Procurement Confirmed
                                </span>
                            ) : (
                                <span className="inline-block px-4 py-2 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
                                    ⏳ Pending Procurement
                                </span>
                            )}
                        </div>

                        {/* PO Details */}
                        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-6">
                            <h4 className="text-md font-semibold text-gray-900 mb-3">Order Information</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <p className="text-sm text-gray-600">Station</p>
                                    <p className="text-sm font-semibold text-gray-900">
                                        {purchaseOrder.purchaseRequest?.station?.name || (purchaseOrder as any).station?.name || 'N/A'}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-600">Fuel Type</p>
                                    <p className="text-sm font-semibold text-gray-900">{getFuelTypeLabel(purchaseOrder.purchaseRequest?.fuelType || 'N/A')}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-600">Ordered Quantity</p>
                                    <p className="text-sm font-semibold text-gray-900">{(purchaseOrder.purchaseRequest?.quantityLiters || 0).toLocaleString()} L</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-600">Ordered Amount</p>
                                    <p className="text-sm font-semibold text-gray-900">
                                        {(purchaseOrder.purchaseRequest?.totalAmount || purchaseOrder.purchaseRequest?.paymentAmount || 0).toLocaleString()} SAR
                                    </p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-600">Expected Delivery</p>
                                    <p className="text-sm font-semibold text-gray-900">{new Date(purchaseOrder.expectedDeliveryDate).toLocaleDateString()}</p>
                                </div>
                            </div>
                        </div>

                        {/* Procurement Details */}
                        {isProcurementConfirmed && (
                            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 mb-6">
                                <h4 className="text-md font-semibold text-gray-900 mb-3">Procurement Details</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-sm text-gray-600">Aramco PO Number</p>
                                        <p className="text-sm font-semibold text-gray-900">{purchaseOrder.aramcoPoNumber || '-'}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-600">Aramco PO Date</p>
                                        <p className="text-sm font-semibold text-gray-900">
                                            {purchaseOrder.aramcoPoDate ? new Date(purchaseOrder.aramcoPoDate).toLocaleDateString() : '-'}
                                        </p>
                                    </div>
                                    {purchaseOrder.aramcoPoUrl && (
                                        <div className="col-span-2">
                                            <a
                                                href={purchaseOrder.aramcoPoUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                                            >
                                                View Aramco PO Document →
                                            </a>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Received Details */}
                        {isReceived && (
                            <div className="bg-green-50 p-4 rounded-lg border border-green-200 mb-6">
                                <h4 className="text-md font-semibold text-gray-900 mb-3">Delivery Details</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-sm text-gray-600">Actual Delivery Date</p>
                                        <p className="text-sm font-semibold text-gray-900">
                                            {purchaseOrder.actualDeliveryDate ? new Date(purchaseOrder.actualDeliveryDate).toLocaleDateString() : '-'}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-600">Invoice Number</p>
                                        <p className="text-sm font-semibold text-gray-900">{purchaseOrder.invoiceNumber || '-'}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-600">Received Quantity</p>
                                        <p className="text-sm font-semibold text-gray-900">{(purchaseOrder.receivedQuantityLiters || 0).toLocaleString()} L</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-600">Received Amount</p>
                                        <p className="text-sm font-semibold text-gray-900">{(purchaseOrder.receivedAmount || 0).toLocaleString()} SAR</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-600">Transporter</p>
                                        <p className="text-sm font-semibold text-gray-900">{purchaseOrder.transporter?.name || '-'}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-600">Transportation Cost</p>
                                        <p className="text-sm font-semibold text-gray-900">{(purchaseOrder.actualTransportationCost || 0).toLocaleString()} SAR</p>
                                    </div>
                                    {purchaseOrder.creditVariance !== undefined && purchaseOrder.creditVariance !== 0 && (
                                        <div className="col-span-2">
                                            <p className="text-sm text-gray-600">Credit Variance</p>
                                            <p className={`text-sm font-bold ${purchaseOrder.creditVariance > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                {purchaseOrder.creditVariance > 0 ? '+' : ''}{purchaseOrder.creditVariance.toLocaleString()} SAR
                                                <span className="text-xs font-normal ml-2">
                                                    ({purchaseOrder.creditVariance > 0 ? 'Credited to station' : 'Debited from station'})
                                                </span>
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Action Buttons */}
                        {canConfirmProcurement && (
                            <button
                                onClick={() => setShowProcurementModal(true)}
                                className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium mb-3"
                            >
                                Confirm Procurement
                            </button>
                        )}

                        {canReceive && !showReceiveForm && (
                            <button
                                onClick={() => setShowReceiveForm(true)}
                                className="w-full px-4 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-medium"
                            >
                                Mark as Received
                            </button>
                        )}

                        {/* Receive Form */}
                        {canReceive && showReceiveForm && (
                            <form onSubmit={handleMarkReceived} className="space-y-4">
                                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                                    <h4 className="text-md font-semibold text-gray-900 mb-3">Delivery Information</h4>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Actual Delivery Date *</label>
                                            <input
                                                type="date"
                                                required
                                                value={receiveData.actualDeliveryDate}
                                                onChange={(e) => setReceiveData({ ...receiveData, actualDeliveryDate: e.target.value })}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Invoice Number *</label>
                                            <input
                                                type="text"
                                                required
                                                value={receiveData.invoiceNumber}
                                                onChange={(e) => setReceiveData({ ...receiveData, invoiceNumber: e.target.value })}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent"
                                                placeholder="Enter invoice number"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Received Quantity (L) *</label>
                                            <input
                                                type="number"
                                                required
                                                step="0.01"
                                                value={receiveData.receivedQuantityLiters}
                                                onChange={(e) => setReceiveData({ ...receiveData, receivedQuantityLiters: parseFloat(e.target.value) || 0 })}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Transporter *</label>
                                            <select
                                                required
                                                value={receiveData.transporterId}
                                                onChange={(e) => handleTransporterChange(e.target.value)}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent"
                                            >
                                                {transporters.map(t => (
                                                    <option key={t.id} value={t.id}>{t.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="col-span-2">
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Transportation Cost (SAR) *</label>
                                            <input
                                                type="number"
                                                required
                                                step="0.01"
                                                value={receiveData.actualTransportationCost}
                                                onChange={(e) => setReceiveData({ ...receiveData, actualTransportationCost: parseFloat(e.target.value) || 0 })}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent"
                                            />
                                        </div>
                                    </div>

                                    {/* Variance Calculation */}
                                    <div className="bg-white p-3 rounded border border-gray-300 mb-4">
                                        <h5 className="text-sm font-semibold text-gray-900 mb-2">Amount Calculation</h5>
                                        <div className="space-y-1 text-xs">
                                            <div className="flex justify-between">
                                                <span className="text-gray-600">Received Fuel Cost:</span>
                                                <span className="font-medium">
                                                    {(receiveData.receivedQuantityLiters * (purchaseOrder.purchaseRequest.buyingPricePerLiter || 0)).toLocaleString()} SAR
                                                </span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-600">Transportation:</span>
                                                <span className="font-medium">{receiveData.actualTransportationCost.toLocaleString()} SAR</span>
                                            </div>
                                            <div className="flex justify-between pt-1 border-t">
                                                <span className="font-semibold">Received Amount:</span>
                                                <span className="font-bold text-primary">{receivedAmount.toLocaleString()} SAR</span>
                                            </div>
                                            <div className="flex justify-between pt-1 border-t">
                                                <span className="font-semibold">Variance:</span>
                                                <span className={`font-bold ${varianceType === 'CREDIT' ? 'text-green-600' : varianceType === 'DEBIT' ? 'text-red-600' : 'text-gray-900'}`}>
                                                    {variance > 0 ? '+' : ''}{variance.toLocaleString()} SAR
                                                </span>
                                            </div>
                                            {varianceType !== 'NONE' && (
                                                <p className="text-xs text-gray-600 mt-2">
                                                    {varianceType === 'CREDIT'
                                                        ? '✓ Station will be credited (received less than ordered)'
                                                        : '⚠ Station will be debited (received more than ordered)'}
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Invoice Upload (Optional)</label>
                                        <input
                                            type="file"
                                            accept="image/*,application/pdf"
                                            onChange={handleFileUpload}
                                            disabled={uploading}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent"
                                        />
                                        {uploading && <p className="mt-1 text-sm text-blue-600">Uploading...</p>}
                                        {receiveData.invoiceUrl && (
                                            <p className="mt-1 text-sm text-green-600">✓ Invoice uploaded</p>
                                        )}
                                    </div>
                                </div>

                                <div className="flex gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setShowReceiveForm(false)}
                                        className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={submitting || uploading}
                                        className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {submitting ? 'Confirming...' : 'Confirm Receipt'}
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            </div>

            {/* Procurement Confirmation Modal */}
            {showProcurementModal && (
                <ProcurementConfirmModal
                    purchaseOrder={purchaseOrder}
                    onClose={() => setShowProcurementModal(false)}
                    onSuccess={() => {
                        setShowProcurementModal(false);
                        onSuccess();
                    }}
                />
            )}
        </>
    );
};
