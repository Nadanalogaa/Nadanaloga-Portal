import React from 'react';
import { Link } from 'react-router-dom';
import { NAV_LINKS } from '../constants';

const Footer: React.FC = () => {
  return (
    <footer className="bg-brand-dark text-brand-light">
      <div className="container mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="col-span-1 md:col-span-2">
            <h3 className="text-2xl font-bold tangerine-title text-white">Nadanaloga</h3>
            <p className="mt-2 text-gray-300 max-w-md">
              Nurturing artistic talent through dedicated training in classical and contemporary arts. Join us to embark on your creative journey.
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-white">Quick Links</h4>
            <ul className="mt-4 space-y-2">
              {NAV_LINKS.map(link => (
                <li key={link.name}>
                  <Link to={link.path} className="text-gray-300 hover:text-brand-secondary transition-colors">
                    {link.name}
                  </Link>
                </li>
              ))}
              <li>
                <Link to="/admin/login" className="text-gray-300 hover:text-brand-secondary transition-colors">
                  Admin Login / Register
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-white">Connect</h4>
            <div className="mt-4 space-y-2 text-gray-300">
               <p>Email: contact@nadanaloga.com</p>
               <p>Phone: +91 12345 67890</p>
            </div>
            <div className="flex mt-4 space-x-4">
              {/* Add social media icons here */}
            </div>
          </div>
        </div>
        <div className="mt-12 border-t border-gray-700 pt-8 text-center text-gray-400">
          <p>&copy; {new Date().getFullYear()} Nadanaloga.com. All Rights Reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;