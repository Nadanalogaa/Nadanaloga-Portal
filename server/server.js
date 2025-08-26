// server.js
// Works in three environments with one file:
// - Local:        node server.js            (listens on PORT or 4000)
// - Cloud Run:    container listens on PORT (8080 provided by platform)
// - Vercel:       put at api/server.js; exports the app (no app.listen)

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');

// ---------- ENV & RUNTIME FLAGS ----------
dotenv.config();
const isProd = process.env.NODE_ENV === 'production';
const isVercel = !!process.env.VERCEL;
const PORT = process.env.PORT || 4000;

// ---------- EXPRESS APP (create ASAP) ----------
const app = express();
app.set('etag', false);
app.disable('x-powered-by');
// Always trust proxy (Cloud Run / proxies) so secure cookies work correctly
app.set('trust proxy', 1);

// Simple health endpoints (Cloud Run friendly)
app.get('/healthz', (_req, res) => res.status(200).send('ok'));
app.get('/', (_req, res) => res.status(200).send('Nadanaloga API is up'));

// ---------- BODY PARSERS ----------
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ limit: '100mb', extended: true }));

// ---------- CORS ----------
const STATIC_LOCAL_ORIGINS = new Set([
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:5500',
  'http://127.0.0.1:5500',
]);

// Build allowed origin set dynamically
const allowedOrigins = new Set([
  process.env.CLIENT_URL,           // your frontend (set in .env)
  process.env.FRONTEND_URL,         // optional alt
  process.env.ORIGIN,               // optional alt
].filter(Boolean));

// If running on Vercel, allow that deployment URL too
if (process.env.VERCEL_URL) {
  allowedOrigins.add(`https://${process.env.VERCEL_URL}`);
}

const isAllowedOrigin = (origin) => {
  if (!origin) return true; // tools / curl
  try {
    const u = new URL(origin);
    if (STATIC_LOCAL_ORIGINS.has(origin)) return true;
    if (allowedOrigins.has(origin)) return true;
    // Allow any *.vercel.app (useful if preview deploys)
    if (u.hostname.endsWith('.vercel.app')) return true;
    return false;
  } catch {
    return false;
  }
};

app.use(cors({
  origin: (origin, cb) => {
    if (isAllowedOrigin(origin)) return cb(null, true);
    console.error(`[CORS] Blocked origin: ${origin}`);
    cb(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization'],
}));
app.options('*', cors());

// ---------- SESSIONS ----------
const cookieSameSite = (process.env.COOKIE_SAMESITE || (isProd ? 'none' : 'lax')).toLowerCase();
// In production we usually need secure cookies (HTTPS). You can override with COOKIE_SECURE=false if needed.
const cookieSecure = (process.env.COOKIE_SECURE ? process.env.COOKIE_SECURE === 'true' : isProd);

app.use(session({
  name: 'connect.sid',
  secret: process.env.SESSION_SECRET || 'a-secure-secret-key',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ mongoUrl: process.env.MONGO_URI }),
  cookie: {
    maxAge: 1000 * 60 * 60 * 24, // 1 day
    httpOnly: true,
    secure: cookieSecure,
    sameSite: cookieSameSite, // 'none' for cross-site, 'lax' for local
  },
}));

// ---------- UTIL ----------
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
  if (!req.session.user) return res.status(401).json({ message: 'Unauthorized' });
  if (req.session.user.role === 'Admin') return next();
  res.status(403).json({ message: 'Forbidden: Administrative privileges required.' });
};

// ---------- DB MODELS ----------
const locationSchema = new mongoose.Schema({
  name: { type: String, required: true },
  address: { type: String, required: true, unique: true },
});
locationSchema.virtual('id').get(function () { return this._id.toHexString(); });
locationSchema.set('toJSON', { virtuals: true, transform: (_doc, ret) => { delete ret._id; delete ret.__v; } });
const Location = mongoose.model('Location', locationSchema);

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email:{ type: String, required: true, unique: true },
  password:{ type: String, required: true },
  role:  { type: String, required: true, enum: ['Student','Teacher','Admin'] },
  classPreference: { type: String, enum: ['Online','Offline','Hybrid'] },

  photoUrl: { type: String },
  dob: { type: String },
  sex: { type: String, enum: ['Male','Female','Other'] },
  contactNumber: { type: String },
  alternateContactNumber: { type: String },
  address: { type: String },
  schedules: { type: [{ course:String, timing:String, teacherId:String, _id:false }] },
  documents: { type: [{ name:String, mimeType:String, data:String, _id:false }] },
  dateOfJoining: { type: String },
  country:String, state:String, city:String, postalCode:String, timezone:String,
  preferredTimings: { type: [String] },
  status: { type: String, enum: ['Active','Inactive','On Hold','Graduated'], default: 'Active' },
  locationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Location' },

  // Student
  courses: { type: [String] },
  fatherName: String,
  standard: String,
  schoolName: String,
  grade: { type: String, enum: ['Grade 1','Grade 2','Grade 3'] },
  notes: String,

  // Teacher
  courseExpertise: { type: [String] },
  educationalQualifications: String,
  employmentType: { type: String, enum: ['Part-time','Full-time'] },
  yearsOfExperience: Number,
  availableTimeSlots: { type: [String] },

  isDeleted: { type: Boolean, default: false },
  deletedAt: { type: Date, default: null },
});
userSchema.virtual('id').get(function () { return this._id.toHexString(); });
userSchema.set('toJSON', { virtuals: true, transform: (_doc, ret) => {
  delete ret._id; delete ret.__v;
  if (ret.locationId) { ret.location = ret.locationId; delete ret.locationId; }
}});
const User = mongoose.model('User', userSchema);

const contactSchema = new mongoose.Schema({
  name:{ type:String, required:true },
  email:{ type:String, required:true },
  message:{ type:String, required:true },
  createdAt:{ type:Date, default: Date.now }
});
const Contact = mongoose.model('Contact', contactSchema);

