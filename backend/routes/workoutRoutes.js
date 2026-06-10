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
    { name: 'Bench Press', targetMuscles: ['chest', 'triceps'], sets: 4, reps: '8-10', restTime: '90s' },
    { name: 'Overhead Shoulder Press', targetMuscles: ['shoulders', 'triceps'], sets: 3, reps: '10-12', restTime: '90s' },
    { name: 'Incline Dumbbell Press', targetMuscles: ['chest', 'shoulders'], sets: 3, reps: '10-12', restTime: '90s' },
    { name: 'Triceps Pushdowns', targetMuscles: ['triceps'], sets: 3, reps: '12-15', restTime: '60s' },
    { name: 'Lateral Raises', targetMuscles: ['shoulders'], sets: 4, reps: '15', restTime: '60s' },
  ],
  pull: [
    { name: 'Lat Pulldowns', targetMuscles: ['lats', 'biceps'], sets: 4, reps: '8-10', restTime: '90s' },
    { name: 'Bent Over Barbell Rows', targetMuscles: ['upper back', 'biceps'], sets: 3, reps: '10-12', restTime: '90s' },
    { name: 'Face Pulls', targetMuscles: ['rear delts', 'upper back'], sets: 3, reps: '15', restTime: '60s' },
    { name: 'Bicep Barbell Curls', targetMuscles: ['biceps'], sets: 3, reps: '10-12', restTime: '60s' },
    { name: 'Hammer Curls', targetMuscles: ['biceps', 'forearms'], sets: 3, reps: '12-15', restTime: '60s' },
  ],
  legs: [
    { name: 'Barbell Squats', targetMuscles: ['quads', 'glutes'], sets: 4, reps: '8-10', restTime: '120s' },
    { name: 'Romanian Deadlifts', targetMuscles: ['hamstrings', 'glutes'], sets: 3, reps: '10-12', restTime: '90s' },
    { name: 'Leg Press', targetMuscles: ['quads', 'hamstrings'], sets: 3, reps: '12-15', restTime: '90s' },
    { name: 'Standing Calf Raises', targetMuscles: ['calves'], sets: 4, reps: '15', restTime: '60s' },
    { name: 'Planks', targetMuscles: ['core'], sets: 3, reps: '60s hold', restTime: '60s' },
  ],
  full_body: [
    { name: 'Squats', targetMuscles: ['quads', 'glutes'], sets: 3, reps: '10', restTime: '90s' },
    { name: 'Bench Press', targetMuscles: ['chest', 'triceps'], sets: 3, reps: '10', restTime: '90s' },
    { name: 'Barbell Rows', targetMuscles: ['back', 'biceps'], sets: 3, reps: '10', restTime: '90s' },
    { name: 'Overhead Press', targetMuscles: ['shoulders', 'triceps'], sets: 3, reps: '12', restTime: '90s' },
    { name: 'Bicep Curls', targetMuscles: ['biceps'], sets: 3, reps: '12', restTime: '60s' },
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

// V2 Generate AI Workout with flexible user prompts
const generateAIWorkout = async (profile, historyText, customPrompt) => {
  const systemPrompt = `You are an AI personal trainer and expert fitness coach. Design a structured workout routine tailored to the user's constraints, history, and goals. Always output ONLY valid JSON. Do not include markdown codeblocks (\`\`\`json) or conversational text.`;

  const contextText = `
    User Profile:
    - Fitness Goal: ${profile.fitnessGoal}
    - Workout Split: ${profile.workoutSplit}
    - Experience: ${profile.workoutExperience}
    - Equipment Location: ${profile.gymLocation}

    Recent History:
    ${historyText}
  `;

  const userPrompt = `
    Context:
    ${contextText}

    User Request:
    "${customPrompt || 'Generate a standard workout according to my split and history.'}"

    Please plan a workout targeting the muscle groups appropriate for the request.
    Ensure you output a single JSON object containing:
    {
      "name": "Workout Name (e.g. Chest & Triceps Push, Quick 45m Dumbbell Only, Lower Body Hypertrophy)",
      "difficulty": "Beginner | Intermediate | Advanced",
      "estimatedDuration": number_in_minutes (e.g. 45, 60),
      "exercises": [
        {
          "name": "Exercise Name",
          "targetMuscles": ["muscle1", "muscle2"],
          "sets": number,
          "reps": "rep range (e.g. 8-10, 10-12, Max)",
          "restTime": "rest interval (e.g. 90s, 2 mins)"
        }
      ]
    }
  `;

  try {
    return await queryNvidiaAI(systemPrompt, userPrompt, true);
  } catch (error) {
    console.error('NVIDIA workout planning error:', error);
    throw error;
  }
};

const rerollAIExercise = async (exerciseName, profile, existingNames = []) => {
  const systemPrompt = `You are an AI personal trainer.`;
  const userPrompt = `Substitute the exercise "${exerciseName}".
    User details:
    - Location: ${profile.gymLocation}
    - Fitness Goal: ${profile.fitnessGoal}

    Avoid these exercises already in the workout plan: ${JSON.stringify(existingNames)}.

    Suggest ONE alternative exercise that targets the same muscle groups.
    Return ONLY a JSON object:
    {
      "name": "Alternative Exercise Name",
      "targetMuscles": ["muscle1", "muscle2"],
      "sets": number,
      "reps": "rep range",
      "restTime": "rest interval (e.g. 90s)"
    }
    Do not output any introductory or concluding text, only the raw JSON.`;

  try {
    return await queryNvidiaAI(systemPrompt, userPrompt, true, 0.7);
  } catch (error) {
    console.error('NVIDIA exercise reroll error:', error);
    throw error;
  }
};

// @desc    Get weight/reps volume trends for analytics
// @route   GET /api/workouts/analytics/trends
// @access  Private
router.get('/analytics/trends', protect, async (req, res) => {
  try {
    const logs = await WorkoutLog.find({ user: req.user._id, skipped: false })
      .sort({ date: 1 });

    const trends = {};

    logs.forEach(log => {
      log.exercises.forEach(ex => {
        let completedVolume = 0;
        let maxWeight = 0;
        let completedSetsCount = 0;

        if (ex.setDetails && ex.setDetails.length > 0) {
          ex.setDetails.forEach(set => {
            if (set.completed && set.weight > 0 && set.reps > 0) {
              completedVolume += set.weight * set.reps;
              if (set.weight > maxWeight) {
                maxWeight = set.weight;
              }
              completedSetsCount++;
            }
          });
        } else if (ex.completed) {
          const repsVal = parseInt(ex.reps) || 10;
          const weightVal = parseFloat(ex.weight) || 0;
          completedVolume = ex.sets * repsVal * weightVal;
          maxWeight = weightVal;
          completedSetsCount = ex.sets;
        }

        if (completedSetsCount > 0) {
          const key = ex.name.trim().toLowerCase();
          if (!trends[key]) {
            trends[key] = {
              name: ex.name,
              history: []
            };
          }
          trends[key].history.push({
            date: log.date,
            volume: completedVolume,
            maxWeight: maxWeight,
            sets: completedSetsCount
          });
        }
      });
    });

    res.json(Object.values(trends));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Get progress analytics summary (PRs, completion, and achievements)
// @route   GET /api/workouts/analytics/summary
// @access  Private
router.get('/analytics/summary', protect, async (req, res) => {
  try {
    const logs = await WorkoutLog.find({ user: req.user._id });
    
    // 1. Calculate Personal Records (PRs) & historical tracking logs
    const prs = {};
    const exerciseLogs = {}; // exerciseName -> [{ date, maxWeight }]

    logs.forEach(log => {
      if (log.skipped) return;
      log.exercises.forEach(ex => {
        const exName = ex.name.trim();
        let dailyMax = 0;

        if (ex.setDetails && ex.setDetails.length > 0) {
          ex.setDetails.forEach(set => {
            if (set.completed && set.weight > 0) {
              if (set.weight > dailyMax) {
                dailyMax = set.weight;
              }
            }
          });
        }

        if (dailyMax > 0) {
          // Track overall PR
          if (!prs[exName] || dailyMax > prs[exName]) {
            prs[exName] = dailyMax;
          }
          
          // Save for achievements calculation
          if (!exerciseLogs[exName]) {
            exerciseLogs[exName] = [];
          }
          exerciseLogs[exName].push({ date: log.date, maxWeight: dailyMax });
        }
      });
    });

    // 2. Generate Achievements Text (strength progression over weeks)
    const achievements = [];
    Object.entries(exerciseLogs).forEach(([exName, history]) => {
      // Sort chronologically ascending
      history.sort((a, b) => a.date.localeCompare(b.date));
      if (history.length >= 2) {
        const first = history[0];
        const latest = history[history.length - 1];
        const diff = latest.maxWeight - first.maxWeight;

        if (diff > 0) {
          const firstDate = new Date(first.date);
          const latestDate = new Date(latest.date);
          const weeks = Math.max(1, Math.round((latestDate - firstDate) / (7 * 24 * 60 * 60 * 1000)));
          achievements.push(`${exName} improved by ${diff} kg in ${weeks} weeks.`);
        }
      }
    });

    // 3. Weekly completion rates (last 4 weeks/logs)
    const activeLogs = logs.filter(l => l.exercises.length > 0 || l.skipped);
    // Sort descending by date to get recent ones
    activeLogs.sort((a, b) => b.date.localeCompare(a.date));
    const recentLogs = activeLogs.slice(0, 12); // up to 12 logs

    const totalWorkouts = recentLogs.length;
    const completedWorkouts = recentLogs.filter(log => !log.skipped && log.exercises.length > 0 && log.exercises.every(ex => ex.completed)).length;
    const skippedWorkouts = recentLogs.filter(log => log.skipped).length;
    const completionRate = totalWorkouts > 0 ? Math.round((completedWorkouts / totalWorkouts) * 100) : 0;

    res.json({
      prs,
      achievements,
      completion: {
        totalWorkouts,
        completedWorkouts,
        skippedWorkouts,
        completionRate
      }
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Get historical set performance for an exercise
// @route   GET /api/workouts/exercise/:name/history
// @access  Private
router.get('/exercise/:name/history', protect, async (req, res) => {
  const { name } = req.params;

  try {
    const logs = await WorkoutLog.find({
      user: req.user._id,
      skipped: false,
      'exercises.name': { $regex: new RegExp(`^${name.trim()}$`, 'i') }
    }).sort({ date: -1 }).limit(5);

    const history = logs.map(log => {
      const exercise = log.exercises.find(ex => ex.name.toLowerCase() === name.trim().toLowerCase());
      return {
        date: log.date,
        sets: exercise.setDetails.map(sd => ({
          weight: sd.weight,
          reps: sd.reps,
          completed: sd.completed
        }))
      };
    });

    res.json(history);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Get workout log for a date
// @route   GET /api/workouts/:date
// @access  Private
router.get('/:date', protect, async (req, res) => {
  const { date } = req.params;

  try {
    let log = await WorkoutLog.findOne({ user: req.user._id, date });
    if (log) {
      let modified = false;
      log.exercises.forEach(ex => {
        if (!ex.setDetails || ex.setDetails.length === 0) {
          const defaultSets = ex.sets || 3;
          const details = [];
          for (let i = 0; i < defaultSets; i++) {
            details.push({ weight: 0, reps: 0, completed: false });
          }
          ex.setDetails = details;
          modified = true;
        }
      });
      if (modified) {
        await log.save();
      }
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
      yesterdayLog.exercises.forEach(ex => {
        ex.completed = true;
        if (ex.setDetails) {
          ex.setDetails.forEach(s => { s.completed = true; });
        }
      });
      await yesterdayLog.save();
      return res.json({ success: true, action: 'marked_completed' });
    } else {
      yesterdayLog.skipped = true;
      await yesterdayLog.save();

      let todayLog = await WorkoutLog.findOne({ user: req.user._id, date: targetDate });
      if (!todayLog) {
        todayLog = new WorkoutLog({
          user: req.user._id,
          date: targetDate,
          exercises: []
        });
      }

      const shiftedExercises = yesterdayLog.exercises.map(ex => {
        const defaultSets = ex.sets || 3;
        const setDetails = ex.setDetails && ex.setDetails.length > 0
          ? ex.setDetails.map(sd => ({ weight: sd.weight, reps: sd.reps, completed: false }))
          : Array.from({ length: defaultSets }, () => ({ weight: 0, reps: 0, completed: false }));
        return {
          name: ex.name,
          targetMuscles: ex.targetMuscles,
          sets: defaultSets,
          reps: ex.reps,
          restTime: ex.restTime || '90s',
          completed: false,
          setDetails
        };
      });

      todayLog.exercises = [...todayLog.exercises, ...shiftedExercises];
      todayLog.skipped = false;
      await todayLog.save();

      return res.json({ success: true, action: 'shifted', log: todayLog });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Generate/Plan a workout for a date (AI Fitness Coach V2)
// @route   POST /api/workouts/generate
// @access  Private
router.post('/generate', protect, async (req, res) => {
  const { date, prompt } = req.body;

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

    let log = await WorkoutLog.findOne({ user: req.user._id, date });
    if (log && log.exercises.length > 0) {
      return res.json({ log, message: 'Workout already generated for today' });
    }

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

    let workoutData;
    let aiUsed = true;

    try {
      workoutData = await generateAIWorkout(profile, historyText, prompt);
    } catch (aiError) {
      console.error(aiError);
      aiUsed = false;
      const fallbackExercises = generateRulesWorkout(profile.workoutSplit, recentLogs);
      workoutData = {
        name: `${profile.workoutSplit.replace('_', ' ').toUpperCase()} Day`,
        difficulty: 'Intermediate',
        estimatedDuration: 45,
        exercises: fallbackExercises
      };
    }

    if (!log) {
      log = new WorkoutLog({ user: req.user._id, date, exercises: [] });
    }

    log.name = workoutData.name || 'Planned Workout';
    log.difficulty = workoutData.difficulty || 'Intermediate';
    log.estimatedDuration = Number(workoutData.estimatedDuration) || 45;

    log.exercises = workoutData.exercises.map(ex => {
      const defaultSets = ex.sets || 3;
      const setDetails = [];
      for (let i = 0; i < defaultSets; i++) {
        setDetails.push({ weight: 0, reps: 0, completed: false });
      }
      return {
        name: ex.name,
        targetMuscles: ex.targetMuscles,
        sets: defaultSets,
        reps: ex.reps || '10-12',
        restTime: ex.restTime || '90s',
        completed: false,
        setDetails
      };
    });
    log.skipped = false;

    await log.save();
    res.json({ log, aiUsed });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Duplicate workout log to target date
// @route   POST /api/workouts/:date/duplicate
// @access  Private
router.post('/:date/duplicate', protect, async (req, res) => {
  const { date } = req.params;
  const { targetDate } = req.body;

  if (!targetDate) {
    return res.status(400).json({ message: 'Target date is required' });
  }

  try {
    const sourceLog = await WorkoutLog.findOne({ user: req.user._id, date });
    if (!sourceLog) {
      return res.status(404).json({ message: 'Source workout log not found' });
    }

    let targetLog = await WorkoutLog.findOne({ user: req.user._id, date: targetDate });
    if (!targetLog) {
      targetLog = new WorkoutLog({ user: req.user._id, date: targetDate, exercises: [] });
    }

    targetLog.name = sourceLog.name;
    targetLog.difficulty = sourceLog.difficulty;
    targetLog.estimatedDuration = sourceLog.estimatedDuration;
    targetLog.skipped = false;
    
    targetLog.exercises = sourceLog.exercises.map(ex => {
      const setDetails = ex.setDetails.map(sd => ({
        weight: sd.weight,
        reps: sd.reps,
        completed: false
      }));
      return {
        name: ex.name,
        targetMuscles: ex.targetMuscles,
        sets: ex.sets,
        reps: ex.reps,
        restTime: ex.restTime || '90s',
        completed: false,
        setDetails
      };
    });

    await targetLog.save();
    res.json(targetLog);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Update workout metadata (title name, difficulty, estimatedDuration, notes)
// @route   PUT /api/workouts/:date/metadata
// @access  Private
router.put('/:date/metadata', protect, async (req, res) => {
  const { date } = req.params;
  const { name, difficulty, estimatedDuration, notes } = req.body;

  try {
    const log = await WorkoutLog.findOne({ user: req.user._id, date });
    if (!log) {
      return res.status(404).json({ message: 'Workout log not found' });
    }

    if (name !== undefined) log.name = name;
    if (difficulty !== undefined) log.difficulty = difficulty;
    if (estimatedDuration !== undefined) log.estimatedDuration = Number(estimatedDuration) || 0;
    if (notes !== undefined) log.notes = notes;

    await log.save();
    res.json(log);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Edit individual exercise settings (name, sets, reps, restTime)
// @route   PUT /api/workouts/:date/exercise/:exerciseId
// @access  Private
router.put('/:date/exercise/:exerciseId', protect, async (req, res) => {
  const { date, exerciseId } = req.params;
  const { name, sets, reps, restTime } = req.body;

  try {
    const log = await WorkoutLog.findOne({ user: req.user._id, date });
    if (!log) {
      return res.status(404).json({ message: 'Workout log not found' });
    }

    const exercise = log.exercises.id(exerciseId);
    if (!exercise) {
      return res.status(404).json({ message: 'Exercise not found in log' });
    }

    if (name !== undefined) exercise.name = name;
    if (reps !== undefined) exercise.reps = reps;
    if (restTime !== undefined) exercise.restTime = restTime;

    if (sets !== undefined) {
      const newSetsCount = Number(sets);
      if (newSetsCount > 0 && newSetsCount !== exercise.sets) {
        exercise.sets = newSetsCount;
        const currentDetails = exercise.setDetails || [];
        
        if (newSetsCount > currentDetails.length) {
          const diff = newSetsCount - currentDetails.length;
          for (let i = 0; i < diff; i++) {
            currentDetails.push({ weight: 0, reps: 0, completed: false });
          }
        } else if (newSetsCount < currentDetails.length) {
          currentDetails.splice(newSetsCount);
        }
        
        exercise.setDetails = currentDetails;
        exercise.completed = exercise.setDetails.every(s => s.completed);
      }
    }

    await log.save();
    res.json(log);
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
    if (exercise.setDetails) {
      exercise.setDetails.forEach(s => { s.completed = exercise.completed; });
    }

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
      const existingNames = log.exercises.map(e => e.name);
      alternative = await rerollAIExercise(exercise.name, profile, existingNames);
    } catch (error) {
      console.error(error);
      aiUsed = false;
      const muscle = exercise.targetMuscles[0] || 'chest';
      if (muscle === 'chest') {
        alternative = { name: 'Dumbbell Flys', targetMuscles: ['chest'], sets: 3, reps: '12-15', restTime: '90s' };
      } else if (muscle === 'quads') {
        alternative = { name: 'Lunges', targetMuscles: ['quads', 'glutes'], sets: 3, reps: '12 per leg', restTime: '90s' };
      } else if (muscle === 'biceps') {
        alternative = { name: 'Concentration Curls', targetMuscles: ['biceps'], sets: 3, reps: '12', restTime: '60s' };
      } else if (muscle === 'triceps') {
        alternative = { name: 'Overhead Triceps Extensions', targetMuscles: ['triceps'], sets: 3, reps: '12', restTime: '60s' };
      } else if (muscle === 'lats') {
        alternative = { name: 'Single Arm Dumbbell Rows', targetMuscles: ['lats', 'upper back'], sets: 3, reps: '10', restTime: '90s' };
      } else {
        alternative = { name: 'Pushups', targetMuscles: ['chest', 'shoulders', 'triceps'], sets: 3, reps: 'Max reps', restTime: '60s' };
      }
    }

    exercise.substitutedWith = exercise.name;
    exercise.name = alternative.name;
    exercise.targetMuscles = alternative.targetMuscles;
    exercise.sets = alternative.sets;
    exercise.reps = alternative.reps;
    exercise.restTime = alternative.restTime || '90s';
    exercise.substituted = true;

    // Resize setDetails to match sets count of alternative
    const defaultSets = alternative.sets || 3;
    const setDetails = [];
    for (let i = 0; i < defaultSets; i++) {
      setDetails.push({ weight: 0, reps: 0, completed: false });
    }
    exercise.setDetails = setDetails;
    exercise.completed = false;

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

// @desc    Toggle rest day flag for a date
// @route   POST /api/workouts/:date/rest-day
// @access  Private
router.post('/:date/rest-day', protect, async (req, res) => {
  const { date } = req.params;

  try {
    let log = await WorkoutLog.findOne({ user: req.user._id, date });
    if (!log) {
      log = new WorkoutLog({ user: req.user._id, date, exercises: [] });
    }

    log.isRestDay = !log.isRestDay;
    // When marking as rest day, clear exercises and reset skip
    if (log.isRestDay) {
      log.exercises = [];
      log.skipped = false;
    }
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
  const { name, targetMuscles, sets, reps, restTime } = req.body;

  try {
    let log = await WorkoutLog.findOne({ user: req.user._id, date });
    if (!log) {
      log = new WorkoutLog({ user: req.user._id, date, exercises: [] });
    }

    const defaultSets = Number(sets) || 3;
    const setDetails = [];
    for (let i = 0; i < defaultSets; i++) {
      setDetails.push({ weight: 0, reps: 0, completed: false });
    }

    log.exercises.push({
      name,
      targetMuscles: targetMuscles || [],
      sets: defaultSets,
      reps: reps || '10',
      restTime: restTime || '90s',
      completed: false,
      setDetails
    });

    await log.save();
    res.json(log);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Update weight, reps, and completed status of a set in an exercise
// @route   POST /api/workouts/:date/exercise/:exerciseId/sets
// @access  Private
router.post('/:date/exercise/:exerciseId/sets', protect, async (req, res) => {
  const { date, exerciseId } = req.params;
  const { setIndex, weight, reps, completed } = req.body;

  try {
    const log = await WorkoutLog.findOne({ user: req.user._id, date });
    if (!log) {
      return res.status(404).json({ message: 'Workout log not found' });
    }

    const exercise = log.exercises.id(exerciseId);
    if (!exercise) {
      return res.status(404).json({ message: 'Exercise not found in log' });
    }

    if (!exercise.setDetails || exercise.setDetails.length === 0) {
      const defaultSets = exercise.sets || 3;
      const details = [];
      for (let i = 0; i < defaultSets; i++) {
        details.push({ weight: 0, reps: 0, completed: false });
      }
      exercise.setDetails = details;
    }

    if (setIndex >= 0 && setIndex < exercise.setDetails.length) {
      if (weight !== undefined) exercise.setDetails[setIndex].weight = Number(weight);
      if (reps !== undefined) exercise.setDetails[setIndex].reps = Number(reps);
      if (completed !== undefined) exercise.setDetails[setIndex].completed = !!completed;

      // Update parent exercise completed status if all sets completed
      exercise.completed = exercise.setDetails.every(s => s.completed);
    } else {
      return res.status(400).json({ message: 'Invalid set index' });
    }

    await log.save();
    res.json(log);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Update workout elapsed duration
// @route   POST /api/workouts/:date/duration
// @access  Private
router.post('/:date/duration', protect, async (req, res) => {
  const { date } = req.params;
  const { duration } = req.body;

  try {
    let log = await WorkoutLog.findOne({ user: req.user._id, date });
    if (!log) {
      log = new WorkoutLog({ user: req.user._id, date, exercises: [] });
    }

    log.duration = Number(duration) || 0;
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
