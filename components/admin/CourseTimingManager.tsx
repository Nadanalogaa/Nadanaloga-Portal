
import React, { useMemo } from 'react';
import type { User } from '../../types';
import { WEEKDAYS, TIME_SLOTS } from '../../constants';

interface CourseTimingManagerProps {
    selectedCourses: string[];
    schedules: NonNullable<User['schedules']>;
    onChange: (schedules: NonNullable<User['schedules']>) => void;
}

const CourseTimingManager: React.FC<CourseTimingManagerProps> = ({ selectedCourses, schedules, onChange }) => {
    
    const allTimings = useMemo(() => WEEKDAYS.flatMap(day => TIME_SLOTS.map(slot => `${day} ${slot}`)), []);

    const handleTimingChange = (course: string, timing: string) => {
        const scheduleIndex = schedules.findIndex(s => s.course === course);
        let newSchedules = [...schedules];

        if (timing) { // if a timing is selected
            if (scheduleIndex > -1) { // if schedule for this course exists, update it
                newSchedules[scheduleIndex] = { ...newSchedules[scheduleIndex], timing };
            } else { // otherwise, add a new schedule entry
                newSchedules.push({ course: course, timing, teacherId: '' });
            }
        } else { // if timing is cleared (value is "")
            if (scheduleIndex > -1) { // remove the schedule for this course
                newSchedules = newSchedules.filter(s => s.course !== course);
            }
        }
        onChange(newSchedules);
    };

    if (selectedCourses.length === 0) {
        return <p className="text-sm text-gray-500 text-center py-4 mt-2">Select courses to assign timings.</p>;
    }

    // Create a map of all currently booked timings and the course booking them.
    const bookedSlots = schedules.reduce((acc, s) => {
        if (s.timing) {
            acc[s.timing] = s.course;
        }
        return acc;
    }, {} as Record<string, string>);

    return (
        <div className="space-y-2 mt-2">
            {selectedCourses.map(course => {
                const currentTiming = schedules.find(s => s.course === course)?.timing;
                
                return (
                    <div key={course} className="grid grid-cols-1 sm:grid-cols-5 gap-x-4 gap-y-2 items-center p-3 bg-gray-50 rounded-lg">
                        <label className="sm:col-span-2 font-medium text-gray-700 text-sm">{course}</label>
                        <div className="sm:col-span-3">
                            <select
                                value={currentTiming || ''}
                                onChange={(e) => handleTimingChange(course, e.target.value)}
                                className="form-select text-sm w-full"
                            >
                                <option value="">Select a time</option>
                                {allTimings.map(timing => {
                                    const bookingCourse = bookedSlots[timing];
                                    const isBookedByOtherCourse = !!(bookingCourse && bookingCourse !== course);
                                    
                                    return (
                                        <option 
                                            key={timing} 
                                            value={timing} 
                                            disabled={isBookedByOtherCourse}
                                            className={isBookedByOtherCourse ? 'text-green-600 font-medium' : ''}
                                        >
                                            {timing}{isBookedByOtherCourse ? ` (Slot Booked for ${bookingCourse})` : ''}
                                        </option>
                                    );
                                })}
                            </select>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default CourseTimingManager;