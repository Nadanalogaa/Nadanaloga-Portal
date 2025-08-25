





import React from 'react';
import { NavLink } from 'react-router-dom';

const AdminNav: React.FC = () => {
  const links = [
    { name: 'Dashboard', path: '/admin/dashboard' },
    { name: 'Students', path: '/admin/students' },
    { name: 'Teachers', path: '/admin/teachers' },
    { name: 'Batches', path: '/admin/batches' },
    { name: 'Locations', path: '/admin/locations' },
    { name: 'Fees', path: '/admin/fees' },
    { name: 'Events', path: '/admin/events' },
    { name: 'Grade Exams', path: '/admin/grade-exams' },
    { name: 'Book Materials', path: '/admin/book-materials' },
    { name: 'Notices', path: '/admin/notices' },
    { name: 'Trash', path: '/admin/trash' },
  ];

  const linkClasses = "flex-grow text-center px-4 py-3 text-sm font-medium rounded-md transition-colors";
  const activeLinkClasses = "bg-brand-primary text-white";
  const inactiveLinkClasses = "text-gray-600 hover:bg-brand-light/50 hover:text-brand-primary";

  return (
    <div className="bg-white rounded-lg shadow-sm p-2 my-6">
      <nav className="flex space-x-2 overflow-x-auto">
        {links.map(link => (
          <NavLink
            key={link.name}
            to={link.path}
            end={link.path === '/admin/dashboard'}
            className={({ isActive }) => `${linkClasses} ${isActive ? activeLinkClasses : inactiveLinkClasses}`}
          >
            {link.name}
          </NavLink>
        ))}
      </nav>
    </div>
  );
};

export default AdminNav;