const courseSchema = new mongoose.Schema({
  name:{ type:String, required:true },
  description:{ type:String, required:true },
  icon:{ type:String, required:true }
});
courseSchema.virtual('id').get(function () { return this._id.toHexString(); });
courseSchema.set('toJSON', { virtuals:true, transform:(_d,ret)=>{ delete ret._id; delete ret.__v; }});
const Course = mongoose.model('Course', courseSchema);

const notificationSchema = new mongoose.Schema({
  userId:{ type: mongoose.Schema.Types.ObjectId, ref:'User', required:true },
  subject:{ type:String, required:true },
  message:{ type:String, required:true },
  read:{ type:Boolean, default:false },
  link:{ type:String },
  createdAt:{ type:Date, default: Date.now }
});
notificationSchema.virtual('id').get(function () { return this._id.toHexString(); });
notificationSchema.set('toJSON',{ virtuals:true, transform:(_d,ret)=>{ delete ret._id; delete ret.__v; }});
const Notification = mongoose.model('Notification', notificationSchema);

const batchScheduleSchema = new mongoose.Schema({
  timing:{ type:String, required:true },
  studentIds:[{ type: mongoose.Schema.Types.ObjectId, ref:'User' }]
},{ _id:false });

const batchSchema = new mongoose.Schema({
  name:{ type:String, required:true },
  description:String,
  courseId:{ type: mongoose.Schema.Types.ObjectId, ref:'Course', required:true },
  courseName:{ type:String, required:true },
  teacherId:{ type: mongoose.Schema.Types.ObjectId, ref:'User' },
  schedule:[batchScheduleSchema],
  mode:{ type:String, enum:['Online','Offline'] },
  locationId:{ type: mongoose.Schema.Types.ObjectId, ref:'Location' },
});
batchSchema.virtual('id').get(function () { return this._id.toHexString(); });
batchSchema.set('toJSON',{ virtuals:true, transform:(_d,ret)=>{
  delete ret._id; delete ret.__v;
  if (ret.locationId) { ret.location = ret.locationId; delete ret.locationId; }
}});
const Batch = mongoose.model('Batch', batchSchema);

const feeStructureSchema = new mongoose.Schema({
  courseId:{ type: mongoose.Schema.Types.ObjectId, ref:'Course', required:true, unique:true },
  courseName:{ type:String, required:true },
  amount:{ type:Number, required:true },
  currency:{ type:String, required:true, enum:['INR','USD'] },
  billingCycle:{ type:String, required:true, enum:['Monthly','Quarterly','Annually'] },
});
feeStructureSchema.virtual('id').get(function () { return this._id.toHexString(); });
feeStructureSchema.set('toJSON',{ virtuals:true, transform:(_d,ret)=>{ delete ret._id; delete ret.__v; }});
const FeeStructure = mongoose.model('FeeStructure', feeStructureSchema);

const paymentDetailsSchema = new mongoose.Schema({
  paymentDate:{ type:Date, required:true },
  amountPaid:{ type:Number, required:true },
  paymentMethod:{ type:String, required:true, enum:['Cash','Bank Transfer','UPI','Card'] },
  referenceNumber:String,
  notes:String,
},{ _id:false });

const invoiceSchema = new mongoose.Schema({
  studentId:{ type: mongoose.Schema.Types.ObjectId, ref:'User', required:true },
  feeStructureId:{ type: mongoose.Schema.Types.ObjectId, ref:'FeeStructure', required:true },
  courseName:{ type:String, required:true },
  amount:{ type:Number, required:true },
  currency:{ type:String, required:true },
  issueDate:{ type:Date, required:true },
  dueDate:{ type:Date, required:true },
  billingPeriod:{ type:String, required:true },
  status:{ type:String, required:true, enum:['Pending','Paid','Overdue'], default:'Pending' },
  paymentDetails: paymentDetailsSchema,
});
invoiceSchema.virtual('id').get(function(){ return this._id.toHexString(); });
invoiceSchema.set('toJSON',{ virtuals:true, transform:(_d,ret)=>{
  delete ret._id; delete ret.__v;
  if (ret.studentId && typeof ret.studentId === 'object') {
    ret.student = { id:ret.studentId.id, name:ret.studentId.name, email:ret.studentId.email };
    delete ret.studentId;
  }
}});
const Invoice = mongoose.model('Invoice', invoiceSchema);

// Content schemas
const eventSchema = new mongoose.Schema({
  title:{ type:String, required:true },
  description:{ type:String, required:true },
  date:{ type:Date, required:true },
  location:{ type:String, required:true },
  isOnline:{ type:Boolean, default:false },
  recipientIds:[{ type: mongoose.Schema.Types.ObjectId, ref:'User' }],
});
eventSchema.virtual('id').get(function(){ return this._id.toHexString(); });
eventSchema.set('toJSON',{ virtuals:true, transform:(_d,ret)=>{ delete ret._id; delete ret.__v; }});
const Event = mongoose.model('Event', eventSchema);

const gradeExamSchema = new mongoose.Schema({
  title:{ type:String, required:true },
  description:{ type:String, required:true },
  examDate:{ type:Date, required:true },
  registrationDeadline:{ type:Date, required:true },
  syllabusLink:String,
  recipientIds:[{ type: mongoose.Schema.Types.ObjectId, ref:'User' }],
});
gradeExamSchema.virtual('id').get(function(){ return this._id.toHexString(); });
gradeExamSchema.set('toJSON',{ virtuals:true, transform:(_d,ret)=>{ delete ret._id; delete ret.__v; }});
const GradeExam = mongoose.model('GradeExam', gradeExamSchema);

