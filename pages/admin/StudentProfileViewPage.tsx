
import React, { useState, useEffect, useCallback } from 'react';
import type { User, Course, Batch, Invoice, ClassPreference } from '../../types';
import { getAdminUserById, getCourses, getBatches, getAdminInvoices, updateUserByAdmin, updateBatch } from '../../api';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import { CourseIcon } from '../../components/icons';
import WizardTabs from '../../components/WizardTabs';
import { InvoiceStatus } from '../../types';
import EditUserModal from '../../components/admin/EditUserModal';

interface StudentProfileViewPageProps {
    studentId: string;
}

const InfoField: React.FC<{ label: string; value?: string | number | null; className?: string }> = ({ label, value, className }) => (
    <div className={className}>
        <h4 className="text-sm font-medium text-gray-500">{label}</h4>
        <p className="text-gray-800 mt-1">{value || <span className="text-gray-400 italic">Not Provided</span>}</p>
    </div>
);

const getStatusBadgeClass = (status: InvoiceStatus) => {
    switch (status) {
        case InvoiceStatus.Paid:
            return 'bg-green-100 text-green-800';
        case InvoiceStatus.Pending:
            return 'bg-yellow-100 text-yellow-800';
        case InvoiceStatus.Overdue:
            return 'bg-red-100 text-red-800';
        default:
            return 'bg-gray-100 text-gray-800';
    }
};

