import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.SESSION_SECRET || 'a-very-super-secret-key-for-dev';
const COOKIE_NAME = 'nadanaloga_session';

// User schema
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, required: true, enum: ['Student', 'Teacher', 'Admin'] },
  status: { type: String, enum: ['Active', 'Inactive', 'On Hold', 'Graduated'], default: 'Active' },
  dateOfJoining: { type: String }
});

userSchema.virtual('id').get(function () { return this._id.toHexString(); });
userSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    delete ret._id; 
    delete ret.__v;
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
    console.log('MongoDB connected successfully');
    return connection;
  } catch (error) {
    console.error('MongoDB connection error:', error);
    throw error;
  }
};

const noStore = (res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    await connectDB();
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }
    
    const userDoc = await User.findOne({ email: email.toLowerCase() });
    if (!userDoc) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }
    
    const isMatch = await bcrypt.compare(password, userDoc.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }
    
    const user = userDoc.toJSON();
    delete user.password;
    
    const token = jwt.sign({ user }, JWT_SECRET, { expiresIn: '7d' });
    const isProd = process.env.NODE_ENV === 'production';
    
    res.setHeader('Set-Cookie', [
      `${COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Lax; ${isProd ? 'Secure; ' : ''}Max-Age=${7 * 24 * 3600}`
    ]);
    
    noStore(res);
    res.status(200).json(user);
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login.' });
  }
}