import { useState } from 'react';
import api from '../services/api';

interface Nozzle {
    id: string;
    name: string;
    fuelType: string;
    openingReading: number;
    displayOrder?: number;
}

interface Props {
    stationId: string;
    nozzles: Nozzle[];
    onOrderUpdated: () => void;
    onClose: () => void;
}

export const NozzleOrderAdjuster = ({ stationId, nozzles, onOrderUpdated, onClose }: Props) => {
    const [orderedNozzles, setOrderedNozzles] = useState<Nozzle[]>(
        [...nozzles].sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0))
    );
    const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
    const [saving, setSaving] = useState(false);

    const handleDragStart = (index: number) => {
        setDraggingIndex(index);
    };

    const handleDragOver = (e: React.DragEvent, index: number) => {
        e.preventDefault();

        if (draggingIndex === null || draggingIndex === index) return;

        const newNozzles = [...orderedNozzles];
        const draggedItem = newNozzles[draggingIndex];

        // Remove from old position
        newNozzles.splice(draggingIndex, 1);
        // Insert at new position
        newNozzles.splice(index, 0, draggedItem);

        setOrderedNozzles(newNozzles);
        setDraggingIndex(index);
    };

    const handleDragEnd = () => {
        setDraggingIndex(null);
    };

    const handleSaveOrder = async () => {
        try {
            setSaving(true);

            // Create array of nozzle orders
            const nozzleOrders = orderedNozzles.map((nozzle, index) => ({
                id: nozzle.id,
                displayOrder: index + 1
            }));

            await api.put(`/api/nozzles/stations/${stationId}/nozzles/order`, {
                nozzleOrders
            });

            alert('Nozzle order updated successfully!');
            onOrderUpdated();
            onClose();
        } catch (error: any) {
            alert(error.response?.data?.error || 'Failed to update nozzle order');
        } finally {
            setSaving(false);
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
            <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full border border-gray-200 max-h-[90vh] overflow-y-auto">
                <div className="p-6">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h3 className="text-xl font-semibold text-gray-900">Adjust Nozzle Sequence</h3>
                            <p className="text-sm text-gray-600 mt-1">Drag and drop to reorder nozzles</p>
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

                    {/* Instructions */}
                    <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <p className="text-sm text-blue-800">
                            <strong>Tip:</strong> Drag nozzles up or down to change their order. This order will be maintained when Station Managers add readings.
                        </p>
                    </div>

                    {/* Nozzle List */}
                    <div className="space-y-2 mb-6">
                        {orderedNozzles.map((nozzle, index) => (
                            <div
                                key={nozzle.id}
                                draggable
                                onDragStart={() => handleDragStart(index)}
                                onDragOver={(e) => handleDragOver(e, index)}
                                onDragEnd={handleDragEnd}
                                className={`flex items-center gap-3 p-4 border-2 rounded-lg cursor-move transition-all ${draggingIndex === index
                                        ? 'border-primary bg-primary/10 shadow-lg scale-105'
                                        : 'border-gray-200 bg-white hover:border-primary/50 hover:shadow-md'
                                    }`}
                            >
                                {/* Drag Handle */}
                                <div className="flex-shrink-0">
                                    <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                                    </svg>
                                </div>

                                {/* Order Number */}
                                <div className="flex-shrink-0 w-10 h-10 bg-primary text-white rounded-full flex items-center justify-center font-bold text-lg">
                                    {index + 1}
                                </div>

                                {/* Nozzle Info */}
                                <div className="flex-1">
                                    <p className="font-semibold text-gray-900">{nozzle.name}</p>
                                    <p className="text-sm text-gray-600">{getFuelTypeLabel(nozzle.fuelType)}</p>
                                </div>

                                {/* Opening Reading */}
                                <div className="text-right">
                                    <p className="text-xs text-gray-500">Opening Reading</p>
                                    <p className="font-semibold text-gray-900">{nozzle.openingReading.toFixed(2)}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-gray-700 font-medium"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSaveOrder}
                            disabled={saving}
                            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {saving ? 'Saving...' : 'Save Order'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
