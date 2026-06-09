import mongoose from 'mongoose';

const exerciseLogSchema = new mongoose.Schema({
  name: { type: String, required: true },
  targetMuscles: [{ type: String }],
  sets: { type: Number, default: 3 },
  reps: { type: String, default: '10-12' },
  weight: { type: String, default: '' },
  completed: { type: Boolean, default: false },
  substituted: { type: Boolean, default: false },
  substitutedWith: { type: String, default: '' }
});

const workoutLogSchema = new mongoose.Schema(
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
    exercises: [exerciseLogSchema],
    skipped: {
      type: Boolean,
      default: false,
    },
    notes: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

workoutLogSchema.index({ user: 1, date: 1 }, { unique: true });

const WorkoutLog = mongoose.model('WorkoutLog', workoutLogSchema);
export default WorkoutLog;
