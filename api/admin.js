import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const JWT_SECRET = process.env.SESSION_SECRET || 'a-very-super-secret-key-for-dev';
const COOKIE_NAME = 'nadanaloga_session';

// Comprehensive User Schema
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

const locationSchema = new mongoose.Schema({
  name: { type: String, required: true },
  address: { type: String, required: true, unique: true },
});

const courseSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, required: true },
  duration: { type: String, required: true },
  fee: { type: Number, required: true },
  category: { type: String, required: true },
  isActive: { type: Boolean, default: true },
});

const batchSchema = new mongoose.Schema({
  name: { type: String, required: true },
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  startDate: { type: String },
  endDate: { type: String },
  schedule: { type: String },
  capacity: { type: Number, default: 30 },
  enrolled: { type: Number, default: 0 },
  status: { type: String, enum: ['Active', 'Inactive', 'Completed'], default: 'Active' },
});

const feeStructureSchema = new mongoose.Schema({
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  type: { type: String, required: true },
  amount: { type: Number, required: true },
  dueDate: { type: String },
  isActive: { type: Boolean, default: true },
});

const eventSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  date: { type: String, required: true },
  time: { type: String },
  location: { type: String },
  isActive: { type: Boolean, default: true },
});

const noticeSchema = new mongoose.Schema({
  title: { type: String, required: true },
  content: { type: String, required: true },
  priority: { type: String, enum: ['High', 'Medium', 'Low'], default: 'Medium' },
  targetAudience: { type: String, enum: ['All', 'Students', 'Teachers'], default: 'All' },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
});

const gradeExamSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  subject: { type: String, required: true },
  grade: { type: String, required: true },
  date: { type: String },
  duration: { type: String },
  isActive: { type: Boolean, default: true },
});

const bookMaterialSchema = new mongoose.Schema({
  title: { type: String, required: true },
  author: { type: String },
  subject: { type: String, required: true },
  grade: { type: String, required: true },
  type: { type: String, enum: ['Book', 'PDF', 'Video', 'Audio'], default: 'Book' },
  url: { type: String },
  isActive: { type: Boolean, default: true },
});

