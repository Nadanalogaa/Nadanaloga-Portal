import React, { useState, useEffect } from 'react';
import { useOutletContext, Link } from 'react-router-dom';
import type { User, Event, Notice } from '../../types';
import { getFamilyStudents, getEvents, getNotices } from '../../api';

const StatCard: React.FC<{ title: string; value: string | number; linkTo: string; bgColor: string; textColor: string }> = ({ title, value, linkTo, bgColor, textColor }) => (
    <Link to={linkTo} className={`block p-6 rounded-xl shadow-md transition-transform hover:-translate-y-1 ${bgColor}`}>
        <h4 className={`text-sm font-medium uppercase ${textColor} opacity-80`}>{title}</h4>
        <p className={`text-3xl font-bold mt-2 ${textColor}`}>{value}</p>
    </Link>
);

const StudentDashboardHomePage: React.FC = () => {
    const { user } = useOutletContext<{ user: User }>();
    const [family, setFamily] = useState<User[]>([]);
    const [recentEvents, setRecentEvents] = useState<Event[]>([]);
    const [recentNotices, setRecentNotices] = useState<Notice[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setIsLoading(true);
                const [familyData, eventsData, noticesData] = await Promise.all([
                    getFamilyStudents(),
                    getEvents(),
                    getNotices(),
                ]);
                setFamily(familyData);
                setRecentEvents(eventsData.slice(0, 3));
                setRecentNotices(noticesData.slice(0, 3));
            } catch (error) {
                console.error("Failed to fetch dashboard data:", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, []);
    
    const today = new Date();
    const dateString = today.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const guardianName = user.fatherName || user.name;


    if (isLoading) {
        return <div className="p-8 text-center">Loading dashboard...</div>;
    }

    return (
        <div className="p-4 sm:p-6 md:p-8 space-y-8">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-dark-text">Welcome, {guardianName}!</h1>
                    <p className="text-light-text mt-1">{dateString}</p>
                </div>
                 <div className="flex items-center space-x-3">
                    <span className="text-dark-text font-medium">{guardianName}</span>
                    <img src={user.photoUrl || `https://ui-avatars.com/api/?name=${guardianName.replace(/\s/g, '+')}&background=7B61FF&color=fff`} alt={guardianName} className="w-12 h-12 rounded-full object-cover" />
                </div>
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard title="Enrolled Students" value={family.length} linkTo="family-profile" bgColor="bg-light-purple" textColor="text-brand-purple" />
                <StatCard title="Upcoming Events" value={recentEvents.length} linkTo="events" bgColor="bg-yellow-100" textColor="text-yellow-800" />
                <StatCard title="Recent Notices" value={recentNotices.length} linkTo="notices" bgColor="bg-blue-100" textColor="text-blue-800" />
                <StatCard title="Payment History" value={"View"} linkTo="payment-history" bgColor="bg-green-100" textColor="text-green-800" />
            </div>

            {/* Recent Activity */}
             <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Recent Notices */}
                <div className="bg-white p-6 rounded-xl shadow-md">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-xl font-semibold text-dark-text">Recent Notices</h3>
                        <Link to="notices" className="text-sm font-medium text-brand-purple hover:underline">View All</Link>
                    </div>
                    <ul className="space-y-3">
                        {recentNotices.map(notice => (
                            <li key={notice.id} className="p-3 bg-light-purple/50 rounded-lg">
                                <p className="font-semibold text-dark-text">{notice.title}</p>
                                <p className="text-xs text-light-text mt-1">{new Date(notice.issuedAt).toLocaleDateString()}</p>
                            </li>
                        ))}
                         {recentNotices.length === 0 && <p className="text-sm text-light-text">No recent notices.</p>}
                    </ul>
                </div>
                {/* Upcoming Events */}
                <div className="bg-white p-6 rounded-xl shadow-md">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-xl font-semibold text-dark-text">Upcoming Events</h3>
                        <Link to="events" className="text-sm font-medium text-brand-purple hover:underline">View All</Link>
                    </div>
                     <ul className="space-y-3">
                        {recentEvents.map(event => (
                            <li key={event.id} className="p-3 bg-light-purple/50 rounded-lg">
                                <p className="font-semibold text-dark-text">{event.title}</p>
                                <p className="text-xs text-light-text mt-1">{new Date(event.date).toLocaleString()}</p>
                            </li>
                        ))}
                        {recentEvents.length === 0 && <p className="text-sm text-light-text">No upcoming events.</p>}
                    </ul>
                </div>
            </div>
        </div>
    );
};

export default StudentDashboardHomePage;