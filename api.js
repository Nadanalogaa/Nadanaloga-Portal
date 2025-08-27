// api.js - Single file API for Vercel
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
app.use(express.json());
app.use(cookieParser());
app.use(cors({
  origin: true,
  credentials: true
}));

const JWT_SECRET = process.env.SESSION_SECRET || 'fallback-secret';
const COOKIE_NAME = 'nadanaloga_session';

// Simple MongoDB connection
let isConnected = false;
const connectDB = async () => {
  if (isConnected) return;
  try {
    await mongoose.connect(process.env.MONGO_URI);
    isConnected = true;
    console.log('MongoDB connected');
  } catch (error) {
    console.error('DB connection failed:', error);
  }
};

// Simple User schema
const UserSchema = new mongoose.Schema({
  name: String,
  email: String,
  password: String,
  contactNumber: String,
  role: { type: String, default: 'Student' },
  status: { type: String, default: 'Active' },
  dateOfJoining: { type: Date, default: Date.now }
});

const User = mongoose.models.User || mongoose.model('User', UserSchema);

// Course schema
const CourseSchema = new mongoose.Schema({
  name: String,
  description: String,
  icon: String
});

const Course = mongoose.models.Course || mongoose.model('Course', CourseSchema);

// Session helper
const readSession = (req) => {
  const token = req.cookies[COOKIE_NAME];
  if (!token) return null;
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
};

// Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/session', (req, res) => {
  const session = readSession(req);
  res.json(session ? session.user : null);
});

app.post('/api/logout', (req, res) => {
  res.setHeader('Set-Cookie', `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`);
  res.json({ message: 'Logout successful' });
});

app.get('/api/courses', async (req, res) => {
  try {
    await connectDB();
    let courses = await Course.find();
    if (courses.length === 0) {
      const initialCourses = [
        { name: 'Bharatanatyam', description: 'Classical Indian dance.', icon: 'Bharatanatyam' },
        { name: 'Vocal', description: 'Professional singing training.', icon: 'Vocal' },
        { name: 'Drawing', description: 'Creative sketching and painting.', icon: 'Drawing' },
        { name: 'Abacus', description: 'Mental math skills enhancement.', icon: 'Abacus' }
      ];
      await Course.insertMany(initialCourses);
      courses = await Course.find();
    }
    res.json(courses);
  } catch (error) {
    console.error('Courses error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    await connectDB();
    const { email, password } = req.body;
    const user = await User.findOne({ email: email.toLowerCase() });
    
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    const userObj = user.toObject();
    delete userObj.password;
    
    const token = jwt.sign({ user: userObj }, JWT_SECRET, { expiresIn: '7d' });
    const isProd = process.env.NODE_ENV === 'production';
    
    res.setHeader('Set-Cookie', `${COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Lax; ${isProd ? 'Secure; ' : ''}Max-Age=${7 * 24 * 3600}`);
    res.json(userObj);
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.post('/api/admin/register', async (req, res) => {
  try {
    await connectDB();
    const { name, email, password, contactNumber } = req.body;
    
    if (!name || !email || !password || !contactNumber) {
      return res.status(400).json({ message: 'All fields are required' });
    }
    
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(409).json({ message: 'Email already registered' });
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    const adminUser = new User({
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      contactNumber,
      role: 'Admin',
      status: 'Active'
    });
    
    await adminUser.save();
    res.status(201).json({ message: 'Admin registration successful' });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Handle all methods
app.all('*', (req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

module.exports = serverless(app);