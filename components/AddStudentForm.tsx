
import React, { useState, useRef } from 'react';
import { UserRole, ClassPreference, Sex, User } from '../types';
import { COURSE_OPTIONS } from '../constants';
import { registerUser } from '../api';
import { UploadIcon, XCircleIcon } from './icons';


interface AddStudentFormProps {
  onSuccess: (newUser: User) => void;
  onCancel: () => void;
}

const AddStudentForm: React.FC<AddStudentFormProps> = ({ onSuccess, onCancel }) => {
  const [formData, setFormData] = useState<Partial<User>>({
    role: UserRole.Student,
    name: '',
    classPreference: ClassPreference.Online,
    courses: [],
    sex: Sex.Male,
    photoUrl: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  const handleCourseChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value, checked } = e.target;
    const courseValue = value as typeof COURSE_OPTIONS[number];
    setFormData(prev => {
        const courses = prev.courses || [];
        if (checked) {
            return { ...prev, courses: [...courses, courseValue] };
        } else {
            return { ...prev, courses: courses.filter(c => c !== courseValue) };
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

  const handleRemovePhoto = () => {
    setFormData(prev => ({ ...prev, photoUrl: '' }));
    if (fileInputRef.current) {
        fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      // The registerUser API now returns the new user when adding a child
      const newUser = await registerUser(formData as User) as User;
      setIsLoading(false);
      alert('New student added successfully!');
      onSuccess(newUser);
    } catch (err) {
      setIsLoading(false);
      setError(err instanceof Error ? err.message : 'Could not add student.');
    }
  };

  return (
    <div className="h-full flex flex-col">
        <h2 className="text-3xl font-bold text-gray-800 mb-1">Add New Student</h2>
        <p className="text-gray-500 mb-8">Enter the details for the new student below.</p>
      
        <form onSubmit={handleSubmit} className="flex-grow flex flex-col">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 flex-grow">
                {/* Left Column */}
                <div className="lg:col-span-1">
                    <div className="bg-white p-6 rounded-lg shadow-sm h-full">
                        <h3 className="font-semibold text-lg mb-4 text-gray-800">Profile Photo</h3>
                        <div className="flex flex-col items-center">
                            <div className="relative group w-48 h-48 bg-brand-light/30 rounded-lg flex items-center justify-center overflow-hidden">
                                <img 
                                    src={formData.photoUrl || `https://ui-avatars.com/api/?name=${formData.name || '?'}&background=e8eaf6&color=1a237e&size=128&font-size=0.5`}
                                    alt="Profile" 
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
                                id="photoUrl-add-student"
                                name="photoUrl"
                            />
                            <button 
                                type="button" 
                                onClick={() => fileInputRef.current?.click()} 
                                className="mt-4 w-full flex items-center justify-center bg-white border border-gray-300 hover:bg-gray-100 text-gray-800 font-semibold px-4 py-2 rounded-md shadow-sm transition-colors"
                            >
                                <UploadIcon />
                                Upload Photo
                            </button>
                             <p className="text-xs text-gray-500 mt-2 text-center">Optional.</p>
                        </div>
                    </div>
                </div>

                {/* Right Column */}
                <div className="lg:col-span-3 bg-white p-6 rounded-lg shadow-sm">
                    <div className="space-y-8">
                        
                        <fieldset>
                            <legend className="font-semibold text-lg mb-4 text-gray-800">1. Personal Information</legend>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-5">
                                <div className="lg:col-span-3">
                                    <label htmlFor="name-add" className="block text-sm font-medium text-gray-700">Full Name</label>
                                    <input type="text" id="name-add" name="name" value={formData.name} onChange={handleChange} required disabled={isLoading} className="mt-1 block w-full form-input" />
                                </div>
                                 <div>
                                    <label htmlFor="contactNumber-add" className="block text-sm font-medium text-gray-700">Contact Number</label>
                                    <input type="tel" id="contactNumber-add" name="contactNumber" value={formData.contactNumber} onChange={handleChange} required disabled={isLoading} className="mt-1 block w-full form-input" />
                                </div>
                                <div>
                                    <label htmlFor="dob-add" className="block text-sm font-medium text-gray-700">Date of Birth</label>
                                    <input type="date" id="dob-add" name="dob" value={formData.dob} onChange={handleChange} required disabled={isLoading} className="mt-1 block w-full form-input" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Sex</label>
                                    <select name="sex" value={formData.sex} onChange={handleChange} disabled={isLoading} className="mt-1 block w-full form-select">
                                        {Object.values(Sex).map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </div>
                                <div className="lg:col-span-3">
                                    <label htmlFor="address-add" className="block text-sm font-medium text-gray-700">Address</label>
                                    <textarea id="address-add" name="address" rows={2} value={formData.address} onChange={handleChange} required disabled={isLoading} className="mt-1 block w-full form-textarea"></textarea>
                                </div>
                            </div>
                        </fieldset>
                        
                        <fieldset>
                             <legend className="font-semibold text-lg mb-4 text-gray-800">2. Academic Information</legend>
                             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-5">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Class Preference</label>
                                    <select name="classPreference" value={formData.classPreference} onChange={handleChange} disabled={isLoading} className="mt-1 block w-full form-select">
                                        {Object.values(ClassPreference).map(p => <option key={p} value={p}>{p}</option>)}
                                    </select>
                                </div>

                                <div className="lg:col-span-3">
                                    <label className="block text-sm font-medium text-gray-700">Course Selection</label>
                                    <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-2">
                                    {COURSE_OPTIONS.map(course => (
                                            <label key={course} className="flex items-center space-x-2">
                                                <input type="checkbox" value={course} checked={formData.courses?.includes(course)} onChange={handleCourseChange} className="focus:ring-brand-primary h-4 w-4 text-brand-primary border-gray-300 rounded"/>
                                                <span>{course}</span>
                                            </label>
                                    ))}
                                    </div>
                                </div>
                                <div>
                                    <label htmlFor="fatherName-add" className="block text-sm font-medium text-gray-700">Father's Name</label>
                                    <input type="text" id="fatherName-add" name="fatherName" value={formData.fatherName} onChange={handleChange} required disabled={isLoading} className="mt-1 block w-full form-input" />
                                </div>
                                <div>
                                    <label htmlFor="standard-add" className="block text-sm font-medium text-gray-700">Standard Studying</label>
                                    <input type="text" id="standard-add" name="standard" value={formData.standard} onChange={handleChange} required disabled={isLoading} className="mt-1 block w-full form-input" />
                                </div>
                                <div className="lg:col-span-2">
                                    <label htmlFor="schoolName-add" className="block text-sm font-medium text-gray-700">School Name</label>
                                    <input type="text" id="schoolName-add" name="schoolName" value={formData.schoolName} onChange={handleChange} required disabled={isLoading} className="mt-1 block w-full form-input" />
                                </div>
                             </div>
                        </fieldset>
                    </div>
                </div>
            </div>
            
            {error && <p className="text-sm text-red-600 text-center py-4">{error}</p>}

            <div className="flex justify-end pt-8 mt-auto space-x-3">
                <button type="button" onClick={onCancel} className="bg-white py-2 px-6 border border-gray-300 rounded-md shadow-sm text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-primary">
                    Cancel
                </button>
                <button type="submit" disabled={isLoading} className="w-full lg:w-auto inline-flex justify-center py-3 px-8 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-brand-primary hover:bg-brand-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors disabled:bg-indigo-300 disabled:cursor-not-allowed">
                    {isLoading ? 'Saving...' : 'Add Student'}
                </button>
            </div>
        </form>
         <style>{`
            .form-input, .form-select, .form-textarea {
                --tw-ring-color: #3f51b5;
                border-color: #d1d5db;
                border-radius: 0.375rem;
                padding: 0.5rem 0.75rem;
                box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05);
                background-color: #fff;
                 transition: all 0.2s ease-in-out;
            }
            .form-input:focus, .form-select:focus, .form-textarea:focus {
                border-color: #3f51b5;
                box-shadow: 0 0 0 1px #3f51b5;
            }
             .form-input.disabled, .form-select.disabled, .form-textarea.disabled {
                background-color: #f3f4f6;
             }
        `}</style>
    </div>
  );
};

export default AddStudentForm;
