
import React, { useState, useRef, useEffect } from 'react';
import type { User, Course } from '../../types';
import { UserRole, Sex, Grade, ClassPreference, UserStatus } from '../../types';
import { GRADES } from '../../constants';
import { getCourses } from '../../api';
import Modal from '../Modal';
import CourseTimingManager from './CourseTimingManager';
import { UploadIcon, XCircleIcon } from '../icons';
import ModalHeader from '../ModalHeader';

interface AddStudentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (user: Partial<User>) => void;
}

const AddStudentModal: React.FC<AddStudentModalProps> = ({ isOpen, onClose, onSave }) => {
    const [formData, setFormData] = useState<Partial<User>>({
        role: UserRole.Student,
        sex: Sex.Male,
        grade: Grade.Grade1,
        courses: [],
        classPreference: ClassPreference.Online,
        schedules: [],
        status: UserStatus.Active,
        name: '',
        email: '',
        photoUrl: '',
    });
    const [courses, setCourses] = useState<Course[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isOpen) {
            const fetchCourses = async () => {
                try {
                    const fetchedCourses = await getCourses();
                    setCourses(fetchedCourses);
                } catch (error) {
                    console.error("Failed to fetch courses for add student modal", error);
                }
            };
            fetchCourses();
        }
    }, [isOpen]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleCourseChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { value, checked } = e.target;
        const courseValue = value;
        setFormData(prev => {
            const currentCourses = Array.isArray(prev.courses) ? prev.courses : [];
            const updatedCourses = checked
                ? [...currentCourses, courseValue]
                : currentCourses.filter(c => c !== courseValue);
    
            const currentSchedules = Array.isArray(prev.schedules) ? prev.schedules : [];
            const updatedSchedules = currentSchedules.filter(s =>
                updatedCourses.includes(s.course)
            );
    
            return { ...prev, courses: updatedCourses, schedules: updatedSchedules };
        });
    };

    const handleScheduleChange = (schedules: NonNullable<User['schedules']>) => {
        setFormData(prev => ({ ...prev, schedules }));
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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        await onSave(formData);
        // Reset form after saving
        setFormData({
            role: UserRole.Student,
            sex: Sex.Male,
            grade: Grade.Grade1,
            courses: [],
            classPreference: ClassPreference.Online,
            schedules: [],
            status: UserStatus.Active,
            name: '',
            email: '',
            photoUrl: '',
        });
        setIsLoading(false);
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} size="full">
            <div className="flex flex-col h-full">
                <ModalHeader 
                    title="Add New Student"
                    subtitle="Fill in the details to enroll a new student."
                />
                
                <form onSubmit={handleSubmit} className="flex-grow flex flex-col">
                     <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 flex-grow">
                        {/* Left Column */}
                        <div className="lg:col-span-1">
                            <div className="bg-white p-6 rounded-lg shadow-sm h-full">
                                <h3 className="font-semibold text-lg mb-4 text-gray-800">Profile Photo</h3>
                                <div className="flex flex-col items-center">
                                    <div className="relative group w-48 h-48 bg-brand-light/30 rounded-lg flex items-center justify-center overflow-hidden">
                                        <img 
                                            src={formData.photoUrl || `https://ui-avatars.com/api/?name=${formData.name || '?'}&background=e8eaf6&color=1a237e&size=128&font-size=0.5`}
                                            alt="Profile Preview" 
                                            className="w-full h-full object-cover"
                                        />
                                        {formData.photoUrl && (
                                            <button 
                                                type="button"
                                                onClick={handleRemovePhoto} 
                                                className="absolute top-2 right-2 bg-white/70 text-gray-700 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white"
                                                aria-label="Remove photo"
                                            >
                                                <XCircleIcon />
                                            </button>
                                        )}
                                    </div>
                                    <input 
                                        type="file" 
                                        ref={fileInputRef} 
                                        onChange={handlePhotoChange} 
                                        className="hidden" 
                                        accept="image/png, image/jpeg"
                                    />
                                    <button 
                                        type="button" 
                                        onClick={() => fileInputRef.current?.click()} 
                                        className="mt-4 w-full flex items-center justify-center bg-white border border-gray-300 hover:bg-gray-100 text-gray-800 font-semibold px-4 py-2 rounded-md shadow-sm transition-colors"
                                    >
                                        <UploadIcon />
                                        Upload Photo
                                    </button>
                                </div>
                            </div>
                        </div>
                         {/* Right Column */}
                        <div className="lg:col-span-2 bg-white p-6 rounded-lg shadow-sm">
                            <div className="space-y-8">
                                <fieldset>
                                    <legend className="font-semibold text-lg mb-4 text-gray-800">Personal &amp; Account Details</legend>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                                         <div className="sm:col-span-2">
                                            <label htmlFor="name-add" className="block text-sm font-medium text-gray-700">Full Name</label>
                                            <input type="text" id="name-add" name="name" value={formData.name || ''} onChange={handleChange} required className="mt-1 block w-full form-input" />
                                        </div>
                                        <div>
                                            <label htmlFor="email-add" className="block text-sm font-medium text-gray-700">Email Address</label>
                                            <input type="email" id="email-add" name="email" value={formData.email || ''} onChange={handleChange} required className="mt-1 block w-full form-input" />
                                        </div>
                                        <div>
                                            <label htmlFor="password-add" className="block text-sm font-medium text-gray-700">Password (Optional)</label>
                                            <input type="password" id="password-add" name="password" value={formData.password || ''} onChange={handleChange} className="mt-1 block w-full form-input" placeholder="Defaults to 'password123'" />
                                        </div>
                                        <div>
                                            <label htmlFor="dob-add" className="block text-sm font-medium text-gray-700">Date of Birth</label>
                                            <input type="date" id="dob-add" name="dob" value={formData.dob || ''} onChange={handleChange} required className="mt-1 block w-full form-input" />
                                        </div>
                                        <div>
                                            <label htmlFor="sex-add" className="block text-sm font-medium text-gray-700">Sex</label>
                                            <select id="sex-add" name="sex" value={formData.sex} onChange={handleChange} required className="mt-1 block w-full form-select">
                                                {Object.values(Sex).map(s => <option key={s} value={s}>{s}</option>)}
                                            </select>
                                        </div>
                                        <div className="sm:col-span-2">
                                            <label htmlFor="contactNumber-add" className="block text-sm font-medium text-gray-700">Contact Number</label>
                                            <input type="tel" id="contactNumber-add" name="contactNumber" value={formData.contactNumber || ''} onChange={handleChange} required className="mt-1 block w-full form-input" />
                                        </div>
                                        <div className="sm:col-span-2">
                                            <label htmlFor="address-add" className="block text-sm font-medium text-gray-700">Address</label>
                                            <textarea id="address-add" name="address" rows={3} value={formData.address || ''} onChange={handleChange} className="mt-1 block w-full form-textarea"></textarea>
                                        </div>
                                    </div>
                                </fieldset>
                                 <fieldset>
                                    <legend className="font-semibold text-lg mb-4 text-gray-800">Academic Details</legend>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                                         <div className="sm:col-span-2">
                                            <label className="block text-sm font-medium text-gray-700">Courses</label>
                                             <div className="mt-2 grid grid-cols-2 gap-2">
                                                {courses.map(course => (
                                                    <label key={course.id} className="flex items-center space-x-2">
                                                        <input type="checkbox" value={course.name} checked={formData.courses?.includes(course.name)} onChange={handleCourseChange} className="focus:ring-brand-primary h-4 w-4 text-brand-primary border-gray-300 rounded"/>
                                                        <span>{course.name}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                        <div>
                                            <label htmlFor="grade-add" className="block text-sm font-medium text-gray-700">Grade</label>
                                            <select id="grade-add" name="grade" value={formData.grade} onChange={handleChange} className="mt-1 block w-full form-select">
                                                {GRADES.map(g => <option key={g} value={g}>{g}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label htmlFor="doj-add" className="block text-sm font-medium text-gray-700">Date of Joining</label>
                                            <input type="date" id="doj-add" name="dateOfJoining" value={formData.dateOfJoining || ''} onChange={handleChange} required className="mt-1 block w-full form-input" />
                                        </div>
                                        <div>
                                            <label htmlFor="classpref-add" className="block text-sm font-medium text-gray-700">Class Preference</label>
                                            <select id="classpref-add" name="classPreference" value={formData.classPreference} onChange={handleChange} className="mt-1 block w-full form-select">
                                                {Object.values(ClassPreference).filter(p => p !== ClassPreference.Hybrid).map(p => <option key={p} value={p}>{p}</option>)}
                                            </select>
                                        </div>
                                         <div>
                                            <label htmlFor="status-add" className="block text-sm font-medium text-gray-700">Status</label>
                                            <select id="status-add" name="status" value={formData.status} onChange={handleChange} className="mt-1 block w-full form-select">
                                                {Object.values(UserStatus).map(s => <option key={s} value={s}>{s}</option>)}
                                            </select>
                                        </div>
                                        <div className="sm:col-span-2">
                                            <label htmlFor="fatherName-add" className="block text-sm font-medium text-gray-700">Parent/Guardian's Name</label>
                                            <input type="text" id="fatherName-add" name="fatherName" value={formData.fatherName || ''} onChange={handleChange} className="mt-1 block w-full form-input" />
                                        </div>
                                        <div>
                                            <label htmlFor="standard-add" className="block text-sm font-medium text-gray-700">Standard</label>
                                            <input type="text" id="standard-add" name="standard" value={formData.standard || ''} onChange={handleChange} className="mt-1 block w-full form-input" />
                                        </div>
                                        <div>
                                            <label htmlFor="schoolName-add" className="block text-sm font-medium text-gray-700">School Name</label>
                                            <input type="text" id="schoolName-add" name="schoolName" value={formData.schoolName || ''} onChange={handleChange} className="mt-1 block w-full form-input" />
                                        </div>
                                        <div className="sm:col-span-2">
                                            <label className="block text-sm font-medium text-gray-700">Batch Timings</label>
                                            <CourseTimingManager 
                                                selectedCourses={formData.courses || []}
                                                schedules={formData.schedules || []}
                                                onChange={handleScheduleChange} 
                                            />
                                        </div>
                                        <div className="sm:col-span-2">
                                            <label htmlFor="notes-add" className="block text-sm font-medium text-gray-700">Notes (Optional)</label>
                                            <textarea id="notes-add" name="notes" rows={3} value={formData.notes || ''} onChange={handleChange} className="mt-1 block w-full form-textarea"></textarea>
                                        </div>
                                    </div>
                                </fieldset>
                            </div>
                        </div>
                    </div>
                     <div className="flex justify-end pt-6 mt-6 border-t border-gray-200">
                        <button type="button" onClick={onClose} className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-primary">
                            Cancel
                        </button>
                        <button type="submit" disabled={isLoading} className="ml-3 inline-flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-brand-primary hover:bg-brand-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors disabled:bg-indigo-300 disabled:cursor-not-allowed">
                            {isLoading ? 'Saving...' : 'Add Student'}
                        </button>
                    </div>
                </form>
            </div>
        </Modal>
    );
};

export default AddStudentModal;