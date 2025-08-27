import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.SESSION_SECRET || 'a-very-super-secret-key-for-dev';
const COOKIE_NAME = 'nadanaloga_session';

// Notice schema
const noticeSchema = new mongoose.Schema({
  title: { type: String, required: true },
  content: { type: String, required: true },
  issuedAt: { type: Date, default: Date.now },
  recipientIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
});

noticeSchema.virtual('id').get(function () { return this._id.toHexString(); });
noticeSchema.set('toJSON', { virtuals: true, transform: (doc, ret) => { delete ret._id; delete ret.__v; } });

const Notice = mongoose.models.Notice || mongoose.model('Notice', noticeSchema);

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
    
    // Return all notices or notices for the user's family
    const notices = await Notice.find({
      $or: [
        { recipientIds: { $exists: false } },
        { recipientIds: { $size: 0 } },
        { recipientIds: { $in: [session.user.id] } }
      ]
    }).sort({ issuedAt: -1 });
    
    res.status(200).json(notices);
  } catch (error) {
    console.error('Notices error:', error);
    res.status(500).json({ message: 'Server error fetching notices.' });
  }
}