const bookMaterialSchema = new mongoose.Schema({
  title:{ type:String, required:true },
  description:{ type:String, required:true },
  courseId:{ type: mongoose.Schema.Types.ObjectId, ref:'Course', required:true },
  courseName:{ type:String, required:true },
  type:{ type:String, required:true, enum:['PDF','Video','YouTube'] },
  url:{ type:String, required:true },
  data:String,
  recipientIds:[{ type: mongoose.Schema.Types.ObjectId, ref:'User' }],
});
bookMaterialSchema.virtual('id').get(function(){ return this._id.toHexString(); });
bookMaterialSchema.set('toJSON',{ virtuals:true, transform:(_d,ret)=>{ delete ret._id; delete ret.__v; }});
const BookMaterial = mongoose.model('BookMaterial', bookMaterialSchema);

const noticeSchema = new mongoose.Schema({
  title:{ type:String, required:true },
  content:{ type:String, required:true },
  issuedAt:{ type:Date, default: Date.now },
  recipientIds:[{ type: mongoose.Schema.Types.ObjectId, ref:'User' }],
});
noticeSchema.virtual('id').get(function(){ return this._id.toHexString(); });
noticeSchema.set('toJSON',{ virtuals:true, transform:(_d,ret)=>{ delete ret._id; delete ret.__v; }});
const Notice = mongoose.model('Notice', noticeSchema);

// ---------- EMAIL (helper) ----------
const createEmailTemplate = (name, subject, message) => {
  const year = new Date().getFullYear();
  const logoUrl = 'https://i.ibb.co/9v0Gk5v/nadanaloga-logo-email.png';
  const brandColorDark = '#333333';
  const backgroundColor = '#f4f5f7';
  const contentBackgroundColor = '#ffffff';
  const primaryTextColor = '#333333';
  const secondaryTextColor = '#555555';
  return `
<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;700&display=swap" rel="stylesheet">
<style>body{margin:0;padding:0;word-spacing:normal}table,td,div,h1,p{font-family:'Poppins',Arial,sans-serif}</style></head>
<body style="margin:0;padding:0;background-color:${backgroundColor};"><table role="presentation" style="width:100%;border-collapse:collapse;border:0;border-spacing:0;">
<tr><td align="center" style="padding:20px;">
<table role="presentation" style="max-width:602px;width:100%;border-collapse:collapse;border:1px solid #cccccc;border-spacing:0;text-align:left;background:${contentBackgroundColor};border-radius:8px;overflow:hidden;">
<tr><td align="center" style="padding:25px 0;border-bottom:1px solid #eeeeee;"><img src="${logoUrl}" alt="Nadanaloga Logo" width="250" style="height:auto;display:block" /></td></tr>
<tr><td style="padding:36px 30px 42px 30px;"><table role="presentation" style="width:100%;border-collapse:collapse;border:0;border-spacing:0;">
<tr><td style="padding:0 0 20px 0;"><h1 style="font-size:24px;margin:0;font-weight:700;color:${primaryTextColor};">${subject}</h1></td></tr>
<tr><td style="padding:0;"><p style="margin:0 0 12px 0;font-size:16px;line-height:24px;color:${secondaryTextColor};">Dear ${name},</p>
<div style="font-size:16px;line-height:24px;color:${secondaryTextColor};">${(message||'').replace(/\n/g,'<br>')}</div></td></tr>
<tr><td style="padding:30px 0 0 0;"><p style="margin:0;font-size:16px;line-height:24px;color:${secondaryTextColor};">Sincerely,</p>
<p style="margin:0;font-size:16px;line-height:24px;color:${secondaryTextColor};">The Nadanaloga Team</p></td></tr>
</table></td></tr>
<tr><td style="padding:30px;background:${brandColorDark};"><table role="presentation" style="width:100%;border-collapse:collapse;border:0;border-spacing:0;font-size:14px;color:#ffffff;">
<tr><td style="padding:0;width:50%;" align="left"><p style="margin:0">&copy; ${year} Nadanaloga.com</p></td>
<td style="padding:0;width:50%;" align="right"><p style="margin:0">contact@nadanaloga.com</p></td></tr></table></td></tr>
</table></td></tr></table></body></html>`;
};

let mailTransporter = null;
let isEtherealMode = false;

// ---------- FAMILY HELPERS ----------
const getFamilyMemberIds = async (sessionUser) => {
  if (sessionUser.role === 'Teacher') return [sessionUser.id];
  const loggedInEmail = sessionUser.email.toLowerCase();
  const [local, domain] = loggedInEmail.split('@');
  if (!domain) return [sessionUser.id];
  const base = local.split('+')[0];
  const emailRegex = new RegExp(`^${base.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\$&')}(\\+.+)?@${domain.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\$&')}$`, 'i');
  const familyMembers = await User.find({ email: emailRegex, role: 'Student' }).select('_id');
  const set = new Set(familyMembers.map(m => m._id.toString()));
  set.add(sessionUser.id);
  return Array.from(set);
};

// ---------- ROUTES ----------
app.post('/api/users/check-email', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email is required.' });
    const user = await User.findOne({ email: email.toLowerCase() });
    res.json({ exists: !!user });
  } catch {
    res.status(500).json({ message: 'Server error checking email.' });
  }
});

