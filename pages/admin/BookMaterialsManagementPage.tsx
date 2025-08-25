import React, { useState, useEffect, useCallback } from 'react';
import type { BookMaterial, Course } from '../../types';
import { BookMaterialType } from '../../types';
import { getAdminBookMaterials, addBookMaterial, updateBookMaterial, deleteBookMaterial, getAdminCourses } from '../../api';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import AdminNav from '../../components/admin/AdminNav';
import Modal from '../../components/Modal';
import ModalHeader from '../../components/ModalHeader';
import SendContentNotificationModal from '../../components/admin/SendContentNotificationModal';

const BookMaterialForm: React.FC<{ material?: Partial<BookMaterial>, courses: Course[], onSave: (material: Partial<BookMaterial>) => void, isLoading: boolean }> = ({ material, courses, onSave, isLoading }) => {
    const [formData, setFormData] = useState<Partial<BookMaterial>>({});

    useEffect(() => {
        setFormData({
            id: material?.id,
            title: material?.title || '',
            description: material?.description || '',
            courseId: material?.courseId || '',
            type: material?.type || BookMaterialType.YouTube,
            url: material?.url || '',
            data: material?.data,
        });
    }, [material]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onloadend = () => {
                setFormData(prev => ({ 
                    ...prev,
                    data: reader.result as string,
                    url: file.name // Store filename in url for display
                }));
            };
            reader.readAsDataURL(file);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };
    
    const handleCourseChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const courseId = e.target.value;
        const courseName = courses.find(c => c.id === courseId)?.name || '';
        setFormData(prev => ({ ...prev, courseId, courseName }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(formData);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label className="form-label">Title</label>
                <input name="title" value={formData.title} onChange={handleChange} required className="form-input w-full" />
            </div>
            <div>
                <label className="form-label">Course</label>
                <select name="courseId" value={formData.courseId} onChange={handleCourseChange} required className="form-select w-full">
                    <option value="" disabled>Select a course</option>
                    {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
            </div>
            <div>
                <label className="form-label">Description</label>
                <textarea name="description" value={formData.description} onChange={handleChange} required rows={3} className="form-textarea w-full" />
            </div>
            <div>
                <label className="form-label">Material Type</label>
                <select name="type" value={formData.type} onChange={handleChange} className="form-select w-full">
                    {Object.values(BookMaterialType).map(t => <option key={t} value={t}>{t}</option>)}
                </select>
            </div>
            {formData.type === BookMaterialType.PDF ? (
                 <div>
                    <label className="form-label">PDF File</label>
                    <input type="file" onChange={handleFileChange} accept=".pdf" required className="form-input w-full" />
                    {formData.data && <p className="text-xs text-green-600 mt-1">File selected: {formData.url}</p>}
                </div>
            ) : (
                <div>
                    <label className="form-label">URL</label>
                    <input name="url" type="url" value={formData.url} onChange={handleChange} required className="form-input w-full" placeholder="https://..."/>
                </div>
            )}
           
            <div className="pt-4 flex justify-end">
                <button type="submit" disabled={isLoading} className="btn-primary">
                    {isLoading ? 'Saving...' : 'Save Material'}
                </button>
            </div>
        </form>
    );
};


const BookMaterialsManagementPage: React.FC = () => {
    const [materials, setMaterials] = useState<BookMaterial[]>([]);
    const [courses, setCourses] = useState<Course[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isFormLoading, setIsFormLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [editingMaterial, setEditingMaterial] = useState<Partial<BookMaterial> | null>(null);
    const [notifyingMaterial, setNotifyingMaterial] = useState<BookMaterial | null>(null);


    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const [materialsData, coursesData] = await Promise.all([getAdminBookMaterials(), getAdminCourses()]);
            setMaterials(materialsData);
            setCourses(coursesData);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch data.');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleSave = async (material: Partial<BookMaterial>) => {
        setIsFormLoading(true);
        try {
            if (material.id) {
                await updateBookMaterial(material.id, material);
            } else {
                await addBookMaterial(material as Omit<BookMaterial, 'id'>);
            }
            setEditingMaterial(null);
            await fetchData();
        } catch (err) {
            alert(err instanceof Error ? err.message : 'Failed to save material.');
        } finally {
            setIsFormLoading(false);
        }
    };
    
    const handleDelete = async (id: string) => {
        if (window.confirm('Are you sure you want to delete this material?')) {
            try {
                await deleteBookMaterial(id);
                await fetchData();
            } catch (err) {
                 alert(err instanceof Error ? err.message : 'Failed to delete material.');
            }
        }
    };

    return (
        <div className="bg-gray-50 min-h-full py-3">
            <div className="container mx-auto px-6 lg:px-8">
                <AdminPageHeader title="Book Materials" subtitle="Upload and manage course materials." backLinkPath="/admin/dashboard" backTooltipText="Back to Dashboard" />
                <AdminNav />

                <div className="mt-8">
                    <div className="flex justify-end mb-4">
                        <button onClick={() => setEditingMaterial({})} className="btn-primary">
                            + Add New Material
                        </button>
                    </div>
                    {isLoading && <p>Loading materials...</p>}
                    {error && <p className="text-red-500">{error}</p>}
                    {!isLoading && !error && (
                        <div className="bg-white shadow-md rounded-lg overflow-hidden">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="th-base">Title</th>
                                        <th className="th-base">Course</th>
                                        <th className="th-base">Type</th>
                                        <th className="th-base text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {materials.map(material => (
                                        <tr key={material.id}>
                                            <td className="td-base font-medium">{material.title}</td>
                                            <td className="td-base">{material.courseName}</td>
                                            <td className="td-base"><span className="badge badge-green">{material.type}</span></td>
                                            <td className="td-base text-right space-x-2">
                                                <button onClick={() => setNotifyingMaterial(material)} className="btn-send">Send</button>
                                                <button onClick={() => setEditingMaterial(material)} className="btn-secondary">Edit</button>
                                                <button onClick={() => handleDelete(material.id)} className="btn-danger">Delete</button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            <Modal isOpen={!!editingMaterial} onClose={() => setEditingMaterial(null)} size="lg">
                <ModalHeader title={editingMaterial?.id ? 'Edit Material' : 'Add New Material'} />
                <BookMaterialForm material={editingMaterial || {}} courses={courses} onSave={handleSave} isLoading={isFormLoading} />
            </Modal>
            
             <SendContentNotificationModal
                isOpen={!!notifyingMaterial}
                onClose={() => setNotifyingMaterial(null)}
                contentItem={notifyingMaterial}
                contentType="BookMaterial"
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
                .badge { font-size: 12px; font-weight: 500; padding: 4px 8px; border-radius: 12px; }
                .badge-green { background-color: #D1FAE5; color: #065F46; }
            `}</style>
        </div>
    );
};

export default BookMaterialsManagementPage;
