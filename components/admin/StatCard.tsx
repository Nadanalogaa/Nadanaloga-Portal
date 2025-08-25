
import React from 'react';

interface StatCardProps {
    title: string;
    value: number | string;
    isLink?: boolean;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, isLink }) => {
    const cardClasses = `bg-white p-6 rounded-lg shadow-md flex flex-col justify-between h-full ${isLink ? 'transition-all duration-300 hover:shadow-xl hover:-translate-y-1 cursor-pointer' : ''}`;

    return (
        <div className={cardClasses}>
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider">{title}</h3>
            <p className="text-3xl font-bold text-brand-primary mt-2">{value}</p>
        </div>
    );
};

export default StatCard;