app.post('/api/register', async (req, res) => {
  const dbSession = await mongoose.startSession();
  dbSession.startTransaction();
  try {
    const usersData = req.body;
    if (!Array.isArray(usersData) || usersData.length === 0) throw new Error('Registration data must be a non-empty array of users.');
    const emails = usersData.map(u => u.email.toLowerCase());
    if (new Set(emails).size !== emails.length) throw new Error('Duplicate emails found in the registration request.');

    const existingUsers = await User.find({ email: { $in: emails } }).session(dbSession);
    if (existingUsers.length > 0) {
      const existingEmail = existingUsers[0].email;
      throw new Error(`The email "${existingEmail}" is already registered. Please try logging in or use a different email.`);
    }
    const adminUser = await User.findOne({ role: 'Admin' }).session(dbSession);

    for (const userData of usersData) {
      const { password, ...rest } = userData;
      if (!password) throw new Error(`Password is required for user ${rest.email}.`);
      const hashed = await bcrypt.hash(password, 10);
      const finalData = { ...rest, email: rest.email.toLowerCase(), password: hashed, dateOfJoining: rest.dateOfJoining || new Date().toISOString() };
      const user = new User(finalData);
      await user.save({ session: dbSession });

      if (user.role === 'Student' && adminUser && mailTransporter) {
        const subject = `New Student Registration: ${user.name}`;
        const emailMessageForAdmin = `Hello Admin,<br><br>A new student has registered on Nadanaloga.<br><br><b>Name:</b> ${user.name}<br><b>Email:</b> ${user.email}`;
        const mailDetails = {
          from: process.env.SMTP_FROM_EMAIL || '"Nadanaloga Admin" <no-reply@nadanaloga.com>',
          to: adminUser.email,
          subject,
          html: createEmailTemplate('Admin', subject, emailMessageForAdmin),
        };
        mailTransporter.sendMail(mailDetails).catch(err => console.error('[Email] Error sending admin notice:', err));
      }

      if (adminUser) {
        await new Notification({
          userId: adminUser._id, subject: `New Student Registration: ${user.name}`,
          message: `${user.name} (from parent: ${user.fatherName || '-'}) has registered. Click to view their profile.`,
          link: `/admin/student/${user.id}`
        }).save({ session: dbSession });
      }
    }

    await dbSession.commitTransaction();
    res.status(201).json({ message: 'Registration successful' });
  } catch (error) {
    await dbSession.abortTransaction();
    const msg = error.code === 11000 ? 'An email in the registration list is already in use.' : (error.message || 'Server error during registration.');
    res.status(error.code === 11000 ? 409 : 500).json({ message: msg });
  } finally {
    dbSession.endSession();
  }
});

app.post('/api/admin/register', async (req, res) => {
  try {
    const { name, email, password, contactNumber } = req.body;
    if (!name || !email || !password || !contactNumber) return res.status(400).json({ message: 'All fields are required.' });
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) return res.status(409).json({ message: 'This email is already registered.' });
    const hashed = await bcrypt.hash(password, 10);
    await new User({ name, email: email.toLowerCase(), password: hashed, contactNumber, role:'Admin', status:'Active', dateOfJoining: new Date().toISOString() }).save();
    res.status(201).json({ message: 'Admin registration successful. Please log in.' });
  } catch (e) {
    console.error('Admin registration error:', e);
    res.status(500).json({ message: 'Server error during admin registration.' });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const userDoc = await User.findOne({ email: email.toLowerCase() });
    if (!userDoc) return res.status(401).json({ message: 'Invalid email or password.' });
    const ok = await bcrypt.compare(password, userDoc.password);
    if (!ok) return res.status(401).json({ message: 'Invalid email or password.' });
    const user = userDoc.toJSON(); delete user.password;
    req.session.user = user;
    req.session.save((err) => {
      if (err) return res.status(500).json({ message: 'Server error during login session setup.' });
      noStore(res);
      res.json(user);
    });
  } catch {
    res.status(500).json({ message: 'Server error during login.' });
  }
});

app.get('/api/session', (req, res) => {
  noStore(res);
  return res.status(200).json(req.session.user || null);
});

app.post('/api/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) return res.status(500).json({ message: 'Could not log out.' });
    res.clearCookie('connect.sid', {
      httpOnly: true,
      sameSite: cookieSameSite,
      secure: cookieSecure,
      path: '/'
    });
    noStore(res);
    res.status(200).json({ message: 'Logout successful' });
  });
});

app.post('/api/contact', async (req, res) => {
  try { const { name, email, message } = req.body; await new Contact({ name, email, message }).save(); res.json({ success:true }); }
  catch { res.status(500).json({ message:'Failed to submit message.' }); }
});

app.get('/api/courses', async (_req, res) => {
  try { res.json(await Course.find()); }
  catch { res.status(500).json({ message:'Server error fetching courses.' }); }
});

// Public
app.get('/api/locations', async (_req, res) => {
  try { res.json(await Location.find().sort({ name:1 })); }
  catch { res.status(500).json({ message:'Server error fetching locations.' }); }
});

app.put('/api/profile', ensureAuthenticated, async (req, res) => {
  try {
    const userId = req.session.user.id;
    const { password, role, email, ...updateData } = req.body;
    const idToUpdate = updateData.id || userId;
    const updated = await User.findByIdAndUpdate(idToUpdate, updateData, { new:true, runValidators:true });
    if (!updated) return res.status(404).json({ message:'User not found.' });
    const clean = updated.toJSON(); delete clean.password;
    if (idToUpdate === userId) req.session.user = clean;
    res.json(clean);
  } catch (e) {
    console.error('Profile update error:', e);
    res.status(500).json({ message:'Server error updating profile.' });
  }
});

app.get('/api/student/enrollments', ensureAuthenticated, async (req, res) => {
  try {
    const studentId = req.session.user.id;
    if (req.session.user.role !== 'Student') return res.status(403).json({ message:'Access denied. This is a student-only endpoint.' });
    const enrolledBatches = await Batch.find({ 'schedule.studentIds': studentId }).populate('teacherId','name').populate('locationId').lean();
    if (!enrolledBatches) return res.json([]);
    const details = enrolledBatches.map(batch => {
      const inBatch = batch.schedule.filter(s => s.studentIds.some(id => id.equals(studentId)));
      if (inBatch.length === 0) return null;
      const teacherInfo = batch.teacherId ? { id: batch.teacherId._id.toHexString(), name: batch.teacherId.name } : null;
      return { batchName: batch.name, courseName: batch.courseName, timings: inBatch.map(e => e.timing), teacher: teacherInfo, mode: batch.mode, location: batch.locationId };
    }).filter(Boolean);
    res.json(details);
  } catch (e) {
    console.error('Error fetching student enrollments:', e);
    res.status(500).json({ message:'Server error fetching your enrollment data.' });
  }
});

