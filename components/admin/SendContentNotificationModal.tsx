
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import Modal from '../Modal';
import ModalHeader from '../ModalHeader';
import TabButton from './TabButton';
import type { User, Batch, Course, Event, GradeExam, BookMaterial, Notice } from '../../types';
import { UserRole } from '../../types';
import { getAdminUsers, getBatches, getAdminCourses, sendContentNotification } from '../../api';
import { WhatsAppIcon } from '../icons';

type ContentItem = Event | GradeExam | BookMaterial | Notice;
type ContentType = 'Event' | 'GradeExam' | 'BookMaterial' | 'Notice';

interface SendContentNotificationModalProps {
    isOpen: boolean;
    onClose: () => void;
    contentItem: ContentItem | null;
    contentType: ContentType;
}

const SendContentNotificationModal: React.FC<SendContentNotificationModalProps> = ({ isOpen, onClose, contentItem, contentType }) => {
    const [activeTab, setActiveTab] = useState<'user' | 'group' | 'broadcast'>('user');
    const [isLoading, setIsLoading] = useState(true);
    const [isSending, setIsSending] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [sendWhatsApp, setSendWhatsApp] = useState(false);

    // Data
    const [allUsers, setAllUsers] = useState<User[]>([]);
    const [allBatches, setAllBatches] = useState<Batch[]>([]);
    const [allCourses, setAllCourses] = useState<Course[]>([]);

    // Selections
    const [selectedStudentIds, setSelectedStudentIds] = useState(new Set<string>());
    const [selectedTeacherIds, setSelectedTeacherIds] = useState(new Set<string>());
    const [selectedBatchIds, setSelectedBatchIds] = useState(new Set<string>());
    const [selectedCourseIds, setSelectedCourseIds] = useState(new Set<string>());
    const [broadcastOption, setBroadcastOption] = useState<'allStudents' | 'allTeachers' | 'everyone' | null>(null);

    // Search
    const [studentSearch, setStudentSearch] = useState('');
    const [teacherSearch, setTeacherSearch] = useState('');

    const studentSelectAllRef = useRef<HTMLInputElement>(null);
    const teacherSelectAllRef = useRef<HTMLInputElement>(null);

    const resetState = useCallback(() => {
        setActiveTab('user');
        setIsLoading(true);
        setIsSending(false);
        setError(null);
        setSuccess(null);
        setSendWhatsApp(false);
        setSelectedStudentIds(new Set());
        setSelectedTeacherIds(new Set());
        setSelectedBatchIds(new Set());
        setSelectedCourseIds(new Set());
        setBroadcastOption(null);
        setStudentSearch('');
        setTeacherSearch('');
    }, []);

    useEffect(() => {
        if (isOpen) {
            resetState();
            const fetchData = async () => {
                try {
                    const [users, batches, courses] = await Promise.all([getAdminUsers(), getBatches(), getAdminCourses()]);
                    setAllUsers(users);
                    setAllBatches(batches);
                    setAllCourses(courses);
                } catch (err) {
                    setError(err instanceof Error ? err.message : 'Failed to load recipient data.');
                } finally {
                    setIsLoading(false);
                }
            };
            fetchData();
        }
    }, [isOpen, resetState]);

    const students = useMemo(() => allUsers.filter(u => u.role === UserRole.Student), [allUsers]);
    const teachers = useMemo(() => allUsers.filter(u => u.role === UserRole.Teacher), [allUsers]);

    const filteredStudents = useMemo(() =>
        students.filter(u =>
            (u.name || '').toLowerCase().includes(studentSearch.toLowerCase()) ||
            (u.email || '').toLowerCase().includes(studentSearch.toLowerCase())
        ),
        [students, studentSearch]
    );

    const filteredTeachers = useMemo(() =>
        teachers.filter(u =>
            (u.name || '').toLowerCase().includes(teacherSearch.toLowerCase()) ||
            (u.email || '').toLowerCase().includes(teacherSearch.toLowerCase())
        ),
        [teachers, teacherSearch]
    );

    const finalUserIds = useMemo(() => {
        const finalIds = new Set<string>();
        
        switch (activeTab) {
            case 'user':
                selectedStudentIds.forEach(id => finalIds.add(id));
                selectedTeacherIds.forEach(id => finalIds.add(id));
                break;
            case 'group':
                selectedBatchIds.forEach(batchId => {
                    const batch = allBatches.find(b => b.id === batchId);
                    batch?.schedule.forEach(s => s.studentIds.forEach(id => finalIds.add(id)));
                });
                selectedCourseIds.forEach(courseId => {
                    const course = allCourses.find(c => c.id === courseId);
                    if(course) {
                        students.forEach(s => { if(s.courses?.includes(course.name)) finalIds.add(s.id); });
                        teachers.forEach(t => { if(t.courseExpertise?.includes(course.name)) finalIds.add(t.id); });
                    }
                });
                break;
            case 'broadcast':
                if (broadcastOption === 'allStudents') students.forEach(s => finalIds.add(s.id));
                if (broadcastOption === 'allTeachers') teachers.forEach(t => finalIds.add(t.id));
                if (broadcastOption === 'everyone') allUsers.forEach(u => u.role !== UserRole.Admin && finalIds.add(u.id));
                break;
        }
        
        return Array.from(finalIds);
    }, [activeTab, selectedStudentIds, selectedTeacherIds, selectedBatchIds, selectedCourseIds, broadcastOption, allUsers, allBatches, allCourses, students, teachers]);

    const handleSingleSelectionChange = (id: string, type: 'student' | 'teacher') => {
        const setter = type === 'student' ? setSelectedStudentIds : setSelectedTeacherIds;
        setter(prev => {
            const newSet = new Set(prev);
            if (newSet.has(id)) newSet.delete(id);
            else newSet.add(id);
            return newSet;
        });
    };

    const handleSelectAll = (type: 'student' | 'teacher', isChecked: boolean) => {
        const userList = type === 'student' ? filteredStudents : filteredTeachers;
        const setter = type === 'student' ? setSelectedStudentIds : setSelectedTeacherIds;
        
        setter(prev => {
            const newSet = new Set(prev);
            if (isChecked) {
                userList.forEach(user => newSet.add(user.id));
            } else {
                userList.forEach(user => newSet.delete(user.id));
            }
            return newSet;
        });
    };

    const useIndeterminateCheckbox = (ref: React.RefObject<HTMLInputElement>, filteredUsers: User[], selectedIds: Set<string>) => {
        const allSelected = filteredUsers.length > 0 && filteredUsers.every(u => selectedIds.has(u.id));
        const someSelected = filteredUsers.some(u => selectedIds.has(u.id));
        useEffect(() => {
            if (ref.current) ref.current.indeterminate = someSelected && !allSelected;
        }, [ref, someSelected, allSelected]);
        return allSelected;
    };

    const areAllStudentsSelected = useIndeterminateCheckbox(studentSelectAllRef, filteredStudents, selectedStudentIds);
    const areAllTeachersSelected = useIndeterminateCheckbox(teacherSelectAllRef, filteredTeachers, selectedTeacherIds);

    const handleGroupSelectionChange = (id: string, type: 'batch' | 'course') => {
        const setter = type === 'batch' ? setSelectedBatchIds : setSelectedCourseIds;
        setter(prev => {
            const newSet = new Set(prev);
            if (newSet.has(id)) newSet.delete(id);
            else newSet.add(id);
            return newSet;
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!contentItem) return;
        if (finalUserIds.length === 0) {
            setError('Please select at least one recipient.');
            return;
        }
        setIsSending(true);
        setError(null);
        setSuccess(null);

        try {
            const subject = `${contentType}: ${contentItem.title}`;
            const message = `A new ${contentType.toLowerCase()} has been posted: "${contentItem.title}". Please log in to your dashboard to view the details.`;
            
            const response = await sendContentNotification({
                contentId: contentItem.id,
                contentType,
                userIds: finalUserIds,
                subject,
                message,
                sendWhatsApp,
            });
            setSuccess(response.message);
            setTimeout(() => {
                onClose();
            }, 3000);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to send notification.');
        } finally {
            setIsSending(false);
        }
    };

    if (!contentItem) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} size="full">
            <form onSubmit={handleSubmit} className="flex flex-col h-full">
                <div className="flex-shrink-0 px-6 pt-6"><ModalHeader title={`Send Notification for: ${contentItem.title}`} /></div>
                <div className="flex-shrink-0 px-6 border-b border-gray-200">
                    <nav className="-mb-px flex space-x-6" aria-label="Tabs">
                        <TabButton isActive={activeTab === 'user'} onClick={() => setActiveTab('user')}>By User</TabButton>
                        <TabButton isActive={activeTab === 'group'} onClick={() => setActiveTab('group')}>By Group</TabButton>
                        <TabButton isActive={activeTab === 'broadcast'} onClick={() => setActiveTab('broadcast')}>Broadcast</TabButton>
                    </nav>
                </div>
                
                <div className="flex-grow min-h-0 p-6 overflow-y-auto">
                    {isLoading ? <div className="flex justify-center items-center h-full"><p className="text-gray-500">Loading recipient data...</p></div>
                    : activeTab === 'user' ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-full">
                            <div className="flex flex-col h-full">
                                <label className="form-label flex-shrink-0">Select Students</label>
                                <input type="text" placeholder="Search students..." value={studentSearch} onChange={e => setStudentSearch(e.target.value)} className="form-input w-full mb-2 text-sm flex-shrink-0"/>
                                <div className="flex items-center space-x-3 p-2 border-t border-x bg-gray-50/50 rounded-t-md flex-shrink-0">
                                    <input ref={studentSelectAllRef} type="checkbox" onChange={e => handleSelectAll('student', e.target.checked)} checked={areAllStudentsSelected} className="h-4 w-4 text-brand-primary rounded" />
                                    <label className="text-sm font-medium">Select All ({filteredStudents.length})</label>
                                </div>
                                <ul className="border rounded-b-md divide-y overflow-y-auto flex-grow">
                                    {filteredStudents.map(user => (
                                        <li key={user.id}><label className="flex items-center p-2 hover:bg-gray-50 cursor-pointer"><input type="checkbox" checked={selectedStudentIds.has(user.id)} onChange={() => handleSingleSelectionChange(user.id, 'student')} className="h-4 w-4 text-brand-primary rounded mr-3"/> <span className="text-sm font-medium text-gray-800">{user.name}</span></label></li>
                                    ))}
                                </ul>
                            </div>
                            <div className="flex flex-col h-full">
                                <label className="form-label flex-shrink-0">Select Teachers</label>
                                <input type="text" placeholder="Search teachers..." value={teacherSearch} onChange={e => setTeacherSearch(e.target.value)} className="form-input w-full mb-2 text-sm flex-shrink-0"/>
                                <div className="flex items-center space-x-3 p-2 border-t border-x bg-gray-50/50 rounded-t-md flex-shrink-0">
                                    <input ref={teacherSelectAllRef} type="checkbox" onChange={e => handleSelectAll('teacher', e.target.checked)} checked={areAllTeachersSelected} className="h-4 w-4 text-brand-primary rounded" />
                                    <label className="text-sm font-medium">Select All ({filteredTeachers.length})</label>
                                </div>
                                <ul className="border rounded-b-md divide-y overflow-y-auto flex-grow">
                                    {filteredTeachers.map(user => (
                                        <li key={user.id}><label className="flex items-center p-2 hover:bg-gray-50 cursor-pointer"><input type="checkbox" checked={selectedTeacherIds.has(user.id)} onChange={() => handleSingleSelectionChange(user.id, 'teacher')} className="h-4 w-4 text-brand-primary rounded mr-3"/> <span className="text-sm font-medium text-gray-800">{user.name}</span></label></li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    ) : activeTab === 'group' ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-full">
                            <div className="flex flex-col"><label className="form-label flex-shrink-0">Select Batches (sends to all students in batch)</label><ul className="border rounded-md divide-y overflow-y-auto flex-grow">{allBatches.map(batch => (<li key={batch.id}><label className="flex items-center p-2 hover:bg-gray-50 cursor-pointer"><input type="checkbox" checked={selectedBatchIds.has(batch.id)} onChange={() => handleGroupSelectionChange(batch.id, 'batch')} className="h-4 w-4 text-brand-primary rounded mr-3"/> <span className="text-sm font-medium">{batch.name}</span> <span className="text-sm text-gray-500 ml-2">({batch.courseName})</span></label></li>))}</ul></div>
                            <div className="flex flex-col"><label className="form-label flex-shrink-0">Select Courses (sends to all users in course)</label><ul className="border rounded-md divide-y overflow-y-auto flex-grow">{allCourses.map(course => (<li key={course.id}><label className="flex items-center p-2 hover:bg-gray-50 cursor-pointer"><input type="checkbox" checked={selectedCourseIds.has(course.id)} onChange={() => handleGroupSelectionChange(course.id, 'course')} className="h-4 w-4 text-brand-primary rounded mr-3"/> <span className="text-sm font-medium">{course.name}</span></label></li>))}</ul></div>
                        </div>
                    ) : ( 
                        <div className="space-y-3">
                            <label className={`flex items-center p-4 border rounded-lg cursor-pointer ${broadcastOption === 'allStudents' ? 'bg-indigo-50 border-brand-primary ring-2 ring-brand-primary' : 'hover:bg-gray-50'}`}><input type="radio" name="broadcast" onChange={() => setBroadcastOption('allStudents')} className="h-4 w-4 text-brand-primary mr-3"/> <div><p className="font-medium">All Students</p><p className="text-sm text-gray-500">Send to every student in the system ({students.length} users).</p></div></label>
                            <label className={`flex items-center p-4 border rounded-lg cursor-pointer ${broadcastOption === 'allTeachers' ? 'bg-indigo-50 border-brand-primary ring-2 ring-brand-primary' : 'hover:bg-gray-50'}`}><input type="radio" name="broadcast" onChange={() => setBroadcastOption('allTeachers')} className="h-4 w-4 text-brand-primary mr-3"/> <div><p className="font-medium">All Teachers</p><p className="text-sm text-gray-500">Send to every teacher in the system ({teachers.length} users).</p></div></label>
                            <label className={`flex items-center p-4 border rounded-lg cursor-pointer ${broadcastOption === 'everyone' ? 'bg-indigo-50 border-brand-primary ring-2 ring-brand-primary' : 'hover:bg-gray-50'}`}><input type="radio" name="broadcast" onChange={() => setBroadcastOption('everyone')} className="h-4 w-4 text-brand-primary mr-3"/> <div><p className="font-medium">Everyone</p><p className="text-sm text-gray-500">Send to all students and teachers ({allUsers.filter(u => u.role !== UserRole.Admin).length} users).</p></div></label>
                        </div>
                    )}
                </div>

                <div className="flex-shrink-0 p-6 bg-gray-50 border-t">
                    <div className="flex justify-between items-start">
                        <div className="flex-grow">
                           <div className="flex items-center space-x-3">
                                <input type="checkbox" id="sendWhatsApp" checked={sendWhatsApp} onChange={(e) => setSendWhatsApp(e.target.checked)} className="h-4 w-4 text-brand-primary rounded focus:ring-brand-primary"/>
                                <label htmlFor="sendWhatsApp" className="form-label mb-0 cursor-pointer flex items-center"><WhatsAppIcon className="h-5 w-5 mr-2 text-green-600"/> Also send notification via WhatsApp</label>
                            </div>
                            <p className="text-xs text-gray-500 mt-1 ml-7">Sends a message directly to the recipient's phone. Requires a configured WhatsApp Business API.</p>
                            <p className="font-semibold text-gray-800 mt-2">Summary:</p>
                            <p className="text-gray-700 text-sm">This notification will be sent to <span className="font-bold text-brand-primary">{finalUserIds.length}</span> unique recipient(s).</p>
                            {error && <p className="text-sm text-red-600 mt-1">{error}</p>}
                            {success && <p className="text-sm text-green-600 mt-1">{success}</p>}
                        </div>
                        <div className="flex items-center space-x-3 flex-shrink-0 ml-4">
                            <button type="button" onClick={onClose} disabled={isSending} className="btn-secondary">Cancel</button>
                            <button type="submit" disabled={isSending || isLoading || finalUserIds.length === 0} className="btn-primary">
                                {isSending ? 'Sending...' : `Send Notification (${finalUserIds.length})`}
                            </button>
                        </div>
                    </div>
                </div>
            </form>
            <style>{`
                .btn-primary, .btn-secondary { padding: 8px 16px; border-radius: 6px; font-weight: 500; transition: background-color 0.2s; }
                .btn-primary { background-color: #1a237e; color: white; }
                .btn-primary:hover { background-color: #0d113d; }
                .btn-primary:disabled { background-color: #9fa8da; cursor: not-allowed; }
                .btn-secondary { background-color: white; color: #374151; border: 1px solid #D1D5DB; box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05); }
                .btn-secondary:hover { background-color: #F9FAFB; }
            `}</style>
        </Modal>
    );
};

export default SendContentNotificationModal;
