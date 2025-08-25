import React, { useState } from 'react';
import type { User } from '../../types';
import { WEEKDAYS, TIME_SLOTS, COURSE_OPTIONS } from '../../constants';
import { TrashIcon } from '../icons';

interface TeacherScheduleManagerProps {
    courseExpertise: (typeof COURSE_OPTIONS[number])[];
    schedules: NonNullable<User['schedules']>;
    onChange: (schedules: NonNullable<User['schedules']>) => void;
}

const ALL_TIMINGS = WEEKDAYS.flatMap(day => TIME_SLOTS.map(slot => `${day} ${slot}`));

const TeacherScheduleManager: React.FC<TeacherScheduleManagerProps> = ({ courseExpertise, schedules, onChange }) => {
    const [newScheduleCourse, setNewScheduleCourse] = useState('');
    const [newScheduleTiming, setNewScheduleTiming] = useState('');

    const handleAddSchedule = () => {
        if (!newScheduleCourse || !newScheduleTiming) {
            alert('Please select both a course and a timing.');
            return;
        }

        const alreadyExists = schedules.some(s => s.course === newScheduleCourse && s.timing === newScheduleTiming);
        if (alreadyExists) {
            alert('This schedule already exists for the teacher.');
            return;
        }

        const newSchedule = { course: newScheduleCourse as any, timing: newScheduleTiming };
        onChange([...schedules, newSchedule]);
        setNewScheduleCourse('');
        setNewScheduleTiming('');
    };
    
    const handleRemoveSchedule = (index: number) => {
        const newSchedules = schedules.filter((_, i) => i !== index);
        onChange(newSchedules);
    };

    const assignedTimings = new Set(schedules.map(s => s.timing));

    return (
        <div className="mt-2 border rounded-md p-4 space-y-4">
            {/* List of existing schedules */}
            <div className="max-h-40 overflow-y-auto space-y-2 pr-2">
                {schedules.length > 0 ? schedules.map((schedule, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded-md">
                        <div>
                            <p className="font-semibold text-sm text-gray-800">{schedule.course}</p>
                            <p className="text-xs text-gray-500">{schedule.timing}</p>
                        </div>
                        <button type="button" onClick={() => handleRemoveSchedule(index)} className="text-red-500 hover:text-red-700">
                            <TrashIcon />
                        </button>
                    </div>
                )) : (
                    <p className="text-sm text-gray-500 text-center py-4">No schedules assigned. Add one below.</p>
                )}
            </div>

            {/* Add new schedule form */}
            <div className="pt-4 border-t border-gray-200">
                <p className="text-sm font-medium text-gray-800 mb-2">Add a new schedule</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
                    <div>
                        <label htmlFor="new-schedule-course" className="block text-xs font-medium text-gray-700">Course</label>
                        <select
                            id="new-schedule-course"
                            value={newScheduleCourse}
                            onChange={(e) => setNewScheduleCourse(e.target.value)}
                            disabled={courseExpertise.length === 0}
                            className="mt-1 block w-full form-select text-sm"
                        >
                            <option value="">Select a course</option>
                            {courseExpertise.map(course => (
                                <option key={course} value={course}>{course}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="new-schedule-timing" className="block text-xs font-medium text-gray-700">Timing</label>
                        <select
                            id="new-schedule-timing"
                            value={newScheduleTiming}
                            onChange={(e) => setNewScheduleTiming(e.target.value)}
                            className="mt-1 block w-full form-select text-sm"
                        >
                            <option value="">Select a time slot</option>
                            {ALL_TIMINGS.map(timing => (
                                <option 
                                    key={timing} 
                                    value={timing}
                                    disabled={assignedTimings.has(timing)}
                                    className="disabled:text-gray-400"
                                >
                                    {timing}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
                 <button 
                    type="button" 
                    onClick={handleAddSchedule}
                    disabled={!newScheduleCourse || !newScheduleTiming}
                    className="w-full mt-4 text-sm bg-brand-primary text-white font-semibold py-2 px-4 rounded-md shadow-sm hover:bg-brand-dark transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                    Add Schedule
                </button>
            </div>
             <style>{`
                .form-select { --tw-ring-color: #3f51b5; border-color: #d1d5db; border-radius: 0.375rem; padding: 0.5rem 0.75rem; box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05); background-color: #fff; }
                .form-select:focus { border-color: #3f51b5; box-shadow: 0 0 0 1px #3f51b5; }
            `}</style>
        </div>
    );
};

export default TeacherScheduleManager;
