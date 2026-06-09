import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import connectDB from './config/db.js';

// Route imports
import authRoutes from './routes/authRoutes.js';
import profileRoutes from './routes/profileRoutes.js';
import nutritionRoutes from './routes/nutritionRoutes.js';
import workoutRoutes from './routes/workoutRoutes.js';
import routineRoutes from './routes/routineRoutes.js';
import noteRoutes from './routes/noteRoutes.js';
import weekGoalRoutes from './routes/weekGoalRoutes.js';
import reminderRoutes from './routes/reminderRoutes.js';

// Load environment variables
dotenv.config();

// Connect to Database
connectDB();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/nutrition', nutritionRoutes);
app.use('/api/workouts', workoutRoutes);
app.use('/api/routines', routineRoutes);
app.use('/api/notes', noteRoutes);
app.use('/api/week-goals', weekGoalRoutes);
app.use('/api/reminders', reminderRoutes);

// Root Endpoint
app.get('/', (req, res) => {
  res.json({ message: 'All-in-One Planner API is running...' });
});

// Catch-all for unmatched routes
app.use('*', (req, res) => {
  res.status(404).json({ message: `API Route not found: ${req.originalUrl}` });
});

// Global Error Handler
app.use((err, req, res, next) => {
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  res.status(statusCode);
  res.json({
    message: err.message,
    stack: process.env.NODE_ENV === 'production' ? null : err.stack,
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running in development mode on port ${PORT}`);
});
