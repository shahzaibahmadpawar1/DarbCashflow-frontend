import { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../hooks/useAuth';

interface Transporter {
    id: string;
    name: string;
    defaultCost: number;
    isActive: boolean;
    createdAt: string;
}

export const AdminTransporters = () => {
    const { isViewOnly } = useAuth();
    const [transporters, setTransporters] = useState<Transporter[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState({ name: '', defaultCost: '' });

    useEffect(() => {
        fetchTransporters();
    }, []);

    const fetchTransporters = async () => {
        try {
            setLoading(true);
            const res = await api.get('/api/transporters');
            setTransporters(res.data.transporters || []);
        } catch (error) {
            console.error('Error fetching transporters:', error);
            alert('Failed to fetch transporters');
        } finally {
            setLoading(false);
        }
    };

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.name || !formData.defaultCost) {
            alert('Please fill in all fields');
            return;
        }

        try {
            await api.post('/api/transporters', {
                name: formData.name,
                defaultCost: parseFloat(formData.defaultCost),
            });

            alert('Transporter added successfully');
            setShowAddModal(false);
            setFormData({ name: '', defaultCost: '' });
            fetchTransporters();
        } catch (error: any) {
            console.error('Error adding transporter:', error);
            alert(error.response?.data?.error || 'Failed to add transporter');
        }
    };

    const handleUpdate = async (id: string) => {
        if (!formData.name || !formData.defaultCost) {
            alert('Please fill in all fields');
            return;
        }

        try {
            await api.put(`/api/transporters/${id}`, {
                name: formData.name,
                defaultCost: parseFloat(formData.defaultCost),
            });

            alert('Transporter updated successfully');
            setEditingId(null);
            setFormData({ name: '', defaultCost: '' });
            fetchTransporters();
        } catch (error: any) {
            console.error('Error updating transporter:', error);
            alert(error.response?.data?.error || 'Failed to update transporter');
        }
    };

    const handleToggleStatus = async (id: string) => {
        try {
            await api.patch(`/api/transporters/${id}/toggle-status`);
            fetchTransporters();
        } catch (error: any) {
            console.error('Error toggling status:', error);
            alert(error.response?.data?.error || 'Failed to toggle status');
        }
    };

    const startEdit = (transporter: Transporter) => {
        setEditingId(transporter.id);
        setFormData({
            name: transporter.name,
            defaultCost: transporter.defaultCost.toString(),
        });
    };

    const cancelEdit = () => {
        setEditingId(null);
        setFormData({ name: '', defaultCost: '' });
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-gray-600">Loading...</div>
            </div>
        );
    }

    return (
        <div className="p-6">
            <div className="mb-6 flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Transporters</h1>
                    <p className="text-gray-600 mt-2">Manage fuel transporters and their default costs</p>
                </div>
                {!isViewOnly && (
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
                    >
                        + Add Transporter
                    </button>
                )}
            </div>

            <div className="bg-white rounded-lg shadow overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Name
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Default Cost (SAR)
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
                        {transporters.map((transporter) => (
                            <tr key={transporter.id} className="hover:bg-gray-50">
                                <td className="px-6 py-4 whitespace-nowrap">
                                    {editingId === transporter.id ? (
                                        <input
                                            type="text"
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            className="px-3 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-primary focus:border-transparent"
                                        />
                                    ) : (
                                        <div className="text-sm font-medium text-gray-900">
                                            {transporter.name}
                                        </div>
                                    )}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    {editingId === transporter.id ? (
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={formData.defaultCost}
                                            onChange={(e) => setFormData({ ...formData, defaultCost: e.target.value })}
                                            className="w-32 px-3 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-primary focus:border-transparent"
                                        />
                                    ) : (
                                        <div className="text-sm text-gray-900">
                                            {transporter.defaultCost.toFixed(2)} SAR
                                        </div>
                                    )}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${transporter.isActive
                                        ? 'bg-green-100 text-green-800'
                                        : 'bg-red-100 text-red-800'
                                        }`}>
                                        {transporter.isActive ? 'Active' : 'Inactive'}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm">
                                    {editingId === transporter.id ? (
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => handleUpdate(transporter.id)}
                                                className="text-green-600 hover:text-green-900"
                                            >
                                                Save
                                            </button>
                                            <button
                                                onClick={cancelEdit}
                                                className="text-gray-600 hover:text-gray-900"
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="flex gap-3">
                                            {!isViewOnly && (
                                                <>
                                                    <button
                                                        onClick={() => startEdit(transporter)}
                                                        className="text-primary hover:text-primary/80"
                                                    >
                                                        Edit
                                                    </button>
                                                    <button
                                                        onClick={() => handleToggleStatus(transporter.id)}
                                                        className={transporter.isActive ? 'text-red-600 hover:text-red-900' : 'text-green-600 hover:text-green-900'}
                                                    >
                                                        {transporter.isActive ? 'Deactivate' : 'Activate'}
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Add Transporter Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 p-6">
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">Add Transporter</h2>
                        <form onSubmit={handleAdd} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Name *
                                </label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                                    placeholder="Enter transporter name"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Default Cost (SAR) *
                                </label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={formData.defaultCost}
                                    onChange={(e) => setFormData({ ...formData, defaultCost: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                                    placeholder="Enter default cost"
                                    required
                                />
                            </div>
                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowAddModal(false);
                                        setFormData({ name: '', defaultCost: '' });
                                    }}
                                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
                                >
                                    Add Transporter
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-blue-900 mb-2">💡 About Transporters</h3>
                <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                    <li>Transporters are used when receiving purchase orders</li>
                    <li>The default cost is used as the initial value, but can be edited during PO receiving</li>
                    <li>Inactive transporters will not appear in the selection dropdown</li>
                    <li>Transportation cost is added to the fuel cost to calculate the total amount</li>
                </ul>
            </div>
        </div>
    );
};
