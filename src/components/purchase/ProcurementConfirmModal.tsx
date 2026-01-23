import { useState } from 'react';
import api from '../../services/api';
import { getLocalDateTimeString, convertLocalToUTC } from '../../utils/dateTimeUtils';

interface ProcurementConfirmModalProps {
    purchaseOrder: any;
    onClose: () => void;
    onSuccess: () => void;
}

export const ProcurementConfirmModal = ({ purchaseOrder, onClose, onSuccess }: ProcurementConfirmModalProps) => {
    const [formData, setFormData] = useState({
        aramcoPoNumber: '',
        aramcoPoDate: getLocalDateTimeString(), // Fixed: Use local time
        aramcoPoUrl: '',
    });
    const [uploading, setUploading] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const formDataUpload = new FormData();
        formDataUpload.append('receipt', file);

        try {
            setUploading(true);
            const res = await api.post('/api/upload/receipt', formDataUpload, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setFormData({ ...formData, aramcoPoUrl: res.data.url });
        } catch (error) {
            alert('Failed to upload Aramco PO document');
        } finally {
            setUploading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.aramcoPoNumber || !formData.aramcoPoDate) {
            alert('Please fill in all required fields');
            return;
        }

        if (!formData.aramcoPoUrl) {
            alert('Aramco PO document is required');
            return;
        }

        try {
            setSubmitting(true);
            await api.put(`/api/purchase-orders/${purchaseOrder.id}/confirm-procurement`, {
                aramcoPoNumber: formData.aramcoPoNumber,
                aramcoPoDate: convertLocalToUTC(formData.aramcoPoDate), // Fixed: Convert to UTC
                aramcoPoUrl: formData.aramcoPoUrl,
            });

            alert('Procurement confirmed successfully!');
            onSuccess();
            onClose();
        } catch (error: any) {
            console.error('Error confirming procurement:', error);
            alert(error.response?.data?.error || 'Failed to confirm procurement');
        } finally {
            setSubmitting(false);
        }
    };

    const pr = purchaseOrder.purchaseRequest;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full border border-gray-200 max-h-[90vh] overflow-y-auto">
                <div className="p-6">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h3 className="text-2xl font-bold text-gray-900">Confirm Procurement</h3>
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

                    {/* PO Details */}
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
                        <h4 className="text-sm font-semibold text-gray-900 mb-3">Purchase Order Details</h4>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                            <div>
                                <p className="text-gray-600">Station</p>
                                <p className="font-medium text-gray-900">{pr.station.name}</p>
                            </div>
                            <div>
                                <p className="text-gray-600">Fuel Type</p>
                                <p className="font-medium text-gray-900">
                                    {pr.fuelType === '91_GASOLINE' ? '91 Gasoline' : pr.fuelType === '95_GASOLINE' ? '95 Gasoline' : pr.fuelType === '98_GASOLINE' ? '98 Gasoline' : 'Diesel'}
                                </p>
                            </div>
                            <div>
                                <p className="text-gray-600">Quantity</p>
                                <p className="font-medium text-gray-900">{pr.quantityLiters.toLocaleString()} L</p>
                            </div>
                            <div>
                                <p className="text-gray-600">Total Amount</p>
                                <p className="font-medium text-gray-900">{pr.totalAmount.toLocaleString()} SAR</p>
                            </div>
                            <div>
                                <p className="text-gray-600">Expected Delivery</p>
                                <p className="font-medium text-gray-900">
                                    {new Date(purchaseOrder.expectedDeliveryDate).toLocaleString()}
                                </p>
                            </div>
                            {pr.bankDepositAmount > 0 && (
                                <div>
                                    <p className="text-gray-600">Bank Deposit</p>
                                    <p className="font-medium text-gray-900">{pr.bankDepositAmount.toLocaleString()} SAR</p>
                                </div>
                            )}
                            {pr.bankDepositReceiptUrl && (
                                <div className="col-span-2 mt-1">
                                    <a
                                        href={pr.bankDepositReceiptUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                                        </svg>
                                        View Deposit Receipt →
                                    </a>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Procurement Form */}
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Aramco PO Number *
                            </label>
                            <input
                                type="text"
                                required
                                value={formData.aramcoPoNumber}
                                onChange={(e) => setFormData({ ...formData, aramcoPoNumber: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                                placeholder="Enter Aramco PO number"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Aramco PO Date & Time *
                            </label>
                            <input
                                type="datetime-local"
                                required
                                value={formData.aramcoPoDate}
                                onChange={(e) => setFormData({ ...formData, aramcoPoDate: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Aramco PO Document *
                            </label>
                            <input
                                type="file"
                                accept="image/*,application/pdf"
                                onChange={handleFileUpload}
                                disabled={uploading}
                                required
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                            />
                            {uploading && <p className="mt-1 text-sm text-blue-600">Uploading...</p>}
                            {formData.aramcoPoUrl && (
                                <p className="mt-1 text-sm text-green-600">✓ Document uploaded</p>
                            )}
                        </div>

                        {/* Actions */}
                        <div className="flex gap-3 pt-4">
                            <button
                                type="button"
                                onClick={onClose}
                                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={submitting || uploading}
                                className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {submitting ? 'Confirming...' : 'Confirm Procurement'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};
