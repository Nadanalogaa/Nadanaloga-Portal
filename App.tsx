import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, Navigate, NavLink, useParams, Outlet, useLocation } from 'react-router-dom';
import Header from './components/Header';
import Footer from './components/Footer';
import HomePage from './pages/HomePage';
import AboutPage from './pages/AboutPage';
import GalleryPage from './pages/GalleryPage';
import FAQPage from './pages/FAQPage';
import ContactPage from './pages/ContactPage';
import Modal from './components/Modal';
import LoginForm from './components/LoginForm';
import RegisterPage from './pages/RegisterPage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import AdminLoginPage from './pages/AdminLoginPage';
import StudentDashboardPage from './pages/StudentDashboardPage';
import TeacherDashboardPage from './pages/TeacherDashboardPage';
import StudentListPage from './pages/admin/StudentListPage';
import TeacherListPage from './pages/admin/TeacherListPage';
import BatchesPage from './pages/admin/BatchesPage';
import FeeManagementPage from './pages/admin/FeeManagementPage';
import type { User } from './types';
import { UserRole } from './types';
import { getCurrentUser, logout } from './api';
import WhatsAppButton from './components/WhatsAppButton';
import StudentProfileViewPage from './pages/admin/StudentProfileViewPage';
import TrashPage from './pages/admin/TrashPage';
import AddFamilyStudentPage from './pages/AddFamilyStudentPage';

// New Admin Pages
import EventsManagementPage from './pages/admin/EventsManagementPage';
import GradeExamsManagementPage from './pages/admin/GradeExamsManagementPage';
import BookMaterialsManagementPage from './pages/admin/BookMaterialsManagementPage';
import NoticesManagementPage from './pages/admin/NoticesManagementPage';
import LocationsManagementPage from './pages/admin/LocationsManagementPage';

// New Student Pages
import StudentDashboardHomePage from './pages/student/StudentDashboardHomePage';
import FamilyProfilePage from './pages/student/FamilyProfilePage';
import StudentCoursesPage from './pages/student/StudentCoursesPage';
import GradeExamsPage from './pages/student/GradeExamsPage';
import BookMaterialsPage from './pages/student/BookMaterialsPage';
import EventsPage from './pages/student/EventsPage';
import NoticesPage from './pages/student/NoticesPage';
import GuardianProfilePage from './pages/student/GuardianProfilePage';
import PaymentHistoryPage from './pages/student/PaymentHistoryPage';

// New Teacher Pages
import TeacherDashboardHomePage from './pages/teacher/TeacherDashboardHomePage';
import TeacherProfilePage from './pages/teacher/TeacherProfilePage';

const TeacherContentPlaceholder = ({ title }: { title: string }) => (
    <div className="p-4 sm:p-6 md:p-8">
        <h1 className="text-3xl font-bold text-dark-text">{title}</h1>
        <div className="mt-8 text-center py-16 bg-white rounded-lg shadow-md">
            <h3 className="text-xl font-semibold text-gray-700">Coming Soon!</h3>
            <p className="text-gray-500 mt-2">This feature is under development.</p>
        </div>
    </div>
);


