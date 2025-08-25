import React, { useMemo, useState } from 'react';
import Modal from '../Modal';
import ModalHeader from '../ModalHeader';
import type { Batch, User } from '../../types';
import { WEEKDAYS } from '../../constants';
import { ChevronDownIcon, UsersIcon } from '../icons';

interface ViewBatchModalProps {
    isOpen: boolean;
    onClose: () => void;
    batch: Batch | null;
    usersMap: Map<string, User>;
}

const ViewBatchModal: React.FC<ViewBatchModalProps> = ({ isOpen, onClose, batch, usersMap }) => {
    const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set(WEEKDAYS));
    
    const toggleDay = (day: string) => {
        setExpandedDays(prev => {
            const newSet = new Set(prev);
            if (newSet.has(day)) {
                newSet.delete(day);
            } else {
                newSet.add(day);
            }
            return newSet;
        });
    };
    
    const teacherId = batch?.teacherId ? (typeof batch.teacherId === 'string' ? batch.teacherId : (batch.teacherId as User)?.id) : undefined;
    const teacher = teacherId ? usersMap.get(teacherId) : null;
    
    const scheduleByDay = useMemo(() => {
        if (!batch?.schedule) return {};
        return batch.schedule.reduce((acc, scheduleItem) => {
            const time = scheduleItem.timing;
            const day = WEEKDAYS.find(d => time.startsWith(d));
            if (day) {
                if (!acc[day]) acc[day] = [];
                acc[day].push(time);
                acc[day].sort(); // Sort times within the day
            }
            return acc;
        }, {} as Record<string, string[]>);
    }, [batch?.schedule]);
    
    const studentsByTime = useMemo(() => {
        if (!batch?.schedule) return new Map<string, User[]>();
        const map = new Map<string, User[]>();
        batch.schedule.forEach(scheduleItem => {
            const students = scheduleItem.studentIds
                .map(id => usersMap.get(id))
                .filter((u): u is User => !!u);
            map.set(scheduleItem.timing, students);
        });
        return map;
    }, [batch?.schedule, usersMap]);


    if (!batch) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} size="full">
            <div className="flex flex-col h-full">
                <ModalHeader 
                    title={batch.name}
                    subtitle={batch.description}
                />
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6 pb-6 border-b border-gray-200">
                    <div>
                        <h3 className="form-label text-base">Course</h3>
                        <p className="text-gray-800 text-lg font-medium">{batch.courseName}</p>
                    </div>
                    <div>
                        <h3 className="form-label text-base">Teacher</h3>
                        <p className="text-gray-800 text-lg font-medium">{teacher ? teacher.name : <span className="text-gray-400 italic">Not Assigned</span>}</p>
                    </div>
                </div>

                <div className="flex-grow overflow-y-auto -mx-6 px-6">
                    <h2 className="text-xl font-semibold text-gray-800 mb-4">Schedule & Roster</h2>
                    
                    {Object.keys(scheduleByDay).length > 0 ? (
                        <div className="space-y-3">
                            {Object.entries(scheduleByDay).map(([day, times]) => {
                                const isExpanded = expandedDays.has(day);
                                const totalStudentsForDay = new Set(times.flatMap(time => (studentsByTime.get(time) || []).map(s => s.id))).size;
                                
                                return (
                                    <div key={day} className="bg-white rounded-lg shadow-sm border border-gray-200/80 transition-shadow hover:shadow-md">
                                        <button
                                            type="button"
                                            onClick={() => toggleDay(day)}
                                            className="w-full flex justify-between items-center p-4 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary rounded-t-lg"
                                            aria-expanded={isExpanded}
                                        >
                                            <div className="flex items-center space-x-3">
                                                <ChevronDownIcon className={`h-5 w-5 text-gray-400 transition-transform duration-200 ${isExpanded ? 'rotate-0' : '-rotate-90'}`} />
                                                <h3 className="text-lg font-semibold text-brand-primary">{day}</h3>
                                            </div>
                                            <div className="flex items-center space-x-2 text-sm font-medium text-gray-600">
                                                <UsersIcon className="h-5 w-5" />
                                                <span>{totalStudentsForDay} Student{totalStudentsForDay !== 1 ? 's' : ''}</span>
                                            </div>
                                        </button>
                                        
                                        {isExpanded && (
                                            <div className="px-4 pb-4 border-t border-gray-200">
                                                <div className="divide-y divide-gray-100">
                                                    {times.map(time => {
                                                        const studentsForTime = studentsByTime.get(time) || [];
                                                        return (
                                                            <div key={time} className="py-4">
                                                                <h4 className="font-semibold text-gray-800 mb-3">{time.replace(day, '').trim()} ({studentsForTime.length} students)</h4>
                                                                {studentsForTime.length > 0 ? (
                                                                    <div className="flex flex-wrap gap-2">
                                                                        {studentsForTime.map(student => (
                                                                            <div key={student.id} className="bg-brand-light text-brand-dark text-xs font-medium px-2.5 py-1 rounded-full">
                                                                                {student.name}
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                ) : (
                                                                    <p className="text-sm text-gray-400 italic">No students assigned to this slot.</p>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="text-center py-12 bg-white rounded-lg border border-dashed">
                             <h3 className="text-lg font-semibold text-gray-600">No Schedule Set</h3>
                             <p className="text-sm text-gray-500 mt-1">This batch has not been scheduled for any time slots.</p>
                        </div>
                    )}
                </div>

                 <div className="flex-shrink-0 flex justify-end pt-4 mt-auto border-t border-gray-200">
                    <button type="button" onClick={onClose} className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50">Close</button>
                </div>
            </div>
        </Modal>
    );
}

export default ViewBatchModal;