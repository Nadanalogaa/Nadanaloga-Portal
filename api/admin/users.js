import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const JWT_SECRET = process.env.SESSION_SECRET || 'a-very-super-secret-key-for-dev';
const COOKIE_NAME = 'nadanaloga_session';

// User schema
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, required: true, enum: ['Student', 'Teacher', 'Admin'] },
  contactNumber: { type: String },
  status: { type: String, enum: ['Active', 'Inactive', 'On Hold', 'Graduated'], default: 'Active' },
  dateOfJoining: { type: String },
  isDeleted: { type: Boolean, default: false },
  deletedAt: { type: Date, default: null },
});

userSchema.virtual('id').get(function () { return this._id.toHexString(); });
userSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    delete ret._id; 
    delete ret.__v;
    delete ret.password;
  }
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
  try {
    const session = readSession(req);
    if (!session?.user || session.user.role !== 'Admin') {
      return res.status(403).json({ message: 'Forbidden: Administrative privileges required.' });
    }

    await connectDB();

    if (req.method === 'GET') {
      const users = await User.find({ role: { $ne: 'Admin' }, isDeleted: { $ne: true } }).select('-password');
      return res.status(200).json(users);
    }

    if (req.method === 'POST') {
      const { password, ...userData } = req.body;
      if (!userData.email) {
        return res.status(400).json({ message: 'Email is required.' });
      }
      
      const existingUser = await User.findOne({ email: userData.email.toLowerCase() });
      if (existingUser) {
        return res.status(409).json({ message: 'This email is already in use.' });
      }
      
      const effectivePassword = password || 'password123';
      const hashedPassword = await bcrypt.hash(effectivePassword, 10);
      const user = new User({ ...userData, password: hashedPassword });
      await user.save();
      
      const newUserDoc = await User.findById(user._id).select('-password');
      return res.status(201).json(newUserDoc.toJSON());
    }

    return res.status(405).json({ message: 'Method not allowed' });
  } catch (error) {
    console.error('Admin users error:', error);
    res.status(500).json({ message: 'Server error managing users.' });
  }
}