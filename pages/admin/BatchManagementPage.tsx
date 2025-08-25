import React, { useState, useEffect, useMemo, useCallback } from 'react';
import type { User, Course, Batch } from '../../types';
import { UserRole } from '../../types';
import { getAdminUsers, getCourses, getBatches, deleteBatch } from '../../api';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import EditBatchModal from '../../components/admin/EditBatchModal';
import BatchCard from '../../components/admin/BatchCard';

const BatchManagementPage: React.FC = () => {
    const [allUsers, setAllUsers] = useState<User[]>([]);
    const [courses, setCourses] = useState<Course[]>([]);
    const [batches, setBatches] = useState<Batch[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [selectedCourseId, setSelectedCourseId] = useState<string>('');
    const [editingBatch, setEditingBatch] = useState<Batch | null>(null);
    const [isCreatingNewBatch, setIsCreatingNewBatch] = useState(false);

    const students = useMemo(() => allUsers.filter(u => u.role === UserRole.Student), [allUsers]);
    const teachers = useMemo(() => allUsers.filter(u => u.role === UserRole.Teacher), [allUsers]);

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const [fetchedUsers, fetchedCourses, fetchedBatches] = await Promise.all([
                getAdminUsers(),
                getCourses(),
                getBatches(),
            ]);
            setAllUsers(fetchedUsers);
            setCourses(fetchedCourses);
            setBatches(fetchedBatches);
            if (fetchedCourses.length > 0 && !selectedCourseId) {
                setSelectedCourseId(fetchedCourses[0].id);
            }
            setError(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch data.');
        } finally {
            setIsLoading(false);
        }
    }, [selectedCourseId]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleEditBatch = (batch: Batch) => {
        setEditingBatch(batch);
        setIsCreatingNewBatch(false);
    };

    const handleCreateNewBatch = () => {
        setEditingBatch(null);
        setIsCreatingNewBatch(true);
    };
    
    const handleCloseModal = () => {
        setEditingBatch(null);
        setIsCreatingNewBatch(false);
    };

    const handleSave = () => {
        handleCloseModal();
        fetchData(); // Refetch all data to reflect changes
    };

    const handleDeleteBatch = async (batchId: string) => {
        if (window.confirm('Are you sure you want to delete this batch? This action cannot be undone.')) {
            try {
                await deleteBatch(batchId);
                await fetchData();
            } catch (err) {
                alert(`Failed to delete batch: ${err instanceof Error ? err.message : 'Unknown error'}`);
            }
        }
    };

    const filteredBatches = useMemo(() => {
        if (!selectedCourseId) return [];
        return batches.filter(b => b.courseId === selectedCourseId);
    }, [batches, selectedCourseId]);

    return (
        <div>
            <AdminPageHeader
                title="Batch Management"
                subtitle="Create, view, and manage all course batches."
                backLinkPath="/admin/dashboard"
                backTooltipText="Back to Dashboard"
            />

            {isLoading ? (
                <p className="text-center text-gray-500 py-8">Loading management console...</p>
            ) : error ? (
                <p className="text-center text-red-500 bg-red-100 p-3 rounded-md">{error}</p>
            ) : (
                <>
                    <div className="mb-6 bg-white p-4 rounded-lg shadow-sm">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="md:col-span-2">
                                <label htmlFor="course-select" className="block text-sm font-medium text-gray-700">
                                    Select a Course to Manage Batches
                                </label>
                                <select
                                    id="course-select"
                                    value={selectedCourseId}
                                    onChange={e => setSelectedCourseId(e.target.value)}
                                    className="mt-1 block w-full form-select"
                                >
                                    {courses.map(course => (
                                        <option key={course.id} value={course.id}>{course.name}</option>
                                    ))}
                                </select>
                            </div>
                             <div>
                                <label className="block text-sm font-medium text-gray-700 opacity-0">Create</label>
                                <button
                                    onClick={handleCreateNewBatch}
                                    disabled={!selectedCourseId}
                                    className="mt-1 w-full bg-brand-primary hover:bg-brand-dark text-white font-semibold py-2 px-4 rounded-md shadow-sm transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                                >
                                    + Create New Batch
                                </button>
                            </div>
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                        {filteredBatches.map(batch => (
                            <BatchCard 
                                key={batch.id} 
                                batch={batch} 
                                allStudents={students}
                                allTeachers={teachers}
                                onEdit={handleEditBatch}
                                onDelete={handleDeleteBatch}
                             />
                        ))}
                         {filteredBatches.length === 0 && selectedCourseId && (
                            <div className="lg:col-span-2 xl:col-span-3 text-center py-12 bg-white rounded-lg shadow-sm">
                                <h3 className="text-lg font-medium text-gray-800">No Batches Found</h3>
                                <p className="text-gray-500 mt-1">There are no batches for this course yet. Create one to get started!</p>
                            </div>
                        )}
                    </div>
                </>
            )}

            {(isCreatingNewBatch || editingBatch) && (
                <EditBatchModal 
                    isOpen={isCreatingNewBatch || !!editingBatch}
                    onClose={handleCloseModal}
                    onSave={handleSave}
                    courseId={selectedCourseId}
                    batchToEdit={editingBatch}
                    allStudents={students}
                    allTeachers={teachers}
                    allBatches={batches}
                />
            )}
        </div>
    );
};

export default BatchManagementPage;
