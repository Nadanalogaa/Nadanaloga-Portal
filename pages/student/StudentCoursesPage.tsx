
import React, { useState, useEffect } from 'react';
import { getFamilyStudents, getStudentEnrollmentsForFamily } from '../../api';
import type { User, StudentEnrollment } from '../../types';
import AccordionItem from '../../components/AccordionItem';
import { MapPinIcon } from '../../components/icons';

const StudentCoursesPage: React.FC = () => {
    const [family, setFamily] = useState<User[]>([]);
    const [enrollments, setEnrollments] = useState<Map<string, StudentEnrollment[]>>(new Map());
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchAllData = async () => {
            setIsLoading(true);
            try {
                const familyData = await getFamilyStudents();
                setFamily(familyData);

                const enrollmentPromises = familyData.map(student =>
                    getStudentEnrollmentsForFamily(student.id).then(data => ({ studentId: student.id, data }))
                );
                const results = await Promise.all(enrollmentPromises);
                
                const newEnrollments = new Map<string, StudentEnrollment[]>();
                results.forEach(result => {
                    newEnrollments.set(result.studentId, result.data);
                });
                setEnrollments(newEnrollments);
            } catch (error) {
                console.error("Failed to load family course data:", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchAllData();
    }, []);

    if (isLoading) return <div className="p-8 text-center">Loading course information...</div>;

    return (
        <div className="p-4 sm:p-6 md:p-8">
             <style>{`
                .badge { font-size: 12px; font-weight: 500; padding: 4px 10px; border-radius: 9999px; }
                .badge-blue { background-color: #DBEAFE; color: #1E40AF; }
                .badge-purple { background-color: #EDE9FE; color: #5B21B6; }
            `}</style>
            <h1 className="text-3xl font-bold text-dark-text mb-6">My Courses</h1>

            <div className="space-y-4">
                {family.map((student, index) => {
                    const studentEnrollments = enrollments.get(student.id) || [];
                    return (
                        <AccordionItem key={student.id} title={student.name} startOpen={index === 0}>
                            {studentEnrollments.length > 0 ? (
                                <div className="space-y-4">
                                    {studentEnrollments.map((enrollment, idx) => (
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
                                    ))}
                                </div>
                            ) : (
                                <p className="text-sm text-gray-500">Not enrolled in any courses.</p>
                            )}
                        </AccordionItem>
                    );
                })}
            </div>
        </div>
    );
};

export default StudentCoursesPage;
