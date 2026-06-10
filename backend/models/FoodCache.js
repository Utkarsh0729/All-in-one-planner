import mongoose from 'mongoose';

const foodCacheSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    calories: { type: Number, required: true }, // kcal per baseQuantity
    protein: { type: Number, required: true },  // g per baseQuantity
    carbs: { type: Number, required: true },    // g per baseQuantity
    fat: { type: Number, required: true },      // g per baseQuantity
    fiber: { type: Number, default: 0 },
    baseUnit: { type: String, default: 'g' },   // unit type (g, piece, ml)
    baseQuantity: { type: Number, default: 100 } // standard base quantity (e.g. 100g)
  },
  {
    timestamps: true,
  }
);


const FoodCache = mongoose.model('FoodCache', foodCacheSchema);
export default FoodCache;
