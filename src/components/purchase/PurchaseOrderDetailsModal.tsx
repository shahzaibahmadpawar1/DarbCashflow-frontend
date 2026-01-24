import { useState, useEffect } from 'react';
import api from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import { ProcurementConfirmModal } from './ProcurementConfirmModal';
import { getLocalDateTimeString, convertLocalToUTC } from '../../utils/dateTimeUtils';

export interface PurchaseOrder {
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
    createdAt: string;
    transporter?: { id: string; name: string };
    actualTransportationCost?: number;
    creator?: { id: string; name: string; employeeId?: string };
    receiver?: { id: string; name: string; employeeId?: string };
    procurementConfirmedBy?: { id: string; name: string; employeeId?: string };
    purchaseRequest: {
        fuelType: string;
        quantityLiters: number;
        paymentAmount: number;
        totalAmount?: number;
        buyingPricePerLiter?: number;
        transportationCost?: number;
        requestedDeliveryDate: string;
        receiptUrl?: string;
        bankDepositAmount?: number;
        bankDepositReceiptUrl?: string;
        paymentVerified?: boolean;
        paymentVerifiedAt?: string;
        paymentVerifiedBy?: { id: string; name: string; employeeId?: string };
        createdAt?: string;
        approvedAt?: string;
        approvedBy?: { id: string; name: string; employeeId?: string };
        rejectedAt?: string;
        rejectedBy?: { id: string; name: string; employeeId?: string };
        reviewedAt?: string;
        reviewedBy?: { id: string; name: string; employeeId?: string };
        station: { name: string };
        creator?: { id: string; name: string; employeeId?: string };
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
        actualDeliveryDate: getLocalDateTimeString(),
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

            // Pre-select transporter from PO if available, otherwise use first transporter
            if (res.data.transporters?.length > 0) {
                const defaultTransporterId = purchaseOrder.transporter?.id || res.data.transporters[0].id;
                const defaultTransporter = res.data.transporters.find((t: Transporter) => t.id === defaultTransporterId) || res.data.transporters[0];

                setReceiveData(prev => ({
                    ...prev,
                    transporterId: defaultTransporter.id,
                    actualTransportationCost: purchaseOrder.actualTransportationCost || defaultTransporter.defaultCost,
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

        if (!receiveData.invoiceUrl) {
            alert('Invoice upload is required');
            return;
        }

        try {
            setSubmitting(true);
            const response = await api.put(`/api/purchase-orders/${purchaseOrder.id}/receive`, {
                ...receiveData,
                actualDeliveryDate: convertLocalToUTC(receiveData.actualDeliveryDate)
            });

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

    const handlePrint = () => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        const statusBadge = isReceived
            ? '<span style="display: inline-block; padding: 8px 16px; border-radius: 20px; font-size: 10pt; font-weight: 600; background-color: #dcfce7; color: #166534;">✓ Received</span>'
            : isProcurementConfirmed
                ? '<span style="display: inline-block; padding: 8px 16px; border-radius: 20px; font-size: 10pt; font-weight: 600; background-color: #dbeafe; color: #1e40af;">✓ Procurement Confirmed</span>'
                : '<span style="display: inline-block; padding: 8px 16px; border-radius: 20px; font-size: 10pt; font-weight: 600; background-color: #fef3c7; color: #92400e;">⏳ Pending Procurement</span>';

        printWindow.document.write(`
            <html>
                <head>
                    <title>Purchase Order - ${purchaseOrder.poNumber}</title>
                    <style>
                        body {
                            font-family: Arial, sans-serif;
                            padding: 20px;
                            margin: 0;
                        }
                        h1 {
                            color: #111827;
                            border-bottom: 3px solid #3b82f6;
                            padding-bottom: 10px;
                            margin: 0 0 5px 0;
                            font-size: 20pt;
                        }
                        .subtitle {
                            color: #6b7280;
                            font-size: 11pt;
                            margin: 0 0 20px 0;
                        }
                        .section {
                            border: 1px solid #e5e7eb;
                            padding: 15px;
                            margin-bottom: 15px;
                            border-radius: 8px;
                            page-break-inside: avoid;
                        }
                        .section.gray { background-color: #f9fafb; }
                        .section.blue { background-color: #eff6ff; border-color: #bfdbfe; }
                        .section.green { background-color: #f0fdf4; border-color: #bbf7d0; }
                        .section.purple { background-color: #faf5ff; border-color: #e9d5ff; }
                        .section-title {
                            font-size: 12pt;
                            font-weight: 600;
                            color: #111827;
                            margin: 0 0 15px 0;
                        }
                        .grid {
                            display: grid;
                            grid-template-columns: repeat(2, 1fr);
                            gap: 15px;
                        }
                        .field {
                            margin-bottom: 10px;
                        }
                        .field-label {
                            font-size: 9pt;
                            color: #6b7280;
                            margin: 0 0 3px 0;
                        }
                        .field-value {
                            font-size: 10pt;
                            font-weight: 600;
                            color: #111827;
                            margin: 0;
                        }
                        .field-subtext {
                            font-size: 8pt;
                            color: #9ca3af;
                            margin: 2px 0 0 0;
                        }
                        @media print {
                            button { display: none; }
                            @page {
                                size: A4 portrait;
                                margin: 15mm;
                            }
                        }
                    </style>
                </head>
                <body>
                    <h1>Purchase Order Details</h1>
                    <p class="subtitle">PO #${purchaseOrder.poNumber}</p>
                    <div style="margin-bottom: 20px;">${statusBadge}</div>

                    <!-- Order Information -->
                    <div class="section gray">
                        <h4 class="section-title">Order Information</h4>
                        <div class="grid">
                            <div class="field">
                                <p class="field-label">Station</p>
                                <p class="field-value">${purchaseOrder.purchaseRequest?.station?.name || 'N/A'}</p>
                            </div>
                            <div class="field">
                                <p class="field-label">Fuel Type</p>
                                <p class="field-value">${getFuelTypeLabel(purchaseOrder.purchaseRequest?.fuelType || 'N/A')}</p>
                            </div>
                            <div class="field">
                                <p class="field-label">Ordered Quantity</p>
                                <p class="field-value">${(purchaseOrder.purchaseRequest?.quantityLiters || 0).toLocaleString()} L</p>
                            </div>
                            <div class="field">
                                <p class="field-label">Ordered Amount</p>
                                <p class="field-value">${(purchaseOrder.purchaseRequest?.totalAmount || purchaseOrder.purchaseRequest?.paymentAmount || 0).toLocaleString()} SAR</p>
                            </div>
                            <div class="field">
                                <p class="field-label">Expected Delivery</p>
                                <p class="field-value">${new Date(purchaseOrder.expectedDeliveryDate).toLocaleString()}</p>
                            </div>
                            ${purchaseOrder.purchaseRequest?.receiptUrl ? `
                            <div class="field">
                                <p class="field-label">PR Receipt</p>
                                <p class="field-value">Attached</p>
                            </div>
                            ` : ''}
                        </div>
                    </div>

                    <!-- Verification Details -->
                    <div class="section purple">
                        <h4 class="section-title">Verification Details</h4>
                        <div class="grid">
                            <div class="field">
                                <p class="field-label">Back Office (PO Creator)</p>
                                <p class="field-value">${purchaseOrder.creator?.name || '-'}${purchaseOrder.creator?.employeeId ? ` (${purchaseOrder.creator.employeeId})` : ''}</p>
                                <p class="field-subtext">${new Date(purchaseOrder.createdAt).toLocaleString()}</p>
                            </div>
                            <div class="field">
                                <p class="field-label">Accountant (Payment Verified)</p>
                                <p class="field-value">${purchaseOrder.purchaseRequest?.paymentVerifiedBy?.name || '-'}${purchaseOrder.purchaseRequest?.paymentVerifiedBy?.employeeId ? ` (${purchaseOrder.purchaseRequest.paymentVerifiedBy.employeeId})` : ''}</p>
                                ${purchaseOrder.purchaseRequest?.paymentVerifiedAt ? `<p class="field-subtext">${new Date(purchaseOrder.purchaseRequest.paymentVerifiedAt).toLocaleString()}</p>` : ''}
                            </div>
                        </div>
                    </div>

                    ${isProcurementConfirmed ? `
                    <!-- Procurement Details -->
                    <div class="section blue">
                        <h4 class="section-title">Procurement Details</h4>
                        <div class="grid">
                            <div class="field">
                                <p class="field-label">Aramco PO Number</p>
                                <p class="field-value">${purchaseOrder.aramcoPoNumber || '-'}</p>
                            </div>
                            <div class="field">
                                <p class="field-label">Aramco PO Date & Time</p>
                                <p class="field-value">${purchaseOrder.aramcoPoDate ? new Date(purchaseOrder.aramcoPoDate).toLocaleString() : '-'}</p>
                            </div>
                            ${purchaseOrder.procurementConfirmedBy && purchaseOrder.procurementConfirmedAt ? `
                            <div class="field">
                                <p class="field-label">Confirmed By</p>
                                <p class="field-value">${purchaseOrder.procurementConfirmedBy.name}${purchaseOrder.procurementConfirmedBy.employeeId ? ` (${purchaseOrder.procurementConfirmedBy.employeeId})` : ''}</p>
                                <p class="field-subtext">${new Date(purchaseOrder.procurementConfirmedAt).toLocaleString()}</p>
                            </div>
                            ` : ''}
                        </div>
                    </div>
                    ` : ''}

                    ${isReceived ? `
                    <!-- Delivery Details -->
                    <div class="section green">
                        <h4 class="section-title">Delivery Details</h4>
                        <div class="grid">
                            <div class="field">
                                <p class="field-label">Actual Delivery Date & Time</p>
                                <p class="field-value">${purchaseOrder.actualDeliveryDate ? new Date(purchaseOrder.actualDeliveryDate).toLocaleString() : '-'}</p>
                            </div>
                            <div class="field">
                                <p class="field-label">Invoice Number</p>
                                <p class="field-value">${purchaseOrder.invoiceNumber || '-'}</p>
                            </div>
                            <div class="field">
                                <p class="field-label">Received Quantity</p>
                                <p class="field-value">${(purchaseOrder.receivedQuantityLiters || 0).toLocaleString()} L</p>
                            </div>
                            <div class="field">
                                <p class="field-label">Received Amount</p>
                                <p class="field-value">${(purchaseOrder.receivedAmount || 0).toLocaleString()} SAR</p>
                            </div>
                            <div class="field">
                                <p class="field-label">Transporter</p>
                                <p class="field-value">${purchaseOrder.transporter?.name || '-'}</p>
                            </div>
                            <div class="field">
                                <p class="field-label">Transportation Cost</p>
                                <p class="field-value">${(purchaseOrder.actualTransportationCost || 0).toLocaleString()} SAR</p>
                            </div>
                            ${purchaseOrder.creditVariance !== undefined && purchaseOrder.creditVariance !== 0 ? `
                            <div class="field" style="grid-column: span 2;">
                                <p class="field-label">Credit Variance</p>
                                <p class="field-value" style="color: ${purchaseOrder.creditVariance > 0 ? '#16a34a' : '#dc2626'};">
                                    ${purchaseOrder.creditVariance > 0 ? '+' : ''}${purchaseOrder.creditVariance.toLocaleString()} SAR
                                    <span style="font-size: 8pt; font-weight: normal; color: #6b7280;">
                                        (${purchaseOrder.creditVariance > 0 ? 'Credited to station' : 'Debited from station'})
                                    </span>
                                </p>
                            </div>
                            ` : ''}
                            ${purchaseOrder.receiver && purchaseOrder.receivedAt ? `
                            <div class="field">
                                <p class="field-label">Received By</p>
                                <p class="field-value">${purchaseOrder.receiver.name}${purchaseOrder.receiver.employeeId ? ` (${purchaseOrder.receiver.employeeId})` : ''}</p>
                                <p class="field-subtext">${new Date(purchaseOrder.receivedAt).toLocaleString()}</p>
                            </div>
                            ` : ''}
                            ${purchaseOrder.invoiceUrl ? `
                            <div class="field">
                                <p class="field-label">Invoice Document</p>
                                <p class="field-value">Attached</p>
                            </div>
                            ` : ''}
                        </div>
                    </div>
                    ` : ''}

                    <!-- Request Lifecycle Timeline -->
                    <div class="section purple" style="background: linear-gradient(to right, #f5f3ff, #faf5ff);">
                        <h4 class="section-title">Request Lifecycle Timeline</h4>
                        <div style="display: flex; flex-direction: column; gap: 10px;">
                            ${purchaseOrder.purchaseRequest?.createdAt ? `
                            <div style="display: flex; gap: 12px; align-items: flex-start; background: white; padding: 10px; border-radius: 6px; border: 1px solid #e5e7eb;">
                                <div style="width: 24px; height: 24px; background: #dbeafe; color: #1e40af; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 9pt; font-weight: bold; flex-shrink: 0;">1</div>
                                <div>
                                    <p style="margin: 0; font-size: 10pt; font-weight: 600; color: #111827;">Purchase Request Created</p>
                                    <p style="margin: 2px 0 0 0; font-size: 8pt; color: #6b7280;">by ${purchaseOrder.purchaseRequest.creator?.name || 'Station Manager'}${purchaseOrder.purchaseRequest.creator?.employeeId ? ` (${purchaseOrder.purchaseRequest.creator.employeeId})` : ''}</p>
                                    <p style="margin: 2px 0 0 0; font-size: 8pt; color: #9ca3af;">${new Date(purchaseOrder.purchaseRequest.createdAt).toLocaleString()}</p>
                                </div>
                            </div>
                            ` : ''}

                            ${purchaseOrder.purchaseRequest?.paymentVerifiedAt ? `
                            <div style="display: flex; gap: 12px; align-items: flex-start; background: white; padding: 10px; border-radius: 6px; border: 1px solid #e5e7eb;">
                                <div style="width: 24px; height: 24px; background: #dcfce7; color: #166534; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 9pt; font-weight: bold; flex-shrink: 0;">2</div>
                                <div>
                                    <p style="margin: 0; font-size: 10pt; font-weight: 600; color: #111827;">Payment Verified</p>
                                    <p style="margin: 2px 0 0 0; font-size: 8pt; color: #6b7280;">by ${purchaseOrder.purchaseRequest.paymentVerifiedBy?.name || 'Accountant'}${purchaseOrder.purchaseRequest.paymentVerifiedBy?.employeeId ? ` (${purchaseOrder.purchaseRequest.paymentVerifiedBy.employeeId})` : ''}</p>
                                    <p style="margin: 2px 0 0 0; font-size: 8pt; color: #9ca3af;">${new Date(purchaseOrder.purchaseRequest.paymentVerifiedAt).toLocaleString()}</p>
                                </div>
                            </div>
                            ` : ''}

                            ${purchaseOrder.purchaseRequest?.approvedAt ? `
                            <div style="display: flex; gap: 12px; align-items: flex-start; background: white; padding: 10px; border-radius: 6px; border: 1px solid #e5e7eb;">
                                <div style="width: 24px; height: 24px; background: #dcfce7; color: #166534; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 9pt; font-weight: bold; flex-shrink: 0;">3</div>
                                <div>
                                    <p style="margin: 0; font-size: 10pt; font-weight: 600; color: #15803d;">Request Approved</p>
                                    <p style="margin: 2px 0 0 0; font-size: 8pt; color: #6b7280;">by ${purchaseOrder.purchaseRequest.approvedBy?.name || purchaseOrder.purchaseRequest.reviewedBy?.name || 'Office User'}${(purchaseOrder.purchaseRequest.approvedBy?.employeeId || purchaseOrder.purchaseRequest.reviewedBy?.employeeId) ? ` (${purchaseOrder.purchaseRequest.approvedBy?.employeeId || purchaseOrder.purchaseRequest.reviewedBy?.employeeId})` : ''}</p>
                                    <p style="margin: 2px 0 0 0; font-size: 8pt; color: #9ca3af;">${new Date(purchaseOrder.purchaseRequest.approvedAt).toLocaleString()}</p>
                                </div>
                            </div>
                            ` : purchaseOrder.purchaseRequest?.rejectedAt ? `
                            <div style="display: flex; gap: 12px; align-items: flex-start; background: white; padding: 10px; border-radius: 6px; border: 1px solid #fee2e2;">
                                <div style="width: 24px; height: 24px; background: #fee2e2; color: #991b1b; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 9pt; font-weight: bold; flex-shrink: 0;">✗</div>
                                <div>
                                    <p style="margin: 0; font-size: 10pt; font-weight: 600; color: #b91c1c;">Request Rejected</p>
                                    <p style="margin: 2px 0 0 0; font-size: 8pt; color: #6b7280;">by ${purchaseOrder.purchaseRequest.rejectedBy?.name || purchaseOrder.purchaseRequest.reviewedBy?.name || 'Office User'}${(purchaseOrder.purchaseRequest.rejectedBy?.employeeId || purchaseOrder.purchaseRequest.reviewedBy?.employeeId) ? ` (${purchaseOrder.purchaseRequest.rejectedBy?.employeeId || purchaseOrder.purchaseRequest.reviewedBy?.employeeId})` : ''}</p>
                                    <p style="margin: 2px 0 0 0; font-size: 8pt; color: #9ca3af;">${new Date(purchaseOrder.purchaseRequest.rejectedAt).toLocaleString()}</p>
                                </div>
                            </div>
                            ` : ''}

                            ${purchaseOrder.createdAt ? `
                            <div style="display: flex; gap: 12px; align-items: flex-start; background: white; padding: 10px; border-radius: 6px; border: 1px solid #e5e7eb;">
                                <div style="width: 24px; height: 24px; background: #f3e8ff; color: #6b21a8; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 9pt; font-weight: bold; flex-shrink: 0;">4</div>
                                <div>
                                    <p style="margin: 0; font-size: 10pt; font-weight: 600; color: #111827;">Purchase Order Generated</p>
                                    <p style="margin: 2px 0 0 0; font-size: 8pt; color: #6b7280;">by ${purchaseOrder.creator?.name || 'Office User'}${purchaseOrder.creator?.employeeId ? ` (${purchaseOrder.creator.employeeId})` : ''}</p>
                                    <p style="margin: 2px 0 0 0; font-size: 8pt; color: #9ca3af;">${new Date(purchaseOrder.createdAt).toLocaleString()}</p>
                                </div>
                            </div>
                            ` : ''}

                            ${purchaseOrder.procurementConfirmedAt ? `
                            <div style="display: flex; gap: 12px; align-items: flex-start; background: white; padding: 10px; border-radius: 6px; border: 1px solid #e5e7eb;">
                                <div style="width: 24px; height: 24px; background: #dbeafe; color: #1e40af; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 9pt; font-weight: bold; flex-shrink: 0;">5</div>
                                <div>
                                    <p style="margin: 0; font-size: 10pt; font-weight: 600; color: #111827;">Procurement Confirmed</p>
                                    <p style="margin: 2px 0 0 0; font-size: 8pt; color: #6b7280;">by ${purchaseOrder.procurementConfirmedBy?.name || 'Procurement'}${purchaseOrder.procurementConfirmedBy?.employeeId ? ` (${purchaseOrder.procurementConfirmedBy.employeeId})` : ''}</p>
                                    <p style="margin: 2px 0 0 0; font-size: 8pt; color: #9ca3af;">${new Date(purchaseOrder.procurementConfirmedAt).toLocaleString()}</p>
                                </div>
                            </div>
                            ` : ''}

                            ${purchaseOrder.receivedAt ? `
                            <div style="display: flex; gap: 12px; align-items: flex-start; background: white; padding: 10px; border-radius: 6px; border: 1px solid #dcfce7;">
                                <div style="width: 24px; height: 24px; background: #dcfce7; color: #166534; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 9pt; font-weight: bold; flex-shrink: 0;">✓</div>
                                <div>
                                    <p style="margin: 0; font-size: 10pt; font-weight: 600; color: #15803d;">Delivery Received</p>
                                    <p style="margin: 2px 0 0 0; font-size: 8pt; color: #6b7280;">by ${purchaseOrder.receiver?.name || 'Station Manager'}${purchaseOrder.receiver?.employeeId ? ` (${purchaseOrder.receiver.employeeId})` : ''}</p>
                                    <p style="margin: 2px 0 0 0; font-size: 8pt; color: #9ca3af;">${new Date(purchaseOrder.receivedAt).toLocaleString()}</p>
                                </div>
                            </div>
                            ` : ''}
                        </div>
                    </div>

                    <button onclick="window.print()" style="margin-top: 20px; padding: 10px 20px; background: #3b82f6; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 11pt;">Print</button>
                </body>
            </html>
        `);
        printWindow.document.close();
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
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={handlePrint}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium print:hidden"
                                >
                                    Print
                                </button>
                                <button
                                    onClick={onClose}
                                    className="text-gray-400 hover:text-gray-600 print:hidden"
                                >
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
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
                                    <p className="text-sm font-semibold text-gray-900">{new Date(purchaseOrder.expectedDeliveryDate).toLocaleString()}</p>
                                </div>
                                {(purchaseOrder.purchaseRequest?.bankDepositAmount !== undefined && purchaseOrder.purchaseRequest?.bankDepositAmount !== null) && (
                                    <div>
                                        <p className="text-sm text-gray-600">Bank Deposit</p>
                                        <p className="text-sm font-semibold text-gray-900">{purchaseOrder.purchaseRequest.bankDepositAmount.toLocaleString()} SAR</p>
                                    </div>
                                )}

                                {/* Receipt Links */}
                                <div className="col-span-full mt-2 pt-2 border-t border-gray-100 flex flex-wrap gap-4">
                                    {purchaseOrder.purchaseRequest?.receiptUrl && (
                                        <a
                                            href={purchaseOrder.purchaseRequest.receiptUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100 transition-colors"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                                            </svg>
                                            View Fuel Receipt
                                        </a>
                                    )}
                                    {purchaseOrder.purchaseRequest?.bankDepositReceiptUrl && (
                                        <a
                                            href={purchaseOrder.purchaseRequest.bankDepositReceiptUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100 transition-colors"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                                            </svg>
                                            View Deposit Receipt
                                        </a>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Back Office & Accountant Details */}
                        <div className="bg-purple-50 p-4 rounded-lg border border-purple-200 mb-6 print:bg-white print:border-gray-300">
                            <h4 className="text-md font-semibold text-gray-900 mb-3">Verification Details</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <p className="text-sm text-gray-600">Back Office (PO Creator)</p>
                                    <p className="text-sm font-semibold text-gray-900">
                                        {purchaseOrder.creator?.name || '-'}
                                        {purchaseOrder.creator?.employeeId && ` (${purchaseOrder.creator.employeeId})`}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                        {new Date(purchaseOrder.createdAt).toLocaleString()}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-600">Accountant (Payment Verified)</p>
                                    <p className="text-sm font-semibold text-gray-900">
                                        {purchaseOrder.purchaseRequest?.paymentVerifiedBy?.name || '-'}
                                        {purchaseOrder.purchaseRequest?.paymentVerifiedBy?.employeeId && ` (${purchaseOrder.purchaseRequest.paymentVerifiedBy.employeeId})`}
                                    </p>
                                    {purchaseOrder.purchaseRequest?.paymentVerifiedAt && (
                                        <p className="text-xs text-gray-500">
                                            {new Date(purchaseOrder.purchaseRequest.paymentVerifiedAt).toLocaleString()}
                                        </p>
                                    )}
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
                                        <p className="text-sm text-gray-600">Aramco PO Date & Time</p>
                                        <p className="text-sm font-semibold text-gray-900">
                                            {purchaseOrder.aramcoPoDate ? new Date(purchaseOrder.aramcoPoDate).toLocaleString() : '-'}
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
                                        <p className="text-sm text-gray-600">Actual Delivery Date & Time</p>
                                        <p className="text-sm font-semibold text-gray-900">
                                            {purchaseOrder.actualDeliveryDate ? new Date(purchaseOrder.actualDeliveryDate).toLocaleString() : '-'}
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
                                    {purchaseOrder.invoiceUrl && (
                                        <div className="col-span-2">
                                            <a
                                                href={purchaseOrder.invoiceUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                                            >
                                                View Invoice Document →
                                            </a>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Request Lifecycle Timeline */}
                        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-4 rounded-lg border border-indigo-200 mb-6">
                            <h4 className="text-md font-semibold text-gray-900 mb-3">Request Lifecycle Timeline</h4>
                            <div className="space-y-3">
                                {/* PR Created */}
                                {purchaseOrder.purchaseRequest?.createdAt && (
                                    <div className="flex items-start gap-3 bg-white p-3 rounded-lg border border-gray-200">
                                        <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                            <span className="text-blue-600 font-bold text-sm">1</span>
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-sm font-semibold text-gray-900">Purchase Request Created</p>
                                            <p className="text-xs text-gray-600">
                                                by {purchaseOrder.purchaseRequest.creator?.name || 'Station Manager'}
                                                {purchaseOrder.purchaseRequest.creator?.employeeId && ` (${purchaseOrder.purchaseRequest.creator.employeeId})`}
                                            </p>
                                            <p className="text-xs text-gray-500 mt-1">
                                                {new Date(purchaseOrder.purchaseRequest.createdAt).toLocaleString()}
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {/* Payment Verified */}
                                {purchaseOrder.purchaseRequest?.paymentVerifiedAt && (
                                    <div className="flex items-start gap-3 bg-white p-3 rounded-lg border border-gray-200">
                                        <div className="flex-shrink-0 w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                                            <span className="text-green-600 font-bold text-sm">2</span>
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-sm font-semibold text-gray-900">Payment Verified</p>
                                            <p className="text-xs text-gray-600">
                                                by {purchaseOrder.purchaseRequest.paymentVerifiedBy?.name || 'Accountant'}
                                                {purchaseOrder.purchaseRequest.paymentVerifiedBy?.employeeId && ` (${purchaseOrder.purchaseRequest.paymentVerifiedBy.employeeId})`}
                                            </p>
                                            <p className="text-xs text-gray-500 mt-1">
                                                {new Date(purchaseOrder.purchaseRequest.paymentVerifiedAt).toLocaleString()}
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {/* Approved or Rejected */}
                                {purchaseOrder.purchaseRequest?.approvedAt && (
                                    <div className="flex items-start gap-3 bg-white p-3 rounded-lg border border-gray-200">
                                        <div className="flex-shrink-0 w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                                            <span className="text-green-600 font-bold text-sm">3</span>
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-sm font-semibold text-green-700">Request Approved</p>
                                            <p className="text-xs text-gray-600">
                                                by {purchaseOrder.purchaseRequest.approvedBy?.name || purchaseOrder.purchaseRequest.reviewedBy?.name || 'Office User'}
                                                {(purchaseOrder.purchaseRequest.approvedBy?.employeeId || purchaseOrder.purchaseRequest.reviewedBy?.employeeId) && ` (${purchaseOrder.purchaseRequest.approvedBy?.employeeId || purchaseOrder.purchaseRequest.reviewedBy?.employeeId})`}
                                            </p>
                                            <p className="text-xs text-gray-500 mt-1">
                                                {new Date(purchaseOrder.purchaseRequest.approvedAt).toLocaleString()}
                                            </p>
                                        </div>
                                    </div>
                                )}
                                {purchaseOrder.purchaseRequest?.rejectedAt && (
                                    <div className="flex items-start gap-3 bg-white p-3 rounded-lg border border-red-200">
                                        <div className="flex-shrink-0 w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                                            <span className="text-red-600 font-bold text-sm">✗</span>
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-sm font-semibold text-red-700">Request Rejected</p>
                                            <p className="text-xs text-gray-600">
                                                by {purchaseOrder.purchaseRequest.rejectedBy?.name || purchaseOrder.purchaseRequest.reviewedBy?.name || 'Office User'}
                                                {(purchaseOrder.purchaseRequest.rejectedBy?.employeeId || purchaseOrder.purchaseRequest.reviewedBy?.employeeId) && ` (${purchaseOrder.purchaseRequest.rejectedBy?.employeeId || purchaseOrder.purchaseRequest.reviewedBy?.employeeId})`}
                                            </p>
                                            <p className="text-xs text-gray-500 mt-1">
                                                {new Date(purchaseOrder.purchaseRequest.rejectedAt).toLocaleString()}
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {/* PO Generated */}
                                {purchaseOrder.createdAt && (
                                    <div className="flex items-start gap-3 bg-white p-3 rounded-lg border border-gray-200">
                                        <div className="flex-shrink-0 w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                                            <span className="text-purple-600 font-bold text-sm">4</span>
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-sm font-semibold text-gray-900">Purchase Order Generated</p>
                                            <p className="text-xs text-gray-600">
                                                by {purchaseOrder.creator?.name || 'Office User'}
                                                {purchaseOrder.creator?.employeeId && ` (${purchaseOrder.creator.employeeId})`}
                                            </p>
                                            <p className="text-xs text-gray-500 mt-1">
                                                {new Date(purchaseOrder.createdAt).toLocaleString()}
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {/* Procurement Confirmed */}
                                {purchaseOrder.procurementConfirmedAt && (
                                    <div className="flex items-start gap-3 bg-white p-3 rounded-lg border border-gray-200">
                                        <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                            <span className="text-blue-600 font-bold text-sm">5</span>
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-sm font-semibold text-gray-900">Procurement Confirmed</p>
                                            <p className="text-xs text-gray-600">
                                                by {purchaseOrder.procurementConfirmedBy?.name || 'Procurement'}
                                                {purchaseOrder.procurementConfirmedBy?.employeeId && ` (${purchaseOrder.procurementConfirmedBy.employeeId})`}
                                            </p>
                                            <p className="text-xs text-gray-500 mt-1">
                                                {new Date(purchaseOrder.procurementConfirmedAt).toLocaleString()}
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {/* Delivery Received */}
                                {purchaseOrder.receivedAt && (
                                    <div className="flex items-start gap-3 bg-white p-3 rounded-lg border border-green-200">
                                        <div className="flex-shrink-0 w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                                            <span className="text-green-600 font-bold text-sm">✓</span>
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-sm font-semibold text-green-700">Delivery Received</p>
                                            <p className="text-xs text-gray-600">
                                                by {purchaseOrder.receiver?.name || 'Station Manager'}
                                                {purchaseOrder.receiver?.employeeId && ` (${purchaseOrder.receiver.employeeId})`}
                                            </p>
                                            <p className="text-xs text-gray-500 mt-1">
                                                {new Date(purchaseOrder.receivedAt).toLocaleString()}
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>


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
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Actual Delivery Date & Time *</label>
                                            <input
                                                type="datetime-local"
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
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Invoice Upload *</label>
                                        <input
                                            type="file"
                                            accept="image/*,application/pdf"
                                            onChange={handleFileUpload}
                                            disabled={uploading}
                                            required
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
