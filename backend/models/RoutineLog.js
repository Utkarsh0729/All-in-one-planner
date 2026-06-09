import mongoose from 'mongoose';

const routineSlotSchema = new mongoose.Schema({
  hour: { type: Number, required: true }, // 0 to 23
  activity: { type: String, default: '' },
  notes: { type: String, default: '' }
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
    slots: [routineSlotSchema],
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
