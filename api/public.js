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
  alternateContactNumber: { type: String },
  address: { type: String },
  status: { type: String, enum: ['Active', 'Inactive', 'On Hold', 'Graduated'], default: 'Active' },
  dateOfJoining: { type: String },
  classPreference: { type: String, enum: ['Online', 'Offline', 'Hybrid'] },
  photoUrl: { type: String },
  dob: { type: String },
  sex: { type: String, enum: ['Male', 'Female', 'Other'] },
  country: { type: String },
  state: { type: String },
  city: { type: String },
  postalCode: { type: String },
  timezone: { type: String },
  preferredTimings: { type: [String] },
  locationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Location' },
  courses: { type: [String] },
  fatherName: { type: String },
  motherName: { type: String },
  isDeleted: { type: Boolean, default: false },
});

const courseSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, required: true },
  duration: { type: String, required: true },
  fee: { type: Number, required: true },
  category: { type: String, required: true },
  isActive: { type: Boolean, default: true },
});

const locationSchema = new mongoose.Schema({
  name: { type: String, required: true },
  address: { type: String, required: true, unique: true },
});

// Set up virtuals and transforms
[userSchema, courseSchema, locationSchema].forEach(schema => {
  schema.virtual('id').get(function () { return this._id.toHexString(); });
  schema.set('toJSON', {
    virtuals: true,
    transform: (_, ret) => {
      delete ret._id;
      delete ret.__v;
      if (ret.password) delete ret.password;
    }
  });
});

const User = mongoose.models.User || mongoose.model('User', userSchema);
const Course = mongoose.models.Course || mongoose.model('Course', courseSchema);
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

const parseRoute = (url) => {
  // Handle various route patterns
  if (url.includes('/users/check-email')) return { resource: 'users', action: 'check-email' };
  if (url.includes('/student/enrollments')) return { resource: 'student', action: 'enrollments' };
  if (url.includes('/family/students')) {
    const parts = url.split('/');
    return { resource: 'family', action: 'students', id: parts[3], subaction: parts[4] };
  }
  
  // Simple resource matching
  const match = url.match(/\/([^\/\?]+)(?:\?|$)/);
  return { resource: match ? match[1] : null };
};

export default async function handler(req, res) {
  try {
    const { resource, action, id, subaction } = parseRoute(req.url || '');
    
    // Handle routes that don't require DB connection first
    if (resource === 'contact') {
      if (req.method === 'POST') {
        console.log('Contact form submission:', req.body);
        return res.status(200).json({ message: 'Message sent successfully' });
      }
      return res.status(405).json({ message: 'Method not allowed' });
    }

    if (['events', 'notices', 'grade-exams', 'book-materials'].includes(resource)) {
      if (req.method === 'GET') {
        return res.status(200).json([]);
      }
      return res.status(405).json({ message: 'Method not allowed' });
    }

    // Connect to DB for other routes
    await connectDB();

    switch (resource) {
      case 'users':
        if (action === 'check-email' && req.method === 'POST') {
          const { email } = req.body;
          if (!email) {
            return res.status(400).json({ message: 'Email is required.' });
          }
          const existingUser = await User.findOne({ email: email.toLowerCase() });
          return res.status(200).json({ exists: !!existingUser });
        }
        return res.status(404).json({ message: 'User route not found' });

      case 'courses':
        if (req.method === 'GET') {
          const courses = await Course.find({ isActive: true }).sort({ name: 1 });
          return res.status(200).json(courses);
        }
        return res.status(405).json({ message: 'Method not allowed' });

      case 'locations':
        if (req.method === 'GET') {
          const locations = await Location.find().sort({ name: 1 });
          return res.status(200).json(locations);
        }
        return res.status(405).json({ message: 'Method not allowed' });

      case 'profile':
        const session = readSession(req);
        if (!session?.user) {
          return res.status(401).json({ message: 'Authentication required.' });
        }
        
        if (req.method === 'PUT') {
          const { password, ...updateData } = req.body;
          if (password) {
            updateData.password = await bcrypt.hash(password, 10);
          }
          
          const user = await User.findByIdAndUpdate(session.user.id, updateData, { new: true }).select('-password');
          if (!user) {
            return res.status(404).json({ message: 'User not found' });
          }
          
          return res.status(200).json(user);
        }
        return res.status(405).json({ message: 'Method not allowed' });

      case 'student':
        const studentSession = readSession(req);
        if (!studentSession?.user || studentSession.user.role !== 'Student') {
          return res.status(403).json({ message: 'Forbidden: Student access required.' });
        }
        
        if (action === 'enrollments' && req.method === 'GET') {
          return res.status(200).json([]);
        }
        return res.status(404).json({ message: 'Student route not found' });

      case 'family':
        const familySession = readSession(req);
        if (!familySession?.user) {
          return res.status(401).json({ message: 'Authentication required.' });
        }
        
        if (action === 'students' && req.method === 'GET') {
          if (!id) {
            return res.status(200).json([]);
          }
          
          if (subaction === 'invoices') {
            return res.status(200).json([]);
          }
          
          if (subaction === 'enrollments') {
            return res.status(200).json([]);
          }
        }
        return res.status(404).json({ message: 'Family route not found' });

      case 'invoices':
        const invoiceSession = readSession(req);
        if (!invoiceSession?.user || invoiceSession.user.role !== 'Student') {
          return res.status(403).json({ message: 'Forbidden: Student access required.' });
        }
        
        if (req.method === 'GET') {
          return res.status(200).json([]);
        }
        return res.status(405).json({ message: 'Method not allowed' });

      default:
        return res.status(404).json({ message: 'Route not found' });
    }
  } catch (error) {
    console.error('Public API error:', error);
    res.status(500).json({ message: 'Server error in public API.' });
  }
}