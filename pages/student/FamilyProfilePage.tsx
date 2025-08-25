import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import type { User, StudentEnrollment } from '../../types';
import { getFamilyStudents, getStudentEnrollmentsForFamily } from '../../api';
import { MapPinIcon } from '../../components/icons';

const getGuardianEmail = (email?: string): string => {
    if (!email) return '';
    const parts = email.split('@');
    if (parts.length !== 2) return email;
    const username = parts[0].split('+')[0];
    return `${username}@${parts[1]}`;
};

const InfoField: React.FC<{ label: string; value?: string | null }> = ({ label, value }) => (
    <div>
        <h4 className="text-xs font-medium text-gray-500 uppercase">{label}</h4>
        <p className="text-gray-800 mt-1 text-sm">{value || <span className="text-gray-400 italic">Not Provided</span>}</p>
    </div>
);

const StudentProfileTab: React.FC<{ student: User }> = ({ student }) => (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        <InfoField label="Full Name" value={student.name} />
        <InfoField label="Date of Birth" value={student.dob ? new Date(student.dob).toLocaleDateString() : null} />
        <InfoField label="Gender" value={student.sex} />
        <InfoField label="School" value={student.schoolName} />
        <InfoField label="Standard" value={student.standard} />
        <InfoField label="Grade" value={student.grade} />
        <InfoField label="Date of Joining" value={student.dateOfJoining ? new Date(student.dateOfJoining).toLocaleDateString() : null} />
        <InfoField label="Class Preference" value={student.classPreference} />
        {student.classPreference === 'Offline' && student.location && (
            <div>
                <h4 className="text-xs font-medium text-gray-500 uppercase">Location</h4>
                <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(student.location.address)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center space-x-1 mt-1 text-purple-700 hover:underline"
                >
                    <MapPinIcon className="h-4 w-4" />
                    <span className="text-sm">{student.location.name}</span>
                </a>
            </div>
        )}
        <div className="sm:col-span-2 md:col-span-3">
            <h4 className="text-xs font-medium text-gray-500 uppercase">Enrolled Courses</h4>
            {student.courses && student.courses.length > 0 ? (
                <div className="flex flex-wrap gap-2 mt-2">
                    {student.courses.map(c => <span key={c} className="badge-blue">{c}</span>)}
                </div>
            ) : <p className="text-gray-400 italic text-sm mt-1">Not enrolled in any courses.</p>}
        </div>
        <div className="sm:col-span-2 md:col-span-3">
            <h4 className="text-xs font-medium text-gray-500 uppercase">Preferred Timings</h4>
            {student.preferredTimings && student.preferredTimings.length > 0 ? (
                <div className="flex flex-wrap gap-2 mt-2">
                    {student.preferredTimings.map(t => <span key={t} className="badge-yellow">{t}</span>)}
                </div>
            ) : <p className="text-gray-400 italic text-sm mt-1">No preferred timings set.</p>}
        </div>
    </div>
);

