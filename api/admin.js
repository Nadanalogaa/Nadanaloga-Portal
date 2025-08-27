import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const JWT_SECRET = process.env.SESSION_SECRET || 'a-very-super-secret-key-for-dev';
const COOKIE_NAME = 'nadanaloga_session';

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, required: true, enum: ['Student', 'Teacher', 'Admin'] },
  contactNumber: { type: String },
  status: { type: String, enum: ['Active', 'Inactive', 'On Hold', 'Graduated'], default: 'Active' },
  dateOfJoining: { type: String },
  classPreference: { type: String, enum: ['Online', 'Offline', 'Hybrid'] },
  isDeleted: { type: Boolean, default: false },
});

userSchema.virtual('id').get(function () { return this._id.toHexString(); });
userSchema.set('toJSON', {
  virtuals: true,
  transform: (_, ret) => {
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
locationSchema.set('toJSON', { virtuals: true, transform: (_, ret) => { delete ret._id; delete ret.__v; } });

const courseSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, required: true },
  duration: { type: String, required: true },
  fee: { type: Number, required: true },
  category: { type: String, required: true },
  isActive: { type: Boolean, default: true },
});

courseSchema.virtual('id').get(function () { return this._id.toHexString(); });
courseSchema.set('toJSON', { virtuals: true, transform: (_, ret) => { delete ret._id; delete ret.__v; } });

const User = mongoose.models.User || mongoose.model('User', userSchema);
const Location = mongoose.models.Location || mongoose.model('Location', locationSchema);
const Course = mongoose.models.Course || mongoose.model('Course', courseSchema);

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

const getRouteFromUrl = (url) => {
  const match = url.match(/\/admin\/(.+?)(?:\?|$)/);
  return match ? match[1] : null;
};

export default async function handler(req, res) {
  try {
    const session = readSession(req);
    if (!session?.user || session.user.role !== 'Admin') {
      return res.status(403).json({ message: 'Forbidden: Administrative privileges required.' });
    }

    const route = getRouteFromUrl(req.url || '');
    
    await connectDB();

    switch (route) {
      case 'stats':
        if (req.method !== 'GET') {
          return res.status(405).json({ message: 'Method not allowed' });
        }
        const studentCount = await User.countDocuments({ role: 'Student', isDeleted: { $ne: true } });
        const teacherCount = await User.countDocuments({ role: 'Teacher', isDeleted: { $ne: true } });
        const onlinePreference = await User.countDocuments({ role: { $ne: 'Admin' }, classPreference: 'Online', isDeleted: { $ne: true } });
        const offlinePreference = await User.countDocuments({ role: { $ne: 'Admin' }, classPreference: 'Offline', isDeleted: { $ne: true } });
        
        return res.status(200).json({ 
          totalUsers: studentCount + teacherCount, 
          studentCount, 
          teacherCount, 
          onlinePreference, 
          offlinePreference 
        });

      case 'users':
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

      case 'locations':
        if (req.method === 'GET') {
          const locations = await Location.find().sort({ name: 1 });
          return res.status(200).json(locations);
        }
        if (req.method === 'POST') {
          const newLocation = new Location(req.body);
          await newLocation.save();
          return res.status(201).json(newLocation);
        }
        return res.status(405).json({ message: 'Method not allowed' });

      case 'courses':
        if (req.method === 'GET') {
          const courses = await Course.find({ isActive: true }).sort({ name: 1 });
          return res.status(200).json(courses);
        }
        if (req.method === 'POST') {
          const newCourse = new Course(req.body);
          await newCourse.save();
          return res.status(201).json(newCourse);
        }
        return res.status(405).json({ message: 'Method not allowed' });

      case 'register':
        if (req.method === 'POST') {
          const { password, ...userData } = req.body;
          if (!userData.email) {
            return res.status(400).json({ message: 'Email is required.' });
          }
          
          const existingUser = await User.findOne({ email: userData.email.toLowerCase() });
          if (existingUser) {
            return res.status(409).json({ message: 'This email is already registered.' });
          }
          
          const effectivePassword = password || 'password123';
          const hashedPassword = await bcrypt.hash(effectivePassword, 10);
          const user = new User({ 
            ...userData, 
            password: hashedPassword,
            role: userData.role || 'Admin'
          });
          await user.save();
          
          const newUserDoc = await User.findById(user._id).select('-password');
          return res.status(201).json(newUserDoc.toJSON());
        }
        return res.status(405).json({ message: 'Method not allowed' });

      case 'batches':
      case 'feestructures':
      case 'invoices':
      case 'events':
      case 'notices':
      case 'grade-exams':
      case 'book-materials':
      case 'trash':
        if (req.method === 'GET') {
          return res.status(200).json([]);
        }
        return res.status(405).json({ message: 'Method not allowed' });

      default:
        return res.status(404).json({ message: 'Admin route not found' });
    }
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: 'A record with this information already exists.' });
    }
    console.error('Admin API error:', error);
    res.status(500).json({ message: 'Server error in admin API.' });
  }
}