
import React from 'react';
import type { FeeStructure } from '../../types';

interface FeeStructureTableProps {
    structures: FeeStructure[];
    onEdit: (structure: FeeStructure) => void;
    onDelete: (id: string) => void;
    onAddNew: () => void;
}

const FeeStructureTable: React.FC<FeeStructureTableProps> = ({ structures, onEdit, onDelete, onAddNew }) => {
    return (
        <div>
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-semibold text-gray-800">Fee Structures ({structures.length})</h2>
                <button
                    onClick={onAddNew}
                    className="bg-brand-primary hover:bg-brand-dark text-white font-semibold px-4 py-2 rounded-md shadow-sm transition-colors"
                >
                    + Add New Structure
                </button>
            </div>
            <div className="bg-white shadow-md rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Course Name</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Billing Cycle</th>
                                <th scope="col" className="relative px-6 py-3"><span className="sr-only">Actions</span></th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {structures.length > 0 ? structures.map(structure => (
                                <tr key={structure.id}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{structure.courseName}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{structure.amount.toLocaleString()} {structure.currency}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{structure.billingCycle}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-4">
                                        <button onClick={() => onEdit(structure)} className="text-brand-primary hover:text-brand-dark">Edit</button>
                                        <button onClick={() => onDelete(structure.id)} className="text-red-600 hover:text-red-800">Delete</button>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={4} className="px-6 py-8 text-center text-sm text-gray-500">
                                        No fee structures defined. Click "Add New Structure" to begin.
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

export default FeeStructureTable;
