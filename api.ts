import type { User, ContactFormData, Course, DashboardStats, Notification, Batch, FeeStructure, Invoice, PaymentDetails, StudentEnrollment, Event, GradeExam, BookMaterial, Notice, Location } from './types';

const isLocal = location.hostname === 'localhost' || location.hostname === '127.0.0.1';

const API_BASE_URL =
  ((import.meta as any).env?.VITE_API_URL || '').replace(/\/$/, '') ||
  (isLocal ? 'http://localhost:4000/api' : '/api');

const apiFetch = async (endpoint: string, options: RequestInit = {}) => {
  const config: RequestInit = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    credentials: 'include',
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, config);

  if (response.status === 401 && endpoint !== '/session' && endpoint !== '/users/check-email') {
    console.error('API request unauthorized. Session may have expired. Redirecting to home.');
    window.location.assign('/');
    return new Promise(() => {});
  }
  
  if (response.status === 204 || response.status === 205) {
    return null;
  }

  const contentType = response.headers.get('content-type') || '';
  const body = contentType.includes('application/json') ? await response.json() : await response.text();

  if (!response.ok) {
    const errorMessage = (typeof body === 'object' && body?.message) ? body.message : (typeof body === 'string' && body) ? body : `HTTP Error: ${response.status}`;
    throw new Error(errorMessage);
  }
  
  return body;
};


