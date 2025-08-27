import mongoose from 'mongoose';

// Location schema
const locationSchema = new mongoose.Schema({
  name: { type: String, required: true },
  address: { type: String, required: true, unique: true },
});

locationSchema.virtual('id').get(function () { return this._id.toHexString(); });
locationSchema.set('toJSON', { virtuals: true, transform: (doc, ret) => { delete ret._id; delete ret.__v; } });

const Location = mongoose.models.Location || mongoose.model('Location', locationSchema);

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

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    await connectDB();
    const locations = await Location.find().sort({ name: 1 });
    res.json(locations);
  } catch (error) {
    console.error('Locations error:', error);
    res.status(500).json({ message: 'Server error fetching locations.' });
  }
}