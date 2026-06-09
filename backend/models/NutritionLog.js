import mongoose from 'mongoose';

const foodItemSchema = new mongoose.Schema({
  name: { type: String, required: true },
  quantity: { type: Number, required: true },
  unit: { type: String, required: true }, // gm, bowl, pieces, ml, etc.
  calories: { type: Number, required: true },
  protein: { type: Number, default: 0 },
  carbs: { type: Number, default: 0 },
  fat: { type: Number, default: 0 },
});

const nutritionLogSchema = new mongoose.Schema(
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
    items: [foodItemSchema],
    totalCalories: { type: Number, default: 0 },
    totalProtein: { type: Number, default: 0 },
    totalCarbs: { type: Number, default: 0 },
    totalFat: { type: Number, default: 0 },
  },
  {
    timestamps: true,
  }
);

// Create compound index for fast lookups per user per day
nutritionLogSchema.index({ user: 1, date: 1 }, { unique: true });

// Pre-save hook to aggregate totals
nutritionLogSchema.pre('save', function(next) {
  let calories = 0;
  let protein = 0;
  let carbs = 0;
  let fat = 0;

  this.items.forEach(item => {
    calories += item.calories;
    protein += item.protein;
    carbs += item.carbs;
    fat += item.fat;
  });

  this.totalCalories = Math.round(calories);
  this.totalProtein = Math.round(protein);
  this.totalCarbs = Math.round(carbs);
  this.totalFat = Math.round(fat);

  next();
});

const NutritionLog = mongoose.model('NutritionLog', nutritionLogSchema);
export default NutritionLog;
