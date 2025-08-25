import React from 'react';

interface ModalHeaderProps {
    title: string;
    subtitle?: string;
}

const ModalHeader: React.FC<ModalHeaderProps> = ({ title, subtitle }) => {
    return (
        <div className="mb-6">
            <div className="flex flex-col md:flex-row md:items-baseline md:justify-between">
                <h2 className="text-2xl font-bold text-gray-800">{title}</h2>
                {subtitle && <p className="text-gray-500 mt-1 md:mt-0 md:ml-4">{subtitle}</p>}
            </div>
        </div>
    );
};

export default ModalHeader;
