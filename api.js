// Client-side API functions
const isLocal = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

const API_BASE_URL = (() => {
  if (typeof window === 'undefined') return '';
  const envUrl = window.VITE_API_URL;
  if (envUrl && typeof envUrl === 'string') {
    return envUrl.replace(/\/$/, '');
  }
  return isLocal ? 'http://localhost:4000/api' : '/api';
})();

const apiFetch = async (endpoint, options = {}) => {
  const config = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    credentials: 'include',
    signal: AbortSignal.timeout(30000), // 30 second timeout
  };

  console.log('API Request:', `${API_BASE_URL}${endpoint}`, config);
  const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
  console.log('API Response status:', response.status);

  if (response.status === 401 && endpoint !== '/session' && endpoint !== '/users/check-email') {
    console.error('API request unauthorized. Session may have expired. Redirecting to home.');
    if (typeof window !== 'undefined') {
      window.location.assign('/');
    }
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

// Export functions for frontend
export const checkEmailExists = async (email) => {
  return apiFetch('/users/check-email', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
};

export const registerUser = async (userData) => {
  return apiFetch('/register', {
    method: 'POST',
    body: JSON.stringify(userData),
  });
};

export const registerAdmin = async (userData) => {
  return apiFetch('/admin/register', {
    method: 'POST',
    body: JSON.stringify(userData),
  });
};

export const loginUser = async (email, password) => {
  return apiFetch('/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
};

export const getCurrentUser = async () => {
  try {
    console.log('Fetching current user from:', API_BASE_URL + '/session');
    const user = await apiFetch('/session');
    console.log('User response:', user);
    return user;
  } catch (error) {
    console.error('getCurrentUser error:', error);
    return null;
  }
};

export const logout = async () => {
  await apiFetch('/logout', { method: 'POST' });
};

export const submitContactForm = async (data) => {
  return apiFetch('/contact', {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

export const getCourses = async () => {
  return apiFetch('/courses');
};

export const updateUserProfile = async (userData) => {
  return apiFetch('/profile', {
    method: 'PUT',
    body: JSON.stringify(userData),
  });
};

// Admin functions
export const getAdminStats = async () => {
  return apiFetch('/admin/stats');
};

export const getAdminUsers = async () => {
  return apiFetch('/admin/users');
};

export const getAdminUserById = async (userId) => {
  return apiFetch(`/admin/users/${userId}`);
};

export const addStudentByAdmin = async (userData) => {
  return apiFetch('/admin/users', {
    method: 'POST',
    body: JSON.stringify(userData),
  });
};

export const updateUserByAdmin = async (userId, userData) => {
  return apiFetch(`/admin/users/${userId}`, {
    method: 'PUT',
    body: JSON.stringify(userData),
  });
};

export const deleteUserByAdmin = async (userId) => {
  await apiFetch(`/admin/users/${userId}`, {
    method: 'DELETE',
  });
};

export const sendNotification = async (userIds, subject, message) => {
  return apiFetch('/admin/notifications', {
    method: 'POST',
    body: JSON.stringify({ userIds, subject, message }),
  });
};

export const getAdminCourses = async () => {
  return apiFetch('/admin/courses');
};

export const addCourseByAdmin = async (courseData) => {
  return apiFetch('/admin/courses', {
    method: 'POST',
    body: JSON.stringify(courseData),
  });
};

export const updateCourseByAdmin = async (courseId, courseData) => {
  return apiFetch(`/admin/courses/${courseId}`, {
    method: 'PUT',
    body: JSON.stringify(courseData),
  });
};

export const deleteCourseByAdmin = async (courseId) => {
  await apiFetch(`/admin/courses/${courseId}`, {
    method: 'DELETE',
  });
};

// Batch functions
export const getBatches = async () => {
  return apiFetch('/admin/batches');
};

export const addBatch = async (batchData) => {
  return apiFetch('/admin/batches', {
    method: 'POST',
    body: JSON.stringify(batchData),
  });
};

export const updateBatch = async (batchId, batchData) => {
  return apiFetch(`/admin/batches/${batchId}`, {
    method: 'PUT',
    body: JSON.stringify(batchData),
  });
};

export const deleteBatch = async (batchId) => {
  await apiFetch(`/admin/batches/${batchId}`, {
    method: 'DELETE',
  });
};

// Notification functions
export const getNotifications = async () => {
  return apiFetch('/notifications');
};

export const markNotificationAsRead = async (notificationId) => {
  return apiFetch(`/notifications/${notificationId}/read`, {
    method: 'PUT',
  });
};

// Fee Management functions
export const getFeeStructures = async () => {
  return apiFetch('/admin/feestructures');
};

export const addFeeStructure = async (structureData) => {
  return apiFetch('/admin/feestructures', {
    method: 'POST',
    body: JSON.stringify(structureData),
  });
};

export const updateFeeStructure = async (structureId, structureData) => {
  return apiFetch(`/admin/feestructures/${structureId}`, {
    method: 'PUT',
    body: JSON.stringify(structureData),
  });
};

export const deleteFeeStructure = async (structureId) => {
  await apiFetch(`/admin/feestructures/${structureId}`, {
    method: 'DELETE',
  });
};

export const getAdminInvoices = async () => {
  return apiFetch('/admin/invoices');
};

export const generateInvoices = async () => {
  return apiFetch('/admin/invoices/generate', {
    method: 'POST',
  });
};

export const recordPayment = async (invoiceId, paymentData) => {
  return apiFetch(`/admin/invoices/${invoiceId}/pay`, {
    method: 'PUT',
    body: JSON.stringify(paymentData),
  });
};

// Student functions
export const getStudentInvoices = async () => {
  return apiFetch('/invoices');
};

export const getStudentEnrollments = async () => {
  return apiFetch('/student/enrollments');
};

// Family functions
export const getFamilyStudents = async () => {
  return apiFetch('/family/students');
};

export const getStudentInvoicesForFamily = async (studentId) => {
  return apiFetch(`/family/students/${studentId}/invoices`);
};

export const getStudentEnrollmentsForFamily = async (studentId) => {
  return apiFetch(`/family/students/${studentId}/enrollments`);
};

// Trash functions
export const getTrashedUsers = async () => {
  return apiFetch('/admin/trash');
};

export const restoreUser = async (userId) => {
  return apiFetch(`/admin/trash/${userId}/restore`, {
    method: 'PUT',
  });
};

export const deleteUserPermanently = async (userId) => {
  await apiFetch(`/admin/users/${userId}/permanent`, {
    method: 'DELETE',
  });
};

// Location functions
export const getPublicLocations = async () => apiFetch('/locations');
export const getLocations = async () => apiFetch('/admin/locations');
export const addLocation = async (location) => apiFetch('/admin/locations', { method: 'POST', body: JSON.stringify(location) });
export const updateLocation = async (id, location) => apiFetch(`/admin/locations/${id}`, { method: 'PUT', body: JSON.stringify(location) });
export const deleteLocation = async (id) => apiFetch(`/admin/locations/${id}`, { method: 'DELETE' });

// Content functions
export const getEvents = async () => apiFetch('/events');
export const getAdminEvents = async () => apiFetch('/admin/events');
export const addEvent = async (event) => apiFetch('/admin/events', { method: 'POST', body: JSON.stringify(event) });
export const updateEvent = async (id, event) => apiFetch(`/admin/events/${id}`, { method: 'PUT', body: JSON.stringify(event) });
export const deleteEvent = async (id) => apiFetch(`/admin/events/${id}`, { method: 'DELETE' });

export const getGradeExams = async () => apiFetch('/grade-exams');
export const getAdminGradeExams = async () => apiFetch('/admin/grade-exams');
export const addGradeExam = async (exam) => apiFetch('/admin/grade-exams', { method: 'POST', body: JSON.stringify(exam) });
export const updateGradeExam = async (id, exam) => apiFetch(`/admin/grade-exams/${id}`, { method: 'PUT', body: JSON.stringify(exam) });
export const deleteGradeExam = async (id) => apiFetch(`/admin/grade-exams/${id}`, { method: 'DELETE' });

export const getBookMaterials = async () => apiFetch('/book-materials');
export const getAdminBookMaterials = async () => apiFetch('/admin/book-materials');
export const addBookMaterial = async (material) => apiFetch('/admin/book-materials', { method: 'POST', body: JSON.stringify(material) });
export const updateBookMaterial = async (id, material) => apiFetch(`/admin/book-materials/${id}`, { method: 'PUT', body: JSON.stringify(material) });
export const deleteBookMaterial = async (id) => apiFetch(`/admin/book-materials/${id}`, { method: 'DELETE' });

export const getNotices = async () => apiFetch('/notices');
export const getAdminNotices = async () => apiFetch('/admin/notices');
export const addNotice = async (notice) => apiFetch('/admin/notices', { method: 'POST', body: JSON.stringify(notice) });
export const updateNotice = async (id, notice) => apiFetch(`/admin/notices/${id}`, { method: 'PUT', body: JSON.stringify(notice) });
export const deleteNotice = async (id) => apiFetch(`/admin/notices/${id}`, { method: 'DELETE' });

export const sendContentNotification = async (payload) => {
  return apiFetch('/admin/content/send', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
};