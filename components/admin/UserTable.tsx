
import React from 'react';
import { Link } from 'react-router-dom';
import type { User } from '../../types';
import { ArrowRightIcon } from '../icons';

interface UserTableProps {
    title: string;
    users: User[];
    onEdit: (user: User) => void;
    onDelete: (userId: string) => void;
    viewMoreLink?: string;
    totalCount?: number;
}

const UserTable: React.FC<UserTableProps> = ({ title, users, onEdit, onDelete, viewMoreLink, totalCount }) => {
    return (
        <div>
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-semibold text-gray-800">{title} ({totalCount ?? users.length})</h2>
                {viewMoreLink && (
                    <Link to={viewMoreLink} className="flex items-center space-x-1 text-sm font-medium text-brand-primary hover:text-brand-dark transition-colors">
                        <span>View All</span>
                        <ArrowRightIcon />
                    </Link>
                )}
            </div>
            <div className="bg-white shadow-md rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Class Preference</th>
                                <th scope="col" className="relative px-6 py-3">
                                    <span className="sr-only">Actions</span>
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {users.length > 0 ? (
                                users.map((user) => (
                                    <tr key={user.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{user.name}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.email}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.classPreference}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-4">
                                            <button onClick={() => onEdit(user)} className="text-brand-primary hover:text-brand-dark">Edit</button>
                                            <button onClick={() => onDelete(user.id)} className="text-red-600 hover:text-red-800">Delete</button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={4} className="px-6 py-4 text-center text-sm text-gray-500">No {title.toLowerCase()} found.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default UserTable;
