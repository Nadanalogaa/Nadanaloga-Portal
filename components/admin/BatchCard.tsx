
import React, { useMemo } from 'react';
import type { Batch, User } from '../../types';
import { TeachersIcon, StudentsIcon } from '../icons';

interface BatchCardProps {
    batch: Batch;
    allStudents: User[];
    allTeachers: User[];
    onEdit: (batch: Batch) => void;
    onDelete: (batchId: string) => void;
}

const BatchCard: React.FC<BatchCardProps> = ({ batch, allStudents, allTeachers, onEdit, onDelete }) => {
    
    const teacher = useMemo(() => {
        if (!batch.teacherId) return null;
        return allTeachers.find(t => t.id === batch.teacherId);
    }, [batch.teacherId, allTeachers]);

    const enrolledStudents = useMemo(() => {
        return allStudents.filter(s => batch.studentIds.includes(s.id));
    }, [batch.studentIds, allStudents]);

    return (
        <div className="bg-white rounded-lg shadow-lg flex flex-col transition-shadow hover:shadow-xl">
            <div className="p-5 flex-grow">
                <h3 className="text-xl font-bold text-brand-primary truncate" title={batch.name}>{batch.name}</h3>
                <p className="text-sm text-gray-500 mt-1 h-10 overflow-hidden">{batch.description || 'No description provided.'}</p>
                
                <div className="mt-4 space-y-3">
                    <div className="flex items-center">
                        <TeachersIcon className="h-5 w-5 text-gray-400 mr-3" />
                        <span className="text-sm text-gray-700">
                            Teacher: <span className="font-semibold">{teacher?.name || 'Unassigned'}</span>
                        </span>
                    </div>
                     <div className="flex items-center">
                        <StudentsIcon className="h-5 w-5 text-gray-400 mr-3" />
                        <span className="text-sm text-gray-700">
                            <span className="font-semibold">{enrolledStudents.length}</span> Student(s) Enrolled
                        </span>
                    </div>
                </div>

                <div className="mt-4 pt-4 border-t border-gray-200">
                    <h4 className="text-xs font-semibold uppercase text-gray-400 mb-2">Schedule</h4>
                    <div className="space-y-1">
                        {batch.schedule.length > 0 ? (
                            batch.schedule.map((s, index) => (
                                <div key={index} className="flex justify-between text-sm text-gray-600">
                                    <span>{s.day}</span>
                                    <span>{s.time}</span>
                                </div>
                            ))
                        ) : (
                            <p className="text-sm text-gray-500 italic">No schedule set.</p>
                        )}
                    </div>
                </div>
            </div>

            <div className="bg-gray-50 p-3 flex justify-end space-x-3 rounded-b-lg">
                <button 
                    onClick={() => onEdit(batch)}
                    className="text-sm font-medium text-brand-primary hover:text-brand-dark"
                >
                    Edit
                </button>
                <button 
                    onClick={() => onDelete(batch.id)}
                    className="text-sm font-medium text-red-600 hover:text-red-800"
                >
                    Delete
                </button>
            </div>
        </div>
    );
};

export default BatchCard;