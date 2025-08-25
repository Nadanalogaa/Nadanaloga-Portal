import React, { useState } from 'react';
import { ChevronDownIcon } from './icons';

interface AccordionItemProps {
  title: string;
  children: React.ReactNode;
  startOpen?: boolean;
}

const AccordionItem: React.FC<AccordionItemProps> = ({ title, children, startOpen = false }) => {
  const [isOpen, setIsOpen] = useState(startOpen);

  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200/80 transition-shadow hover:shadow-lg">
      <h2>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex justify-between items-center w-full p-5 font-semibold text-left text-gray-800"
          aria-expanded={isOpen}
        >
          <span className="text-lg text-brand-primary">{title}</span>
          <ChevronDownIcon
            className={`w-6 h-6 shrink-0 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
          />
        </button>
      </h2>
      <div
        className={`grid transition-all duration-500 ease-in-out ${isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}
      >
        <div className="overflow-hidden">
          <div className="p-5 border-t border-gray-200">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccordionItem;
