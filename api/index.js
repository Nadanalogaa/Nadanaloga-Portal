const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const serverless = require('serverless-http');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');

dotenv.config();

const app = express();
const JWT_SECRET = process.env.SESSION_SECRET || 'a-very-super-secret-key-for-dev';
const COOKIE_NAME = 'nadanaloga_session';

// Middleware
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ limit: '100mb', extended: true }));
app.use(cookieParser());

const corsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = [
      'http://localhost:5173',
      'http://127.0.0.1:5173',
      'https://nadanaloga-portal.vercel.app'
    ];
    
    const vercelRegex = /^https?:\/\/[a-z0-9-]+\.vercel\.app$/i;
    
    if (!origin || allowedOrigins.includes(origin) || vercelRegex.test(origin)) {
      return callback(null, true);
    }
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// MongoDB connection with caching
let cachedDb = null;

const connectDB = async () => {
  if (cachedDb && mongoose.connection.readyState === 1) {
    return cachedDb;
  }

  try {
    const connection = await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 8000,
      socketTimeoutMS: 10000,
      connectTimeoutMS: 10000,
      maxPoolSize: 5,
      minPoolSize: 0,
      maxIdleTimeMS: 10000,
      bufferCommands: false,
    });
    
    cachedDb = connection;
    console.log('MongoDB connected successfully');
    return connection;
  } catch (error) {
    console.error('MongoDB connection error:', error);
    throw error;
  }
};

// Schemas
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
  dateOfJoining: { type: String },
  country: { type: String },
  state: { type: String },
  city: { type: String },
  postalCode: { type: String },
  timezone: { type: String },
  preferredTimings: { type: [String] },
  status: { type: String, enum: ['Active', 'Inactive', 'On Hold', 'Graduated'], default: 'Active' },
  courses: { type: [String] },
  fatherName: { type: String },
  standard: { type: String },
  schoolName: { type: String },
  grade: { type: String, enum: ['Grade 1', 'Grade 2', 'Grade 3'] },
  notes: { type: String },
  courseExpertise: { type: [String] },
  educationalQualifications: { type: String },
  employmentType: { type: String, enum: ['Part-time', 'Full-time'] },
  yearsOfExperience: { type: Number },
  availableTimeSlots: { type: [String] },
  isDeleted: { type: Boolean, default: false },
  deletedAt: { type: Date, default: null },
});

userSchema.virtual('id').get(function () { return this._id.toHexString(); });
userSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    delete ret._id; 
    delete ret.__v;
  }
});

const courseSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, required: true },
  icon: { type: String, required: true }
});

courseSchema.virtual('id').get(function () { return this._id.toHexString(); });
courseSchema.set('toJSON', { 
  virtuals: true, 
  transform: (doc, ret) => { delete ret._id; delete ret.__v; } 
});

const contactSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  message: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

// Models
const User = mongoose.models.User || mongoose.model('User', userSchema);
const Course = mongoose.models.Course || mongoose.model('Course', courseSchema);
const Contact = mongoose.models.Contact || mongoose.model('Contact', contactSchema);

// Helper functions
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
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
};

// Health check - no DB needed
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    dbState: mongoose.connection.readyState,
    environment: process.env.NODE_ENV || 'development',
    mongoUri: process.env.MONGO_URI ? 'configured' : 'missing'
  });
});

// Session endpoint - no DB needed
app.get('/session', (req, res) => {
  noStore(res);
  const session = readSession(req);
  return res.status(200).json(session ? session.user : null);
});

// Logout endpoint - no DB needed
app.post('/logout', (req, res) => {
  res.setHeader('Set-Cookie', [
    `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`
  ]);
  noStore(res);
  res.status(200).json({ message: 'Logout successful' });
});

// Courses endpoint with lazy seeding
app.get('/courses', async (req, res) => {
  try {
    await connectDB();
    let courses = await Course.find();
    
    if (courses.length === 0) {
      const initialCourses = [
        { name: 'Bharatanatyam', description: 'Explore the grace and storytelling of classical Indian dance.', icon: 'Bharatanatyam' },
        { name: 'Vocal', description: 'Develop your singing voice with professional training techniques.', icon: 'Vocal' },
        { name: 'Drawing', description: 'Learn to express your creativity through sketching and painting.', icon: 'Drawing' },
        { name: 'Abacus', description: 'Enhance mental math skills and concentration with our abacus program.', icon: 'Abacus' }
      ];
      await Course.insertMany(initialCourses);
      courses = await Course.find();
    }
    
    res.json(courses);
  } catch (error) {
    console.error('Courses error:', error);
    res.status(500).json({ message: 'Server error fetching courses.' });
  }
});

// Contact endpoint
app.post('/contact', async (req, res) => {
  try {
    await connectDB();
    const { name, email, message } = req.body;
    await new Contact({ name, email, message }).save();
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Contact error:', error);
    res.status(500).json({ message: 'Failed to submit message.' });
  }
});

// Login endpoint
app.post('/login', async (req, res) => {
  try {
    await connectDB();
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
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login.' });
  }
});

// Admin register endpoint
app.post('/admin/register', async (req, res) => {
  try {
    await connectDB();
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

// Catch all for undefined routes
app.all('*', (req, res) => {
  res.status(404).json({ message: 'API endpoint not found' });
});

module.exports = serverless(app);