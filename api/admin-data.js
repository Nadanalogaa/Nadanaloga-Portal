import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const JWT_SECRET = process.env.SESSION_SECRET || 'a-very-super-secret-key-for-dev';
const COOKIE_NAME = 'nadanaloga_session';

// All schemas
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, required: true, enum: ['Student', 'Teacher', 'Admin'] },
  contactNumber: { type: String },
  status: { type: String, enum: ['Active', 'Inactive', 'On Hold', 'Graduated'], default: 'Active' },
  dateOfJoining: { type: String },
  isDeleted: { type: Boolean, default: false },
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

const locationSchema = new mongoose.Schema({
  name: { type: String, required: true },
  address: { type: String, required: true, unique: true },
});

locationSchema.virtual('id').get(function () { return this._id.toHexString(); });
locationSchema.set('toJSON', { virtuals: true, transform: (doc, ret) => { delete ret._id; delete ret.__v; } });

const User = mongoose.models.User || mongoose.model('User', userSchema);
const Location = mongoose.models.Location || mongoose.model('Location', locationSchema);

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

    const { pathname } = new URL(req.url, `https://${req.headers.host}`);

    // Admin users endpoint
    if (pathname === '/api/admin/users' && req.method === 'GET') {
      const users = await User.find({ role: { $ne: 'Admin' }, isDeleted: { $ne: true } }).select('-password');
      return res.status(200).json(users);
    }

    if (pathname === '/api/admin/users' && req.method === 'POST') {
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

    // Admin locations endpoint
    if (pathname === '/api/admin/locations' && req.method === 'GET') {
      const locations = await Location.find().sort({ name: 1 });
      return res.status(200).json(locations);
    }

    if (pathname === '/api/admin/locations' && req.method === 'POST') {
      const newLocation = new Location(req.body);
      await newLocation.save();
      return res.status(201).json(newLocation);
    }

    // Placeholder endpoints for other admin functions
    if (pathname === '/api/admin/batches' && req.method === 'GET') {
      return res.status(200).json([]);
    }

    if (pathname === '/api/admin/feestructures' && req.method === 'GET') {
      return res.status(200).json([]);
    }

    if (pathname === '/api/admin/invoices' && req.method === 'GET') {
      return res.status(200).json([]);
    }

    if (pathname === '/api/admin/events' && req.method === 'GET') {
      return res.status(200).json([]);
    }

    if (pathname === '/api/admin/notices' && req.method === 'GET') {
      return res.status(200).json([]);
    }

    if (pathname === '/api/admin/grade-exams' && req.method === 'GET') {
      return res.status(200).json([]);
    }

    if (pathname === '/api/admin/book-materials' && req.method === 'GET') {
      return res.status(200).json([]);
    }

    return res.status(404).json({ message: 'Admin endpoint not found' });

  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: 'A record with this information already exists.' });
    }
    console.error('Admin data API error:', error);
    res.status(500).json({ message: 'Server error in admin data API.' });
  }
}