app.get('/api/family/students', ensureAuthenticated, async (req, res) => {
  try {
    const loggedInEmail = req.session.user.email.toLowerCase();
    const parts = loggedInEmail.split('@'); if (parts.length < 2) return res.status(400).json({ message:'Invalid email format in session.' });
    const base = parts[0].split('+')[0]; const domain = parts[1];
    const emailRegex = new RegExp(`^${base.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\$&')}(\\+.+)?@${domain.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\$&')}$`, 'i');
    const familyMembers = await User.find({ email: emailRegex, role:'Student' }).select('-password').populate('locationId').sort({ email:1 });
    if (!familyMembers || familyMembers.length === 0) {
      const self = await User.findById(req.session.user.id).select('-password');
      return res.json(self ? [self] : []);
    }
    res.json(familyMembers);
  } catch (e) {
    console.error('Error fetching family students:', e);
    res.status(500).json({ message:'Server error fetching family members.' });
  }
});

const ensureStudentInFamily = async (req, res, next) => {
  try {
    const loggedInEmail = req.session.user.email.toLowerCase();
    const [local, domain] = loggedInEmail.split('@');
    const base = local.split('+')[0];
    const emailRegex = new RegExp(`^${base.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\$&')}(\\+.+)?@${domain.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\$&')}$`, 'i');
    const student = await User.findById(req.params.studentId);
    if (!student || student.role !== 'Student' || !emailRegex.test(student.email)) {
      return res.status(403).json({ message:'Forbidden: You do not have permission to access this student\'s data.' });
    }
    req.student = student;
    next();
  } catch {
    res.status(500).json({ message:'Server error during authorization.' });
  }
};

app.get('/api/family/students/:studentId/invoices', ensureAuthenticated, ensureStudentInFamily, async (req, res) => {
  try { res.json(await Invoice.find({ studentId: req.params.studentId }).sort({ issueDate:-1 })); }
  catch { res.status(500).json({ message:'Server error fetching invoices.' }); }
});

app.get('/api/family/students/:studentId/enrollments', ensureAuthenticated, ensureStudentInFamily, async (req, res) => {
  try {
    const studentId = req.params.studentId;
    const enrolled = await Batch.find({ 'schedule.studentIds': studentId }).populate('teacherId','name').populate('locationId').lean();
    if (!enrolled) return res.json([]);
    const details = enrolled.map(batch => {
      const inBatch = batch.schedule.filter(s => s.studentIds.some(id => id.equals(studentId)));
      if (inBatch.length === 0) return null;
      const teacherInfo = batch.teacherId ? { id: batch.teacherId._id.toHexString(), name: batch.teacherId.name } : null;
      return { batchName: batch.name, courseName: batch.courseName, timings: inBatch.map(e => e.timing), teacher: teacherInfo, mode: batch.mode, location: batch.locationId };
    }).filter(Boolean);
    res.json(details);
  } catch (e) {
    console.error('Error fetching student enrollments:', e);
    res.status(500).json({ message:'Server error fetching enrollment data.' });
  }
});

// Admin
app.get('/api/admin/stats', ensureAdmin, async (_req, res) => {
  try {
    const studentCount = await User.countDocuments({ role:'Student', isDeleted: { $ne:true } });
    const teacherCount = await User.countDocuments({ role:'Teacher', isDeleted: { $ne:true } });
    const onlinePreference = await User.countDocuments({ role: { $ne:'Admin' }, classPreference:'Online', isDeleted: { $ne:true } });
    const offlinePreference = await User.countDocuments({ role: { $ne:'Admin' }, classPreference:'Offline', isDeleted: { $ne:true } });
    res.json({ totalUsers: studentCount + teacherCount, studentCount, teacherCount, onlinePreference, offlinePreference });
  } catch {
    res.status(500).json({ message:'Server error fetching stats.' });
  }
});

app.get('/api/admin/users', ensureAdmin, async (_req, res) => {
  try { res.json(await User.find({ role:{ $ne:'Admin' }, isDeleted:{ $ne:true } }).select('-password').populate('locationId')); }
  catch { res.status(500).json({ message:'Server error fetching users.' }); }
});

app.get('/api/admin/users/:id', ensureAdmin, async (req, res) => {
  try {
    const user = await User.findOne({ _id:req.params.id, isDeleted:{ $ne:true } }).select('-password').populate('locationId');
    if (!user) return res.status(404).json({ message:'User not found.' });
    res.json(user);
  } catch (e) {
    console.error('Admin get user by ID error:', e);
    res.status(500).json({ message:'Server error fetching user.' });
  }
});

app.post('/api/admin/users', ensureAdmin, async (req, res) => {
  try {
    const { password, ...userData } = req.body;
    if (!userData.email) return res.status(400).json({ message:'Email is required.' });
    const existing = await User.findOne({ email: userData.email.toLowerCase() });
    if (existing) return res.status(409).json({ message:'This email is already in use.' });
    const effectivePassword = password || 'password123';
    const hashed = await bcrypt.hash(effectivePassword, 10);
    const user = new User({ ...userData, email:userData.email.toLowerCase(), password: hashed });
    await user.save();
    const newUserDoc = await User.findById(user._id).select('-password');
    res.status(201).json(newUserDoc.toJSON());
  } catch (e) {
    if (e.code === 11000) return res.status(409).json({ message:'This email is already in use.' });
    console.error('Admin create user error:', e);
    res.status(500).json({ message:'Server error during user creation.' });
  }
});

app.put('/api/admin/users/:id', ensureAdmin, async (req, res) => {
  try {
    const { password, ...updateData } = req.body;
    if (updateData.email) {
      const existing = await User.findOne({ email: updateData.email.toLowerCase(), _id: { $ne: req.params.id } });
      if (existing) return res.status(409).json({ message:'This email is already in use by another account.' });
    }
    const user = await User.findByIdAndUpdate(req.params.id, updateData, { new:true, runValidators:true }).select('-password');
    if (!user) return res.status(404).json({ message:'User not found.' });
    res.json(user);
  } catch (e) {
    if (e.code === 11000) return res.status(409).json({ message:'This email is already in use by another account.' });
    res.status(500).json({ message:'Server error updating user.' });
  }
});

