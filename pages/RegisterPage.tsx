import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { UserRole, Sex, ClassPreference, EmploymentType } from '../types';
import type { User, Course, Location } from '../types';
import { registerUser, getCourses, checkEmailExists, getPublicLocations } from '../api';
import PreferredTimingSelector from '../components/registration/PreferredTimingSelector';
import { XCircleIcon } from '../components/icons';
import Stepper from '../components/registration/Stepper';
import { COUNTRIES } from '../constants';

interface RegisterPageProps {
  onLoginNeeded: (email: string) => void;
}

const RegisterPage: React.FC<RegisterPageProps> = ({ onLoginNeeded }) => {
    const [registrationType, setRegistrationType] = useState<'student' | 'teacher' | null>(null);
    
    // Student wizard state
    const [currentStep, setCurrentStep] = useState(1);
    const studentSteps = ["Account Details", "Contact Information", "Student Details"];
    
    // Teacher wizard state
    const [teacherCurrentStep, setTeacherCurrentStep] = useState(1);
    const teacherSteps = ["Account Details", "Contact Information", "Professional Details"];
    
    // Guardian & Student Form State
    const [guardianData, setGuardianData] = useState({ 
        name: '', email: '', password: '', contactNumber: '',
        address: '', country: '', state: '', city: '', postalCode: '',
    });
    const [passwordConfirmation, setPasswordConfirmation] = useState('');
    const [students, setStudents] = useState<Partial<User>[]>([
        { role: UserRole.Student, classPreference: ClassPreference.Online, sex: Sex.Male, courses: [], preferredTimings: [], photoUrl: '' }
    ]);
    const [activeStudentIndex, setActiveStudentIndex] = useState(0);

    // Teacher Form State
    const [teacherData, setTeacherData] = useState<Partial<User>>({ role: UserRole.Teacher, sex: Sex.Male, employmentType: EmploymentType.PartTime, classPreference: ClassPreference.Hybrid, courseExpertise: [], photoUrl: ''});
    const [teacherPasswordConfirmation, setTeacherPasswordConfirmation] = useState('');
    
    // Common State
    const [courses, setCourses] = useState<Course[]>([]);
    const [locations, setLocations] = useState<Location[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    
    const photoInputRef = useRef<HTMLInputElement>(null);

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
                setError("Could not load registration data. Please try again later.");
            } finally {
                setIsLoading(false);
            }
        };
        fetchPrerequisites();
    }, []);

    // --- Student Form Handlers ---
    const handleGuardianChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setGuardianData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    const handleStudentDataChange = (index: number, field: keyof User, value: any) => setStudents(prev => {
        const newStudents = [...prev];
        const student = { ...newStudents[index], [field]: value };
        // If changing to online, clear locationId
        if (field === 'classPreference' && value === ClassPreference.Online) {
            delete student.locationId;
        }
        newStudents[index] = student;
        return newStudents;
    });
    const handleStudentCourseChange = (index: number, courseName: string, isChecked: boolean) => {
        const student = students[index];
        const currentCourses = student.courses || [];
        const updatedCourses = isChecked ? [...currentCourses, courseName] : currentCourses.filter(c => c !== courseName);
        handleStudentDataChange(index, 'courses', updatedCourses);
    };
    const handleAddStudent = () => {
        setStudents(prev => {
            const newStudents = [...prev, { role: UserRole.Student, classPreference: ClassPreference.Online, sex: Sex.Male, courses: [], preferredTimings: [], photoUrl: '' }];
            setActiveStudentIndex(newStudents.length - 1);
            return newStudents;
        });
    };
    const handleRemoveStudent = (indexToRemove: number) => {
        if (students.length > 1) {
            const newStudents = students.filter((_, i) => i !== indexToRemove);
            setStudents(newStudents);
            setActiveStudentIndex(prev => Math.min(prev, newStudents.length - 1));
        }
    };

    // --- Teacher Form Handlers ---
    const handleTeacherChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        const newTeacherData = {...teacherData, [name]: value};
        if (name === 'classPreference' && value !== ClassPreference.Offline) {
            delete newTeacherData.locationId;
        }
        setTeacherData(newTeacherData);
    };
    const handleTeacherExpertiseChange = (courseName: string, isChecked: boolean) => {
        const current = teacherData.courseExpertise || [];
        const updated = isChecked ? [...current, courseName] : current.filter(c => c !== courseName);
        setTeacherData(prev => ({...prev, courseExpertise: updated}));
    }

    // --- Common Handlers ---
    const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>, forTeacher: boolean) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onloadend = () => {
                const photoUrl = reader.result as string;
                if(forTeacher) {
                    setTeacherData(prev => ({...prev, photoUrl}));
                } else {
                    handleStudentDataChange(activeStudentIndex, 'photoUrl', photoUrl);
                }
            };
            reader.readAsDataURL(file);
        }
    };
    const handleRemovePhoto = (forTeacher: boolean) => {
        if(forTeacher) {
            setTeacherData(prev => ({...prev, photoUrl: ''}));
        } else {
            handleStudentDataChange(activeStudentIndex, 'photoUrl', '');
        }
    };
    const handleBackToSelection = () => {
        setRegistrationType(null);
        setError(null);
        setCurrentStep(1);
        setTeacherCurrentStep(1);
    };

    // --- Form Submission & Validation ---
    const handleNextStep = async () => {
        setError(null);
        if (!guardianData.name.trim() || !guardianData.email.trim() || !guardianData.password || !guardianData.contactNumber.trim()) return setError("All account details are required.");
        if (guardianData.password.length < 6) return setError("Password must be at least 6 characters long.");
        if (guardianData.password !== passwordConfirmation) return setError("Passwords do not match.");
        
        setIsLoading(true);
        try {
            const { exists } = await checkEmailExists(guardianData.email.toLowerCase());
            if (exists) {
                setError("This email is already registered. Please log in instead.");
                onLoginNeeded(guardianData.email);
            } else {
                setCurrentStep(2);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "Could not verify email.");
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleContactNextStep = () => {
        setError(null);
        if (!guardianData.address.trim() || !guardianData.country.trim() || !guardianData.state.trim() || !guardianData.city.trim() || !guardianData.postalCode.trim()) {
            return setError("All contact information fields are required.");
        }
        setCurrentStep(3);
    };
    
    const handlePreviousStep = () => { setError(null); setCurrentStep(prev => prev - 1); };

    const handleTeacherNextStep = async () => {
        setError(null);
        if (!teacherData.name?.trim() || !teacherData.email?.trim() || !teacherData.password || !teacherData.contactNumber?.trim()) {
            return setError("All account details are required.");
        }
        if (teacherData.password.length < 6) {
            return setError("Password must be at least 6 characters long.");
        }
        if (teacherData.password !== teacherPasswordConfirmation) {
            return setError("Passwords do not match.");
        }

        setIsLoading(true);
        try {
            const { exists } = await checkEmailExists(teacherData.email.toLowerCase());
            if (exists) {
                setError("This email is already registered. Please log in instead.");
                onLoginNeeded(teacherData.email);
            } else {
                setTeacherCurrentStep(2);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "Could not verify email.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleTeacherContactNextStep = () => {
        setError(null);
        if (!teacherData.address?.trim() || !teacherData.country?.trim() || !teacherData.state?.trim() || !teacherData.city?.trim() || !teacherData.postalCode?.trim()) {
            return setError("All contact information fields are required.");
        }
        setTeacherCurrentStep(3);
    };

    const handleTeacherPreviousStep = () => {
        setError(null);
        setTeacherCurrentStep(prev => prev - 1);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsLoading(true);

        try {
            let usersToRegister: Partial<User>[] = [];
            const commonContactInfo = {
                address: guardianData.address,
                country: guardianData.country,
                state: guardianData.state,
                city: guardianData.city,
                postalCode: guardianData.postalCode,
            };

            if (registrationType === 'student') {
                for (let i = 0; i < students.length; i++) {
                    const student = students[i];
                    if (!student.name?.trim() || !student.dob || !student.courses || student.courses.length === 0) {
                        setActiveStudentIndex(i);
                        setCurrentStep(3);
                        throw new Error(`Please complete all required fields for Student ${i + 1}.`);
                    }
                    if (student.classPreference === ClassPreference.Offline && !student.locationId) {
                         setActiveStudentIndex(i);
                         setCurrentStep(3);
                         throw new Error(`Please select a location for Student ${i + 1}.`);
                    }
                }
                usersToRegister = students.map((student, index) => ({
                    ...student, 
                    fatherName: guardianData.name, 
                    contactNumber: guardianData.contactNumber,
                    ...commonContactInfo,
                    email: index === 0 ? guardianData.email.toLowerCase() : `${guardianData.email.split('@')[0]}+student${index + 1}@${guardianData.email.split('@')[1]}`.toLowerCase(),
                    password: guardianData.password, dateOfJoining: new Date().toISOString(),
                }));
            } else if (registrationType === 'teacher') {
                 if (!teacherData.dob || !teacherData.educationalQualifications?.trim() || (teacherData.courseExpertise || []).length === 0) {
                    setTeacherCurrentStep(3);
                    throw new Error("Please complete your professional details, including DOB, qualifications, and at least one course expertise.");
                }
                if (teacherData.classPreference === ClassPreference.Offline && !teacherData.locationId) {
                    setTeacherCurrentStep(3);
                    throw new Error("Please select a location for offline classes.");
                }
                usersToRegister.push({ ...teacherData, email: teacherData.email!.toLowerCase(), dateOfJoining: new Date().toISOString() });
            }

            await registerUser(usersToRegister);
            setSuccess(true);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Could not complete registration.');
        } finally {
            setIsLoading(false);
        }
    };

    // --- Render Logic ---
    if (success) {
        const loginEmail = registrationType === 'student' ? guardianData.email : teacherData.email || '';
        return (
            <div className="container mx-auto px-6 py-16 text-center">
                <h1 className="text-3xl font-bold text-green-600">Registration Successful!</h1>
                <p className="mt-4 text-lg text-gray-700">Thank you for registering. You can now log in to your account.</p>
                <button onClick={() => onLoginNeeded(loginEmail)} className="mt-8 btn-primary-lg">Login Now</button>
            </div>
        );
    }
    
    const renderContactForm = (data: any, handler: any) => (
        <fieldset className="mt-4">
            <legend className="form-legend">Contact Information</legend>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                <div className="md:col-span-2">
                    <label className="form-label">Address</label>
                    <textarea name="address" value={data.address || ''} onChange={handler} required className="form-textarea w-full" rows={3}></textarea>
                </div>
                <div>
                    <label className="form-label">Country</label>
                    <select name="country" value={data.country || ''} onChange={handler} required className="form-select w-full">
                        <option value="">Select Country</option>
                        {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                </div>
                <div>
                    <label className="form-label">State / Province</label>
                    <input name="state" value={data.state || ''} onChange={handler} required className="form-input"/>
                </div>
                <div>
                    <label className="form-label">City / Location</label>
                    <input name="city" value={data.city || ''} onChange={handler} required className="form-input"/>
                </div>
                <div>
                    <label className="form-label">Postal Code</label>
                    <input name="postalCode" value={data.postalCode || ''} onChange={handler} required className="form-input"/>
                </div>
            </div>
        </fieldset>
    );

    const renderStudentForm = () => {
        const currentStudentData = students[activeStudentIndex] || {};
        return <>
            <Stepper steps={studentSteps} currentStep={currentStep} />
            {currentStep === 1 && (
                <fieldset className="mt-4"><legend className="form-legend">Guardian Account Details</legend>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-x-6 gap-y-5">
                        <div><label className="form-label">Full Name</label><input name="name" value={guardianData.name} onChange={handleGuardianChange} required className="form-input"/></div>
                        <div><label className="form-label">Email Address</label><input name="email" type="email" value={guardianData.email} onChange={handleGuardianChange} required className="form-input"/></div>
                        <div><label className="form-label">Password</label><input name="password" type="password" value={guardianData.password} onChange={handleGuardianChange} required className="form-input"/></div>
                        <div><label className="form-label">Confirm Password</label><input name="passwordConfirmation" type="password" value={passwordConfirmation} onChange={(e) => setPasswordConfirmation(e.target.value)} required className="form-input"/></div>
                        <div><label className="form-label">Contact Number</label><input name="contactNumber" type="tel" value={guardianData.contactNumber} onChange={handleGuardianChange} required className="form-input"/></div>
                    </div>
                </fieldset>
            )}
            {currentStep === 2 && renderContactForm(guardianData, handleGuardianChange)}
            {currentStep === 3 && (
                 <fieldset><legend className="form-legend">Student Details</legend>
                    <div className="border-b border-gray-200"><nav className="-mb-px flex space-x-2">{students.map((s, i) => <div key={i} className="relative"><button type="button" onClick={() => setActiveStudentIndex(i)} className={`whitespace-nowrap py-3 px-1 border-b-2 text-sm font-medium transition-colors ${activeStudentIndex === i ? 'border-brand-primary text-brand-primary' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>{s.name || `Student ${i + 1}`}</button>{students.length > 1 && <button type="button" onClick={() => handleRemoveStudent(i)} className="absolute -top-1 -right-1 bg-red-100 text-red-600 rounded-full h-5 w-5 flex items-center justify-center text-xs font-bold hover:bg-red-200">&times;</button>}</div>)}<button type="button" onClick={handleAddStudent} className="px-3 py-2 text-sm font-medium text-brand-primary hover:bg-brand-light rounded-t-md">+ Add Student</button></nav></div>
                    <div className="pt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2 space-y-5">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div><label className="form-label">Full Name</label><input type="text" value={currentStudentData.name || ''} onChange={e => handleStudentDataChange(activeStudentIndex, 'name', e.target.value)} required className="form-input"/></div>
                                <div><label className="form-label">Date of Birth</label><input type="date" value={currentStudentData.dob || ''} onChange={e => handleStudentDataChange(activeStudentIndex, 'dob', e.target.value)} required className="form-input"/></div>
                                <div><label className="form-label">Gender</label><select value={currentStudentData.sex} onChange={e => handleStudentDataChange(activeStudentIndex, 'sex', e.target.value)} className="form-select">{Object.values(Sex).map(s => <option key={s} value={s}>{s}</option>)}</select></div>
                                <div><label className="form-label">Class Preference</label><select value={currentStudentData.classPreference} onChange={e => handleStudentDataChange(activeStudentIndex, 'classPreference', e.target.value)} className="form-select">{[ClassPreference.Online, ClassPreference.Offline].map(s => <option key={s} value={s}>{s}</option>)}</select></div>
                                {currentStudentData.classPreference === ClassPreference.Offline && (
                                    <div>
                                        <label className="form-label">Location</label>
                                        <select value={currentStudentData.locationId || ''} onChange={e => handleStudentDataChange(activeStudentIndex, 'locationId', e.target.value)} required className="form-select">
                                            <option value="">Select Location</option>
                                            {locations.map(loc => <option key={loc.id} value={loc.id}>{loc.name}</option>)}
                                        </select>
                                    </div>
                                )}
                            </div>
                            <div><label className="form-label">Course Selection</label><div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-2">{courses.map(c => <label key={c.id} className="flex items-center space-x-2 p-2 border rounded-lg hover:bg-gray-50 text-sm"><input type="checkbox" value={c.name} checked={currentStudentData.courses?.includes(c.name)} onChange={(e) => handleStudentCourseChange(activeStudentIndex, c.name, e.target.checked)} className="h-4 w-4 rounded text-brand-primary focus:ring-brand-primary"/><span>{c.name}</span></label>)}</div></div>
                        </div>
                        <div className="lg:col-span-1 flex flex-col items-center">
                            <label className="form-label">Profile Photo (Optional)</label>
                            <div className="relative group w-32 h-32 bg-brand-light/30 rounded-full overflow-hidden flex items-center justify-center"><img src={currentStudentData.photoUrl || `https://ui-avatars.com/api/?name=${currentStudentData.name || '?'}&background=e8eaf6&color=1a237e&size=128&font-size=0.5`} alt="Preview" className="w-full h-full object-cover"/>{currentStudentData.photoUrl && <button type="button" onClick={() => handleRemovePhoto(false)} className="absolute top-1 right-1 btn-remove-photo"><XCircleIcon /></button>}</div>
                            <input type="file" ref={photoInputRef} onChange={(e) => handlePhotoChange(e, false)} className="hidden" accept="image/*"/>
                            <button type="button" onClick={() => photoInputRef.current?.click()} className="mt-2 text-sm text-brand-primary hover:underline">Upload Photo</button>
                        </div>
                        {(currentStudentData.courses?.length || 0) > 0 && <div className="lg:col-span-3 pt-6 border-t"><label className="form-label">Preferred Timings (Optional)</label><p className="text-sm text-gray-500 mb-4">Help us find the best batch for this student.</p><PreferredTimingSelector selectedTimings={currentStudentData.preferredTimings || []} onChange={(timings) => handleStudentDataChange(activeStudentIndex, 'preferredTimings', timings)} /></div>}
                    </div>
                 </fieldset>
            )}
        </>;
    };

    const renderTeacherForm = () => (
        <>
            <Stepper steps={teacherSteps} currentStep={teacherCurrentStep} />
            {teacherCurrentStep === 1 && (
                 <fieldset className="mt-4">
                    <legend className="form-legend">Account Details</legend>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-x-6 gap-y-5">
                        <div><label className="form-label">Full Name</label><input name="name" value={teacherData.name || ''} onChange={handleTeacherChange} required className="form-input"/></div>
                        <div><label className="form-label">Email Address</label><input name="email" type="email" value={teacherData.email || ''} onChange={handleTeacherChange} required className="form-input"/></div>
                        <div><label className="form-label">Password</label><input name="password" type="password" value={teacherData.password || ''} onChange={handleTeacherChange} required className="form-input"/></div>
                        <div><label className="form-label">Confirm Password</label><input name="teacherPasswordConfirmation" type="password" value={teacherPasswordConfirmation} onChange={(e) => setTeacherPasswordConfirmation(e.target.value)} required className="form-input"/></div>
                        <div><label className="form-label">Contact Number</label><input name="contactNumber" type="tel" value={teacherData.contactNumber || ''} onChange={handleTeacherChange} required className="form-input"/></div>
                    </div>
                </fieldset>
            )}
            {teacherCurrentStep === 2 && renderContactForm(teacherData, handleTeacherChange)}
            {teacherCurrentStep === 3 && (
                <fieldset>
                    <legend className="form-legend">Professional Details</legend>
                    <div className="pt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2 space-y-5">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div><label className="form-label">Date of Birth</label><input name="dob" type="date" value={teacherData.dob || ''} onChange={handleTeacherChange} required className="form-input"/></div>
                                <div><label className="form-label">Gender</label><select name="sex" value={teacherData.sex} onChange={handleTeacherChange} className="form-select">{Object.values(Sex).map(s=><option key={s} value={s}>{s}</option>)}</select></div>
                                <div><label className="form-label">Employment</label><select name="employmentType" value={teacherData.employmentType} onChange={handleTeacherChange} className="form-select">{Object.values(EmploymentType).map(s=><option key={s} value={s}>{s}</option>)}</select></div>
                                <div><label className="form-label">Class Preference</label><select name="classPreference" value={teacherData.classPreference} onChange={handleTeacherChange} className="form-select">{Object.values(ClassPreference).map(s=><option key={s} value={s}>{s}</option>)}</select></div>
                                {teacherData.classPreference === ClassPreference.Offline && (
                                    <div>
                                        <label className="form-label">Location</label>
                                        <select name="locationId" value={teacherData.locationId || ''} onChange={handleTeacherChange} required className="form-select">
                                            <option value="">Select Location</option>
                                            {locations.map(loc => <option key={loc.id} value={loc.id}>{loc.name}</option>)}
                                        </select>
                                    </div>
                                )}
                                <div className="md:col-span-2"><label className="form-label">Educational Qualifications</label><input name="educationalQualifications" value={teacherData.educationalQualifications || ''} onChange={handleTeacherChange} required className="form-input"/></div>
                            </div>
                            <div><label className="form-label">Course Expertise</label><div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-2">{courses.map(c => <label key={c.id} className="flex items-center space-x-2 p-2 border rounded-lg hover:bg-gray-50 text-sm"><input type="checkbox" value={c.name} checked={teacherData.courseExpertise?.includes(c.name)} onChange={e=>handleTeacherExpertiseChange(c.name, e.target.checked)} className="h-4 w-4 rounded text-brand-primary focus:ring-brand-primary"/><span>{c.name}</span></label>)}</div></div>
                        </div>
                        <div className="lg:col-span-1 flex flex-col items-center">
                            <label className="form-label">Profile Photo (Optional)</label>
                            <div className="relative group w-32 h-32 bg-brand-light/30 rounded-full overflow-hidden flex items-center justify-center"><img src={teacherData.photoUrl || `https://ui-avatars.com/api/?name=${teacherData.name || '?'}&background=e8eaf6&color=1a237e&size=128&font-size=0.5`} alt="Preview" className="w-full h-full object-cover"/>{teacherData.photoUrl && <button type="button" onClick={() => handleRemovePhoto(true)} className="absolute top-1 right-1 btn-remove-photo"><XCircleIcon /></button>}</div>
                            <input type="file" ref={photoInputRef} onChange={e => handlePhotoChange(e, true)} className="hidden" accept="image/*"/>
                            <button type="button" onClick={() => photoInputRef.current?.click()} className="mt-2 text-sm text-brand-primary hover:underline">Upload Photo</button>
                        </div>
                    </div>
                </fieldset>
            )}
        </>
    );

    return (
        <div className="bg-gray-50 py-12">
            <style>{`
                .form-legend { font-size: 1.125rem; font-weight: 600; color: #1a237e; margin-bottom: 1rem; padding-bottom: 0.5rem; border-bottom: 1px solid #e0e0e0; }
                .btn-primary-lg { display: inline-flex; justify-content: center; padding: 0.75rem 2rem; border: 1px solid transparent; border-radius: 0.375rem; box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05); font-size: 1rem; font-weight: 500; color: white; background-color: #1a237e; }
                .btn-primary-lg:hover { background-color: #0d113d; }
                .btn-secondary { display: inline-flex; justify-content: center; padding: 0.75rem 2rem; border: 1px solid #d1d5db; border-radius: 0.375rem; box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05); font-size: 1rem; font-weight: 500; color: #374151; background-color: white; }
                .btn-secondary:hover { background-color: #f9fafb; }
                .btn-remove-photo { background-color: rgba(255,255,255,0.7); color: #374151; border-radius: 9999px; padding: 0.25rem; opacity: 0; transition: opacity 0.2s; }
                .group:hover .btn-remove-photo { opacity: 1; }
            `}</style>
            <div className="container mx-auto px-6">
                <div className="max-w-5xl mx-auto bg-white p-6 md:p-8 rounded-xl shadow-2xl">
                    <div className="text-center mb-4">
                        <h1 className="text-3xl font-bold text-brand-primary">Join Nadanaloga</h1>
                        <p className="text-gray-600 mt-2">Create an account as a guardian or a teacher.</p>
                    </div>
                    {error && <div className="text-sm text-red-600 text-center bg-red-50 p-3 rounded-md my-4">{error}</div>}
                    
                    {!registrationType ? (
                        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                           <button onClick={() => setRegistrationType('student')} className="p-8 border rounded-lg text-left hover:border-brand-primary hover:shadow-lg transition-all">
                                <h2 className="text-xl font-bold text-brand-dark">Register as a Guardian/Student</h2>
                                <p className="mt-2 text-gray-600">Create an account to enroll one or more students in our courses.</p>
                           </button>
                           <button onClick={() => setRegistrationType('teacher')} className="p-8 border rounded-lg text-left hover:border-brand-primary hover:shadow-lg transition-all">
                                <h2 className="text-xl font-bold text-brand-dark">Register as a Teacher</h2>
                                <p className="mt-2 text-gray-600">Apply to join our team of talented instructors.</p>
                           </button>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="mt-4">
                            {registrationType === 'student' ? renderStudentForm() : renderTeacherForm()}
                            <div className="pt-6 mt-6 border-t flex justify-between items-center">
                                <div className="flex items-center space-x-2">
                                    <button type="button" onClick={handleBackToSelection} className="btn-secondary">Back</button>
                                    {((registrationType === 'student' && currentStep > 1) || (registrationType === 'teacher' && teacherCurrentStep > 1)) && (
                                        <button 
                                            type="button" 
                                            onClick={registrationType === 'student' ? handlePreviousStep : handleTeacherPreviousStep} 
                                            disabled={isLoading} 
                                            className="btn-secondary"
                                        >
                                            Previous
                                        </button>
                                    )}
                                </div>

                                {registrationType === 'student' && currentStep === 1 && <button type="button" onClick={handleNextStep} disabled={isLoading} className="btn-primary-lg">{isLoading ? 'Verifying...' : 'Next'}</button>}
                                {registrationType === 'student' && currentStep === 2 && <button type="button" onClick={handleContactNextStep} disabled={isLoading} className="btn-primary-lg">Next</button>}
                                {registrationType === 'student' && currentStep === 3 && <button type="submit" disabled={isLoading} className="btn-primary-lg bg-green-600 hover:bg-green-700">{isLoading ? 'Registering...' : 'Complete Registration'}</button>}

                                {registrationType === 'teacher' && teacherCurrentStep === 1 && <button type="button" onClick={handleTeacherNextStep} disabled={isLoading} className="btn-primary-lg">{isLoading ? 'Verifying...' : 'Next'}</button>}
                                {registrationType === 'teacher' && teacherCurrentStep === 2 && <button type="button" onClick={handleTeacherContactNextStep} disabled={isLoading} className="btn-primary-lg">Next</button>}
                                {registrationType === 'teacher' && teacherCurrentStep === 3 && <button type="submit" disabled={isLoading} className="btn-primary-lg bg-green-600 hover:bg-green-700">{isLoading ? 'Registering...' : 'Complete Registration'}</button>}
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};

export default RegisterPage;