// Set up virtuals and transforms for all schemas
[userSchema, locationSchema, courseSchema, batchSchema, feeStructureSchema, eventSchema, noticeSchema, gradeExamSchema, bookMaterialSchema].forEach(schema => {
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
const Location = mongoose.models.Location || mongoose.model('Location', locationSchema);
const Course = mongoose.models.Course || mongoose.model('Course', courseSchema);
const Batch = mongoose.models.Batch || mongoose.model('Batch', batchSchema);
const FeeStructure = mongoose.models.FeeStructure || mongoose.model('FeeStructure', feeStructureSchema);
const Event = mongoose.models.Event || mongoose.model('Event', eventSchema);
const Notice = mongoose.models.Notice || mongoose.model('Notice', noticeSchema);
const GradeExam = mongoose.models.GradeExam || mongoose.model('GradeExam', gradeExamSchema);
const BookMaterial = mongoose.models.BookMaterial || mongoose.model('BookMaterial', bookMaterialSchema);

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
  const match = url.match(/\/admin\/(.+?)(?:\?|$)/);
  if (!match) return { resource: null, id: null, action: null };
  
  const parts = match[1].split('/');
  return {
    resource: parts[0],
    id: parts[1] || null,
    action: parts[2] || null
  };
};

export default async function handler(req, res) {
  try {
    const session = readSession(req);
    if (!session?.user || session.user.role !== 'Admin') {
      return res.status(403).json({ message: 'Forbidden: Administrative privileges required.' });
    }

    const { resource, id, action } = parseRoute(req.url || '');
    
    await connectDB();

    switch (resource) {
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
        return await handleUsers(req, res, id, action);
        
      case 'locations':
        return await handleLocations(req, res, id);
        
      case 'courses':
        return await handleCourses(req, res, id);
        
      case 'batches':
        return await handleBatches(req, res, id);
        
      case 'feestructures':
        return await handleFeeStructures(req, res, id);
        
      case 'events':
        return await handleEvents(req, res, id);
        
      case 'notices':
        return await handleNotices(req, res, id);
        
      case 'grade-exams':
        return await handleGradeExams(req, res, id);
        
      case 'book-materials':
        return await handleBookMaterials(req, res, id);
        
      case 'trash':
        return await handleTrash(req, res, id, action);
        
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

// User CRUD handlers
const handleUsers = async (req, res, id, action) => {
  if (id && action === 'permanent' && req.method === 'DELETE') {
    await User.findByIdAndDelete(id);
    return res.status(204).send();
  }
  
  if (id && req.method === 'GET') {
    const user = await User.findById(id).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    return res.status(200).json(user);
  }
  
  if (id && req.method === 'PUT') {
    const { password, ...updateData } = req.body;
    if (password) {
      updateData.password = await bcrypt.hash(password, 10);
    }
    const user = await User.findByIdAndUpdate(id, updateData, { new: true }).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    return res.status(200).json(user);
  }
  
  if (id && req.method === 'DELETE') {
    await User.findByIdAndUpdate(id, { isDeleted: true });
    return res.status(204).send();
  }
  
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
};

// Location CRUD handlers
const handleLocations = async (req, res, id) => {
  if (id && req.method === 'GET') {
    const location = await Location.findById(id);
    if (!location) return res.status(404).json({ message: 'Location not found' });
    return res.status(200).json(location);
  }
  
  if (id && req.method === 'PUT') {
    const location = await Location.findByIdAndUpdate(id, req.body, { new: true });
    if (!location) return res.status(404).json({ message: 'Location not found' });
    return res.status(200).json(location);
  }
  
  if (id && req.method === 'DELETE') {
    await Location.findByIdAndDelete(id);
    return res.status(204).send();
  }
  
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
};

// Course CRUD handlers
const handleCourses = async (req, res, id) => {
  if (id && req.method === 'GET') {
    const course = await Course.findById(id);
    if (!course) return res.status(404).json({ message: 'Course not found' });
    return res.status(200).json(course);
  }
  
  if (id && req.method === 'PUT') {
    const course = await Course.findByIdAndUpdate(id, req.body, { new: true });
    if (!course) return res.status(404).json({ message: 'Course not found' });
    return res.status(200).json(course);
  }
  
  if (id && req.method === 'DELETE') {
    await Course.findByIdAndUpdate(id, { isActive: false });
    return res.status(204).send();
  }
  
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
};

// Generic CRUD handlers for other resources
const handleBatches = async (req, res, id) => {
  return await handleGenericCrud(Batch, req, res, id);
};

const handleFeeStructures = async (req, res, id) => {
  return await handleGenericCrud(FeeStructure, req, res, id);
};

const handleEvents = async (req, res, id) => {
  return await handleGenericCrud(Event, req, res, id);
};

const handleNotices = async (req, res, id) => {
  return await handleGenericCrud(Notice, req, res, id);
};

const handleGradeExams = async (req, res, id) => {
  return await handleGenericCrud(GradeExam, req, res, id);
};

const handleBookMaterials = async (req, res, id) => {
  return await handleGenericCrud(BookMaterial, req, res, id);
};

const handleTrash = async (req, res, id, action) => {
  if (id && action === 'restore' && req.method === 'PUT') {
    await User.findByIdAndUpdate(id, { isDeleted: false });
    return res.status(204).send();
  }
  
  if (req.method === 'GET') {
    const trashedUsers = await User.find({ isDeleted: true }).select('-password');
    return res.status(200).json(trashedUsers);
  }
  
  return res.status(405).json({ message: 'Method not allowed' });
};

const handleGenericCrud = async (Model, req, res, id) => {
  if (id && req.method === 'GET') {
    const item = await Model.findById(id);
    if (!item) return res.status(404).json({ message: 'Item not found' });
    return res.status(200).json(item);
  }
  
  if (id && req.method === 'PUT') {
    const item = await Model.findByIdAndUpdate(id, req.body, { new: true });
    if (!item) return res.status(404).json({ message: 'Item not found' });
    return res.status(200).json(item);
  }
  
  if (id && req.method === 'DELETE') {
    await Model.findByIdAndDelete(id);
    return res.status(204).send();
  }
  
  if (req.method === 'GET') {
    const items = await Model.find({ isActive: { $ne: false } });
    return res.status(200).json(items);
  }
  
  if (req.method === 'POST') {
    const newItem = new Model(req.body);
    await newItem.save();
    return res.status(201).json(newItem);
  }
  
  return res.status(405).json({ message: 'Method not allowed' });
};