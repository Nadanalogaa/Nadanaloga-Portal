
import React, { useState, useEffect, useRef, useMemo } from 'react';
import Modal from '../Modal';
import ModalHeader from '../ModalHeader';
import type { Batch, Course, User, BatchSchedule, Location } from '../../types';
import { UserRole, ClassPreference } from '../../types';
import { WEEKDAYS, TIME_SLOTS, WEEKDAY_MAP } from '../../constants';
import { XCircleIcon } from '../icons';
import { getLocations } from '../../api';


interface UnifiedStudentPickerProps {
    students: User[];
    selectedStudentIds: string[];
    onSelectionChange: (ids: string[]) => void;
    selectedBatchTimings: string[];
    allBatches: Batch[];
    allUsers: User[];
    currentBatchId?: string;
}

const UnifiedStudentPicker: React.FC<UnifiedStudentPickerProps> = ({ students, selectedStudentIds, onSelectionChange, selectedBatchTimings, allBatches, allUsers, currentBatchId }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const wrapperRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const getStudentFullSchedule = (studentId: string): Set<string> => {
        const schedule = new Set<string>();
        allBatches.forEach(b => {
            if(b.id !== currentBatchId) {
                b.schedule.forEach(s => {
                    if (s.studentIds.includes(studentId)) {
                        schedule.add(s.timing);
                    }
                });
            }
        });
        return schedule;
    };
    
    const isStudentAvailable = (studentId: string): boolean => {
        if (!selectedBatchTimings || selectedBatchTimings.length === 0) return true;
        const studentSchedule = getStudentFullSchedule(studentId);
        return !selectedBatchTimings.some(time => studentSchedule.has(time));
    };

    const filteredStudents = useMemo(() => {
        return students.filter(s => s.name.toLowerCase().includes(search.toLowerCase()));
    }, [students, search]);

    return (
        <div className="relative" ref={wrapperRef}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="form-select w-full text-left flex justify-between items-center"
            >
                <span>{selectedStudentIds.length} student(s) selected</span>
                 <svg className="w-5 h-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
            </button>
            {isOpen && (
                <div className="absolute z-20 w-full mt-1 bg-white rounded-md shadow-lg border border-gray-200">
                    <div className="p-2 border-b">
                        <input type="text" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="form-input w-full text-sm" />
                    </div>
                    <ul className="py-1 max-h-48 overflow-y-auto">
                        {filteredStudents.map(student => {
                             const isAvailable = isStudentAvailable(student.id);
                             return (
                                <li key={student.id}>
                                    <label className={`flex items-center w-full px-4 py-2 text-sm text-gray-700 ${isAvailable ? 'hover:bg-gray-100 cursor-pointer' : 'opacity-50 cursor-not-allowed'}`}>
                                        <input
                                            type="checkbox"
                                            disabled={!isAvailable}
                                            checked={selectedStudentIds.includes(student.id)}
                                            onChange={e => {
                                                const newSelection = new Set(selectedStudentIds);
                                                if (e.target.checked) newSelection.add(student.id); else newSelection.delete(student.id);
                                                onSelectionChange(Array.from(newSelection));
                                            }}
                                            className="h-4 w-4 text-brand-primary focus:ring-brand-primary border-gray-300 rounded mr-3"
                                        />
                                        <span>{student.name}</span>
                                        {!isAvailable && <span className="text-xs text-red-500 ml-auto">(Conflict)</span>}
                                    </label>
                                </li>
                            );
                        })}
                    </ul>
                </div>
            )}
        </div>
    );
}


interface EditBatchModalProps {
    isOpen: boolean;
    onClose: () => void;
    batch: Partial<Batch> | null;
    courses: Course[];
    users: User[];
    allBatches: Batch[];
    onSave: (batchData: Partial<Batch>) => void;
}


