import mongoose from 'mongoose';

const subtaskSchema = new mongoose.Schema({
  text: { type: String, required: true },
  checked: { type: Boolean, default: false }
});

const weekGoalSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    weekStart: {
      type: String, // YYYY-MM-DD
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    completed: {
      type: Boolean,
      default: false,
    },
    progress: {
      type: Number,
      default: 0, // 0 - 100 percentage
    },
    subtasks: [subtaskSchema]
  },
  {
    timestamps: true,
  }
);

// Pre-save hook to calculate progress
weekGoalSchema.pre('save', function(next) {
  if (this.subtasks && this.subtasks.length > 0) {
    const checkedCount = this.subtasks.filter(s => s.checked).length;
    this.progress = Math.round((checkedCount / this.subtasks.length) * 100);
    this.completed = checkedCount === this.subtasks.length;
  } else {
    this.progress = this.completed ? 100 : 0;
  }
  next();
});

const WeekGoal = mongoose.model('WeekGoal', weekGoalSchema);
export default WeekGoal;