const StudentProfileViewPage: React.FC<StudentProfileViewPageProps> = ({ studentId }) => {
    const [student, setStudent] = useState<User | null>(null);
    const [courses, setCourses] = useState<Course[]>([]);
    const [batches, setBatches] = useState<Batch[]>([]);
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [currentStep, setCurrentStep] = useState(1);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    
    const steps = ['Profile', 'Account & Contact', 'Schedule & Courses', 'Fee History'];

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const [fetchedStudent, fetchedCourses, fetchedBatches, allInvoices] = await Promise.all([
                getAdminUserById(studentId),
                getCourses(),
                getBatches(),
                getAdminInvoices(), // Fetch all invoices and filter locally
            ]);
            setStudent(fetchedStudent);
            setCourses(fetchedCourses);
            setBatches(fetchedBatches);
            setInvoices(allInvoices.filter(inv => inv.student?.id === studentId));
            setError(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Could not fetch student data.");
        } finally {
            setIsLoading(false);
        }
    }, [studentId]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

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
                    if (payload.teacherId && typeof payload.teacherId === 'object') {
                        payload.teacherId = (payload.teacherId as Partial<User>).id;
                    }
                    batchUpdatePromises.push(updateBatch(batchId, payload));
                });
    
                await Promise.all([updatedUserPromise, ...batchUpdatePromises]);
                
                setIsEditModalOpen(false);
                await fetchData();
            } catch (err) {
                alert(err instanceof Error ? err.message : 'An error occurred while saving.');
            }
        }
    };
    
    const getStudentEnrollments = () => {
        if (!student) return [];
        
        return batches.map(batch => {
            const enrollmentsInBatch = batch.schedule.filter(s => s.studentIds.includes(student.id));
            if (enrollmentsInBatch.length > 0) {
                return {
                    batchName: batch.name,
                    courseName: batch.courseName,
                    timings: enrollmentsInBatch.map(e => e.timing),
                    teacher: typeof batch.teacherId === 'object' ? batch.teacherId as User : null,
                    mode: batch.mode,
                };
            }
            return null;
        }).filter((e): e is NonNullable<typeof e> => e !== null);
    };

    if (isLoading) return <div className="p-8 text-center">Loading student profile...</div>;
    if (error) return <div className="p-8 text-center text-red-500 bg-red-100 rounded-md">{error}</div>;
    if (!student) return <div className="p-8 text-center">Student not found.</div>;

    const renderStepContent = () => {
        switch (currentStep) {
            case 1: // Profile
                return (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="md:col-span-1 flex flex-col items-center">
                            <img 
                                src={student.photoUrl || `https://ui-avatars.com/api/?name=${student.name}&background=e8eaf6&color=1a237e&size=128`}
                                alt="Profile" 
                                className="h-40 w-40 rounded-full object-cover shadow-lg"
                            />
                        </div>
                        <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
                            <InfoField label="Student Name" value={student.name} className="sm:col-span-2" />
                            <InfoField label="Date of Birth" value={student.dob ? new Date(student.dob).toLocaleDateString() : null} />
                            <InfoField label="Sex" value={student.sex} />
                            <InfoField label="School Name" value={student.schoolName} />
                            <InfoField label="Standard" value={student.standard} />
                            <InfoField label="Grade" value={student.grade} />
                             <InfoField label="Date of Joining" value={student.dateOfJoining ? new Date(student.dateOfJoining).toLocaleDateString() : null} />
                        </div>
                    </div>
                );
            case 2: // Account & Contact
                 return (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                         <InfoField label="Parent's/Guardian's Name" value={student.fatherName} />
                         <InfoField label="Email ID" value={student.email} />
                         <InfoField label="Contact Number" value={student.contactNumber} />
                         <InfoField label="Alternate Contact" value={student.alternateContactNumber} />
                         <InfoField label="Country" value={student.country} />
                         <InfoField label="State" value={student.state} />
                         <InfoField label="City" value={student.city} />
                         <InfoField label="Postal Code" value={student.postalCode} />
                         <InfoField label="Address" value={student.address} className="md:col-span-3"/>
                         <InfoField label="Student ID" value={student.id} className="font-mono text-sm" />
                     </div>
                 );
            case 3: // Schedule & Courses
                const enrollments = getStudentEnrollments();
                return (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div>
                            <h4 className="text-sm font-medium text-gray-500 mb-2">Enrolled Courses</h4>
                            {student.courses && student.courses.length > 0 ? (
                                <div className="flex flex-wrap gap-2">
                                    {student.courses.map(courseName => (
                                        <div key={courseName} className="flex items-center space-x-2 bg-gray-100 px-3 py-1.5 rounded-md">
                                             <CourseIcon iconName={courses.find(c => c.name === courseName)?.icon || ''} className="h-5 w-5 text-brand-primary" />
                                            <span className="text-sm font-medium text-gray-800">{courseName}</span>
                                        </div>
                                    ))}
                                </div>
                            ) : <p className="text-gray-400 italic">No courses selected.</p>}
                        </div>
                         <div>
                            <h4 className="text-sm font-medium text-gray-500 mb-2">Preferences</h4>
                            <div className="flex space-x-8">
                                <InfoField label="Class Preference" value={student.classPreference} />
                            </div>
                        </div>
                        <div className="md:col-span-2">
                            <h4 className="text-sm font-medium text-gray-500 mb-2">Student's Preferred Timings</h4>
                            {student.preferredTimings && student.preferredTimings.length > 0 ? (
                                <div className="flex flex-wrap gap-2">
                                    {student.preferredTimings.map(timing => (
                                        <span key={timing} className="bg-yellow-100 text-yellow-800 text-xs font-medium px-2.5 py-1 rounded-full">
                                            {timing}
                                        </span>
                                    ))}
                                </div>
                            ) : <p className="text-gray-400 italic">No preferred timings set.</p>}
                        </div>
                        <div className="md:col-span-2">
                            <h4 className="text-sm font-medium text-gray-500 mb-2">Assigned Schedule</h4>
                             {enrollments.length > 0 ? (
                                <div className="space-y-4">
                                    {enrollments.map((enrollment, idx) => (
                                        <div key={idx} className="p-3 bg-indigo-50/70 rounded-lg border border-indigo-200">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <p className="font-semibold text-gray-800">{enrollment.courseName}: <span className="font-normal">in "{enrollment.batchName}"</span></p>
                                                    <p className="text-sm text-gray-600">Teacher: {enrollment.teacher?.name || <span className="text-gray-400 italic">Not Assigned</span>}</p>
                                                </div>
                                                {enrollment.mode && (
                                                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${enrollment.mode === 'Online' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'}`}>
                                                        {enrollment.mode}
                                                    </span>
                                                )}
                                            </div>
                                            <ul className="text-sm list-disc list-inside ml-4 mt-1 space-y-0.5">
                                                {enrollment.timings.map(t => <li key={t}>{t}</li>)}
                                            </ul>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center text-sm text-gray-500 py-4 border-2 border-dashed rounded-lg">
                                    Student is not currently assigned to a batch.
                                </div>
                            )}
                        </div>
                    </div>
                );
            case 4: // Fee History
                return (
                    <div className="bg-white rounded-lg shadow-sm border overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                             <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Issue Date</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Course</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Due Date</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                </tr>
                            </thead>
                             <tbody className="bg-white divide-y divide-gray-200">
                                {invoices.length > 0 ? (
                                    invoices.map(invoice => (
                                        <tr key={invoice.id}>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{new Date(invoice.issueDate).toLocaleDateString()}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{invoice.courseName}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{invoice.amount} {invoice.currency}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{new Date(invoice.dueDate).toLocaleDateString()}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeClass(invoice.status)}`}>
                                                    {invoice.status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr><td colSpan={5} className="text-center py-4 text-gray-500">No invoices found for this student.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                );
            default: return null;
        }
    }

    return (
        <div className="bg-gray-50 min-h-full py-6">
            <div className="container mx-auto px-6 lg:px-8">
                <div className="max-w-5xl mx-auto">
                    <div className="flex justify-between items-start">
                        <AdminPageHeader
                            title="Student Profile"
                            subtitle={`Viewing details for ${student.name}`}
                            backLinkPath="/admin/students"
                            backTooltipText="Back to Student List"
                        />
                         <div className="mt-1 flex-shrink-0">
                             <button
                                onClick={() => setIsEditModalOpen(true)}
                                className="bg-brand-primary hover:bg-brand-dark text-white font-semibold px-4 py-2 rounded-md shadow-sm transition-colors"
                            >
                                Edit Profile
                            </button>
                        </div>
                    </div>
                    
                    <div className="bg-white p-6 rounded-lg shadow-xl">
                        <WizardTabs steps={steps} currentStep={currentStep} onStepClick={setCurrentStep} />
                        <div className="mt-6 min-h-[20rem]">
                            {renderStepContent()}
                        </div>
                    </div>
                </div>
            </div>
            {student && (
                <EditUserModal
                    isOpen={isEditModalOpen}
                    onClose={() => setIsEditModalOpen(false)}
                    user={student}
                    onSave={() => {}} // Not used for student edits
                    onStudentSave={handleStudentSaveChanges}
                />
            )}
        </div>
    );
};

export default StudentProfileViewPage;
