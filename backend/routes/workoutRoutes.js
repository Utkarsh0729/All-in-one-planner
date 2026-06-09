import express from 'express';
import { protect } from '../middleware/auth.js';
import WorkoutLog from '../models/WorkoutLog.js';
import Profile from '../models/Profile.js';
import { queryNvidiaAI } from '../utils/nvidia.js';

const router = express.Router();

// Helper to add/subtract days from a date string (YYYY-MM-DD)
const adjustDate = (dateStr, days) => {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
};

// Fallback exercises database for rules-based workout planner
const FALLBACK_EXERCISES = {
  push: [
    { name: 'Bench Press', targetMuscles: ['chest', 'triceps'], sets: 4, reps: '8-10' },
    { name: 'Overhead Shoulder Press', targetMuscles: ['shoulders', 'triceps'], sets: 3, reps: '10-12' },
    { name: 'Incline Dumbbell Press', targetMuscles: ['chest', 'shoulders'], sets: 3, reps: '10-12' },
    { name: 'Triceps Pushdowns', targetMuscles: ['triceps'], sets: 3, reps: '12-15' },
    { name: 'Lateral Raises', targetMuscles: ['shoulders'], sets: 4, reps: '15' },
  ],
  pull: [
    { name: 'Pull-Ups / Lat Pulldowns', targetMuscles: ['lats', 'biceps'], sets: 4, reps: '8-10' },
    { name: 'Bent Over Barbell Rows', targetMuscles: ['upper back', 'biceps'], sets: 3, reps: '10-12' },
    { name: 'Face Pulls', targetMuscles: ['rear delts', 'upper back'], sets: 3, reps: '15' },
    { name: 'Bicep Barbell Curls', targetMuscles: ['biceps'], sets: 3, reps: '10-12' },
    { name: 'Hammer Curls', targetMuscles: ['biceps', 'forearms'], sets: 3, reps: '12-15' },
  ],
  legs: [
    { name: 'Barbell Squats', targetMuscles: ['quads', 'glutes'], sets: 4, reps: '8-10' },
    { name: 'Romanian Deadlifts', targetMuscles: ['hamstrings', 'glutes'], sets: 3, reps: '10-12' },
    { name: 'Leg Press', targetMuscles: ['quads', 'hamstrings'], sets: 3, reps: '12-15' },
    { name: 'Standing Calf Raises', targetMuscles: ['calves'], sets: 4, reps: '15' },
    { name: 'Planks', targetMuscles: ['core'], sets: 3, reps: '60s hold' },
  ],
  full_body: [
    { name: 'Squats', targetMuscles: ['quads', 'glutes'], sets: 3, reps: '10' },
    { name: 'Bench Press', targetMuscles: ['chest', 'triceps'], sets: 3, reps: '10' },
    { name: 'Barbell Rows', targetMuscles: ['back', 'biceps'], sets: 3, reps: '10' },
    { name: 'Overhead Press', targetMuscles: ['shoulders', 'triceps'], sets: 3, reps: '12' },
    { name: 'Bicep Curls', targetMuscles: ['biceps'], sets: 3, reps: '12' },
  ]
};

const generateRulesWorkout = (split, historyLogs) => {
  if (split === 'push_pull_legs') {
    const activeDays = historyLogs.filter(log => log.exercises.length > 0 && !log.skipped);
    if (activeDays.length === 0) return FALLBACK_EXERCISES.push;

    const lastWorkoutNames = activeDays[0].exercises.map(e => e.name);
    const wasPush = lastWorkoutNames.some(name => FALLBACK_EXERCISES.push.some(e => e.name === name));
    const wasPull = lastWorkoutNames.some(name => FALLBACK_EXERCISES.pull.some(e => e.name === name));

    if (wasPush) return FALLBACK_EXERCISES.pull;
    if (wasPull) return FALLBACK_EXERCISES.legs;
    return FALLBACK_EXERCISES.push;
  }
  return FALLBACK_EXERCISES.full_body;
};

const generateAIWorkout = async (profile, historyText) => {
  const systemPrompt = `You are an AI personal trainer. Plan a structured workout routine for today.`;
  const userPrompt = `Plan a workout for today.
    User Info:
    - Fitness Goal: ${profile.fitnessGoal}
    - Workout Split: ${profile.workoutSplit}
    - Experience: ${profile.workoutExperience}
    - Equipment Location: ${profile.gymLocation}

    Recent Workout History:
    ${historyText}

    Plan a workout targeting the muscle groups appropriate for their split while avoiding overtraining recently worked muscles.
    Keep the workout structured. Return ONLY a JSON array of exercises:
    [
      {
        "name": "Exercise Name",
        "targetMuscles": ["muscle1", "muscle2"],
        "sets": number,
        "reps": "rep range (e.g. 10-12)"
      }
    ]
    Do not output any introductory or concluding text, only the raw JSON.`;

  try {
    return await queryNvidiaAI(systemPrompt, userPrompt, true);
  } catch (error) {
    console.error('NVIDIA workout planning error:', error);
    throw error;
  }
};

