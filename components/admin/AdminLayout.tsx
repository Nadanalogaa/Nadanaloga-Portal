
import React, { useState } from 'react';
import { NavLink, Link, Outlet } from 'react-router-dom';
import type { User } from '../../types';
import { DashboardIcon, StudentsIcon, TeachersIcon, BatchesIcon, LogoutIcon, MenuIcon, XIcon, HomeIcon } from '../icons';

interface AdminLayoutProps {
  currentUser: User;
  onLogout: () => void;
}

const adminNavLinks = [
  { name: 'Dashboard', path: '/admin/dashboard', icon: DashboardIcon },
  { name: 'Students', path: '/admin/students', icon: StudentsIcon },
  { name: 'Teachers', path: '/admin/teachers', icon: TeachersIcon },
  { name: 'Batches', path: '/admin/batches', icon: BatchesIcon },
];

const AdminLayout: React.FC<AdminLayoutProps> = ({ currentUser, onLogout }) => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    const SidebarContent = () => (
        <div className="flex flex-col flex-grow">
            <div className="flex items-center flex-shrink-0 px-4 h-16 border-b border-gray-700">
                <Link to="/admin/dashboard" className="text-2xl font-bold text-white tangerine-title">
                    Nadanaloga Admin
                </Link>
            </div>
            <nav className="flex-1 px-2 py-4 space-y-1">
                {adminNavLinks.map(item => (
                    <NavLink
                        key={item.name}
                        to={item.path}
                        end={item.path === '/admin/dashboard'}
                        onClick={() => setIsSidebarOpen(false)}
                        className={({ isActive }) =>
                            'flex items-center px-4 py-2.5 text-sm font-medium rounded-md transition-colors ' +
                            (isActive ? 'bg-brand-dark text-white' : 'text-indigo-100 hover:bg-brand-primary/50 hover:text-white')
                        }
                    >
                        <item.icon className="mr-3 h-6 w-6" />
                        {item.name}
                    </NavLink>
                ))}
            </nav>
             <div className="flex-shrink-0 p-4 border-t border-gray-700">
                 <Link to="/" onClick={() => setIsSidebarOpen(false)} className="flex items-center w-full px-4 py-2.5 text-sm font-medium rounded-md text-indigo-100 hover:bg-brand-primary/50 hover:text-white">
                    <HomeIcon className="mr-3 h-6 w-6" />
                    Back to Main Site
                </Link>
                <button onClick={() => { onLogout(); setIsSidebarOpen(false); }} className="flex items-center w-full mt-2 px-4 py-2.5 text-sm font-medium rounded-md text-indigo-100 hover:bg-brand-primary/50 hover:text-white">
                    <LogoutIcon className="mr-3 h-6 w-6" />
                    Logout
                </button>
            </div>
        </div>
    );


  return (
    <div className="flex h-screen bg-gray-100">
      {/* Static sidebar for desktop */}
      <div className="hidden md:flex md:flex-shrink-0">
        <div className="flex flex-col w-64 bg-brand-primary">
          <SidebarContent />
        </div>
      </div>
      
       {/* Mobile sidebar */}
        {isSidebarOpen && (
             <div className="md:hidden fixed inset-0 flex z-40" role="dialog" aria-modal="true">
                <div className="fixed inset-0 bg-gray-600 bg-opacity-75" aria-hidden="true" onClick={() => setIsSidebarOpen(false)}></div>
                <div className="relative flex-1 flex flex-col max-w-xs w-full bg-brand-primary">
                    <div className="absolute top-0 right-0 -mr-12 pt-2">
                        <button type="button" className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white" onClick={() => setIsSidebarOpen(false)}>
                            <span className="sr-only">Close sidebar</span>
                            <XIcon className="h-6 w-6 text-white" />
                        </button>
                    </div>
                    <SidebarContent />
                </div>
                <div className="flex-shrink-0 w-14" aria-hidden="true"></div>
            </div>
        )}

      <div className="flex flex-col flex-1 w-0 overflow-hidden">
        <header className="md:hidden relative z-10 flex-shrink-0 flex h-16 bg-white shadow">
            <button type="button" className="px-4 border-r border-gray-200 text-gray-500 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500 md:hidden" onClick={() => setIsSidebarOpen(true)}>
                <span className="sr-only">Open sidebar</span>
                <MenuIcon className="h-6 w-6" />
            </button>
            <div className="flex-1 px-4 flex justify-between items-center">
                <Link to="/admin/dashboard" className="text-xl font-bold text-brand-primary tangerine-title">Nadanaloga</Link>
                <div className="text-sm">Welcome, {currentUser.name.split(' ')[0]}</div>
            </div>
        </header>

        <main className="flex-1 relative overflow-y-auto focus:outline-none">
          <div className="py-8 px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto">
                <Outlet />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
