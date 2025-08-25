
import React, { useState, useEffect } from 'react';
import { useOutletContext, Link } from 'react-router-dom';
import type { User, Event, Notice, Batch } from '../../types';
import { getEvents, getNotices, getBatches, getAdminUsers } from '../../api';

const StatCard: React.FC<{ title: string; value: string | number; linkTo?: string; bgColor: string; textColor: string }> = ({ title, value, linkTo, bgColor, textColor }) => {
    const content = (
        <div className={`block p-6 rounded-xl shadow-md ${linkTo ? 'transition-transform hover:-translate-y-1' : ''} ${bgColor}`}>
            <h4 className={`text-sm font-medium uppercase ${textColor} opacity-80`}>{title}</h4>
            <p className={`text-3xl font-bold mt-2 ${textColor}`}>{value}</p>
        </div>
    );
    return linkTo ? <Link to={linkTo}>{content}</Link> : content;
}

const TeacherDashboardHomePage: React.FC = () => {
    const { user } = useOutletContext<{ user: User }>();
    const [stats, setStats] = useState({ totalStudents: 0, totalBatches: 0 });
    const [recentEvents, setRecentEvents] = useState<Event[]>([]);
    const [recentNotices, setRecentNotices] = useState<Notice[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            if (!user) return;
            try {
                setIsLoading(true);
                const [eventsData, noticesData, batchesData, allUsers] = await Promise.all([
                    getEvents(),
                    getNotices(),
                    getBatches(),
                    getAdminUsers()
                ]);

                // Calculate stats
                const teacherBatches = batchesData.filter(b => {
                    const teacherId = typeof b.teacherId === 'string' ? b.teacherId : (b.teacherId as User)?.id;
                    return teacherId === user.id;
                });
                
                const studentIds = new Set<string>();
                teacherBatches.forEach(batch => {
                    batch.schedule.forEach(s => s.studentIds.forEach(id => studentIds.add(id)));
                });

                setStats({
                    totalStudents: studentIds.size,
                    totalBatches: teacherBatches.length
                });

                setRecentEvents(eventsData.slice(0, 3));
                setRecentNotices(noticesData.slice(0, 3));
            } catch (error) {
                console.error("Failed to fetch dashboard data:", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, [user]);
    
    const today = new Date();
    const dateString = today.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    if (isLoading) {
        return <div className="p-8 text-center">Loading dashboard...</div>;
    }

    return (
        <div className="p-4 sm:p-6 md:p-8 space-y-8">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-dark-text">Welcome, {user.name}!</h1>
                    <p className="text-light-text mt-1">{dateString}</p>
                </div>
                 <div className="flex items-center space-x-3">
                    <span className="text-dark-text font-medium">{user.name}</span>
                    <img src={user.photoUrl || `https://ui-avatars.com/api/?name=${user.name.replace(/\s/g, '+')}&background=7B61FF&color=fff`} alt={user.name} className="w-12 h-12 rounded-full object-cover" />
                </div>
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard title="Total Students" value={stats.totalStudents} bgColor="bg-light-purple" textColor="text-brand-purple" />
                <StatCard title="Total Batches" value={stats.totalBatches} bgColor="bg-yellow-100" textColor="text-yellow-800" />
                <StatCard title="Your Courses" value={(user.courseExpertise || []).length} linkTo="courses" bgColor="bg-blue-100" textColor="text-blue-800" />
                <StatCard title="Payment History" value={"View"} linkTo="payment-history" bgColor="bg-green-100" textColor="text-green-800" />
            </div>

            {/* Recent Activity */}
             <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Recent Notices */}
                <div className="bg-white p-6 rounded-xl shadow-md">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-xl font-semibold text-dark-text">Recent Notices</h3>
                        <Link to="notice" className="text-sm font-medium text-brand-purple hover:underline">View All</Link>
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

export default TeacherDashboardHomePage;
