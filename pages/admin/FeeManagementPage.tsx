
import React, { useState, useEffect, useCallback } from 'react';
import type { FeeStructure, Invoice, Course, User } from '../../types';
import { 
    getFeeStructures, addFeeStructure, updateFeeStructure, deleteFeeStructure,
    getAdminInvoices, generateInvoices, recordPayment,
    getAdminCourses, getAdminUsers
} from '../../api';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import AdminNav from '../../components/admin/AdminNav';
import TabButton from '../../components/admin/TabButton';
import FeeStructureTable from '../../components/admin/FeeStructureTable';
import EditFeeStructureModal from '../../components/admin/EditFeeStructureModal';
import InvoiceTable from '../../components/admin/InvoiceTable';
import RecordPaymentModal from '../../components/admin/RecordPaymentModal';

type ActiveTab = 'structures' | 'invoices';

const FeeManagementPage: React.FC = () => {
    const [activeTab, setActiveTab] = useState<ActiveTab>('structures');
    
    // Data states
    const [structures, setStructures] = useState<FeeStructure[]>([]);
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [courses, setCourses] = useState<Course[]>([]);
    const [users, setUsers] = useState<User[]>([]);

    // UI states
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [editingStructure, setEditingStructure] = useState<Partial<FeeStructure> | null>(null);
    const [payingInvoice, setPayingInvoice] = useState<Invoice | null>(null);
    const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);


    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const [fetchedStructures, fetchedInvoices, fetchedCourses, fetchedUsers] = await Promise.all([
                getFeeStructures(),
                getAdminInvoices(),
                getAdminCourses(),
                getAdminUsers()
            ]);
            setStructures(fetchedStructures);
            setInvoices(fetchedInvoices);
            setCourses(fetchedCourses);
            setUsers(fetchedUsers.filter(u => u.role === 'Student'));
            setError(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch fee management data.');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);
    
    const handleActionMessage = (type: 'success' | 'error', text: string) => {
        setActionMessage({ type, text });
        setTimeout(() => setActionMessage(null), 5000);
    };

    // Fee Structure Handlers
    const handleSaveStructure = async (data: Partial<FeeStructure>) => {
        try {
            if (data.id) {
                const updated = await updateFeeStructure(data.id, data);
                setStructures(prev => prev.map(s => s.id === updated.id ? updated : s));
                handleActionMessage('success', 'Fee structure updated successfully.');
            } else {
                const newStructure = await addFeeStructure(data as Omit<FeeStructure, 'id'>);
                setStructures(prev => [...prev, newStructure]);
                handleActionMessage('success', 'New fee structure added successfully.');
            }
            setEditingStructure(null);
        } catch (err) {
            handleActionMessage('error', err instanceof Error ? err.message : 'Failed to save structure.');
        }
    };
    
    const handleDeleteStructure = async (id: string) => {
        if (window.confirm('Are you sure you want to delete this fee structure? This cannot be undone.')) {
            try {
                await deleteFeeStructure(id);
                setStructures(prev => prev.filter(s => s.id !== id));
                handleActionMessage('success', 'Fee structure deleted.');
            } catch (err) {
                handleActionMessage('error', err instanceof Error ? err.message : 'Failed to delete structure.');
            }
        }
    };

    // Invoice Handlers
    const handleGenerateInvoices = async () => {
        if(window.confirm('This will generate monthly invoices for all enrolled students for the current month. Continue?')) {
            try {
                const result = await generateInvoices();
                handleActionMessage('success', result.message);
                // Refetch invoices after generation
                const fetchedInvoices = await getAdminInvoices();
                setInvoices(fetchedInvoices);
            } catch (err) {
                handleActionMessage('error', err instanceof Error ? err.message : 'Failed to generate invoices.');
            }
        }
    };

    const handleRecordPayment = async (invoiceId: string, paymentData: any) => {
        try {
            const updatedInvoice = await recordPayment(invoiceId, paymentData);
            setInvoices(prev => prev.map(inv => inv.id === updatedInvoice.id ? updatedInvoice : inv));
            handleActionMessage('success', 'Payment recorded successfully.');
            setPayingInvoice(null);
        } catch (err) {
            handleActionMessage('error', err instanceof Error ? err.message : 'Failed to record payment.');
        }
    };

    return (
        <div className="bg-gray-50 min-h-full py-3">
            <div className="container mx-auto px-6 lg:px-8">
                <div className="max-w-full mx-auto">
                    <AdminPageHeader
                        title="Fee Management"
                        subtitle="Define fee structures and manage student invoices."
                        backLinkPath="/admin/dashboard"
                        backTooltipText="Back to Dashboard"
                    />
                    <AdminNav />
                    
                    {actionMessage && (
                        <div className={`p-4 mb-4 rounded-md text-sm ${actionMessage.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                            {actionMessage.text}
                        </div>
                    )}

                    <div className="border-b border-gray-200 mb-6">
                        <nav className="-mb-px flex space-x-6" aria-label="Tabs">
                            <TabButton isActive={activeTab === 'structures'} onClick={() => setActiveTab('structures')}>
                                Fee Structures
                            </TabButton>
                            <TabButton isActive={activeTab === 'invoices'} onClick={() => setActiveTab('invoices')}>
                                Invoices
                            </TabButton>
                        </nav>
                    </div>

                    {isLoading ? (
                        <p className="text-center text-gray-500 py-8">Loading data...</p>
                    ) : error ? (
                         <p className="text-center text-red-500 bg-red-100 p-3 rounded-md">{error}</p>
                    ) : (
                        <div>
                            {activeTab === 'structures' && (
                                <FeeStructureTable
                                    structures={structures}
                                    onEdit={setEditingStructure}
                                    onDelete={handleDeleteStructure}
                                    onAddNew={() => setEditingStructure({})}
                                />
                            )}
                            {activeTab === 'invoices' && (
                                <InvoiceTable
                                    invoices={invoices}
                                    students={users}
                                    onRecordPayment={setPayingInvoice}
                                    onGenerateInvoices={handleGenerateInvoices}
                                />
                            )}
                        </div>
                    )}
                </div>
            </div>

            <EditFeeStructureModal
                isOpen={!!editingStructure}
                onClose={() => setEditingStructure(null)}
                structure={editingStructure}
                courses={courses}
                existingStructures={structures}
                onSave={handleSaveStructure}
            />

            <RecordPaymentModal
                isOpen={!!payingInvoice}
                onClose={() => setPayingInvoice(null)}
                invoice={payingInvoice}
                onSave={handleRecordPayment}
            />
        </div>
    );
};

export default FeeManagementPage;
