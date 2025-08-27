import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.SESSION_SECRET || 'a-very-super-secret-key-for-dev';
const COOKIE_NAME = 'nadanaloga_session';

// Event schema
const eventSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  date: { type: Date, required: true },
  location: { type: String, required: true },
  isOnline: { type: Boolean, default: false },
  recipientIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
});

eventSchema.virtual('id').get(function () { return this._id.toHexString(); });
eventSchema.set('toJSON', { virtuals: true, transform: (doc, ret) => { delete ret._id; delete ret.__v; } });

const Event = mongoose.models.Event || mongoose.model('Event', eventSchema);

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
    
    // Return all events or events for the user's family
    const events = await Event.find({
      $or: [
        { recipientIds: { $exists: false } },
        { recipientIds: { $size: 0 } },
        { recipientIds: { $in: [session.user.id] } }
      ]
    }).sort({ date: -1 });
    
    res.status(200).json(events);
  } catch (error) {
    console.error('Events error:', error);
    res.status(500).json({ message: 'Server error fetching events.' });
  }
}