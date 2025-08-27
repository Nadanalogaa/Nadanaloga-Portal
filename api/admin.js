import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const JWT_SECRET = process.env.SESSION_SECRET || 'a-very-super-secret-key-for-dev';
const COOKIE_NAME = 'nadanaloga_session';

// Schemas
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, required: true, enum: ['Student', 'Teacher', 'Admin'] },
  contactNumber: { type: String },
  classPreference: { type: String, enum: ['Online', 'Offline', 'Hybrid'] },
  status: { type: String, enum: ['Active', 'Inactive', 'On Hold', 'Graduated'], default: 'Active' },
  dateOfJoining: { type: String },
  isDeleted: { type: Boolean, default: false },
  deletedAt: { type: Date, default: null },
});

const courseSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, required: true },
  icon: { type: String, required: true }
});

const batchSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String },
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  courseName: { type: String, required: true },
  teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  mode: { type: String, enum: ['Online', 'Offline'] },
});

const locationSchema = new mongoose.Schema({
  name: { type: String, required: true },
  address: { type: String, required: true, unique: true },
});

const feeStructureSchema = new mongoose.Schema({
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true, unique: true },
  courseName: { type: String, required: true },
  amount: { type: Number, required: true },
  currency: { type: String, required: true, enum: ['INR', 'USD'] },
  billingCycle: { type: String, required: true, enum: ['Monthly', 'Quarterly', 'Annually'] },
});

const invoiceSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  courseName: { type: String, required: true },
  amount: { type: Number, required: true },
  currency: { type: String, required: true },
  issueDate: { type: Date, required: true },
  dueDate: { type: Date, required: true },
  status: { type: String, required: true, enum: ['Pending', 'Paid', 'Overdue'], default: 'Pending' },
});

// Apply virtual IDs and JSON transform to all schemas
[userSchema, courseSchema, batchSchema, locationSchema, feeStructureSchema, invoiceSchema].forEach(schema => {
  schema.virtual('id').get(function () { return this._id.toHexString(); });
  schema.set('toJSON', { 
    virtuals: true, 
    transform: (doc, ret) => { 
      delete ret._id; 
      delete ret.__v; 
      if (ret.password) delete ret.password;
    } 
  });
});

// Models
const User = mongoose.models.User || mongoose.model('User', userSchema);
const Course = mongoose.models.Course || mongoose.model('Course', courseSchema);
const Batch = mongoose.models.Batch || mongoose.model('Batch', batchSchema);
const Location = mongoose.models.Location || mongoose.model('Location', locationSchema);
const FeeStructure = mongoose.models.FeeStructure || mongoose.model('FeeStructure', feeStructureSchema);
const Invoice = mongoose.models.Invoice || mongoose.model('Invoice', invoiceSchema);

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

const ensureAdmin = (session) => {
  if (!session?.user || session.user.role !== 'Admin') {
    return false;
  }
  return true;
};

export default async function handler(req, res) {
  try {
    const session = readSession(req);
    if (!ensureAdmin(session)) {
      return res.status(403).json({ message: 'Forbidden: Administrative privileges required.' });
    }

    await connectDB();

    const { pathname } = new URL(req.url, `https://${req.headers.host}`);
    const path = pathname.replace('/api/admin/', '');

    // Stats endpoint
    if (path === 'stats' && req.method === 'GET') {
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
    }

    // Users endpoint
    if (path === 'users' && req.method === 'GET') {
      const users = await User.find({ role: { $ne: 'Admin' }, isDeleted: { $ne: true } }).select('-password');
      return res.status(200).json(users);
    }

    if (path === 'users' && req.method === 'POST') {
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

    // Courses endpoint
    if (path === 'courses' && req.method === 'GET') {
      const courses = await Course.find();
      return res.status(200).json(courses);
    }

    if (path === 'courses' && req.method === 'POST') {
      const { name, description, icon } = req.body;
      const newCourse = new Course({ name, description, icon });
      await newCourse.save();
      return res.status(201).json(newCourse);
    }

    // Batches endpoint
    if (path === 'batches' && req.method === 'GET') {
      const batches = await Batch.find().populate('teacherId', 'name');
      return res.status(200).json(batches);
    }

    if (path === 'batches' && req.method === 'POST') {
      const newBatch = new Batch(req.body);
      await newBatch.save();
      return res.status(201).json(newBatch);
    }

    // Locations endpoint
    if (path === 'locations' && req.method === 'GET') {
      const locations = await Location.find().sort({ name: 1 });
      return res.status(200).json(locations);
    }

    if (path === 'locations' && req.method === 'POST') {
      const newLocation = new Location(req.body);
      await newLocation.save();
      return res.status(201).json(newLocation);
    }

    // Fee structures endpoint
    if (path === 'feestructures' && req.method === 'GET') {
      const structures = await FeeStructure.find().sort({ courseName: 1 });
      return res.status(200).json(structures);
    }

    if (path === 'feestructures' && req.method === 'POST') {
      const newStructure = new FeeStructure(req.body);
      await newStructure.save();
      return res.status(201).json(newStructure);
    }

    // Invoices endpoint
    if (path === 'invoices' && req.method === 'GET') {
      const invoices = await Invoice.find().populate('studentId', 'name email').sort({ issueDate: -1 });
      return res.status(200).json(invoices);
    }

    // Default fallback
    return res.status(404).json({ message: 'Admin endpoint not found' });

  } catch (error) {
    console.error('Admin API error:', error);
    res.status(500).json({ message: 'Server error in admin API.' });
  }
}