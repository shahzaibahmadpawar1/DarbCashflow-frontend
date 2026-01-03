import { useState, useEffect } from 'react';
import api from '../services/api';

interface User {
    id: string;
    name: string;
    employeeId: string;
    role: 'Admin' | 'SM' | 'AM';
    station?: { name: string; id: string };
    areaManager?: { id: string; name: string };
}

interface Station {
    id: string;
    name: string;
}

export const Employees = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [stations, setStations] = useState<Station[]>([]);
    const [ams, setAms] = useState<User[]>([]);
    const [showForm, setShowForm] = useState(false);
    const [showAssignAMModal, setShowAssignAMModal] = useState(false);
    const [showAssignSMModal, setShowAssignSMModal] = useState(false);
    const [selectedAM, setSelectedAM] = useState<User | null>(null);
    const [selectedSM, setSelectedSM] = useState<User | null>(null);
    const [selectedSMsForAM, setSelectedSMsForAM] = useState<string[]>([]);
    const [assignSMData, setAssignSMData] = useState({
        stationId: '',
        areaManagerId: '',
    });
    const [formData, setFormData] = useState({
        name: '',
        employeeId: '',
        password: 'password123',
        role: 'SM',
        stationId: '',
        areaManagerId: '',
    });

    useEffect(() => {
        loadUsers();
        loadStations();
    }, []);

    const loadUsers = async () => {
        try {
            const res = await api.get('/api/users');
            setUsers(res.data.users);
            // Filter AMs for the dropdown
            setAms(res.data.users.filter((u: User) => u.role === 'AM'));
        } catch (error) {
            console.error('Failed to load users', error);
        }
    };

    const loadStations = async () => {
        try {
            const res = await api.get('/api/stations');
            setStations(res.data.stations);
        } catch (error) {
            console.error('Failed to load stations', error);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const payload: any = {
                name: formData.name,
                employeeId: formData.employeeId,
                password: formData.password,
                role: formData.role,
            };

            // Only add stationId and areaManagerId for Station Managers
            if (formData.role === 'SM') {
                if (formData.stationId) payload.stationId = formData.stationId;
                if (formData.areaManagerId) payload.areaManagerId = formData.areaManagerId;
            }

            await api.post('/api/users', payload);
            setShowForm(false);
            setFormData({
                name: '',
                employeeId: '',
                password: 'password123',
                role: 'SM',
                stationId: '',
                areaManagerId: '',
            });
            loadUsers();
            alert('Employee created successfully');
        } catch (error: any) {
            alert(error.response?.data?.error || 'Failed to create user');
        }
    };

    const handleAssignAM = (am: User) => {
        setSelectedAM(am);
        // Pre-select SMs already assigned to this AM
        const assignedSMs = stationManagers
            .filter(sm => sm.areaManager?.id === am.id)
            .map(sm => sm.id);
        setSelectedSMsForAM(assignedSMs);
        setShowAssignAMModal(true);
    };

    const handleSaveAMAssignments = async () => {
        if (!selectedAM) return;

        try {
            // Update all SMs: assign selected ones to this AM, unassign others
            const updatePromises = stationManagers.map(async (sm) => {
                const shouldBeAssigned = selectedSMsForAM.includes(sm.id);
                const currentlyAssigned = sm.areaManager?.id === selectedAM.id;

                // Only update if there's a change
                if (shouldBeAssigned && !currentlyAssigned) {
                    // Assign this SM to the AM
                    return api.patch(`/api/users/${sm.id}`, {
                        areaManagerId: selectedAM.id,
                    });
                } else if (!shouldBeAssigned && currentlyAssigned) {
                    // Unassign this SM from the AM
                    return api.patch(`/api/users/${sm.id}`, {
                        areaManagerId: null,
                    });
                }
            });

            await Promise.all(updatePromises.filter(p => p !== undefined));

            setShowAssignAMModal(false);
            setSelectedAM(null);
            setSelectedSMsForAM([]);
            loadUsers();
            alert('Assignments updated successfully');
        } catch (error: any) {
            alert(error.response?.data?.error || 'Failed to update assignments');
        }
    };

    const handleAssignSM = (sm: User) => {
        setSelectedSM(sm);
        setAssignSMData({
            stationId: sm.station?.id || '',
            areaManagerId: sm.areaManager?.id || '',
        });
        setShowAssignSMModal(true);
    };

    const handleSaveSMAssignment = async () => {
        if (!selectedSM) return;

        try {
            await api.patch(`/api/users/${selectedSM.id}`, {
                stationId: assignSMData.stationId || null,
                areaManagerId: assignSMData.areaManagerId || null,
            });

            setShowAssignSMModal(false);
            setSelectedSM(null);
            setAssignSMData({ stationId: '', areaManagerId: '' });
            loadUsers();
            alert('Assignment updated successfully');
        } catch (error: any) {
            alert(error.response?.data?.error || 'Failed to update assignment');
        }
    };

    const toggleSMSelection = (smId: string) => {
        setSelectedSMsForAM(prev =>
            prev.includes(smId)
                ? prev.filter(id => id !== smId)
                : [...prev, smId]
        );
    };

    // Filter users by role
    const admins = users.filter(u => u.role === 'Admin');
    const areaManagers = users.filter(u => u.role === 'AM');
    const stationManagers = users.filter(u => u.role === 'SM');

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 mb-2">Employee Management</h1>
                        <p className="text-gray-600">Manage employees and their asset assignments</p>
                    </div>
                    <button
                        onClick={() => setShowForm(!showForm)}
                        className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-medium"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        {showForm ? 'Cancel' : 'Add Employee'}
                    </button>
                </div>
            </div>

            {/* Add Employee Form */}
            {showForm && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <h2 className="text-xl font-semibold mb-4 text-gray-900">+ Add Employee</h2>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Employee Name *</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                                    placeholder="Enter employee name"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Employee ID (optional)</label>
                                <input
                                    type="text"
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                                    placeholder="Enter employee ID"
                                    value={formData.employeeId}
                                    onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
                                <select
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                                    value={formData.role}
                                    onChange={(e) => setFormData({ ...formData, role: e.target.value, stationId: '', areaManagerId: '' })}
                                >
                                    <option value="SM">Station Manager</option>
                                    <option value="AM">Area Manager</option>
                                    <option value="Admin">Admin</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                />
                            </div>
                            {formData.role === 'SM' && (
                                <>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Department (optional)</label>
                                        <select
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                                            value={formData.stationId}
                                            onChange={(e) => setFormData({ ...formData, stationId: e.target.value })}
                                        >
                                            <option value="">Select a department</option>
                                            {stations.map(s => (
                                                <option key={s.id} value={s.id}>{s.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Area Manager</label>
                                        <select
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                                            value={formData.areaManagerId}
                                            onChange={(e) => setFormData({ ...formData, areaManagerId: e.target.value })}
                                        >
                                            <option value="">Select Area Manager (Optional)</option>
                                            {ams.map(am => (
                                                <option key={am.id} value={am.id}>{am.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                </>
                            )}
                        </div>
                        <div className="flex gap-3 pt-4">
                            <button
                                type="submit"
                                className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-medium"
                            >
                                + Add Employee
                            </button>
                            <button
                                type="button"
                                onClick={() => setShowForm(false)}
                                className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                            >
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Admins Section */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                    <h2 className="text-lg font-semibold text-gray-900">All Employees</h2>
                </div>
                <div className="p-6">
                    <div className="mb-6">
                        <h3 className="text-md font-semibold text-gray-700 mb-4">Admins ({admins.length})</h3>
                        {admins.length === 0 ? (
                            <p className="text-sm text-gray-500 text-center py-4">No admins found</p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee ID</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {admins.map((admin) => (
                                            <tr key={admin.id} className="hover:bg-gray-50 transition-colors">
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{admin.name}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{admin.employeeId}</td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className="px-3 py-1 inline-flex text-xs font-semibold rounded-full bg-purple-100 text-purple-800 border border-purple-200">
                                                        {admin.role}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    <div className="mb-6">
                        <h3 className="text-md font-semibold text-gray-700 mb-4">Area Managers ({areaManagers.length})</h3>
                        {areaManagers.length === 0 ? (
                            <p className="text-sm text-gray-500 text-center py-4">No area managers found</p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee ID</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Station Managers</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {areaManagers.map((am) => {
                                            const subordinates = stationManagers.filter(sm => sm.areaManager?.id === am.id);
                                            return (
                                                <tr key={am.id} className="hover:bg-gray-50 transition-colors">
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{am.name}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{am.employeeId}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <span className="px-3 py-1 inline-flex text-xs font-semibold rounded-full bg-blue-100 text-blue-800 border border-blue-200">
                                                            {am.role}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-sm text-gray-600">
                                                        {subordinates.length > 0 ? (
                                                            <div className="flex flex-wrap gap-1">
                                                                {subordinates.map(sm => (
                                                                    <span key={sm.id} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800 border border-gray-200">
                                                                        {sm.name}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        ) : (
                                                            <span className="text-gray-400">No station managers assigned</span>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                        <button
                                                            onClick={() => handleAssignAM(am)}
                                                            className="px-3 py-1 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors text-xs font-medium"
                                                        >
                                                            Assign
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    <div>
                        <h3 className="text-md font-semibold text-gray-700 mb-4">Station Managers ({stationManagers.length})</h3>
                        {stationManagers.length === 0 ? (
                            <p className="text-sm text-gray-500 text-center py-4">No station managers found</p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee ID</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Station</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Area Manager</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {stationManagers.map((sm) => (
                                            <tr key={sm.id} className="hover:bg-gray-50 transition-colors">
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{sm.name}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{sm.employeeId}</td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className="px-3 py-1 inline-flex text-xs font-semibold rounded-full bg-green-100 text-green-800 border border-green-200">
                                                        {sm.role}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                                    {sm.station?.name || '-'}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                                    {sm.areaManager?.name || '-'}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                    <button
                                                        onClick={() => handleAssignSM(sm)}
                                                        className="px-3 py-1 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors text-xs font-medium"
                                                    >
                                                        Assign
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Assign Area Manager Modal */}
            {showAssignAMModal && selectedAM && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto border border-gray-200">
                        <div className="p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-xl font-semibold text-gray-900">
                                    Assign Station Managers to {selectedAM.name}
                                </h2>
                                <button
                                    onClick={() => {
                                        setShowAssignAMModal(false);
                                        setSelectedAM(null);
                                        setSelectedSMsForAM([]);
                                    }}
                                    className="text-gray-400 hover:text-gray-600"
                                >
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                            <p className="text-sm text-gray-600 mb-4">
                                Select the station managers to assign to this area manager. Each station manager can only be assigned to one area manager.
                            </p>
                            <div className="space-y-2 mb-6">
                                {stationManagers.map(sm => {
                                    const isSelected = selectedSMsForAM.includes(sm.id);
                                    const isAssignedToOther = sm.areaManager && sm.areaManager.id !== selectedAM.id;

                                    return (
                                        <div
                                            key={sm.id}
                                            className={`flex items-center justify-between p-3 border rounded-lg transition-colors ${
                                                isSelected ? 'bg-primary/10 border-primary' : 'bg-white border-gray-200'
                                            } ${isAssignedToOther ? 'opacity-50' : 'hover:bg-gray-50'}`}
                                        >
                                            <div className="flex items-center">
                                                <input
                                                    type="checkbox"
                                                    checked={isSelected}
                                                    onChange={() => toggleSMSelection(sm.id)}
                                                    disabled={isAssignedToOther}
                                                    className="mr-3 h-4 w-4 text-primary rounded focus:ring-primary"
                                                />
                                                <div>
                                                    <p className="font-medium text-sm text-gray-900">{sm.name}</p>
                                                    <p className="text-xs text-gray-500">ID: {sm.employeeId}</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                {sm.station && (
                                                    <p className="text-xs text-gray-600">Station: {sm.station.name}</p>
                                                )}
                                                {isAssignedToOther && (
                                                    <p className="text-xs text-red-600">Assigned to: {sm.areaManager?.name}</p>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                            <div className="flex justify-end gap-3">
                                <button
                                    onClick={() => {
                                        setShowAssignAMModal(false);
                                        setSelectedAM(null);
                                        setSelectedSMsForAM([]);
                                    }}
                                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-gray-700 font-medium"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSaveAMAssignments}
                                    className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-medium"
                                >
                                    Save Assignments
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Assign Station Manager Modal */}
            {showAssignSMModal && selectedSM && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl max-w-md w-full border border-gray-200">
                        <div className="p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-xl font-semibold text-gray-900">
                                    Assign {selectedSM.name}
                                </h2>
                                <button
                                    onClick={() => {
                                        setShowAssignSMModal(false);
                                        setSelectedSM(null);
                                        setAssignSMData({ stationId: '', areaManagerId: '' });
                                    }}
                                    className="text-gray-400 hover:text-gray-600"
                                >
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                            <div className="space-y-4 mb-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Assign Station
                                    </label>
                                    <select
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                                        value={assignSMData.stationId}
                                        onChange={(e) => setAssignSMData({ ...assignSMData, stationId: e.target.value })}
                                    >
                                        <option value="">Select Station (Optional)</option>
                                        {stations.map(s => (
                                            <option key={s.id} value={s.id}>{s.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Assign Area Manager
                                    </label>
                                    <select
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                                        value={assignSMData.areaManagerId}
                                        onChange={(e) => setAssignSMData({ ...assignSMData, areaManagerId: e.target.value })}
                                    >
                                        <option value="">Select Area Manager (Optional)</option>
                                        {ams.map(am => (
                                            <option key={am.id} value={am.id}>{am.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div className="flex justify-end gap-3">
                                <button
                                    onClick={() => {
                                        setShowAssignSMModal(false);
                                        setSelectedSM(null);
                                        setAssignSMData({ stationId: '', areaManagerId: '' });
                                    }}
                                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-gray-700 font-medium"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSaveSMAssignment}
                                    className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-medium"
                                >
                                    Save Assignment
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