export const checkEmailExists = async (email: string): Promise<{ exists: boolean }> => {
  return apiFetch('/users/check-email', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
};

export const registerUser = async (userData: Partial<User>[]): Promise<any> => {
  return apiFetch('/register', {
    method: 'POST',
    body: JSON.stringify(userData),
  });
};

export const registerAdmin = async (userData: Partial<User>): Promise<any> => {
  return apiFetch('/admin/register', {
    method: 'POST',
    body: JSON.stringify(userData),
  });
};

export const loginUser = async (email: string, password: string): Promise<User> => {
  return apiFetch('/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
};

export const getCurrentUser = async (): Promise<User | null> => {
    try {
      const user = await apiFetch('/session');
      return user;
    } catch (error) {
      // It's normal to get a 401 Unauthorized if there's no session
      console.log('No active session found.');
      return null;
    }
};

export const logout = async (): Promise<void> => {
  await apiFetch('/logout', { method: 'POST' });
};

export const submitContactForm = async (data: ContactFormData): Promise<{success: boolean}> => {
  return apiFetch('/contact', {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

export const getCourses = async (): Promise<Course[]> => {
  return apiFetch('/courses');
};

export const updateUserProfile = async (userData: Partial<User>): Promise<User> => {
    return apiFetch('/profile', {
        method: 'PUT',
        body: JSON.stringify(userData),
    });
};


// --- Admin API functions ---

export const getAdminStats = async (): Promise<DashboardStats> => {
    return apiFetch('/admin/stats');
};

export const getAdminUsers = async (): Promise<User[]> => {
    return apiFetch('/admin/users');
};

export const getAdminUserById = async (userId: string): Promise<User> => {
    return apiFetch(`/admin/users/${userId}`);
};

export const addStudentByAdmin = async (userData: Partial<User>): Promise<User> => {
    return apiFetch('/admin/users', {
        method: 'POST',
        body: JSON.stringify(userData),
    });
};

export const updateUserByAdmin = async (userId: string, userData: Partial<User>): Promise<User> => {
    return apiFetch(`/admin/users/${userId}`, {
        method: 'PUT',
        body: JSON.stringify(userData),
    });
};

export const deleteUserByAdmin = async (userId: string): Promise<void> => {
    await apiFetch(`/admin/users/${userId}`, {
        method: 'DELETE',
    });
};

export const sendNotification = async (userIds: string[], subject: string, message: string): Promise<{success: boolean}> => {
    return apiFetch('/admin/notifications', {
        method: 'POST',
        body: JSON.stringify({ userIds, subject, message }),
    });
};

export const getAdminCourses = async (): Promise<Course[]> => {
    return apiFetch('/admin/courses');
};

export const addCourseByAdmin = async (courseData: Omit<Course, 'id'>): Promise<Course> => {
    return apiFetch('/admin/courses', {
        method: 'POST',
        body: JSON.stringify(courseData),
    });
};

export const updateCourseByAdmin = async (courseId: string, courseData: Partial<Omit<Course, 'id'>>): Promise<Course> => {
    return apiFetch(`/admin/courses/${courseId}`, {
        method: 'PUT',
        body: JSON.stringify(courseData),
    });
};

export const deleteCourseByAdmin = async (courseId: string): Promise<void> => {
    await apiFetch(`/admin/courses/${courseId}`, {
        method: 'DELETE',
    });
};

// --- Batch API functions ---
export const getBatches = async (): Promise<Batch[]> => {
  return apiFetch('/admin/batches');
};

export const addBatch = async (batchData: Partial<Batch>): Promise<Batch> => {
    return apiFetch('/admin/batches', {
        method: 'POST',
        body: JSON.stringify(batchData),
    });
};

export const updateBatch = async (batchId: string, batchData: Partial<Batch>): Promise<Batch> => {
    return apiFetch(`/admin/batches/${batchId}`, {
        method: 'PUT',
        body: JSON.stringify(batchData),
    });
};

export const deleteBatch = async (batchId: string): Promise<void> => {
    await apiFetch(`/admin/batches/${batchId}`, {
        method: 'DELETE',
    });
};


// --- User Notification API functions ---
export const getNotifications = async (): Promise<Notification[]> => {
    return apiFetch('/notifications');
};

export const markNotificationAsRead = async (notificationId: string): Promise<Notification> => {
    return apiFetch(`/notifications/${notificationId}/read`, {
        method: 'PUT',
    });
};

// --- Fee Management API functions ---

// Fee Structures
export const getFeeStructures = async (): Promise<FeeStructure[]> => {
  return apiFetch('/admin/feestructures');
};

export const addFeeStructure = async (structureData: Omit<FeeStructure, 'id'>): Promise<FeeStructure> => {
  return apiFetch('/admin/feestructures', {
    method: 'POST',
    body: JSON.stringify(structureData),
  });
};

export const updateFeeStructure = async (structureId: string, structureData: Partial<FeeStructure>): Promise<FeeStructure> => {
  return apiFetch(`/admin/feestructures/${structureId}`, {
    method: 'PUT',
    body: JSON.stringify(structureData),
  });
};

export const deleteFeeStructure = async (structureId: string): Promise<void> => {
  await apiFetch(`/admin/feestructures/${structureId}`, {
    method: 'DELETE',
  });
};

// Invoices (Admin)
export const getAdminInvoices = async (): Promise<Invoice[]> => {
    return apiFetch('/admin/invoices');
};

export const generateInvoices = async (): Promise<{ message: string }> => {
    return apiFetch('/admin/invoices/generate', {
        method: 'POST',
    });
};

export const recordPayment = async (invoiceId: string, paymentData: PaymentDetails): Promise<Invoice> => {
    return apiFetch(`/admin/invoices/${invoiceId}/pay`, {
        method: 'PUT',
        body: JSON.stringify(paymentData),
    });
};

// --- Student-specific API Functions ---
export const getStudentInvoices = async (): Promise<Invoice[]> => {
    return apiFetch('/invoices');
};

export const getStudentEnrollments = async (): Promise<StudentEnrollment[]> => {
    return apiFetch('/student/enrollments');
};

// --- Family / Multi-Student API Functions ---
export const getFamilyStudents = async (): Promise<User[]> => {
  return apiFetch('/family/students');
};

export const getStudentInvoicesForFamily = async (studentId: string): Promise<Invoice[]> => {
    return apiFetch(`/family/students/${studentId}/invoices`);
};

export const getStudentEnrollmentsForFamily = async (studentId: string): Promise<StudentEnrollment[]> => {
    return apiFetch(`/family/students/${studentId}/enrollments`);
};

// --- Trash API Functions ---
export const getTrashedUsers = async (): Promise<User[]> => {
    return apiFetch('/admin/trash');
};

export const restoreUser = async (userId: string): Promise<User> => {
    return apiFetch(`/admin/trash/${userId}/restore`, {
        method: 'PUT',
    });
};

export const deleteUserPermanently = async (userId: string): Promise<void> => {
    await apiFetch(`/admin/users/${userId}/permanent`, {
        method: 'DELETE',
    });
};

// --- Location Management API Functions ---
// Public route for registration page
export const getPublicLocations = async (): Promise<Location[]> => apiFetch('/locations');
// Admin routes
export const getLocations = async (): Promise<Location[]> => apiFetch('/admin/locations');
export const addLocation = async (location: Omit<Location, 'id'>): Promise<Location> => apiFetch('/admin/locations', { method: 'POST', body: JSON.stringify(location) });
export const updateLocation = async (id: string, location: Partial<Location>): Promise<Location> => apiFetch(`/admin/locations/${id}`, { method: 'PUT', body: JSON.stringify(location) });
export const deleteLocation = async (id: string): Promise<void> => apiFetch(`/admin/locations/${id}`, { method: 'DELETE' });

// --- New Content Management API Functions ---

// Events
export const getEvents = async (): Promise<Event[]> => apiFetch('/events');
export const getAdminEvents = async (): Promise<Event[]> => apiFetch('/admin/events');
export const addEvent = async (event: Omit<Event, 'id'>): Promise<Event> => apiFetch('/admin/events', { method: 'POST', body: JSON.stringify(event) });
export const updateEvent = async (id: string, event: Partial<Event>): Promise<Event> => apiFetch(`/admin/events/${id}`, { method: 'PUT', body: JSON.stringify(event) });
export const deleteEvent = async (id: string): Promise<void> => apiFetch(`/admin/events/${id}`, { method: 'DELETE' });

// Grade Exams
export const getGradeExams = async (): Promise<GradeExam[]> => apiFetch('/grade-exams');
export const getAdminGradeExams = async (): Promise<GradeExam[]> => apiFetch('/admin/grade-exams');
export const addGradeExam = async (exam: Omit<GradeExam, 'id'>): Promise<GradeExam> => apiFetch('/admin/grade-exams', { method: 'POST', body: JSON.stringify(exam) });
export const updateGradeExam = async (id: string, exam: Partial<GradeExam>): Promise<GradeExam> => apiFetch(`/admin/grade-exams/${id}`, { method: 'PUT', body: JSON.stringify(exam) });
export const deleteGradeExam = async (id: string): Promise<void> => apiFetch(`/admin/grade-exams/${id}`, { method: 'DELETE' });

// Book Materials
export const getBookMaterials = async (): Promise<BookMaterial[]> => apiFetch('/book-materials');
export const getAdminBookMaterials = async (): Promise<BookMaterial[]> => apiFetch('/admin/book-materials');
export const addBookMaterial = async (material: Omit<BookMaterial, 'id'>): Promise<BookMaterial> => apiFetch('/admin/book-materials', { method: 'POST', body: JSON.stringify(material) });
export const updateBookMaterial = async (id: string, material: Partial<BookMaterial>): Promise<BookMaterial> => apiFetch(`/admin/book-materials/${id}`, { method: 'PUT', body: JSON.stringify(material) });
export const deleteBookMaterial = async (id: string): Promise<void> => apiFetch(`/admin/book-materials/${id}`, { method: 'DELETE' });

// Notices
export const getNotices = async (): Promise<Notice[]> => apiFetch('/notices');
export const getAdminNotices = async (): Promise<Notice[]> => apiFetch('/admin/notices');
export const addNotice = async (notice: Omit<Notice, 'id'>): Promise<Notice> => apiFetch('/admin/notices', { method: 'POST', body: JSON.stringify(notice) });
export const updateNotice = async (id: string, notice: Partial<Notice>): Promise<Notice> => apiFetch(`/admin/notices/${id}`, { method: 'PUT', body: JSON.stringify(notice) });
export const deleteNotice = async (id: string): Promise<void> => apiFetch(`/admin/notices/${id}`, { method: 'DELETE' });

// New combined content notification function
export const sendContentNotification = async (payload: {
  contentId: string;
  contentType: string;
  userIds: string[];
  subject: string;
  message: string;
  sendWhatsApp?: boolean;
}): Promise<{ success: boolean; message: string }> => {
  return apiFetch('/admin/content/send', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
};