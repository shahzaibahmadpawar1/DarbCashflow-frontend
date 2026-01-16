import { useState, useEffect } from 'react';
import api from '../services/api';

interface User {
    id: string;
    name: string;
    employeeId: string;
    role: 'Admin' | 'SM' | 'AM' | 'OU' | 'Accountant' | 'ViewOnly';
    station?: { name: string; id: string };
    areaManager?: { id: string; name: string };
    assignedStations?: Array<{ station: { id: string; name: string } }>;
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
    const [showAssignOUStationsModal, setShowAssignOUStationsModal] = useState(false);
    const [selectedAM, setSelectedAM] = useState<User | null>(null);
    const [selectedSM, setSelectedSM] = useState<User | null>(null);
    const [selectedOU, setSelectedOU] = useState<User | null>(null);
    const [selectedSMsForAM, setSelectedSMsForAM] = useState<string[]>([]);
    const [selectedStationsForOU, setSelectedStationsForOU] = useState<string[]>([]);
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

    // Delete employee
    const handleDeleteEmployee = async (user: User) => {
        if (!confirm(`Are you sure you want to delete ${user.name}? This action cannot be undone.`)) {
            return;
        }

        try {
            await api.delete(`/api/users/${user.id}`);
            loadUsers();
            alert('Employee deleted successfully');
        } catch (error: any) {
            alert(error.response?.data?.error || 'Failed to delete employee');
        }
    };

    // Edit password
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [selectedUserForPassword, setSelectedUserForPassword] = useState<User | null>(null);
    const [newPassword, setNewPassword] = useState('');

    const handleEditPassword = (user: User) => {
        setSelectedUserForPassword(user);
        setNewPassword('');
        setShowPasswordModal(true);
    };

    const handleSavePassword = async () => {
        if (!selectedUserForPassword) return;

        if (!newPassword || newPassword.length < 6) {
            alert('Password must be at least 6 characters long');
            return;
        }

        try {
            await api.patch(`/api/users/${selectedUserForPassword.id}/password`, {
                password: newPassword,
            });
            setShowPasswordModal(false);
            setSelectedUserForPassword(null);
            setNewPassword('');
            alert('Password updated successfully');
        } catch (error: any) {
            alert(error.response?.data?.error || 'Failed to update password');
        }
    };

    // Office User Station Assignment
    const handleAssignOUStations = async (ou: User) => {
        setSelectedOU(ou);

        // Load currently assigned stations for this Office User
        try {
            const res = await api.get(`/api/office-users/${ou.id}/stations`);
            setSelectedStationsForOU(res.data.stations.map((s: Station) => s.id));
        } catch (error) {
            console.error('Failed to load assigned stations', error);
            setSelectedStationsForOU([]);
        }

        setShowAssignOUStationsModal(true);
    };

    const toggleStationSelection = (stationId: string) => {
        setSelectedStationsForOU(prev =>
            prev.includes(stationId)
                ? prev.filter(id => id !== stationId)
                : [...prev, stationId]
        );
    };

    const handleSaveOUStationAssignments = async () => {
        if (!selectedOU) return;

        try {
            await api.post(`/api/office-users/${selectedOU.id}/stations`, {
                stationIds: selectedStationsForOU
            });

            setShowAssignOUStationsModal(false);
            setSelectedOU(null);
            setSelectedStationsForOU([]);
            alert('Stations assigned successfully');
        } catch (error: any) {
            alert(error.response?.data?.error || 'Failed to assign stations');
        }
    };

