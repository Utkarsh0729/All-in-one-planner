import mongoose from 'mongoose';

const profileSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    // Nutrition onboarding variables
    age: { type: Number, default: null },
    gender: { type: String, enum: ['male', 'female', 'other', null], default: null },
    height: { type: Number, default: null }, // in cm
    weight: { type: Number, default: null }, // in kg
    activityLevel: { 
      type: String, 
      enum: ['sedentary', 'lightly_active', 'moderately_active', 'very_active', null], 
      default: null 
    },
    fitnessGoal: { 
      type: String, 
      enum: ['lose_weight', 'maintain_weight', 'gain_muscle', null], 
      default: null 
    },
    targetCalories: { type: Number, default: 2000 },
    targetProtein: { type: Number, default: 120 }, // in grams
    targetCarbs: { type: Number, default: 200 },   // in grams
    targetFat: { type: Number, default: 60 },      // in grams

    // Gym/Workout onboarding variables
    workoutExperience: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced', null],
      default: null
    },
    workoutSplit: {
      type: String,
      enum: ['full_body', 'upper_lower', 'push_pull_legs', 'custom', null],
      default: null
    },
    gymLocation: {
      type: String,
      enum: ['home', 'gym', null],
      default: null
    },
  },
  {
    timestamps: true,
  }
);

// Method to calculate recommended macronutrients based on inputs
profileSchema.methods.calculateMacros = function() {
  if (!this.weight || !this.height || !this.age || !this.gender) return;

  // BMR Calculation (Harris-Benedict Equation)
  let bmr = 0;
  if (this.gender === 'male') {
    bmr = 88.362 + (13.397 * this.weight) + (4.799 * this.height) - (5.677 * this.age);
  } else {
    bmr = 447.593 + (9.247 * this.weight) + (3.098 * this.height) - (4.330 * this.age);
  }

  // TDEE Calculation (Total Daily Energy Expenditure)
  let tdee = bmr;
  switch (this.activityLevel) {
    case 'sedentary': tdee *= 1.2; break;
    case 'lightly_active': tdee *= 1.375; break;
    case 'moderately_active': tdee *= 1.55; break;
    case 'very_active': tdee *= 1.725; break;
    default: tdee *= 1.2;
  }

  // Adjust for Goal
  let calories = Math.round(tdee);
  if (this.fitnessGoal === 'lose_weight') {
    calories -= 500;
  } else if (this.fitnessGoal === 'gain_muscle') {
    calories += 300;
  }

  // Macronutrient Splits
  // Lose weight: High protein (40%), Low carb (30%), Moderate fat (30%)
  // Gain muscle: Moderate protein (30%), High carb (50%), Low fat (20%)
  // Maintain: Balanced - 30% Protein, 40% Carb, 30% Fat
  let proteinRatio = 0.3;
  let carbRatio = 0.4;
  let fatRatio = 0.3;

  if (this.fitnessGoal === 'lose_weight') {
    proteinRatio = 0.35;
    carbRatio = 0.35;
    fatRatio = 0.30;
  } else if (this.fitnessGoal === 'gain_muscle') {
    proteinRatio = 0.30;
    carbRatio = 0.50;
    fatRatio = 0.20;
  }

  this.targetCalories = calories;
  this.targetProtein = Math.round((calories * proteinRatio) / 4);
  this.targetCarbs = Math.round((calories * carbRatio) / 4);
  this.targetFat = Math.round((calories * fatRatio) / 9);
};

const Profile = mongoose.model('Profile', profileSchema);
export default Profile;
