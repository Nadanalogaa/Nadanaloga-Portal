// server/server.js  (CommonJS)

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const serverless = require('serverless-http');
const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');

// Load environment variables
dotenv.config();

const PORT = process.env.PORT || 4000;
const app = express();

const COOKIE_NAME = 'nadanaloga_session';
const JWT_SECRET = process.env.SESSION_SECRET || 'a-very-super-secret-key-for-dev';
if (process.env.NODE_ENV === 'production' && JWT_SECRET === 'a-very-super-secret-key-for-dev') {
    console.warn('WARNING: Using default JWT_SECRET in production. Please set SESSION_SECRET environment variable.');
}

/* =========================
   Schemas & Models
   ========================= */

const locationSchema = new mongoose.Schema({
  name: { type: String, required: true },
  address: { type: String, required: true, unique: true },
});
locationSchema.virtual('id').get(function () { return this._id.toHexString(); });
locationSchema.set('toJSON', { virtuals: true, transform: (doc, ret) => { delete ret._id; delete ret.__v; } });
const Location = mongoose.model('Location', locationSchema);

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, required: true, enum: ['Student', 'Teacher', 'Admin'] },
  classPreference: { type: String, enum: ['Online', 'Offline', 'Hybrid'] },
  photoUrl: { type: String },
  dob: { type: String },
  sex: { type: String, enum: ['Male', 'Female', 'Other'] },
  contactNumber: { type: String },
  alternateContactNumber: { type: String },
  address: { type: String },
  schedules: { type: [{ course: String, timing: String, teacherId: String, _id: false }] },
  documents: { type: [{ name: String, mimeType: String, data: String, _id: false }] },
  dateOfJoining: { type: String },
  country: { type: String },
  state: { type: String },
  city: { type: String },
  postalCode: { type: String },
  timezone: { type: String },
  preferredTimings: { type: [String] },
  status: { type: String, enum: ['Active', 'Inactive', 'On Hold', 'Graduated'], default: 'Active' },
  locationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Location' },
  // Student
  courses: { type: [String] },
  fatherName: { type: String },
  standard: { type: String },
  schoolName: { type: String },
  grade: { type: String, enum: ['Grade 1', 'Grade 2', 'Grade 3'] },
  notes: { type: String },
  // Teacher
  courseExpertise: { type: [String] },
  educationalQualifications: { type: String },
  employmentType: { type: String, enum: ['Part-time', 'Full-time'] },
  yearsOfExperience: { type: Number },
  availableTimeSlots: { type: [String] },
  // Soft delete
  isDeleted: { type: Boolean, default: false },
  deletedAt: { type: Date, default: null },
});
userSchema.virtual('id').get(function () { return this._id.toHexString(); });
userSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    delete ret._id; delete ret.__v;
    if (ret.locationId) { ret.location = ret.locationId; delete ret.locationId; }
  }
});
const User = mongoose.model('User', userSchema);

const contactSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  message: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});
const Contact = mongoose.model('Contact', contactSchema);

const courseSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, required: true },
  icon: { type: String, required: true }
});
courseSchema.virtual('id').get(function () { return this._id.toHexString(); });
courseSchema.set('toJSON', { virtuals: true, transform: (doc, ret) => { delete ret._id; delete ret.__v; } });
const Course = mongoose.model('Course', courseSchema);

const notificationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  subject: { type: String, required: true },
  message: { type: String, required: true },
  read: { type: Boolean, default: false },
  link: { type: String },
  createdAt: { type: Date, default: Date.now }
});
notificationSchema.virtual('id').get(function () { return this._id.toHexString(); });
notificationSchema.set('toJSON', { virtuals: true, transform: (doc, ret) => { delete ret._id; delete ret.__v; } });
const Notification = mongoose.model('Notification', notificationSchema);

const batchScheduleSchema = new mongoose.Schema({
  timing: { type: String, required: true },
  studentIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
}, { _id: false });

const batchSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String },
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  courseName: { type: String, required: true },
  teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  schedule: [batchScheduleSchema],
  mode: { type: String, enum: ['Online', 'Offline'] },
  locationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Location' },
});
batchSchema.virtual('id').get(function () { return this._id.toHexString(); });
batchSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    delete ret._id; delete ret.__v;
    if (ret.locationId) { ret.location = ret.locationId; delete ret.locationId; }
  }
});
const Batch = mongoose.model('Batch', batchSchema);

// --- Fee Management ---
const feeStructureSchema = new mongoose.Schema({
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true, unique: true },
  courseName: { type: String, required: true },
  amount: { type: Number, required: true },
  currency: { type: String, required: true, enum: ['INR', 'USD'] },
  billingCycle: { type: String, required: true, enum: ['Monthly', 'Quarterly', 'Annually'] },
});
feeStructureSchema.virtual('id').get(function () { return this._id.toHexString(); });
feeStructureSchema.set('toJSON', { virtuals: true, transform: (doc, ret) => { delete ret._id; delete ret.__v; } });
const FeeStructure = mongoose.model('FeeStructure', feeStructureSchema);

const paymentDetailsSchema = new mongoose.Schema({
  paymentDate: { type: Date, required: true },
  amountPaid: { type: Number, required: true },
  paymentMethod: { type: String, required: true, enum: ['Cash', 'Bank Transfer', 'UPI', 'Card'] },
  referenceNumber: { type: String },
  notes: { type: String },
}, { _id: false });

const invoiceSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  feeStructureId: { type: mongoose.Schema.Types.ObjectId, ref: 'FeeStructure', required: true },
  courseName: { type: String, required: true },
  amount: { type: Number, required: true },
  currency: { type: String, required: true },
  issueDate: { type: Date, required: true },
  dueDate: { type: Date, required: true },
  billingPeriod: { type: String, required: true },
  status: { type: String, required: true, enum: ['Pending', 'Paid', 'Overdue'], default: 'Pending' },
  paymentDetails: paymentDetailsSchema,
});
invoiceSchema.virtual('id').get(function () { return this._id.toHexString(); });
invoiceSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    delete ret._id; delete ret.__v;
    if (ret.studentId && typeof ret.studentId === 'object') {
      ret.student = {
        id: ret.studentId.id,
        name: ret.studentId.name,
        email: ret.studentId.email,
      };
      delete ret.studentId;
    }
  }
});
const Invoice = mongoose.model('Invoice', invoiceSchema);

// --- Content ---
const eventSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  date: { type: Date, required: true },
  location: { type: String, required: true },
  isOnline: { type: Boolean, default: false },
  recipientIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
});
eventSchema.virtual('id').get(function () { return this._id.toHexString(); });
eventSchema.set('toJSON', { virtuals: true, transform: (doc, ret) => { delete ret._id; delete ret.__v; } });
const Event = mongoose.model('Event', eventSchema);

const gradeExamSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  examDate: { type: Date, required: true },
  registrationDeadline: { type: Date, required: true },
  syllabusLink: { type: String },
  recipientIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
});
gradeExamSchema.virtual('id').get(function () { return this._id.toHexString(); });
gradeExamSchema.set('toJSON', { virtuals: true, transform: (doc, ret) => { delete ret._id; delete ret.__v; } });
const GradeExam = mongoose.model('GradeExam', gradeExamSchema);

const bookMaterialSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  courseName: { type: String, required: true },
  type: { type: String, required: true, enum: ['PDF', 'Video', 'YouTube'] },
  url: { type: String, required: true },
  data: { type: String },
  recipientIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
});
bookMaterialSchema.virtual('id').get(function () { return this._id.toHexString(); });
bookMaterialSchema.set('toJSON', { virtuals: true, transform: (doc, ret) => { delete ret._id; delete ret.__v; } });
const BookMaterial = mongoose.model('BookMaterial', bookMaterialSchema);

const noticeSchema = new mongoose.Schema({
  title: { type: String, required: true },
  content: { type: String, required: true },
  issuedAt: { type: Date, default: Date.now },
  recipientIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
});
noticeSchema.virtual('id').get(function () { return this._id.toHexString(); });
noticeSchema.set('toJSON', { virtuals: true, transform: (doc, ret) => { delete ret._id; delete ret.__v; } });
const Notice = mongoose.model('Notice', noticeSchema);

/* =========================
   Setup (DB + Mail)
   ========================= */

let mailTransporter;
let isEtherealMode = false;

async function setupAndConnect() {
  console.log(`[Server] Node environment (NODE_ENV): ${process.env.NODE_ENV || 'not set (defaults to development)'}`);

  // Seed courses with timeout
  const seedCourses = async () => {
    try {
      // Add timeout to seeding
      const seedTimeout = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Seeding timeout')), 3000)
      );
      
      const seedOperation = async () => {
        const courseCount = await Course.countDocuments();
        if (courseCount === 0) {
          console.log('[DB] No courses found. Seeding initial courses...');
          const initialCourses = [
            { name: 'Bharatanatyam', description: 'Explore the grace and storytelling of classical Indian dance.', icon: 'Bharatanatyam' },
            { name: 'Vocal', description: 'Develop your singing voice with professional training techniques.', icon: 'Vocal' },
            { name: 'Drawing', description: 'Learn to express your creativity through sketching and painting.', icon: 'Drawing' },
            { name: 'Abacus', description: 'Enhance mental math skills and concentration with our abacus program.', icon: 'Abacus' }
          ];
          await Course.insertMany(initialCourses);
          console.log('[DB] Courses seeded successfully.');
        }
      };
      
      await Promise.race([seedOperation(), seedTimeout]);
    } catch (error) {
      console.error('[DB] Error seeding courses:', error.message);
      // Don't throw - continue without seeding
    }
  };

  // Mailer - simplified for serverless
  try {
    if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
      isEtherealMode = true;
      console.log('[Email] No SMTP config - using test mode');
      // Skip ethereal account creation in serverless to avoid timeouts
      mailTransporter = null;
    } else {
      console.log('[Email] Configuring SMTP...');
      mailTransporter = nodemailer.createTransporter({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587', 10),
        secure: parseInt(process.env.SMTP_PORT || '587', 10) === 465,
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      });
      console.log('[Email] SMTP transporter created');
    }
  } catch (error) {
    console.error('[Email] Configuration failed:', error.message);
    mailTransporter = null;
  }

  // Mongo
  try {
    if (!process.env.MONGO_URI) {
      throw new Error('MONGO_URI is not defined.');
    }
    
    // Check if already connected
    if (mongoose.connection.readyState === 1) {
      console.log('[DB] MongoDB already connected.');
      return;
    }
    
    const dbName = process.env.MONGO_DB || undefined;
    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 8000,
      socketTimeoutMS: 10000,
      connectTimeoutMS: 10000,
      maxPoolSize: 5,
      minPoolSize: 0,
      maxIdleTimeMS: 10000,
      dbName,
      bufferCommands: false,
      bufferMaxEntries: 0,
    });
    console.log('[DB] MongoDB connected successfully.');
  } catch (err) {
    console.error('\n--- 🚨 DATABASE CONNECTION FAILED ---');
    console.error(`[DB] Error: ${err.message}`);
    throw err;
  }
}

// Create a single promise for the main setup (DB connection, mailer).
// This runs once per container instance, during the init phase.
let setupPromise = null;
let isSetupComplete = false;

const ensureSetup = async () => {
  if (isSetupComplete) return;
  if (!setupPromise) {
    setupPromise = Promise.race([
      setupAndConnect().then(() => {
        isSetupComplete = true;
      }),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Overall setup timeout')), 15000)
      )
    ]);
  }
  await setupPromise;
};

/* =========================
   Helpers & Middleware
   ========================= */

