import { useState, useEffect } from 'react';
import api from '../../services/api';
import { getLocalDateTimeString, convertLocalToUTC } from '../../utils/dateTimeUtils';

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
        availableCredits?: number;
        transportationCost?: number;
    };
}

export const CreatePurchaseRequestModal = ({ stationId, stationName, onClose, onSuccess }: CreatePurchaseRequestModalProps) => {
    const [formData, setFormData] = useState({
        fuelType: '91_GASOLINE' as '91_GASOLINE' | '95_GASOLINE' | '98_GASOLINE' | 'DIESEL',
        quantityLiters: 0,
        requestedDeliveryDate: getLocalDateTimeString(), // Fixed: Use local time
        receiptUrl: '',
        bankDepositAmount: 0,
        bankDepositReceiptUrl: '',
    });
    const [uploading, setUploading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [creditSummary, setCreditSummary] = useState<CreditSummary | null>(null);
    const [loadingCredit, setLoadingCredit] = useState(true);
    const [buyingRate, setBuyingRate] = useState<number | null>(null);
    const [loadingRate, setLoadingRate] = useState(false);
    const [transportationCost, setTransportationCost] = useState(0);

    useEffect(() => {
        fetchCreditSummary();
    }, [stationId]);

    useEffect(() => {
        if (formData.fuelType && stationId) {
            fetchBuyingRate();
        }
    }, [formData.fuelType, stationId]);

    const fetchCreditSummary = async () => {
        try {
            setLoadingCredit(true);
            const res = await api.get(`/api/credit-transactions/${stationId}/summary`);
            setCreditSummary(res.data);

            // Fetch Bin Salman's transportation cost
            try {
                const transporterRes = await api.get('/api/transporters');
                const binSalman = transporterRes.data.transporters?.find((t: any) => t.name === 'Bin Salman');
                setTransportationCost(binSalman?.defaultCost || 0);
            } catch (error) {
                console.error('Failed to fetch transporter cost:', error);
                setTransportationCost(0);
            }
        } catch (error) {
            console.error('Failed to fetch credit summary:', error);
        } finally {
            setLoadingCredit(false);
        }
    };

    const fetchBuyingRate = async () => {
        try {
            setLoadingRate(true);
            const res = await api.get(`/api/fuel-buying-rates/station/${stationId}/${formData.fuelType}`);
            setBuyingRate(res.data.rate.buyingPricePerLiter);
        } catch (error) {
            console.error('Failed to fetch buying rate:', error);
            setBuyingRate(null);
        } finally {
            setLoadingRate(false);
        }
    };

    const calculateTotalAmount = () => {
        if (!buyingRate || formData.quantityLiters <= 0) return 0;
        const fuelCost = formData.quantityLiters * buyingRate;
        return fuelCost + transportationCost;
    };

    const totalAmount = calculateTotalAmount();

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

    const getCreditStatus = () => {
        if (!creditSummary?.station) return { available: 0, canUse: false };

        const { totalCreditLimit, utilizedCredits, availableCredits, hasCreditFacility } = creditSummary.station;
        const calculatedAvailable = availableCredits ?? (totalCreditLimit - utilizedCredits);
        const canUse = hasCreditFacility && calculatedAvailable >= totalAmount;

        return {
            available: calculatedAvailable,
            canUse
        };
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (formData.quantityLiters <= 0) {
            alert('Please enter valid quantity');
            return;
        }

        if (!buyingRate) {
            alert('Buying rate not set for this fuel type. Please contact admin.');
            return;
        }

        const { canUse } = getCreditStatus();

        if (!canUse && !formData.receiptUrl) {
            alert('Receipt is required for stations without sufficient credits');
            return;
        }

        try {
            setSubmitting(true);
            await api.post('/api/purchase-requests', {
                stationId,
                fuelType: formData.fuelType,
                quantityLiters: formData.quantityLiters,
                requestedDeliveryDate: convertLocalToUTC(formData.requestedDeliveryDate), // Fixed: Convert to UTC
                receiptUrl: formData.receiptUrl,
                bankDepositAmount: formData.bankDepositAmount,
                bankDepositReceiptUrl: formData.bankDepositReceiptUrl,
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
            case '98_GASOLINE': return '98 Gasoline';
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
                                    <option value="98_GASOLINE">98 Gasoline</option>
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
                        </div>

                        {/* Auto-Calculated Amount Display */}
                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                            <h4 className="text-sm font-semibold text-gray-900 mb-3">Amount Calculation</h4>
                            {loadingRate ? (
                                <p className="text-sm text-gray-600">Loading buying rate...</p>
                            ) : !buyingRate ? (
                                <div className="bg-red-50 border border-red-200 rounded p-3">
                                    <p className="text-sm text-red-700">⚠ Buying rate not set for {getFuelTypeLabel(formData.fuelType)}. Please contact admin.</p>
                                </div>
                            ) : (
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Buying Rate:</span>
                                        <span className="font-medium text-gray-900">{buyingRate.toFixed(10)} SAR/L</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Quantity:</span>
                                        <span className="font-medium text-gray-900">{formData.quantityLiters.toLocaleString()} L</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Fuel Cost:</span>
                                        <span className="font-medium text-gray-900">
                                            {(formData.quantityLiters * buyingRate).toLocaleString()} SAR
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Transportation (Bin Salman):</span>
                                        <span className="font-medium text-gray-900">{transportationCost.toLocaleString()} SAR</span>
                                    </div>
                                    <div className="flex justify-between pt-2 border-t border-gray-300">
                                        <span className="font-semibold text-gray-900">Total Amount:</span>
                                        <span className="font-bold text-primary text-lg">{totalAmount.toLocaleString()} SAR</span>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-2">
                                        = ({formData.quantityLiters.toLocaleString()} × {buyingRate.toFixed(10)}) + {transportationCost}
                                    </p>
                                    <p className="text-xs text-blue-600 mt-1">
                                        💡 Transporter can be changed at receiving if needed
                                    </p>
                                </div>
                            )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Bank Deposit */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Bank Deposit (SAR)</label>
                                <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={formData.bankDepositAmount || ''}
                                    onChange={(e) => setFormData({ ...formData, bankDepositAmount: parseFloat(e.target.value) || 0 })}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                                    placeholder="Enter deposit amount (optional)"
                                />
                                <p className="mt-1 text-xs text-gray-500">
                                    💡 Bank deposits will be added to your available credits
                                </p>
                            </div>

                            {/* Requested Delivery Date & Time */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Requested Delivery Date & Time *</label>
                                <input
                                    type="datetime-local"
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
                                disabled={submitting || uploading || !buyingRate}
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
