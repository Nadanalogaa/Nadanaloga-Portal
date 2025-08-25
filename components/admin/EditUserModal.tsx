
import React, { useState, useEffect, useMemo } from 'react';
import type { User, Document, Course, Batch } from '../../types';
import { UserRole, ClassPreference, Sex, EmploymentType, Grade, UserStatus } from '../../types';
import { GRADES } from '../../constants';
import { getAdminUsers, getCourses, getBatches as getAdminBatches } from '../../api';
import Modal from '../Modal';
import DocumentManager from './DocumentManager';
import TabButton from './TabButton';
import StudentAssignmentManager from './StudentAssignmentManager';
import ModalHeader from '../ModalHeader';
import QuickBatchCreateModal from './QuickBatchCreateModal';

type BatchChange = { oldBatchId?: string; newBatchId: string };
type BatchChangeMap = Map<string, BatchChange>;
type TimingSelectionMap = Map<string, Set<string>>;

interface EditUserModalProps {
    isOpen: boolean;
    onClose: () => void;
    user: User | null;
    onSave: (users: User[]) => void;
    onStudentSave?: (payload: { user: User, batchChanges: Map<string, BatchChange & { selectedTimings?: Set<string> }>, allBatches: Batch[] }) => Promise<void> | void;
}

const EditUserModal: React.FC<EditUserModalProps> = ({ isOpen, onClose, user, onSave, onStudentSave }) => {
    const [formData, setFormData] = useState<Partial<User>>({});
    const [isLoading, setIsLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<'personal' | 'schedule' | 'assignments'>('personal');
    const [allUsers, setAllUsers] = useState<User[]>([]);
    const [courses, setCourses] = useState<Course[]>([]);
    const [allBatches, setAllBatches] = useState<Batch[]>([]);
    const [isQuickCreateOpen, setIsQuickCreateOpen] = useState(false);
    const [courseForQuickCreate, setCourseForQuickCreate] = useState<Course | null>(null);
    const [preferredTimingsForQuickCreate, setPreferredTimingsForQuickCreate] = useState<string[]>([]);
    // State for teacher edits
    const [assignmentChanges, setAssignmentChanges] = useState<Map<string, Record<string, { newTeacherId?: string | null; newTiming?: string }>>>(new Map());
    // State for student edits
    const [batchChanges, setBatchChanges] = useState<BatchChangeMap>(new Map());
    const [timingSelections, setTimingSelections] = useState<TimingSelectionMap>(new Map());


    useEffect(() => {
        if (isOpen) {
            const fetchData = async () => {
                try {
                    const [users, fetchedCourses, fetchedBatches] = await Promise.all([
                        getAdminUsers(),
                        getCourses(),
                        getAdminBatches()
                    ]);
                    setAllUsers(users);
                    setCourses(fetchedCourses);
                    setAllBatches(fetchedBatches);
                } catch (error) {
                    console.error("Failed to fetch data for edit modal", error);
                }
            };
            fetchData();
            setActiveTab('personal'); // Reset to first tab on open
            setAssignmentChanges(new Map()); // Reset changes on open
            setBatchChanges(new Map());
            setTimingSelections(new Map());
        }
    }, [isOpen]);

    useEffect(() => {
        if (user) {
            setFormData({
                ...user,
                courses: user.courses || [],
                courseExpertise: user.courseExpertise || [],
                schedules: user.schedules || [],
                documents: user.documents || [],
                preferredTimings: user.preferredTimings || [],
                status: user.status || UserStatus.Active,
                dob: user.dob ? new Date(user.dob).toISOString().split('T')[0] : '',
                dateOfJoining: user.dateOfJoining ? new Date(user.dateOfJoining).toISOString().split('T')[0] : '',
            });
            setBatchChanges(new Map()); // Clear old changes when user changes
            setTimingSelections(new Map());
        }
    }, [user]);

    const teachers = useMemo(() => allUsers.filter(u => u.role === UserRole.Teacher), [allUsers]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleCourseChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { value, checked } = e.target;
        const courseValue = value;
        setFormData(prev => {
            const courses = prev.courses || [];
            let updatedCourses;
            if (checked) {
                updatedCourses = [...courses, courseValue];
            } else {
                updatedCourses = courses.filter(c => c !== courseValue);
            }
            // Also remove any pending batch changes for the unchecked course
            const newBatchChanges = new Map(batchChanges);
            const newTimingSelections = new Map(timingSelections);
            if (!checked) {
                newBatchChanges.delete(courseValue);
                newTimingSelections.delete(courseValue);
            }
            setBatchChanges(newBatchChanges);
            setTimingSelections(newTimingSelections);

            return { ...prev, courses: updatedCourses };
        });
    };
    
    const handleExpertiseChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { value, checked } = e.target;
        const courseValue = value;
        setFormData(prev => {
            const expertise = prev.courseExpertise || [];
            let updatedExpertise;
            if (checked) {
                updatedExpertise = [...expertise, courseValue];
            } else {
                updatedExpertise = expertise.filter(c => c !== courseValue);
            }
            return { ...prev, courseExpertise: updatedExpertise };
        });
    };
    
    const handleDocumentsChange = (newDocuments: Document[]) => {
        setFormData(prev => ({ ...prev, documents: newDocuments }));
    };
    
    const handleAssignmentsChange = (changes: Map<string, Record<string, { newTeacherId?: string | null; newTiming?: string }>>) => {
        setAssignmentChanges(changes);
    };

    const handleBatchChange = (courseName: string, oldBatchId: string | undefined, newBatchId: string) => {
        const newChanges = new Map(batchChanges);
        newChanges.set(courseName, { oldBatchId, newBatchId });
        setBatchChanges(newChanges);

        const newTimingSelections = new Map(timingSelections);
        // If a new batch is selected (and it's not the same or 'unassigned')
        if (newBatchId && newBatchId !== 'unassigned' && newBatchId !== oldBatchId) {
            const selectedBatch = allBatches.find(b => b.id === newBatchId);
            if (selectedBatch && selectedBatch.schedule.length > 0) {
                 // Default to selecting all timings for the new batch
                const allTimings = new Set(selectedBatch.schedule.map(s => s.timing));
                newTimingSelections.set(courseName, allTimings);
            } else {
                // The new batch has no timings, so clear selections.
                newTimingSelections.delete(courseName);
            }
        } else {
             // If unassigned or same batch, clear the timing selections.
            newTimingSelections.delete(courseName);
        }
        setTimingSelections(newTimingSelections);
    };

    const openQuickCreateModal = (courseName: string, preferredTimings: string[]) => {
        const course = courses.find(c => c.name === courseName);
        if (course) {
            setCourseForQuickCreate(course);
            setPreferredTimingsForQuickCreate(preferredTimings);
            setIsQuickCreateOpen(true);
        }
    };

    const handleQuickBatchCreated = (newBatch: Batch) => {
        setAllBatches(prev => [...prev, newBatch]);
        handleBatchChange(newBatch.courseName, undefined, newBatch.id);
        setIsQuickCreateOpen(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const isStudent = formData.role === UserRole.Student;
            if (isStudent && onStudentSave) {
                const batchChangesWithTimings: Map<string, BatchChange & { selectedTimings?: Set<string> }> = new Map();
                batchChanges.forEach((change, courseName) => {
                    batchChangesWithTimings.set(courseName, {
                        ...change,
                        selectedTimings: timingSelections.get(courseName),
                    });
                });
                await onStudentSave({ user: formData as User, batchChanges: batchChangesWithTimings, allBatches });
            } else if (!isStudent) { // Teacher save logic
                const usersToUpdateMap = new Map<string, User>();
                usersToUpdateMap.set(formData.id!, formData as User);
        
                if (assignmentChanges.size > 0) {
                    assignmentChanges.forEach((studentCourseChanges, studentId) => {
                        const originalStudent = allUsers.find(u => u.id === studentId);
                        if (!originalStudent) return;
        
                        const studentToUpdate = usersToUpdateMap.get(studentId) || JSON.parse(JSON.stringify(originalStudent));
                        let schedules = studentToUpdate.schedules ? [...studentToUpdate.schedules] : [];
        
                        Object.entries(studentCourseChanges).forEach(([course, change]) => {
                            const scheduleIndex = schedules.findIndex(s => s.course === course);
                            let schedule = scheduleIndex > -1 ? { ...schedules[scheduleIndex] } : { course, timing: '', teacherId: '' };
        
                            if (change.newTiming !== undefined) {
                                schedule.timing = change.newTiming;
                            }
                            if (change.newTeacherId !== undefined) {
                                schedule.teacherId = change.newTeacherId || undefined;
                            }
                            
                            if (schedule.timing === '' || schedule.timing === null) {
                                schedules = schedules.filter(s => s.course !== course);
                            } else if (scheduleIndex > -1) {
                                schedules[scheduleIndex] = schedule;
                            } else {
                                schedules.push(schedule);
                            }
                        });
        
                        studentToUpdate.schedules = schedules;
                        usersToUpdateMap.set(studentId, studentToUpdate);
                    });
                }
                await onSave(Array.from(usersToUpdateMap.values()));
            } else {
                // Fallback for student save if new prop not provided
                await onSave([formData as User]);
            }
        } catch(err) {
            console.error("Error saving user data:", err);
            // Parent component will show an alert
        } finally {
            setIsLoading(false);
        }
    };

    if (!user) return null;

    const isStudent = formData.role === UserRole.Student;

    const renderStudentPersonalInfo = () => (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-5">
            <div>
                <label className="form-label">Full Name</label>
                <input type="text" name="name" value={formData.name || ''} onChange={handleChange} required className="form-input" />
            </div>
            <div>
                <label className="form-label">Parent's/Guardian's Name</label>
                <input type="text" name="fatherName" value={formData.fatherName || ''} onChange={handleChange} className="form-input" />
            </div>
            <div>
                <label className="form-label">Email Address</label>
                <input type="email" name="email" value={formData.email || ''} onChange={handleChange} required className="form-input" />
            </div>
             <div>
                <label className="form-label">Date of Birth</label>
                <input type="date" name="dob" value={formData.dob || ''} onChange={handleChange} required className="form-input" />
            </div>
            <div>
                <label className="form-label">Sex</label>
                <select name="sex" value={formData.sex} onChange={handleChange} className="form-select">
                    {Object.values(Sex).map(s => <option key={s} value={s}>{s}</option>)}
                </select>
            </div>
            <div>
                <label className="form-label">Contact Number</label>
                <input type="tel" name="contactNumber" value={formData.contactNumber || ''} onChange={handleChange} required className="form-input" />
            </div>
            <div className="grid grid-cols-subgrid lg:col-span-3 md:grid-cols-3 gap-x-6">
                <div className="lg:col-span-1">
                    <label className="form-label">School Name</label>
                    <input type="text" name="schoolName" value={formData.schoolName || ''} onChange={handleChange} className="form-input" />
                </div>
                <div className="lg:col-span-1">
                    <label className="form-label">Standard</label>
                    <input type="text" name="standard" value={formData.standard || ''} onChange={handleChange} className="form-input" />
                </div>
                <div className="lg:col-span-1">
                    <label className="form-label">Status</label>
                    <select name="status" value={formData.status || 'Active'} onChange={handleChange} className="form-select">
                        {Object.values(UserStatus).map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>
            </div>
            <div className="lg:col-span-3">
                 <label className="form-label">Address</label>
                <textarea name="address" rows={1} value={formData.address || ''} onChange={handleChange} className="form-textarea resize-none"></textarea>
            </div>
            
            <div className="lg:col-span-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
                    <div>
                        <label className="form-label">Notes</label>
                        <textarea name="notes" rows={5} value={formData.notes || ''} onChange={handleChange} className="form-textarea"></textarea>
                    </div>
                    <div>
                        <label className="form-label">Documents</label>
                        <DocumentManager documents={formData.documents || []} onDocumentsChange={handleDocumentsChange} />
                    </div>
                </div>
            </div>
        </div>
    );

    const renderTeacherPersonalInfo = () => (
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-5">
            <div>
                <label className="form-label">Full Name</label>
                <input type="text" name="name" value={formData.name || ''} onChange={handleChange} required className="form-input" />
            </div>
            <div>
                <label className="form-label">Email Address</label>
                <input type="email" name="email" value={formData.email || ''} onChange={handleChange} required className="form-input" />
            </div>
            <div>
                <label className="form-label">Contact Number</label>
                <input type="tel" name="contactNumber" value={formData.contactNumber || ''} onChange={handleChange} required className="form-input" />
            </div>
             <div>
                <label className="form-label">Date of Birth</label>
                <input type="date" name="dob" value={formData.dob || ''} onChange={handleChange} required className="form-input" />
            </div>
            <div>
                <label className="form-label">Sex</label>
                <select name="sex" value={formData.sex} onChange={handleChange} className="form-select">
                    {Object.values(Sex).map(s => <option key={s} value={s}>{s}</option>)}
                </select>
            </div>
             <div>
                <label className="form-label">Employment</label>
                <select name="employmentType" value={formData.employmentType} onChange={handleChange} className="form-select">
                    {Object.values(EmploymentType).map(t => <option key={t} value={t}>{t}</option>)}
                </select>
            </div>
            <div className="lg:col-span-2">
                <label className="form-label">Educational Qualifications</label>
                <input type="text" name="educationalQualifications" value={formData.educationalQualifications || ''} onChange={handleChange} className="form-input" />
            </div>
             <div>
                <label className="form-label">Status</label>
                <select name="status" value={formData.status || 'Active'} onChange={handleChange} className="form-select">
                    {Object.values(UserStatus).map(s => <option key={s} value={s}>{s}</option>)}
                </select>
            </div>

            <div className="lg:col-span-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
                    <div>
                        <label className="form-label">Address</label>
                        <textarea name="address" rows={5} value={formData.address || ''} onChange={handleChange} className="form-textarea"></textarea>
                    </div>
                    <div>
                        <label className="form-label">Documents</label>
                        <DocumentManager documents={formData.documents || []} onDocumentsChange={handleDocumentsChange} />
                    </div>
                </div>
            </div>
        </div>
    );
    
    const renderStudentBatchSchedule = () => {
        const findStudentBatchForCourse = (studentId: string, courseName: string): Batch | undefined => {
            return allBatches.find(batch => 
                batch.courseName === courseName && 
                batch.schedule.some(s => s.studentIds.includes(studentId))
            );
        };

        const getStudentFullSchedule = (studentId: string, courseToExclude?: string): Set<string> => {
            const schedule = new Set<string>();
            allBatches.forEach(batch => {
                if (batch.courseName !== courseToExclude) {
                    batch.schedule.forEach(s => {
                        if(s.studentIds.includes(studentId)) schedule.add(s.timing);
                    });
                }
            });
            return schedule;
        };

        const preferredTimings = formData.preferredTimings || [];

        return (
            <>
                 {preferredTimings.length > 0 && (
                    <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <h4 className="text-sm font-semibold text-yellow-800">Student's Preferred Timings</h4>
                        <div className="flex flex-wrap gap-2 mt-2">
                            {preferredTimings.map(timing => (
                                <span key={timing} className="bg-yellow-400 text-yellow-900 text-xs font-medium px-2 py-1 rounded-full">
                                    {timing}
                                </span>
                            ))}
                        </div>
                    </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                    <div>
                        <label className="form-label">Date of Joining</label>
                        <input type="date" name="dateOfJoining" value={formData.dateOfJoining || ''} onChange={handleChange} className="form-input" />
                    </div>
                    <div>
                        <label className="form-label">Grade</label>
                        <select name="grade" value={formData.grade} onChange={handleChange} className="form-select">
                            {GRADES.map(g => <option key={g} value={g}>{g}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="form-label">Class Preference</label>
                        <select name="classPreference" value={formData.classPreference} onChange={handleChange} className="form-select">
                            <option value={ClassPreference.Online}>Online</option>
                            <option value={ClassPreference.Offline}>Offline</option>
                        </select>
                    </div>
                </div>
                <fieldset className="mt-6">
                    <legend className="form-label mb-2">Course Selection</legend>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-2">
                        {courses.map(course => (
                            <label key={course.id} className="flex items-center space-x-2">
                                <input type="checkbox" value={course.name} checked={formData.courses?.includes(course.name)} onChange={handleCourseChange} className="focus:ring-brand-primary h-4 w-4 text-brand-primary border-gray-300 rounded"/>
                                <span>{course.name}</span>
                            </label>
                        ))}
                    </div>
                </fieldset>

                <div className="mt-6 pt-6 border-t">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Batch Assignments</h3>
                    <p className="text-sm text-gray-500 mb-4 -mt-2">Move this student between batches for each course.</p>
                    <div className="space-y-4">
                        {(formData.courses || []).map(courseName => {
                            const currentBatch = findStudentBatchForCourse(formData.id!, courseName);
                            const availableBatchesForCourse = allBatches.filter(b => b.courseName === courseName);
                            
                            const pendingChange = batchChanges.get(courseName);
                            const displayBatchId = pendingChange ? pendingChange.newBatchId : (currentBatch?.id || 'unassigned');
                            const studentSchedule = getStudentFullSchedule(formData.id!, courseName);

                            const selectedTimingsForCourse = timingSelections.get(courseName);
                            const newBatchForCourse = selectedTimingsForCourse ? allBatches.find(b => b.id === pendingChange?.newBatchId) : null;

                            const preferredTimingsSet = new Set(preferredTimings);
                            const matchingBatches = availableBatchesForCourse.filter(b => b.schedule.some(s => preferredTimingsSet.has(s.timing)));
                            const otherBatches = availableBatchesForCourse.filter(b => !matchingBatches.some(matching => matching.id === b.id));
                            const hasNoMatchingBatches = matchingBatches.length === 0 && preferredTimings.length > 0;

                            const renderOption = (batch: Batch) => {
                                const hasConflict = batch.schedule.some(s => studentSchedule.has(s.timing));
                                const scheduleTimings = batch.schedule.map(s => `${s.timing.split(' ')[0].substring(0, 3)} ${s.timing.split(' ').slice(1).join(' ')}`).join(', ');
                                const teacherName = teachers.find(t => t.id === batch.teacherId)?.name || 'N/A';
                                const isPreferred = batch.schedule.some(s => preferredTimingsSet.has(s.timing));
                                const optionText = `${batch.name} (${scheduleTimings || 'No timings'})`;

                                return (
                                    <option key={batch.id} value={batch.id} disabled={hasConflict && batch.id !== currentBatch?.id} title={`Teacher: ${teacherName}`}>
                                        {optionText}
                                        {isPreferred && ' ✨'}
                                        {hasConflict && batch.id !== currentBatch?.id ? ' (Conflict)' : ''}
                                    </option>
                                );
                            };


                            return (
                                <div key={courseName} className="p-3 bg-gray-50 rounded-lg border">
                                    <div className="grid grid-cols-1 sm:grid-cols-10 gap-x-4 gap-y-2 items-center">
                                        <label className="sm:col-span-3 font-medium text-gray-700 text-sm">{courseName}</label>
                                        <div className="sm:col-span-7">
                                            <select
                                                value={displayBatchId}
                                                onChange={(e) => handleBatchChange(courseName, currentBatch?.id, e.target.value)}
                                                className="form-select text-sm w-full"
                                            >
                                                <option value="unassigned">Unassigned</option>
                                                {matchingBatches.length > 0 && <optgroup label="✨ Preferred Batches">{matchingBatches.map(renderOption)}</optgroup>}
                                                {otherBatches.length > 0 && <optgroup label={matchingBatches.length > 0 ? "Other Batches" : "Available Batches"}>{otherBatches.map(renderOption)}</optgroup>}
                                            </select>
                                             {hasNoMatchingBatches && (
                                                <div className="text-xs text-center text-gray-600 bg-yellow-50 p-2 mt-2 rounded-md border border-yellow-200">
                                                    No existing batches match student preferences.
                                                    <button 
                                                        type="button" 
                                                        onClick={() => openQuickCreateModal(courseName, formData.preferredTimings || [])} 
                                                        className="font-semibold underline text-brand-primary hover:text-brand-dark ml-1"
                                                    >
                                                        Create a new batch now.
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {newBatchForCourse && newBatchForCourse.schedule.length > 0 && (
                                        <div className="mt-3 pt-3 border-t border-gray-200">
                                            <p className="text-xs font-medium text-gray-600 mb-2">Select timings for "{newBatchForCourse.name}":</p>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">
                                                {newBatchForCourse.schedule.map(scheduleItem => (
                                                    <label key={scheduleItem.timing} className="flex items-center space-x-2 text-sm">
                                                        <input
                                                            type="checkbox"
                                                            className="focus:ring-brand-primary h-4 w-4 text-brand-primary border-gray-300 rounded"
                                                            checked={selectedTimingsForCourse?.has(scheduleItem.timing)}
                                                            onChange={(e) => {
                                                                const newSelections = new Map(timingSelections);
                                                                const courseSelections = new Set(newSelections.get(courseName));
                                                                if (e.target.checked) {
                                                                    courseSelections.add(scheduleItem.timing);
                                                                } else {
                                                                    courseSelections.delete(scheduleItem.timing);
                                                                }
                                                                newSelections.set(courseName, courseSelections);
                                                                setTimingSelections(newSelections);
                                                            }}
                                                        />
                                                        <span>{scheduleItem.timing}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                        {(formData.courses || []).length === 0 && (
                            <p className="text-sm text-gray-500 text-center py-4">Select courses to assign to a batch.</p>
                        )}
                    </div>
                </div>
            </>
        );
    };

    
    const renderTeacherSchedule = () => {
        return (
            <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                        <label className="form-label">Date of Joining</label>
                        <input type="date" name="dateOfJoining" value={formData.dateOfJoining || ''} onChange={handleChange} className="form-input" />
                    </div>
                    <div>
                        <label className="form-label">Class Preference</label>
                        <select name="classPreference" value={formData.classPreference} onChange={handleChange} className="form-select">
                            <option value={ClassPreference.Online}>Online</option>
                            <option value={ClassPreference.Offline}>Offline</option>
                            <option value={ClassPreference.Hybrid}>Hybrid</option>
                        </select>
                    </div>
                </div>
                <fieldset className="mt-6">
                    <legend className="form-label mb-2">Course Expertise</legend>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-2">
                        {courses.map(course => (
                            <label key={course.id} className="flex items-center space-x-2">
                                <input type="checkbox" value={course.name} checked={formData.courseExpertise?.includes(course.name)} onChange={handleExpertiseChange} className="focus:ring-brand-primary h-4 w-4 text-brand-primary border-gray-300 rounded"/>
                                <span>{course.name}</span>
                            </label>
                        ))}
                    </div>
                </fieldset>
            </>
        );
    };

    return (
        <>
            <Modal isOpen={isOpen} onClose={onClose} size="full">
                <div className="flex flex-col h-full">
                    <ModalHeader 
                        title={`Edit ${isStudent ? "Student" : "Teacher"} Account`}
                        subtitle={`Manage profile information for ${user.name}.`}
                    />
                    
                    <form onSubmit={handleSubmit} className="flex-grow flex flex-col">
                        <div className="border-b border-gray-200">
                            <nav className="-mb-px flex space-x-6" aria-label="Tabs">
                                <TabButton isActive={activeTab === 'personal'} onClick={() => setActiveTab('personal')}>
                                    Personal Information
                                </TabButton>
                                <TabButton isActive={activeTab === 'schedule'} onClick={() => setActiveTab('schedule')}>
                                    Schedule &amp; Courses
                                </TabButton>
                                {!isStudent && (
                                    <TabButton isActive={activeTab === 'assignments'} onClick={() => setActiveTab('assignments')}>
                                        Student Assignments
                                        {assignmentChanges.size > 0 && (
                                            <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                                {assignmentChanges.size} changed
                                            </span>
                                        )}
                                    </TabButton>
                                )}
                            </nav>
                        </div>

                        <div className="py-6 flex-grow">
                            {activeTab === 'personal' && (
                                <div className="bg-white p-6 rounded-lg shadow-sm">
                                    {isStudent ? renderStudentPersonalInfo() : renderTeacherPersonalInfo()}
                                </div>
                            )}
                            {activeTab === 'schedule' && (
                                <div className="bg-white p-6 rounded-lg shadow-sm">
                                {isStudent ? renderStudentBatchSchedule() : renderTeacherSchedule()}
                                </div>
                            )}
                            {activeTab === 'assignments' && !isStudent && (
                                <StudentAssignmentManager 
                                    teacher={formData as User}
                                    allUsers={allUsers}
                                    onAssignmentsChange={handleAssignmentsChange}
                                    courses={courses}
                                />
                            )}
                        </div>
                        
                        <div className="flex justify-end pt-6 mt-auto border-t border-gray-200">
                            <button type="button" onClick={onClose} className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-primary">
                                Cancel
                            </button>
                            <button type="submit" disabled={isLoading} className="ml-3 inline-flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-brand-primary hover:bg-brand-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors disabled:bg-indigo-300 disabled:cursor-not-allowed">
                                {isLoading ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>
                    </form>
                </div>
            </Modal>
             <QuickBatchCreateModal
                isOpen={isQuickCreateOpen}
                onClose={() => setIsQuickCreateOpen(false)}
                onSave={handleQuickBatchCreated}
                course={courseForQuickCreate}
                allUsers={allUsers}
                allBatches={allBatches}
                preferredTimings={preferredTimingsForQuickCreate}
            />
        </>
    );
};

export default EditUserModal;