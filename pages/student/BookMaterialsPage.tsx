import React, { useState, useEffect } from 'react';
import type { BookMaterial, User } from '../../types';
import { getBookMaterials, getFamilyStudents } from '../../api';
import AccordionItem from '../../components/AccordionItem';

const BookMaterialsPage: React.FC = () => {
    const [materialsByStudent, setMaterialsByStudent] = useState<Map<string, BookMaterial[]>>(new Map());
    const [family, setFamily] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            try {
                const [familyData, allMaterialsForFamily] = await Promise.all([
                    getFamilyStudents(),
                    getBookMaterials(),
                ]);
                
                setFamily(familyData);
                
                const materialsMap = new Map<string, BookMaterial[]>();
                familyData.forEach(student => materialsMap.set(student.id, []));

                allMaterialsForFamily.forEach(material => {
                    familyData.forEach(student => {
                        if (material.recipientIds?.includes(student.id)) {
                            const studentMaterials = materialsMap.get(student.id) || [];
                            studentMaterials.push(material);
                            materialsMap.set(student.id, studentMaterials);
                        }
                    });
                });

                setMaterialsByStudent(materialsMap);

            } catch (error) {
                console.error("Failed to fetch book materials:", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, []);

    if (isLoading) return <div className="p-8 text-center">Loading materials...</div>;
    
    const hasAnyMaterials = Array.from(materialsByStudent.values()).some(materials => materials.length > 0);

    return (
        <div className="p-4 sm:p-6 md:p-8">
            <h1 className="text-3xl font-bold text-dark-text mb-6">Book & Course Materials</h1>
            
            {hasAnyMaterials ? (
                <div className="space-y-4">
                    {family.map((student, index) => {
                        const studentMaterials = materialsByStudent.get(student.id) || [];
                        const materialsByCourse = studentMaterials.reduce((acc, material) => {
                            const course = material.courseName;
                            if (!acc[course]) acc[course] = [];
                            acc[course].push(material);
                            return acc;
                        }, {} as Record<string, BookMaterial[]>);
                        
                        const title = `${student.name} (${studentMaterials.length} Material${studentMaterials.length !== 1 ? 's' : ''})`;

                        return (
                            <AccordionItem key={student.id} title={title} startOpen={index === 0}>
                                <div className="space-y-8">
                                    {Object.keys(materialsByCourse).length > 0 ? Object.entries(materialsByCourse).map(([courseName, courseMaterials]) => (
                                        <div key={courseName}>
                                            <h2 className="text-xl font-semibold text-dark-text mb-4 border-b pb-2">{courseName}</h2>
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                                {courseMaterials.map(material => (
                                                    <a href={material.type === 'PDF' ? material.data : material.url} target="_blank" rel="noopener noreferrer" key={material.id} className="block bg-white p-5 rounded-xl shadow-md hover:shadow-lg hover:-translate-y-1 transition-all">
                                                        <span className="text-xs font-semibold px-2 py-1 rounded-full bg-light-purple text-brand-purple">{material.type}</span>
                                                        <h3 className="font-bold text-dark-text mt-3">{material.title}</h3>
                                                        <p className="text-sm text-light-text mt-1">{material.description}</p>
                                                    </a>
                                                ))}
                                            </div>
                                        </div>
                                    )) : (
                                        <p className="text-sm text-gray-500">No materials assigned to {student.name}.</p>
                                    )}
                                </div>
                            </AccordionItem>
                        );
                    })}
                </div>
            ) : (
                <div className="text-center py-16 bg-white rounded-lg shadow-md">
                    <h3 className="text-xl font-semibold text-gray-700">No Materials Available</h3>
                    <p className="text-gray-500 mt-2">Your instructors have not uploaded any materials for your family yet.</p>
                </div>
            )}
        </div>
    );
};

export default BookMaterialsPage;