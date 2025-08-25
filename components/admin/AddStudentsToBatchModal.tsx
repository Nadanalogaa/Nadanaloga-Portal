import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import Modal from '../Modal';
import ModalHeader from '../ModalHeader';
import type { Batch, User } from '../../types';

interface AddStudentsToBatchModalProps {
    isOpen: boolean;
    onClose: () => void;
    batch: Batch | null;
    allUsers: User[];
    allBatches: Batch[];
    onSave: (batchData: Partial<Batch>) => void;
}

// Define the ConflictInfo interface for better type safety
interface ConflictInfo {
    timing: string;
    batchName: string;
    teacherName: string;
}

const AddStudentsToBatchModal: React.FC<AddStudentsToBatchModalProps> = ({ isOpen, onClose, batch, allUsers, allBatches, onSave }) => {
    const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
    const [search, setSearch] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const selectAllCheckboxRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (batch) {
            const allStudentIdsInBatch = new Set((batch.schedule || []).flatMap(s => s.studentIds));
            setSelectedStudentIds(Array.from(allStudentIdsInBatch));
            setSearch(''); // Reset search on new batch
        }
    }, [batch]);

    const studentsForCourse = useMemo(() => {
        if (!batch) return [];
        return allUsers.filter(u => u.role === 'Student' && (u.courses || []).includes(batch.courseName));
    }, [allUsers, batch]);
    
    const batchTimings = useMemo(() => new Set((batch?.schedule || []).map(s => s.timing)), [batch]);
    
    const getStudentConflicts = useCallback((studentId: string): ConflictInfo[] => {
        if (batchTimings.size === 0) return [];

        const conflicts: ConflictInfo[] = [];
        const teachersMap = new Map(allUsers.filter(u => u.role === 'Teacher').map(t => [t.id, t.name]));

        for (const b of allBatches) {
            if (b.id !== batch?.id) {
                for (const s of b.schedule) {
                    if (s.studentIds.includes(studentId) && batchTimings.has(s.timing)) {
                        const teacherId = typeof b.teacherId === 'string' ? b.teacherId : (b.teacherId as User)?.id;
                        conflicts.push({
                            timing: s.timing,
                            batchName: b.name,
                            teacherName: teacherId ? (teachersMap.get(teacherId) || 'N/A') : 'N/A',
                        });
                    }
                }
            }
        }
        return conflicts;
    }, [batch?.id, batchTimings, allBatches, allUsers]);

    const filteredStudents = useMemo(() => {
        return studentsForCourse.filter(s => 
            s.name.toLowerCase().includes(search.toLowerCase()) ||
            (s.fatherName || '').toLowerCase().includes(search.toLowerCase()) ||
            s.id.toLowerCase().includes(search.toLowerCase())
        );
    }, [studentsForCourse, search]);

    const availableFilteredStudents = useMemo(() => {
        return filteredStudents.filter(s => getStudentConflicts(s.id).length === 0);
    }, [filteredStudents, getStudentConflicts]);

    const areAllAvailableSelected = useMemo(() =>
        availableFilteredStudents.length > 0 &&
        availableFilteredStudents.every(s => selectedStudentIds.includes(s.id)),
        [availableFilteredStudents, selectedStudentIds]
    );

    useEffect(() => {
        if (selectAllCheckboxRef.current) {
            const someAvailableSelected = availableFilteredStudents.some(s => selectedStudentIds.includes(s.id));
            selectAllCheckboxRef.current.indeterminate = someAvailableSelected && !areAllAvailableSelected;
        }
    }, [areAllAvailableSelected, availableFilteredStudents, selectedStudentIds]);

    const handleSelectionChange = (studentId: string, isChecked: boolean) => {
        setSelectedStudentIds(prev => {
            const newSelection = new Set(prev);
            if (isChecked) {
                newSelection.add(studentId);
            } else {
                newSelection.delete(studentId);
            }
            return Array.from(newSelection);
        });
    };

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newSelection = new Set(selectedStudentIds);
        if (e.target.checked) {
            availableFilteredStudents.forEach(s => newSelection.add(s.id));
        } else {
            const availableIds = new Set(availableFilteredStudents.map(s => s.id));
            availableIds.forEach(id => newSelection.delete(id));
        }
        setSelectedStudentIds(Array.from(newSelection));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!batch) return;
        setIsLoading(true);

        const dataToSave: Partial<Batch> = {
            ...batch,
            schedule: (batch.schedule || []).map(s => ({
                timing: s.timing,
                studentIds: selectedStudentIds,
            })),
        };
        
        await onSave(dataToSave);
        setIsLoading(false);
    };

    if (!batch) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} size="full">
            <form onSubmit={handleSubmit} className="flex flex-col h-full">
                <ModalHeader
                    title={`Add Students to "${batch.name}"`}
                    subtitle={`Course: ${batch.courseName}`}
                />
                
                <div className="flex-grow flex flex-col min-h-0 space-y-4">
                    <div>
                        <h4 className="form-label">Batch Schedule</h4>
                        <div className="flex flex-wrap gap-2 p-3 bg-gray-50 rounded-md border">
                            {(batch.schedule || []).length > 0 ? (
                                (batch.schedule || []).map(s => (
                                    <span key={s.timing} className="text-xs bg-brand-light text-brand-primary font-medium px-2 py-1 rounded-full">{s.timing}</span>
                                ))
                            ) : <p className="text-sm text-gray-500">No time slots scheduled for this batch.</p>}
                        </div>
                    </div>

                    <div className="flex-grow flex flex-col min-h-0">
                        <label htmlFor="student-search" className="form-label">Find Students ({filteredStudents.length} found)</label>
                        <input type="text" id="student-search" placeholder="Search by name, parent's name, or ID..." value={search} onChange={e => setSearch(e.target.value)} className="form-input w-full"/>

                        <div className="border rounded-md mt-2 flex-grow overflow-y-auto">
                            <ul className="divide-y divide-gray-100">
                               <li className="bg-gray-50 sticky top-0 z-10">
                                   <label className="flex items-center w-full px-4 py-3 text-sm font-medium text-gray-600">
                                       <input
                                           ref={selectAllCheckboxRef}
                                           type="checkbox"
                                           onChange={handleSelectAll}
                                           checked={areAllAvailableSelected}
                                           disabled={availableFilteredStudents.length === 0}
                                           className="h-4 w-4 text-brand-primary focus:ring-brand-primary border-gray-300 rounded mr-3"
                                       />
                                       Select All Available
                                   </label>
                               </li>
                               {filteredStudents.length > 0 ? filteredStudents.map(student => {
                                    const conflicts = getStudentConflicts(student.id);
                                    const isAvailable = conflicts.length === 0;
                                    const isSelected = selectedStudentIds.includes(student.id);
                                    
                                    return (
                                        <li key={student.id}>
                                            <label className={`flex w-full px-4 py-3 text-sm text-gray-700 ${isAvailable || isSelected ? 'hover:bg-gray-50 cursor-pointer' : 'opacity-60 cursor-not-allowed bg-gray-100'}`}>
                                                <input
                                                    type="checkbox"
                                                    disabled={!isAvailable && !isSelected}
                                                    checked={isSelected}
                                                    onChange={e => handleSelectionChange(student.id, e.target.checked)}
                                                    className="h-4 w-4 text-brand-primary focus:ring-brand-primary border-gray-300 rounded mr-4 flex-shrink-0 self-start mt-2.5"
                                                />
                                                <img 
                                                    src={student.photoUrl || `https://ui-avatars.com/api/?name=${student.name.replace(/\s/g, '+')}&background=e8eaf6&color=1a237e`}
                                                    alt={student.name}
                                                    className="h-10 w-10 rounded-full object-cover mr-3 flex-shrink-0 self-start"
                                                />
                                                <div className="flex-grow">
                                                    <p className="font-medium text-gray-800">{student.name}</p>
                                                    <p className="text-xs text-gray-500">
                                                        <span className="font-mono">{student.id.slice(-6).toUpperCase()}</span>
                                                        {student.fatherName && ` • Parent: ${student.fatherName}`}
                                                    </p>
                                                    {!isAvailable && !isSelected && (
                                                        <div className="mt-2 text-xs text-red-700 bg-red-50 border-l-2 border-red-500 p-2 rounded-r-md">
                                                            <p className="font-semibold mb-1">Schedule Conflict:</p>
                                                            <ul className="space-y-0.5">
                                                                {conflicts.map((conflict, index) => (
                                                                    <li key={index}>
                                                                        <span className="font-medium">{conflict.timing}</span> with "{conflict.batchName}" (w/ {conflict.teacherName})
                                                                    </li>
                                                                ))}
                                                            </ul>
                                                        </div>
                                                    )}
                                                </div>
                                            </label>
                                        </li>
                                    );
                               }) : <li className="px-4 py-4 text-sm text-gray-500 text-center">No students found for this course or filter.</li>}
                            </ul>
                        </div>
                    </div>
                </div>
                
                <div className="flex-shrink-0 flex justify-end pt-4 mt-auto border-t border-gray-200">
                    <button type="button" onClick={onClose} disabled={isLoading} className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm">Cancel</button>
                    <button type="submit" disabled={isLoading} className="ml-3 inline-flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-white bg-brand-primary hover:bg-brand-dark">
                        {isLoading ? 'Saving...' : `Update Roster (${selectedStudentIds.length} Students)`}
                    </button>
                </div>
            </form>
        </Modal>
    );
}

export default AddStudentsToBatchModal;