import React, { useState, useEffect } from 'react';
import type { Notice, User } from '../../types';
import { getNotices, getFamilyStudents } from '../../api';
import AccordionItem from '../../components/AccordionItem';

const NoticesPage: React.FC = () => {
    const [noticesByStudent, setNoticesByStudent] = useState<Map<string, Notice[]>>(new Map());
    const [family, setFamily] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            try {
                const [familyData, allNoticesForFamily] = await Promise.all([
                    getFamilyStudents(),
                    getNotices(),
                ]);
                
                setFamily(familyData);
                
                const noticesMap = new Map<string, Notice[]>();
                familyData.forEach(student => noticesMap.set(student.id, []));

                allNoticesForFamily.forEach(notice => {
                    familyData.forEach(student => {
                        if (notice.recipientIds?.includes(student.id)) {
                             const studentNotices = noticesMap.get(student.id) || [];
                            studentNotices.push(notice);
                            noticesMap.set(student.id, studentNotices);
                        }
                    });
                });

                 // Sort notices within each student's list by date
                for (const [studentId, studentNotices] of noticesMap.entries()) {
                    studentNotices.sort((a, b) => new Date(b.issuedAt).getTime() - new Date(a.issuedAt).getTime());
                    noticesMap.set(studentId, studentNotices);
                }

                setNoticesByStudent(noticesMap);

            } catch (error) {
                console.error("Failed to fetch notices:", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, []);
    
    if (isLoading) return <div className="p-8 text-center">Loading notices...</div>;

    const hasAnyNotices = Array.from(noticesByStudent.values()).some(notices => notices.length > 0);

    return (
        <div className="p-4 sm:p-6 md:p-8">
            <h1 className="text-3xl font-bold text-dark-text mb-6">Notice Board</h1>

            {hasAnyNotices ? (
                <div className="space-y-4">
                     {family.map((student, index) => {
                        const studentNotices = noticesByStudent.get(student.id) || [];
                        const title = `${student.name} (${studentNotices.length} Notice${studentNotices.length !== 1 ? 's' : ''})`;
                        return (
                            <AccordionItem key={student.id} title={title} startOpen={index === 0}>
                                <div className="space-y-6">
                                    {studentNotices.length > 0 ? studentNotices.map(notice => (
                                        <div key={notice.id} className="bg-white p-6 rounded-xl shadow-lg">
                                            <div className="flex justify-between items-start">
                                                <h2 className="text-xl font-bold text-dark-text">{notice.title}</h2>
                                                <p className="text-xs text-light-text flex-shrink-0 ml-4">{new Date(notice.issuedAt).toLocaleDateString()}</p>
                                            </div>
                                            <p className="text-dark-text mt-4 whitespace-pre-wrap">{notice.content}</p>
                                        </div>
                                    )) : (
                                        <p className="text-sm text-gray-500">No notices for {student.name}.</p>
                                    )}
                                </div>
                            </AccordionItem>
                        );
                    })}
                </div>
            ) : (
                <div className="text-center py-16 bg-white rounded-lg shadow-md">
                    <h3 className="text-xl font-semibold text-gray-700">No Notices</h3>
                    <p className="text-gray-500 mt-2">There are no new notices for your family at this time.</p>
                </div>
            )}
        </div>
    );
};

export default NoticesPage;