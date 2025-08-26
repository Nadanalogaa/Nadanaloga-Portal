import React, { useState } from 'react';
import type { User } from '../types';
import { UserRole } from '../types';
import { loginUser, registerAdmin, logout } from '../api';

interface AdminLoginPageProps {
  onLoginSuccess: (user: User) => void;
}

const AdminLoginPage: React.FC<AdminLoginPageProps> = ({ onLoginSuccess }) => {
  const [isLoginView, setIsLoginView] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Form states
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const user = await loginUser(loginEmail, loginPassword);
      if (user.role === UserRole.Admin) {
        onLoginSuccess(user);
      } else {
        setError('Access denied. You do not have administrative privileges.');
        await logout(); // Log out the non-admin user
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed.');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    if (regPassword !== regConfirmPassword) {
        setError("Passwords do not match.");
        return;
    }
    if (regPassword.length < 6) {
        setError("Password must be at least 6 characters long.");
        return;
    }
    setIsLoading(true);
    try {
        await registerAdmin({
            name: regName,
            email: regEmail,
            password: regPassword,
            contactNumber: regPhone,
        });
        setSuccess("Registration successful! You can now log in.");
        setIsLoginView(true);
        // Clear registration form
        setRegName('');
        setRegEmail('');
        setRegPhone('');
        setRegPassword('');
        setRegConfirmPassword('');
    } catch (err) {
        setError(err instanceof Error ? err.message : 'Registration failed.');
    } finally {
        setIsLoading(false);
    }
  };


  const renderLoginForm = () => (
    <form onSubmit={handleLogin} className="space-y-6">
      <div>
        <label htmlFor="admin-email-login" className="form-label">Email Address</label>
        <input type="email" id="admin-email-login" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} required className="form-input w-full" />
      </div>
      <div>
        <label htmlFor="admin-password-login" className="form-label">Password</label>
        <input type="password" id="admin-password-login" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} required className="form-input w-full" />
      </div>
      <div>
        <button type="submit" disabled={isLoading} className="w-full btn-primary">
            {isLoading ? 'Logging in...' : 'Sign In'}
        </button>
      </div>
    </form>
  );

  const renderRegisterForm = () => (
    <form onSubmit={handleRegister} className="space-y-4">
        <div>
            <label htmlFor="reg-name" className="form-label">Full Name</label>
            <input id="reg-name" type="text" value={regName} onChange={e => setRegName(e.target.value)} required className="form-input w-full" />
        </div>
        <div>
            <label htmlFor="reg-email" className="form-label">Email Address</label>
            <input id="reg-email" type="email" value={regEmail} onChange={e => setRegEmail(e.target.value)} required className="form-input w-full" />
        </div>
        <div>
            <label htmlFor="reg-phone" className="form-label">Phone Number</label>
            <input id="reg-phone" type="tel" value={regPhone} onChange={e => setRegPhone(e.target.value)} required className="form-input w-full" />
        </div>
        <div>
            <label htmlFor="reg-password"  className="form-label">Password</label>
            <input id="reg-password" type="password" value={regPassword} onChange={e => setRegPassword(e.target.value)} required className="form-input w-full" />
        </div>
        <div>
            <label htmlFor="reg-confirm-password" className="form-label">Confirm Password</label>
            <input id="reg-confirm-password" type="password" value={regConfirmPassword} onChange={e => setRegConfirmPassword(e.target.value)} required className="form-input w-full" />
        </div>
        <div>
            <button type="submit" disabled={isLoading} className="w-full btn-primary">
                {isLoading ? 'Registering...' : 'Register'}
            </button>
        </div>
    </form>
  );

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-250px)] bg-gray-50 py-12 px-4">
       <style>{`.btn-primary { display: flex; justify-content: center; padding: 0.75rem 1rem; border: 1px solid transparent; border-radius: 0.375rem; box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05); font-size: 0.875rem; font-weight: 500; color: white; background-color: #1a237e; } .btn-primary:hover { background-color: #0d113d; } .btn-primary:disabled { background-color: #9fa8da; cursor: not-allowed; }`}</style>
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-2xl">
        <div className="text-center">
          <h1 className="tangerine-title text-5xl text-brand-primary">Nadanaloga</h1>
          <h2 className="mt-2 text-2xl font-bold text-gray-800">
            Admin Portal
          </h2>
        </div>
        
        {error && <p className="text-sm text-center text-red-600 bg-red-100 p-3 rounded-md">{error}</p>}
        {success && <p className="text-sm text-center text-green-600 bg-green-100 p-3 rounded-md">{success}</p>}
        
        {isLoginView ? renderLoginForm() : renderRegisterForm()}
        
        <div className="text-center text-sm">
            {isLoginView ? "Don't have an admin account? " : "Already have an account? "}
            <button 
                onClick={() => {
                    setIsLoginView(!isLoginView);
                    setError(null);
                    setSuccess(null);
                }} 
                className="font-medium text-brand-primary hover:text-brand-dark"
            >
                {isLoginView ? "Register here" : "Sign in"}
            </button>
        </div>
      </div>
    </div>
  );
};

export default AdminLoginPage;