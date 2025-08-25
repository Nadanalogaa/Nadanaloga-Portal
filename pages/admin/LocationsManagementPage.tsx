
import React, { useState, useEffect, useCallback } from 'react';
import type { Location } from '../../types';
import { getLocations, addLocation, updateLocation, deleteLocation } from '../../api';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import AdminNav from '../../components/admin/AdminNav';
import Modal from '../../components/Modal';
import ModalHeader from '../../components/ModalHeader';

const LocationForm: React.FC<{ location?: Partial<Location>, onSave: (location: Partial<Location>) => void, isLoading: boolean }> = ({ location, onSave, isLoading }) => {
    const [formData, setFormData] = useState<Partial<Location>>({});
    const [addressPreview, setAddressPreview] = useState('');

    useEffect(() => {
        const initialData = {
            id: location?.id,
            name: location?.name || '',
            address: location?.address || '',
        };
        setFormData(initialData);
        setAddressPreview(initialData.address);
    }, [location]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (name === 'address') {
            setAddressPreview(value);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(formData);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label className="form-label">Location Name</label>
                <input name="name" value={formData.name || ''} onChange={handleChange} required className="form-input w-full" placeholder="e.g., Main Street Studio" />
            </div>
            <div>
                <label className="form-label">Full Address</label>
                <textarea name="address" value={formData.address || ''} onChange={handleChange} required rows={3} className="form-textarea w-full" placeholder="Enter the full address for map display" />
            </div>
             {addressPreview && (
                <div>
                    <label className="form-label">Map Preview</label>
                    <div className="border rounded-lg overflow-hidden">
                        <iframe
                            width="100%"
                            height="250"
                            loading="lazy"
                            allowFullScreen
                            src={`https://maps.google.com/maps?q=${encodeURIComponent(addressPreview)}&t=&z=15&ie=UTF8&iwloc=&output=embed`}
                        ></iframe>
                    </div>
                </div>
            )}
            <div className="pt-4 flex justify-end">
                <button type="submit" disabled={isLoading} className="bg-brand-primary hover:bg-brand-dark text-white font-semibold px-4 py-2 rounded-md shadow-sm transition-colors disabled:bg-indigo-300">
                    {isLoading ? 'Saving...' : 'Save Location'}
                </button>
            </div>
        </form>
    );
};


const LocationsManagementPage: React.FC = () => {
    const [locations, setLocations] = useState<Location[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isFormLoading, setIsFormLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [editingLocation, setEditingLocation] = useState<Partial<Location> | null>(null);

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const data = await getLocations();
            setLocations(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch locations.');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleSave = async (location: Partial<Location>) => {
        setIsFormLoading(true);
        try {
            if (location.id) {
                await updateLocation(location.id, location);
            } else {
                await addLocation(location as Omit<Location, 'id'>);
            }
            setEditingLocation(null);
            await fetchData();
        } catch (err) {
            alert(err instanceof Error ? err.message : 'Failed to save location.');
        } finally {
            setIsFormLoading(false);
        }
    };
    
    const handleDelete = async (id: string) => {
        if (window.confirm('Are you sure you want to delete this location? It may be in use by students, teachers, or batches.')) {
            try {
                await deleteLocation(id);
                await fetchData();
            } catch (err) {
                 alert(err instanceof Error ? err.message : 'Failed to delete location.');
            }
        }
    };

    return (
        <div className="bg-gray-50 min-h-full py-3">
            <div className="container mx-auto px-6 lg:px-8">
                <AdminPageHeader title="Location Management" subtitle="Manage physical locations for offline classes." backLinkPath="/admin/dashboard" backTooltipText="Back to Dashboard" />
                <AdminNav />

                <div className="mt-8">
                    <div className="flex justify-end mb-4">
                        <button onClick={() => setEditingLocation({})} className="bg-brand-primary hover:bg-brand-dark text-white font-semibold px-4 py-2 rounded-md shadow-sm transition-colors">
                            + Add New Location
                        </button>
                    </div>
                    {isLoading && <p>Loading locations...</p>}
                    {error && <p className="text-red-500">{error}</p>}
                    {!isLoading && !error && (
                        <div className="bg-white shadow-md rounded-lg overflow-hidden">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Address</th>
                                        <th className="relative px-6 py-3"><span className="sr-only">Actions</span></th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {locations.map(location => (
                                        <tr key={location.id}>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{location.name}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{location.address}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-4">
                                                <button onClick={() => setEditingLocation(location)} className="text-brand-primary hover:text-brand-dark">Edit</button>
                                                <button onClick={() => handleDelete(location.id)} className="text-red-600 hover:text-red-800">Delete</button>
                                            </td>
                                        </tr>
                                    ))}
                                    {locations.length === 0 && (
                                        <tr>
                                            <td colSpan={3} className="px-6 py-8 text-center text-sm text-gray-500">No locations found.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            <Modal isOpen={!!editingLocation} onClose={() => setEditingLocation(null)} size="lg">
                <ModalHeader title={editingLocation?.id ? 'Edit Location' : 'Add New Location'} />
                <LocationForm location={editingLocation || {}} onSave={handleSave} isLoading={isFormLoading} />
            </Modal>
        </div>
    );
};

export default LocationsManagementPage;
