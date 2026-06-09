import express from 'express';
import cron from 'node-cron';
import { protect } from '../middleware/auth.js';
import User from '../models/User.js';
import Profile from '../models/Profile.js';
import NutritionLog from '../models/NutritionLog.js';
import WorkoutLog from '../models/WorkoutLog.js';
import WeekGoal from '../models/WeekGoal.js';
import { sendDailyReportEmail } from '../utils/mailer.js';

const router = express.Router();

// Helper to get start of current week (YYYY-MM-DD)
const getStartOfWeek = () => {
  const date = new Date();
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
  const startOfWeek = new Date(date.setDate(diff));
  return startOfWeek.toISOString().split('T')[0];
};

// Main generator for user's daily status report object
const generateDailyReport = async (userId) => {
  const todayStr = new Date().toISOString().split('T')[0];
  const weekStartStr = getStartOfWeek();

  const user = await User.findById(userId);
  const profile = await Profile.findOne({ user: userId });
  const nutrition = await NutritionLog.findOne({ user: userId, date: todayStr });
  const workout = await WorkoutLog.findOne({ user: userId, date: todayStr });
  const goals = await WeekGoal.find({ user: userId, weekStart: weekStartStr });

  let nutritionSummary = 'No nutrition data logged for today.';
  if (nutrition && profile && user.onboardingCompleted.nutrition) {
    const remainingCal = profile.targetCalories - nutrition.totalCalories;
    nutritionSummary = `Eaten: ${nutrition.totalCalories} kcal / Target: ${profile.targetCalories} kcal (Protein: ${nutrition.totalProtein}g/${profile.targetProtein}g, Carbs: ${nutrition.totalCarbs}g/${profile.targetCarbs}g, Fat: ${nutrition.totalFat}g/${profile.targetFat}g). ` +
      (remainingCal >= 0 
        ? `You have ${remainingCal} kcal remaining to hit your target.` 
        : `You exceeded your target by ${Math.abs(remainingCal)} kcal.`);
  }

  let workoutSummary = 'No workout planned for today.';
  if (workout) {
    if (workout.skipped) {
      workoutSummary = 'You marked today\'s gym session as Skipped.';
    } else if (workout.exercises.length > 0) {
      const completedCount = workout.exercises.filter(ex => ex.completed).length;
      workoutSummary = `Completed ${completedCount} out of ${workout.exercises.length} planned exercises.`;
    } else {
      workoutSummary = 'You did not log any exercise in the gym manager.';
    }
  }

  let goalSummary = 'No weekly goals listed for this week.';
  if (goals.length > 0) {
    const completedGoals = goals.filter(g => g.completed).length;
    goalSummary = `Completed ${completedGoals} out of ${goals.length} weekly goals. Progress: ${Math.round((completedGoals / goals.length) * 100)}%`;
  }

  return {
    nutrition: nutritionSummary,
    workout: workoutSummary,
    weeklyGoals: goalSummary
  };
};

// @desc    Get subscription status
// @route   GET /api/reminders/settings
// @access  Private
router.get('/settings', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    res.json(user.subscriptions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Toggle reminder subscriptions
// @route   PUT /api/reminders/settings
// @access  Private
router.put('/settings', protect, async (req, res) => {
  const { dailyUpdates } = req.body;

  try {
    const user = await User.findById(req.user._id);
    if (dailyUpdates !== undefined) {
      user.subscriptions.dailyUpdates = dailyUpdates;
      await user.save();
    }
    res.json(user.subscriptions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Fetch 10:00 PM summary report for active day
// @route   GET /api/reminders/today
// @access  Private
router.get('/today', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user.subscriptions.dailyUpdates) {
      return res.json({ 
        subscribed: false, 
        message: 'You have opted out of daily updates.' 
      });
    }

    const report = await generateDailyReport(req.user._id);
    res.json({
      subscribed: true,
      time: '22:00', // 10 PM
      date: new Date().toISOString().split('T')[0],
      report
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Trigger/Send a test email of the daily report
// @route   POST /api/reminders/trigger-email
// @access  Private
router.post('/trigger-email', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const report = await generateDailyReport(req.user._id);
    const todayStr = new Date().toISOString().split('T')[0];

    const result = await sendDailyReportEmail(
      user.email,
      user.name,
      todayStr,
      report
    );

    if (result) {
      res.json({ success: true, message: `Test email successfully dispatched to ${user.email}.` });
    } else {
      res.status(400).json({ 
        success: false, 
        message: 'Failed to send email. Check if SMTP details are configured in .env.' 
      });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Initialize Cron Job to run daily at 10:00 PM (22:00)
// Cron syntax: minute hour day-of-month month day-of-week
cron.schedule('0 22 * * *', async () => {
  console.log('[Cron Scheduler] Running 10:00 PM daily reminder updates dispatch...');
  const todayStr = new Date().toISOString().split('T')[0];

  try {
    // Find all users who are subscribed to daily updates
    const users = await User.find({ 'subscriptions.dailyUpdates': true });
    
    for (const user of users) {
      try {
        const report = await generateDailyReport(user._id);
        await sendDailyReportEmail(
          user.email,
          user.name,
          todayStr,
          report
        );
      } catch (userError) {
        console.error(`[Cron User Error] Failed to send report to user ${user.email}:`, userError);
      }
    }
  } catch (error) {
    console.error('[Cron System Error] Failed during daily updates query:', error);
  }
});

export default router;
