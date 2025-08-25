
import React, { useState, useEffect, useRef, useMemo } from 'react';
import type { User, Course } from '../../types';
import { UserRole, Sex, ClassPreference, EmploymentType, UserStatus } from '../../types';
import { WEEKDAYS, TIME_SLOTS } from '../../constants';
import { getAdminUsers, getCourses } from '../../api';
import Modal from '../Modal';
import TabButton from './TabButton';
import { UploadIcon, XCircleIcon } from '../icons';
import ModalHeader from '../ModalHeader';

// This is the data structure for the changes we plan to make.
// Maps studentId to a record of changes per course.
export type AssignmentChanges = Map<string, Record<string, { newTiming?: string; assignNewTeacher?: boolean }>>;
const ALL_TIMINGS = WEEKDAYS.flatMap(day => TIME_SLOTS.map(slot => `${day} ${slot}`));

interface AddTeacherModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (teacherData: Partial<User>, assignments: AssignmentChanges) => Promise<void>;
}

const AddTeacherModal: React.FC<AddTeacherModalProps> = ({ isOpen, onClose, onSave }) => {
    const [formData, setFormData] = useState<Partial<User>>({});
    const [allStudents, setAllStudents] = useState<User[]>([]);
    const [courses, setCourses] = useState<Course[]>([]);
    const [assignmentChanges, setAssignmentChanges] = useState<AssignmentChanges>(new Map());
    
    const [isLoading, setIsLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<'personal' | 'professional' | 'assignments'>('personal');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const resetForm = () => {
        setFormData({
            role: UserRole.Teacher,
            sex: Sex.Male,
            classPreference: ClassPreference.Hybrid,
            employmentType: EmploymentType.FullTime,
            courseExpertise: [],
            status: UserStatus.Active,
            name: '',
            email: '',
            photoUrl: '',
            dob: '',
            dateOfJoining: new Date().toISOString().split('T')[0],
        });
        setAssignmentChanges(new Map());
        setActiveTab('personal');
    }

    useEffect(() => {
        if (isOpen) {
            resetForm();
            const fetchInitialData = async () => {
                try {
                    const [users, fetchedCourses] = await Promise.all([
                        getAdminUsers(),
                        getCourses()
                    ]);
                    setAllStudents(users.filter(u => u.role === UserRole.Student));
                    setCourses(fetchedCourses);
                } catch (error) {
                    console.error("Failed to fetch data for add teacher modal", error);
                }
            };
            fetchInitialData();
        }
    }, [isOpen]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleExpertiseChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { value, checked } = e.target;
        const courseValue = value;
        setFormData(prev => {
            const expertise = prev.courseExpertise || [];
            const updatedExpertise = checked
                ? [...expertise, courseValue]
                : expertise.filter(c => c !== courseValue);
            return { ...prev, courseExpertise: updatedExpertise };
        });
        
        // When expertise is removed, remove any pending assignments for that course
        if (!checked) {
            const newChanges = new Map(assignmentChanges);
            let hasChanges = false;
            assignmentChanges.forEach((studentCourses, studentId) => {
                if (studentCourses[courseValue]) {
                    hasChanges = true;
                    const newStudentCourses = { ...studentCourses };
                    delete newStudentCourses[courseValue];
                    if (Object.keys(newStudentCourses).length === 0) {
                        newChanges.delete(studentId);
                    } else {
                        newChanges.set(studentId, newStudentCourses);
                    }
                }
            });
            if (hasChanges) {
                setAssignmentChanges(newChanges);
            }
        }
    };
    
    const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onloadend = () => {
                setFormData(prev => ({ ...prev, photoUrl: reader.result as string }));
            };
            reader.readAsDataURL(file);
        }
    };

    const handleRemovePhoto = () => {
        setFormData(prev => ({ ...prev, photoUrl: '' }));
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleAssignmentAction = (studentId: string, course: string, type: 'timing' | 'assign', value: any) => {
        const newChanges = new Map(assignmentChanges);
        const studentChanges = { ...(newChanges.get(studentId) || {}) };
        const courseChange = { ...(studentChanges[course] || {}) };

        if (type === 'timing') {
            courseChange.newTiming = value;
             // When timing is removed, the student should be unassigned
            if (!value) {
                courseChange.assignNewTeacher = false;
            }
        } else if (type === 'assign') {
            courseChange.assignNewTeacher = value;
        }

        studentChanges[course] = courseChange;
        newChanges.set(studentId, studentChanges);
        setAssignmentChanges(newChanges);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name || !formData.email) {
            alert('Please fill out the teacher\'s name and email.');
            setActiveTab('personal');
            return;
        }
        setIsLoading(true);
        await onSave(formData, assignmentChanges);
        setIsLoading(false);
    };

    const getEffectiveSchedule = (studentId: string, course: string): { timing: string; teacherId?: string } => {
        const student = allStudents.find(u => u.id === studentId);
        const originalSchedule = student?.schedules?.find(s => s.course === course);
        const pending = assignmentChanges.get(studentId)?.[course];
    
        const effectiveTiming = pending?.newTiming !== undefined ? pending.newTiming : originalSchedule?.timing;
        
        // This is for display only; the real assignment happens on save.
        const effectiveTeacherId = pending?.assignNewTeacher ? 'new-teacher' : originalSchedule?.teacherId;

        return {
            timing: effectiveTiming || '',
            teacherId: effectiveTeacherId,
        };
    };
    
    const renderAssignments = () => {
        const expertise = formData.courseExpertise || [];
        if (expertise.length === 0) {
            return <p className="text-center text-gray-500 py-8">Please select course expertise in the "Professional &amp; Course Details" tab first to see available students.</p>;
        }

        const relevantStudents = allStudents.filter(student =>
            student.courses?.some(course => expertise.includes(course))
        );
        
        if (relevantStudents.length === 0) {
             return <p className="text-center text-gray-500 py-8">No students are enrolled in the selected course(s).</p>;
        }

        return (
            <div className="border rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student</th>
                            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Course</th>
                            <th scope="col" className="w-1/3 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Batch Timing</th>
                            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Assign to New Teacher?</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {relevantStudents.map(student => {
                            const assignableCourses = student.courses?.filter(c => expertise.includes(c)) || [];
                            return assignableCourses.map(course => {
                                const { timing: effectiveTiming } = getEffectiveSchedule(student.id, course);
                                const studentBookedSlots = allStudents.find(s => s.id === student.id)?.schedules?.reduce((acc, s) => {
                                    if (s.timing) acc[s.timing] = s.course;
                                    return acc;
                                }, {} as Record<string, string>) || {};

                                const isAssigned = assignmentChanges.get(student.id)?.[course]?.assignNewTeacher || false;
                                
                                return (
                                <tr key={`${student.id}-${course}`}>
                                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">{student.name}</td>
                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{course}</td>
                                    <td className="px-4 py-3">
                                        <select
                                            value={effectiveTiming}
                                            onChange={(e) => handleAssignmentAction(student.id, course, 'timing', e.target.value)}
                                            className="form-select text-sm w-full py-1"
                                        >
                                            <option value="">Not Set</option>
                                            {ALL_TIMINGS.map(timing => {
                                                const bookingCourse = studentBookedSlots[timing];
                                                const isBookedByOther = !!(bookingCourse && bookingCourse !== course);
                                                return <option key={timing} value={timing} disabled={isBookedByOther}>{timing}{isBookedByOther ? ` (Booked for ${bookingCourse})` : ''}</option>;
                                            })}
                                        </select>
                                    </td>
                                    <td className="px-4 py-3">
                                        <input
                                            type="checkbox"
                                            className="h-5 w-5 text-brand-primary focus:ring-brand-primary border-gray-300 rounded"
                                            checked={isAssigned}
                                            disabled={!effectiveTiming}
                                            onChange={(e) => handleAssignmentAction(student.id, course, 'assign', e.target.checked)}
                                            title={!effectiveTiming ? "Please set a timing first" : ""}
                                        />
                                    </td>
                                </tr>
                                );
                            });
                        })}
                    </tbody>
                </table>
            </div>
        );
    };

    return (
         <Modal isOpen={isOpen} onClose={onClose} size="full">
            <div className="flex flex-col h-full">
                <ModalHeader 
                    title="Add New Teacher"
                    subtitle="Create a profile, set expertise, and assign students all at once."
                />
                
                 <form onSubmit={handleSubmit} className="flex-grow flex flex-col">
                    <div className="border-b border-gray-200">
                        <nav className="-mb-px flex space-x-6" aria-label="Tabs">
                            <TabButton isActive={activeTab === 'personal'} onClick={() => setActiveTab('personal')}>Personal Information</TabButton>
                            <TabButton isActive={activeTab === 'professional'} onClick={() => setActiveTab('professional')}>Professional &amp; Course Details</TabButton>
                            <TabButton isActive={activeTab === 'assignments'} onClick={() => setActiveTab('assignments')}>
                                Student Assignments &amp; Timings
                                {assignmentChanges.size > 0 && (
                                    <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">{assignmentChanges.size} changed</span>
                                )}
                            </TabButton>
                        </nav>
                    </div>

                    <div className="py-6 flex-grow">
                        {activeTab === 'personal' && (
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                <div className="lg:col-span-1">
                                    <div className="bg-white p-6 rounded-lg shadow-sm h-full">
                                        <h3 className="font-semibold text-lg mb-4 text-gray-800">Profile Photo</h3>
                                        <div className="flex flex-col items-center">
                                            <div className="relative group w-48 h-48 bg-brand-light/30 rounded-lg flex items-center justify-center overflow-hidden">
                                                <img src={formData.photoUrl || `https://ui-avatars.com/api/?name=${formData.name || '?'}&background=e8eaf6&color=1a237e&size=128&font-size=0.5`} alt="Profile Preview" className="w-full h-full object-cover"/>
                                                {formData.photoUrl && <button type="button" onClick={handleRemovePhoto} className="absolute top-2 right-2 bg-white/70 text-gray-700 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white" aria-label="Remove photo"><XCircleIcon /></button>}
                                            </div>
                                            <input type="file" ref={fileInputRef} onChange={handlePhotoChange} className="hidden" accept="image/png, image/jpeg"/>
                                            <button type="button" onClick={() => fileInputRef.current?.click()} className="mt-4 w-full flex items-center justify-center bg-white border border-gray-300 hover:bg-gray-100 text-gray-800 font-semibold px-4 py-2 rounded-md shadow-sm transition-colors"><UploadIcon /> Upload Photo</button>
                                        </div>
                                    </div>
                                </div>
                                <div className="lg:col-span-2 bg-white p-6 rounded-lg shadow-sm">
                                    <fieldset>
                                        <legend className="font-semibold text-lg mb-4 text-gray-800">Personal &amp; Account Details</legend>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                                            <div className="sm:col-span-2"><label className="form-label">Full Name</label><input type="text" name="name" value={formData.name || ''} onChange={handleChange} required className="form-input" /></div>
                                            <div><label className="form-label">Email Address</label><input type="email" name="email" value={formData.email || ''} onChange={handleChange} required className="form-input" /></div>
                                            <div><label className="form-label">Password (Optional)</label><input type="password" name="password" value={formData.password || ''} onChange={handleChange} className="form-input" placeholder="Defaults to 'password123'" /></div>
                                            <div><label className="form-label">Date of Birth</label><input type="date" name="dob" value={formData.dob || ''} onChange={handleChange} required className="form-input" /></div>
                                            <div><label className="form-label">Sex</label><select name="sex" value={formData.sex} onChange={handleChange} className="form-select">{Object.values(Sex).map(s => <option key={s} value={s}>{s}</option>)}</select></div>
                                            <div><label className="form-label">Contact Number</label><input type="tel" name="contactNumber" value={formData.contactNumber || ''} onChange={handleChange} required className="form-input" /></div>
                                            <div>
                                                <label className="form-label">Status</label>
                                                <select name="status" value={formData.status} onChange={handleChange} className="form-select">
                                                    {Object.values(UserStatus).map(s => <option key={s} value={s}>{s}</option>)}
                                                </select>
                                            </div>
                                        </div>
                                    </fieldset>
                                </div>
                            </div>
                        )}
                        {activeTab === 'professional' && (
                            <div className="bg-white p-6 rounded-lg shadow-sm">
                                <fieldset>
                                    <legend className="font-semibold text-lg mb-4 text-gray-800">Professional &amp; Course Details</legend>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                                        <div className="sm:col-span-2"><label className="form-label">Educational Qualifications</label><input type="text" name="educationalQualifications" value={formData.educationalQualifications || ''} onChange={handleChange} className="form-input" /></div>
                                        <div><label className="form-label">Employment</label><select name="employmentType" value={formData.employmentType} onChange={handleChange} className="form-select">{Object.values(EmploymentType).map(t => <option key={t} value={t}>{t}</option>)}</select></div>
                                        <div><label className="form-label">Class Preference</label><select name="classPreference" value={formData.classPreference} onChange={handleChange} className="form-select">{Object.values(ClassPreference).map(p => <option key={p} value={p}>{p}</option>)}</select></div>
                                        <div><label className="form-label">Date of Joining</label><input type="date" name="dateOfJoining" value={formData.dateOfJoining || ''} onChange={handleChange} required className="form-input" /></div>
                                        <div className="sm:col-span-2"><label className="form-label">Course Expertise</label><div className="mt-2 grid grid-cols-2 gap-2">{courses.map(course => (<label key={course.id} className="flex items-center space-x-2"><input type="checkbox" value={course.name} checked={formData.courseExpertise?.includes(course.name)} onChange={handleExpertiseChange} className="focus:ring-brand-primary h-4 w-4 text-brand-primary border-gray-300 rounded"/><span>{course.name}</span></label>))}</div></div>
                                    </div>
                                </fieldset>
                            </div>
                        )}
                        {activeTab === 'assignments' && (
                            <div className="bg-white p-6 rounded-lg shadow-sm">
                                <h3 className="text-lg font-semibold text-gray-800 mb-2">Assign Students & Set Timings</h3>
                                <p className="text-sm text-gray-500 mb-4">Select students to assign to this new teacher and set their class schedules. An assignment is only possible if a time slot is selected.</p>
                                {renderAssignments()}
                            </div>
                        )}
                    </div>
                    
                    <div className="flex justify-end pt-6 mt-auto border-t border-gray-200">
                        <button type="button" onClick={onClose} className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none">Cancel</button>
                        <button type="submit" disabled={isLoading} className="ml-3 inline-flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-brand-primary hover:bg-brand-dark focus:outline-none disabled:bg-indigo-300 disabled:cursor-not-allowed">
                            {isLoading ? 'Saving...' : 'Add Teacher'}
                        </button>
                    </div>
                </form>
            </div>
         </Modal>
    );
};

export default AddTeacherModal;