

import React, { useState } from 'react';
import { WEEKDAYS, TIME_SLOTS, WEEKDAY_MAP } from '../../constants';

interface PreferredTimingSelectorProps {
    selectedTimings: string[];
    onChange: (timings: string[]) => void;
}

const MAX_SELECTIONS = 2;

const PreferredTimingSelector: React.FC<PreferredTimingSelectorProps> = ({ selectedTimings, onChange }) => {
    const [activeDay, setActiveDay] = useState<string | null>(null);

    const handleDayToggle = (dayKey: string) => {
        setActiveDay(prev => (prev === dayKey ? null : dayKey));
    };

    const handleTimingClick = (timing: string) => {
        const newSelectedTimings = new Set(selectedTimings);
        if (newSelectedTimings.has(timing)) {
            newSelectedTimings.delete(timing);
        } else {
            if (newSelectedTimings.size >= MAX_SELECTIONS) {
                alert("You have already selected the maximum of 2 preferred timings. To make a change, please remove one of your current selections first.");
                return;
            }
            newSelectedTimings.add(timing);
        }
        onChange(Array.from(newSelectedTimings));
    };

    return (
        <div>
            <div className="mb-4">
                <p className="form-label">Toggle a day to see available time slots:</p>
                <div className="flex rounded-md shadow-sm">
                    {Object.keys(WEEKDAY_MAP).map((dayKey) => (
                        <button
                            type="button"
                            key={dayKey}
                            onClick={() => handleDayToggle(dayKey)}
                            className={`flex-1 px-3 py-2 text-sm font-medium border border-gray-300 -ml-px first:ml-0 first:rounded-l-md last:rounded-r-md focus:z-10 focus:outline-none focus:ring-1 focus:ring-brand-primary transition-colors ${
                                activeDay === dayKey ? 'bg-brand-primary text-white border-brand-primary' : 'bg-white text-gray-700 hover:bg-gray-50'
                            }`}
                        >
                            {dayKey}
                        </button>
                    ))}
                </div>
            </div>

            {activeDay ? (
                <div className="space-y-4 pr-2 max-h-60 overflow-y-auto">
                    <div>
                        <h4 className="font-semibold text-gray-800 mb-2">{WEEKDAY_MAP[activeDay as keyof typeof WEEKDAY_MAP]}</h4>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {TIME_SLOTS.map(timeSlot => {
                                const fullTiming = `${WEEKDAY_MAP[activeDay as keyof typeof WEEKDAY_MAP]} ${timeSlot}`;
                                const isSelected = selectedTimings.includes(fullTiming);
                                const isDisabled = !isSelected && selectedTimings.length >= MAX_SELECTIONS;

                                return (
                                    <button
                                        type="button"
                                        key={fullTiming}
                                        onClick={() => handleTimingClick(fullTiming)}
                                        disabled={isDisabled}
                                        className={`p-2 text-sm rounded-md border text-center transition-colors ${
                                            isSelected ? 'bg-brand-secondary text-brand-dark border-yellow-500 font-semibold' : 
                                            isDisabled ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed' :
                                            'bg-white text-gray-700 border-gray-300 hover:bg-brand-light/50 hover:border-brand-primary'
                                        }`}
                                    >
                                        {timeSlot}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            ) : (
                <div className="text-center text-sm text-gray-500 py-6 border-2 border-dashed rounded-lg">
                    <p>Select a day to see available time slots.</p>
                </div>
            )}
        </div>
    );
};

export default PreferredTimingSelector;