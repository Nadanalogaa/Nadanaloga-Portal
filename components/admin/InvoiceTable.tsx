
import React, { useState, useMemo } from 'react';
import type { Invoice, User } from '../../types';
import { InvoiceStatus } from '../../types';

interface InvoiceTableProps {
    invoices: Invoice[];
    students: User[];
    onRecordPayment: (invoice: Invoice) => void;
    onGenerateInvoices: () => void;
}

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

const InvoiceTable: React.FC<InvoiceTableProps> = ({ invoices, students, onRecordPayment, onGenerateInvoices }) => {
    const [studentFilter, setStudentFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [courseFilter, setCourseFilter] = useState('');

    const courseOptions = useMemo(() => {
        const courses = new Set(invoices.map(inv => inv.courseName));
        return Array.from(courses).sort();
    }, [invoices]);

    const filteredInvoices = useMemo(() => {
        return invoices.filter(invoice => {
            if (studentFilter && invoice.student?.id !== studentFilter) return false;
            if (statusFilter && invoice.status !== statusFilter) return false;
            if (courseFilter && invoice.courseName !== courseFilter) return false;
            return true;
        });
    }, [invoices, studentFilter, statusFilter, courseFilter]);

    return (
        <div>
            <div className="flex flex-col md:flex-row justify-between items-center mb-4 gap-4">
                <h2 className="text-2xl font-semibold text-gray-800 w-full md:w-auto">Invoices ({filteredInvoices.length})</h2>
                <div className="flex-grow grid grid-cols-1 sm:grid-cols-3 gap-4 w-full md:w-auto">
                     <select value={studentFilter} onChange={e => setStudentFilter(e.target.value)} className="form-select">
                        <option value="">All Students</option>
                        {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                    <select value={courseFilter} onChange={e => setCourseFilter(e.target.value)} className="form-select">
                        <option value="">All Courses</option>
                        {courseOptions.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="form-select">
                        <option value="">All Statuses</option>
                        {Object.values(InvoiceStatus).map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>
                <button
                    onClick={onGenerateInvoices}
                    className="bg-green-600 hover:bg-green-700 text-white font-semibold px-4 py-2 rounded-md shadow-sm transition-colors w-full md:w-auto mt-4 md:mt-0"
                >
                    Generate Monthly Invoices
                </button>
            </div>
             <div className="bg-white shadow-md rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                             <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Course</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Billing Period</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Due Date</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment Date</th>
                                <th className="relative px-6 py-3"><span className="sr-only">Actions</span></th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                           {filteredInvoices.length > 0 ? filteredInvoices.map(invoice => (
                                <tr key={invoice.id}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{invoice.student?.name || 'N/A'}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{invoice.courseName}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{invoice.billingPeriod}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{invoice.amount} {invoice.currency}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(invoice.dueDate).toLocaleDateString()}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeClass(invoice.status)}`}>
                                            {invoice.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {invoice.paymentDetails ? new Date(invoice.paymentDetails.paymentDate).toLocaleDateString() : 'N/A'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        {invoice.status !== 'Paid' && (
                                            <button onClick={() => onRecordPayment(invoice)} className="text-brand-primary hover:text-brand-dark">Record Payment</button>
                                        )}
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={8} className="px-6 py-8 text-center text-sm text-gray-500">
                                        No invoices match the current filters.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default InvoiceTable;
