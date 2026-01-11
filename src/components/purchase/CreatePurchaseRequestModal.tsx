import { useState } from 'react';
import api from '../../services/api';

interface CreatePurchaseRequestModalProps {
    stationId: string;
    stationName: string;
    onClose: () => void;
    onSuccess: () => void;
}

export const CreatePurchaseRequestModal = ({ stationId, stationName, onClose, onSuccess }: CreatePurchaseRequestModalProps) => {
    const [formData, setFormData] = useState({
        fuelType: '91_GASOLINE' as '91_GASOLINE' | '95_GASOLINE' | 'DIESEL',
        quantityLiters: 0,
        paymentAmount: 0,
        requestedDeliveryDate: new Date().toISOString().split('T')[0],
        receiptUrl: '',
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
            setFormData({ ...formData, receiptUrl: res.data.url });
        } catch (error) {
            alert('Failed to upload receipt');
        } finally {
            setUploading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (formData.quantityLiters <= 0 || formData.paymentAmount <= 0) {
            alert('Please enter valid quantity and payment amount');
            return;
        }

        try {
            setSubmitting(true);
            await api.post('/api/purchase-requests', {
                stationId,
                ...formData,
            });

            alert('Purchase request created successfully!');
            onSuccess();
            onClose();
        } catch (error: any) {
            alert(error.response?.data?.error || 'Failed to create purchase request');
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
            <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full border border-gray-200">
                <div className="p-6">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h3 className="text-2xl font-bold text-gray-900">Create Purchase Request</h3>
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

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Fuel Type */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Fuel Type *</label>
                                <select
                                    required
                                    value={formData.fuelType}
                                    onChange={(e) => setFormData({ ...formData, fuelType: e.target.value as any })}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                                >
                                    <option value="91_GASOLINE">91 Gasoline</option>
                                    <option value="95_GASOLINE">95 Gasoline</option>
                                    <option value="DIESEL">Diesel</option>
                                </select>
                            </div>

                            {/* Quantity */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Quantity (Liters) *</label>
                                <input
                                    type="number"
                                    required
                                    min="1"
                                    step="0.01"
                                    value={formData.quantityLiters || ''}
                                    onChange={(e) => setFormData({ ...formData, quantityLiters: parseFloat(e.target.value) || 0 })}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                                    placeholder="Enter quantity"
                                />
                            </div>

                            {/* Payment Amount */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Payment Amount (SAR) *</label>
                                <input
                                    type="number"
                                    required
                                    min="0.01"
                                    step="0.01"
                                    value={formData.paymentAmount || ''}
                                    onChange={(e) => setFormData({ ...formData, paymentAmount: parseFloat(e.target.value) || 0 })}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                                    placeholder="Enter amount"
                                />
                            </div>

                            {/* Requested Delivery Date */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Requested Delivery Date *</label>
                                <input
                                    type="date"
                                    required
                                    value={formData.requestedDeliveryDate}
                                    onChange={(e) => setFormData({ ...formData, requestedDeliveryDate: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                                />
                            </div>
                        </div>

                        {/* Receipt Upload */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Receipt (Optional)</label>
                            <input
                                type="file"
                                accept="image/*,application/pdf"
                                onChange={handleFileUpload}
                                disabled={uploading}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                            />
                            {uploading && <p className="mt-1 text-sm text-blue-600">Uploading...</p>}
                            {formData.receiptUrl && (
                                <p className="mt-1 text-sm text-green-600">✓ Receipt uploaded</p>
                            )}
                        </div>

                        {/* Summary */}
                        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                            <h4 className="text-sm font-semibold text-gray-900 mb-2">Request Summary</h4>
                            <div className="space-y-1 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Fuel Type:</span>
                                    <span className="font-medium text-gray-900">{getFuelTypeLabel(formData.fuelType)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Quantity:</span>
                                    <span className="font-medium text-gray-900">{formData.quantityLiters.toLocaleString()} L</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Payment:</span>
                                    <span className="font-medium text-gray-900">{formData.paymentAmount.toLocaleString()} SAR</span>
                                </div>
                            </div>
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
                                {submitting ? 'Creating...' : 'Create Request'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};
