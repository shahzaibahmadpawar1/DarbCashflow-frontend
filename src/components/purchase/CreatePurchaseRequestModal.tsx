import { useState, useEffect } from 'react';
import api from '../../services/api';

interface CreatePurchaseRequestModalProps {
    stationId: string;
    stationName: string;
    onClose: () => void;
    onSuccess: () => void;
}

interface CreditSummary {
    station: {
        id: string;
        name: string;
        hasCreditFacility: boolean;
        totalCreditLimit: number;
        utilizedCredits: number;
        availableCredits?: number; // Made optional as it might not be in API response
    };
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
    const [creditSummary, setCreditSummary] = useState<CreditSummary | null>(null);
    const [loadingCredit, setLoadingCredit] = useState(true);

    useEffect(() => {
        fetchCreditSummary();
    }, [stationId]);

    const fetchCreditSummary = async () => {
        try {
            setLoadingCredit(true);
            const res = await api.get(`/api/credit-transactions/${stationId}/summary`);
            setCreditSummary(res.data);
        } catch (error) {
            console.error('Failed to fetch credit summary:', error);
        } finally {
            setLoadingCredit(false);
        }
    };

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

    // Helper to calculate available credits safely
    const getCreditStatus = () => {
        if (!creditSummary?.station) return { available: 0, canUse: false };

        const { totalCreditLimit, utilizedCredits, availableCredits, hasCreditFacility } = creditSummary.station;

        // Use provided availableCredits or calculate it manually
        const calculatedAvailable = availableCredits ?? (totalCreditLimit - utilizedCredits);

        const canUse = hasCreditFacility && calculatedAvailable >= formData.paymentAmount;

        return {
            available: calculatedAvailable,
            canUse
        };
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (formData.quantityLiters <= 0 || formData.paymentAmount <= 0) {
            alert('Please enter valid quantity and payment amount');
            return;
        }

        // Check receipt requirement using helper
        const { canUse } = getCreditStatus();

        if (!canUse && !formData.receiptUrl) {
            alert('Receipt is required for stations without sufficient credits');
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

    const { available: availableCredits, canUse: canUseCredits } = getCreditStatus();
    const receiptRequired = !canUseCredits;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full border border-gray-200 max-h-[90vh] overflow-y-auto">
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

                    {/* Credit Status */}
                    {loadingCredit ? (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                            <p className="text-sm text-blue-700">Loading credit information...</p>
                        </div>
                    ) : creditSummary?.station.hasCreditFacility ? (
                        <div className={`border rounded-lg p-4 mb-4 ${canUseCredits
                            ? 'bg-green-50 border-green-200'
                            : 'bg-orange-50 border-orange-200'
                            }`}>
                            <h4 className="text-sm font-semibold mb-2">Credit Status</h4>
                            <div className="grid grid-cols-3 gap-4 text-sm">
                                <div>
                                    <p className="text-gray-600">Total Limit</p>
                                    <p className="font-bold">{creditSummary.station.totalCreditLimit.toLocaleString()} SAR</p>
                                </div>
                                <div>
                                    <p className="text-gray-600">Utilized</p>
                                    <p className="font-bold">{creditSummary.station.utilizedCredits.toLocaleString()} SAR</p>
                                </div>
                                <div>
                                    <p className="text-gray-600">Available</p>
                                    <p className="font-bold text-green-600">{availableCredits.toLocaleString()} SAR</p>
                                </div>
                            </div>
                            {canUseCredits ? (
                                <p className="text-sm text-green-700 mt-2">✓ This request can use station credits</p>
                            ) : (
                                <p className="text-sm text-orange-700 mt-2">⚠ Insufficient credits - receipt required</p>
                            )}
                        </div>
                    ) : (
                        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4">
                            <p className="text-sm text-orange-700">⚠ This station does not have credit facility - receipt is required</p>
                        </div>
                    )}

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
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Receipt {receiptRequired ? <span className="text-red-600">*</span> : '(Optional)'}
                            </label>
                            <input
                                type="file"
                                accept="image/*,application/pdf"
                                onChange={handleFileUpload}
                                disabled={uploading}
                                required={receiptRequired}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                            />
                            {uploading && <p className="mt-1 text-sm text-blue-600">Uploading...</p>}
                            {formData.receiptUrl && (
                                <p className="mt-1 text-sm text-green-600">✓ Receipt uploaded</p>
                            )}
                            {receiptRequired && !formData.receiptUrl && (
                                <p className="mt-1 text-sm text-orange-600">Receipt is required for this request</p>
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
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Payment Method:</span>
                                    <span className={`font-medium ${canUseCredits ? 'text-green-600' : 'text-orange-600'}`}>
                                        {canUseCredits ? 'Using Credits' : 'Cash Payment'}
                                    </span>
                                </div>
                                {canUseCredits && creditSummary && (
                                    <div className="flex justify-between pt-2 border-t border-gray-200">
                                        <span className="text-gray-600">Credits After:</span>
                                        <span className="font-medium text-gray-900">
                                            {(availableCredits - formData.paymentAmount).toLocaleString()} SAR
                                        </span>
                                    </div>
                                )}
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
