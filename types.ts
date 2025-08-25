
export interface Slide {
  image: string;
  title: string;
  subtitle: string;
}

export interface Testimonial {
  quote: string;
  author: string;
  relation: string;
  image: string;
}

export interface FAQItem {
  question: string;
  answer: string;
}

export interface Notification {
    id: string;
    userId: string;
    subject: string;
    message: string;
    read: boolean;
    createdAt: string;
    link?: string;
}

export enum UserRole {
  Student = 'Student',
  Teacher = 'Teacher',
  Admin = 'Admin',
}

export enum ClassPreference {
  Online = 'Online',
  Offline = 'Offline',
  Hybrid = 'Hybrid', // Added for teachers
}

export enum Sex {
    Male = 'Male',
    Female = 'Female',
    Other = 'Other',
}

export enum EmploymentType {
    PartTime = 'Part-time',
    FullTime = 'Full-time',
}

export enum Grade {
    Grade1 = 'Grade 1',
    Grade2 = 'Grade 2',
    Grade3 = 'Grade 3',
}

export interface Document {
  name: string;
  mimeType: string;
  data: string; // base64
}

export enum UserStatus {
    Active = 'Active',
    Inactive = 'Inactive',
    OnHold = 'On Hold',
    Graduated = 'Graduated',
}

export interface Location {
  id: string;
  name: string;
  address: string;
}


export interface User {
  id: string;
  name: string;
  email: string;
  password?: string; // In a real app, this should be a secure hash. Optional on client.
  role: UserRole;
  classPreference?: ClassPreference; 
  
  // Common fields
  photoUrl?: string; // base64 or URL
  dob?: string; // ISO string date
  sex?: Sex;
  contactNumber?: string;
  alternateContactNumber?: string;
  address?: string;
  schedules?: { course: string, timing: string, teacherId?: string }[];
  documents?: Document[];
  dateOfJoining?: string;
  country?: string;
  state?: string;
  city?: string;
  postalCode?: string;
  timezone?: string;
  preferredTimings?: string[];
  status?: UserStatus;
  locationId?: string; // For offline preference
  location?: Location; // Populated field

  // Student specific
  courses?: string[];
  fatherName?: string;
  standard?: string;
  schoolName?: string;
  grade?: Grade;
  notes?: string;
  
  // Teacher specific
  courseExpertise?: string[];
  educationalQualifications?: string;
  employmentType?: EmploymentType;
  yearsOfExperience?: number;
  availableTimeSlots?: string[];

  // Soft delete fields
  isDeleted?: boolean;
  deletedAt?: string;
}


export interface ContactFormData {
    name: string;
    email: string;
    message: string;
}

export interface Course {
  id: string;
  name:string;
  description: string;
  icon: string;
}

export interface DashboardStats {
  totalUsers: number;
  studentCount: number;
  teacherCount: number;
  onlinePreference: number;
  offlinePreference: number;
}

export interface BatchSchedule {
  timing: string;
  studentIds: string[];
}

export interface Batch {
  id: string;
  name: string;
  description: string;
  courseId: string;
  courseName: string;
  teacherId?: Partial<User> | string; // Can be string or populated object
  schedule: BatchSchedule[];
  mode?: ClassPreference.Online | ClassPreference.Offline;
  locationId?: string;
  location?: Location; // Populated field
}

// --- Student Enrollment Type ---
export interface StudentEnrollment {
    batchName: string;
    courseName: string;
    timings: string[];
    teacher: { id: string; name: string } | null;
    mode?: ClassPreference.Online | ClassPreference.Offline;
    location?: Location;
}

// --- Fee Management Types ---

export enum BillingCycle {
    Monthly = 'Monthly',
    Quarterly = 'Quarterly',
    Annually = 'Annually',
}

export enum Currency {
    INR = 'INR',
    USD = 'USD',
}

export interface FeeStructure {
    id: string;
    courseId: string;
    courseName: string;
    amount: number;
    currency: Currency;
    billingCycle: BillingCycle;
}

export enum InvoiceStatus {
    Pending = 'Pending',
    Paid = 'Paid',
    Overdue = 'Overdue',
}

export enum PaymentMethod {
    Cash = 'Cash',
    BankTransfer = 'Bank Transfer',
    UPI = 'UPI',
    Card = 'Card',
}

export interface PaymentDetails {
    paymentDate: string;
    amountPaid: number;
    paymentMethod: PaymentMethod;
    referenceNumber?: string;
    notes?: string;
}

export interface Invoice {
    id: string;
    studentId: string;
    feeStructureId: string;
    courseName: string;
    amount: number;
    currency: string;
    issueDate: string;
    dueDate: string;
    billingPeriod: string;
    status: InvoiceStatus;
    paymentDetails?: PaymentDetails;
    // populated fields for display
    student?: Pick<User, 'id' | 'name' | 'email'>;
}

// --- New Content Types ---

export interface Event {
  id: string;
  title: string;
  description: string;
  date: string; // ISO string
  location: string;
  isOnline: boolean;
  recipientIds?: string[];
}

export enum BookMaterialType {
    PDF = 'PDF',
    Video = 'Video',
    YouTube = 'YouTube',
}

export interface BookMaterial {
  id: string;
  title:string;
  description: string;
  courseId: string;
  courseName: string;
  type: BookMaterialType;
  url: string; // URL for youtube or stored video, or data URI for PDF
  data?: string; // For base64 pdf data
  recipientIds?: string[];
}

export interface GradeExam {
  id: string;
  title: string;
  description: string;
  examDate: string; // ISO string
  registrationDeadline: string; // ISO string
  syllabusLink?: string;
  recipientIds?: string[];
}

export interface Notice {
  id: string;
  title: string;
  content: string;
  issuedAt: string; // ISO string
  recipientIds?: string[];
}
