
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import type { User, Course, Batch } from '../../types';
import { UserRole, ClassPreference, UserStatus } from '../../types';
import { getAdminUsers, updateUserByAdmin, deleteUserByAdmin, addStudentByAdmin, sendNotification, getCourses, getBatches, updateBatch } from '../../api';
import EditUserModal from '../../components/admin/EditUserModal';
import AddStudentModal from '../../components/admin/AddStudentModal';
import SendNotificationModal from '../../components/admin/SendNotificationModal';
import { GRADES } from '../../constants';
import { CourseIcon } from '../../components/icons';
import Tooltip from '../../components/Tooltip';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import AdminNav from '../../components/admin/AdminNav';

type SortDirection = 'ascending' | 'descending';
type SortConfig = { key: keyof User; direction: SortDirection } | null;

const SortableIcon: React.FC<{ direction: SortDirection | 'none' }> = ({ direction }) => {
    if (direction === 'none') return <svg className="w-4 h-4 text-gray-400 opacity-30 group-hover:opacity-100" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 9l4-4 4 4m0 6l-4 4-4-4" /></svg>;
    if (direction === 'ascending') return <svg className="w-4 h-4 text-gray-800" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" /></svg>;
    return <svg className="w-4 h-4 text-gray-800" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" /></svg>;
};

