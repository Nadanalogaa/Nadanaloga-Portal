import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link, useOutletContext } from 'react-router-dom';
import type { User, Course, Location } from '../types';
import { Sex, ClassPreference, UserRole } from '../types';
import { registerUser, getCourses, getFamilyStudents, getPublicLocations } from '../api';
import PreferredTimingSelector from '../components/registration/PreferredTimingSelector';
import { XCircleIcon } from '../components/icons';
import AdminPageHeader from '../components/admin/AdminPageHeader';

const AddFamilyStudentPage: React.FC = () => {
    const { user } = useOutletContext<{ user: User }>(); // The guardian
    const [studentData, setStudentData] = useState<Partial<User>>({
        classPreference: ClassPreference.Online,
        sex: Sex.Male,
        courses: [],
        preferredTimings: [],
        photoUrl: '',
        name: '',
        dob: ''
    });
    const [guardianPassword, setGuardianPassword] = useState('');
    const [courses, setCourses] = useState<Course[]>([]);
    const [locations, setLocations] = useState<Location[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const photoInputRef = useRef<HTMLInputElement>(null);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchPrerequisites = async () => {
            setIsLoading(true);
            try {
                const [fetchedCourses, fetchedLocations] = await Promise.all([
                    getCourses(),
                    getPublicLocations(),
                ]);
                setCourses(fetchedCourses);
                setLocations(fetchedLocations);
            } catch (err) {
                setError("Could not load course data. Please try again later.");
            } finally {
                setIsLoading(false);
            }
        };
        fetchPrerequisites();
    }, []);

    const handleChange = (field: keyof User, value: any) => {
        setStudentData(prev => {
            const newData = { ...prev, [field]: value };
            if (field === 'classPreference' && value === ClassPreference.Online) {
                delete newData.locationId;
            }
            return newData;
        });
    };

    const handleCourseChange = (courseName: string, isChecked: boolean) => {
        const currentCourses = studentData.courses || [];
        const updatedCourses = isChecked
            ? [...currentCourses, courseName]
            : currentCourses.filter(c => c !== courseName);
        handleChange('courses', updatedCourses);
    };

    const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onloadend = () => {
                handleChange('photoUrl', reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleRemovePhoto = () => {
        handleChange('photoUrl', '');
         if (photoInputRef.current) {
            photoInputRef.current.value = '';
        }
    };
    
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!studentData.name?.trim() || !studentData.dob) {
            setError("Student's name and date of birth are required.");
            return;
        }
        if (!guardianPassword) {
            setError("Please enter your password to confirm this action.");
            return;
        }
        if (studentData.classPreference === ClassPreference.Offline && !studentData.locationId) {
            setError("Please select a location for offline classes.");
            return;
        }


        setIsLoading(true);
        try {
            const familyStudents = await getFamilyStudents();
            const guardian = user;
            const baseEmailParts = guardian.email.split('@');
            const baseUsername = baseEmailParts[0].split('+')[0];
            const domain = baseEmailParts[1];

            const newStudentEmail = `${baseUsername}+student${familyStudents.length + 1}@${domain}`.toLowerCase();

            const userToRegister = {
                ...studentData,
                fatherName: guardian.name,
                contactNumber: guardian.contactNumber,
                email: newStudentEmail,
                password: guardianPassword,
                dateOfJoining: new Date().toISOString(),
                role: UserRole.Student,
            };

            await registerUser([userToRegister]);
            setSuccess(true);
        } catch (err) {
            setError(err instanceof Error ? err.message : "An unknown error occurred while adding the student.");
        } finally {
            setIsLoading(false);
        }
    };

    if (success) {
        return (
            <div className="container mx-auto px-6 py-16 text-center">
                <h1 className="text-3xl font-bold text-green-600">Student Added Successfully!</h1>
                <p className="mt-4 text-lg text-gray-700">The new student has been added to your family account.</p>
                <Link
                    to="/dashboard/student"
                    className="mt-8 inline-block bg-brand-primary text-white font-semibold px-8 py-3 rounded-full shadow-md hover:bg-brand-dark transition-colors"
                >
                    Back to Dashboard
                </Link>
            </div>
        );
    }

    return (
        <div className="bg-gray-50 py-12">
            <style>{`.form-legend { font-size: 1.125rem; font-weight: 600; color: #1a237e; margin-bottom: 1.25rem; padding-bottom: 0.5rem; border-bottom: 1px solid #e0e0e0; }`}</style>
            <div className="container mx-auto px-6">
                <div className="max-w-5xl mx-auto">
                    <AdminPageHeader
                        title="Add New Student"
                        subtitle={`Registering under ${user.name}'s family account.`}
                        backLinkPath="/dashboard/student"
                        backTooltipText="Back to Family Dashboard"
                    />
                    <form onSubmit={handleSubmit} className="bg-white p-6 md:p-8 rounded-xl shadow-2xl">
                        {error && <div className="text-sm text-red-600 text-center bg-red-50 p-3 rounded-md my-4">{error}</div>}
                        
                        <fieldset>
                            <legend className="form-legend">Student Details</legend>
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-x-6 gap-y-5">
                                <div className="lg:col-span-2">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                                        <div><label className="form-label">Student's Full Name</label><input type="text" value={studentData.name || ''} onChange={e => handleChange('name', e.target.value)} required className="form-input"/></div>
                                        <div><label className="form-label">Date of Birth</label><input type="date" value={studentData.dob || ''} onChange={e => handleChange('dob', e.target.value)} required className="form-input"/></div>
                                        <div><label className="form-label">Gender</label><select value={studentData.sex} onChange={e => handleChange('sex', e.target.value)} className="form-select">{Object.values(Sex).map(s => <option key={s} value={s}>{s}</option>)}</select></div>
                                    </div>
                                </div>
                                <div className="lg:col-span-1">
                                    <label className="form-label text-center">Profile Photo (Optional)</label>
                                    <div className="flex flex-col items-center">
                                        <div className="relative group w-32 h-32 bg-brand-light/30 rounded-full flex items-center justify-center overflow-hidden">
                                            <img src={studentData.photoUrl || `https://ui-avatars.com/api/?name=${studentData.name || '?'}&background=e8eaf6&color=1a237e&size=128&font-size=0.5`} alt="Profile Preview" className="w-full h-full object-cover"/>
                                            {studentData.photoUrl && <button type="button" onClick={handleRemovePhoto} className="absolute top-1 right-1 bg-white/70 text-gray-700 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white" aria-label="Remove photo"><XCircleIcon /></button>}
                                        </div>
                                        <input type="file" ref={photoInputRef} onChange={handlePhotoChange} className="hidden" accept="image/png, image/jpeg"/>
                                        <button type="button" onClick={() => photoInputRef.current?.click()} className="mt-2 text-sm text-brand-primary hover:underline">Upload Photo</button>
                                    </div>
                                </div>
                                <div className="lg:col-span-3">
                                    <label className="form-label">Class Preference</label>
                                    <div className="grid grid-cols-2 gap-2 max-w-xs">
                                        <button type="button" onClick={() => handleChange('classPreference', ClassPreference.Online)} className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors border ${studentData.classPreference === ClassPreference.Online ? 'bg-brand-primary text-white border-brand-primary' : 'bg-white text-gray-700 hover:bg-gray-100'}`}>Online</button>
                                        <button type="button" onClick={() => handleChange('classPreference', ClassPreference.Offline)} className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors border ${studentData.classPreference === ClassPreference.Offline ? 'bg-brand-primary text-white border-brand-primary' : 'bg-white text-gray-700 hover:bg-gray-100'}`}>Offline</button>
                                    </div>
                                </div>
                                 {studentData.classPreference === ClassPreference.Offline && (
                                    <div className="lg:col-span-3">
                                        <label className="form-label">Location</label>
                                        <select
                                            value={studentData.locationId || ''}
                                            onChange={e => handleChange('locationId', e.target.value)}
                                            required
                                            className="form-select w-full max-w-xs"
                                        >
                                            <option value="" disabled>Select a location</option>
                                            {locations.map(loc => (
                                                <option key={loc.id} value={loc.id}>
                                                    {loc.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                                <div className="lg:col-span-3">
                                    <label className="form-label">Course Selection</label>
                                    <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-2">{courses.map(c => <label key={c.id} className="flex items-center space-x-2 p-2 border rounded-lg hover:bg-gray-50 text-sm"><input type="checkbox" value={c.name} checked={studentData.courses?.includes(c.name)} onChange={(e) => handleCourseChange(c.name, e.target.checked)} className="h-4 w-4 border-gray-300 rounded text-brand-primary focus:ring-brand-primary"/><span>{c.name}</span></label>)}</div>
                                </div>
                                {(studentData.courses?.length || 0) > 0 && 
                                    <div className="lg:col-span-3 pt-6 border-t">
                                        <label className="form-label">Preferred Timings (Optional)</label>
                                        <p className="text-sm text-gray-500 mb-4">Help us find the best batch for this student.</p>
                                        <PreferredTimingSelector selectedTimings={studentData.preferredTimings || []} onChange={(timings) => handleChange('preferredTimings', timings)} />
                                    </div>
                                }
                            </div>
                        </fieldset>

                        <fieldset className="mt-6 pt-6 border-t">
                            <legend className="form-legend">Confirm Action</legend>
                            <div>
                                <label className="form-label">Enter Your Password</label>
                                <p className="text-sm text-gray-500 mb-2">For security, please confirm your account password to add a new student.</p>
                                <input type="password" value={guardianPassword} onChange={e => setGuardianPassword(e.target.value)} required className="form-input max-w-sm" />
                            </div>
                        </fieldset>
                        
                        <div className="pt-6 mt-6 border-t flex justify-end items-center">
                            <button type="button" onClick={() => navigate('/dashboard/student')} disabled={isLoading} className="bg-white hover:bg-gray-100 text-gray-800 font-semibold px-6 py-3 rounded-md shadow-sm transition-colors border mr-4">
                                Cancel
                            </button>
                            <button type="submit" disabled={isLoading} className="inline-flex justify-center py-3 px-8 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-brand-primary hover:bg-brand-dark disabled:bg-indigo-400">
                                {isLoading ? 'Adding Student...' : 'Add Student'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default AddFamilyStudentPage;