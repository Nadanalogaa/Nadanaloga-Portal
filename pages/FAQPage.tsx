
import React, { useState } from 'react';
import { FAQ_DATA } from '../constants';
import type { FAQItem } from '../types';

const FaqAccordionItem: React.FC<{ item: FAQItem; isOpen: boolean; onClick: () => void }> = ({ item, isOpen, onClick }) => {
    return (
        <div className="border-b border-gray-200">
            <h2>
                <button
                    type="button"
                    className="flex justify-between items-center w-full py-5 text-left font-medium text-gray-800"
                    onClick={onClick}
                    aria-expanded={isOpen}
                >
                    <span className="text-lg">{item.question}</span>
                    <svg
                        className={`w-6 h-6 shrink-0 transition-transform duration-200 ${isOpen ? 'transform rotate-180' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        xmlns="http://www.w3.org/2000/svg"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                    </svg>
                </button>
            </h2>
            <div
                className={`grid transition-all duration-300 ease-in-out ${isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}
            >
                <div className="overflow-hidden">
                    <div className="pb-5 pr-4 text-gray-600">
                        {item.answer}
                    </div>
                </div>
            </div>
        </div>
    );
};

const FAQPage: React.FC = () => {
    const [openIndex, setOpenIndex] = useState<number | null>(null);

    const handleToggle = (index: number) => {
        setOpenIndex(openIndex === index ? null : index);
    };

    return (
        <div className="py-16 sm:py-24 bg-white">
            <div className="container mx-auto px-6 lg:px-8">
                <div className="max-w-3xl mx-auto">
                    <div className="text-center">
                        <h1 className="text-4xl font-bold tracking-tight text-brand-primary sm:text-5xl tangerine-title">
                            Frequently Asked Questions
                        </h1>
                        <p className="mt-4 text-lg text-gray-600">
                            Have questions? We have answers. Find information about our programs, enrollment, and more.
                        </p>
                    </div>
                    <div className="mt-12 space-y-4">
                        {FAQ_DATA.map((item, index) => (
                            <FaqAccordionItem
                                key={index}
                                item={item}
                                isOpen={openIndex === index}
                                onClick={() => handleToggle(index)}
                            />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FAQPage;
