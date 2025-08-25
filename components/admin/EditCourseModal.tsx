
import React, { useState, useEffect } from 'react';
import type { Course } from '../../types';
import Modal from '../Modal';
import { ICON_NAMES } from '../icons';
import ModalHeader from '../ModalHeader';

interface EditCourseModalProps {
    isOpen: boolean;
    onClose: () => void;
    course: Partial<Course> | null;
    onSave: (course: Partial<Course>) => void;
}

const EditCourseModal: React.FC<EditCourseModalProps> = ({ isOpen, onClose, course, onSave }) => {
    const [formData, setFormData] = useState<Partial<Course>>({});
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (course) {
            setFormData({
                id: course.id,
                name: course.name || '',
                description: course.description || '',
                icon: course.icon || ICON_NAMES[0],
            });
        }
    }, [course]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        onSave(formData);
        setIsLoading(false);
    };

    if (!course) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose}>
            <div>
                <ModalHeader 
                    title={course.id ? 'Edit Course' : 'Add New Course'}
                />
                <form className="space-y-4" onSubmit={handleSubmit}>
                    <div>
                        <label htmlFor="name" className="block text-sm font-medium text-gray-700">Course Name</label>
                        <input type="text" id="name" name="name" value={formData.name || ''} onChange={handleChange} required className="mt-1 block w-full form-input" />
                    </div>
                    <div>
                        <label htmlFor="description" className="block text-sm font-medium text-gray-700">Description</label>
                        <textarea id="description" name="description" rows={3} value={formData.description || ''} onChange={handleChange} required className="mt-1 block w-full form-textarea"></textarea>
                    </div>
                    <div>
                        <label htmlFor="icon" className="block text-sm font-medium text-gray-700">Icon</label>
                        <select id="icon" name="icon" value={formData.icon} onChange={handleChange} className="mt-1 block w-full form-select">
                            {ICON_NAMES.map(name => <option key={name} value={name}>{name}</option>)}
                        </select>
                        <p className="text-xs text-gray-500 mt-1">This name determines which icon is shown on the homepage.</p>
                    </div>
                    <div>
                        <button type="submit" disabled={isLoading} className="w-full flex justify-center mt-6 py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-brand-primary hover:bg-brand-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors disabled:bg-indigo-300 disabled:cursor-not-allowed">
                            {isLoading ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </form>
            </div>
        </Modal>
    );
};

export default EditCourseModal;
