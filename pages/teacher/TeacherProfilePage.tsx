
import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import type { User, Course } from '../../types';
import { Sex, ClassPreference, EmploymentType } from '../../types';
import { updateUserProfile, getCourses } from '../../api';
import { COUNTRIES } from '../../constants';

const TeacherProfilePage: React.FC = () => {
    const { user, onUpdate } = useOutletContext<{ user: User; onUpdate: (user: User) => void }>();
    const [formData, setFormData] = useState<Partial<User>>({});
    const [courses, setCourses] = useState<Course[]>([]);
    const [isCoursesLoading, setIsCoursesLoading] = useState(true);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    useEffect(() => {
        if (user) {
            setFormData({
                ...user,
                dob: user.dob ? user.dob.split('T')[0] : '', // Format for date input
                courseExpertise: user.courseExpertise || [],
            });
        }
        const fetchCourses = async () => {
            try {
                setIsCoursesLoading(true);
                const fetchedCourses = await getCourses();
                setCourses(fetchedCourses);
            } catch (err) {
                console.error("Failed to load courses for dashboard", err);
            } finally {
                setIsCoursesLoading(false);
            }
        };
        fetchCourses();
    }, [user]);
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleExpertiseChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { value, checked } = e.target;
        const courseValue = value;
        setFormData(prev => {
            const expertise = prev.courseExpertise || [];
            if (checked) {
                return { ...prev, courseExpertise: [...expertise, courseValue] };
            } else {
                return { ...prev, courseExpertise: expertise.filter(c => c !== courseValue) };
            }
        });
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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);
        setSuccess(null);
        try {
            const updatedUser = await updateUserProfile(formData);
            onUpdate(updatedUser); // Update parent state
            setSuccess('Profile updated successfully!');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to update profile.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="p-4 sm:p-6 md:p-8">
            <h1 className="text-3xl font-bold text-dark-text mb-6">My Profile</h1>
            <form onSubmit={handleSubmit} className="bg-white p-8 rounded-xl shadow-lg space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="md:col-span-1">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Profile Photo</label>
                        <div className="flex flex-col items-center space-y-4">
                            <img 
                                src={formData.photoUrl || `https://ui-avatars.com/api/?name=${formData.name || 'T'}&background=e8eaf6&color=1a237e&size=128`}
                                alt="Profile" 
                                className="h-32 w-32 rounded-full object-cover shadow-md"
                            />
                            <input 
                                type="file" 
                                id="photoUrl" 
                                name="photoUrl" 
                                accept="image/png, image/jpeg" 
                                onChange={handlePhotoChange} 
                                disabled={isLoading} 
                                className="text-sm text-gray-500 w-full file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-brand-light file:text-brand-primary hover:file:bg-indigo-100" 
                            />
                        </div>
                    </div>
                    <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div className="sm:col-span-2">
                            <label htmlFor="name" className="block text-sm font-medium text-gray-700">Full Name</label>
                            <input type="text" name="name" id="name" value={formData.name || ''} onChange={handleChange} required className="mt-1 w-full form-input" />
                        </div>
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email ID</label>
                            <input type="email" name="email" id="email" value={formData.email || ''} onChange={handleChange} required className="mt-1 w-full form-input" />
                        </div>
                            <div>
                            <label htmlFor="contactNumber" className="block text-sm font-medium text-gray-700">Contact Number</label>
                            <input type="tel" name="contactNumber" id="contactNumber" value={formData.contactNumber || ''} onChange={handleChange} required className="mt-1 w-full form-input" />
                        </div>
                        <div>
                            <label htmlFor="dob" className="block text-sm font-medium text-gray-700">Date of Birth</label>
                            <input type="date" name="dob" id="dob" value={formData.dob || ''} onChange={handleChange} required className="mt-1 w-full form-input" />
                        </div>
                        <div>
                            <label htmlFor="sex" className="block text-sm font-medium text-gray-700">Sex</label>
                            <select name="sex" id="sex" value={formData.sex || ''} onChange={handleChange} required className="mt-1 w-full form-select">
                                {Object.values(Sex).map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                    </div>
                </div>

                <div className="border-t border-gray-200 pt-6 grid grid-cols-1 sm:grid-cols-2 gap-6">
                     <div className="sm:col-span-2">
                        <label htmlFor="address" className="block text-sm font-medium text-gray-700">Address</label>
                        <textarea name="address" id="address" value={formData.address || ''} onChange={handleChange} rows={3} required className="mt-1 w-full form-textarea"></textarea>
                    </div>
                    <div>
                        <label className="form-label">Country</label>
                        <select name="country" value={formData.country || ''} onChange={handleChange} required className="form-select w-full">
                            <option value="">Select Country</option>
                            {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="form-label">State / Province</label>
                        <input name="state" value={formData.state || ''} onChange={handleChange} required className="form-input w-full"/>
                    </div>
                    <div>
                        <label className="form-label">City / Location</label>
                        <input name="city" value={formData.city || ''} onChange={handleChange} required className="form-input w-full"/>
                    </div>
                    <div>
                        <label className="form-label">Postal Code</label>
                        <input name="postalCode" value={formData.postalCode || ''} onChange={handleChange} required className="form-input w-full"/>
                    </div>
                </div>

                <div className="border-t border-gray-200 pt-6 grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="sm:col-span-2">
                        <label className="block text-sm font-medium text-gray-700">Course Expertise</label>
                        <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-4">
                        {isCoursesLoading ? <p className="text-sm text-gray-500 col-span-full">Loading courses...</p> : courses.map(course => (
                                <label key={course.id} className="flex items-center space-x-2">
                                    <input type="checkbox" value={course.name} checked={formData.courseExpertise?.includes(course.name)} onChange={handleExpertiseChange} className="focus:ring-brand-primary h-4 w-4 text-brand-primary border-gray-300 rounded"/>
                                    <span className="text-sm">{course.name}</span>
                                </label>
                        ))}
                        </div>
                    </div>
                    <div className="sm:col-span-2">
                        <label htmlFor="educationalQualifications" className="block text-sm font-medium text-gray-700">Educational Qualifications</label>
                        <input type="text" name="educationalQualifications" id="educationalQualifications" value={formData.educationalQualifications || ''} onChange={handleChange} required className="mt-1 w-full form-input" />
                    </div>
                    <div>
                        <label htmlFor="employmentType" className="block text-sm font-medium text-gray-700">Employment Type</label>
                        <select name="employmentType" id="employmentType" value={formData.employmentType || ''} onChange={handleChange} required className="mt-1 w-full form-select">
                            {Object.values(EmploymentType).map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="classPreference" className="block text-sm font-medium text-gray-700">Class Mode</label>
                        <select name="classPreference" id="classPreference" value={formData.classPreference || ''} onChange={handleChange} required className="mt-1 w-full form-select">
                            {Object.values(ClassPreference).map(p => <option key={p} value={p}>{p}</option>)}
                        </select>
                    </div>
                </div>

                <div className="border-t border-gray-200 pt-6">
                    {error && <p className="text-sm text-red-600 text-center mb-4">{error}</p>}
                    {success && <p className="text-sm text-green-600 text-center mb-4">{success}</p>}
                    <button type="submit" disabled={isLoading} className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-brand-purple hover:bg-opacity-90 disabled:bg-opacity-50">
                        {isLoading ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>

            </form>
        </div>
    );
};

export default TeacherProfilePage;
