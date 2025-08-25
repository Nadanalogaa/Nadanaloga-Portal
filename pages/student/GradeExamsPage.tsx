import React, { useState, useEffect } from 'react';
import type { GradeExam, User } from '../../types';
import { getGradeExams, getFamilyStudents } from '../../api';
import AccordionItem from '../../components/AccordionItem';

const GradeExamsPage: React.FC = () => {
    const [examsByStudent, setExamsByStudent] = useState<Map<string, GradeExam[]>>(new Map());
    const [family, setFamily] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            try {
                const [familyData, allExamsForFamily] = await Promise.all([
                    getFamilyStudents(),
                    getGradeExams(),
                ]);

                setFamily(familyData);
                
                const examsMap = new Map<string, GradeExam[]>();
                familyData.forEach(student => examsMap.set(student.id, []));

                allExamsForFamily.forEach(exam => {
                    familyData.forEach(student => {
                        if (exam.recipientIds?.includes(student.id)) {
                            const studentExams = examsMap.get(student.id) || [];
                            studentExams.push(exam);
                            examsMap.set(student.id, studentExams);
                        }
                    });
                });

                setExamsByStudent(examsMap);

            } catch (error) {
                console.error("Failed to fetch grade exams:", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, []);
    
    if (isLoading) return <div className="p-8 text-center">Loading grade exam information...</div>;
    
    const hasAnyExams = Array.from(examsByStudent.values()).some(exams => exams.length > 0);

    return (
        <div className="p-4 sm:p-6 md:p-8">
            <h1 className="text-3xl font-bold text-dark-text mb-6">Grade Exams</h1>
            
            {hasAnyExams ? (
                <div className="space-y-4">
                    {family.map((student, index) => {
                        const studentExams = examsByStudent.get(student.id) || [];
                        const title = `${student.name} (${studentExams.length} Exam${studentExams.length !== 1 ? 's' : ''})`;
                        return (
                             <AccordionItem key={student.id} title={title} startOpen={index === 0}>
                                <div className="space-y-6">
                                    {studentExams.length > 0 ? studentExams.map(exam => (
                                        <div key={exam.id} className="bg-white p-6 rounded-xl shadow-lg border-l-4 border-brand-purple">
                                            <h2 className="text-xl font-bold text-dark-text">{exam.title}</h2>
                                            <p className="text-light-text mt-2">{exam.description}</p>
                                            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                                                <div className="bg-light-purple/70 p-3 rounded-lg">
                                                    <p className="font-semibold text-brand-purple">Exam Date</p>
                                                    <p className="text-dark-text">{new Date(exam.examDate).toLocaleDateString()}</p>
                                                </div>
                                                <div className="bg-light-purple/70 p-3 rounded-lg">
                                                    <p className="font-semibold text-brand-purple">Registration Deadline</p>
                                                    <p className="text-dark-text">{new Date(exam.registrationDeadline).toLocaleDateString()}</p>
                                                </div>
                                            </div>
                                            {exam.syllabusLink && (
                                                <div className="mt-4">
                                                    <a href={exam.syllabusLink} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-brand-purple hover:underline">
                                                        Download Syllabus
                                                    </a>
                                                </div>
                                            )}
                                        </div>
                                    )) : (
                                        <p className="text-sm text-gray-500">No grade exams assigned to {student.name}.</p>
                                    )}
                                </div>
                            </AccordionItem>
                        );
                    })}
                </div>
            ) : (
                <div className="text-center py-16 bg-white rounded-lg shadow-md">
                    <h3 className="text-xl font-semibold text-gray-700">No Grade Exams Posted</h3>
                    <p className="text-gray-500 mt-2">No grade exams have been assigned to your family at this time.</p>
                </div>
            )}
        </div>
    );
};

export default GradeExamsPage;