const StudentScheduleTab: React.FC<{ studentId: string }> = ({ studentId }) => {
    const [enrollments, setEnrollments] = useState<StudentEnrollment[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchEnrollments = async () => {
            setIsLoading(true);
            try {
                const data = await getStudentEnrollmentsForFamily(studentId);
                setEnrollments(data);
            } catch (error) {
                console.error("Failed to fetch enrollments for student", studentId, error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchEnrollments();
    }, [studentId]);

    if (isLoading) return <p>Loading schedule...</p>;

    return (
        <div className="space-y-4">
            {enrollments.length > 0 ? enrollments.map((enrollment, idx) => (
                <div key={idx} className="p-4 bg-light-purple/60 rounded-lg border border-brand-purple/20">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="font-semibold text-dark-text">{enrollment.courseName}: <span className="font-normal">in "{enrollment.batchName}"</span></p>
                            <p className="text-sm text-light-text">Teacher: {enrollment.teacher?.name || 'Not Assigned'}</p>
                            {enrollment.mode === 'Offline' && enrollment.location && (
                                <a 
                                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(enrollment.location.address)}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center space-x-1 text-sm text-purple-700 hover:underline mt-1"
                                    >
                                    <MapPinIcon className="h-4 w-4" />
                                    <span>{enrollment.location.name}</span>
                                </a>
                            )}
                        </div>
                        {enrollment.mode && (
                            <span className={`badge ${enrollment.mode === 'Online' ? 'badge-blue' : 'badge-purple'}`}>{enrollment.mode}</span>
                        )}
                    </div>
                    <ul className="text-sm list-disc list-inside ml-4 mt-2 space-y-1 text-gray-700">
                        {enrollment.timings.map(t => <li key={t}>{t}</li>)}
                    </ul>
                </div>
            )) : (
                 <div className="text-center text-sm text-gray-500 py-8 border-2 border-dashed rounded-lg">
                    <p>This student is not currently assigned to a batch.</p>
                </div>
            )}
        </div>
    );
};


const FamilyProfilePage: React.FC = () => {
    const [family, setFamily] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeStudentIndex, setActiveStudentIndex] = useState(0);
    const [activeSubTab, setActiveSubTab] = useState<'profile' | 'schedule'>('profile');

    useEffect(() => {
        const fetchFamily = async () => {
            setIsLoading(true);
            try {
                const data = await getFamilyStudents();
                setFamily(data);
            } catch (err) {
                setError(err instanceof Error ? err.message : "Could not fetch family data.");
            } finally {
                setIsLoading(false);
            }
        };
        fetchFamily();
    }, []);

    const activeStudent = family[activeStudentIndex];

    if (isLoading) return <div className="p-8 text-center">Loading family profiles...</div>;
    if (error) return <div className="p-8 text-red-500">{error}</div>;

    return (
        <div className="p-4 sm:p-6 md:p-8">
            <style>{`
                .badge { font-size: 12px; font-weight: 500; padding: 4px 10px; border-radius: 9999px; }
                .badge-blue { background-color: #DBEAFE; color: #1E40AF; }
                .badge-purple { background-color: #EDE9FE; color: #5B21B6; }
                .badge-yellow { background-color: #FEF3C7; color: #92400E; }
            `}</style>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-dark-text">Students Profile</h1>
                <Link to="/dashboard/student/add" className="bg-brand-purple hover:bg-opacity-90 text-white font-semibold px-4 py-2 rounded-lg shadow-sm transition-colors">
                    + Add New Student
                </Link>
            </div>

            {family.length > 0 && activeStudent ? (
                <div className="bg-white p-6 rounded-2xl shadow-lg">
                    {/* Student Tabs */}
                    <div className="flex items-center border-b border-gray-200 mb-6 space-x-4">
                        {family.map((student, index) => (
                            <button
                                key={student.id}
                                onClick={() => { setActiveStudentIndex(index); setActiveSubTab('profile'); }}
                                className={`flex items-center space-x-3 pb-3 border-b-2 transition-colors ${activeStudentIndex === index ? 'border-brand-purple text-brand-purple' : 'border-transparent text-light-text hover:text-dark-text'}`}
                            >
                               <img src={student.photoUrl || `https://ui-avatars.com/api/?name=${student.name}&background=e8eaf6&color=1a237e&size=64`} alt={student.name} className="w-8 h-8 rounded-full"/>
                                <span className="font-medium text-sm">{student.name}</span>
                            </button>
                        ))}
                    </div>
                    
                    {/* Profile Header for active student */}
                    <div className="flex items-center space-x-4 mb-6">
                         <img src={activeStudent.photoUrl || `https://ui-avatars.com/api/?name=${activeStudent.name}&background=7B61FF&color=fff&size=128`} alt={activeStudent.name} className="w-20 h-20 rounded-full object-cover"/>
                         <div>
                            <h2 className="text-2xl font-bold text-dark-text">{activeStudent.name}</h2>
                            <p className="text-light-text">{getGuardianEmail(activeStudent.email)}</p>
                         </div>
                    </div>

                    {/* Sub-tabs for Profile/Schedule */}
                    <div className="flex space-x-4 border-b border-gray-200 mb-6">
                         <button onClick={() => setActiveSubTab('profile')} className={`py-2 px-1 border-b-2 text-sm font-medium ${activeSubTab === 'profile' ? 'border-brand-purple text-dark-text' : 'border-transparent text-light-text hover:text-dark-text'}`}>
                            Profile Details
                        </button>
                         <button onClick={() => setActiveSubTab('schedule')} className={`py-2 px-1 border-b-2 text-sm font-medium ${activeSubTab === 'schedule' ? 'border-brand-purple text-dark-text' : 'border-transparent text-light-text hover:text-dark-text'}`}>
                            Schedule & Batches
                        </button>
                    </div>

                    {activeSubTab === 'profile' && <StudentProfileTab student={activeStudent} />}
                    {activeSubTab === 'schedule' && <StudentScheduleTab studentId={activeStudent.id} />}
                </div>
            ) : (
                <p>No students found in this family account.</p>
            )}
        </div>
    );
};

export default FamilyProfilePage;