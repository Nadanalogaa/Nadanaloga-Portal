
import React from 'react';
import type { User } from '../../types';

interface StudentCardProps {
    student: User;
}

const InfoItem: React.FC<{ label: string; value?: string | null | React.ReactNode; className?: string }> = ({ label, value, className = '' }) => {
    if (!value && typeof value !== 'number') return null;
    return (
        <div className={className}>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">{label}</p>
            <p className="text-sm text-gray-800">{value}</p>
        </div>
    );
};

const StudentCard: React.FC<StudentCardProps> = ({ student }) => {

    const formatSchedules = () => {
        if (!student.schedules || student.schedules.length === 0) {
            return <span className="text-sm text-gray-400">Not assigned</span>;
        }
        
        return student.schedules.map(schedule => (
            <div key={`${schedule.course}-${schedule.timing}`} className="text-sm text-gray-800">
                <span className="font-semibold">{schedule.course}:</span> {schedule.timing}
            </div>
        ));
    };

    return (
        <div className="bg-white rounded-xl shadow-lg overflow-hidden transition-shadow hover:shadow-xl flex flex-col sm:flex-row">
            <div className="sm:w-1/3 flex-shrink-0">
                <img
                    src={student.photoUrl || `https://ui-avatars.com/api/?name=${student.name}&background=e8eaf6&color=1a237e&size=256&bold=true`}
                    alt={`${student.name}'s profile photo`}
                    className="w-full h-48 sm:h-full object-cover"
                />
            </div>
            <div className="p-6 flex-grow">
                <h3 className="text-xl font-bold text-brand-primary">{student.name}</h3>
                <p className="text-xs text-gray-400 font-mono mb-4">ID: {student.id.slice(-8).toUpperCase()}</p>
                
                <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                    <InfoItem label="Grade" value={student.grade} />
                    <InfoItem label="Date of Joining" value={student.dateOfJoining ? new Date(student.dateOfJoining).toLocaleDateString() : 'N/A'} />
                    <InfoItem label="Courses" value={student.courses?.join(', ') || 'N/A'} className="col-span-2" />
                </div>

                <div className="mt-4 pt-4 border-t border-gray-200">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Batch Timings</p>
                    <div className="mt-1 space-y-1">
                        {formatSchedules()}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StudentCard;
