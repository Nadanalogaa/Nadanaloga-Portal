import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.SESSION_SECRET || 'a-very-super-secret-key-for-dev';
const COOKIE_NAME = 'nadanaloga_session';

// Content schemas
const eventSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  date: { type: Date, required: true },
  location: { type: String, required: true },
  isOnline: { type: Boolean, default: false },
  recipientIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
});

const noticeSchema = new mongoose.Schema({
  title: { type: String, required: true },
  content: { type: String, required: true },
  issuedAt: { type: Date, default: Date.now },
  recipientIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
});

const notificationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  subject: { type: String, required: true },
  message: { type: String, required: true },
  read: { type: Boolean, default: false },
  link: { type: String },
  createdAt: { type: Date, default: Date.now }
});

// Apply virtual IDs and JSON transform
[eventSchema, noticeSchema, notificationSchema].forEach(schema => {
  schema.virtual('id').get(function () { return this._id.toHexString(); });
  schema.set('toJSON', { virtuals: true, transform: (doc, ret) => { delete ret._id; delete ret.__v; } });
});

// Models
const Event = mongoose.models.Event || mongoose.model('Event', eventSchema);
const Notice = mongoose.models.Notice || mongoose.model('Notice', noticeSchema);
const Notification = mongoose.models.Notification || mongoose.model('Notification', notificationSchema);

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
    await connectDB();

    const { pathname } = new URL(req.url, `https://${req.headers.host}`);

    // Public endpoints that don't require auth
    if (pathname === '/api/contact' && req.method === 'POST') {
      const { name, email, message } = req.body;
      // For now just return success - you can implement contact storage later
      return res.status(200).json({ success: true });
    }

    // All other endpoints require authentication
    const session = readSession(req);
    if (!session?.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const path = pathname.replace('/api/', '');

    // Events endpoint
    if (path === 'events' && req.method === 'GET') {
      const events = await Event.find({
        $or: [
          { recipientIds: { $exists: false } },
          { recipientIds: { $size: 0 } },
          { recipientIds: { $in: [session.user.id] } }
        ]
      }).sort({ date: -1 });
      
      return res.status(200).json(events);
    }

    // Notices endpoint
    if (path === 'notices' && req.method === 'GET') {
      const notices = await Notice.find({
        $or: [
          { recipientIds: { $exists: false } },
          { recipientIds: { $size: 0 } },
          { recipientIds: { $in: [session.user.id] } }
        ]
      }).sort({ issuedAt: -1 });
      
      return res.status(200).json(notices);
    }

    // Notifications endpoint
    if (path === 'notifications' && req.method === 'GET') {
      const notifications = await Notification.find({ userId: session.user.id }).sort({ createdAt: -1 });
      return res.status(200).json(notifications);
    }

    // Admin content management
    if (session.user.role === 'Admin') {
      if (path === 'admin/events' && req.method === 'GET') {
        const events = await Event.find().sort({ date: -1 });
        return res.status(200).json(events);
      }

      if (path === 'admin/events' && req.method === 'POST') {
        const newEvent = new Event(req.body);
        await newEvent.save();
        return res.status(201).json(newEvent);
      }

      if (path === 'admin/notices' && req.method === 'GET') {
        const notices = await Notice.find().sort({ issuedAt: -1 });
        return res.status(200).json(notices);
      }

      if (path === 'admin/notices' && req.method === 'POST') {
        const newNotice = new Notice(req.body);
        await newNotice.save();
        return res.status(201).json(newNotice);
      }

      if (path === 'admin/grade-exams' && req.method === 'GET') {
        // Return empty array for now
        return res.status(200).json([]);
      }

      if (path === 'admin/book-materials' && req.method === 'GET') {
        // Return empty array for now
        return res.status(200).json([]);
      }
    }

    return res.status(404).json({ message: 'Content endpoint not found' });

  } catch (error) {
    console.error('Content API error:', error);
    res.status(500).json({ message: 'Server error in content API.' });
  }
}