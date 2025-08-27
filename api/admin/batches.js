import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.SESSION_SECRET || 'a-very-super-secret-key-for-dev';
const COOKIE_NAME = 'nadanaloga_session';

// Batch schema
const batchScheduleSchema = new mongoose.Schema({
  timing: { type: String, required: true },
  studentIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
}, { _id: false });

const batchSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String },
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  courseName: { type: String, required: true },
  teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  schedule: [batchScheduleSchema],
  mode: { type: String, enum: ['Online', 'Offline'] },
});

batchSchema.virtual('id').get(function () { return this._id.toHexString(); });
batchSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    delete ret._id; delete ret.__v;
  }
});

const Batch = mongoose.models.Batch || mongoose.model('Batch', batchSchema);

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
      const batches = await Batch.find().populate('teacherId', 'name');
      return res.status(200).json(batches);
    }

    if (req.method === 'POST') {
      const newBatch = new Batch(req.body);
      await newBatch.save();
      return res.status(201).json(newBatch);
    }

    return res.status(405).json({ message: 'Method not allowed' });
  } catch (error) {
    console.error('Admin batches error:', error);
    res.status(500).json({ message: 'Server error managing batches.' });
  }
}