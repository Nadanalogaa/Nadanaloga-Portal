import React from 'react';
import { Link } from 'react-router-dom';
import type { Notification } from '../types';
import { markNotificationAsRead } from '../api';

interface NotificationPanelProps {
  notifications: Notification[];
  isLoading: boolean;
  onClose: () => void;
  onRefresh: () => void;
  onUpdateNotifications: React.Dispatch<React.SetStateAction<Notification[]>>;
}

const NotificationItem: React.FC<{ notification: Notification, onMarkRead: (id: string) => void }> = ({ notification, onMarkRead }) => {
    
    const handleMarkAsRead = async () => {
        if (!notification.read) {
            try {
                await markNotificationAsRead(notification.id);
                onMarkRead(notification.id);
            } catch (error) {
                console.error("Failed to mark notification as read", error);
            }
        }
    };

    const content = (
        <div className="cursor-pointer">
            <div className="flex justify-between items-center">
                <p className="font-semibold text-gray-800 text-sm truncate">{notification.subject}</p>
                {!notification.read && <span className="h-2 w-2 bg-blue-500 rounded-full flex-shrink-0 ml-2"></span>}
            </div>
            <p className="text-sm text-gray-600 mt-1 line-clamp-2">{notification.message}</p>
            <p className="text-xs text-gray-400 mt-2">{new Date(notification.createdAt).toLocaleString()}</p>
        </div>
    );

    return (
        <li className={`border-b border-gray-100 ${!notification.read ? 'bg-indigo-50' : 'bg-white'} hover:bg-gray-100`}>
            {notification.link ? (
                <Link to={notification.link} className="block p-3" onClick={handleMarkAsRead}>
                    {content}
                </Link>
            ) : (
                <div className="p-3" onClick={handleMarkAsRead}>
                    {content}
                </div>
            )}
        </li>
    );
};


const NotificationPanel: React.FC<NotificationPanelProps> = ({ notifications, isLoading, onClose, onRefresh, onUpdateNotifications }) => {
    
    const handleMarkOneAsRead = (id: string) => {
        onUpdateNotifications(prev =>
            prev.map(n => n.id === id ? { ...n, read: true } : n)
        );
    };
    
    return (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-lg shadow-2xl border border-gray-200 z-50 animate-modal-fade-in-up origin-top-right">
            <div className="flex justify-between items-center p-3 border-b border-gray-200">
                <h3 className="font-semibold text-gray-800">Notifications</h3>
                <button onClick={onRefresh} className="text-sm text-brand-primary hover:underline" disabled={isLoading}>
                    {isLoading ? 'Refreshing...' : 'Refresh'}
                </button>
            </div>
            <ul className="max-h-96 overflow-y-auto">
                {isLoading && notifications.length === 0 ? (
                    <li className="p-4 text-center text-gray-500">Loading...</li>
                ) : notifications.length === 0 ? (
                    <li className="p-4 text-center text-gray-500">You have no notifications.</li>
                ) : (
                    notifications.map(n => (
                        <NotificationItem key={n.id} notification={n} onMarkRead={handleMarkOneAsRead} />
                    ))
                )}
            </ul>
            <div className="p-2 bg-gray-50 border-t border-gray-200 text-center">
                {/* Could link to a full notifications page in the future */}
                <span className="text-sm text-gray-500">End of notifications</span>
            </div>
        </div>
    );
};

export default NotificationPanel;