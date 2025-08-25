
import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import type { User } from '../types';

// --- SVG Icons for Sidebar ---
const IconWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">{children}</svg>
);
const DashboardIcon = () => <IconWrapper><path d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></IconWrapper>;
const StudentsProfileIcon = () => <IconWrapper><path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></IconWrapper>;
const CoursesIcon = () => <IconWrapper><path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></IconWrapper>;
const GradeExamsIcon = () => <IconWrapper><path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></IconWrapper>;
const BookMaterialsIcon = () => <IconWrapper><path d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" /></IconWrapper>;
const EventsIcon = () => <IconWrapper><path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></IconWrapper>;
const NoticeIcon = () => <IconWrapper><path d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" /></IconWrapper>;
const ProfileIcon = () => <IconWrapper><path d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 012-2h4a2 2 0 012 2v1m-4 0h4" /></IconWrapper>;
const PaymentHistoryIcon = () => <IconWrapper><path d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></IconWrapper>;
const LogoutIcon = () => <IconWrapper><path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></IconWrapper>;

interface StudentDashboardPageProps {
    user: User;
    onLogout: () => void;
    onUpdate: (user: User) => void;
}

// --- Sidebar Component ---
const Sidebar: React.FC<{ onLogout: () => void }> = ({ onLogout }) => {
    const NAV_ITEMS = [
        { name: 'Dashboard', path: '/dashboard/student', icon: DashboardIcon, end: true },
        { name: 'Students Profile', path: 'family-profile', icon: StudentsProfileIcon },
        { name: 'Courses', path: 'courses', icon: CoursesIcon },
        { name: 'Grade Exams', path: 'grade-exams', icon: GradeExamsIcon },
        { name: 'Book Materials', path: 'book-materials', icon: BookMaterialsIcon },
        { name: 'Events', path: 'events', icon: EventsIcon },
        { name: 'Notice', path: 'notices', icon: NoticeIcon },
        { name: 'Profile', path: 'profile', icon: ProfileIcon },
        { name: 'Payment History', path: 'payment-history', icon: PaymentHistoryIcon },
    ];
    
    return (
        <aside className="w-64 bg-white shadow-md flex-col hidden lg:flex">
            <div className="px-8 py-6">
                 <h1 className="text-3xl font-bold text-brand-primary tangerine-title">Nadanaloga</h1>
            </div>
            <nav className="flex-grow px-4">
                <ul>
                    {NAV_ITEMS.map(item => (
                        <li key={item.name}>
                            <NavLink 
                                to={item.path} 
                                end={item.end}
                                className={({isActive}) => `flex items-center space-x-3 px-4 py-3 my-1 rounded-lg transition-colors ${isActive ? 'bg-brand-purple text-white' : 'text-light-text hover:bg-light-purple hover:text-dark-text'}`}
                            >
                                <item.icon />
                                <span className="font-medium">{item.name}</span>
                            </NavLink>
                        </li>
                    ))}
                </ul>
            </nav>
            <div className="p-4">
                 <button onClick={onLogout} className="flex items-center w-full space-x-3 px-4 py-3 rounded-lg text-light-text hover:bg-light-purple hover:text-dark-text">
                    <LogoutIcon />
                    <span className="font-medium">Logout</span>
                </button>
            </div>
        </aside>
    );
};

const StudentDashboardPage: React.FC<StudentDashboardPageProps> = ({ user, onLogout, onUpdate }) => {
    return (
        <div className="flex min-h-screen bg-background font-sans">
            <Sidebar onLogout={onLogout} />
            <main className="flex-1 overflow-y-auto">
                <Outlet context={{ user, onUpdate }} />
            </main>
        </div>
    );
};

export default StudentDashboardPage;
