import React, { useState } from 'react';
import { NavLink, useLocation, Link } from 'react-router-dom';
import { NAV_LINKS } from '../constants';
import type { User } from '../types';
import { UserRole } from '../types';
import NotificationBell from './NotificationBell';

interface HeaderProps {
  currentUser: User | null;
  onLogout: () => void;
  onLoginClick: () => void;
}

const Header: React.FC<HeaderProps> = ({ currentUser, onLogout, onLoginClick }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();
  const isAdminPage = location.pathname.startsWith('/admin');

  const visibleNavLinks = NAV_LINKS.filter(link => !isAdminPage);

  const getDashboardPath = () => {
    if (!currentUser) return "/";
    switch (currentUser.role) {
      case UserRole.Admin: return "/admin/dashboard";
      case UserRole.Student: return "/dashboard/student";
      case UserRole.Teacher: return "/dashboard/teacher";
      default: return "/";
    }
  };
  
  const displayName = currentUser ? (currentUser.role === UserRole.Student && currentUser.fatherName ? currentUser.fatherName : currentUser.name) : '';

  return (
    <header className="bg-white shadow-md sticky top-0 z-40">
      <nav className="container mx-auto px-6 py-3 flex justify-between items-center">
        <NavLink to="/" className="text-3xl font-bold text-brand-primary tangerine-title">
          Nadanaloga
        </NavLink>

        {/* Desktop Menu */}
        <div className="hidden md:flex items-center space-x-6">
          {visibleNavLinks.map((link) => (
            <NavLink
              key={link.name}
              to={link.path}
              className={({ isActive }) =>
                `text-gray-700 hover:text-brand-primary transition-colors duration-300 ${isActive ? 'font-semibold text-brand-primary' : ''}`
              }
            >
              {link.name}
            </NavLink>
          ))}
           {currentUser && (
            <NavLink
              to={getDashboardPath()}
              className={({ isActive }) =>
                `text-gray-700 hover:text-brand-primary transition-colors duration-300 ${isActive ? 'font-semibold text-brand-primary' : ''}`
              }
            >
              Dashboard
            </NavLink>
          )}
        </div>

        <div className="hidden md:flex items-center space-x-4">
          {currentUser ? (
            <>
              <NotificationBell />
              <span className="text-gray-700 ml-2">Welcome, {displayName.split(' ')[0]}!</span>
              <button onClick={onLogout} className="bg-brand-secondary hover:bg-yellow-500 text-brand-dark font-semibold px-4 py-2 rounded-full shadow-sm transition-transform duration-300 hover:scale-105">
                Logout
              </button>
            </>
          ) : (
            <>
              <button onClick={onLoginClick} className="px-4 py-2 text-gray-700 hover:text-brand-primary transition-colors duration-300">
                Login
              </button>
              <Link to="/register" className="bg-brand-secondary hover:bg-yellow-500 text-brand-dark font-semibold px-4 py-2 rounded-full shadow-sm transition-transform duration-300 hover:scale-105">
                Register
              </Link>
            </>
          )}
        </div>

        {/* Mobile Menu Button */}
        <div className="md:hidden flex items-center space-x-4">
            {currentUser && <NotificationBell />}
            <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="text-gray-700 focus:outline-none">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {isMenuOpen ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16m-7 6h7" />
                )}
                </svg>
            </button>
        </div>
      </nav>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="md:hidden bg-white px-6 pb-4">
          <div className="flex flex-col space-y-3">
            {visibleNavLinks.map((link) => (
              <NavLink
                key={link.name}
                to={link.path}
                onClick={() => setIsMenuOpen(false)}
                className={({ isActive }) =>
                  `text-gray-700 hover:text-brand-primary py-2 ${isActive ? 'font-semibold text-brand-primary' : ''}`
                }
              >
                {link.name}
              </NavLink>
            ))}
             {currentUser && (
                <NavLink
                  to={getDashboardPath()}
                  onClick={() => setIsMenuOpen(false)}
                  className={({ isActive }) =>
                    `text-gray-700 hover:text-brand-primary py-2 ${isActive ? 'font-semibold text-brand-primary' : ''}`
                  }
                >
                  Dashboard
                </NavLink>
             )}
            <div className="flex flex-col space-y-3 pt-4 border-t">
              {currentUser ? (
                <>
                  <span className="px-4 py-2 text-gray-700 text-left">Welcome, {displayName.split(' ')[0]}!</span>
                  <button onClick={() => { onLogout(); setIsMenuOpen(false); }} className="bg-brand-secondary hover:bg-yellow-500 text-brand-dark font-semibold px-4 py-2 rounded-full shadow-sm">
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <button onClick={() => { onLoginClick(); setIsMenuOpen(false); }} className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded text-left">
                    Login
                  </button>
                  <Link to="/register" onClick={() => setIsMenuOpen(false)} className="bg-brand-secondary hover:bg-yellow-500 text-brand-dark font-semibold px-4 py-2 rounded-full shadow-sm text-center">
                    Register
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;