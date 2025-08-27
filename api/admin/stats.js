import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.SESSION_SECRET || 'a-very-super-secret-key-for-dev';
const COOKIE_NAME = 'nadanaloga_session';

// User schema (simplified for stats)
const userSchema = new mongoose.Schema({
  role: { type: String, required: true, enum: ['Student', 'Teacher', 'Admin'] },
  classPreference: { type: String, enum: ['Online', 'Offline', 'Hybrid'] },
  isDeleted: { type: Boolean, default: false },
});

const User = mongoose.models.User || mongoose.model('User', userSchema);

// MongoDB connection
let cachedDb = null;

const connectDB = async () => {
  if (cachedDb && mongoose.connection.readyState === 1) {
    return cachedDb;
  }

  try {
    const connection = await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 8000,
      connectTimeoutMS: 8000,
      maxPoolSize: 5,
      minPoolSize: 0,
      bufferCommands: false,
    });
    
    cachedDb = connection;
    return connection;
  } catch (error) {
    console.error('MongoDB connection error:', error);
    throw error;
  }
};

const readSession = (req) => {
  const token = req.cookies?.[COOKIE_NAME];
  if (!token) return null;
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
};

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const session = readSession(req);
    if (!session?.user || session.user.role !== 'Admin') {
      return res.status(403).json({ message: 'Forbidden: Administrative privileges required.' });
    }

    await connectDB();
    
    const studentCount = await User.countDocuments({ role: 'Student', isDeleted: { $ne: true } });
    const teacherCount = await User.countDocuments({ role: 'Teacher', isDeleted: { $ne: true } });
    const onlinePreference = await User.countDocuments({ role: { $ne: 'Admin' }, classPreference: 'Online', isDeleted: { $ne: true } });
    const offlinePreference = await User.countDocuments({ role: { $ne: 'Admin' }, classPreference: 'Offline', isDeleted: { $ne: true } });
    
    res.status(200).json({ 
      totalUsers: studentCount + teacherCount, 
      studentCount, 
      teacherCount, 
      onlinePreference, 
      offlinePreference 
    });
  } catch (error) {
    console.error('Admin stats error:', error);
    res.status(500).json({ message: 'Server error fetching stats.' });
  }
}