app.delete('/api/admin/users/:id', ensureAdmin, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, { isDeleted:true, deletedAt:new Date() }, { new:true });
    if (!user) return res.status(404).json({ message:'User not found.' });
    res.status(204).send();
  } catch {
    res.status(500).json({ message:'Server error deleting user.' });
  }
});

app.delete('/api/admin/users/:id/permanent', ensureAdmin, async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ message:'User not found in trash.' });
    res.status(204).send();
  } catch {
    res.status(500).json({ message:'Server error permanently deleting user.' });
  }
});

app.post('/api/admin/notifications', ensureAdmin, async (req, res) => {
  const { userIds, subject, message } = req.body;
  if (!userIds || !Array.isArray(userIds) || userIds.length === 0) return res.status(400).json({ message:'User IDs are required.' });
  if (!subject || !message) return res.status(400).json({ message:'Subject and message are required.' });
  try {
    const users = await User.find({ _id: { $in: userIds } }).select('email name');
    if (users.length === 0) return res.status(404).json({ message:'No valid recipient users found.' });
    await Notification.insertMany(users.map(u => ({ userId:u._id, subject, message })));
    if (mailTransporter) {
      for (const u of users) {
        const mailDetails = {
          from: process.env.SMTP_FROM_EMAIL || '"Nadanaloga Admin" <no-reply@nadanaloga.com>',
          to: u.email, subject, html: createEmailTemplate(u.name, subject, message)
        };
        mailTransporter.sendMail(mailDetails).catch(err => console.error(`[Email] Error to ${u.email}:`, err));
      }
    }
    res.json({ success:true, message:'Notification sent and stored successfully.' });
  } catch (e) {
    console.error('Notification error:', e);
    res.status(500).json({ message:'Server error sending notification.' });
  }
});

app.get('/api/admin/courses', ensureAdmin, async (_req,res)=> {
  try { res.json(await Course.find()); } catch { res.status(500).json({ message:'Server error fetching courses.' }); }
});
app.post('/api/admin/courses', ensureAdmin, async (req,res)=> {
  try { const { name, description, icon } = req.body; const c = new Course({ name, description, icon }); await c.save(); res.status(201).json(c); }
  catch { res.status(500).json({ message:'Server error creating course.' }); }
});
app.put('/api/admin/courses/:id', ensureAdmin, async (req,res)=> {
  try { const { name, description, icon } = req.body; const c = await Course.findByIdAndUpdate(req.params.id, { name, description, icon }, { new:true, runValidators:true }); if (!c) return res.status(404).json({ message:'Course not found.' }); res.json(c); }
  catch { res.status(500).json({ message:'Server error updating course.' }); }
});
app.delete('/api/admin/courses/:id', ensureAdmin, async (req,res)=> {
  try { const c = await Course.findByIdAndDelete(req.params.id); if (!c) return res.status(404).json({ message:'Course not found.' }); res.status(204).send(); }
  catch { res.status(500).json({ message:'Server error deleting course.' }); }
});

// Batches
app.get('/api/admin/batches', ensureAdmin, async (_req,res)=> {
  try { res.json(await Batch.find().populate('teacherId','name').populate('locationId')); }
  catch { res.status(500).json({ message:'Server error fetching batches.' }); }
});
app.post('/api/admin/batches', ensureAdmin, async (req,res)=> {
  try { const b = new Batch(req.body); await b.save(); res.status(201).json(b); }
  catch (e) { console.error('Batch creation error:', e); res.status(500).json({ message:'Server error creating batch.' }); }
});
app.put('/api/admin/batches/:id', ensureAdmin, async (req,res)=> {
  try { const b = await Batch.findByIdAndUpdate(req.params.id, req.body, { new:true, runValidators:true }); if (!b) return res.status(404).json({ message:'Batch not found.' }); res.json(b); }
  catch { res.status(500).json({ message:'Server error updating batch.' }); }
});
app.delete('/api/admin/batches/:id', ensureAdmin, async (req,res)=> {
  try { const b = await Batch.findByIdAndDelete(req.params.id); if (!b) return res.status(404).json({ message:'Batch not found.' }); res.status(204).send(); }
  catch { res.status(500).json({ message:'Server error deleting batch.' }); }
});

// Locations
app.get('/api/admin/locations', ensureAdmin, async (_req,res)=> {
  try { res.json(await Location.find().sort({ name:1 })); }
  catch { res.status(500).json({ message:'Server error fetching locations.' }); }
});
app.post('/api/admin/locations', ensureAdmin, async (req,res)=> {
  try { const l = new Location(req.body); await l.save(); res.status(201).json(l); }
  catch (e) { if (e.code===11000) return res.status(409).json({ message:'A location with this address already exists.' }); res.status(500).json({ message:'Server error creating location.' }); }
});
app.put('/api/admin/locations/:id', ensureAdmin, async (req,res)=> {
  try { const l = await Location.findByIdAndUpdate(req.params.id, req.body, { new:true, runValidators:true }); if (!l) return res.status(404).json({ message:'Location not found.' }); res.json(l); }
  catch (e) { if (e.code===11000) return res.status(409).json({ message:'A location with this address already exists.' }); res.status(500).json({ message:'Server error updating location.' }); }
});
app.delete('/api/admin/locations/:id', ensureAdmin, async (req,res)=> {
  try { const l = await Location.findByIdAndDelete(req.params.id); if (!l) return res.status(404).json({ message:'Location not found.' }); res.status(204).send(); }
  catch { res.status(500).json({ message:'Server error deleting location.' }); }
});

