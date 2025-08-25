
import React from 'react';
import type { Batch, User } from '../../types';
import { UsersIcon, UserAddIcon } from '../icons';
import Tooltip from '../Tooltip';

interface BatchTableProps {
    batches: Batch[];
    usersMap: Map<string, User>;
    onEdit: (batch: Batch) => void;
    onDelete: (batchId: string) => void;
    onView: (batch: Batch) => void;
    onAddStudents: (batch: Batch) => void;
}

const BatchTable: React.FC<BatchTableProps> = ({ batches, usersMap, onEdit, onDelete, onView, onAddStudents }) => {
    return (
        <div className="bg-white shadow-md rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Batch Name</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Course</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Teacher</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mode</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Schedule</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Students</th>
                            <th scope="col" className="relative px-6 py-3"><span className="sr-only">Actions</span></th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {batches.length > 0 ? batches.map(batch => {
                            const totalStudents = new Set((batch.schedule ?? []).flatMap(s => s.studentIds)).size;
                             const studentNames = Array.from(new Set((batch.schedule ?? []).flatMap(s => s.studentIds)))
                                .map(id => usersMap.get(id)?.name)
                                .filter(Boolean)
                                .join(', ');
                            
                            let teacherName;
                            if (typeof batch.teacherId === 'string') {
                                teacherName = usersMap.get(batch.teacherId)?.name;
                            } else if (typeof batch.teacherId === 'object' && batch.teacherId) {
                                teacherName = batch.teacherId.name;
                            }

                            return (
                                <tr key={batch.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{batch.name}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{batch.courseName}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{teacherName || <span className="text-gray-400 italic">Unassigned</span>}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        {batch.mode ? (
                                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${batch.mode === 'Online' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'}`}>
                                                {batch.mode}
                                            </span>
                                        ) : (
                                            <span className="text-gray-400 italic">N/A</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-500 max-w-xs">
                                        <div className="flex flex-wrap gap-1">
                                            {(batch.schedule ?? []).map(s => (
                                                <span key={s.timing} className="text-xs bg-gray-200 text-gray-800 px-2 py-0.5 rounded-full whitespace-nowrap">{s.timing}</span>
                                            ))}
                                             {(batch.schedule ?? []).length === 0 && <span className="text-gray-400 italic">Not scheduled</span>}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        <div className="flex items-center space-x-2">
                                            <Tooltip content={studentNames || 'No students assigned'} position="top">
                                                <div className="flex items-center space-x-1.5 cursor-pointer">
                                                    <UsersIcon className="h-5 w-5" />
                                                    <span>{totalStudents}</span>
                                                </div>
                                            </Tooltip>
                                            <Tooltip content="Add Students" position="top">
                                                <button onClick={() => onAddStudents(batch)} className="text-gray-400 hover:text-green-600 transition-colors">
                                                    <UserAddIcon className="h-5 w-5"/>
                                                </button>
                                            </Tooltip>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-4">
                                        <button onClick={() => onView(batch)} className="text-blue-600 hover:text-blue-800">View</button>
                                        <button onClick={() => onEdit(batch)} className="text-brand-primary hover:text-brand-dark">Edit</button>
                                        <button onClick={() => onDelete(batch.id)} className="text-red-600 hover:text-red-800">Delete</button>
                                    </td>
                                </tr>
                            )
                        }) : (
                            <tr>
                                <td colSpan={7} className="px-6 py-8 text-center text-sm text-gray-500">
                                    No batches match the current filters.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default BatchTable;
