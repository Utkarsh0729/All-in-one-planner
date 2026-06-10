import mongoose from 'mongoose';

const setDetailSchema = new mongoose.Schema({
  weight: { type: Number, default: 0 },
  reps: { type: Number, default: 0 },
  completed: { type: Boolean, default: false }
});

const exerciseLogSchema = new mongoose.Schema({
  name: { type: String, required: true },
  targetMuscles: [{ type: String }],
  sets: { type: Number, default: 3 },
  reps: { type: String, default: '10-12' },
  weight: { type: String, default: '' },
  restTime: { type: String, default: '90s' },
  completed: { type: Boolean, default: false },
  substituted: { type: Boolean, default: false },
  substitutedWith: { type: String, default: '' },
  setDetails: [setDetailSchema]
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
    name: {
      type: String,
      default: 'Planned Workout'
    },
    difficulty: {
      type: String,
      default: 'Intermediate'
    },
    estimatedDuration: {
      type: Number,
      default: 45
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
    duration: {
      type: Number,
      default: 0,
    },
    isRestDay: {
      type: Boolean,
      default: false,
    }
  },
  {
    timestamps: true,
  }
);

workoutLogSchema.index({ user: 1, date: 1 }, { unique: true });

const WorkoutLog = mongoose.model('WorkoutLog', workoutLogSchema);
export default WorkoutLog;
