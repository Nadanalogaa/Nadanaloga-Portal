
import React, { useState, useEffect } from 'react';
import Modal from '../Modal';
import ModalHeader from '../ModalHeader';
import type { Invoice, PaymentDetails } from '../../types';
import { PaymentMethod } from '../../types';

interface RecordPaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    invoice: Invoice | null;
    onSave: (invoiceId: string, paymentData: PaymentDetails) => void;
}

const RecordPaymentModal: React.FC<RecordPaymentModalProps> = ({ isOpen, onClose, invoice, onSave }) => {
    const [formData, setFormData] = useState<Partial<PaymentDetails>>({});
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (invoice) {
            setFormData({
                amountPaid: invoice.amount,
                paymentDate: new Date().toISOString().split('T')[0],
                paymentMethod: PaymentMethod.UPI,
                referenceNumber: '',
                notes: '',
            });
        }
    }, [invoice]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: name === 'amountPaid' ? parseFloat(value) : value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!invoice) return;
        setIsLoading(true);
        onSave(invoice.id, formData as PaymentDetails);
        setIsLoading(false);
    };

    if (!invoice) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose}>
            <ModalHeader 
                title="Record Payment"
                subtitle={`For ${invoice.student?.name} - ${invoice.courseName}`}
            />
            <div className="mb-4 bg-gray-50 p-3 rounded-md border text-sm">
                <p><strong>Invoice Amount:</strong> {invoice.amount} {invoice.currency}</p>
                <p><strong>Billing Period:</strong> {invoice.billingPeriod}</p>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label className="form-label">Amount Paid</label>
                        <input type="number" name="amountPaid" value={formData.amountPaid || ''} onChange={handleChange} required className="form-input w-full" />
                    </div>
                     <div>
                        <label className="form-label">Payment Date</label>
                        <input type="date" name="paymentDate" value={formData.paymentDate || ''} onChange={handleChange} required className="form-input w-full" />
                    </div>
                </div>
                 <div>
                    <label className="form-label">Payment Method</label>
                    <select name="paymentMethod" value={formData.paymentMethod} onChange={handleChange} className="form-select w-full">
                        {Object.values(PaymentMethod).map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                </div>
                <div>
                    <label className="form-label">Reference / Transaction ID</label>
                    <input type="text" name="referenceNumber" value={formData.referenceNumber || ''} onChange={handleChange} className="form-input w-full" />
                </div>
                 <div>
                    <label className="form-label">Notes (Optional)</label>
                    <textarea name="notes" rows={2} value={formData.notes || ''} onChange={handleChange} className="form-textarea w-full" />
                </div>
                <div className="pt-4">
                    <button type="submit" disabled={isLoading} className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-brand-primary hover:bg-brand-dark">
                        {isLoading ? 'Saving...' : 'Confirm Payment'}
                    </button>
                </div>
            </form>
        </Modal>
    );
};

export default RecordPaymentModal;
