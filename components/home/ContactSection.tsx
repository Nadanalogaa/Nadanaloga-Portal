
import React, { useState } from 'react';
import { submitContactForm } from '../../api';

const ContactSection: React.FC = () => {
  const [formData, setFormData] = useState({ name: '', email: '', message: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(false);

    try {
      await submitContactForm(formData);
      setSuccess(true);
      setFormData({ name: '', email: '', message: '' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section id="contact" className="container mx-auto px-6 lg:px-8">
      <div className="text-center">
        <h2 className="text-4xl font-bold text-brand-primary sm:text-5xl tangerine-title">Get in Touch</h2>
        <p className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto">
          Have a question or ready to enroll? Send us a message, and we'll get back to you soon.
        </p>
      </div>
      <div className="mt-12 max-w-lg mx-auto bg-white p-8 rounded-xl shadow-lg">
        {success ? (
          <div className="text-center p-4 bg-green-100 text-green-800 rounded-md">
            <h3 className="font-semibold">Message Sent!</h3>
            <p>Thank you for reaching out. We'll get back to you shortly.</p>
          </div>
        ) : (
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">Name</label>
              <input type="text" name="name" id="name" required disabled={isLoading} value={formData.name} onChange={handleChange} className="mt-1 block w-full form-input" />
            </div>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email</label>
              <input type="email" name="email" id="email" required disabled={isLoading} value={formData.email} onChange={handleChange} className="mt-1 block w-full form-input" />
            </div>
            <div>
              <label htmlFor="message" className="block text-sm font-medium text-gray-700">Message</label>
              <textarea name="message" id="message" rows={4} required disabled={isLoading} value={formData.message} onChange={handleChange} className="mt-1 block w-full form-textarea"></textarea>
            </div>
            {error && <p className="text-sm text-red-600 text-center">{error}</p>}
            <div>
              <button type="submit" disabled={isLoading} className="w-full bg-brand-secondary text-brand-dark font-semibold py-3 px-4 rounded-full shadow-md hover:bg-yellow-500 transition-colors duration-300 disabled:bg-yellow-300 disabled:cursor-not-allowed">
                {isLoading ? 'Sending...' : 'Send Message'}
              </button>
            </div>
          </form>
        )}
      </div>
    </section>
  );
};

export default ContactSection;