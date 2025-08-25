import React, { useState, useEffect, useCallback } from 'react';
import type { Event } from '../../types';
import { getAdminEvents, addEvent, updateEvent, deleteEvent } from '../../api';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import AdminNav from '../../components/admin/AdminNav';
import Modal from '../../components/Modal';
import ModalHeader from '../../components/ModalHeader';
import SendContentNotificationModal from '../../components/admin/SendContentNotificationModal';

const EventForm: React.FC<{ event?: Partial<Event>, onSave: (event: Partial<Event>) => void, isLoading: boolean }> = ({ event, onSave, isLoading }) => {
    const [formData, setFormData] = useState<Partial<Event>>({});

    useEffect(() => {
        setFormData({
            id: event?.id,
            title: event?.title || '',
            description: event?.description || '',
            date: event?.date ? new Date(event.date).toISOString().substring(0, 16) : '',
            location: event?.location || '',
            isOnline: event?.isOnline || false,
        });
    }, [event]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        if (type === 'checkbox') {
            setFormData(prev => ({ ...prev, [name]: (e.target as HTMLInputElement).checked }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const dataToSave = {
            ...formData,
            date: formData.date ? new Date(formData.date).toISOString() : undefined
        };
        onSave(dataToSave);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label className="form-label">Event Title</label>
                <input name="title" value={formData.title} onChange={handleChange} required className="form-input w-full" />
            </div>
            <div>
                <label className="form-label">Description</label>
                <textarea name="description" value={formData.description} onChange={handleChange} required rows={4} className="form-textarea w-full" />
            </div>
            <div>
                <label className="form-label">Date and Time</label>
                <input name="date" type="datetime-local" value={formData.date} onChange={handleChange} required className="form-input w-full" />
            </div>
            <div>
                <label className="form-label">Location / URL</label>
                <input name="location" value={formData.location} onChange={handleChange} required className="form-input w-full" />
            </div>
            <div className="flex items-center">
                <input name="isOnline" type="checkbox" checked={formData.isOnline} onChange={handleChange} className="h-4 w-4 text-brand-primary focus:ring-brand-primary border-gray-300 rounded" />
                <label className="ml-2 block text-sm text-gray-900">Online Event</label>
            </div>
            <div className="pt-4 flex justify-end">
                <button type="submit" disabled={isLoading} className="btn-primary">
                    {isLoading ? 'Saving...' : 'Save Event'}
                </button>
            </div>
        </form>
    );
};


const EventsManagementPage: React.FC = () => {
    const [events, setEvents] = useState<Event[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isFormLoading, setIsFormLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [editingEvent, setEditingEvent] = useState<Partial<Event> | null>(null);
    const [notifyingEvent, setNotifyingEvent] = useState<Event | null>(null);

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const data = await getAdminEvents();
            setEvents(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch events.');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleSave = async (event: Partial<Event>) => {
        setIsFormLoading(true);
        try {
            if (event.id) {
                await updateEvent(event.id, event);
            } else {
                await addEvent(event as Omit<Event, 'id'>);
            }
            setEditingEvent(null);
            await fetchData();
        } catch (err) {
            alert(err instanceof Error ? err.message : 'Failed to save event.');
        } finally {
            setIsFormLoading(false);
        }
    };
    
    const handleDelete = async (id: string) => {
        if (window.confirm('Are you sure you want to delete this event?')) {
            try {
                await deleteEvent(id);
                await fetchData();
            } catch (err) {
                 alert(err instanceof Error ? err.message : 'Failed to delete event.');
            }
        }
    };

    return (
        <div className="bg-gray-50 min-h-full py-3">
            <div className="container mx-auto px-6 lg:px-8">
                <AdminPageHeader title="Events Management" subtitle="Create and manage school events." backLinkPath="/admin/dashboard" backTooltipText="Back to Dashboard" />
                <AdminNav />

                <div className="mt-8">
                    <div className="flex justify-end mb-4">
                        <button onClick={() => setEditingEvent({})} className="btn-primary">
                            + Add New Event
                        </button>
                    </div>
                    {isLoading && <p>Loading events...</p>}
                    {error && <p className="text-red-500">{error}</p>}
                    {!isLoading && !error && (
                        <div className="bg-white shadow-md rounded-lg overflow-hidden">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="th-base">Title</th>
                                        <th className="th-base">Date</th>
                                        <th className="th-base">Location</th>
                                        <th className="th-base">Type</th>
                                        <th className="th-base text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {events.map(event => (
                                        <tr key={event.id}>
                                            <td className="td-base font-medium">{event.title}</td>
                                            <td className="td-base">{new Date(event.date).toLocaleString()}</td>
                                            <td className="td-base">{event.location}</td>
                                            <td className="td-base">
                                                <span className={`badge ${event.isOnline ? 'badge-blue' : 'badge-purple'}`}>
                                                    {event.isOnline ? 'Online' : 'Offline'}
                                                </span>
                                            </td>
                                            <td className="td-base text-right space-x-2">
                                                <button onClick={() => setNotifyingEvent(event)} className="btn-send">Send</button>
                                                <button onClick={() => setEditingEvent(event)} className="btn-secondary">Edit</button>
                                                <button onClick={() => handleDelete(event.id)} className="btn-danger">Delete</button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            <Modal isOpen={!!editingEvent} onClose={() => setEditingEvent(null)} size="lg">
                <ModalHeader title={editingEvent?.id ? 'Edit Event' : 'Add New Event'} />
                <EventForm event={editingEvent || {}} onSave={handleSave} isLoading={isFormLoading} />
            </Modal>
            
            <SendContentNotificationModal
                isOpen={!!notifyingEvent}
                onClose={() => setNotifyingEvent(null)}
                contentItem={notifyingEvent}
                contentType="Event"
            />


            <style>{`
                .th-base { padding: 12px 24px; text-align: left; font-size: 12px; font-weight: 500; color: #4B5563; text-transform: uppercase; letter-spacing: 0.05em; }
                .td-base { padding: 16px 24px; vertical-align: middle; font-size: 14px; color: #374151; }
                .btn-primary { background-color: #1a237e; color: white; padding: 8px 16px; border-radius: 6px; font-weight: 500; transition: background-color 0.2s; }
                .btn-primary:hover { background-color: #0d113d; }
                .btn-primary:disabled { background-color: #9fa8da; cursor: not-allowed; }
                .btn-secondary { background-color: #e8eaf6; color: #1a237e; padding: 6px 12px; border-radius: 6px; font-weight: 500; transition: background-color 0.2s; }
                .btn-danger { background-color: #fee2e2; color: #b91c1c; padding: 6px 12px; border-radius: 6px; font-weight: 500; transition: background-color 0.2s; }
                .btn-send { background-color: #dbeafe; color: #1e40af; padding: 6px 12px; border-radius: 6px; font-weight: 500; transition: background-color 0.2s; }
                .badge { font-size: 12px; font-weight: 500; padding: 4px 8px; border-radius: 12px; }
                .badge-blue { background-color: #DBEAFE; color: #1E40AF; }
                .badge-purple { background-color: #EDE9FE; color: #5B21B6; }
            `}</style>
        </div>
    );
};

export default EventsManagementPage;
