
import React, { useState } from 'react';
import type { User } from '../types';
import { UserRole } from '../types';
import { logout } from '../api';
import LoginForm from '../components/LoginForm';

interface AdminLoginPageProps {
  onLoginSuccess: (user: User) => void;
}

const AdminLoginPage: React.FC<AdminLoginPageProps> = ({ onLoginSuccess }) => {
  const [error, setError] = useState<string | null>(null);

  const handleLoginAttempt = (user: User) => {
    if (user.role === UserRole.Admin) {
      setError(null);
      // onLoginSuccess from App.tsx will handle state update and navigation
      onLoginSuccess(user);
    } else {
      setError('You do not have administrative privileges. Please log in with an admin account.');
      // Log out the non-admin user to prevent a confusing state
      logout();
    }
  };

  const handleForgotPassword = () => {
    alert('Password reset functionality is not yet implemented. Please contact support.');
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-250px)] bg-gray-50 py-12">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-2xl mx-4">
        <div className="text-center">
          <h1 className="tangerine-title text-5xl text-brand-primary">Nadanaloga</h1>
          <h2 className="mt-2 text-2xl font-bold text-gray-800">
            Admin Sign In
          </h2>
        </div>
        <LoginForm 
          onSuccess={handleLoginAttempt} 
          onForgotPassword={handleForgotPassword}
        />
        {error && (
          <p className="mt-4 text-sm text-center text-red-600 bg-red-100 p-3 rounded-md">
            {error}
          </p>
        )}
      </div>
    </div>
  );
};

export default AdminLoginPage;