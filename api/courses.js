import mongoose from 'mongoose';

// Course schema
const courseSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, required: true },
  icon: { type: String, required: true }
});

courseSchema.virtual('id').get(function () { return this._id.toHexString(); });
courseSchema.set('toJSON', { 
  virtuals: true, 
  transform: (doc, ret) => { delete ret._id; delete ret.__v; } 
});

const Course = mongoose.models.Course || mongoose.model('Course', courseSchema);

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
    console.log('MongoDB connected successfully');
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
    let courses = await Course.find();
    
    if (courses.length === 0) {
      const initialCourses = [
        { name: 'Bharatanatyam', description: 'Explore the grace and storytelling of classical Indian dance.', icon: 'Bharatanatyam' },
        { name: 'Vocal', description: 'Develop your singing voice with professional training techniques.', icon: 'Vocal' },
        { name: 'Drawing', description: 'Learn to express your creativity through sketching and painting.', icon: 'Drawing' },
        { name: 'Abacus', description: 'Enhance mental math skills and concentration with our abacus program.', icon: 'Abacus' }
      ];
      await Course.insertMany(initialCourses);
      courses = await Course.find();
    }
    
    res.status(200).json(courses);
  } catch (error) {
    console.error('Courses error:', error);
    res.status(500).json({ message: 'Server error fetching courses.' });
  }
}