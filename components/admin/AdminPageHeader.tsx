
import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeftIcon } from '../icons';
import Tooltip from '../Tooltip';

interface AdminPageHeaderProps {
    title: string;
    subtitle: string;
    backLinkPath: string;
    backTooltipText: string;
}

const AdminPageHeader: React.FC<AdminPageHeaderProps> = ({ title, subtitle, backLinkPath, backTooltipText }) => {
    return (
        <div className="mb-6 flex items-start">
            <Tooltip content={backTooltipText} position="right">
                <Link to={backLinkPath} className="text-brand-primary hover:text-brand-dark p-2 rounded-full hover:bg-brand-light mr-2 mt-1 md:mt-0">
                    <ArrowLeftIcon />
                </Link>
            </Tooltip>
            <div className="flex-grow">
                <div className="flex flex-col md:flex-row md:items-baseline md:justify-between">
                    <h1 className="text-3xl font-bold text-brand-primary">{title}</h1>
                    <p className="text-gray-500 mt-1 md:mt-0 md:ml-4">{subtitle}</p>
                </div>
            </div>
        </div>
    );
};

export default AdminPageHeader;