const EditBatchModal: React.FC<EditBatchModalProps> = ({ isOpen, onClose, batch, courses, users, allBatches, onSave }) => {
    const [formData, setFormData] = useState<Partial<Omit<Batch, 'teacherId' | 'mode'>> & { teacherId?: string; mode?: ClassPreference.Online | ClassPreference.Offline; }>({});
    const [isLoading, setIsLoading] = useState(false);
    const [selectedDays, setSelectedDays] = useState<Set<string>>(new Set());
    const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
    const [locations, setLocations] = useState<Location[]>([]);

    useEffect(() => {
        if (isOpen) {
            getLocations().then(setLocations).catch(console.error);
        }
    }, [isOpen]);


    useEffect(() => {
        if (batch) {
            const initialSchedule = batch.schedule || [];
            const initialDays = new Set<string>();
            const studentIdSet = new Set<string>();

            initialSchedule.forEach(item => {
                const dayKey = Object.keys(WEEKDAY_MAP).find(key => item.timing.startsWith(WEEKDAY_MAP[key as keyof typeof WEEKDAY_MAP]));
                if (dayKey) {
                    initialDays.add(dayKey);
                }
                item.studentIds.forEach(id => studentIdSet.add(id));
            });
            
            setSelectedDays(initialDays);
            setSelectedStudentIds(Array.from(studentIdSet));

            const teacherIdString = (typeof batch.teacherId === 'object' && batch.teacherId) ? (batch.teacherId as Partial<User>).id || '' : (batch.teacherId as string || '');

            setFormData({
                id: batch.id,
                name: batch.name || '',
                description: batch.description || '',
                courseId: batch.courseId || '',
                courseName: batch.courseName || '',
                teacherId: teacherIdString,
                schedule: batch.schedule ? JSON.parse(JSON.stringify(batch.schedule)) : [],
                mode: batch.mode,
                locationId: batch.locationId,
            });
        }
    }, [batch]);
    
    const teachers = useMemo(() => users.filter(u => u.role === UserRole.Teacher), [users]);
    const students = useMemo(() => users.filter(u => u.role === UserRole.Student), [users]);
    const studentsForCourse = useMemo(() => students.filter(s => (s.courses || []).includes(formData.courseName || '')), [students, formData.courseName]);

    const handleCourseChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const courseId = e.target.value;
        const course = courses.find(c => c.id === courseId);
        if (course) {
            setFormData(prev => ({
                ...prev,
                courseId: course.id,
                courseName: course.name,
                teacherId: '',
                schedule: [],
            }));
            setSelectedDays(new Set());
            setSelectedStudentIds([]);
        }
    };
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        const newFormData = { ...formData, [name]: value };
        if (name === 'mode' && value === ClassPreference.Online) {
            delete newFormData.locationId;
        }
        setFormData(newFormData);
    };
    
    const handleDayToggle = (dayKey: string) => {
        const newDays = new Set(selectedDays);
        if (newDays.has(dayKey)) {
            newDays.delete(dayKey);
            // Also remove timings for this day from schedule
            const dayName = WEEKDAY_MAP[dayKey as keyof typeof WEEKDAY_MAP];
            setFormData(prev => ({
                ...prev,
                schedule: (prev.schedule || []).filter(s => !s.timing.startsWith(dayName))
            }));
        } else {
            newDays.add(dayKey);
        }
        setSelectedDays(newDays);
    };

    const handleTimingChange = (fullTiming: string, isChecked: boolean) => {
        setFormData(prev => {
            let newSchedule = [...(prev.schedule || [])];
            if (isChecked) {
                if (!newSchedule.some(s => s.timing === fullTiming)) {
                    newSchedule.push({ timing: fullTiming, studentIds: [] });
                }
            } else {
                newSchedule = newSchedule.filter(s => s.timing !== fullTiming);
            }
            return { ...prev, schedule: newSchedule };
        });
    };

    const handleStudentSelectionChange = (ids: string[]) => {
        setSelectedStudentIds(ids);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        const dataToSave: Partial<Batch> = {
            ...formData,
            schedule: (formData.schedule || [])
                .filter(s => s.timing)
                .map(s => ({
                    timing: s.timing,
                    studentIds: selectedStudentIds,
                })),
        };

        if (!dataToSave.teacherId) {
            delete dataToSave.teacherId;
        }

        await onSave(dataToSave);
        setIsLoading(false);
    };

    const getTeacherFullSchedule = (teacherId: string | undefined): Set<string> => {
        if (!teacherId) return new Set();
        const schedule = new Set<string>();
        allBatches.forEach(b => {
            const batchTeacherId = typeof b.teacherId === 'string' ? b.teacherId : (b.teacherId as User)?.id;
            // Check other batches assigned to this teacher
            if (batchTeacherId === teacherId && b.id !== formData.id) {
                (b.schedule || []).forEach(s => schedule.add(s.timing));
            }
        });
        return schedule;
    };
    
    const teacherSchedule = useMemo(() => getTeacherFullSchedule(formData.teacherId), [formData.teacherId, allBatches, formData.id]);
    
    if (!batch) return null;

    const availableTeachers = teachers.filter(t => t.courseExpertise?.includes(formData.courseName || ''));
    const sortedSelectedDays = Array.from(selectedDays).sort((a,b) => Object.keys(WEEKDAY_MAP).indexOf(a) - Object.keys(WEEKDAY_MAP).indexOf(b));

    return (
        <Modal isOpen={isOpen} onClose={onClose} size="full">
            <div className="flex flex-col h-full">
                <ModalHeader 
                    title={batch.id ? 'Edit Batch' : 'Create New Batch'}
                    subtitle="Define batch details, schedule, and members."
                />
                <form onSubmit={handleSubmit} className="flex-grow flex flex-col min-h-0">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
                        <div>
                            <label className="form-label">Course</label>
                            <select name="courseId" value={formData.courseId || ''} onChange={handleCourseChange} required className="form-select w-full">
                                <option value="" disabled>Select a course</option>
                                {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label htmlFor="name" className="form-label">Batch Name</label>
                            <input id="name" name="name" type="text" value={formData.name || ''} onChange={handleChange} required className="form-input w-full" />
                        </div>
                        <div>
                            <label htmlFor="mode" className="form-label">Batch Mode</label>
                            <select id="mode" name="mode" value={formData.mode || ''} onChange={handleChange} required className="form-select w-full">
                                <option value="" disabled>Select mode</option>
                                <option value={ClassPreference.Online}>Online</option>
                                <option value={ClassPreference.Offline}>Offline</option>
                            </select>
                        </div>
                         <div>
                            <label htmlFor="teacherId" className="form-label">Teacher</label>
                            <select id="teacherId" name="teacherId" value={formData.teacherId || ''} onChange={handleChange} disabled={!formData.courseId} className="form-select w-full">
                                <option value="">{formData.courseId ? "Select a teacher" : "Select course first"}</option>
                                {availableTeachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                            </select>
                        </div>
                        {formData.mode === ClassPreference.Offline && (
                            <div>
                                <label className="form-label">Location</label>
                                <select name="locationId" value={formData.locationId || ''} onChange={handleChange} required className="form-select w-full">
                                    <option value="" disabled>Select a location</option>
                                    {locations.map(loc => <option key={loc.id} value={loc.id}>{loc.name}</option>)}
                                </select>
                            </div>
                        )}
                        <div className="lg:col-span-3">
                            <label htmlFor="description" className="form-label">Description</label>
                            <textarea id="description" name="description" value={formData.description || ''} onChange={handleChange} rows={2} className="form-textarea w-full" />
                        </div>
                    </div>

                    <div className="flex-grow grid grid-cols-1 lg:grid-cols-2 gap-8 overflow-y-auto -mx-4 px-4 pb-4 border-t pt-4">
                        {/* Left: Schedule Selection */}
                        <div className="flex flex-col min-h-0">
                             <h3 className="form-label text-base mb-2">Schedule Selection</h3>
                             <div className="flex rounded-md shadow-sm mb-4">
                                {Object.keys(WEEKDAY_MAP).map((dayKey) => (
                                    <button
                                        type="button"
                                        key={dayKey}
                                        onClick={() => handleDayToggle(dayKey)}
                                        className={`flex-1 px-3 py-2 text-sm font-medium border border-gray-300 -ml-px first:ml-0 first:rounded-l-md last:rounded-r-md focus:z-10 focus:outline-none focus:ring-1 focus:ring-brand-primary transition-colors ${
                                            selectedDays.has(dayKey) ? 'bg-brand-primary text-white border-brand-primary' : 'bg-white text-gray-700 hover:bg-gray-50'
                                        }`}
                                    >
                                        {dayKey}
                                    </button>
                                ))}
                            </div>
                            <div className="flex-grow overflow-y-auto space-y-4 pr-2">
                               {sortedSelectedDays.length > 0 ? sortedSelectedDays.map(dayKey => (
                                    <div key={dayKey} className="p-3 bg-gray-50/80 rounded-lg">
                                        <h4 className="font-semibold text-gray-800 mb-2">{WEEKDAY_MAP[dayKey as keyof typeof WEEKDAY_MAP]}</h4>
                                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                            {TIME_SLOTS.map(timeSlot => {
                                                const fullTiming = `${WEEKDAY_MAP[dayKey as keyof typeof WEEKDAY_MAP]} ${timeSlot}`;
                                                const isChecked = (formData.schedule || []).some(s => s.timing === fullTiming);
                                                const isTeacherBusy = teacherSchedule.has(fullTiming);
                                                
                                                return (
                                                    <label key={fullTiming} className={`flex items-center space-x-2 text-sm p-1.5 rounded-md ${isTeacherBusy ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}>
                                                        <input
                                                            type="checkbox"
                                                            disabled={isTeacherBusy}
                                                            checked={isChecked}
                                                            onChange={(e) => handleTimingChange(fullTiming, e.target.checked)}
                                                            className="h-4 w-4 text-brand-primary focus:ring-brand-primary border-gray-300 rounded"
                                                        />
                                                        <span>{timeSlot} {isTeacherBusy ? '(Busy)' : ''}</span>
                                                    </label>
                                                )
                                            })}
                                        </div>
                                    </div>
                               )) : (
                                    <div className="text-center text-sm text-gray-500 py-10 border-2 border-dashed rounded-lg">
                                        <p>Select days to set time slots.</p>
                                    </div>
                               )}
                            </div>
                        </div>

                        {/* Right: Student Roster */}
                        <div className="flex flex-col">
                            <h3 className="form-label text-base mb-2">Student Roster</h3>
                             <UnifiedStudentPicker
                                students={studentsForCourse}
                                selectedStudentIds={selectedStudentIds}
                                onSelectionChange={handleStudentSelectionChange}
                                selectedBatchTimings={(formData.schedule || []).map(s => s.timing)}
                                allBatches={allBatches}
                                allUsers={users}
                                currentBatchId={formData.id}
                            />
                             <div className="flex-grow overflow-y-auto mt-4 border rounded-lg bg-white p-3">
                                <h4 className="text-sm font-semibold text-gray-600 mb-2">Selected Students ({selectedStudentIds.length}):</h4>
                                {selectedStudentIds.length > 0 ? (
                                    <ul className="space-y-1">
                                        {selectedStudentIds.map(id => {
                                            const student = users.find(u => u.id === id);
                                            return student ? (
                                                <li key={id} className="flex justify-between items-center text-sm p-1.5 bg-gray-50 rounded">
                                                    <span>{student.name}</span>
                                                    <button type="button" onClick={() => handleStudentSelectionChange(selectedStudentIds.filter(sid => sid !== id))} className="text-red-400 hover:text-red-600">
                                                        <XCircleIcon />
                                                    </button>
                                                </li>
                                            ) : null
                                        })}
                                    </ul>
                                ) : (
                                    <p className="text-sm text-gray-500 text-center py-4">No students selected.</p>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="flex-shrink-0 flex justify-end pt-4 mt-auto border-t border-gray-200">
                        <button type="button" onClick={onClose} disabled={isLoading} className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
                        <button type="submit" disabled={isLoading} className="ml-3 inline-flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-brand-primary hover:bg-brand-dark disabled:bg-indigo-300">
                            {isLoading ? 'Saving...' : 'Save Batch'}
                        </button>
                    </div>
                </form>
            </div>
        </Modal>
    );
};

export default EditBatchModal;
