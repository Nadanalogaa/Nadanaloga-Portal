import React, { useState, useEffect, useRef } from 'react';
import { getNotifications } from '../api';
import type { Notification } from '../types';
import { BellIcon } from './icons';
import NotificationPanel from './NotificationPanel';

const NotificationBell: React.FC = () => {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [isPanelOpen, setIsPanelOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const wrapperRef = useRef<HTMLDivElement>(null);

    const fetchNotifications = async () => {
        try {
            setIsLoading(true);
            const fetchedNotifications = await getNotifications();
            setNotifications(fetchedNotifications);
        } catch (error) {
            console.error("Failed to fetch notifications:", error);
        } finally {
            setIsLoading(false);
        }
    };
    
    useEffect(() => {
        fetchNotifications();
        const interval = setInterval(fetchNotifications, 60000); // Poll every minute
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsPanelOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [wrapperRef]);
    
    const unreadCount = notifications.filter(n => !n.read).length;

    return (
        <div className="relative" ref={wrapperRef}>
            <button
                onClick={() => setIsPanelOpen(prev => !prev)}
                className="relative text-gray-600 hover:text-brand-primary focus:outline-none transition-colors"
                aria-label={`Notifications (${unreadCount} unread)`}
            >
                <BellIcon />
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-4 w-4">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500 text-white text-[10px] items-center justify-center">
                            {unreadCount}
                        </span>
                    </span>
                )}
            </button>
            
            {isPanelOpen && (
                <NotificationPanel 
                    notifications={notifications}
                    isLoading={isLoading}
                    onClose={() => setIsPanelOpen(false)}
                    onRefresh={fetchNotifications}
                    onUpdateNotifications={setNotifications}
                />
            )}
        </div>
    );
};

export default NotificationBell;
