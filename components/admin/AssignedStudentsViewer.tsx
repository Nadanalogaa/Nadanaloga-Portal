import React, { useMemo } from 'react';
import type { User } from '../../types';

interface AssignedStudentsViewerProps {
    teacher: User;
    allStudents: User[];
}

const AssignedStudentsViewer: React.FC<AssignedStudentsViewerProps> = ({ teacher, allStudents }) => {
    
    const studentsByBatch = useMemo(() => {
        const result: { [key: string]: string[] } = {};
        
        if (!teacher.schedules || teacher.schedules.length === 0) {
            return result;
        }

        for (const batch of teacher.schedules) {
            const batchKey = `${batch.course} | ${batch.timing}`;
            result[batchKey] = [];

            for (const student of allStudents) {
                if (student.schedules?.some(s => s.course === batch.course && s.timing === batch.timing && s.teacherId === teacher.id)) {
                    result[batchKey].push(student.name);
                }
            }
        }
        return result;

    }, [teacher, allStudents]);

    const teacherSchedules = teacher.schedules || [];

    return (
        <div className="mt-2 border rounded-md p-4 max-h-80 overflow-y-auto space-y-4">
            {teacherSchedules.length > 0 ? (
                teacherSchedules.map((schedule, index) => {
                    const batchKey = `${schedule.course} | ${schedule.timing}`;
                    const assignedStudents = studentsByBatch[batchKey] || [];
                    
                    return (
                        <div key={index} className="p-3 bg-gray-50 rounded-lg">
                            <h4 className="font-semibold text-gray-800 text-sm">{schedule.course}</h4>
                            <p className="text-xs text-gray-500 mb-2">{schedule.timing}</p>
                            {assignedStudents.length > 0 ? (
                                <ul className="list-disc list-inside space-y-1 pl-2">
                                    {assignedStudents.map(name => (
                                        <li key={name} className="text-sm text-gray-700">{name}</li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-sm text-gray-400 italic">No students assigned to this batch.</p>
                            )}
                        </div>
                    );
                })
            ) : (
                 <p className="text-sm text-gray-500 text-center py-4">
                    This teacher has no schedules assigned. Go to "Teaching Schedule" to add one.
                </p>
            )}
        </div>
    );
};

export default AssignedStudentsViewer;
