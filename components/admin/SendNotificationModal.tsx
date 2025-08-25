
import React, { useState, useEffect } from 'react';
import Modal from '../Modal';
import ModalHeader from '../ModalHeader';
import type { User } from '../../types';

interface SendNotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  recipients: User[];
  onSend: (subject: string, message: string) => Promise<void>;
  userType: 'student' | 'teacher';
}

const SendNotificationModal: React.FC<SendNotificationModalProps> = ({ isOpen, onClose, recipients, onSend, userType }) => {
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    // Reset state when the modal becomes visible, to ensure it's fresh.
    if (isOpen) {
      setSubject('');
      setMessage('');
      setError(null);
      setSuccess(null);
      setIsLoading(false);
    }
  }, [isOpen]);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    if (!subject.trim() || !message.trim()) {
      setError('Subject and message cannot be empty.');
      return;
    }
    setIsLoading(true);
    try {
      await onSend(subject, message);
      setSuccess('Notification sent successfully!');
      setSubject('');
      setMessage('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send notification.');
    } finally {
      setIsLoading(false);
    }
  };
  
  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <form onSubmit={handleSubmit}>
        <ModalHeader
          title="Send Notification"
          subtitle={`To ${recipients.length} selected ${userType}${recipients.length > 1 ? 's' : ''}`}
        />
        
        <div className="space-y-4">
          <div>
            <label htmlFor="subject" className="form-label">Subject</label>
            <input
              type="text"
              id="subject"
              name="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              disabled={isLoading}
              required
              className="form-input w-full"
            />
          </div>
          <div>
            <label htmlFor="message" className="form-label">Message</label>
            <textarea
              id="message"
              name="message"
              rows={6}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              disabled={isLoading}
              required
              className="form-textarea w-full"
            />
          </div>
          
          <div className="bg-gray-50 p-3 rounded-md max-h-32 overflow-y-auto border">
            <h4 className="text-sm font-medium text-gray-600 mb-2">Recipients:</h4>
            <ul className="text-sm text-gray-500 list-disc list-inside space-y-1">
              {recipients.map(r => <li key={r.id}>{r.name} ({r.email})</li>)}
            </ul>
          </div>
        </div>

        {error && <p className="text-sm text-red-600 text-center mt-4">{error}</p>}
        {success && <p className="text-sm text-green-600 text-center mt-4">{success}</p>}
        
        <div className="flex justify-end pt-6 mt-4 border-t border-gray-200">
          <button type="button" onClick={onClose} disabled={isLoading} className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-primary">
            Close
          </button>
          <button type="submit" disabled={isLoading} className="ml-3 inline-flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-brand-primary hover:bg-brand-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors disabled:bg-indigo-300 disabled:cursor-not-allowed">
            {isLoading ? 'Sending...' : 'Send Notification'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default SendNotificationModal;
