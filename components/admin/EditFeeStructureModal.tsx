
import React, { useState, useEffect } from 'react';
import Modal from '../Modal';
import ModalHeader from '../ModalHeader';
import type { Course, FeeStructure } from '../../types';
import { Currency, BillingCycle } from '../../types';

interface EditFeeStructureModalProps {
    isOpen: boolean;
    onClose: () => void;
    structure: Partial<FeeStructure> | null;
    courses: Course[];
    existingStructures: FeeStructure[];
    onSave: (data: Partial<FeeStructure>) => void;
}

const EditFeeStructureModal: React.FC<EditFeeStructureModalProps> = ({ isOpen, onClose, structure, courses, existingStructures, onSave }) => {
    const [formData, setFormData] = useState<Partial<FeeStructure>>({});
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (structure) {
            setFormData({
                id: structure.id,
                courseId: structure.courseId || '',
                courseName: structure.courseName || '',
                amount: structure.amount || 0,
                currency: structure.currency || Currency.INR,
                billingCycle: structure.billingCycle || BillingCycle.Monthly,
            });
        }
    }, [structure]);
    
    const availableCourses = courses.filter(course => {
        // If editing, allow the current course. If new, only show courses without a structure.
        return structure?.id || !existingStructures.some(s => s.courseId === course.id);
    });

    const handleCourseChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const selectedCourse = courses.find(c => c.id === e.target.value);
        if (selectedCourse) {
            setFormData(prev => ({
                ...prev,
                courseId: selectedCourse.id,
                courseName: selectedCourse.name,
            }));
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: name === 'amount' ? parseFloat(value) : value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        onSave(formData);
        setIsLoading(false);
    };

    if (!structure) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose}>
            <ModalHeader title={structure.id ? 'Edit Fee Structure' : 'Add New Fee Structure'} />
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="form-label">Course</label>
                    <select
                        name="courseId"
                        value={formData.courseId || ''}
                        onChange={handleCourseChange}
                        required
                        className="form-select w-full"
                        disabled={!!structure.id}
                    >
                        <option value="" disabled>Select a course</option>
                        {availableCourses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        {structure.id && !availableCourses.some(c => c.id === structure.courseId) && (
                           <option value={structure.courseId} disabled>{structure.courseName}</option>
                        )}
                    </select>
                    {!!structure.id && <p className="text-xs text-gray-500 mt-1">Course cannot be changed after creation.</p>}
                </div>
                <div>
                    <label className="form-label">Amount</label>
                    <input
                        type="number"
                        name="amount"
                        value={formData.amount || ''}
                        onChange={handleChange}
                        required
                        min="0"
                        step="0.01"
                        className="form-input w-full"
                    />
                </div>
                <div>
                    <label className="form-label">Currency</label>
                    <select name="currency" value={formData.currency} onChange={handleChange} className="form-select w-full">
                        {Object.values(Currency).map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                </div>
                 <div>
                    <label className="form-label">Billing Cycle</label>
                    <select name="billingCycle" value={formData.billingCycle} onChange={handleChange} className="form-select w-full">
                        {Object.values(BillingCycle).map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                </div>
                <div className="pt-4">
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-brand-primary hover:bg-brand-dark"
                    >
                        {isLoading ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>
            </form>
        </Modal>
    );
};

export default EditFeeStructureModal;