function App() {
  const [isLoginModalOpen, setLoginModalOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loginEmail, setLoginEmail] = useState('');
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const fetchUserSession = async () => {
      setIsLoading(true);
      const user = await getCurrentUser();
      setCurrentUser(user);
      setIsLoading(false);
    };
    fetchUserSession();
  }, []);

  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    setLoginModalOpen(false);
    setLoginEmail('');
    if (user.role === UserRole.Admin) {
      navigate('/admin/dashboard');
    } else if (user.role === UserRole.Student) {
      navigate('/dashboard/student');
    } else if (user.role === UserRole.Teacher) {
      navigate('/dashboard/teacher');
    }
  };
  
  const openLoginModal = (email: string = '') => {
    setLoginEmail(email);
    setLoginModalOpen(true);
    navigate('/');
  };

  const handleForgotPassword = () => {
    alert('Password reset functionality is not yet implemented. Please contact support.');
  };

  const handleLogout = async () => {
    await logout();
    setCurrentUser(null);
    navigate('/'); // Redirect to home on logout
  };
  
  const AdminProtectedRoute = ({ children }: { children: React.ReactElement }) => {
    if (isLoading) {
      return (
        <div className="flex justify-center items-center min-h-screen bg-brand-light/20">
          <div className="text-brand-primary font-semibold">Loading...</div>
        </div>
      );
    }
    
    if (!currentUser) {
      return <Navigate to="/admin/login" replace />;
    }
    
    if (currentUser.role !== UserRole.Admin) {
      return <Navigate to="/" replace />;
    }
    
    return children;
  };

  const UserProtectedRoute = ({ children, allowedRoles }: { children: React.ReactElement, allowedRoles: UserRole[] }) => {
    if (isLoading) {
      return (
        <div className="flex justify-center items-center min-h-screen bg-brand-light/20">
          <div className="text-brand-primary font-semibold">Loading...</div>
        </div>
      );
    }

    if (!currentUser) {
        return <Navigate to="/" replace />;
    }

    if (!allowedRoles.includes(currentUser.role)) {
        return <Navigate to="/" replace />;
    }

    return children;
  };


  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-brand-light/20">
        <div className="text-brand-primary font-semibold">Loading...</div>
      </div>
    );
  }

  const closeLoginModal = () => {
    setLoginModalOpen(false);
    setLoginEmail('');
  };
  
  const AdminStudentViewWrapper = () => {
    const { studentId } = useParams<{ studentId: string }>();
    if (!studentId) {
        return <Navigate to="/admin/students" replace />;
    }
    return <StudentProfileViewPage studentId={studentId} />;
  };

  const isDashboard = location.pathname.startsWith('/dashboard/') || location.pathname.startsWith('/admin/');

  return (
    <div className="flex flex-col min-h-screen bg-brand-light/20">
      {!isDashboard && (
        <Header
          currentUser={currentUser}
          onLogout={handleLogout}
          onLoginClick={() => setLoginModalOpen(true)}
        />
      )}
      <main className="flex-grow">
        <Routes>
          <Route path="/" element={<HomePage onLoginClick={() => setLoginModalOpen(true)} />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/gallery" element={<GalleryPage />} />
          <Route path="/faq" element={<FAQPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/register" element={<RegisterPage onLoginNeeded={openLoginModal} />} />
          <Route 
            path="/admin/login" 
            element={<AdminLoginPage onLoginSuccess={handleLoginSuccess} />} 
          />
          <Route path="/admin/dashboard" element={<AdminProtectedRoute><AdminDashboardPage /></AdminProtectedRoute>} />
          <Route path="/admin/students" element={<AdminProtectedRoute><StudentListPage /></AdminProtectedRoute>} />
          <Route path="/admin/student/:studentId" element={<AdminProtectedRoute><AdminStudentViewWrapper /></AdminProtectedRoute>} />
          <Route path="/admin/teachers" element={<AdminProtectedRoute><TeacherListPage /></AdminProtectedRoute>} />
          <Route path="/admin/batches" element={<AdminProtectedRoute><BatchesPage /></AdminProtectedRoute>} />
          <Route path="/admin/locations" element={<AdminProtectedRoute><LocationsManagementPage /></AdminProtectedRoute>} />
          <Route path="/admin/fees" element={<AdminProtectedRoute><FeeManagementPage /></AdminProtectedRoute>} />
          <Route path="/admin/events" element={<AdminProtectedRoute><EventsManagementPage /></AdminProtectedRoute>} />
          <Route path="/admin/grade-exams" element={<AdminProtectedRoute><GradeExamsManagementPage /></AdminProtectedRoute>} />
          <Route path="/admin/book-materials" element={<AdminProtectedRoute><BookMaterialsManagementPage /></AdminProtectedRoute>} />
          <Route path="/admin/notices" element={<AdminProtectedRoute><NoticesManagementPage /></AdminProtectedRoute>} />
          <Route path="/admin/trash" element={<AdminProtectedRoute><TrashPage /></AdminProtectedRoute>} />
          
          <Route 
            path="/dashboard/student" 
            element={
              <UserProtectedRoute allowedRoles={[UserRole.Student]}>
                <StudentDashboardPage user={currentUser!} onLogout={handleLogout} onUpdate={setCurrentUser} />
              </UserProtectedRoute>
            }
          >
            <Route index element={<StudentDashboardHomePage />} />
            <Route path="family-profile" element={<FamilyProfilePage />} />
            <Route path="courses" element={<StudentCoursesPage />} />
            <Route path="grade-exams" element={<GradeExamsPage />} />
            <Route path="book-materials" element={<BookMaterialsPage />} />
            <Route path="events" element={<EventsPage />} />
            <Route path="notices" element={<NoticesPage />} />
            <Route path="profile" element={<GuardianProfilePage />} />
            <Route path="payment-history" element={<PaymentHistoryPage />} />
            <Route path="add" element={<AddFamilyStudentPage />} />
          </Route>

          <Route
            path="/dashboard/teacher"
            element={
              <UserProtectedRoute allowedRoles={[UserRole.Teacher]}>
                <TeacherDashboardPage user={currentUser!} onLogout={handleLogout} onUpdate={setCurrentUser} />
              </UserProtectedRoute>
            }
          >
            <Route index element={<TeacherDashboardHomePage />} />
            <Route path="profile" element={<TeacherProfilePage />} />
            <Route path="courses" element={<TeacherContentPlaceholder title="Your Courses" />} />
            <Route path="book-materials" element={<TeacherContentPlaceholder title="Book Materials" />} />
            <Route path="events" element={<TeacherContentPlaceholder title="Events" />} />
            <Route path="notice" element={<TeacherContentPlaceholder title="Notice" />} />
            <Route path="payment-history" element={<TeacherContentPlaceholder title="Payment History" />} />
          </Route>

        </Routes>
      </main>
      {!isDashboard && <Footer />}
      <WhatsAppButton />

      <Modal isOpen={isLoginModalOpen} onClose={closeLoginModal}>
        <LoginForm 
          onSuccess={handleLoginSuccess} 
          initialEmail={loginEmail} 
          onForgotPassword={handleForgotPassword}
        />
      </Modal>
    </div>
  );
}

export default App;