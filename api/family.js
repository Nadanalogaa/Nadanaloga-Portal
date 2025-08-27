import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.SESSION_SECRET || 'a-very-super-secret-key-for-dev';
const COOKIE_NAME = 'nadanaloga_session';

// User schema 
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  role: { type: String, required: true, enum: ['Student', 'Teacher', 'Admin'] },
  status: { type: String, enum: ['Active', 'Inactive', 'On Hold', 'Graduated'], default: 'Active' },
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
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const session = readSession(req);
    if (!session?.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    await connectDB();

    const { pathname } = new URL(req.url, `https://${req.headers.host}`);
    
    // Family students endpoint
    if (pathname === '/api/family/students') {
      const loggedInEmail = session.user.email?.toLowerCase();
      if (!loggedInEmail) {
        return res.status(400).json({ message: 'Invalid email format in session.' });
      }

      const emailParts = loggedInEmail.split('@');
      if (emailParts.length < 2) {
        return res.status(400).json({ message: 'Invalid email format in session.' });
      }
      
      const baseUsername = emailParts[0].split('+')[0];
      const domain = emailParts[1];
      const emailRegex = new RegExp(`^${baseUsername.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\$&')}(\\+.+)?@${domain.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\$&')}$`, 'i');

      const familyMembers = await User.find({ email: emailRegex, role: 'Student' }).select('-password').sort({ email: 1 });
      
      if (!familyMembers || familyMembers.length === 0) {
        const self = await User.findById(session.user.id).select('-password');
        return res.status(200).json(self ? [self] : []);
      }
      
      return res.status(200).json(familyMembers);
    }

    return res.status(404).json({ message: 'Family endpoint not found' });
  } catch (error) {
    console.error('Family API error:', error);
    res.status(500).json({ message: 'Server error in family API.' });
  }
}