const createEmailTemplate = (name, subject, message) => {
  const year = new Date().getFullYear();
  const logoUrl = 'https://i.ibb.co/9v0Gk5v/nadanaloga-logo-email.png';
  const brandColorDark = '#333333';
  const backgroundColor = '#f4f5f7';
  const contentBackgroundColor = '#ffffff';
  const primaryTextColor = '#333333';
  const secondaryTextColor = '#555555';
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;700&display=swap" rel="stylesheet">
<style>body{margin:0;padding:0;word-spacing:normal;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%}table,td,div,h1,p{font-family:'Poppins',Arial,sans-serif}</style>
</head>
<body style="margin:0;padding:0;background-color:${backgroundColor};">
<table role="presentation" style="width:100%;border-collapse:collapse;border:0;border-spacing:0;">
<tr><td align="center" style="padding:20px;">
<table role="presentation" style="max-width:602px;width:100%;border-collapse:collapse;border:1px solid #cccccc;border-spacing:0;text-align:left;background:${contentBackgroundColor};border-radius:8px;overflow:hidden;">
<tr><td align="center" style="padding:25px 0;border-bottom:1px solid #eeeeee;">
<img src="${logoUrl}" alt="Nadanaloga Logo" width="250" style="height:auto;display:block;" />
</td></tr>
<tr><td style="padding:36px 30px 42px 30px;">
<table role="presentation" style="width:100%;border-collapse:collapse;border:0;border-spacing:0;">
<tr><td style="padding:0 0 20px 0;"><h1 style="font-size:24px;margin:0;font-weight:700;color:${primaryTextColor};">${subject}</h1></td></tr>
<tr><td style="padding:0;">
<p style="margin:0 0 12px 0;font-size:16px;line-height:24px;color:${secondaryTextColor};">Dear ${name},</p>
<div style="font-size:16px;line-height:24px;color:${secondaryTextColor};">${String(message).replace(/\n/g, '<br>')}</div>
</td></tr>
<tr><td style="padding:30px 0 0 0;">
<p style="margin:0;font-size:16px;line-height:24px;color:${secondaryTextColor};">Sincerely,</p>
<p style="margin:0;font-size:16px;line-height:24px;color:${secondaryTextColor};">The Nadanaloga Team</p>
</td></tr>
</table>
</td></tr>
<tr><td style="padding:30px;background:${brandColorDark};">
<table role="presentation" style="width:100%;border-collapse:collapse;border:0;border-spacing:0;font-size:14px;color:#ffffff;">
<tr>
<td style="padding:0;width:50%;" align="left"><p style="margin:0;">&copy; ${year} Nadanaloga.com</p></td>
<td style="padding:0;width:50%;" align="right"><p style="margin:0;">contact@nadanaloga.com</p></td>
</tr>
</table>
</td></tr>
</table>
</td></tr>
</table>
</body></html>`;
};

app.set('etag', false);
app.disable('x-powered-by');
app.set('trust proxy', 1);

app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ limit: '100mb', extended: true }));
app.use(cookieParser());

const whitelist = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:5500',
  'http://127.0.0.1:5500',
  'https://nadanaloga-portal.vercel.app'
];
if (process.env.CLIENT_URL) whitelist.push(process.env.CLIENT_URL);

const vercelRegex = /^https?:\/\/[a-z0-9-]+\.vercel\.app$/i;

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || whitelist.includes(origin) || vercelRegex.test(origin) || /^https?:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin)) {
      return callback(null, true);
    }
    callback(new Error('The CORS policy for this site does not allow access from the specified Origin.'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// Health check endpoints (bypass middleware)
app.get(['/api/health', '/health'], (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    dbState: mongoose.connection.readyState,
    environment: process.env.NODE_ENV || 'development',
    mongoUri: process.env.MONGO_URI ? 'configured' : 'missing'
  });
});

app.get(['/api/ping', '/ping'], (req, res) => {
  res.json({ pong: true, timestamp: new Date().toISOString() });
});

// Lightweight database check (non-blocking)
app.use(async (req, res, next) => {
  // Only ensure setup for database routes, skip for static files
  if (req.path.startsWith('/api/') && req.path !== '/api/health' && req.path !== '/api/ping') {
    try {
      // Quick connection check without full setup
      if (mongoose.connection.readyState !== 1) {
        if (!process.env.MONGO_URI) {
          return res.status(500).json({ message: 'Database not configured' });
        }
        // Try to connect with minimal timeout
        if (mongoose.connection.readyState === 0) {
          await mongoose.connect(process.env.MONGO_URI, {
            serverSelectionTimeoutMS: 5000,
            connectTimeoutMS: 5000,
            socketTimeoutMS: 5000,
            maxPoolSize: 3,
            minPoolSize: 0,
            bufferCommands: false,
            bufferMaxEntries: 0,
          });
        }
      }
    } catch (error) {
      console.error('[DB] Quick connect failed:', error.message);
      return res.status(500).json({ message: 'Database connection failed: ' + error.message });
    }
  }
  next();
});

// Serve static only in local / non-serverless usage
if (process.env.NODE_ENV !== 'production') {
  const distDir = path.join(__dirname, '../dist');
  if (fs.existsSync(distDir)) {
    app.use(express.static(distDir));
  }
}

/* =========================
   Auth helpers
   ========================= */

const noStore = (res) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  res.removeHeader('ETag');
};

const readSession = (req) => {
    const token = req.cookies[COOKIE_NAME];
    if (!token) return null;
    try {
        return jwt.verify(token, JWT_SECRET); // { user: {...}, iat, exp }
    } catch {
        return null;
    }
};

const ensureAuthenticated = (req, res, next) => {
  const session = readSession(req);
  if (session?.user) {
    req.user = session.user;
    return next();
  }
  res.status(401).json({ message: 'Unauthorized' });
};

const ensureAdmin = (req, res, next) => {
  const session = readSession(req);
  if (!session?.user) return res.status(401).json({ message: 'Unauthorized: You must be logged in.' });
  if (session.user.role === 'Admin') {
    req.user = session.user;
    return next();
  }
  res.status(403).json({ message: 'Forbidden: Administrative privileges required.' });
};

const getFamilyMemberIds = async (sessionUser) => {
  if (sessionUser.role === 'Teacher') return [sessionUser.id];
  const loggedInEmail = sessionUser.email.toLowerCase();
  const emailParts = loggedInEmail.split('@');
  if (emailParts.length < 2) return [sessionUser.id];
  const baseUsername = emailParts[0].split('+')[0];
  const domain = emailParts[1];
  const emailRegex = new RegExp(`^${baseUsername.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\$&')}(\\+.+)?@${domain.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\$&')}$`, 'i');
  const familyMembers = await User.find({ email: emailRegex, role: 'Student' }).select('_id');
  const familyIds = new Set(familyMembers.map(m => m._id.toString()));
  familyIds.add(sessionUser.id);
  return Array.from(familyIds);
};

/* =========================
   Routes
   ========================= */


app.post(['/api/users/check-email', '/users/check-email'], async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email is required.' });
    const user = await User.findOne({ email: email.toLowerCase() });
    res.json({ exists: !!user });
  } catch (error) {
    res.status(500).json({ message: 'Server error checking email.' });
  }
});

app.post(['/api/register', '/register'], async (req, res) => {
  const dbSession = await mongoose.startSession();
  dbSession.startTransaction();
  try {
    const usersData = req.body;
    if (!Array.isArray(usersData) || usersData.length === 0) throw new Error('Registration data must be a non-empty array of users.');

    const emailsInRequest = usersData.map(u => u.email.toLowerCase());
    if (new Set(emailsInRequest).size !== emailsInRequest.length) throw new Error('Duplicate emails found in the registration request.');

    const existingUsers = await User.find({ email: { $in: emailsInRequest } }).session(dbSession);
    if (existingUsers.length > 0) {
      const existingEmail = existingUsers[0].email;
      throw new Error(`The email "${existingEmail}" is already registered. Please try logging in or use a different email.`);
    }

    const adminUser = await User.findOne({ role: 'Admin' }).session(dbSession);

    for (const userData of usersData) {
      const { password, ...restOfUserData } = userData;
      if (!password) throw new Error(`Password is required for user ${restOfUserData.email}.`);
      const hashedPassword = await bcrypt.hash(password, 10);
      const finalUserData = {
        ...restOfUserData,
        email: restOfUserData.email.toLowerCase(),
        password: hashedPassword,
        dateOfJoining: restOfUserData.dateOfJoining || new Date().toISOString()
      };
      const user = new User(finalUserData);
      await user.save({ session: dbSession });

      if (user.role === 'Student' && adminUser) {
        const subject = `New Student Registration: ${user.name}`;
        const message = `${user.name} (from parent: ${user.fatherName}) has registered. Click to view their profile and assign a batch.`;
        const link = `/admin/student/${user.id}`;
        const newNotification = new Notification({ userId: adminUser._id, subject, message, link });
        await newNotification.save({ session: dbSession });

        if (mailTransporter) {
          const emailMessageForAdmin = `Hello Admin,<br><br>A new student has registered on Nadanaloga.<br><br><b>Name:</b> ${user.name}<br><b>Email:</b> ${user.email}<br><br>Please log in to the admin dashboard to review their details. A notification will be waiting for you there.`;
          const mailDetails = {
            from: process.env.SMTP_FROM_EMAIL || '"Nadanaloga Admin" <no-reply@nadanaloga.com>',
            to: adminUser.email,
            subject,
            html: createEmailTemplate('Admin', subject, emailMessageForAdmin),
          };
          mailTransporter.sendMail(mailDetails).catch(err => console.error(`[Email] Error sending registration notification to admin ${adminUser.email}:`, err));
        }
      }
    }

    await dbSession.commitTransaction();
    res.status(201).json({ message: 'Registration successful' });
  } catch (error) {
    await dbSession.abortTransaction();
    console.error('Registration error:', error);
    const errorMessage = error.code === 11000 ? 'An email in the registration list is already in use.' : (error.message || 'Server error during registration.');
    res.status(error.code === 11000 ? 409 : 500).json({ message: errorMessage });
  } finally {
    dbSession.endSession();
  }
});

app.post(['/api/admin/register', '/admin/register'], async (req, res) => {
  try {
    const { name, email, password, contactNumber } = req.body;
    if (!name || !email || !password || !contactNumber) return res.status(400).json({ message: 'All fields are required.' });

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) return res.status(409).json({ message: 'This email is already registered.' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const adminUser = new User({
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      contactNumber,
      role: 'Admin',
      status: 'Active',
      dateOfJoining: new Date().toISOString(),
    });

    await adminUser.save();
    res.status(201).json({ message: 'Admin registration successful. Please log in.' });
  } catch (error) {
    console.error('Admin registration error:', error);
    res.status(500).json({ message: 'Server error during admin registration.' });
  }
});

app.post(['/api/login', '/login'], async (req, res) => {
  try {
    const { email, password } = req.body;
    const userDoc = await User.findOne({ email: email.toLowerCase() });
    if (!userDoc) return res.status(401).json({ message: 'Invalid email or password.' });
    const isMatch = await bcrypt.compare(password, userDoc.password);
    if (!isMatch) return res.status(401).json({ message: 'Invalid email or password.' });
    
    const user = userDoc.toJSON();
    delete user.password;
    
    const token = jwt.sign({ user }, JWT_SECRET, { expiresIn: '7d' });
    const isProd = process.env.NODE_ENV === 'production';
    
    res.setHeader('Set-Cookie', [
      `${COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Lax; ${isProd ? 'Secure; ' : ''}Max-Age=${7 * 24 * 3600}`
    ]);
    
    noStore(res);
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Server error during login.' });
  }
});

app.get(['/api/session', '/session'], (req, res) => {
  noStore(res);
  const session = readSession(req);
  return res.status(200).json(session ? session.user : null);
});

app.post(['/api/logout', '/logout'], (req, res) => {
  res.setHeader('Set-Cookie', [
    `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`
  ]);
  noStore(res);
  res.status(200).json({ message: 'Logout successful' });
});

app.post(['/api/contact', '/contact'], async (req, res) => {
  try {
    const { name, email, message } = req.body;
    await new Contact({ name, email, message }).save();
    res.status(200).json({ success: true });
  } catch {
    res.status(500).json({ message: 'Failed to submit message.' });
  }
});

app.get(['/api/courses', '/courses'], async (_req, res) => {
  try {
    let courses = await Course.find();
    
    // Lazy seed if no courses exist
    if (courses.length === 0) {
      console.log('[DB] No courses found. Lazy seeding...');
      const initialCourses = [
        { name: 'Bharatanatyam', description: 'Explore the grace and storytelling of classical Indian dance.', icon: 'Bharatanatyam' },
        { name: 'Vocal', description: 'Develop your singing voice with professional training techniques.', icon: 'Vocal' },
        { name: 'Drawing', description: 'Learn to express your creativity through sketching and painting.', icon: 'Drawing' },
        { name: 'Abacus', description: 'Enhance mental math skills and concentration with our abacus program.', icon: 'Abacus' }
      ];
      await Course.insertMany(initialCourses);
      courses = await Course.find();
      console.log('[DB] Courses lazy seeded successfully.');
    }
    
    res.json(courses);
  } catch (error) {
    console.error('[API] Error in courses endpoint:', error);
    res.status(500).json({ message: 'Server error fetching courses.' });
  }
});

app.get(['/api/locations', '/locations'], async (_req, res) => {
  try {
    const locations = await Location.find().sort({ name: 1 });
    res.json(locations);
  } catch {
    res.status(500).json({ message: 'Server error fetching locations.' });
  }
});

app.put(['/api/profile', '/profile'], ensureAuthenticated, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });
    const { password, role, email, ...updateData } = req.body;
    const idToUpdate = updateData.id || userId;
    const updatedUserDoc = await User.findByIdAndUpdate(idToUpdate, updateData, { new: true, runValidators: true });
    if (!updatedUserDoc) return res.status(404).json({ message: 'User not found.' });
    const updatedUser = updatedUserDoc.toJSON();
    delete updatedUser.password;
    res.json(updatedUser);
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ message: 'Server error updating profile.' });
  }
});

app.get(['/api/student/enrollments', '/student/enrollments'], ensureAuthenticated, async (req, res) => {
  try {
    const studentId = req.user?.id;
    if (!studentId) return res.status(401).json({ message: 'Unauthorized' });
    if (req.user?.role !== 'Student') {
      return res.status(403).json({ message: 'Access denied. This is a student-only endpoint.' });
    }

    const enrolledBatches = await Batch.find({ 'schedule.studentIds': studentId })
      .populate('teacherId', 'name')
      .populate('locationId')
      .lean();

    if (!enrolledBatches) return res.json([]);

    const studentEnrollmentDetails = enrolledBatches.map(batch => {
      const enrollmentsInBatch = batch.schedule.filter(s => s.studentIds.some(id => id.equals(studentId)));
      if (enrollmentsInBatch.length > 0) {
        const teacherInfo = batch.teacherId ? {
          id: batch.teacherId._id.toHexString(),
          name: batch.teacherId.name,
        } : null;

        return {
          batchName: batch.name,
          courseName: batch.courseName,
          timings: enrollmentsInBatch.map(e => e.timing),
          teacher: teacherInfo,
          mode: batch.mode,
          location: batch.locationId,
        };
      }
      return null;
    }).filter(Boolean);

    res.json(studentEnrollmentDetails);
  } catch (error) {
    console.error('Error fetching student enrollments:', error);
    res.status(500).json({ message: 'Server error fetching your enrollment data.' });
  }
});

/* Family / Multi-student */
app.get(['/api/family/students', '/family/students'], ensureAuthenticated, async (req, res) => {
  try {
    const loggedInEmail = req.user?.email?.toLowerCase();
    if (!loggedInEmail) return res.status(401).json({ message: 'Unauthorized' });

    const emailParts = loggedInEmail.split('@');
    if (emailParts.length < 2) return res.status(400).json({ message: 'Invalid email format in session.' });
    const baseUsername = emailParts[0].split('+')[0];
    const domain = emailParts[1];
    const emailRegex = new RegExp(`^${baseUsername.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\$&')}(\\+.+)?@${domain.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\$&')}$`, 'i');

    const familyMembers = await User.find({ email: emailRegex, role: 'Student' }).select('-password').populate('locationId').sort({ email: 1 });
    if (!familyMembers || familyMembers.length === 0) {
      const self = await User.findById(req.user?.id).select('-password');
      return res.json(self ? [self] : []);
    }
    res.json(familyMembers);
  } catch (error) {
    console.error('Error fetching family students:', error);
    res.status(500).json({ message: 'Server error fetching family members.' });
  }
});

const ensureStudentInFamily = async (req, res, next) => {
  try {
    const loggedInEmail = req.user?.email?.toLowerCase();
    if (!loggedInEmail) return res.status(401).json({ message: 'Unauthorized' });
    const emailParts = loggedInEmail.split('@');
    const baseUsername = emailParts[0].split('+')[0];
    const domain = emailParts[1];
    const emailRegex = new RegExp(`^${baseUsername.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\$&')}(\\+.+)?@${domain.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\$&')}$`, 'i');

    const student = await User.findById(req.params.studentId);
    if (!student || student.role !== 'Student' || !emailRegex.test(student.email)) {
      return res.status(403).json({ message: 'Forbidden: You do not have permission to access this student\'s data.' });
    }
    req.student = student;
    next();
  } catch (error) {
    res.status(500).json({ message: 'Server error during authorization.' });
  }
};

app.get(['/api/family/students/:studentId/invoices', '/family/students/:studentId/invoices'], ensureAuthenticated, ensureStudentInFamily, async (req, res) => {
  try {
    const invoices = await Invoice.find({ studentId: req.params.studentId }).sort({ issueDate: -1 });
    res.json(invoices);
  } catch {
    res.status(500).json({ message: 'Server error fetching invoices.' });
  }
});

app.get(['/api/family/students/:studentId/enrollments', '/family/students/:studentId/enrollments'], ensureAuthenticated, ensureStudentInFamily, async (req, res) => {
  try {
    const studentId = req.params.studentId;
    const enrolledBatches = await Batch.find({ 'schedule.studentIds': studentId })
      .populate('teacherId', 'name')
      .populate('locationId')
      .lean();
    if (!enrolledBatches) return res.json([]);
    const details = enrolledBatches.map(batch => {
      const enrollmentsInBatch = batch.schedule.filter(s => s.studentIds.some(id => id.equals(studentId)));
      if (enrollmentsInBatch.length > 0) {
        const teacherInfo = batch.teacherId ? { id: batch.teacherId._id.toHexString(), name: batch.teacherId.name } : null;
        return {
          batchName: batch.name,
          courseName: batch.courseName,
          timings: enrollmentsInBatch.map(e => e.timing),
          teacher: teacherInfo,
          mode: batch.mode,
          location: batch.locationId,
        };
      }
      return null;
    }).filter(Boolean);
    res.json(details);
  } catch (error) {
    console.error('Error fetching student enrollments:', error);
    res.status(500).json({ message: 'Server error fetching enrollment data.' });
  }
});

/* Admin */
app.get(['/api/admin/stats', '/admin/stats'], ensureAdmin, async (_req, res) => {
  try {
    const studentCount = await User.countDocuments({ role: 'Student', isDeleted: { $ne: true } });
    const teacherCount = await User.countDocuments({ role: 'Teacher', isDeleted: { $ne: true } });
    const onlinePreference  = await User.countDocuments({ role: { $ne: 'Admin' }, classPreference: 'Online',  isDeleted: { $ne: true } });
    const offlinePreference = await User.countDocuments({ role: { $ne: 'Admin' }, classPreference: 'Offline', isDeleted: { $ne: true } });
    res.json({ totalUsers: studentCount + teacherCount, studentCount, teacherCount, onlinePreference, offlinePreference });
  } catch {
    res.status(500).json({ message: 'Server error fetching stats.' });
  }
});

app.get(['/api/admin/users', '/admin/users'], ensureAdmin, async (_req, res) => {
  try {
    const users = await User.find({ role: { $ne: 'Admin' }, isDeleted: { $ne: true } }).select('-password').populate('locationId');
    res.json(users);
  } catch {
    res.status(500).json({ message: 'Server error fetching users.' });
  }
});

app.get(['/api/admin/users/:id', '/admin/users/:id'], ensureAdmin, async (req, res) => {
  try {
    const user = await User.findOne({ _id: req.params.id, isDeleted: { $ne: true } }).select('-password').populate('locationId');
    if (!user) return res.status(404).json({ message: 'User not found.' });
    res.json(user);
  } catch (error) {
    console.error('Admin get user by ID error:', error);
    res.status(500).json({ message: 'Server error fetching user.' });
  }
});

app.post(['/api/admin/users', '/admin/users'], ensureAdmin, async (req, res) => {
  try {
    const { password, ...userData } = req.body;
    if (!userData.email) return res.status(400).json({ message: 'Email is required.' });
    const existingUser = await User.findOne({ email: userData.email.toLowerCase() });
    if (existingUser) return res.status(409).json({ message: 'This email is already in use.' });
    const effectivePassword = password || 'password123';
    const hashedPassword = await bcrypt.hash(effectivePassword, 10);
    const user = new User({ ...userData, password: hashedPassword });
    await user.save();
    const newUserDoc = await User.findById(user._id).select('-password');
    res.status(201).json(newUserDoc.toJSON());
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: 'This email is already in use.' });
    console.error('Admin create user error:', error);
    res.status(500).json({ message: 'Server error during user creation.' });
  }
});

app.put(['/api/admin/users/:id', '/admin/users/:id'], ensureAdmin, async (req, res) => {
  try {
    const { password, ...updateData } = req.body;
    if (updateData.email) {
      const existingUser = await User.findOne({ email: updateData.email.toLowerCase(), _id: { $ne: req.params.id } });
      if (existingUser) return res.status(409).json({ message: 'This email is already in use by another account.' });
    }
    const user = await User.findByIdAndUpdate(req.params.id, updateData, { new: true, runValidators: true }).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found.' });
    res.json(user);
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: 'This email is already in use by another account.' });
    res.status(500).json({ message: 'Server error updating user.' });
  }
});

app.delete(['/api/admin/users/:id', '/admin/users/:id'], ensureAdmin, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, { isDeleted: true, deletedAt: new Date() }, { new: true });
    if (!user) return res.status(404).json({ message: 'User not found.' });
    res.status(204).send();
  } catch {
    res.status(500).json({ message: 'Server error deleting user.' });
  }
});

app.delete(['/api/admin/users/:id/permanent', '/admin/users/:id/permanent'], ensureAdmin, async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found in trash.' });
    res.status(204).send();
  } catch {
    res.status(500).json({ message: 'Server error permanently deleting user.' });
  }
});

app.post(['/api/admin/notifications', '/admin/notifications'], ensureAdmin, async (req, res) => {
  const { userIds, subject, message } = req.body;
  if (!userIds || !Array.isArray(userIds) || userIds.length === 0) return res.status(400).json({ message: 'User IDs are required.' });
  if (!subject || !message) return res.status(400).json({ message: 'Subject and message are required.' });

  try {
    const users = await User.find({ '_id': { $in: userIds } }).select('email name');
    if (users.length === 0) return res.status(404).json({ message: 'No valid recipient users found.' });

    const notificationsToSave = users.map(user => ({ userId: user._id, subject, message }));
    await Notification.insertMany(notificationsToSave);

    if (mailTransporter) {
      for (const user of users) {
        const mailDetails = {
          from: process.env.SMTP_FROM_EMAIL || '"Nadanaloga Admin" <no-reply@nadanaloga.com>',
          to: user.email,
          subject,
          html: createEmailTemplate(user.name, subject, message),
        };
        mailTransporter.sendMail(mailDetails).catch(err => console.error(`[Email] Error sending to ${user.email}:`, err));
      }
    } else {
      console.warn('[Email] Notification stored in DB, but email not sent because mail transporter is not configured.');
    }
    res.status(200).json({ success: true, message: 'Notification sent and stored successfully.' });
  } catch (error) {
    console.error('Notification error:', error);
    res.status(500).json({ message: 'Server error sending notification.' });
  }
});

/* Admin: Courses */
app.get(['/api/admin/courses', '/admin/courses'], ensureAdmin, async (_req, res) => {
  try {
    const courses = await Course.find();
    res.json(courses);
  } catch {
    res.status(500).json({ message: 'Server error fetching courses.' });
  }
});
app.post(['/api/admin/courses', '/admin/courses'], ensureAdmin, async (req, res) => {
  try {
    const { name, description, icon } = req.body;
    const newCourse = new Course({ name, description, icon });
    await newCourse.save();
    res.status(201).json(newCourse);
  } catch {
    res.status(500).json({ message: 'Server error creating course.' });
  }
});
app.put(['/api/admin/courses/:id', '/admin/courses/:id'], ensureAdmin, async (req, res) => {
  try {
    const { name, description, icon } = req.body;
    const updatedCourse = await Course.findByIdAndUpdate(req.params.id, { name, description, icon }, { new: true, runValidators: true });
    if (!updatedCourse) return res.status(404).json({ message: 'Course not found.' });
    res.json(updatedCourse);
  } catch {
    res.status(500).json({ message: 'Server error updating course.' });
  }
});
app.delete(['/api/admin/courses/:id', '/admin/courses/:id'], ensureAdmin, async (req, res) => {
  try {
    const course = await Course.findByIdAndDelete(req.params.id);
    if (!course) return res.status(404).json({ message: 'Course not found.' });
    res.status(204).send();
  } catch {
    res.status(500).json({ message: 'Server error deleting course.' });
  }
});

/* Admin: Batches */
app.get(['/api/admin/batches', '/admin/batches'], ensureAdmin, async (_req, res) => {
  try {
    const batches = await Batch.find().populate('teacherId', 'name').populate('locationId');
    res.json(batches);
  } catch {
    res.status(500).json({ message: 'Server error fetching batches.' });
  }
});
app.post(['/api/admin/batches', '/admin/batches'], ensureAdmin, async (req, res) => {
  try {
    const newBatch = new Batch(req.body);
    await newBatch.save();
    res.status(201).json(newBatch);
  } catch (error) {
    console.error('Batch creation error:', error);
    res.status(500).json({ message: 'Server error creating batch.' });
  }
});
app.put(['/api/admin/batches/:id', '/admin/batches/:id'], ensureAdmin, async (req, res) => {
  try {
    const updatedBatch = await Batch.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!updatedBatch) return res.status(404).json({ message: 'Batch not found.' });
    res.json(updatedBatch);
  } catch {
    res.status(500).json({ message: 'Server error updating batch.' });
  }
});
app.delete(['/api/admin/batches/:id', '/admin/batches/:id'], ensureAdmin, async (req, res) => {
  try {
    const batch = await Batch.findByIdAndDelete(req.params.id);
    if (!batch) return res.status(404).json({ message: 'Batch not found.' });
    res.status(204).send();
  } catch {
    res.status(500).json({ message: 'Server error deleting batch.' });
  }
});

/* Admin: Locations */
app.get(['/api/admin/locations', '/admin/locations'], ensureAdmin, async (_req, res) => {
  try {
    const locations = await Location.find().sort({ name: 1 });
    res.json(locations);
  } catch {
    res.status(500).json({ message: 'Server error fetching locations.' });
  }
});
app.post(['/api/admin/locations', '/admin/locations'], ensureAdmin, async (req, res) => {
  try {
    const newLocation = new Location(req.body);
    await newLocation.save();
    res.status(201).json(newLocation);
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: 'A location with this address already exists.' });
    res.status(500).json({ message: 'Server error creating location.' });
  }
});
app.put(['/api/admin/locations/:id', '/admin/locations/:id'], ensureAdmin, async (req, res) => {
  try {
    const updatedLocation = await Location.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!updatedLocation) return res.status(404).json({ message: 'Location not found.' });
    res.json(updatedLocation);
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: 'A location with this address already exists.' });
    res.status(500).json({ message: 'Server error updating location.' });
  }
});
app.delete(['/api/admin/locations/:id', '/admin/locations/:id'], ensureAdmin, async (req, res) => {
  try {
    const location = await Location.findByIdAndDelete(req.params.id);
    if (!location) return res.status(404).json({ message: 'Location not found.' });
    res.status(204).send();
  } catch {
    res.status(500).json({ message: 'Server error deleting location.' });
  }
});

/* Admin: Fee structures & Invoices */
app.get(['/api/admin/feestructures', '/admin/feestructures'], ensureAdmin, async (_req, res) => {
  try {
    const structures = await FeeStructure.find().sort({ courseName: 1 });
    res.json(structures);
  } catch {
    res.status(500).json({ message: 'Server error fetching fee structures.' });
  }
});
app.post(['/api/admin/feestructures', '/admin/feestructures'], ensureAdmin, async (req, res) => {
  try {
    const newStructure = new FeeStructure(req.body);
    await newStructure.save();
    res.status(201).json(newStructure);
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: 'A fee structure for this course already exists.' });
    res.status(500).json({ message: 'Server error creating fee structure.' });
  }
});
app.put(['/api/admin/feestructures/:id', '/admin/feestructures/:id'], ensureAdmin, async (req, res) => {
  try {
    const updatedStructure = await FeeStructure.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!updatedStructure) return res.status(404).json({ message: 'Fee structure not found.' });
    res.json(updatedStructure);
  } catch {
    res.status(500).json({ message: 'Server error updating fee structure.' });
  }
});
app.delete(['/api/admin/feestructures/:id', '/admin/feestructures/:id'], ensureAdmin, async (req, res) => {
  try {
    const structure = await FeeStructure.findByIdAndDelete(req.params.id);
    if (!structure) return res.status(404).json({ message: 'Fee structure not found.' });
    res.status(204).send();
  } catch {
    res.status(500).json({ message: 'Server error deleting fee structure.' });
  }
});

app.get(['/api/admin/invoices', '/admin/invoices'], ensureAdmin, async (_req, res) => {
  try {
    const invoices = await Invoice.find().populate('studentId', 'name email').sort({ issueDate: -1 });
    res.json(invoices);
  } catch {
    res.status(500).json({ message: 'Server error fetching invoices.' });
  }
});

app.post(['/api/admin/invoices/generate', '/admin/invoices/generate'], ensureAdmin, async (_req, res) => {
  try {
    const feeStructures = await FeeStructure.find();
    const students = await User.find({ role: 'Student', courses: { $exists: true, $not: { $size: 0 } } });
    const structuresMap = new Map(feeStructures.map(fs => [fs.courseName, fs]));
    const monthNames = ["January","February","March","April","May","June","July","August","September","October","November","December"];
    const now = new Date();
    const currentBillingPeriod = `${monthNames[now.getMonth()]} ${now.getFullYear()}`;

    let generatedCount = 0;
    const invoicePromises = [];

    for (const student of students) {
      for (const courseName of (student.courses || [])) {
        const feeStructure = structuresMap.get(courseName);
        if (!feeStructure || feeStructure.billingCycle !== 'Monthly') continue;

        const existingInvoice = await Invoice.findOne({
          studentId: student._id,
          feeStructureId: feeStructure._id,
          billingPeriod: currentBillingPeriod,
        });
        if (existingInvoice) continue;

        const issueDate = new Date();
        const dueDate = new Date(issueDate.getFullYear(), issueDate.getMonth(), 15);

        const invoice = new Invoice({
          studentId: student._id,
          feeStructureId: feeStructure._id,
          courseName: feeStructure.courseName,
          amount: feeStructure.amount,
          currency: feeStructure.currency,
          issueDate,
          dueDate,
          billingPeriod: currentBillingPeriod,
          status: 'Pending',
        });
        invoicePromises.push(invoice.save());
        generatedCount++;
      }
    }

    await Promise.all(invoicePromises);
    res.status(201).json({ message: `${generatedCount} new invoices generated successfully.` });
  } catch (error) {
    console.error('Invoice generation error:', error);
    res.status(500).json({ message: 'Server error during invoice generation.' });
  }
});

app.put(['/api/admin/invoices/:id/pay', '/api/admin/invoices/:id/pay'], ensureAdmin, async (req, res) => {
  try {
    const paymentDetails = req.body;
    const updatedInvoice = await Invoice.findByIdAndUpdate(
      req.params.id,
      { status: 'Paid', paymentDetails },
      { new: true, runValidators: true }
    ).populate('studentId', 'name email');
    if (!updatedInvoice) return res.status(404).json({ message: 'Invoice not found.' });
    res.json(updatedInvoice);
  } catch {
    res.status(500).json({ message: 'Server error recording payment.' });
  }
});

/* Notifications (user) */
app.get(['/api/notifications', '/notifications'], ensureAuthenticated, async (req, res) => {
  try {
    const familyIds = await getFamilyMemberIds(req.user);
    const notifications = await Notification.find({ userId: { $in: familyIds } }).sort({ createdAt: -1 });
    res.json(notifications);
  } catch {
    res.status(500).json({ message: 'Server error fetching notifications.' });
  }
});

app.put(['/api/notifications/:id/read', '/notifications/:id/read'], ensureAuthenticated, async (req, res) => {
  try {
    const familyIds = await getFamilyMemberIds(req.user);
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: { $in: familyIds } },
      { read: true },
      { new: true }
    );
    if (!notification) return res.status(404).json({ message: 'Notification not found or not permitted.' });
    res.json(notification);
  } catch {
    res.status(500).json({ message: 'Server error updating notification.' });
  }
});

/* Content fetch helper */
const getContentForUser = async (Model, req, res) => {
  try {
    const familyIds = await getFamilyMemberIds(req.user);
    const content = await Model.find({
      $or: [
        { recipientIds: { $exists: false } },
        { recipientIds: { $size: 0 } },
        { recipientIds: { $in: familyIds } }
      ]
    }).sort({ date: -1, examDate: -1, issuedAt: -1, createdAt: -1 });
    res.json(content);
  } catch {
    res.status(500).json({ message: `Server error fetching ${Model.modelName}.` });
  }
};

app.get(['/api/events', '/events'], ensureAuthenticated, (req, res) => getContentForUser(Event, req, res));
app.get(['/api/grade-exams', '/grade-exams'], ensureAuthenticated, (req, res) => getContentForUser(GradeExam, req, res));
app.get(['/api/book-materials', '/book-materials'], ensureAuthenticated, (req, res) => getContentForUser(BookMaterial, req, res));
app.get(['/api/notices', '/notices'], ensureAuthenticated, (req, res) => getContentForUser(Notice, req, res));

/* Admin: Content Management */
app.get(['/api/admin/trash', '/admin/trash'], ensureAdmin, async (_req, res) => {
  try {
    const users = await User.find({ isDeleted: true }).select('-password');
    res.json(users);
  } catch {
    res.status(500).json({ message: 'Server error fetching trashed users.' });
  }
});
app.put(['/api/admin/trash/:id/restore', '/api/admin/trash/:id/restore'], ensureAdmin, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, { isDeleted: false, deletedAt: null }, { new: true });
    if (!user) return res.status(404).json({ message: 'User not found in trash.' });
    res.json(user);
  } catch {
    res.status(500).json({ message: 'Server error restoring user.' });
  }
});

/* Events CRUD */
app.get(['/api/admin/events', '/admin/events'], ensureAdmin, async (_req, res) => { try { res.json(await Event.find().sort({ date: -1 })); } catch (e) { res.status(500).json({ message: e.message }); }});
app.post(['/api/admin/events', '/admin/events'], ensureAdmin, async (req, res) => { try { res.status(201).json(await new Event(req.body).save()); } catch (e) { res.status(500).json({ message: e.message }); }});
app.put(['/api/admin/events/:id', '/admin/events/:id'], ensureAdmin, async (req, res) => { try { res.json(await Event.findByIdAndUpdate(req.params.id, req.body, { new: true })); } catch (e) { res.status(500).json({ message: e.message }); }});
app.delete(['/api/admin/events/:id', '/admin/events/:id'], ensureAdmin, async (req, res) => { try { await Event.findByIdAndDelete(req.params.id); res.status(204).send(); } catch (e) { res.status(500).json({ message: e.message }); }});

/* Grade Exams CRUD */
app.get(['/api/admin/grade-exams'], ensureAdmin, async (_req, res) => { try { res.json(await GradeExam.find().sort({ examDate: -1 })); } catch (e) { res.status(500).json({ message: e.message }); }});
app.post(['/api/admin/grade-exams'], ensureAdmin, async (req, res) => { try { res.status(201).json(await new GradeExam(req.body).save()); } catch (e) { res.status(500).json({ message: e.message }); }});
app.put(['/api/admin/grade-exams/:id'], ensureAdmin, async (req, res) => { try { res.json(await GradeExam.findByIdAndUpdate(req.params.id, req.body, { new: true })); } catch (e) { res.status(500).json({ message: e.message }); }});
app.delete(['/api/admin/grade-exams/:id'], ensureAdmin, async (req, res) => { try { await GradeExam.findByIdAndDelete(req.params.id); res.status(204).send(); } catch (e) { res.status(500).json({ message: e.message }); }});

/* Book Materials CRUD */
app.get(['/api/admin/book-materials', '/admin/book-materials'], ensureAdmin, async (_req, res) => { try { res.json(await BookMaterial.find().sort({ courseName: 1, title: 1 })); } catch (e) { res.status(500).json({ message: e.message }); }});
app.post(['/api/admin/book-materials', '/admin/book-materials'], ensureAdmin, async (req, res) => { try { res.status(201).json(await new BookMaterial(req.body).save()); } catch (e) { res.status(500).json({ message: e.message }); }});
app.put(['/api/admin/book-materials/:id', '/admin/book-materials/:id'], ensureAdmin, async (req, res) => { try { res.json(await BookMaterial.findByIdAndUpdate(req.params.id, req.body, { new: true })); } catch (e) { res.status(500).json({ message: e.message }); }});
app.delete(['/api/admin/book-materials/:id', '/admin/book-materials/:id'], ensureAdmin, async (req, res) => { try { await BookMaterial.findByIdAndDelete(req.params.id); res.status(204).send(); } catch (e) { res.status(500).json({ message: e.message }); }});

/* Notices CRUD */
app.get(['/api/admin/notices', '/admin/notices'], ensureAdmin, async (_req, res) => { try { res.json(await Notice.find().sort({ issuedAt: -1 })); } catch (e) { res.status(500).json({ message: e.message }); }});
app.post(['/api/admin/notices', '/admin/notices'], ensureAdmin, async (req, res) => { try { res.status(201).json(await new Notice(req.body).save()); } catch (e) { res.status(500).json({ message: e.message }); }});
app.put(['/api/admin/notices/:id', '/admin/notices/:id'], ensureAdmin, async (req, res) => { try { res.json(await Notice.findByIdAndUpdate(req.params.id, req.body, { new: true })); } catch (e) { res.status(500).json({ message: e.message }); }});
app.delete(['/api/admin/notices/:id', '/admin/notices/:id'], ensureAdmin, async (req, res) => { try { await Notice.findByIdAndDelete(req.params.id); res.status(204).send(); } catch (e) { res.status(500).json({ message: e.message }); }});

/* =========================
   Frontend catch-all (local only)
   ========================= */
if (process.env.NODE_ENV !== 'production') {
    app.get('*', (req, res, next) => {
      const distDir = path.join(__dirname, '../dist');
      const indexPath = path.join(distDir, 'index.html');
      if (fs.existsSync(indexPath)) return res.sendFile(indexPath);
      return next(); // in serverless/Vercel there is no SPA served by this process
    });
}


/* =========================
   Local start vs Vercel export
   ========================= */

async function startServer() {
  try {
    await ensureSetup();
    app.listen(PORT, () => {
      console.log(`[Server] ✅ Server is running for local development on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('[Server] 🚨 Failed to start local server:', err);
    process.exit(1);
  }
}

// If invoked directly -> local dev
if (require.main === module) {
  startServer();
}

// Always export a serverless handler for Vercel
module.exports = serverless(app);