import { useState, useEffect } from 'react';
import api from '../services/api';
import { PurchaseOrderDetailsModal } from '../components/purchase/PurchaseOrderDetailsModal';

interface PurchaseOrder {
    id: string;
    poNumber: string;
    expectedDeliveryDate: string;
    receivedAt?: string;
    procurementConfirmedAt?: string;
    aramcoPoNumber?: string;
    aramcoPoDate?: string;
    aramcoPoUrl?: string;
    receivedQuantityLiters?: number;
    receivedAmount?: number;
    creditVariance?: number;
    actualTransportationCost?: number;
    transporter?: { name: string };
    purchaseRequest: {
        fuelType: string;
        quantityLiters: number;
        buyingPricePerLiter: number;
        transportationCost: number;
        totalAmount: number;
        paymentAmount: number;
        station: {
            name: string;
        };
    };
}

export const ProcurementDashboard = () => {
    const [pendingPOs, setPendingPOs] = useState<PurchaseOrder[]>([]);
    const [allPOs, setAllPOs] = useState<PurchaseOrder[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedPO, setSelectedPO] = useState<any>(null);
    const [activeTab, setActiveTab] = useState<'pending' | 'all'>('pending');

    useEffect(() => {
        fetchPOs();
    }, []);

    const fetchPOs = async () => {
        try {
            setLoading(true);
            const [pendingRes, allRes] = await Promise.all([
                api.get('/api/procurement/pending'),
                api.get('/api/procurement/all'),
            ]);

            setPendingPOs(pendingRes.data.purchaseOrders || []);
            setAllPOs(allRes.data.purchaseOrders || []);
        } catch (error) {
            console.error('Error fetching POs:', error);
            alert('Failed to fetch purchase orders');
        } finally {
            setLoading(false);
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

    const getStatusBadge = (po: PurchaseOrder) => {
        if (po.receivedAt) {
            return <span className="px-3 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded-full">Received</span>;
        }
        if (po.procurementConfirmedAt) {
            return <span className="px-3 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded-full">Confirmed</span>;
        }
        return <span className="px-3 py-1 bg-yellow-100 text-yellow-800 text-xs font-semibold rounded-full">Pending</span>;
    };

    const displayPOs = activeTab === 'pending' ? pendingPOs : allPOs;

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-gray-600">Loading...</div>
            </div>
        );
    }

    return (
        <div className="p-6">
            <div className="mb-6">
                <h1 className="text-3xl font-bold text-gray-900">Procurement Dashboard</h1>
                <p className="text-gray-600 mt-2">Manage purchase orders for your assigned stations</p>
            </div>

            {/* Tabs */}
            <div className="mb-6 border-b border-gray-200">
                <nav className="flex gap-4">
                    <button
                        onClick={() => setActiveTab('pending')}
                        className={`pb-3 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === 'pending'
                            ? 'border-primary text-primary'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                    >
                        Pending Confirmation ({pendingPOs.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('all')}
                        className={`pb-3 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === 'all'
                            ? 'border-primary text-primary'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                    >
                        All Purchase Orders ({allPOs.length})
                    </button>
                </nav>
            </div>

            {/* Info Box */}
            <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-blue-900 mb-2">📋 Your Responsibilities</h3>
                <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                    <li>Review and confirm purchase orders after Office User approval</li>
                    <li>Enter Aramco PO number and date</li>
                    <li>Upload Aramco PO document (optional)</li>
                    <li>After confirmation, PO will be sent to Station Manager for receiving</li>
                </ul>
            </div>

            {/* Purchase Orders Table */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
                {displayPOs.length === 0 ? (
                    <div className="text-center py-12">
                        <p className="text-gray-500">
                            {activeTab === 'pending'
                                ? 'No pending purchase orders'
                                : 'No purchase orders found'}
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        PO Number
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Station
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Fuel Type
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Quantity (L)
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Amount (SAR)
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Expected Delivery
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Status
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {displayPOs.map((po) => (
                                    <tr key={po.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-medium text-gray-900">{po.poNumber}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-900">{po.purchaseRequest.station.name}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-900">
                                                {getFuelTypeLabel(po.purchaseRequest.fuelType)}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-900">
                                                {po.purchaseRequest.quantityLiters.toLocaleString()}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-900">
                                                {po.purchaseRequest.totalAmount.toLocaleString()}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-900">
                                                {new Date(po.expectedDeliveryDate).toLocaleDateString()}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {getStatusBadge(po)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                                            <button
                                                onClick={() => setSelectedPO(po)}
                                                className="text-primary hover:text-primary/80 font-medium"
                                            >
                                                {po.procurementConfirmedAt ? 'View Details' : 'Confirm'}
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* PO Details Modal */}
            {selectedPO && (
                <PurchaseOrderDetailsModal
                    purchaseOrder={selectedPO}
                    onClose={() => setSelectedPO(null)}
                    onSuccess={() => {
                        setSelectedPO(null);
                        fetchPOs();
                    }}
                />
            )}
        </div>
    );
};
