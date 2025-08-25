import React, { useState, useEffect } from 'react';
import type { Invoice, User } from '../../types';
import { InvoiceStatus } from '../../types';
import { getFamilyStudents, getStudentInvoicesForFamily } from '../../api';

const getStatusBadgeClass = (status: InvoiceStatus) => {
    switch (status) {
        case InvoiceStatus.Paid: return 'bg-green-100 text-green-800';
        case InvoiceStatus.Pending: return 'bg-yellow-100 text-yellow-800';
        case InvoiceStatus.Overdue: return 'bg-red-100 text-red-800';
        default: return 'bg-gray-100 text-gray-800';
    }
};

const PaymentHistoryPage: React.FC = () => {
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchInvoices = async () => {
            setIsLoading(true);
            try {
                const family = await getFamilyStudents();
                const invoicePromises = family.map(student => getStudentInvoicesForFamily(student.id));
                const results = await Promise.all(invoicePromises);
                const allInvoices = results.flat().sort((a, b) => new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime());
                
                // Manually populate student names since server doesn't for this route
                const familyMap = new Map(family.map(f => [f.id, f.name]));
                const populatedInvoices = allInvoices.map(inv => ({
                    ...inv,
                    student: { id: inv.studentId, name: familyMap.get(inv.studentId) || 'Unknown', email: ''}
                }));

                setInvoices(populatedInvoices);
            } catch (error) {
                console.error("Failed to fetch payment history:", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchInvoices();
    }, []);

     if (isLoading) return <div className="p-8 text-center">Loading payment history...</div>;

    return (
        <div className="p-4 sm:p-6 md:p-8">
            <h1 className="text-3xl font-bold text-dark-text mb-6">Payment History</h1>

            <div className="bg-white shadow-md rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Course</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Issue Date</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment Date</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {invoices.length > 0 ? invoices.map(invoice => (
                                <tr key={invoice.id}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{invoice.student?.name}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{invoice.courseName}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(invoice.issueDate).toLocaleDateString()}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{invoice.amount} {invoice.currency}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeClass(invoice.status)}`}>
                                            {invoice.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {invoice.paymentDetails ? new Date(invoice.paymentDetails.paymentDate).toLocaleDateString() : 'N/A'}
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={6} className="px-6 py-8 text-center text-sm text-gray-500">
                                        No payment history found.
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

export default PaymentHistoryPage;