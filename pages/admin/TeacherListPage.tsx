
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import type { User, Course } from '../../types';
import { UserRole, ClassPreference, UserStatus } from '../../types';
import { getAdminUsers, updateUserByAdmin, deleteUserByAdmin, addStudentByAdmin, sendNotification, getCourses } from '../../api';
import EditUserModal from '../../components/admin/EditUserModal';
import AddTeacherModal from '../../components/admin/AddTeacherModal';
import SendNotificationModal from '../../components/admin/SendNotificationModal';
import { WEEKDAYS, TIME_SLOTS } from '../../constants';
import type { AssignmentChanges } from '../../components/admin/AddTeacherModal';
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

const TeacherListPage: React.FC = () => {
    const [allUsers, setAllUsers] = useState<User[]>([]);
    const [courses, setCourses] = useState<Course[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [selectedTeachers, setSelectedTeachers] = useState<Set<string>>(new Set());
    const [isNotificationModalOpen, setIsNotificationModalOpen] = useState(false);

    // Search, Sort, and Filter State
    const [searchQuery, setSearchQuery] = useState('');
    const [sortConfig, setSortConfig] = useState<SortConfig>(null);
    const [courseFilters, setCourseFilters] = useState<string[]>([]);
    const [isCourseFilterOpen, setIsCourseFilterOpen] = useState(false);
    const [courseSearch, setCourseSearch] = useState('');
    const [preferenceFilter, setPreferenceFilter] = useState('');
    const courseFilterRef = useRef<HTMLDivElement>(null);
    const selectAllCheckboxRef = useRef<HTMLInputElement>(null);

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const [fetchedUsers, fetchedCourses] = await Promise.all([
                getAdminUsers(),
                getCourses()
            ]);
            setAllUsers(fetchedUsers);
            setCourses(fetchedCourses);
            setError(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch teacher data.');
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

    const teachers = useMemo(() => allUsers.filter(u => u.role === UserRole.Teacher), [allUsers]);

    const filteredAndSortedTeachers = useMemo(() => {
        let processTeachers = [...teachers];

        // Filtering
        processTeachers = processTeachers.filter(teacher => {
            if (preferenceFilter && teacher.classPreference !== preferenceFilter) return false;

            if (courseFilters.length > 0) {
                if (!teacher.courseExpertise || teacher.courseExpertise.length === 0) return false;
                const teacherHasExpertise = courseFilters.some(filterCourse => 
                    teacher.courseExpertise!.includes(filterCourse)
                );
                if (!teacherHasExpertise) return false;
            }

            const assignedStudents = allUsers.filter(u => u.role === UserRole.Student && u.schedules?.some(s => s.teacherId === teacher.id));
            
            if (searchQuery) {
                const searchTerm = searchQuery.toLowerCase();
                const searchIn = [
                    teacher.name,
                    teacher.id,
                    teacher.email,
                    teacher.contactNumber,
                    ...(teacher.courseExpertise || []),
                    ...assignedStudents.flatMap(s => s.schedules?.map(sc => sc.timing) || [])
                ].filter(Boolean).join(' ').toLowerCase();
                
                if (!searchIn.includes(searchTerm)) return false;
            }
            return true;
        });

        // Sorting
        if (sortConfig !== null) {
            processTeachers.sort((a, b) => {
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

        return processTeachers;
    }, [teachers, allUsers, searchQuery, courseFilters, preferenceFilter, sortConfig]);

    const areAllVisibleSelected = useMemo(() =>
        filteredAndSortedTeachers.length > 0 &&
        filteredAndSortedTeachers.every(s => selectedTeachers.has(s.id)),
        [filteredAndSortedTeachers, selectedTeachers]
    );

    useEffect(() => {
        if (selectAllCheckboxRef.current) {
            const someVisibleSelected = filteredAndSortedTeachers.some(s => selectedTeachers.has(s.id));
            selectAllCheckboxRef.current.indeterminate = someVisibleSelected && !areAllVisibleSelected;
        }
    }, [areAllVisibleSelected, filteredAndSortedTeachers, selectedTeachers]);

    const handleEditUser = (user: User) => setEditingUser(user);

    const handleDeleteUser = async (userId: string) => {
        if (window.confirm('Are you sure you want to move this teacher to the trash?')) {
            try {
                await deleteUserByAdmin(userId);
                // Refetch all users to ensure students assigned to this teacher are updated
                await fetchData();
            } catch (err) {
                alert(err instanceof Error ? err.message : 'Failed to delete teacher.');
            }
        }
    };
    
    const handleBulkDelete = async () => {
        const selectedCount = selectedTeachers.size;
        if (selectedCount === 0) return;

        if (window.confirm(`Are you sure you want to move ${selectedCount} selected teacher(s) to the trash? This will unassign them from all students.`)) {
            try {
                const deletePromises = Array.from(selectedTeachers).map(userId => deleteUserByAdmin(userId));
                await Promise.all(deletePromises);
                
                setSelectedTeachers(new Set());
                await fetchData();
                alert(`${selectedCount} teacher(s) moved to trash successfully.`);
            } catch (err) {
                alert(err instanceof Error ? err.message : 'An error occurred while deleting teachers.');
            }
        }
    };

    const handleSaveUsers = async (usersToUpdate: User[]) => {
        try {
            await Promise.all(usersToUpdate.map(user => updateUserByAdmin(user.id, user)));
            setEditingUser(null);
            // Refetch all data to ensure UI consistency
            await fetchData();
        } catch (err) {
            alert(err instanceof Error ? err.message : 'Failed to save teacher.');
        }
    };
    
    const handleSaveNewTeacher = async (teacherData: Partial<User>, assignmentChanges: AssignmentChanges) => {
        try {
            // Step 1: Create the new teacher to get their ID
            const newTeacher = await addStudentByAdmin(teacherData);
            
            // Step 2: If there are assignments, prepare student updates
            if (assignmentChanges.size > 0) {
                const currentUsers = await getAdminUsers(); // Fetch fresh user data
                const studentsToUpdate = new Map<string, User>();

                // Iterate over the map of intended changes
                for (const [studentId, courseChanges] of assignmentChanges.entries()) {
                    const originalStudent = currentUsers.find(u => u.id === studentId);
                    if (!originalStudent) continue;

                    // Use the already modified student object if it exists, otherwise clone the original
                    const studentToUpdate = studentsToUpdate.get(studentId) || JSON.parse(JSON.stringify(originalStudent));
                    let newSchedules = studentToUpdate.schedules ? [...studentToUpdate.schedules] : [];

                    // Apply all changes for the current student
                    for (const [course, change] of Object.entries(courseChanges)) {
                        const scheduleIndex = newSchedules.findIndex(s => s.course === course);
                        let schedule = scheduleIndex > -1 ? { ...newSchedules[scheduleIndex] } : { course, timing: '', teacherId: '' };

                        if (change.newTiming !== undefined) {
                            schedule.timing = change.newTiming;
                        }

                        if (change.assignNewTeacher) {
                            schedule.teacherId = newTeacher.id;
                        }

                        if (schedule.timing === '' || schedule.timing === null) {
                            // If timing is cleared, remove the schedule entirely
                            newSchedules = newSchedules.filter(s => s.course !== course);
                        } else if (scheduleIndex > -1) {
                            newSchedules[scheduleIndex] = schedule;
                        } else {
                            newSchedules.push(schedule);
                        }
                    }
                    studentToUpdate.schedules = newSchedules;
                    studentsToUpdate.set(studentId, studentToUpdate);
                }

                // Step 3: Batch update all modified students
                if (studentsToUpdate.size > 0) {
                    await Promise.all(
                        Array.from(studentsToUpdate.values()).map(s => updateUserByAdmin(s.id, s))
                    );
                }
            }

            // Step 4: Refresh all data and close the modal
            await fetchData();
            setIsAddModalOpen(false);

        } catch (err) {
            alert(err instanceof Error ? err.message : 'An error occurred while creating the teacher.');
        }
    };

    const handleSendNotification = async (subject: string, message: string) => {
        try {
            await sendNotification(Array.from(selectedTeachers), subject, message);
        } catch (err) {
            // The modal will display the error, so we re-throw to let it handle it.
            throw err;
        }
    };
    
    const handleCloseNotificationModal = () => {
        setIsNotificationModalOpen(false);
        setSelectedTeachers(new Set()); // Clear selection when modal is closed
    };


    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newSelection = new Set(selectedTeachers);
        if (e.target.checked) {
            filteredAndSortedTeachers.forEach(s => newSelection.add(s.id));
        } else {
            filteredAndSortedTeachers.forEach(s => newSelection.delete(s.id));
        }
        setSelectedTeachers(newSelection);
    };

    const handleSelectOne = (e: React.ChangeEvent<HTMLInputElement>, userId: string) => {
        const newSelection = new Set(selectedTeachers);
        if (e.target.checked) {
            newSelection.add(userId);
        } else {
            newSelection.delete(userId);
        }
        setSelectedTeachers(newSelection);
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
                        title="Teacher Management"
                        subtitle={`Showing ${filteredAndSortedTeachers.length} of ${teachers.length} total teachers.`}
                        backLinkPath="/admin/dashboard"
                        backTooltipText="Back to Dashboard"
                    />
                     <AdminNav />

                    <div className="bg-white p-4 rounded-lg shadow-md my-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            <div className="lg:col-span-1">
                                <input
                                    type="text"
                                    placeholder="Search by name, ID, email, courses, etc..."
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    className="w-full form-input"
                                />
                            </div>
                            <div className="relative" ref={courseFilterRef}>
                                <label htmlFor="course-filter-btn" className="text-sm font-medium text-gray-700">Course Expertise</label>
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
                                    <option value={ClassPreference.Hybrid}>Hybrid</option>
                                </select>
                            </div>
                        </div>
                    </div>
                    
                    <div className="flex justify-between items-center mb-4">
                        <div className="flex items-center space-x-2">
                            <button
                                onClick={() => setIsNotificationModalOpen(true)}
                                disabled={selectedTeachers.size === 0}
                                className="bg-green-600 hover:bg-green-700 text-white font-semibold px-4 py-2 rounded-md shadow-sm transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                            >
                                Send Notification ({selectedTeachers.size})
                            </button>
                             {selectedTeachers.size > 0 && (
                                <button
                                    onClick={handleBulkDelete}
                                    className="bg-red-600 hover:bg-red-700 text-white font-semibold px-4 py-2 rounded-md shadow-sm transition-colors"
                                >
                                    Delete Selected ({selectedTeachers.size})
                                </button>
                            )}
                        </div>
                         <button
                            onClick={() => setIsAddModalOpen(true)}
                            className="bg-brand-primary hover:bg-brand-dark text-white font-semibold px-4 py-2 rounded-md shadow-sm transition-colors"
                        >
                            + Add Teacher
                        </button>
                    </div>

                    {isLoading && <p className="text-center text-gray-500 py-8">Loading teachers...</p>}
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
                                            <SortableHeader columnKey="name" title="Teacher Info" sortConfig={sortConfig} requestSort={requestSort} />
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Course Expertise & Joined Date</th>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Students Assigned</th>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                            <th scope="col" className="relative px-6 py-3"><span className="sr-only">Actions</span></th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {filteredAndSortedTeachers.length > 0 ? filteredAndSortedTeachers.map((user) => {
                                            const assignedStudentCount = allUsers.filter(u => u.role === UserRole.Student && u.schedules?.some(s => s.teacherId === user.id)).length;
                                            return (
                                            <tr key={user.id} className="hover:bg-gray-50">
                                                <td className="p-4">
                                                    <input 
                                                        type="checkbox" 
                                                        className="h-4 w-4 text-brand-primary focus:ring-brand-primary border-gray-300 rounded"
                                                        checked={selectedTeachers.has(user.id)}
                                                        onChange={(e) => handleSelectOne(e, user.id)}
                                                    />
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                    {user.name}
                                                    <div className="text-xs text-gray-500 mt-1">
                                                        ID: <span className="font-mono">{user.id.slice(-6).toUpperCase()}</span> | {user.classPreference || 'N/A'}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    {user.courseExpertise?.join(', ') || 'N/A'}
                                                    <div className="text-xs text-gray-500 mt-1">
                                                        Joined: {user.dateOfJoining ? new Date(user.dateOfJoining).toLocaleDateString() : 'N/A'}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{assignedStudentCount}</td>
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
                                        )
                                        }) : (
                                            <tr>
                                                <td colSpan={8} className="px-6 py-8 text-center text-sm text-gray-500">No teachers match the current filters.</td>
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
                onClose={() => setEditingUser(null)}
                user={editingUser}
                onSave={handleSaveUsers}
            />
             <AddTeacherModal 
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                onSave={handleSaveNewTeacher}
             />
             <SendNotificationModal
                isOpen={isNotificationModalOpen}
                onClose={handleCloseNotificationModal}
                recipients={allUsers.filter(u => selectedTeachers.has(u.id))}
                onSend={handleSendNotification}
                userType="teacher"
            />
        </div>
    );
};

export default TeacherListPage;