const SortableHeader: React.FC<{ columnKey: keyof User, title: string, sortConfig: SortConfig, requestSort: (key: keyof User) => void, className?: string }> = ({ columnKey, title, sortConfig, requestSort, className }) => (
    <th scope="col" className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer select-none group ${className || ''}`} onClick={() => requestSort(columnKey)}>
        <div className="flex items-center">
            {title}
            <span className="ml-2">
                <SortableIcon direction={sortConfig?.key === columnKey ? sortConfig.direction : 'none'} />
            </span>
        </div>
    </th>
);


const StudentListPage: React.FC = () => {
    const [allUsers, setAllUsers] = useState<User[]>([]);
    const [courses, setCourses] = useState<Course[]>([]);
    const [batches, setBatches] = useState<Batch[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
    const [isNotificationModalOpen, setIsNotificationModalOpen] = useState(false);
    
    // Search, Sort, and Filter State
    const [searchQuery, setSearchQuery] = useState('');
    const [sortConfig, setSortConfig] = useState<SortConfig>(null);
    const [gradeFilter, setGradeFilter] = useState('');
    const [courseFilters, setCourseFilters] = useState<string[]>([]);
    const [isCourseFilterOpen, setIsCourseFilterOpen] = useState(false);
    const [courseSearch, setCourseSearch] = useState('');
    const courseFilterRef = useRef<HTMLDivElement>(null);
    const [batchFilter, setBatchFilter] = useState('');
    const [preferenceFilter, setPreferenceFilter] = useState('');
    const selectAllCheckboxRef = useRef<HTMLInputElement>(null);
    
    const location = useLocation();
    const navigate = useNavigate();

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
            setError(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch student data.');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (courseFilterRef.current && !courseFilterRef.current.contains(event.target as Node)) {
                setIsCourseFilterOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);
    
    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const studentIdToEdit = params.get('editStudentId');
        
        // Check if there's an ID in the URL and the data is loaded
        if (studentIdToEdit && allUsers.length > 0) {
            // Avoid re-opening if modal is already open for this user
            if (editingUser?.id !== studentIdToEdit) {
                const userToEdit = allUsers.find(u => u.id === studentIdToEdit && u.role === UserRole.Student);
                if (userToEdit) {
                    setEditingUser(userToEdit);
                }
            }
        }
    }, [location.search, allUsers, editingUser]);

    const students = useMemo(() => allUsers.filter(u => u.role === UserRole.Student), [allUsers]);
    const teachersMap = useMemo(() => {
        const map = new Map<string, User>();
        allUsers.filter(u => u.role === UserRole.Teacher).forEach(t => map.set(t.id, t));
        return map;
    }, [allUsers]);
    
    const studentBatchEnrollments = useMemo(() => {
        const map = new Map<string, { batchName: string, courseName: string, timing: string, teacherId?: string }[]>();
        students.forEach(student => {
            const enrollments: { batchName: string, courseName: string, timing: string, teacherId?: string }[] = [];
            batches.forEach(batch => {
                batch.schedule.forEach(scheduleItem => {
                    if (scheduleItem.studentIds.includes(student.id)) {
                        enrollments.push({
                            batchName: batch.name,
                            courseName: batch.courseName,
                            timing: scheduleItem.timing,
                            teacherId: typeof batch.teacherId === 'string' ? batch.teacherId : (batch.teacherId as User)?.id,
                        });
                    }
                });
            });
            if (enrollments.length > 0) {
                map.set(student.id, enrollments);
            }
        });
        return map;
    }, [students, batches]);

    const requestSort = (key: keyof User) => {
        let direction: SortDirection = 'ascending';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    const handleStatusChange = async (userId: string, newStatus: UserStatus, userName: string) => {
        if (window.confirm(`Are you sure you want to change ${userName}'s status to "${newStatus}"?`)) {
            try {
                await updateUserByAdmin(userId, { status: newStatus });
                setAllUsers(prev => prev.map(u => (u.id === userId ? { ...u, status: newStatus } : u)));
            } catch (err) {
                alert(err instanceof Error ? err.message : 'Failed to update status.');
            }
        }
    };

    const filteredAndSortedStudents = useMemo(() => {
        let processStudents = [...students];

        // Filtering
        processStudents = processStudents.filter(student => {
            if (gradeFilter && student.grade !== gradeFilter) return false;
            if (preferenceFilter && student.classPreference !== preferenceFilter) return false;
            
            if (courseFilters.length > 0) {
                if (!student.courses || student.courses.length === 0) return false;
                const studentHasCourse = courseFilters.some(filterCourse => 
                    student.courses!.includes(filterCourse)
                );
                if (!studentHasCourse) return false;
            }

            if (batchFilter) {
                const targetBatch = batches.find(b => b.id === batchFilter);
                if (!targetBatch) return false; // Should not happen if filter is valid
                const isStudentInBatch = targetBatch.schedule.some(s => s.studentIds.includes(student.id));
                if (!isStudentInBatch) return false;
            }

            if (searchQuery) {
                const searchTerm = searchQuery.toLowerCase();
                const enrollments = studentBatchEnrollments.get(student.id) || [];
                const searchIn = [
                    student.name,
                    student.id,
                    student.email,
                    student.grade,
                    student.contactNumber,
                    ...(student.courses || []),
                    ...enrollments.map(e => e.batchName),
                ].filter(Boolean).join(' ').toLowerCase();
                
                if (!searchIn.includes(searchTerm)) return false;
            }
            return true;
        });

        // Sorting
        if (sortConfig !== null) {
            processStudents.sort((a, b) => {
                const aVal = a[sortConfig.key as keyof User];
                const bVal = b[sortConfig.key as keyof User];

                if (aVal === undefined || aVal === null) return 1;
                if (bVal === undefined || bVal === null) return -1;
                
                if (sortConfig.key === 'dateOfJoining') {
                    const dateA = new Date(aVal as string).getTime();
                    const dateB = new Date(bVal as string).getTime();
                    if (dateA < dateB) return sortConfig.direction === 'ascending' ? -1 : 1;
                    if (dateA > dateB) return sortConfig.direction === 'ascending' ? 1 : -1;
                    return 0;
                }

                if (String(aVal).localeCompare(String(bVal), undefined, { numeric: true }) < 0) {
                    return sortConfig.direction === 'ascending' ? -1 : 1;
                }
                if (String(aVal).localeCompare(String(bVal), undefined, { numeric: true }) > 0) {
                    return sortConfig.direction === 'ascending' ? 1 : -1;
                }
                return 0;
            });
        }

        return processStudents;
    }, [students, searchQuery, gradeFilter, preferenceFilter, courseFilters, batchFilter, sortConfig, batches, studentBatchEnrollments]);

    const areAllVisibleSelected = useMemo(() =>
        filteredAndSortedStudents.length > 0 &&
        filteredAndSortedStudents.every(s => selectedStudents.has(s.id)),
        [filteredAndSortedStudents, selectedStudents]
    );

    useEffect(() => {
        if (selectAllCheckboxRef.current) {
            const someVisibleSelected = filteredAndSortedStudents.some(s => selectedStudents.has(s.id));
            selectAllCheckboxRef.current.indeterminate = someVisibleSelected && !areAllVisibleSelected;
        }
    }, [areAllVisibleSelected, filteredAndSortedStudents, selectedStudents]);


    const handleEditUser = (user: User) => setEditingUser(user);

    const handleDeleteUser = async (userId: string) => {
        if (window.confirm('Are you sure you want to move this student to the trash?')) {
            try {
                await deleteUserByAdmin(userId);
                setAllUsers(prev => prev.filter(u => u.id !== userId));
            } catch (err) {
                alert(err instanceof Error ? err.message : 'Failed to delete student.');
            }
        }
    };
    
    const handleBulkDelete = async () => {
        const selectedCount = selectedStudents.size;
        if (selectedCount === 0) return;

        if (window.confirm(`Are you sure you want to move ${selectedCount} selected student(s) to the trash?`)) {
            try {
                const deletePromises = Array.from(selectedStudents).map(userId => deleteUserByAdmin(userId));
                await Promise.all(deletePromises);
                
                setSelectedStudents(new Set());
                await fetchData();
                alert(`${selectedCount} student(s) moved to trash successfully.`);
            } catch (err) {
                alert(err instanceof Error ? err.message : 'An error occurred while deleting students.');
            }
        }
    };

    const handleStudentSaveChanges = async (payload: { user: User; batchChanges: Map<string, { oldBatchId?: string; newBatchId: string; selectedTimings?: Set<string> }>, allBatches: Batch[] }) => {
        const { user, batchChanges, allBatches: freshBatches } = payload;
        
        let confirmMsg = `You are about to save profile changes for ${user.name}.`;
        if (batchChanges.size > 0) {
            confirmMsg += "\n\nBatch changes:\n";
            batchChanges.forEach((change, course) => {
                const oldBatchName = freshBatches.find(b => b.id === change.oldBatchId)?.name || "Unassigned";
                const newBatchName = freshBatches.find(b => b.id === change.newBatchId)?.name || "Unassigned";
                if (oldBatchName !== newBatchName) {
                    confirmMsg += `- ${course}: from "${oldBatchName}" to "${newBatchName}"\n`;
                }
            });
        }
        confirmMsg += "\nDo you want to proceed?";

        if (window.confirm(confirmMsg)) {
            try {
                const updatedUserPromise = updateUserByAdmin(user.id, user);
    
                const batchUpdatePromises: Promise<Batch>[] = [];
                const updatedBatchesMap = new Map<string, Batch>();
    
                batchChanges.forEach((change) => {
                    const { oldBatchId, newBatchId, selectedTimings } = change;
                    
                    // Un-enroll from old batch
                    if (oldBatchId && oldBatchId !== newBatchId) {
                        const existingOldBatch = updatedBatchesMap.get(oldBatchId) || freshBatches.find(b => b.id === oldBatchId);
                        if (existingOldBatch) {
                            const oldBatch: Batch = JSON.parse(JSON.stringify(existingOldBatch));
                            oldBatch.schedule.forEach(s => {
                                s.studentIds = s.studentIds.filter(id => id !== user.id);
                            });
                            updatedBatchesMap.set(oldBatchId, oldBatch);
                        }
                    }
                    
                    // Enroll in new batch with selected timings
                    if (newBatchId && newBatchId !== 'unassigned' && newBatchId !== oldBatchId) {
                        const existingNewBatch = updatedBatchesMap.get(newBatchId) || freshBatches.find(b => b.id === newBatchId);
                        if (existingNewBatch) {
                            const newBatch: Batch = JSON.parse(JSON.stringify(existingNewBatch));
                            newBatch.schedule.forEach(s => {
                                const shouldEnroll = selectedTimings && selectedTimings.has(s.timing);
                                if (shouldEnroll && !s.studentIds.includes(user.id)) {
                                    s.studentIds.push(user.id);
                                }
                            });
                            updatedBatchesMap.set(newBatchId, newBatch);
                        }
                    }
                });
                
                updatedBatchesMap.forEach((batchToUpdate, batchId) => {
                    const payload = { ...batchToUpdate };
                    // Ensure teacherId is a string ID, not a populated object, before sending to the server
                    if (payload.teacherId && typeof payload.teacherId === 'object') {
                        payload.teacherId = (payload.teacherId as Partial<User>).id;
                    }
                    batchUpdatePromises.push(updateBatch(batchId, payload));
                });
    
                await Promise.all([updatedUserPromise, ...batchUpdatePromises]);
                
                setEditingUser(null);
                await fetchData(); // Refetch all data to ensure UI is up to date
            } catch (err) {
                alert(err instanceof Error ? err.message : 'An error occurred while saving.');
            }
        }
    };


    const handleSaveNewStudent = async (newUser: Partial<User>) => {
        try {
            const savedStudent = await addStudentByAdmin(newUser);
            setAllUsers(prev => [...prev, savedStudent]);
            setIsAddModalOpen(false);
        } catch (err) {
            alert(err instanceof Error ? err.message : 'Failed to add student.');
        }
    };
    
    const handleSendNotification = async (subject: string, message: string) => {
        try {
            await sendNotification(Array.from(selectedStudents), subject, message);
        } catch (err) {
            // The modal will display the error, so we re-throw to let it handle it.
            throw err;
        }
    };

    const handleCloseEditModal = () => {
        setEditingUser(null);
        // Clean up the URL after closing the modal, if the param is still there
        const params = new URLSearchParams(location.search);
        if (params.has('editStudentId')) {
            params.delete('editStudentId');
            navigate({ search: params.toString() }, { replace: true });
        }
    };
    
    const handleCloseNotificationModal = () => {
        setIsNotificationModalOpen(false);
        setSelectedStudents(new Set()); // Clear selection when modal is closed
    };


    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newSelection = new Set(selectedStudents);
        if (e.target.checked) {
            filteredAndSortedStudents.forEach(s => newSelection.add(s.id));
        } else {
            filteredAndSortedStudents.forEach(s => newSelection.delete(s.id));
        }
        setSelectedStudents(newSelection);
    };

    const handleSelectOne = (e: React.ChangeEvent<HTMLInputElement>, userId: string) => {
        const newSelection = new Set(selectedStudents);
        if (e.target.checked) {
            newSelection.add(userId);
        } else {
            newSelection.delete(userId);
        }
        setSelectedStudents(newSelection);
    };

    const handleCourseFilterChange = (course: string) => {
        setCourseFilters(prev => {
            const newFilters = new Set(prev);
            if (newFilters.has(course)) {
                newFilters.delete(course);
            } else {
                newFilters.add(course);
            }
            return Array.from(newFilters);
        });
    };
    
    const filteredCourseOptions = useMemo(() => courses.filter(course =>
        course.name.toLowerCase().includes(courseSearch.toLowerCase())
    ), [courses, courseSearch]);


    return (
        <div className="bg-gray-50 min-h-full py-3">
            <div className="container mx-auto px-6 lg:px-8">
                <div className="max-w-full mx-auto">
                    <AdminPageHeader
                        title="Student Management"
                        subtitle={`Showing ${filteredAndSortedStudents.length} of ${students.length} total students.`}
                        backLinkPath="/admin/dashboard"
                        backTooltipText="Back to Dashboard"
                    />
                    <AdminNav />

                    {/* Toolbar */}
                    <div className="bg-white p-4 rounded-lg shadow-md my-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                            <div className="lg:col-span-5">
                                <input
                                    type="text"
                                    placeholder="Search by name, ID, email, courses, batch name, etc..."
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    className="w-full form-input"
                                />
                            </div>
                            <div>
                                <label htmlFor="grade-filter" className="text-sm font-medium text-gray-700">Grade</label>
                                <select id="grade-filter" value={gradeFilter} onChange={e => setGradeFilter(e.target.value)} className="w-full form-select mt-1">
                                    <option value="">All Grades</option>
                                    {GRADES.map(g => <option key={g} value={g}>{g}</option>)}
                                </select>
                            </div>
                            <div className="relative" ref={courseFilterRef}>
                                <label htmlFor="course-filter-btn" className="text-sm font-medium text-gray-700">Course</label>
                                <button
                                    id="course-filter-btn"
                                    type="button"
                                    onClick={() => setIsCourseFilterOpen(prev => !prev)}
                                    className="w-full form-select mt-1 text-left flex justify-between items-center"
                                >
                                    <span>
                                        {courseFilters.length > 0 ? `${courseFilters.length} course${courseFilters.length > 1 ? 's' : ''} selected` : 'All Courses'}
                                    </span>
                                    <svg className="w-5 h-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                                </button>
                                {isCourseFilterOpen && (
                                    <div className="absolute z-10 w-full mt-1 bg-white rounded-md shadow-lg border border-gray-200">
                                        <div className="p-2 border-b border-gray-200">
                                            <input
                                                type="text"
                                                placeholder="Search courses..."
                                                value={courseSearch}
                                                onChange={e => setCourseSearch(e.target.value)}
                                                className="w-full form-input text-sm"
                                            />
                                        </div>
                                        <ul className="py-1 max-h-48 overflow-y-auto">
                                            {filteredCourseOptions.length > 0 ? filteredCourseOptions.map(course => (
                                                <li key={course.id}>
                                                    <label className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer">
                                                        <input
                                                            type="checkbox"
                                                            checked={courseFilters.includes(course.name)}
                                                            onChange={() => handleCourseFilterChange(course.name)}
                                                            className="h-4 w-4 text-brand-primary focus:ring-brand-primary border-gray-300 rounded mr-3"
                                                        />
                                                        {course.name}
                                                    </label>
                                                </li>
                                            )) : (
                                                <li className="px-4 py-2 text-sm text-gray-500">No courses found.</li>
                                            )}
                                        </ul>
                                    </div>
                                )}
                            </div>
                            <div>
                                <label htmlFor="pref-filter" className="text-sm font-medium text-gray-700">Preference</label>
                                <select id="pref-filter" value={preferenceFilter} onChange={e => setPreferenceFilter(e.target.value)} className="w-full form-select mt-1">
                                    <option value="">All</option>
                                    <option value={ClassPreference.Online}>Online</option>
                                    <option value={ClassPreference.Offline}>Offline</option>
                                </select>
                            </div>
                            <div className="lg:col-span-2">
                                <label htmlFor="batch-filter" className="text-sm font-medium text-gray-700">Batch</label>
                                <select id="batch-filter" value={batchFilter} onChange={e => setBatchFilter(e.target.value)} className="w-full form-select mt-1">
                                    <option value="">All Batches</option>
                                    {batches.sort((a, b) => a.name.localeCompare(b.name)).map(b => <option key={b.id} value={b.id}>{b.name} ({b.courseName})</option>)}
                                </select>
                            </div>
                        </div>
                    </div>


                    <div className="flex justify-between items-center mb-4">
                        <div className="flex items-center space-x-2">
                             <button
                                onClick={() => setIsNotificationModalOpen(true)}
                                disabled={selectedStudents.size === 0}
                                className="bg-green-600 hover:bg-green-700 text-white font-semibold px-4 py-2 rounded-md shadow-sm transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                            >
                                Send Notification ({selectedStudents.size})
                            </button>
                            {selectedStudents.size > 0 && (
                                <button
                                    onClick={handleBulkDelete}
                                    className="bg-red-600 hover:bg-red-700 text-white font-semibold px-4 py-2 rounded-md shadow-sm transition-colors"
                                >
                                    Delete Selected ({selectedStudents.size})
                                </button>
                            )}
                        </div>
                        <button
                            onClick={() => setIsAddModalOpen(true)}
                            className="bg-brand-primary hover:bg-brand-dark text-white font-semibold px-4 py-2 rounded-md shadow-sm transition-colors"
                        >
                            + Add Student
                        </button>
                    </div>

                    {isLoading && <p className="text-center text-gray-500 py-8">Loading students...</p>}
                    {error && <p className="text-center text-red-500 bg-red-100 p-3 rounded-md">{error}</p>}
                    
                    {!isLoading && !error && (
                        <div className="bg-white shadow-md rounded-lg overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th scope="col" className="p-4">
                                                <input 
                                                    ref={selectAllCheckboxRef}
                                                    type="checkbox"
                                                    className="h-4 w-4 text-brand-primary focus:ring-brand-primary border-gray-300 rounded"
                                                    onChange={handleSelectAll}
                                                    checked={areAllVisibleSelected}
                                                />
                                            </th>
                                            <SortableHeader columnKey="name" title="Student Info" sortConfig={sortConfig} requestSort={requestSort} />
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Courses &amp; Joined Date</th>
                                            <SortableHeader columnKey="grade" title="Grade" sortConfig={sortConfig} requestSort={requestSort} />
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Batches / Schedules</th>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                            <th scope="col" className="relative px-6 py-3"><span className="sr-only">Actions</span></th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {filteredAndSortedStudents.length > 0 ? filteredAndSortedStudents.map((user) => (
                                            <tr key={user.id} className="hover:bg-gray-50">
                                                <td className="p-4">
                                                    <input 
                                                        type="checkbox" 
                                                        className="h-4 w-4 text-brand-primary focus:ring-brand-primary border-gray-300 rounded"
                                                        checked={selectedStudents.has(user.id)}
                                                        onChange={(e) => handleSelectOne(e, user.id)}
                                                    />
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                                    <Link to={`/admin/student/${user.id}`} className="text-brand-primary hover:text-brand-dark hover:underline">
                                                        {user.name}
                                                    </Link>
                                                    <div className="text-xs text-gray-500 mt-1">
                                                        ID: <span className="font-mono">{user.id.slice(-6).toUpperCase()}</span> | {user.classPreference || 'N/A'}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    <div className="flex items-center space-x-2">
                                                        {user.courses && user.courses.length > 0 ? (
                                                            user.courses.map(courseName => {
                                                                const course = courses.find(c => c.name === courseName);
                                                                return course ? (
                                                                    <Tooltip key={course.id} content={course.name} position="top">
                                                                        <CourseIcon iconName={course.icon} className="h-6 w-6 text-brand-primary" />
                                                                    </Tooltip>
                                                                ) : null;
                                                            })
                                                        ) : 'N/A'}
                                                    </div>
                                                    <div className="text-xs text-gray-500 mt-1">
                                                        Joined: {user.dateOfJoining ? new Date(user.dateOfJoining).toLocaleDateString() : 'N/A'}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.grade}</td>
                                                <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">
                                                    {(() => {
                                                        const enrollments = studentBatchEnrollments.get(user.id);
                                                        if (enrollments && enrollments.length > 0) {
                                                            return (
                                                                <div className="space-y-2">
                                                                    {enrollments.map((enrollment, index) => {
                                                                        const teacherName = enrollment.teacherId ? teachersMap.get(enrollment.teacherId)?.name : 'Unassigned';
                                                                        return (
                                                                            <div key={`${user.id}-${enrollment.batchName}-${index}`}>
                                                                                <div className="font-semibold text-gray-800">{enrollment.batchName}</div>
                                                                                <div className="text-xs text-gray-600">{enrollment.timing}</div>
                                                                                <div className="text-xs text-indigo-500">by {teacherName}</div>
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </div>
                                                            );
                                                        } else {
                                                            return <span className="text-gray-400 italic">Not in a batch</span>;
                                                        }
                                                    })()}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.contactNumber}</td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <select
                                                        value={user.status || 'Active'}
                                                        onChange={(e) => handleStatusChange(user.id, e.target.value as UserStatus, user.name)}
                                                        className="form-select text-xs py-1 px-2 w-full max-w-[120px]"
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        {Object.values(UserStatus).map(status => (
                                                            <option key={status} value={status}>{status}</option>
                                                        ))}
                                                    </select>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-4">
                                                    <button onClick={() => handleEditUser(user)} className="text-brand-primary hover:text-brand-dark">Edit</button>
                                                    <button onClick={() => handleDeleteUser(user.id)} className="text-red-600 hover:text-red-800">Delete</button>
                                                </td>
                                            </tr>
                                        )) : (
                                            <tr>
                                                <td colSpan={9} className="px-6 py-8 text-center text-sm text-gray-500">No students match the current filters.</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            </div>
            
            <EditUserModal 
                isOpen={!!editingUser}
                onClose={handleCloseEditModal}
                user={editingUser}
                onSave={(users) => { /* Placeholder for teacher saves */ }}
                onStudentSave={handleStudentSaveChanges}
            />
            <AddStudentModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                onSave={handleSaveNewStudent}
            />
            <SendNotificationModal
                isOpen={isNotificationModalOpen}
                onClose={handleCloseNotificationModal}
                recipients={allUsers.filter(u => selectedStudents.has(u.id))}
                onSend={handleSendNotification}
                userType="student"
            />
        </div>
    );
};

export default StudentListPage;