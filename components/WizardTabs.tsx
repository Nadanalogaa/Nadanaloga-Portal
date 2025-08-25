
import React from 'react';

interface WizardTabsProps {
  steps: string[];
  currentStep: number;
  onStepClick: (step: number) => void;
}

const WizardTabs: React.FC<WizardTabsProps> = ({ steps, currentStep, onStepClick }) => {
  return (
    <div className="w-full py-4">
      <div className="flex items-center justify-between border-b border-gray-200">
        {steps.map((step, index) => {
          const stepNumber = index + 1;
          const isActive = currentStep === stepNumber;

          return (
            <button
              key={step}
              type="button"
              onClick={() => onStepClick(stepNumber)}
              className={`flex-grow text-center px-4 py-3 text-sm font-medium border-b-2 transition-colors focus:outline-none ${
                isActive
                  ? 'border-brand-primary text-brand-primary font-semibold'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
              aria-current={isActive ? 'page' : undefined}
            >
              {step}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default WizardTabs;
