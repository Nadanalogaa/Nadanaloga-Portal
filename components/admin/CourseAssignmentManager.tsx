import React from 'react';
import { WEEKDAYS, TIME_SLOTS, COURSE_OPTIONS } from '../../constants';
import type { User } from '../../types';

interface CourseAssignmentManagerProps {
    selectedCourses: (typeof COURSE_OPTIONS[number])[];
    schedules: NonNullable<User['schedules']>;
    allTeachers: User[];
    onChange: (schedules: NonNullable<User['schedules']>) => void;
}

const ALL_TIMINGS = WEEKDAYS.flatMap(day => TIME_SLOTS.map(slot => `${day} ${slot}`));

const CourseAssignmentManager: React.FC<CourseAssignmentManagerProps> = ({ selectedCourses, schedules, allTeachers, onChange }) => {

    const handleAssignmentChange = (course: (typeof COURSE_OPTIONS[number]), part: { timing?: string, teacherId?: string }) => {
        const existingSchedule = schedules.find(s => s.course === course) || { course, timing: '' };
        
        // When unsetting a value, need to check what the other value is to decide whether to remove the object.
        let updatedSchedule = { ...existingSchedule, ...part };

        const otherSchedules = schedules.filter(s => s.course !== course);

        // If a dropdown is set to "", handle un-assignment
        if (part.timing === "") {
            delete updatedSchedule.timing;
        }
        if (part.teacherId === "") {
             delete updatedSchedule.teacherId;
        }
        
        // If the schedule object is now empty besides the course name, remove it
        if (!updatedSchedule.timing && !updatedSchedule.teacherId) {
             onChange(otherSchedules);
             return;
        }
        
        onChange([...otherSchedules, updatedSchedule]);
    };

    const assignedTimings = new Set(schedules.map(s => s.timing));

    return (
        <div className="mt-2 border rounded-md p-4 space-y-4 max-h-[40vh] overflow-y-auto">
            {selectedCourses.map(course => {
                const currentSchedule = schedules.find(s => s.course === course);
                const currentTiming = currentSchedule?.timing || '';
                const currentTeacherId = currentSchedule?.teacherId || '';

                const availableTeachers = allTeachers.filter(teacher => teacher.courseExpertise?.includes(course));

                return (
                    <div key={course} className="p-4 bg-gray-50 rounded-lg">
                         <p className="font-semibold text-gray-800 mb-3">{course}</p>
                         <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label htmlFor={`teacher-${course}`} className="block text-sm font-medium text-gray-700">
                                    Assign Teacher
                                </label>
                                <select
                                    id={`teacher-${course}`}
                                    value={currentTeacherId}
                                    onChange={(e) => handleAssignmentChange(course, { teacherId: e.target.value })}
                                    className="mt-1 block w-full form-select"
                                >
                                    <option value="">Select a teacher</option>
                                    {availableTeachers.map(teacher => (
                                        <option key={teacher.id} value={teacher.id}>
                                            {teacher.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                             <div>
                                <label htmlFor={`timing-${course}`} className="block text-sm font-medium text-gray-700">
                                    Assign Batch Timing
                                </label>
                                <select
                                    id={`timing-${course}`}
                                    value={currentTiming}
                                    onChange={(e) => handleAssignmentChange(course, { timing: e.target.value })}
                                    className="mt-1 block w-full form-select"
                                >
                                    <option value="">Select a time slot</option>
                                    {ALL_TIMINGS.map(timing => (
                                        <option 
                                            key={timing} 
                                            value={timing}
                                            disabled={assignedTimings.has(timing) && currentTiming !== timing}
                                            className="disabled:text-gray-400"
                                        >
                                            {timing}
                                        </option>
                                    ))}
                                </select>
                             </div>
                         </div>
                    </div>
                );
            })}
            {selectedCourses.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-4">
                    Select one or more courses to assign teachers and timings.
                </p>
            )}
        </div>
    );
};

export default CourseAssignmentManager;
