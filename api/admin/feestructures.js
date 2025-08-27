import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.SESSION_SECRET || 'a-very-super-secret-key-for-dev';
const COOKIE_NAME = 'nadanaloga_session';

// Fee structure schema
const feeStructureSchema = new mongoose.Schema({
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true, unique: true },
  courseName: { type: String, required: true },
  amount: { type: Number, required: true },
  currency: { type: String, required: true, enum: ['INR', 'USD'] },
  billingCycle: { type: String, required: true, enum: ['Monthly', 'Quarterly', 'Annually'] },
});

feeStructureSchema.virtual('id').get(function () { return this._id.toHexString(); });
feeStructureSchema.set('toJSON', { virtuals: true, transform: (doc, ret) => { delete ret._id; delete ret.__v; } });

const FeeStructure = mongoose.models.FeeStructure || mongoose.model('FeeStructure', feeStructureSchema);

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
      const structures = await FeeStructure.find().sort({ courseName: 1 });
      return res.status(200).json(structures);
    }

    if (req.method === 'POST') {
      const newStructure = new FeeStructure(req.body);
      await newStructure.save();
      return res.status(201).json(newStructure);
    }

    return res.status(405).json({ message: 'Method not allowed' });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: 'A fee structure for this course already exists.' });
    }
    console.error('Admin fee structures error:', error);
    res.status(500).json({ message: 'Server error managing fee structures.' });
  }
}