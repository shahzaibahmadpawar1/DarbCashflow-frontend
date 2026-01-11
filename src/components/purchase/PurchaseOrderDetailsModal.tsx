import { useState } from 'react';
import api from '../../services/api';

interface PurchaseOrder {
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
}

interface PurchaseOrderDetailsModalProps {
    purchaseOrder: PurchaseOrder;
    onClose: () => void;
    onSuccess: () => void;
}

export const PurchaseOrderDetailsModal = ({ purchaseOrder, onClose, onSuccess }: PurchaseOrderDetailsModalProps) => {
    const [showReceiveForm, setShowReceiveForm] = useState(false);
    const [receiveData, setReceiveData] = useState({
        actualDeliveryDate: new Date().toISOString().split('T')[0],
        invoiceNumber: '',
        invoiceUrl: '',
    });
    const [uploading, setUploading] = useState(false);
    const [submitting, setSubmitting] = useState(false);

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

        if (!receiveData.invoiceNumber) {
            alert('Please enter invoice number');
            return;
        }

        try {
            setSubmitting(true);
            await api.put(`/api/purchase-orders/${purchaseOrder.id}/receive`, receiveData);
            alert('Purchase order marked as received!');
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
            case 'DIESEL': return 'Diesel';
            default: return fuelType;
        }
    };

    const isReceived = !!purchaseOrder.receivedAt;

    return (
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

                    {/* Status Badge */}
                    <div className="mb-6">
                        {isReceived ? (
                            <span className="inline-block px-4 py-2 rounded-full text-sm font-medium bg-green-100 text-green-800">
                                ✓ Received
                            </span>
                        ) : (
                            <span className="inline-block px-4 py-2 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
                                ⏳ Pending Delivery
                            </span>
                        )}
                    </div>

                    {/* PO Details */}
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-6">
                        <h4 className="text-md font-semibold text-gray-900 mb-3">Order Information</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <p className="text-sm text-gray-600">Fuel Type</p>
                                <p className="text-sm font-semibold text-gray-900">{getFuelTypeLabel(purchaseOrder.purchaseRequest?.fuelType || 'N/A')}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-600">Quantity</p>
                                <p className="text-sm font-semibold text-gray-900">{(purchaseOrder.purchaseRequest?.quantityLiters || 0).toLocaleString()} L</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-600">Payment Amount</p>
                                <p className="text-sm font-semibold text-gray-900">{(purchaseOrder.purchaseRequest?.paymentAmount || 0).toLocaleString()} SAR</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-600">Expected Delivery</p>
                                <p className="text-sm font-semibold text-gray-900">{new Date(purchaseOrder.expectedDeliveryDate).toLocaleDateString()}</p>
                            </div>
                            {purchaseOrder.purchaseRequest?.receiptUrl && (
                                <div className="col-span-1 md:col-span-2">
                                    <p className="text-sm text-gray-600 mb-1">Request Attachment</p>
                                    <a
                                        href={purchaseOrder.purchaseRequest.receiptUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                                        </svg>
                                        View Attached Receipt
                                    </a>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Received Details (if received) */}
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
                                    <p className="text-sm text-gray-600">Received At</p>
                                    <p className="text-sm font-semibold text-gray-900">
                                        {new Date(purchaseOrder.receivedAt!).toLocaleString()}
                                    </p>
                                </div>
                                {purchaseOrder.invoiceUrl && (
                                    <div>
                                        <p className="text-sm text-gray-600">Invoice</p>
                                        <a
                                            href={purchaseOrder.invoiceUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                            </svg>
                                            View Invoice
                                        </a>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Mark as Received Form */}
                    {!isReceived && !showReceiveForm && (
                        <button
                            onClick={() => setShowReceiveForm(true)}
                            className="w-full px-4 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-medium"
                        >
                            Mark as Received
                        </button>
                    )}

                    {!isReceived && showReceiveForm && (
                        <form onSubmit={handleMarkReceived} className="space-y-4">
                            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                                <h4 className="text-md font-semibold text-gray-900 mb-3">Delivery Information</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                                </div>
                                <div className="mt-4">
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
        </div >
    );
};
