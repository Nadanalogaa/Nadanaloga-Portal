import React, { useState, useEffect } from 'react';
import type { Event, User } from '../../types';
import { getEvents, getFamilyStudents } from '../../api';
import AccordionItem from '../../components/AccordionItem';

const EventsPage: React.FC = () => {
    const [eventsByStudent, setEventsByStudent] = useState<Map<string, Event[]>>(new Map());
    const [family, setFamily] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            try {
                const [familyData, allEventsForFamily] = await Promise.all([
                    getFamilyStudents(),
                    getEvents(),
                ]);
                
                setFamily(familyData);
                
                const eventsMap = new Map<string, Event[]>();
                familyData.forEach(student => eventsMap.set(student.id, []));

                allEventsForFamily.forEach(event => {
                    // Because the API returns only events for the family, we just need to sort them
                    // into buckets for each student.
                    familyData.forEach(student => {
                        if (event.recipientIds?.includes(student.id)) {
                            const studentEvents = eventsMap.get(student.id) || [];
                            studentEvents.push(event);
                            eventsMap.set(student.id, studentEvents);
                        }
                    });
                });

                // Sort events within each student's list by date
                for (const [studentId, studentEvents] of eventsMap.entries()) {
                    studentEvents.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
                    eventsMap.set(studentId, studentEvents);
                }

                setEventsByStudent(eventsMap);

            } catch (error) {
                console.error("Failed to fetch events:", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, []);
    
    if (isLoading) return <div className="p-8 text-center">Loading events...</div>;

    const hasAnyEvents = Array.from(eventsByStudent.values()).some(events => events.length > 0);

    return (
        <div className="p-4 sm:p-6 md:p-8">
            <h1 className="text-3xl font-bold text-dark-text mb-6">Upcoming Events</h1>
            
            {hasAnyEvents ? (
                 <div className="space-y-4">
                    {family.map((student, index) => {
                        const studentEvents = eventsByStudent.get(student.id) || [];
                        const title = `${student.name} (${studentEvents.length} Event${studentEvents.length !== 1 ? 's' : ''})`;
                        return (
                            <AccordionItem key={student.id} title={title} startOpen={index === 0}>
                                <div className="space-y-6">
                                    {studentEvents.length > 0 ? studentEvents.map(event => (
                                        <div key={event.id} className="bg-white p-6 rounded-xl shadow-lg flex items-start space-x-6">
                                            <div className="text-center flex-shrink-0 bg-light-purple text-brand-purple p-4 rounded-lg">
                                                <p className="text-3xl font-bold">{new Date(event.date).getDate()}</p>
                                                <p className="text-sm font-semibold uppercase">{new Date(event.date).toLocaleString('default', { month: 'short' })}</p>
                                            </div>
                                            <div>
                                                <span className={`text-xs font-semibold px-2 py-1 rounded-full ${event.isOnline ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'}`}>
                                                    {event.isOnline ? 'Online' : 'Offline'}
                                                </span>
                                                <h2 className="text-xl font-bold text-dark-text mt-2">{event.title}</h2>
                                                <p className="text-sm text-light-text mt-1">{new Date(event.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} @ {event.location}</p>
                                                <p className="text-dark-text mt-2">{event.description}</p>
                                            </div>
                                        </div>
                                    )) : (
                                        <p className="text-sm text-gray-500">No events assigned to {student.name}.</p>
                                    )}
                                </div>
                            </AccordionItem>
                        );
                    })}
                </div>
            ) : (
                <div className="text-center py-16 bg-white rounded-lg shadow-md">
                    <h3 className="text-xl font-semibold text-gray-700">No Upcoming Events</h3>
                    <p className="text-gray-500 mt-2">There are no events scheduled for your family at this time.</p>
                </div>
            )}
        </div>
    );
};

export default EventsPage;