    // Filter users by role
    const admins = users.filter(u => u.role === 'Admin');
    const areaManagers = users.filter(u => u.role === 'AM');
    const stationManagers = users.filter(u => u.role === 'SM');
    const officeUsers = users.filter(u => u.role === 'OU');
    const accountants = users.filter(u => u.role === 'Accountant');
    const viewOnlyUsers = users.filter(u => u.role === 'ViewOnly');

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
                                    <option value="OU">Office User</option>
                                    <option value="Accountant">Accountant</option>
                                    <option value="ViewOnly">View Only</option>
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
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
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
                                                <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={() => handleEditPassword(admin)}
                                                            className="px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-xs font-medium"
                                                        >
                                                            Password
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteEmployee(admin)}
                                                            className="px-3 py-1 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-xs font-medium"
                                                        >
                                                            Delete
                                                        </button>
                                                    </div>
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
                                                        <div className="flex gap-2">
                                                            <button
                                                                onClick={() => handleAssignAM(am)}
                                                                className="px-3 py-1 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors text-xs font-medium"
                                                            >
                                                                Assign
                                                            </button>
                                                            <button
                                                                onClick={() => handleEditPassword(am)}
                                                                className="px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-xs font-medium"
                                                            >
                                                                Password
                                                            </button>
                                                            <button
                                                                onClick={() => handleDeleteEmployee(am)}
                                                                className="px-3 py-1 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-xs font-medium"
                                                            >
                                                                Delete
                                                            </button>
                                                        </div>
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
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={() => handleAssignSM(sm)}
                                                            className="px-3 py-1 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors text-xs font-medium"
                                                        >
                                                            Assign
                                                        </button>
                                                        <button
                                                            onClick={() => handleEditPassword(sm)}
                                                            className="px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-xs font-medium"
                                                        >
                                                            Password
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteEmployee(sm)}
                                                            className="px-3 py-1 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-xs font-medium"
                                                        >
                                                            Delete
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    <div>
                        <h3 className="text-md font-semibold text-gray-700 mb-4">Office Users ({officeUsers.length})</h3>
                        {officeUsers.length === 0 ? (
                            <p className="text-sm text-gray-500 text-center py-4">No office users found</p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee ID</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Assigned Stations</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {officeUsers.map((ou) => (
                                            <tr key={ou.id} className="hover:bg-gray-50 transition-colors">
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{ou.name}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{ou.employeeId}</td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className="px-3 py-1 inline-flex text-xs font-semibold rounded-full bg-orange-100 text-orange-800 border border-orange-200">
                                                        Office User
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-sm text-gray-600">
                                                    {ou.assignedStations && ou.assignedStations.length > 0 ? (
                                                        <div className="flex flex-wrap gap-1">
                                                            {ou.assignedStations.map((assignment) => (
                                                                <span
                                                                    key={assignment.station.id}
                                                                    className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium"
                                                                >
                                                                    {assignment.station.name}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <span className="text-gray-400 italic">No stations assigned</span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={() => handleAssignOUStations(ou)}
                                                            className="px-3 py-1 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors text-xs font-medium"
                                                        >
                                                            Assign Stations
                                                        </button>
                                                        <button
                                                            onClick={() => handleEditPassword(ou)}
                                                            className="px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-xs font-medium"
                                                        >
                                                            Password
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteEmployee(ou)}
                                                            className="px-3 py-1 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-xs font-medium"
                                                        >
                                                            Delete
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    <div className="mb-6">
                        <h3 className="text-md font-semibold text-gray-700 mb-4">Accountants ({accountants.length})</h3>
                        {accountants.length === 0 ? (
                            <p className="text-sm text-gray-500 text-center py-4">No accountants found</p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee ID</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {accountants.map((accountant) => (
                                            <tr key={accountant.id} className="hover:bg-gray-50 transition-colors">
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{accountant.name}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{accountant.employeeId}</td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className="px-3 py-1 inline-flex text-xs font-semibold rounded-full bg-teal-100 text-teal-800 border border-teal-200">
                                                        Accountant
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={() => handleEditPassword(accountant)}
                                                            className="px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-xs font-medium"
                                                        >
                                                            Password
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteEmployee(accountant)}
                                                            className="px-3 py-1 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-xs font-medium"
                                                        >
                                                            Delete
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    <div>
                        <h3 className="text-md font-semibold text-gray-700 mb-4">View Only Users ({viewOnlyUsers.length})</h3>
                        {viewOnlyUsers.length === 0 ? (
                            <p className="text-sm text-gray-500 text-center py-4">No view only users found</p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee ID</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {viewOnlyUsers.map((viewOnly) => (
                                            <tr key={viewOnly.id} className="hover:bg-gray-50 transition-colors">
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{viewOnly.name}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{viewOnly.employeeId}</td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className="px-3 py-1 inline-flex text-xs font-semibold rounded-full bg-gray-100 text-gray-800 border border-gray-200">
                                                        View Only
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={() => handleEditPassword(viewOnly)}
                                                            className="px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-xs font-medium"
                                                        >
                                                            Password
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteEmployee(viewOnly)}
                                                            className="px-3 py-1 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-xs font-medium"
                                                        >
                                                            Delete
                                                        </button>
                                                    </div>
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
                                            className={`flex items-center justify-between p-3 border rounded-lg transition-colors ${isSelected ? 'bg-primary/10 border-primary' : 'bg-white border-gray-200'
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

            {/* Edit Password Modal */}
            {showPasswordModal && selectedUserForPassword && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl max-w-md w-full border border-gray-200">
                        <div className="p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-xl font-semibold text-gray-900">
                                    Edit Password for {selectedUserForPassword.name}
                                </h2>
                                <button
                                    onClick={() => {
                                        setShowPasswordModal(false);
                                        setSelectedUserForPassword(null);
                                        setNewPassword('');
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
                                        New Password *
                                    </label>
                                    <input
                                        type="text"
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                                        placeholder="Enter new password (min 6 characters)"
                                    />
                                    <p className="text-xs text-gray-500 mt-1">Password must be at least 6 characters long</p>
                                </div>
                            </div>
                            <div className="flex justify-end gap-3">
                                <button
                                    onClick={() => {
                                        setShowPasswordModal(false);
                                        setSelectedUserForPassword(null);
                                        setNewPassword('');
                                    }}
                                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-gray-700 font-medium"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSavePassword}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                                >
                                    Update Password
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Assign Stations to Office User Modal */}
            {showAssignOUStationsModal && selectedOU && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full border border-gray-200 max-h-[90vh] overflow-y-auto">
                        <div className="p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-xl font-semibold text-gray-900">
                                    Assign Stations to {selectedOU.name}
                                </h2>
                                <button
                                    onClick={() => {
                                        setShowAssignOUStationsModal(false);
                                        setSelectedOU(null);
                                        setSelectedStationsForOU([]);
                                    }}
                                    className="text-gray-400 hover:text-gray-600"
                                >
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                            <p className="text-sm text-gray-600 mb-4">
                                Select the stations this office user can access. Office users can only view data from their assigned stations.
                            </p>
                            <div className="space-y-2 mb-6">
                                {stations.map(station => {
                                    const isSelected = selectedStationsForOU.includes(station.id);

                                    return (
                                        <div
                                            key={station.id}
                                            className={`flex items-center justify-between p-3 border rounded-lg transition-colors ${isSelected ? 'bg-primary/10 border-primary' : 'bg-white border-gray-200 hover:bg-gray-50'
                                                }`}
                                        >
                                            <div className="flex items-center">
                                                <input
                                                    type="checkbox"
                                                    checked={isSelected}
                                                    onChange={() => toggleStationSelection(station.id)}
                                                    className="mr-3 h-4 w-4 text-primary rounded focus:ring-primary"
                                                />
                                                <div>
                                                    <p className="font-medium text-sm text-gray-900">{station.name}</p>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                            <div className="flex justify-between items-center mb-4">
                                <p className="text-sm text-gray-600">
                                    Selected: <span className="font-semibold text-primary">{selectedStationsForOU.length}</span> of {stations.length} stations
                                </p>
                            </div>
                            <div className="flex justify-end gap-3">
                                <button
                                    onClick={() => {
                                        setShowAssignOUStationsModal(false);
                                        setSelectedOU(null);
                                        setSelectedStationsForOU([]);
                                    }}
                                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-gray-700 font-medium"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSaveOUStationAssignments}
                                    className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-medium"
                                >
                                    Save Assignments
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
