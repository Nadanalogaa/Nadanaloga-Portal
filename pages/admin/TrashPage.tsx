
import React, { useState, useEffect, useCallback } from 'react';
import type { User } from '../../types';
import { getTrashedUsers, restoreUser, deleteUserPermanently } from '../../api';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import AdminNav from '../../components/admin/AdminNav';

const TrashPage: React.FC = () => {
    const [trashedUsers, setTrashedUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const users = await getTrashedUsers();
            setTrashedUsers(users);
            setError(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch trashed items.');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleRestore = async (userId: string) => {
        if (window.confirm('Are you sure you want to restore this user?')) {
            try {
                await restoreUser(userId);
                setTrashedUsers(prev => prev.filter(u => u.id !== userId));
            } catch (err) {
                alert(err instanceof Error ? err.message : 'Failed to restore user.');
            }
        }
    };

    const handlePermanentDelete = async (userId: string) => {
        if (window.confirm('Are you sure you want to permanently delete this user? This action CANNOT be undone.')) {
            try {
                await deleteUserPermanently(userId);
                setTrashedUsers(prev => prev.filter(u => u.id !== userId));
            } catch (err) {
                alert(err instanceof Error ? err.message : 'Failed to permanently delete user.');
            }
        }
    };
    
    return (
        <div className="bg-gray-50 min-h-full py-3">
            <div className="container mx-auto px-6 lg:px-8">
                <div className="max-w-full mx-auto">
                    <AdminPageHeader
                        title="Trash"
                        subtitle="Manage deleted records. You can restore them or delete them permanently."
                        backLinkPath="/admin/dashboard"
                        backTooltipText="Back to Dashboard"
                    />
                    <AdminNav />

                    {isLoading && <p className="text-center text-gray-500 py-8">Loading trashed items...</p>}
                    {error && <p className="text-center text-red-500 bg-red-100 p-3 rounded-md mt-6">{error}</p>}

                    {!isLoading && !error && (
                         <div className="bg-white shadow-md rounded-lg overflow-hidden mt-8">
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date Deleted</th>
                                            <th scope="col" className="relative px-6 py-3"><span className="sr-only">Actions</span></th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {trashedUsers.length > 0 ? trashedUsers.map((user) => (
                                            <tr key={user.id} className="hover:bg-gray-50">
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{user.name}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.role}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.email}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.deletedAt ? new Date(user.deletedAt).toLocaleString() : 'N/A'}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-4">
                                                    <button onClick={() => handleRestore(user.id)} className="text-green-600 hover:text-green-800">Restore</button>
                                                    <button onClick={() => handlePermanentDelete(user.id)} className="text-red-600 hover:text-red-800">Delete Permanently</button>
                                                </td>
                                            </tr>
                                        )) : (
                                            <tr>
                                                <td colSpan={5} className="px-6 py-8 text-center text-sm text-gray-500">The trash is empty.</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default TrashPage;