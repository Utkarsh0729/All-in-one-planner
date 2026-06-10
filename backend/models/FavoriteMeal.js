import mongoose from 'mongoose';

const favoriteMealSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    calories: { type: Number, required: true },
    protein: { type: Number, default: 0 },
    carbs: { type: Number, default: 0 },
    fat: { type: Number, default: 0 },
    fiber: { type: Number, default: 0 },
    quantity: { type: Number, default: 100 },
    unit: { type: String, default: 'g' },
  },
  {
    timestamps: true,
  }
);

// Compound index for unique favorite meal names per user
favoriteMealSchema.index({ user: 1, name: 1 }, { unique: true });

const FavoriteMeal = mongoose.model('FavoriteMeal', favoriteMealSchema);
export default FavoriteMeal;
