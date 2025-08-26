const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const serverless = require('serverless-http');

// Load environment variables
dotenv.config();

const PORT = process.env.PORT || 4000;
const app = express();

// --- Mongoose Schemas and Models (defined outside to be accessible everywhere) ---

// New Location Schema
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

  // Common fields
  photoUrl: { type: String }, // Can store base64 data URL
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

  // Student specific
  courses: { type: [String] },
  fatherName: { type: String },
  standard: { type: String },
  schoolName: { type: String },
  grade: { type: String, enum: ['Grade 1', 'Grade 2', 'Grade 3'] },
  notes: { type: String },

  // Teacher specific
  courseExpertise: { type: [String] },
  educationalQualifications: { type: String },
  employmentType: { type: String, enum: ['Part-time', 'Full-time'] },
  yearsOfExperience: { type: Number },
  availableTimeSlots: { type: [String] },

  // Soft delete fields
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
  icon: { type: String, required: true } // Name of the icon, e.g., 'Bharatanatyam'
});
courseSchema.virtual('id').get(function () { return this._id.toHexString(); });
courseSchema.set('toJSON', { virtuals: true, transform: (doc, ret) => { delete ret._id; delete ret.__v; } });
const Course = mongoose.model('Course', courseSchema);

const notificationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  subject: { type: String, required: true },
  message: { type: String, required: true },
  read: { type: Boolean, default: false },
  link: { type: String, required: false },
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

// --- Fee Management Schemas ---
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
  billingPeriod: { type: String, required: true }, // e.g., "July 2024"
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

// --- New Content Schemas ---
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
  data: { type: String }, // For base64 PDF data
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

let mailTransporter;
let isEtherealMode = false;

// --- Setup Function (DB, Email, etc.) ---
async function setupAndConnect() {
  console.log(`[Server] Node environment (NODE_ENV): ${process.env.NODE_ENV || 'not set (defaults to development)'}`);

  // --- Database Seeding Function ---
  const seedCourses = async () => {
    try {
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
    } catch (error) {
      console.error('[DB] Error seeding courses:', error);
    }
  };

  // --- Nodemailer Transport ---
  try {
    if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
      isEtherealMode = true;
      console.log('\n--- ❗ EMAIL IS IN TEST MODE ❗ ---');
      console.log('[Email] WARNING: SMTP environment variables (SMTP_HOST, SMTP_USER, SMTP_PASS) are missing in server/.env');
      console.log('[Email] Using Ethereal for dev previews.');
      console.log('-------------------------------------\n');

      const testAccount = await nodemailer.createTestAccount();
      mailTransporter = nodemailer.createTransport({
        host: testAccount.smtp.host,
        port: testAccount.smtp.port,
        secure: testAccount.smtp.secure,
        auth: { user: testAccount.user, pass: testAccount.pass },
      });
    } else {
      console.log('\n--- 📧 EMAIL CONFIGURATION ---');
      console.log(`[Email] Live SMTP config found. Attempting to connect to ${process.env.SMTP_HOST}...`);
      mailTransporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587', 10),
        secure: parseInt(process.env.SMTP_PORT || '587', 10) === 465,
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      });

      await mailTransporter.verify();
      console.log('[Email] ✅ SMTP connection verified. Server is ready to send real emails.');
      console.log('-----------------------------\n');
    }
  } catch (error) {
    console.error('\n--- 🚨 EMAIL CONFIGURATION FAILED ---');
    console.error('[Email] Could not connect to SMTP server. Please check your .env settings.');
    console.error(`[Email] Error: ${error.message}`);
    console.error('[Email] The app will run, but email sending will FAIL.');
    console.error('--------------------------------------\n');
  }

  // --- MongoDB Connection ---
  try {
    if (!process.env.MONGO_URI) {
      throw new Error("MONGO_URI is not defined in the environment variables.");
    }
    await mongoose.connect(process.env.MONGO_URI);
    console.log('[DB] MongoDB connected successfully.');
    await seedCourses();
  } catch (err) {
    console.error('\n--- 🚨 DATABASE CONNECTION FAILED ---');
    console.error(`[DB] Error: ${err.message}`);
    console.error('[DB] The server is running, but API calls requiring database access will fail.');
    console.error('--- Make sure MONGO_URI is set correctly in your environment. ---\n');
  }
}

