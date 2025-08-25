import React from 'react';

interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
}

const Tooltip: React.FC<TooltipProps> = ({ content, children, position = 'top', className }) => {
  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  };

  const transformClasses = {
    top: 'scale-95 -translate-y-1',
    bottom: 'scale-95 translate-y-1',
    left: 'scale-95 -translate-x-1',
    right: 'scale-95 translate-x-1',
  };
  
  const arrowClasses = {
    top: 'absolute left-1/2 -translate-x-1/2 -bottom-1 w-0 h-0 border-x-[5px] border-x-transparent border-t-[5px] border-t-gray-900',
    bottom: 'absolute left-1/2 -translate-x-1/2 -top-1 w-0 h-0 border-x-[5px] border-x-transparent border-b-[5px] border-b-gray-900',
    left: 'absolute top-1/2 -translate-y-1/2 -right-1 w-0 h-0 border-y-[5px] border-y-transparent border-l-[5px] border-l-gray-900',
    right: 'absolute top-1/2 -translate-y-1/2 -left-1 w-0 h-0 border-y-[5px] border-y-transparent border-r-[5px] border-r-gray-900',
  }

  return (
    <div className={`relative group flex items-center justify-center ${className || ''}`}>
      {children}
      <div
        role="tooltip"
        className={`absolute z-30 whitespace-nowrap px-3 py-1.5 text-sm font-light text-white bg-gray-900 rounded-md shadow-lg 
                   opacity-0 group-hover:opacity-100 
                   transform ${transformClasses[position]} group-hover:scale-100 ${position === 'top' || position === 'bottom' ? 'group-hover:translate-y-0' : 'group-hover:translate-x-0'}
                   transition-all duration-300 ease-in-out pointer-events-none
                   ${positionClasses[position]}`}
      >
        {content}
        <div className={arrowClasses[position]} />
      </div>
    </div>
  );
};

export default Tooltip;