const rerollAIExercise = async (exerciseName, profile) => {
  const systemPrompt = `You are an AI personal trainer.`;
  const userPrompt = `Substitute the exercise "${exerciseName}".
    User details:
    - Location: ${profile.gymLocation}
    - Fitness Goal: ${profile.fitnessGoal}

    Suggest ONE alternative exercise that targets the same muscle groups.
    Return ONLY a JSON object:
    {
      "name": "Alternative Exercise Name",
      "targetMuscles": ["muscle1", "muscle2"],
      "sets": number,
      "reps": "rep range"
    }
    Do not output any introductory or concluding text, only the raw JSON.`;

  try {
    return await queryNvidiaAI(systemPrompt, userPrompt, true);
  } catch (error) {
    console.error('NVIDIA exercise reroll error:', error);
    throw error;
  }
};

// @desc    Get workout log for a date
// @route   GET /api/workouts/:date
// @access  Private
router.get('/:date', protect, async (req, res) => {
  const { date } = req.params;

  try {
    let log = await WorkoutLog.findOne({ user: req.user._id, date });
    if (log) {
      return res.json(log);
    }

    // No log exists for date. Check if there was an unmarked workout yesterday
    const yesterdayStr = adjustDate(date, -1);
    const yesterdayLog = await WorkoutLog.findOne({ user: req.user._id, date: yesterdayStr });
    
    if (
      yesterdayLog && 
      yesterdayLog.exercises.length > 0 && 
      !yesterdayLog.skipped && 
      yesterdayLog.exercises.every(ex => !ex.completed)
    ) {
      // Yesterday was completely unmarked! Ask user how to resolve
      return res.json({
        date,
        exercises: [],
        skipped: false,
        notes: '',
        hasUnmarkedYesterday: true,
        yesterdayDate: yesterdayStr
      });
    }

    // Normal empty log response
    res.json({
      date,
      exercises: [],
      skipped: false,
      notes: ''
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Resolve yesterday's unmarked workout
// @route   POST /api/workouts/resolve-unmarked
// @access  Private
router.post('/resolve-unmarked', protect, async (req, res) => {
  const { targetDate, yesterdayDate, performed } = req.body;

  if (!targetDate || !yesterdayDate || performed === undefined) {
    return res.status(400).json({ message: 'Missing required parameters' });
  }

  try {
    const yesterdayLog = await WorkoutLog.findOne({ user: req.user._id, date: yesterdayDate });
    if (!yesterdayLog) {
      return res.status(404).json({ message: 'Yesterday\'s workout log not found' });
    }

    if (performed) {
      // 1. User performed yesterday's workout. Mark all exercises as completed.
      yesterdayLog.exercises.forEach(ex => {
        ex.completed = true;
      });
      await yesterdayLog.save();
      return res.json({ success: true, action: 'marked_completed' });
    } else {
      // 2. User did NOT perform it. Shift exercises to targetDate, mark yesterday as skipped.
      yesterdayLog.skipped = true;
      await yesterdayLog.save();

      // Create or update today's log with shifted exercises
      let todayLog = await WorkoutLog.findOne({ user: req.user._id, date: targetDate });
      if (!todayLog) {
        todayLog = new WorkoutLog({
          user: req.user._id,
          date: targetDate,
          exercises: []
        });
      }

      // Copy exercises (strip _id to avoid duplicates)
      const shiftedExercises = yesterdayLog.exercises.map(ex => ({
        name: ex.name,
        targetMuscles: ex.targetMuscles,
        sets: ex.sets,
        reps: ex.reps,
        completed: false
      }));

      todayLog.exercises = [...todayLog.exercises, ...shiftedExercises];
      todayLog.skipped = false;
      await todayLog.save();

      return res.json({ success: true, action: 'shifted', log: todayLog });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Generate/Plan a workout for a date
// @route   POST /api/workouts/generate
// @access  Private
router.post('/generate', protect, async (req, res) => {
  const { date } = req.body;

  if (!date) {
    return res.status(400).json({ message: 'Date is required' });
  }

  try {
    const profile = await Profile.findOne({ user: req.user._id });
    if (!profile || !profile.workoutSplit) {
      return res.status(400).json({ 
        message: 'Onboarding required. Please submit fitness metrics first.' 
      });
    }

    // Check if workout already exists for this date
    let log = await WorkoutLog.findOne({ user: req.user._id, date });
    if (log && log.exercises.length > 0) {
      return res.json({ log, message: 'Workout already generated for today' });
    }

    // Fetch last 5 workout logs to construct history context
    const recentLogs = await WorkoutLog.find({ user: req.user._id, date: { $ne: date } })
      .sort({ date: -1 })
      .limit(5);

    let historyText = '';
    if (recentLogs.length > 0) {
      historyText = recentLogs.map(log => {
        if (log.skipped) return `${log.date}: Skipped`;
        const exerciseNames = log.exercises.map(e => `${e.name} (${e.targetMuscles.join(', ')})`);
        return `${log.date}: Trained: [${exerciseNames.join(', ')}]`;
      }).join('\n');
    } else {
      historyText = 'No recent workouts recorded.';
    }

    let exercises = [];
    let aiUsed = true;

    try {
      exercises = await generateAIWorkout(profile, historyText);
    } catch (aiError) {
      aiUsed = false;
      exercises = generateRulesWorkout(profile.workoutSplit, recentLogs);
    }

    if (!log) {
      log = new WorkoutLog({ user: req.user._id, date, exercises: [] });
    }

    log.exercises = exercises.map(ex => ({
      name: ex.name,
      targetMuscles: ex.targetMuscles,
      sets: ex.sets || 3,
      reps: ex.reps || '10-12',
      completed: false
    }));
    log.skipped = false;

    await log.save();
    res.json({ log, aiUsed });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Toggle completion of exercise
// @route   POST /api/workouts/:date/exercise/:exerciseId/toggle
// @access  Private
router.post('/:date/exercise/:exerciseId/toggle', protect, async (req, res) => {
  const { date, exerciseId } = req.params;

  try {
    const log = await WorkoutLog.findOne({ user: req.user._id, date });
    if (!log) {
      return res.status(404).json({ message: 'Workout log not found' });
    }

    const exercise = log.exercises.id(exerciseId);
    if (!exercise) {
      return res.status(404).json({ message: 'Exercise not found in log' });
    }

    exercise.completed = !exercise.completed;
    await log.save();
    res.json(log);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Reroll / substitute exercise
// @route   POST /api/workouts/:date/exercise/:exerciseId/reroll
// @access  Private
router.post('/:date/exercise/:exerciseId/reroll', protect, async (req, res) => {
  const { date, exerciseId } = req.params;

  try {
    const profile = await Profile.findOne({ user: req.user._id });
    const log = await WorkoutLog.findOne({ user: req.user._id, date });
    if (!log) {
      return res.status(404).json({ message: 'Workout log not found' });
    }

    const exercise = log.exercises.id(exerciseId);
    if (!exercise) {
      return res.status(404).json({ message: 'Exercise not found in log' });
    }

    let alternative;
    let aiUsed = true;

    try {
      alternative = await rerollAIExercise(exercise.name, profile);
    } catch (error) {
      aiUsed = false;
      // Fallback substitute
      const muscle = exercise.targetMuscles[0] || 'chest';
      if (muscle === 'chest') {
        alternative = { name: 'Dumbbell Flys', targetMuscles: ['chest'], sets: 3, reps: '12-15' };
      } else if (muscle === 'quads') {
        alternative = { name: 'Lunges', targetMuscles: ['quads', 'glutes'], sets: 3, reps: '12 per leg' };
      } else if (muscle === 'biceps') {
        alternative = { name: 'Concentration Curls', targetMuscles: ['biceps'], sets: 3, reps: '12' };
      } else if (muscle === 'triceps') {
        alternative = { name: 'Overhead Triceps Extensions', targetMuscles: ['triceps'], sets: 3, reps: '12' };
      } else if (muscle === 'lats') {
        alternative = { name: 'Single Arm Dumbbell Rows', targetMuscles: ['lats', 'upper back'], sets: 3, reps: '10' };
      } else {
        alternative = { name: 'Pushups', targetMuscles: ['chest', 'shoulders', 'triceps'], sets: 3, reps: 'Max reps' };
      }
    }

    exercise.substitutedWith = exercise.name;
    exercise.name = alternative.name;
    exercise.targetMuscles = alternative.targetMuscles;
    exercise.sets = alternative.sets;
    exercise.reps = alternative.reps;
    exercise.substituted = true;

    await log.save();
    res.json({ log, aiUsed });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Toggle skip daily workout
// @route   POST /api/workouts/:date/skip
// @access  Private
router.post('/:date/skip', protect, async (req, res) => {
  const { date } = req.params;

  try {
    let log = await WorkoutLog.findOne({ user: req.user._id, date });
    if (!log) {
      log = new WorkoutLog({ user: req.user._id, date, exercises: [] });
    }

    log.skipped = !log.skipped;
    await log.save();
    res.json(log);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Add custom exercise to today's workout
// @route   POST /api/workouts/:date/add
// @access  Private
router.post('/:date/add', protect, async (req, res) => {
  const { date } = req.params;
  const { name, targetMuscles, sets, reps } = req.body;

  try {
    let log = await WorkoutLog.findOne({ user: req.user._id, date });
    if (!log) {
      log = new WorkoutLog({ user: req.user._id, date, exercises: [] });
    }

    log.exercises.push({
      name,
      targetMuscles: targetMuscles || [],
      sets: Number(sets) || 3,
      reps: reps || '10',
      completed: false
    });

    await log.save();
    res.json(log);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Remove exercise from today's workout
// @route   DELETE /api/workouts/:date/exercise/:exerciseId
// @access  Private
router.delete('/:date/exercise/:exerciseId', protect, async (req, res) => {
  const { date, exerciseId } = req.params;

  try {
    const log = await WorkoutLog.findOne({ user: req.user._id, date });
    if (!log) {
      return res.status(404).json({ message: 'Workout log not found' });
    }

    log.exercises = log.exercises.filter(ex => ex._id.toString() !== exerciseId);
    await log.save();
    res.json(log);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