// --- Email Template ---
const createEmailTemplate = (name, subject, message) => {
    const year = new Date().getFullYear();
    const logoUrl = 'https://i.ibb.co/9v0Gk5v/nadanaloga-logo-email.png';
    const brandColorDark = '#333333';
    const backgroundColor = '#f4f5f7';
    const contentBackgroundColor = '#ffffff';
    const primaryTextColor = '#333333';
    const secondaryTextColor = '#555555';

    return `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
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
<div style="font-size:16px;line-height:24px;color:${secondaryTextColor};">${message.replace(/\n/g, '<br>')}</div>
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
<td style="padding:0;width:50%;" align="left"><p style="margin:0;font-family:'Poppins',Arial,sans-serif;">&copy; ${year} Nadanaloga.com</p></td>
<td style="padding:0;width:50%;" align="right"><p style="margin:0;font-family:'Poppins',Arial,sans-serif;">contact@nadanaloga.com</p></td>
</tr>
</table>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
};


// *** IMPORTANT: App Configuration (Middleware, etc.) ***
app.set('etag', false);
app.disable('x-powered-by');
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ limit: '100mb', extended: true }));

const whitelist = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:5500',
  'http://127.0.0.1:5500',
  'https://nadanaloga-portal.vercel.app'
];
if (process.env.CLIENT_URL) {
  whitelist.push(process.env.CLIENT_URL);
}

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || whitelist.includes(origin) || /^https?:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin)) {
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

app.set('trust proxy', 1);
app.use(session({
  name: 'connect.sid',
  secret: process.env.SESSION_SECRET || 'a-secure-secret-key',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ mongoUrl: process.env.MONGO_URI }),
  cookie: {
    maxAge: 1000 * 60 * 60 * 24,
    httpOnly: true,
    secure: true,   // Vercel is HTTPS
    sameSite: 'lax' // same-origin is fine with 'lax'
  }
}));

// --- Setup Function for Serverless ---
let setupPromise;
function ensureSetupOnce() {
  if (!setupPromise) {
    setupPromise = setupAndConnect(); // This is the existing setup function
  }
  return setupPromise;
}

// Ensure DB connection is ready before handling any request (crucial for serverless)
app.use(async (req, res, next) => {
  try {
    await ensureSetupOnce();
    next();
  } catch (e) {
    console.error('FATAL: Server setup failed:', e);
    res.status(500).json({ message: 'Server setup failed. Please check logs.' });
  }
});


// --- Auth Helpers & Routes ---
const noStore = (res) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  res.removeHeader('ETag');
};

const ensureAuthenticated = (req, res, next) => {
  if (req.session.user) return next();
  res.status(401).json({ message: 'Unauthorized' });
};

const ensureAdmin = (req, res, next) => {
  if (!req.session.user) {
    return res.status(401).json({ message: 'Unauthorized: You must be logged in to perform this action.' });
  }
  if (req.session.user.role === 'Admin') {
    return next();
  }
  res.status(403).json({ message: 'Forbidden: Administrative privileges required.' });
};

const getFamilyMemberIds = async (sessionUser) => {
  if (sessionUser.role === 'Teacher') {
    return [sessionUser.id];
  }
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

// --- API Routes (moved to top level) ---
app.post('/api/users/check-email', async (req, res) => {
    try {
      const { email } = req.body;
      if (!email) return res.status(400).json({ message: 'Email is required.' });
      const user = await User.findOne({ email: email.toLowerCase() });
      res.json({ exists: !!user });
    } catch (error) {
      res.status(500).json({ message: 'Server error checking email.' });
    }
  });

  app.post('/api/register', async (req, res) => {
    const dbSession = await mongoose.startSession();
    dbSession.startTransaction();
    try {
      const usersData = req.body;
      if (!Array.isArray(usersData) || usersData.length === 0) {
        throw new Error('Registration data must be a non-empty array of users.');
      }

      const emailsInRequest = usersData.map(u => u.email.toLowerCase());
      if (new Set(emailsInRequest).size !== emailsInRequest.length) {
        throw new Error('Duplicate emails found in the registration request.');
      }

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
              subject: subject,
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

  app.post('/api/admin/register', async (req, res) => {
    try {
        const { name, email, password, contactNumber } = req.body;
        if (!name || !email || !password || !contactNumber) {
            return res.status(400).json({ message: 'All fields are required.' });
        }

        const existingUser = await User.findOne({ email: email.toLowerCase() });
        if (existingUser) {
            return res.status(409).json({ message: 'This email is already registered.' });
        }

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

  // --- LOGIN (now non-cacheable) ---
  app.post('/api/login', async (req, res) => {
    try {
      const { email, password } = req.body;
      const userDoc = await User.findOne({ email: email.toLowerCase() });
      if (!userDoc) return res.status(401).json({ message: 'Invalid email or password.' });
      const isMatch = await bcrypt.compare(password, userDoc.password);
      if (!isMatch) return res.status(401).json({ message: 'Invalid email or password.' });
      const user = userDoc.toJSON();
      delete user.password;
      req.session.user = user;

      // Ensure the session is saved before responding
      req.session.save((err) => {
        if (err) {
          console.error('Session save error:', err);
          return res.status(500).json({ message: 'Server error during login session setup.' });
        }
        // prevent caching of auth state
        noStore(res);
        res.json(user);
      });
    } catch (error) {
      res.status(500).json({ message: 'Server error during login.' });
    }
  });

  // --- SESSION (now non-cacheable) ---
  app.get('/api/session', (req, res) => {
    noStore(res);
    if (req.session.user) {
      return res.status(200).json(req.session.user);
    }
    return res.status(200).json(null);
  });

  // --- LOGOUT (now non-cacheable + clears cookie with matching flags) ---
  app.post('/api/logout', (req, res) => {
    req.session.destroy(err => {
      if (err) return res.status(500).json({ message: 'Could not log out.' });
      res.clearCookie('connect.sid', {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/'
      });
      noStore(res);
      res.status(200).json({ message: 'Logout successful' });
    });
  });

  app.post('/api/contact', async (req, res) => {
    try {
      const { name, email, message } = req.body;
      await new Contact({ name, email, message }).save();
      res.status(200).json({ success: true });
    } catch (error) {
      res.status(500).json({ message: 'Failed to submit message.' });
    }
  });

  app.get('/api/courses', async (req, res) => {
    try {
      const courses = await Course.find();
      res.json(courses);
    } catch (error) {
      res.status(500).json({ message: 'Server error fetching courses.' });
    }
  });

  // Public route for locations
  app.get('/api/locations', async (req, res) => {
    try {
      const locations = await Location.find().sort({ name: 1 });
      res.json(locations);
    } catch (error) {
      res.status(500).json({ message: 'Server error fetching locations.' });
    }
  });

  app.put('/api/profile', ensureAuthenticated, async (req, res) => {
    try {
      const userId = req.session.user.id;
      const { password, role, email, ...updateData } = req.body;
      const idToUpdate = updateData.id || userId;

      const updatedUserDoc = await User.findByIdAndUpdate(idToUpdate, updateData, { new: true, runValidators: true });
      if (!updatedUserDoc) return res.status(404).json({ message: 'User not found.' });
      const updatedUser = updatedUserDoc.toJSON();
      delete updatedUser.password;

      if (idToUpdate === userId) {
        req.session.user = updatedUser;
      }

      res.json(updatedUser);
    } catch (error) {
      console.error('Profile update error:', error);
      res.status(500).json({ message: 'Server error updating profile.' });
    }
  });

  app.get('/api/student/enrollments', ensureAuthenticated, async (req, res) => {
    try {
      const studentId = req.session.user.id;
      if (req.session.user.role !== 'Student') {
        return res.status(403).json({ message: 'Access denied. This is a student-only endpoint.' });
      }

      const enrolledBatches = await Batch.find({ 'schedule.studentIds': studentId })
        .populate('teacherId', 'name')
        .populate('locationId')
        .lean();

      if (!enrolledBatches) {
        return res.json([]);
      }

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
      }).filter(e => e !== null);

      res.json(studentEnrollmentDetails);

    } catch (error) {
      console.error('Error fetching student enrollments:', error);
      res.status(500).json({ message: 'Server error fetching your enrollment data.' });
    }
  });

  // --- Family / Multi-student Routes ---
  app.get('/api/family/students', ensureAuthenticated, async (req, res) => {
    try {
      const loggedInEmail = req.session.user.email.toLowerCase();
      const emailParts = loggedInEmail.split('@');
      if (emailParts.length < 2) {
        return res.status(400).json({ message: 'Invalid email format in session.' });
      }

      const baseUsername = emailParts[0].split('+')[0];
      const domain = emailParts[1];

      const emailRegex = new RegExp(`^${baseUsername.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\$&')}(\\+.+)?@${domain.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\$&')}$`, 'i');

      const familyMembers = await User.find({ email: emailRegex, role: 'Student' }).select('-password').populate('locationId').sort({ email: 1 });

      if (!familyMembers || familyMembers.length === 0) {
        const self = await User.findById(req.session.user.id).select('-password');
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
      const loggedInEmail = req.session.user.email.toLowerCase();
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

  app.get('/api/family/students/:studentId/invoices', ensureAuthenticated, ensureStudentInFamily, async (req, res) => {
    try {
      const invoices = await Invoice.find({ studentId: req.params.studentId }).sort({ issueDate: -1 });
      res.json(invoices);
    } catch (error) {
      res.status(500).json({ message: 'Server error fetching invoices.' });
    }
  });

  app.get('/api/family/students/:studentId/enrollments', ensureAuthenticated, ensureStudentInFamily, async (req, res) => {
    try {
      const studentId = req.params.studentId;
      const enrolledBatches = await Batch.find({ 'schedule.studentIds': studentId })
        .populate('teacherId', 'name')
        .populate('locationId')
        .lean();
      if (!enrolledBatches) return res.json([]);
      const studentEnrollmentDetails = enrolledBatches.map(batch => {
        const enrollmentsInBatch = batch.schedule.filter(s => s.studentIds.some(id => id.equals(studentId)));
        if (enrollmentsInBatch.length > 0) {
          const teacherInfo = batch.teacherId ? { id: batch.teacherId._id.toHexString(), name: batch.teacherId.name, } : null;
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
      }).filter(e => e !== null);
      res.json(studentEnrollmentDetails);
    } catch (error) {
      console.error('Error fetching student enrollments:', error);
      res.status(500).json({ message: 'Server error fetching enrollment data.' });
    }
  });

  // --- Admin Routes ---
  app.get('/api/admin/stats', ensureAdmin, async (req, res) => {
    try {
      const studentCount = await User.countDocuments({ role: 'Student', isDeleted: { $ne: true } });
      const teacherCount = await User.countDocuments({ role: 'Teacher', isDeleted: { $ne: true } });
      const onlinePreference = await User.countDocuments({ role: { $ne: 'Admin' }, classPreference: 'Online', isDeleted: { $ne: true } });
      const offlinePreference = await User.countDocuments({ role: { $ne: 'Admin' }, classPreference: 'Offline', isDeleted: { $ne: true } });
      res.json({ totalUsers: studentCount + teacherCount, studentCount, teacherCount, onlinePreference, offlinePreference });
    } catch (error) {
      res.status(500).json({ message: 'Server error fetching stats.' });
    }
  });

  app.get('/api/admin/users', ensureAdmin, async (req, res) => {
    try {
      const users = await User.find({ role: { $ne: 'Admin' }, isDeleted: { $ne: true } }).select('-password').populate('locationId');
      res.json(users);
    } catch (error) {
      res.status(500).json({ message: 'Server error fetching users.' });
    }
  });

  app.get('/api/admin/users/:id', ensureAdmin, async (req, res) => {
    try {
      const user = await User.findOne({ _id: req.params.id, isDeleted: { $ne: true } }).select('-password').populate('locationId');
    if (!user) {
        return res.status(404).json({ message: 'User not found.' });
      }
      res.json(user);
    } catch (error) {
      console.error('Admin get user by ID error:', error);
      res.status(500).json({ message: 'Server error fetching user.' });
    }
  });

  app.post('/api/admin/users', ensureAdmin, async (req, res) => {
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

  app.put('/api/admin/users/:id', ensureAdmin, async (req, res) => {
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

  // Soft delete a user
  app.delete('/api/admin/users/:id', ensureAdmin, async (req, res) => {
    try {
      const user = await User.findByIdAndUpdate(
        req.params.id,
        { isDeleted: true, deletedAt: new Date() },
        { new: true }
      );
      if (!user) return res.status(404).json({ message: 'User not found.' });
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: 'Server error deleting user.' });
    }
  });

  // Permanently delete a user
  app.delete('/api/admin/users/:id/permanent', ensureAdmin, async (req, res) => {
    try {
      const user = await User.findByIdAndDelete(req.params.id);
      if (!user) return res.status(404).json({ message: 'User not found in trash.' });
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: 'Server error permanently deleting user.' });
    }
  });

  app.post('/api/admin/notifications', ensureAdmin, async (req, res) => {
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
            subject: subject,
            html: createEmailTemplate(user.name, subject, message),
          };
          mailTransporter.sendMail(mailDetails, (err, info) => {
            if (err) {
              console.error(`[Email] Error sending to ${user.email}:`, err);
            } else {
              if (isEtherealMode) {
                console.log(`[Email] ❗ TEST MODE: Email for ${user.email} was INTERCEPTED. View it here: ${nodemailer.getTestMessageUrl(info)}`);
              } else {
                console.log(`[Email] Notification sent to ${user.email}. Message ID: ${info.messageId}`);
              }
            }
          });
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

  app.get('/api/admin/courses', ensureAdmin, async (req, res) => {
    try {
      const courses = await Course.find();
      res.json(courses);
    } catch (error) {
      res.status(500).json({ message: 'Server error fetching courses.' });
    }
  });

  app.post('/api/admin/courses', ensureAdmin, async (req, res) => {
    try {
      const { name, description, icon } = req.body;
      const newCourse = new Course({ name, description, icon });
      await newCourse.save();
      res.status(201).json(newCourse);
    } catch (error) {
      res.status(500).json({ message: 'Server error creating course.' });
    }
  });

  app.put('/api/admin/courses/:id', ensureAdmin, async (req, res) => {
    try {
      const { name, description, icon } = req.body;
      const updatedCourse = await Course.findByIdAndUpdate(req.params.id, { name, description, icon }, { new: true, runValidators: true });
      if (!updatedCourse) return res.status(404).json({ message: 'Course not found.' });
      res.json(updatedCourse);
    } catch (error) {
      res.status(500).json({ message: 'Server error updating course.' });
    }
  });

  app.delete('/api/admin/courses/:id', ensureAdmin, async (req, res) => {
    try {
      const course = await Course.findByIdAndDelete(req.params.id);
      if (!course) return res.status(404).json({ message: 'Course not found.' });
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: 'Server error deleting course.' });
    }
  });

  // --- Batch Routes ---
  app.get('/api/admin/batches', ensureAdmin, async (req, res) => {
    try {
      const batches = await Batch.find().populate('teacherId', 'name').populate('locationId');
      res.json(batches);
    } catch (error) {
      res.status(500).json({ message: 'Server error fetching batches.' });
    }
  });

  app.post('/api/admin/batches', ensureAdmin, async (req, res) => {
    try {
      const newBatch = new Batch(req.body);
      await newBatch.save();
      res.status(201).json(newBatch);
    } catch (error) {
      console.error('Batch creation error:', error);
      res.status(500).json({ message: 'Server error creating batch.' });
    }
  });

  app.put('/api/admin/batches/:id', ensureAdmin, async (req, res) => {
    try {
      const updatedBatch = await Batch.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
      if (!updatedBatch) return res.status(404).json({ message: 'Batch not found.' });
      res.json(updatedBatch);
    } catch (error) {
      res.status(500).json({ message: 'Server error updating batch.' });
    }
  });

  app.delete('/api/admin/batches/:id', ensureAdmin, async (req, res) => {
    try {
      const batch = await Batch.findByIdAndDelete(req.params.id);
      if (!batch) return res.status(404).json({ message: 'Batch not found.' });
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: 'Server error deleting batch.' });
    }
  });

  // --- Location Routes (New) ---
  app.get('/api/admin/locations', ensureAdmin, async (req, res) => {
    try {
      const locations = await Location.find().sort({ name: 1 });
      res.json(locations);
    } catch (error) {
      res.status(500).json({ message: 'Server error fetching locations.' });
    }
  });

  app.post('/api/admin/locations', ensureAdmin, async (req, res) => {
    try {
      const newLocation = new Location(req.body);
      await newLocation.save();
      res.status(201).json(newLocation);
    } catch (error) {
      if (error.code === 11000) return res.status(409).json({ message: 'A location with this address already exists.' });
      res.status(500).json({ message: 'Server error creating location.' });
    }
  });

  app.put('/api/admin/locations/:id', ensureAdmin, async (req, res) => {
    try {
      const updatedLocation = await Location.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
      if (!updatedLocation) return res.status(404).json({ message: 'Location not found.' });
      res.json(updatedLocation);
    } catch (error) {
      if (error.code === 11000) return res.status(409).json({ message: 'A location with this address already exists.' });
      res.status(500).json({ message: 'Server error updating location.' });
    }
  });

  app.delete('/api/admin/locations/:id', ensureAdmin, async (req, res) => {
    try {
      const location = await Location.findByIdAndDelete(req.params.id);
      if (!location) return res.status(404).json({ message: 'Location not found.' });
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: 'Server error deleting location.' });
    }
  });

  // --- Admin Fee Management Routes ---
  app.get('/api/admin/feestructures', ensureAdmin, async (req, res) => {
    try {
      const structures = await FeeStructure.find().sort({ courseName: 1 });
      res.json(structures);
    } catch (error) {
      res.status(500).json({ message: 'Server error fetching fee structures.' });
    }
  });

  app.post('/api/admin/feestructures', ensureAdmin, async (req, res) => {
    try {
      const newStructure = new FeeStructure(req.body);
      await newStructure.save();
      res.status(201).json(newStructure);
    } catch (error) {
      if (error.code === 11000) return res.status(409).json({ message: 'A fee structure for this course already exists.' });
      res.status(500).json({ message: 'Server error creating fee structure.' });
    }
  });

  app.put('/api/admin/feestructures/:id', ensureAdmin, async (req, res) => {
    try {
      const updatedStructure = await FeeStructure.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
      if (!updatedStructure) return res.status(404).json({ message: 'Fee structure not found.' });
      res.json(updatedStructure);
    } catch (error) {
      res.status(500).json({ message: 'Server error updating fee structure.' });
    }
  });

  app.delete('/api/admin/feestructures/:id', ensureAdmin, async (req, res) => {
    try {
      const structure = await FeeStructure.findByIdAndDelete(req.params.id);
      if (!structure) return res.status(404).json({ message: 'Fee structure not found.' });
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: 'Server error deleting fee structure.' });
    }
  });

  app.get('/api/admin/invoices', ensureAdmin, async (req, res) => {
    try {
      const invoices = await Invoice.find().populate('studentId', 'name email').sort({ issueDate: -1 });
      res.json(invoices);
    } catch (error) {
      res.status(500).json({ message: 'Server error fetching invoices.' });
    }
  });

  app.post('/api/admin/invoices/generate', ensureAdmin, async (req, res) => {
    try {
      const feeStructures = await FeeStructure.find();
      const students = await User.find({ role: 'Student', courses: { $exists: true, $not: { $size: 0 } } });
      const structuresMap = new Map(feeStructures.map(fs => [fs.courseName, fs]));

      const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
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

  app.put('/api/admin/invoices/:id/pay', ensureAdmin, async (req, res) => {
    try {
      const paymentDetails = req.body;
      const updatedInvoice = await Invoice.findByIdAndUpdate(
        req.params.id,
        { status: 'Paid', paymentDetails },
        { new: true, runValidators: true }
      ).populate('studentId', 'name email');
      if (!updatedInvoice) return res.status(404).json({ message: 'Invoice not found.' });
      res.json(updatedInvoice);
    } catch (error) {
      res.status(500).json({ message: 'Server error recording payment.' });
    }
  });

  // --- User Notification Routes ---
  app.get('/api/notifications', ensureAuthenticated, async (req, res) => {
    try {
      const notifications = await Notification.find({ userId: req.session.user.id }).sort({ createdAt: -1 });
      res.json(notifications);
    } catch (error) {
      res.status(500).json({ message: 'Server error fetching notifications.' });
    }
  });

  app.put('/api/notifications/:id/read', ensureAuthenticated, async (req, res) => {
    try {
      const notification = await Notification.findOneAndUpdate(
        { _id: req.params.id, userId: req.session.user.id },
        { read: true },
        { new: true }
      );
      if (!notification) return res.status(404).json({ message: 'Notification not found or access denied.' });
      res.json(notification);
    } catch (error) {
      res.status(500).json({ message: 'Server error updating notification.' });
    }
  });

  // --- Student Fee Routes ---
  app.get('/api/invoices', ensureAuthenticated, async (req, res) => {
    try {
      if (req.session.user.role !== 'Student') {
        return res.status(403).json({ message: 'Access denied.' });
      }
      const invoices = await Invoice.find({ studentId: req.session.user.id }).sort({ issueDate: -1 });
      res.json(invoices);
    } catch (error) {
      res.status(500).json({ message: 'Server error fetching your invoices.' });
    }
  });

  app.get('/api/invoices/student/:studentId', ensureAdmin, async (req, res) => {
    try {
      const invoices = await Invoice.find({ studentId: req.params.studentId }).sort({ issueDate: -1 });
      res.json(invoices);
    } catch (error) {
      res.status(500).json({ message: 'Server error fetching student invoices.' });
    }
  });

  // --- Trash Routes ---
  app.get('/api/admin/trash', ensureAdmin, async (req, res) => {
    try {
      const users = await User.find({ isDeleted: true }).select('-password').sort({ deletedAt: -1 });
      res.json(users);
    } catch (error) {
      res.status(500).json({ message: 'Server error fetching trashed users.' });
    }
  });

  app.put('/api/admin/trash/:id/restore', ensureAdmin, async (req, res) => {
    try {
      const user = await User.findByIdAndUpdate(
        req.params.id,
        { isDeleted: false, deletedAt: null },
        { new: true }
      ).select('-password');
      if (!user) return res.status(404).json({ message: 'User not found in trash.' });
      res.json(user);
    } catch (error) {
      res.status(500).json({ message: 'Server error restoring user.' });
    }
  });

  // --- New Content Routes ---
  const createCrudRoutes = (path, model, modelName) => {
    // Targeted content for logged-in user/family
    app.get(`/api/${path}`, ensureAuthenticated, async (req, res) => {
      try {
        const familyMemberIds = await getFamilyMemberIds(req.session.user);
        const items = await model.find({ recipientIds: { $in: familyMemberIds } }).sort({ date: -1, examDate: -1, issuedAt: -1 });
        res.json(items);
      } catch (error) {
        console.error(`Error fetching ${path} for user ${req.session.user.id}:`, error);
        res.status(500).json({ message: `Server error fetching ${path}.` });
      }
    });
    // Admin GET all
    app.get(`/api/admin/${path}`, ensureAdmin, async (req, res) => {
      try {
        const items = await model.find().sort({ date: -1, examDate: -1, issuedAt: -1 });
        res.json(items);
      } catch (error) {
        res.status(500).json({ message: `Server error fetching ${path}.` });
      }
    });
    // Admin POST
    app.post(`/api/admin/${path}`, ensureAdmin, async (req, res) => {
      try {
        const newItem = new model(req.body);
        await newItem.save();
        res.status(201).json(newItem);
      } catch (error) {
        res.status(500).json({ message: `Server error creating ${modelName}.` });
      }
    });
    // Admin PUT
    app.put(`/api/admin/${path}/:id`, ensureAdmin, async (req, res) => {
      try {
        const updatedItem = await model.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
        if (!updatedItem) return res.status(404).json({ message: `${modelName} not found.` });
        res.json(updatedItem);
      } catch (error) {
        res.status(500).json({ message: `Server error updating ${modelName}.` });
      }
    });
    // Admin DELETE
    app.delete(`/api/admin/${path}/:id`, ensureAdmin, async (req, res) => {
      try {
        const item = await model.findByIdAndDelete(req.params.id);
        if (!item) return res.status(404).json({ message: `${modelName} not found.` });
        res.status(204).send();
      } catch (error) {
        res.status(500).json({ message: `Server error deleting ${modelName}.` });
      }
    });
  };

  createCrudRoutes('events', Event, 'Event');
  createCrudRoutes('grade-exams', GradeExam, 'Grade Exam');
  createCrudRoutes('book-materials', BookMaterial, 'Book Material');
  createCrudRoutes('notices', Notice, 'Notice');

  // New combined endpoint for sending content notifications and assigning recipients
  app.post('/api/admin/content/send', ensureAdmin, async (req, res) => {
    const { contentId, contentType, userIds, subject, message, sendWhatsApp } = req.body;
    if (!contentId || !contentType || !userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ message: 'Content ID, type, and recipient IDs are required.' });
    }

    const dbSession = await mongoose.startSession();
    dbSession.startTransaction();

    try {
      const models = { Event, GradeExam, BookMaterial, Notice };
      const Model = models[contentType];
      if (!Model) {
        await dbSession.abortTransaction();
        return res.status(400).json({ message: 'Invalid content type.' });
      }

      // Step 1: Add recipients to the content item
      await Model.findByIdAndUpdate(
        contentId,
        { $addToSet: { recipientIds: { $each: userIds } } },
        { session: dbSession }
      );

      // Step 2: Send notifications
      const users = await User.find({ '_id': { $in: userIds } }).select('email name contactNumber').session(dbSession);
      if (users.length > 0) {
        const notificationsToSave = users.map(user => ({ userId: user._id, subject, message }));
        await Notification.insertMany(notificationsToSave, { session: dbSession });

        if (mailTransporter) {
          for (const user of users) {
            const mailDetails = {
              from: process.env.SMTP_FROM_EMAIL || '"Nadanaloga Admin" <no-reply@nadanaloga.com>',
              to: user.email,
              subject: subject,
              html: createEmailTemplate(user.name, subject, message),
            };
            mailTransporter.sendMail(mailDetails).catch(err => console.error(`[Email] Error sending to ${user.email}:`, err));
          }
        }
      }

      // Step 3: (Mock) Send WhatsApp notifications if requested
      let whatsAppSentCount = 0;
      if (sendWhatsApp) {
        console.log('\n--- 📱 WHATSAPP SIMULATION ---');
        for (const user of users) {
          const phoneNumber = user.contactNumber?.replace(/[\s+\-()]/g, '');
          if (phoneNumber) {
            const whatsAppMessage = `Hi ${user.name}, you have a new notification from Nadanaloga: ${subject}`;
            console.log(`[WhatsApp Mock] Queued message for ${user.name} at ${phoneNumber}. Message: "${whatsAppMessage}"`);
            whatsAppSentCount++;
          } else {
            console.log(`[WhatsApp Mock] SKIPPED: User ${user.name} has no contact number.`);
          }
        }
        console.log('-----------------------------\n');
      }

      let successMessage = `Content assigned and notifications sent to ${users.length} recipients.`;
      if (sendWhatsApp) {
        successMessage += ` ${whatsAppSentCount} WhatsApp messages were queued for delivery.`;
      }

      await dbSession.commitTransaction();
      res.status(200).json({ success: true, message: successMessage });
    } catch (error) {
      await dbSession.abortTransaction();
      console.error('Content send error:', error);
      res.status(500).json({ message: 'Server error assigning content.' });
    } finally {
      dbSession.endSession();
    }
  });


// --- Start Server (local) or export for Vercel ---
if (process.env.VERCEL) {
  // On Vercel: export a serverless handler
  module.exports = serverless(app);
} else {
  // Local dev
  app.listen(PORT, () => {
    console.log(`[Server] Listening on ${PORT}`);
    // kick off setup in background for local
    ensureSetupOnce().catch(err => console.error('Setup error:', err));
  });
}