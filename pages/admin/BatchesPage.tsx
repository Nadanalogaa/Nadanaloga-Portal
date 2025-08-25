
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import type { Batch, Course, User } from '../../types';
import { getBatches, getAdminCourses, getAdminUsers, deleteBatch, addBatch, updateBatch } from '../../api';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import AdminNav from '../../components/admin/AdminNav';
import EditBatchModal from '../../components/admin/EditBatchModal';
import ViewBatchModal from '../../components/admin/ViewBatchModal';
import AddStudentsToBatchModal from '../../components/admin/AddStudentsToBatchModal';
import BatchTable from '../../components/admin/BatchTable';
import { UsersIcon, UserAddIcon } from '../../components/icons';
import Tooltip from '../../components/Tooltip';

const BatchesPage: React.FC = () => {
    const [batches, setBatches] = useState<Batch[]>([]);
    const [courses, setCourses] = useState<Course[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [editingBatch, setEditingBatch] = useState<Partial<Batch> | null>(null);
    const [viewingBatch, setViewingBatch] = useState<Batch | null>(null);
    const [addingStudentsToBatch, setAddingStudentsToBatch] = useState<Batch | null>(null);
    
    // View and Filter State
    const [viewMode, setViewMode] = useState<'card' | 'table'>('card');
    const [searchQuery, setSearchQuery] = useState('');
    const [courseFilter, setCourseFilter] = useState('');
    const [teacherFilter, setTeacherFilter] = useState('');
    const [modeFilter, setModeFilter] = useState('');

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const [fetchedBatches, fetchedCourses, fetchedUsers] = await Promise.all([
                getBatches(),
                getAdminCourses(),
                getAdminUsers()
            ]);
            setBatches(fetchedBatches);
            setCourses(fetchedCourses);
            setUsers(fetchedUsers);
            setError(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch data.');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const usersMap = useMemo(() => new Map(users.map(u => [u.id, u])), [users]);
    const teachers = useMemo(() => users.filter(u => u.role === 'Teacher'), [users]);

    const filteredBatches = useMemo(() => {
        return batches.filter(batch => {
            // Combined search for batch name and student names
            if (searchQuery) {
                const searchTerm = searchQuery.toLowerCase();
                const isBatchNameMatch = batch.name.toLowerCase().includes(searchTerm);
                
                const hasMatchingStudent = (batch.schedule ?? []).some(s => 
                    s.studentIds.some(id => {
                        const student = usersMap.get(id);
                        return student && student.name.toLowerCase().includes(searchTerm);
                    })
                );

                if (!isBatchNameMatch && !hasMatchingStudent) {
                    return false;
                }
            }
            
            if (courseFilter && batch.courseName !== courseFilter) {
                return false;
            }

            if (teacherFilter) {
                const teacherId = typeof batch.teacherId === 'string' ? batch.teacherId : (batch.teacherId as User)?.id;
                if (teacherId !== teacherFilter) return false;
            }

            if (modeFilter && batch.mode !== modeFilter) {
                return false;
            }
            
            return true;
        });
    }, [batches, searchQuery, courseFilter, teacherFilter, modeFilter, usersMap]);

    const batchesByCourse = useMemo(() => {
        const grouped: { [courseName: string]: Batch[] } = {};
        filteredBatches.forEach(batch => {
            if (!grouped[batch.courseName]) {
                grouped[batch.courseName] = [];
            }
            grouped[batch.courseName].push(batch);
        });
        return Object.keys(grouped).sort().reduce((acc, key) => {
            acc[key] = grouped[key];
            return acc;
        }, {} as typeof grouped);
    }, [filteredBatches]);

    const handleAddNewBatch = () => setEditingBatch({});
    const handleEditBatch = (batch: Batch) => setEditingBatch(batch);
    const handleViewBatch = (batch: Batch) => setViewingBatch(batch);
    
    const handleDeleteBatch = async (batchId: string) => {
        if (window.confirm('Are you sure you want to delete this batch? This will unenroll all students from it.')) {
            try {
                await deleteBatch(batchId);
                setBatches(prev => prev.filter(b => b.id !== batchId));
            } catch (err) {
                alert(err instanceof Error ? err.message : 'Failed to delete batch.');
            }
        }
    };

    const handleSaveBatch = async (batchData: Partial<Batch>) => {
        try {
            const payload = { ...batchData };
            // Ensure teacherId is a string ID, not a populated object, before sending to the server
            if (payload.teacherId && typeof payload.teacherId === 'object') {
                payload.teacherId = (payload.teacherId as Partial<User>).id;
            }

            if (payload.id) { // Editing
                await updateBatch(payload.id, payload);
            } else { // Creating
                await addBatch(payload);
            }
            
            // Refetch all data to get the latest state with populated fields
            await fetchData();

            setEditingBatch(null);
            setAddingStudentsToBatch(null);
        } catch (err) {
            alert(err instanceof Error ? err.message : 'Failed to save batch.');
        }
    };
    
    const renderCardView = () => (
        <div className="space-y-12">
            {Object.keys(batchesByCourse).length > 0 ? Object.entries(batchesByCourse).map(([courseName, courseBatches]) => (
                <div key={courseName}>
                    <h2 className="text-2xl font-semibold text-gray-800 mb-4">{courseName}</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                        {courseBatches.map(batch => {
                            const totalStudents = new Set((batch.schedule ?? []).flatMap(s => s.studentIds)).size;
                            let teacherName;
                            if (batch.teacherId) {
                                if (typeof batch.teacherId === 'object' && batch.teacherId.name) {
                                    teacherName = batch.teacherId.name;
                                } else if (typeof batch.teacherId === 'string') {
                                    teacherName = usersMap.get(batch.teacherId)?.name;
                                }
                            }
                            return (
                                <div key={batch.id} className="bg-white rounded-lg shadow-md p-5 flex flex-col">
                                    <div className="flex-grow">
                                        <div className="flex justify-between items-start">
                                            <h3 className="font-bold text-lg text-brand-primary">{batch.name}</h3>
                                            {batch.mode && (
                                                <span className={`text-xs font-semibold px-2 py-1 rounded-full ${batch.mode === 'Online' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'}`}>
                                                    {batch.mode}
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-sm text-gray-500 mt-1">{batch.description}</p>
                                        
                                        <div className="flex justify-between items-center mt-4 text-sm">
                                            <p><strong>Teacher:</strong> {teacherName || <span className="text-gray-400">Not Assigned</span>}</p>
                                            <div className="flex items-center space-x-2">
                                                <div className="flex items-center space-x-1.5 text-gray-600">
                                                    <UsersIcon className="h-5 w-5" />
                                                    <span className="font-medium">{totalStudents}</span>
                                                </div>
                                                <Tooltip content="Add Students" position="top">
                                                    <button onClick={() => setAddingStudentsToBatch(batch)} className="text-gray-400 hover:text-green-600 transition-colors">
                                                        <UserAddIcon className="h-5 w-5" />
                                                    </button>
                                                </Tooltip>
                                            </div>
                                        </div>
                                        
                                        <div className="mt-4 text-sm">
                                            <p><strong>Schedule:</strong></p>
                                            <ul className="list-disc list-inside ml-4 mt-1 text-gray-600">
                                                {(batch.schedule ?? []).length > 0 ? (batch.schedule ?? []).map(scheduleItem => {
                                                    const studentsForSlot = (scheduleItem.studentIds ?? [])
                                                        .map(id => usersMap.get(id))
                                                        .filter((student): student is User => !!student)
                                                        .map(student => student.name);

                                                    const tooltipContent = (
                                                        <div className="text-xs text-left max-w-xs">
                                                            <p className="font-semibold mb-1">{scheduleItem.timing}</p>
                                                            <hr className="my-1 border-gray-400"/>
                                                            {studentsForSlot.length > 0 ? (
                                                                <>
                                                                    <p className="font-medium mb-1">Students:</p>
                                                                    <ul className="list-disc list-inside pl-2 space-y-0.5">
                                                                        {studentsForSlot.map(name => <li key={name}>{name}</li>)}
                                                                    </ul>
                                                                </>
                                                            ) : (
                                                                <p className="italic">No students scheduled for this time.</p>
                                                            )}
                                                        </div>
                                                    );

                                                    return (
                                                        <Tooltip key={scheduleItem.timing} content={tooltipContent} position="right">
                                                            <li>{scheduleItem.timing}</li>
                                                        </Tooltip>
                                                    );
                                                }) : <li>Not scheduled</li>}
                                            </ul>
                                        </div>
                                    </div>
                                    <div className="mt-6 pt-4 border-t border-gray-100 flex justify-end space-x-3">
                                        <button onClick={() => handleViewBatch(batch)} className="text-sm font-medium text-blue-600 hover:text-blue-800">View</button>
                                        <button onClick={() => handleEditBatch(batch)} className="text-sm font-medium text-brand-primary hover:text-brand-dark">Edit</button>
                                        <button onClick={() => handleDeleteBatch(batch.id)} className="text-sm font-medium text-red-600 hover:text-red-800">Delete</button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )) : (
                 <div className="text-center py-16 bg-white rounded-lg shadow-md">
                    <h3 className="text-xl font-semibold text-gray-700">No Batches Found</h3>
                    <p className="text-gray-500 mt-2">Get started by creating your first batch or adjust your filters.</p>
                 </div>
            )}
         </div>
    );

    return (
        <div className="bg-gray-50 min-h-full py-3">
            <div className="container mx-auto px-6 lg:px-8">
                <div className="max-w-full mx-auto">
                    <AdminPageHeader
                        title="Batch Management"
                        subtitle="Organize students and teachers into scheduled batches."
                        backLinkPath="/admin/dashboard"
                        backTooltipText="Back to Dashboard"
                    />
                    <AdminNav />

                    {/* Toolbar */}
                    <div className="bg-white p-4 rounded-lg shadow-md my-8">
                        <div className="flex justify-between items-center mb-4">
                            {/* View Toggle */}
                            <div className="flex items-center space-x-1 bg-gray-200 p-1 rounded-lg">
                                <button onClick={() => setViewMode('card')} className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${viewMode === 'card' ? 'bg-white text-brand-primary shadow-sm' : 'text-gray-600 hover:bg-gray-300/50'}`}>Card View</button>
                                <button onClick={() => setViewMode('table')} className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${viewMode === 'table' ? 'bg-white text-brand-primary shadow-sm' : 'text-gray-600 hover:bg-gray-300/50'}`}>Table View</button>
                            </div>
                            <button
                                onClick={handleAddNewBatch}
                                className="bg-brand-primary hover:bg-brand-dark text-white font-semibold px-4 py-2 rounded-md shadow-sm transition-colors"
                            >
                                + Create New Batch
                            </button>
                        </div>
                        
                         {/* Filter Bar */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t">
                             <div>
                                <label className="form-label text-xs">
                                    Search by Batch or Student Name
                                </label>
                                <input 
                                    type="text" 
                                    placeholder="e.g., Morning Bharatanatyam or Rajesh Kumar" 
                                    value={searchQuery} 
                                    onChange={e => setSearchQuery(e.target.value)} 
                                    className="w-full form-input" 
                                />
                            </div>
                            <div>
                                <label className="form-label text-xs">Filter by Course</label>
                                <select value={courseFilter} onChange={e => setCourseFilter(e.target.value)} className="w-full form-select">
                                    <option value="">All Courses</option>
                                    {courses.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="form-label text-xs">Filter by Teacher</label>
                                <select value={teacherFilter} onChange={e => setTeacherFilter(e.target.value)} className="w-full form-select">
                                    <option value="">All Teachers</option>
                                    {teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="form-label text-xs">Filter by Mode</label>
                                <select value={modeFilter} onChange={e => setModeFilter(e.target.value)} className="w-full form-select">
                                    <option value="">All Modes</option>
                                    <option value="Online">Online</option>
                                    <option value="Offline">Offline</option>
                                </select>
                            </div>
                        </div>
                    </div>


                    {isLoading && <p className="text-center text-gray-500 py-8">Loading batches...</p>}
                    {error && <p className="text-center text-red-500 bg-red-100 p-3 rounded-md">{error}</p>}

                    {!isLoading && !error && (
                        viewMode === 'card' ? renderCardView() : 
                        <BatchTable 
                            batches={filteredBatches}
                            usersMap={usersMap}
                            onEdit={handleEditBatch}
                            onDelete={handleDeleteBatch}
                            onView={handleViewBatch}
                            onAddStudents={setAddingStudentsToBatch}
                        />
                    )}
                </div>
            </div>
            
            <EditBatchModal 
                isOpen={!!editingBatch}
                onClose={() => setEditingBatch(null)}
                batch={editingBatch}
                courses={courses}
                users={users}
                onSave={handleSaveBatch}
                allBatches={batches}
            />

            <ViewBatchModal
                isOpen={!!viewingBatch}
                onClose={() => setViewingBatch(null)}
                batch={viewingBatch}
                usersMap={usersMap}
            />

            <AddStudentsToBatchModal
                isOpen={!!addingStudentsToBatch}
                onClose={() => setAddingStudentsToBatch(null)}
                batch={addingStudentsToBatch}
                allUsers={users}
                allBatches={batches}
                onSave={handleSaveBatch}
            />
        </div>
    );
};

export default BatchesPage;
