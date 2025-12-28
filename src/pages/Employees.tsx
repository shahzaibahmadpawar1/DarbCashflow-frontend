import { useState, useEffect } from 'react';
import api from '../services/api';


interface User {
    id: string;
    name: string;
    email: string;
    role: 'Admin' | 'SM' | 'AM';
    station?: { name: string };
    stationId?: string;
}

interface Station {
    id: string;
    name: string;
}

export const Employees = () => {

    const [users, setUsers] = useState<User[]>([]);
    const [stations, setStations] = useState<Station[]>([]);
    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: 'password123', // Default password
        role: 'SM',
        stationId: '',
    });

    useEffect(() => {
        loadUsers();
        loadStations();
    }, []);

    const loadUsers = async () => {
        try {
            const res = await api.get('/api/users');
            setUsers(res.data.users);
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
            await api.post('/api/users', formData);
            setShowForm(false);
            setFormData({
                name: '',
                email: '',
                password: 'password123',
                role: 'SM',
                stationId: '',
            });
            loadUsers();
            alert('Employee created successfully');
        } catch (error: any) {
            alert(error.response?.data?.error || 'Failed to create user');
        }
    };

    return (
        <div className="px-4 py-6 sm:px-0">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-900">Employees</h1>
                <button
                    onClick={() => setShowForm(!showForm)}
                    className="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700"
                >
                    {showForm ? 'Cancel' : 'Add Employee'}
                </button>
            </div>

            {showForm && (
                <div className="bg-white shadow rounded-lg p-6 mb-6">
                    <h2 className="text-xl font-semibold mb-4">Create New Employee</h2>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Name</label>
                                <input
                                    type="text"
                                    required
                                    className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm p-2"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Email / ID</label>
                                <input
                                    type="email"
                                    required
                                    className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm p-2"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Role</label>
                                <select
                                    className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm p-2"
                                    value={formData.role}
                                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                >
                                    <option value="SM">Station Manager</option>
                                    <option value="AM">Area Manager</option>
                                    <option value="Admin">Admin</option>
                                </select>
                            </div>
                            {formData.role === 'SM' && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Assign Station</label>
                                    <select
                                        className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm p-2"
                                        value={formData.stationId}
                                        onChange={(e) => setFormData({ ...formData, stationId: e.target.value })}
                                    >
                                        <option value="">Select Station</option>
                                        {stations.map(s => (
                                            <option key={s.id} value={s.id}>{s.name}</option>
                                        ))}
                                    </select>
                                </div>
                            )}
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Password</label>
                                <input
                                    type="text"
                                    required
                                    className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm p-2"
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                />
                            </div>
                        </div>
                        <button
                            type="submit"
                            className="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700"
                        >
                            Create Employee
                        </button>
                    </form>
                </div>
            )}

            <div className="bg-white shadow rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Station</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {users.map((user) => (
                            <tr key={user.id}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{user.name}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.email}</td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                    ${user.role === 'Admin' ? 'bg-purple-100 text-purple-800' :
                                            user.role === 'AM' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}`}>
                                        {user.role}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {user.station?.name || '-'}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
