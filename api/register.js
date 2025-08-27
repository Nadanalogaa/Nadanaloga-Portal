import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.SESSION_SECRET || 'a-very-super-secret-key-for-dev';

// User schema (comprehensive)
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, required: true, enum: ['Student', 'Teacher', 'Admin'] },
  classPreference: { type: String, enum: ['Online', 'Offline', 'Hybrid'] },
  photoUrl: { type: String },
  dob: { type: String },
  sex: { type: String, enum: ['Male', 'Female', 'Other'] },
  contactNumber: { type: String },
  alternateContactNumber: { type: String },
  address: { type: String },
  dateOfJoining: { type: String },
  country: { type: String },
  state: { type: String },
  city: { type: String },
  postalCode: { type: String },
  timezone: { type: String },
  preferredTimings: { type: [String] },
  status: { type: String, enum: ['Active', 'Inactive', 'On Hold', 'Graduated'], default: 'Active' },
  locationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Location' },
  courses: { type: [String] },
  fatherName: { type: String },
  standard: { type: String },
  schoolName: { type: String },
  grade: { type: String, enum: ['Grade 1', 'Grade 2', 'Grade 3'] },
  notes: { type: String },
  courseExpertise: { type: [String] },
  educationalQualifications: { type: String },
  employmentType: { type: String, enum: ['Part-time', 'Full-time'] },
  yearsOfExperience: { type: Number },
  availableTimeSlots: { type: [String] },
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

const notificationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  subject: { type: String, required: true },
  message: { type: String, required: true },
  read: { type: Boolean, default: false },
  link: { type: String },
  createdAt: { type: Date, default: Date.now }
});

notificationSchema.virtual('id').get(function () { return this._id.toHexString(); });
notificationSchema.set('toJSON', { virtuals: true, transform: (doc, ret) => { delete ret._id; delete ret.__v; } });

const User = mongoose.models.User || mongoose.model('User', userSchema);
const Notification = mongoose.models.Notification || mongoose.model('Notification', notificationSchema);

// MongoDB connection
let cachedDb = null;

const connectDB = async () => {
  if (cachedDb && mongoose.connection.readyState === 1) {
    return cachedDb;
  }

  try {
    const connection = await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 8000,
      socketTimeoutMS: 10000,
      connectTimeoutMS: 10000,
      maxPoolSize: 5,
      minPoolSize: 0,
      maxIdleTimeMS: 10000,
      bufferCommands: false,
    });
    
    cachedDb = connection;
    return connection;
  } catch (error) {
    console.error('MongoDB connection error:', error);
    throw error;
  }
};

export default async function handler(req, res) {
  try {
    await connectDB();

    const { pathname } = new URL(req.url, `https://${req.headers.host}`);

    // Check email endpoint
    if (pathname === '/api/users/check-email' && req.method === 'POST') {
      const { email } = req.body;
      if (!email) return res.status(400).json({ message: 'Email is required.' });
      const user = await User.findOne({ email: email.toLowerCase() });
      return res.json({ exists: !!user });
    }

    // User registration endpoint
    if (pathname === '/api/register' && req.method === 'POST') {
      const session = await mongoose.startSession();
      session.startTransaction();
      
      try {
        const usersData = req.body;
        if (!Array.isArray(usersData) || usersData.length === 0) {
          throw new Error('Registration data must be a non-empty array of users.');
        }

        const emailsInRequest = usersData.map(u => u.email.toLowerCase());
        if (new Set(emailsInRequest).size !== emailsInRequest.length) {
          throw new Error('Duplicate emails found in the registration request.');
        }

        const existingUsers = await User.find({ email: { $in: emailsInRequest } }).session(session);
        if (existingUsers.length > 0) {
          const existingEmail = existingUsers[0].email;
          throw new Error(`The email "${existingEmail}" is already registered. Please try logging in or use a different email.`);
        }

        const adminUser = await User.findOne({ role: 'Admin' }).session(session);

        for (const userData of usersData) {
          const { password, ...restOfUserData } = userData;
          if (!password) throw new Error(`Password is required for user ${restOfUserData.email}.`);
          
          const hashedPassword = await bcrypt.hash(password, 10);
          const finalUserData = {
            ...restOfUserData,
            email: restOfUserData.email.toLowerCase(),
            password: hashedPassword,
            dateOfJoining: restOfUserData.dateOfJoining || new Date().toISOString()
          };
          
          const user = new User(finalUserData);
          await user.save({ session });

          // Create notification for admin if student registered
          if (user.role === 'Student' && adminUser) {
            const subject = `New Student Registration: ${user.name}`;
            const message = `${user.name} has registered. Click to view their profile and assign a batch.`;
            const link = `/admin/student/${user.id}`;
            const newNotification = new Notification({ userId: adminUser._id, subject, message, link });
            await newNotification.save({ session });
          }
        }

        await session.commitTransaction();
        return res.status(201).json({ message: 'Registration successful' });
        
      } catch (error) {
        await session.abortTransaction();
        throw error;
      } finally {
        session.endSession();
      }
    }

    // Admin registration endpoint
    if (pathname === '/api/admin/register' && req.method === 'POST') {
      const { name, email, password, contactNumber } = req.body;
      
      if (!name || !email || !password || !contactNumber) {
        return res.status(400).json({ message: 'All fields are required.' });
      }

      const existingUser = await User.findOne({ email: email.toLowerCase() });
      if (existingUser) {
        return res.status(409).json({ message: 'This email is already registered.' });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const adminUser = new User({
        name,
        email: email.toLowerCase(),
        password: hashedPassword,
        contactNumber,
        role: 'Admin',
        status: 'Active',
        dateOfJoining: new Date().toISOString(),
      });

      await adminUser.save();
      return res.status(201).json({ message: 'Admin registration successful. Please log in.' });
    }

    return res.status(404).json({ message: 'Registration endpoint not found' });

  } catch (error) {
    console.error('Registration error:', error);
    const errorMessage = error.code === 11000 ? 'An email in the registration list is already in use.' : (error.message || 'Server error during registration.');
    res.status(error.code === 11000 ? 409 : 500).json({ message: errorMessage });
  }
}