// Fee Structures
app.get('/api/admin/feestructures', ensureAdmin, async (_req,res)=> {
  try { res.json(await FeeStructure.find().sort({ courseName:1 })); }
  catch { res.status(500).json({ message:'Server error fetching fee structures.' }); }
});
app.post('/api/admin/feestructures', ensureAdmin, async (req,res)=> {
  try { const fs = new FeeStructure(req.body); await fs.save(); res.status(201).json(fs); }
  catch (e) { if (e.code===11000) return res.status(409).json({ message:'A fee structure for this course already exists.' }); res.status(500).json({ message:'Server error creating fee structure.' }); }
});
app.put('/api/admin/feestructures/:id', ensureAdmin, async (req,res)=> {
  try { const fs = await FeeStructure.findByIdAndUpdate(req.params.id, req.body, { new:true, runValidators:true }); if (!fs) return res.status(404).json({ message:'Fee structure not found.' }); res.json(fs); }
  catch { res.status(500).json({ message:'Server error updating fee structure.' }); }
});
app.delete('/api/admin/feestructures/:id', ensureAdmin, async (req,res)=> {
  try { const fs = await FeeStructure.findByIdAndDelete(req.params.id); if (!fs) return res.status(404).json({ message:'Fee structure not found.' }); res.status(204).send(); }
  catch { res.status(500).json({ message:'Server error deleting fee structure.' }); }
});

app.get('/api/admin/invoices', ensureAdmin, async (_req,res)=> {
  try { res.json(await Invoice.find().populate('studentId','name email').sort({ issueDate:-1 })); }
  catch { res.status(500).json({ message:'Server error fetching invoices.' }); }
});

app.post('/api/admin/invoices/generate', ensureAdmin, async (_req,res)=> {
  try {
    const feeStructures = await FeeStructure.find();
    const students = await User.find({ role:'Student', courses: { $exists:true, $not: { $size:0 } }});
    const map = new Map(feeStructures.map(fs => [fs.courseName, fs]));
    const monthNames = ["January","February","March","April","May","June","July","August","September","October","November","December"];
    const now = new Date(); const billingPeriod = `${monthNames[now.getMonth()]} ${now.getFullYear()}`;
    let created = 0; const tasks = [];
    for (const s of students) {
      for (const cname of (s.courses||[])) {
        const fs = map.get(cname);
        if (!fs || fs.billingCycle !== 'Monthly') continue;
        const exists = await Invoice.findOne({ studentId:s._id, feeStructureId:fs._id, billingPeriod });
        if (exists) continue;
        const issueDate = new Date();
        const dueDate = new Date(issueDate.getFullYear(), issueDate.getMonth(), 15);
        tasks.push(new Invoice({
          studentId:s._id, feeStructureId:fs._id, courseName:fs.courseName,
          amount:fs.amount, currency:fs.currency, issueDate, dueDate, billingPeriod, status:'Pending'
        }).save());
        created++;
      }
    }
    await Promise.all(tasks);
    res.status(201).json({ message: `${created} new invoices generated successfully.` });
  } catch (e) {
    console.error('Invoice generation error:', e);
    res.status(500).json({ message:'Server error during invoice generation.' });
  }
});

app.put('/api/admin/invoices/:id/pay', ensureAdmin, async (req,res)=> {
  try {
    const updated = await Invoice.findByIdAndUpdate(
      req.params.id,
      { status:'Paid', paymentDetails: req.body },
      { new:true, runValidators:true }
    ).populate('studentId','name email');
    if (!updated) return res.status(404).json({ message:'Invoice not found.' });
    res.json(updated);
  } catch {
    res.status(500).json({ message:'Server error recording payment.' });
  }
});

// Notifications for logged-in user
app.get('/api/notifications', ensureAuthenticated, async (req, res) => {
  try { const ids = await getFamilyMemberIds(req.session.user); const n = await Notification.find({ userId: { $in: ids } }).sort({ createdAt:-1 }); res.json(n); }
  catch { res.status(500).json({ message:'Server error fetching notifications.' }); }
});
app.put('/api/notifications/:id/read', ensureAuthenticated, async (req, res) => {
  try {
    const note = await Notification.findById(req.params.id);
    if (!note) return res.status(404).json({ message:'Notification not found.' });
    const ids = await getFamilyMemberIds(req.session.user);
    if (!ids.includes(note.userId.toString())) return res.status(403).json({ message:'Forbidden' });
    note.read = true; await note.save(); res.json(note);
  } catch {
    res.status(500).json({ message:'Server error updating notification.' });
  }
});

// Content helpers
const getContentForUser = async (req, res, model, label) => {
  try {
    const ids = await getFamilyMemberIds(req.session.user);
    const content = await model.find({ recipientIds: { $in: ids } }).sort({ date:-1, examDate:-1, issuedAt:-1 });
    res.json(content);
  } catch {
    res.status(500).json({ message: `Server error fetching ${label}.` });
  }
};
app.get('/api/events', ensureAuthenticated, (req,res)=>getContentForUser(req,res,Event,'events'));
app.get('/api/grade-exams', ensureAuthenticated, (req,res)=>getContentForUser(req,res,GradeExam,'grade exams'));
app.get('/api/book-materials', ensureAuthenticated, (req,res)=>getContentForUser(req,res,BookMaterial,'book materials'));
app.get('/api/notices', ensureAuthenticated, (req,res)=>getContentForUser(req,res,Notice,'notices'));

// Admin content
const createAdminContentRoutes = (model, name) => {
  app.get(`/api/admin/${name}`, ensureAdmin, async (_req,res)=>{ res.json(await model.find().sort({ createdAt:-1, date:-1, examDate:-1, issuedAt:-1 })); });
  app.post(`/api/admin/${name}`, ensureAdmin, async (req,res)=>{ const item = new model(req.body); await item.save(); res.status(201).json(item); });
  app.put(`/api/admin/${name}/:id`, ensureAdmin, async (req,res)=>{ const item = await model.findByIdAndUpdate(req.params.id, req.body, { new:true }); res.json(item); });
  app.delete(`/api/admin/${name}/:id`, ensureAdmin, async (req,res)=>{ await model.findByIdAndDelete(req.params.id); res.status(204).send(); });
};
createAdminContentRoutes(Event, 'events');
createAdminContentRoutes(GradeExam, 'grade-exams');
createAdminContentRoutes(BookMaterial, 'book-materials');
createAdminContentRoutes(Notice, 'notices');

