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
        <div className="px-4 py-6 sm:px-0">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-foreground">Employees</h1>
                <button
                    onClick={() => setShowForm(!showForm)}
                    className="bg-primary text-primary-foreground px-4 py-2 rounded-md hover-elevate active-elevate-2 border border-primary-border"
                >
                    {showForm ? 'Cancel' : 'Add Employee'}
                </button>
            </div>

            {showForm && (
                <div className="bg-card shadow rounded-lg p-6 mb-6 border border-card-border">
                    <h2 className="text-xl font-semibold mb-4 text-card-foreground">Create New Employee</h2>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-foreground">Name</label>
                                <input
                                    type="text"
                                    required
                                    className="mt-1 block w-full rounded-md border border-input shadow-sm p-2 bg-background text-foreground"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-foreground">Employee ID</label>
                                <input
                                    type="text"
                                    required
                                    className="mt-1 block w-full rounded-md border border-input shadow-sm p-2 bg-background text-foreground"
                                    value={formData.employeeId}
                                    onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-foreground">Role</label>
                                <select
                                    className="mt-1 block w-full rounded-md border border-input shadow-sm p-2 bg-background text-foreground"
                                    value={formData.role}
                                    onChange={(e) => setFormData({ ...formData, role: e.target.value, stationId: '', areaManagerId: '' })}
                                >
                                    <option value="SM">Station Manager</option>
                                    <option value="AM">Area Manager</option>
                                    <option value="Admin">Admin</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-foreground">Password</label>
                                <input
                                    type="text"
                                    required
                                    className="mt-1 block w-full rounded-md border border-input shadow-sm p-2 bg-background text-foreground"
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                />
                            </div>
                            {formData.role === 'SM' && (
                                <>
                                    <div>
                                        <label className="block text-sm font-medium text-foreground">Assign Station</label>
                                        <select
                                            className="mt-1 block w-full rounded-md border border-input shadow-sm p-2 bg-background text-foreground"
                                            value={formData.stationId}
                                            onChange={(e) => setFormData({ ...formData, stationId: e.target.value })}
                                        >
                                            <option value="">Select Station (Optional)</option>
                                            {stations.map(s => (
                                                <option key={s.id} value={s.id}>{s.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-foreground">Area Manager</label>
                                        <select
                                            className="mt-1 block w-full rounded-md border border-input shadow-sm p-2 bg-background text-foreground"
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
                        <button
                            type="submit"
                            className="bg-primary text-primary-foreground px-4 py-2 rounded-md hover-elevate active-elevate-2 border border-primary-border"
                        >
                            Create Employee
                        </button>
                    </form>
                </div>
            )}

            {/* Admins Section */}
            <div className="bg-card shadow rounded-lg overflow-hidden mb-6 border border-card-border">
                <div className="bg-accent/50 px-6 py-3 border-b border-border">
                    <h2 className="text-lg font-semibold text-foreground">Admins ({admins.length})</h2>
                </div>
                <table className="min-w-full divide-y divide-border">
                    <thead className="bg-muted">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Name</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Employee ID</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Role</th>
                        </tr>
                    </thead>
                    <tbody className="bg-card divide-y divide-border">
                        {admins.length === 0 ? (
                            <tr>
                                <td colSpan={3} className="px-6 py-4 text-center text-sm text-muted-foreground">No admins found</td>
                            </tr>
                        ) : (
                            admins.map((admin) => (
                                <tr key={admin.id}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">{admin.name}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">{admin.employeeId}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-accent text-accent-foreground">
                                            {admin.role}
                                        </span>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Area Managers Section */}
            <div className="bg-card shadow rounded-lg overflow-hidden mb-6 border border-card-border">
                <div className="bg-accent/50 px-6 py-3 border-b border-border">
                    <h2 className="text-lg font-semibold text-foreground">Area Managers ({areaManagers.length})</h2>
                </div>
                <table className="min-w-full divide-y divide-border">
                    <thead className="bg-muted">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Name</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Employee ID</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Role</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Station Managers</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-card divide-y divide-border">
                        {areaManagers.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-6 py-4 text-center text-sm text-muted-foreground">No area managers found</td>
                            </tr>
                        ) : (
                            areaManagers.map((am) => {
                                const subordinates = stationManagers.filter(sm => sm.areaManager?.id === am.id);
                                return (
                                    <tr key={am.id}>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">{am.name}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">{am.employeeId}</td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-accent text-accent-foreground">
                                                {am.role}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-muted-foreground">
                                            {subordinates.length > 0 ? (
                                                <div className="flex flex-wrap gap-1">
                                                    {subordinates.map(sm => (
                                                        <span key={sm.id} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-accent text-accent-foreground">
                                                            {sm.name}
                                                        </span>
                                                    ))}
                                                </div>
                                            ) : (
                                                <span className="text-muted-foreground">No station managers assigned</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                                            <button
                                                onClick={() => handleAssignAM(am)}
                                                className="bg-primary text-primary-foreground px-3 py-1 rounded-md hover-elevate active-elevate-2 text-xs border border-primary-border"
                                            >
                                                Assign
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {/* Station Managers Section */}
            <div className="bg-card shadow rounded-lg overflow-hidden border border-card-border">
                <div className="bg-accent/50 px-6 py-3 border-b border-border">
                    <h2 className="text-lg font-semibold text-foreground">Station Managers ({stationManagers.length})</h2>
                </div>
                <table className="min-w-full divide-y divide-border">
                    <thead className="bg-muted">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Name</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Employee ID</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Role</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Station</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Area Manager</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-card divide-y divide-border">
                        {stationManagers.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="px-6 py-4 text-center text-sm text-muted-foreground">No station managers found</td>
                            </tr>
                        ) : (
                            stationManagers.map((sm) => (
                                <tr key={sm.id}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">{sm.name}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">{sm.employeeId}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-accent text-accent-foreground">
                                            {sm.role}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                                        {sm.station?.name || '-'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                                        {sm.areaManager?.name || '-'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                                        <button
                                            onClick={() => handleAssignSM(sm)}
                                            className="bg-primary text-primary-foreground px-3 py-1 rounded-md hover-elevate active-elevate-2 text-xs border border-primary-border"
                                        >
                                            Assign
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Assign Area Manager Modal */}
            {showAssignAMModal && selectedAM && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-card/80 backdrop-blur-sm rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto border border-card-border">
                        <h2 className="text-xl font-semibold mb-4 text-card-foreground">
                            Assign Station Managers to {selectedAM.name}
                        </h2>
                        <p className="text-sm text-muted-foreground mb-4">
                            Select the station managers to assign to this area manager. Each station manager can only be assigned to one area manager.
                        </p>
                        <div className="space-y-2 mb-6">
                            {stationManagers.map(sm => {
                                const isSelected = selectedSMsForAM.includes(sm.id);
                                const isAssignedToOther = sm.areaManager && sm.areaManager.id !== selectedAM.id;

                                return (
                                    <div
                                        key={sm.id}
                                        className={`flex items-center justify-between p-3 border rounded-md ${isSelected ? 'bg-accent/50 border-primary' : 'bg-card border-border'
                                            } ${isAssignedToOther ? 'opacity-50' : ''}`}
                                    >
                                        <div className="flex items-center">
                                            <input
                                                type="checkbox"
                                                checked={isSelected}
                                                onChange={() => toggleSMSelection(sm.id)}
                                                disabled={isAssignedToOther}
                                                className="mr-3 h-4 w-4 text-primary rounded"
                                            />
                                            <div>
                                                <p className="font-medium text-sm text-foreground">{sm.name}</p>
                                                <p className="text-xs text-muted-foreground">ID: {sm.employeeId}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            {sm.station && (
                                                <p className="text-xs text-muted-foreground">Station: {sm.station.name}</p>
                                            )}
                                            {isAssignedToOther && (
                                                <p className="text-xs text-destructive">Assigned to: {sm.areaManager?.name}</p>
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
                                className="px-4 py-2 border border-border rounded-md hover-elevate active-elevate-2 bg-background text-foreground"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSaveAMAssignments}
                                className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover-elevate active-elevate-2 border border-primary-border"
                            >
                                Save Assignments
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Assign Station Manager Modal */}
            {showAssignSMModal && selectedSM && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-card/80 backdrop-blur-sm rounded-lg p-6 max-w-md w-full border border-card-border">
                        <h2 className="text-xl font-semibold mb-4 text-card-foreground">
                            Assign {selectedSM.name}
                        </h2>
                        <div className="space-y-4 mb-6">
                            <div>
                                <label className="block text-sm font-medium text-foreground mb-2">
                                    Assign Station
                                </label>
                                <select
                                    className="w-full rounded-md border border-input shadow-sm p-2 bg-background text-foreground"
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
                                <label className="block text-sm font-medium text-foreground mb-2">
                                    Assign Area Manager
                                </label>
                                <select
                                    className="w-full rounded-md border border-input shadow-sm p-2 bg-background text-foreground"
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
                                className="px-4 py-2 border border-border rounded-md hover-elevate active-elevate-2 bg-background text-foreground"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSaveSMAssignment}
                                className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover-elevate active-elevate-2 border border-primary-border"
                            >
                                Save Assignment
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
