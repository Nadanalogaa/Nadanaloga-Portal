
import React, { useState, useMemo, useEffect } from 'react';
import type { User, Course } from '../../types';
import { UserRole } from '../../types';
import { WEEKDAYS, TIME_SLOTS } from '../../constants';

// The type for changes made within this component session.
// Maps studentId to a record of changes per course.
type PendingChanges = Map<string, Record<string, { newTeacherId?: string | null; newTiming?: string }>>;

interface StudentAssignmentManagerProps {
    teacher: User;
    allUsers: User[];
    courses: Course[];
    onAssignmentsChange: (changes: PendingChanges) => void;
}

// A row represents a single student-course pairing relevant to the current teacher.
interface AssignmentRow {
    student: User;
    course: string;
}

const ALL_TIMINGS = WEEKDAYS.flatMap(day => TIME_SLOTS.map(slot => `${day} ${slot}`));

const StudentAssignmentManager: React.FC<StudentAssignmentManagerProps> = ({ teacher, allUsers, courses, onAssignmentsChange }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [pendingChanges, setPendingChanges] = useState<PendingChanges>(new Map());

    useEffect(() => {
        setPendingChanges(new Map());
    }, [teacher.id]);

    const students = useMemo(() => allUsers.filter(u => u.role === UserRole.Student), [allUsers]);
    const teachers = useMemo(() => allUsers.filter(u => u.role === UserRole.Teacher), [allUsers]);

    const assignmentRows: AssignmentRow[] = useMemo(() => {
        const rows: AssignmentRow[] = [];
        const teacherCourses = teacher.courseExpertise || [];

        for (const student of students) {
            for (const course of teacherCourses) {
                if (student.courses?.includes(course)) {
                    rows.push({ student, course });
                }
            }
        }
        return rows;
    }, [students, teacher.courseExpertise]);
    
    const filteredRows = useMemo(() => {
        if (!searchQuery) return assignmentRows;
        return assignmentRows.filter(row => row.student.name.toLowerCase().includes(searchQuery.toLowerCase()));
    }, [assignmentRows, searchQuery]);
    
    // Gets the most up-to-date data for a student's schedule for a specific course
    const getEffectiveSchedule = (studentId: string, course: string): { timing?: string; teacherId?: string | null } => {
        const student = allUsers.find(u => u.id === studentId);
        const originalSchedule = student?.schedules?.find(s => s.course === course);
        const pending = pendingChanges.get(studentId)?.[course];

        return {
            timing: pending?.newTiming !== undefined ? pending.newTiming : originalSchedule?.timing,
            teacherId: pending?.newTeacherId !== undefined ? pending.newTeacherId : (originalSchedule?.teacherId ?? null)
        };
    };

    // Gets all time slots booked by a student across all their courses
    const getStudentBookedSlots = (studentId: string): Record<string, string> => {
        const student = allUsers.find(u => u.id === studentId);
        if (!student) return {};
        
        const booked: Record<string, string> = {};
        (student.courses || []).forEach(course => {
            const { timing } = getEffectiveSchedule(studentId, course);
            if (timing) {
                booked[timing] = course;
            }
        });
        return booked;
    };

    const handleAssignmentChange = (student: User, course: string, newTeacherId: string | null) => {
        const isAssigning = newTeacherId !== null;
        const confirmMessage = isAssigning
            ? `Are you sure you want to assign ${student.name} (${course}) to ${teacher.name}?`
            : `Are you sure you want to unassign ${student.name} (${course}) from ${teacher.name}?`;
        
        if (window.confirm(confirmMessage)) {
            const newChanges = new Map(pendingChanges);
            const studentChanges = newChanges.get(student.id) || {};
            const courseChange = studentChanges[course] || {};
            
            courseChange.newTeacherId = newTeacherId;

            studentChanges[course] = courseChange;
            newChanges.set(student.id, studentChanges);
            
            setPendingChanges(newChanges);
            onAssignmentsChange(newChanges);
        }
    };
    
    const handleTimingChange = (student: User, course: string, newTiming: string) => {
        const { teacherId: currentTeacherId } = getEffectiveSchedule(student.id, course);
        const confirmMessage = newTiming
            ? `Are you sure you want to change the timing for ${student.name}'s ${course} class to ${newTiming}? This may affect their assigned teacher if there is a schedule conflict.`
            : `Are you sure you want to remove the timing for ${student.name}'s ${course} class? This will also unassign their teacher.`;
        
        if (window.confirm(confirmMessage)) {
            const newChanges = new Map(pendingChanges);
            const studentChanges = newChanges.get(student.id) || {};
            const courseChange = studentChanges[course] || {};

            courseChange.newTiming = newTiming;

            // If timing is changed AND there was a teacher assigned...
            if (newTiming && currentTeacherId) {
                // Check if this teacher has another student booked at the new time.
                const isConflict = allUsers.some(otherStudent => 
                    otherStudent.id !== student.id && // Must be a different student
                    otherStudent.role === UserRole.Student &&
                    (otherStudent.courses || []).some(otherCourse => {
                        const schedule = getEffectiveSchedule(otherStudent.id, otherCourse);
                        return schedule.teacherId === currentTeacherId && schedule.timing === newTiming;
                    })
                );

                if (isConflict) {
                    // Conflict found, so unassign the current teacher from this student.
                    courseChange.newTeacherId = null;
                }
            }
            
            // When timing is removed, teacher should also be unassigned
            if (!newTiming) {
                courseChange.newTeacherId = null;
            }

            studentChanges[course] = courseChange;
            newChanges.set(student.id, studentChanges);

            setPendingChanges(newChanges);
            onAssignmentsChange(newChanges);
        }
    }

    const getTeacherSchedule = (teacherId: string): Set<string> => {
        const schedule = new Set<string>();
        allUsers.forEach(user => {
            if (user.role === UserRole.Student && user.courses) {
                user.courses.forEach(course => {
                    const { timing, teacherId: effectiveTeacherId } = getEffectiveSchedule(user.id, course);
                    if (timing && effectiveTeacherId === teacherId) {
                        schedule.add(timing);
                    }
                });
            }
        });
        return schedule;
    };

    return (
        <div className="bg-white p-6 rounded-lg shadow-sm">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Student Assignments & Timings</h3>
            <p className="text-sm text-gray-500 mb-4">
                Assign students or adjust their batch timings. An assignment is only possible if the student has a time slot that does not conflict with your existing schedule.
            </p>
            <input
                type="text"
                placeholder="Filter students by name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full form-input mb-6"
            />
             <div className="border rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student</th>
                                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Course</th>
                                <th scope="col" className="w-1/4 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Batch Timing</th>
                                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Assigned Teacher</th>
                                <th scope="col" className="relative px-4 py-3"><span className="sr-only">Actions</span></th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                           {filteredRows.length > 0 ? filteredRows.map(({ student, course }) => {
                                const { timing: studentTiming, teacherId: currentTeacherId } = getEffectiveSchedule(student.id, course);
                                const currentTeacher = teachers.find(t => t.id === currentTeacherId);
                                const studentBookedSlots = getStudentBookedSlots(student.id);

                                const isThisTeacherAssigned = currentTeacherId === teacher.id;
                                const teacherSchedule = getTeacherSchedule(teacher.id);
                                const hasConflict = studentTiming ? teacherSchedule.has(studentTiming) && !isThisTeacherAssigned : false;

                                let actionButton;
                                if (isThisTeacherAssigned) {
                                    actionButton = (
                                        <button type="button" onClick={() => handleAssignmentChange(student, course, null)} className="btn-assign bg-red-100 text-red-700 hover:bg-red-200">Unassign</button>
                                    );
                                } else {
                                    actionButton = (
                                         <button type="button" onClick={() => handleAssignmentChange(student, course, teacher.id)} disabled={!studentTiming || hasConflict} className="btn-assign bg-green-100 text-green-700 hover:bg-green-200 disabled:bg-gray-200 disabled:text-gray-500 disabled:cursor-not-allowed">
                                            {hasConflict ? 'Time Conflict' : 'Assign to Me'}
                                        </button>
                                    );
                                }
                                
                                return (
                                    <tr key={`${student.id}-${course}`} className="hover:bg-gray-50">
                                        <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900">{student.name}</td>
                                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">{course}</td>
                                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                                            <select
                                                value={studentTiming || ''}
                                                onChange={(e) => handleTimingChange(student, course, e.target.value)}
                                                className="form-select text-sm w-full py-1"
                                            >
                                                <option value="">Select a time</option>
                                                {ALL_TIMINGS.map(timing => {
                                                    const bookingCourse = studentBookedSlots[timing];
                                                    const isBookedByOtherCourse = !!(bookingCourse && bookingCourse !== course);
                                                    return (
                                                        <option key={timing} value={timing} disabled={isBookedByOtherCourse}>
                                                            {timing}{isBookedByOtherCourse ? ` (Booked for ${bookingCourse})` : ''}
                                                        </option>
                                                    );
                                                })}
                                            </select>
                                        </td>
                                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500 truncate">{currentTeacher?.name || <span className="text-gray-400 italic">None</span>}</td>
                                        <td className="px-4 py-2 whitespace-nowrap text-right text-sm font-medium">
                                            {actionButton}
                                        </td>
                                    </tr>
                                );
                           }) : (
                             <tr>
                                <td colSpan={5} className="px-6 py-8 text-center text-sm text-gray-500">
                                    No students match the criteria or filter.
                                </td>
                            </tr>
                           )}
                        </tbody>
                    </table>
                </div>
            </div>
            {(teacher.courseExpertise || []).length === 0 && (
                <p className="text-center text-gray-500 py-8">This teacher has no course expertise set. Please set expertise in the "Schedule & Courses" tab first.</p>
            )}
        </div>
    );
};

export default StudentAssignmentManager;