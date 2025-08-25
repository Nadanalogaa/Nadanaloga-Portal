import React, { useRef } from 'react';
import type { Document } from '../../types';
import { UploadIcon, XCircleIcon, FileIcon } from '../icons';

interface DocumentManagerProps {
    documents: Document[];
    onDocumentsChange: (documents: Document[]) => void;
}

const DocumentManager: React.FC<DocumentManagerProps> = ({ documents, onDocumentsChange }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onloadend = () => {
                const newDoc: Document = {
                    name: file.name,
                    mimeType: file.type,
                    data: reader.result as string,
                };
                onDocumentsChange([...documents, newDoc]);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleRemoveDocument = (index: number) => {
        onDocumentsChange(documents.filter((_, i) => i !== index));
    };

    const handleDownload = (doc: Document) => {
        const link = document.createElement("a");
        link.href = doc.data;
        link.download = doc.name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="border border-gray-200 rounded-lg flex flex-col h-full bg-white">
            <div className="flex-grow p-3 overflow-y-auto max-h-[140px]">
                {documents.length > 0 ? (
                    <ul className="space-y-2">
                        {documents.map((doc, index) => (
                            <li key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded-md">
                                <div className="flex items-center truncate">
                                    <FileIcon />
                                    <span 
                                        className="text-sm text-brand-primary hover:underline cursor-pointer truncate"
                                        onClick={() => handleDownload(doc)}
                                        title={`Download ${doc.name}`}
                                    >
                                        {doc.name}
                                    </span>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => handleRemoveDocument(index)}
                                    className="text-red-500 hover:text-red-700 ml-2"
                                    aria-label={`Remove ${doc.name}`}
                                >
                                    <XCircleIcon />
                                </button>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="text-sm text-gray-500 text-center py-2">No documents uploaded.</p>
                )}
            </div>
             <div className="border-t p-2 bg-gray-50/50">
                <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleFileChange} 
                    className="hidden" 
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                />
                <button 
                    type="button" 
                    onClick={() => fileInputRef.current?.click()} 
                    className="w-full flex items-center justify-center bg-white border border-gray-300 hover:bg-gray-100 text-gray-800 font-semibold px-4 py-1.5 rounded-md shadow-sm transition-colors text-sm"
                >
                    <UploadIcon />
                    Attach File
                </button>
            </div>
        </div>
    );
};

export default DocumentManager;