import express from 'express';
import { protect } from '../middleware/auth.js';
import Profile from '../models/Profile.js';
import User from '../models/User.js';
import { queryNvidiaAI } from '../utils/nvidia.js';

const router = express.Router();

// @desc    Get current user's profile
// @route   GET /api/profile
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    let profile = await Profile.findOne({ user: req.user._id });
    if (!profile) {
      // Lazy init profile
      profile = await Profile.create({ user: req.user._id });
    }
    res.json(profile);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Save/Update nutrition onboarding details
// @route   POST /api/profile/nutrition
// @access  Private
router.post('/nutrition', protect, async (req, res) => {
  const { age, gender, height, weight, activityLevel, fitnessGoal } = req.body;

  try {
    let profile = await Profile.findOne({ user: req.user._id });
    if (!profile) {
      profile = new Profile({ user: req.user._id });
    }

    // Assign variables
    profile.age = Number(age);
    profile.gender = gender;
    profile.height = Number(height);
    profile.weight = Number(weight);
    profile.activityLevel = activityLevel;
    profile.fitnessGoal = fitnessGoal;

    // Use NVIDIA AI to calculate customized targets
    const systemPrompt = `You are an expert nutritionist and fitness AI advisor. Calculate personal daily calorie and macronutrient targets.`;
    const userPrompt = `Calculate daily target calories and macros (Protein, Carbs, Fat, Fiber) for a user with the following details:
    - Age: ${age}
    - Gender: ${gender}
    - Height: ${height} cm
    - Weight: ${weight} kg
    - Activity Level: ${activityLevel} (sedentary, lightly_active, moderately_active, very_active)
    - Fitness Goal: ${fitnessGoal} (lose_weight, maintain_weight, gain_muscle)

    Ensure your calculations are realistic and align with professional nutritional guidelines.
    Return ONLY a JSON object:
    {
      "targetCalories": number (kcal),
      "targetProtein": number (grams),
      "targetCarbs": number (grams),
      "targetFat": number (grams),
      "targetFiber": number (grams)
    }
    Do not return any introductory or concluding text, only the raw JSON.`;

    try {
      console.log(`[AI Target Calculation] Querying NVIDIA AI for user fitness stats`);
      const aiTargets = await queryNvidiaAI(systemPrompt, userPrompt, true);
      
      profile.targetCalories = Number(aiTargets.targetCalories) || 2000;
      profile.targetProtein = Number(aiTargets.targetProtein) || 120;
      profile.targetCarbs = Number(aiTargets.targetCarbs) || 200;
      profile.targetFat = Number(aiTargets.targetFat) || 60;
      profile.targetFiber = Number(aiTargets.targetFiber) || Math.round((profile.targetCalories / 1000) * 14);
      console.log(`[AI Target Success] Calories: ${profile.targetCalories}, P: ${profile.targetProtein}g, C: ${profile.targetCarbs}g, F: ${profile.targetFat}g, Fi: ${profile.targetFiber}g`);
    } catch (aiError) {
      console.warn('[AI Target Failed] NVIDIA AI calculation failed. Falling back to local BMR formulas:', aiError);
      // Fallback calculation using standard formulas
      profile.calculateMacros();
    }

    await profile.save();

    // Mark user onboarding completed for nutrition
    await User.findByIdAndUpdate(req.user._id, {
      'onboardingCompleted.nutrition': true,
    });

    res.json(profile);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Save/Update workout onboarding details
// @route   POST /api/profile/workout
// @access  Private
router.post('/workout', protect, async (req, res) => {
  const { workoutExperience, workoutSplit, gymLocation } = req.body;

  try {
    let profile = await Profile.findOne({ user: req.user._id });
    if (!profile) {
      profile = new Profile({ user: req.user._id });
    }

    profile.workoutExperience = workoutExperience;
    profile.workoutSplit = workoutSplit;
    profile.gymLocation = gymLocation;

    await profile.save();

    // Mark user onboarding completed for workout
    await User.findByIdAndUpdate(req.user._id, {
      'onboardingCompleted.workout': true,
    });

    res.json(profile);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
