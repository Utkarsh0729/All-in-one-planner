import mongoose from 'mongoose';

const activitySchema = new mongoose.Schema({
  name: { type: String, required: true },
  duration: { type: Number, required: true }, // duration in hours (e.g. 1.5, 3)
  category: {
    type: String,
    enum: ['Study', 'Work', 'Fitness', 'Sleep', 'Entertainment', 'Social Media', 'Leisure', 'Other'],
    required: true
  }
});

const routineLogSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    date: {
      type: String, // YYYY-MM-DD
      required: true,
    },
    activities: [activitySchema],
    // Auto-expiry TTL field to preserve free DB storage
    // It will be deleted exactly 14 days after creation
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days from now
      index: { expires: 0 }
    }
  },
  {
    timestamps: true,
  }
);

// Unique log per user per date
routineLogSchema.index({ user: 1, date: 1 }, { unique: true });

const RoutineLog = mongoose.model('RoutineLog', routineLogSchema);
export default RoutineLog;
