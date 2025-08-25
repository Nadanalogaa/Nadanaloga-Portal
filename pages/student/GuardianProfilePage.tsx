
import React, { useState, useEffect } from 'react';
import type { User } from '../../types';
import { updateUserProfile } from '../../api';
import { useOutletContext } from 'react-router-dom';
import { COUNTRIES } from '../../constants';

const getGuardianEmail = (email?: string): string => {
    if (!email) return '';
    const parts = email.split('@');
    if (parts.length !== 2) return email;
    const username = parts[0].split('+')[0];
    return `${username}@${parts[1]}`;
};

const GuardianProfilePage: React.FC = () => {
    const { user, onUpdate } = useOutletContext<{ user: User, onUpdate: (user: User) => void }>();
    const [formData, setFormData] = useState<Partial<User>>({});
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    useEffect(() => {
        if (user) {
            setFormData(user);
        }
    }, [user]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);
        setSuccess(null);
        try {
            const updatedUser = await updateUserProfile(formData);
            onUpdate(updatedUser);
            setSuccess('Profile updated successfully!');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to update profile.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="p-4 sm:p-6 md:p-8">
            <h1 className="text-3xl font-bold text-dark-text mb-6">Guardian Profile</h1>
            <div className="max-w-4xl">
                <form onSubmit={handleSubmit} className="bg-white p-8 rounded-xl shadow-lg space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="form-label">Guardian's Full Name</label>
                            <input name="fatherName" value={formData.fatherName || ''} onChange={handleChange} required className="form-input w-full" />
                        </div>
                        <div>
                            <label className="form-label">Email</label>
                            <input type="email" value={getGuardianEmail(formData.email)} disabled className="form-input w-full bg-gray-100" />
                        </div>
                         <div>
                            <label className="form-label">Contact Number</label>
                            <input name="contactNumber" value={formData.contactNumber || ''} onChange={handleChange} required className="form-input w-full" />
                        </div>
                         <div>
                            <label className="form-label">Alternate Contact Number</label>
                            <input name="alternateContactNumber" value={formData.alternateContactNumber || ''} onChange={handleChange} className="form-input w-full" />
                        </div>
                        <div className="md:col-span-2">
                             <label className="form-label">Address</label>
                            <textarea name="address" value={formData.address || ''} onChange={handleChange} rows={3} className="form-textarea w-full" />
                        </div>
                        <div>
                            <label className="form-label">Country</label>
                             <select name="country" value={formData.country || ''} onChange={handleChange} required className="form-select w-full">
                                <option value="">Select Country</option>
                                {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="form-label">State / Province</label>
                            <input name="state" value={formData.state || ''} onChange={handleChange} required className="form-input w-full"/>
                        </div>
                        <div>
                            <label className="form-label">City / Location</label>
                            <input name="city" value={formData.city || ''} onChange={handleChange} required className="form-input w-full"/>
                        </div>
                        <div>
                            <label className="form-label">Postal Code</label>
                            <input name="postalCode" value={formData.postalCode || ''} onChange={handleChange} required className="form-input w-full"/>
                        </div>
                    </div>

                    <div className="border-t border-gray-200 pt-6">
                        {error && <p className="text-sm text-red-600 text-center mb-4">{error}</p>}
                        {success && <p className="text-sm text-green-600 text-center mb-4">{success}</p>}
                        <button type="submit" disabled={isLoading} className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-brand-purple hover:bg-opacity-90 disabled:bg-opacity-50">
                            {isLoading ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default GuardianProfilePage;
