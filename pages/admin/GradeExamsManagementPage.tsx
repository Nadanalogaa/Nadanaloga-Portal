import React, { useState, useEffect, useCallback } from 'react';
import type { GradeExam } from '../../types';
import { getAdminGradeExams, addGradeExam, updateGradeExam, deleteGradeExam } from '../../api';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import AdminNav from '../../components/admin/AdminNav';
import Modal from '../../components/Modal';
import ModalHeader from '../../components/ModalHeader';
import SendContentNotificationModal from '../../components/admin/SendContentNotificationModal';

const GradeExamForm: React.FC<{ exam?: Partial<GradeExam>, onSave: (exam: Partial<GradeExam>) => void, isLoading: boolean }> = ({ exam, onSave, isLoading }) => {
    const [formData, setFormData] = useState<Partial<GradeExam>>({});

    useEffect(() => {
        setFormData({
            id: exam?.id,
            title: exam?.title || '',
            description: exam?.description || '',
            examDate: exam?.examDate ? new Date(exam.examDate).toISOString().split('T')[0] : '',
            registrationDeadline: exam?.registrationDeadline ? new Date(exam.registrationDeadline).toISOString().split('T')[0] : '',
            syllabusLink: exam?.syllabusLink || '',
        });
    }, [exam]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(formData);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label className="form-label">Exam Title</label>
                <input name="title" value={formData.title} onChange={handleChange} required className="form-input w-full" />
            </div>
            <div>
                <label className="form-label">Description</label>
                <textarea name="description" value={formData.description} onChange={handleChange} required rows={3} className="form-textarea w-full" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="form-label">Exam Date</label>
                    <input name="examDate" type="date" value={formData.examDate} onChange={handleChange} required className="form-input w-full" />
                </div>
                <div>
                    <label className="form-label">Registration Deadline</label>
                    <input name="registrationDeadline" type="date" value={formData.registrationDeadline} onChange={handleChange} required className="form-input w-full" />
                </div>
            </div>
            <div>
                <label className="form-label">Syllabus Link (Optional)</label>
                <input name="syllabusLink" type="url" value={formData.syllabusLink} onChange={handleChange} className="form-input w-full" placeholder="https://example.com/syllabus.pdf"/>
            </div>
            <div className="pt-4 flex justify-end">
                <button type="submit" disabled={isLoading} className="btn-primary">
                    {isLoading ? 'Saving...' : 'Save Exam Info'}
                </button>
            </div>
        </form>
    );
};


const GradeExamsManagementPage: React.FC = () => {
    const [exams, setExams] = useState<GradeExam[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isFormLoading, setIsFormLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [editingExam, setEditingExam] = useState<Partial<GradeExam> | null>(null);
    const [notifyingExam, setNotifyingExam] = useState<GradeExam | null>(null);

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const data = await getAdminGradeExams();
            setExams(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch grade exams.');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleSave = async (exam: Partial<GradeExam>) => {
        setIsFormLoading(true);
        try {
            if (exam.id) {
                await updateGradeExam(exam.id, exam);
            } else {
                await addGradeExam(exam as Omit<GradeExam, 'id'>);
            }
            setEditingExam(null);
            await fetchData();
        } catch (err) {
            alert(err instanceof Error ? err.message : 'Failed to save exam.');
        } finally {
            setIsFormLoading(false);
        }
    };
    
    const handleDelete = async (id: string) => {
        if (window.confirm('Are you sure you want to delete this exam information?')) {
            try {
                await deleteGradeExam(id);
                await fetchData();
            } catch (err) {
                 alert(err instanceof Error ? err.message : 'Failed to delete exam.');
            }
        }
    };

    return (
        <div className="bg-gray-50 min-h-full py-3">
            <div className="container mx-auto px-6 lg:px-8">
                <AdminPageHeader title="Grade Exams Management" subtitle="Manage information about grade exams." backLinkPath="/admin/dashboard" backTooltipText="Back to Dashboard" />
                <AdminNav />

                <div className="mt-8">
                    <div className="flex justify-end mb-4">
                        <button onClick={() => setEditingExam({})} className="btn-primary">
                            + Add New Exam
                        </button>
                    </div>
                    {isLoading && <p>Loading exams...</p>}
                    {error && <p className="text-red-500">{error}</p>}
                    {!isLoading && !error && (
                        <div className="bg-white shadow-md rounded-lg overflow-hidden">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="th-base">Title</th>
                                        <th className="th-base">Exam Date</th>
                                        <th className="th-base">Registration Deadline</th>
                                        <th className="th-base text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {exams.map(exam => (
                                        <tr key={exam.id}>
                                            <td className="td-base font-medium">{exam.title}</td>
                                            <td className="td-base">{new Date(exam.examDate).toLocaleDateString()}</td>
                                            <td className="td-base">{new Date(exam.registrationDeadline).toLocaleDateString()}</td>
                                            <td className="td-base text-right space-x-2">
                                                <button onClick={() => setNotifyingExam(exam)} className="btn-send">Send</button>
                                                <button onClick={() => setEditingExam(exam)} className="btn-secondary">Edit</button>
                                                <button onClick={() => handleDelete(exam.id)} className="btn-danger">Delete</button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            <Modal isOpen={!!editingExam} onClose={() => setEditingExam(null)} size="lg">
                <ModalHeader title={editingExam?.id ? 'Edit Grade Exam' : 'Add New Grade Exam'} />
                <GradeExamForm exam={editingExam || {}} onSave={handleSave} isLoading={isFormLoading} />
            </Modal>
            
            <SendContentNotificationModal
                isOpen={!!notifyingExam}
                onClose={() => setNotifyingExam(null)}
                contentItem={notifyingExam}
                contentType="GradeExam"
            />

            <style>{`
                .th-base { padding: 12px 24px; text-align: left; font-size: 12px; font-weight: 500; color: #4B5563; text-transform: uppercase; letter-spacing: 0.05em; }
                .td-base { padding: 16px 24px; vertical-align: middle; font-size: 14px; color: #374151; }
                .btn-primary { background-color: #1a237e; color: white; padding: 8px 16px; border-radius: 6px; font-weight: 500; transition: background-color 0.2s; }
                .btn-primary:hover { background-color: #0d113d; }
                .btn-primary:disabled { background-color: #9fa8da; cursor: not-allowed; }
                .btn-secondary { background-color: #e8eaf6; color: #1a237e; padding: 6px 12px; border-radius: 6px; font-weight: 500; transition: background-color 0.2s; }
                .btn-danger { background-color: #fee2e2; color: #b91c1c; padding: 6px 12px; border-radius: 6px; font-weight: 500; transition: background-color 0.2s; }
                 .btn-send { background-color: #dbeafe; color: #1e40af; padding: 6px 12px; border-radius: 6px; font-weight: 500; transition: background-color 0.2s; }
            `}</style>
        </div>
    );
};

export default GradeExamsManagementPage;