app.post('/api/admin/content/send', ensureAdmin, async (req,res) => {
  const { contentId, contentType, userIds, subject, message, sendWhatsApp } = req.body;
  if (!contentId || !contentType || !Array.isArray(userIds) || userIds.length === 0) {
    return res.status(400).json({ message:'Content ID, type, and recipient IDs are required.' });
  }
  const Models = { Event, GradeExam, BookMaterial, Notice };
  const Model = Models[contentType];
  if (!Model) return res.status(400).json({ message:'Invalid content type.' });
  const sessionDb = await mongoose.startSession();
  sessionDb.startTransaction();
  try {
    await Model.findByIdAndUpdate(contentId, { $addToSet: { recipientIds: { $each: userIds } } }, { session: sessionDb });
    const users = await User.find({ _id: { $in: userIds } }).select('email name contactNumber').session(sessionDb);
    if (users.length > 0) {
      await Notification.insertMany(users.map(u => ({ userId: u._id, subject, message })), { session: sessionDb });
      if (mailTransporter) {
        for (const u of users) {
          const mail = {
            from: process.env.SMTP_FROM_EMAIL || '"Nadanaloga Admin" <no-reply@nadanaloga.com>',
            to: u.email, subject, html: createEmailTemplate(u.name, subject, message)
          };
          mailTransporter.sendMail(mail).catch(err => console.error(`[Email] Error to ${u.email}:`, err));
        }
      }
    }
    if (sendWhatsApp) {
      for (const u of users) {
        const phone = (u.contactNumber||'').replace(/[\s+\-()]/g,'');
        if (phone) console.log(`[WhatsApp Mock] ${u.name} <- ${subject} (${phone})`);
      }
    }
    await sessionDb.commitTransaction();
    res.json({ success:true, message:`Content assigned and notifications sent to ${users.length} recipients.` });
  } catch (e) {
    await sessionDb.abortTransaction();
    console.error('Content send error:', e);
    res.status(500).json({ message:'Server error assigning content.' });
  } finally {
    sessionDb.endSession();
  }
});

// Trash
app.get('/api/admin/trash', ensureAdmin, async (_req,res)=> {
  try { res.json(await User.find({ isDeleted:true }).select('-password').sort({ deletedAt:-1 })); }
  catch { res.status(500).json({ message:'Server error fetching trashed users.' }); }
});
app.put('/api/admin/trash/:id/restore', ensureAdmin, async (req,res)=> {
  try {
    const u = await User.findByIdAndUpdate(req.params.id, { isDeleted:false, deletedAt:null }, { new:true }).select('-password');
    if (!u) return res.status(404).json({ message:'User not found in trash.' });
    res.json(u);
  } catch {
    res.status(500).json({ message:'Server error restoring user.' });
  }
});

// ---------- BACKGROUND: DB & EMAIL (non-blocking startup) ----------
let servicesReady = false;
async function connectServices() {
  if (servicesReady) return;
  console.log(`[Server] NODE_ENV: ${process.env.NODE_ENV || 'development'}`);
  // DB
  try {
    if (!process.env.MONGO_URI) {
      console.error('[DB] MONGO_URI not set. API will run but DB calls will fail.');
    } else {
      await mongoose.connect(process.env.MONGO_URI);
      console.log('[DB] MongoDB connected');
      // Seed once
      const count = await Course.countDocuments();
      if (count === 0) {
        await Course.insertMany([
          { name:'Bharatanatyam', description:'Explore the grace and storytelling of classical Indian dance.', icon:'Bharatanatyam' },
          { name:'Vocal', description:'Develop your singing voice with professional training techniques.', icon:'Vocal' },
          { name:'Drawing', description:'Learn to express your creativity through sketching and painting.', icon:'Drawing' },
          { name:'Abacus', description:'Enhance mental math skills and concentration with our abacus program.', icon:'Abacus' },
        ]);
        console.log('[DB] Seeded initial courses');
      }
    }
  } catch (e) {
    console.error('[DB] Connection error:', e.message);
  }

  // Email (don’t block startup)
  try {
    if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
      isEtherealMode = true;
      const test = await nodemailer.createTestAccount();
      mailTransporter = nodemailer.createTransport({
        host: test.smtp.host, port: test.smtp.port, secure: test.smtp.secure,
        auth: { user: test.user, pass: test.pass },
      });
      console.log('[Email] Using Ethereal test SMTP (dev mode)');
    } else {
      mailTransporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587', 10),
        secure: parseInt(process.env.SMTP_PORT || '587', 10) === 465,
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      });
      // Try verify without blocking overall boot; ignore failures
      mailTransporter.verify().then(() => {
        console.log('[Email] SMTP verified and ready.');
      }).catch(err => {
        console.error('[Email] SMTP verify failed:', err.message);
      });
    }
  } catch (e) {
    console.error('[Email] Config error:', e.message);
  }

  servicesReady = true;
}

// Kick off background initialization at cold start (works for Vercel & Cloud Run)
connectServices().catch(e => console.error('Service init error:', e));

// ---------- START / EXPORT ----------
if (!isVercel) {
  // Local / Cloud Run: start HTTP server immediately
  app.listen(PORT, () => {
    console.log(`[Server] Listening on :${PORT}`);
  });
}

// Always export the app (Vercel will use this)
module.exports = app;

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('[Server] SIGTERM received, closing...');
  try { await mongoose.connection.close(); } catch {}
  process.exit(0);
});
