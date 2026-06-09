import express from 'express';
import { protect } from '../middleware/auth.js';
import Profile from '../models/Profile.js';
import User from '../models/User.js';

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

    // Calculate macros automatically based on details
    profile.calculateMacros();
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
