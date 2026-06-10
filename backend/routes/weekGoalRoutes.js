import express from 'express';
import { protect } from '../middleware/auth.js';
import WeekGoal from '../models/WeekGoal.js';
import WorkoutLog from '../models/WorkoutLog.js';
import NutritionLog from '../models/NutritionLog.js';
import RoutineLog from '../models/RoutineLog.js';
import Profile from '../models/Profile.js';
import User from '../models/User.js';

const router = express.Router();

// Helper to format date as YYYY-MM-DD in local time
const formatDate = (dateObj) => {
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Helper to get start of week (Monday)
const getMonday = (d) => {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(date.setDate(diff));
};

// @desc    Get goal analytics, streaks, badges, and insights
// @route   GET /api/week-goals/analytics/summary
// @access  Private
router.get('/analytics/summary', protect, async (req, res) => {
  try {
    const userId = req.user._id;

    // Fetch all logs to compute streaks & stats
    const allGoals = await WeekGoal.find({ user: userId });
    const workoutLogs = await WorkoutLog.find({ user: userId }).sort({ date: 1 });
    const nutritionLogs = await NutritionLog.find({ user: userId }).sort({ date: 1 });
    const routineLogs = await RoutineLog.find({ user: userId }).sort({ date: 1 });
    const profile = await Profile.findOne({ user: userId });
    const user = await User.findById(userId);

    const targetCalories = profile ? profile.targetCalories : 2000;

    // --- 1. Basic Goals Analytics ---
    const today = new Date();
    const currentWeekStr = formatDate(getMonday(today));

    // Goal completion % (current week)
    const currentWeekGoals = allGoals.filter(g => g.weekStart === currentWeekStr);
    let goalCompletionPct = 0;
    if (currentWeekGoals.length > 0) {
      const completed = currentWeekGoals.filter(g => g.completed).length;
      goalCompletionPct = Math.round((completed / currentWeekGoals.length) * 100);
    }

    // Weekly consistency % (average completion of goals over last 4 weeks)
    const last4Weeks = [];
    let m = getMonday(today);
    for (let i = 0; i < 4; i++) {
      last4Weeks.push(formatDate(m));
      m.setDate(m.getDate() - 7);
    }
    let sumCompletionRate = 0;
    let weeksWithGoals = 0;
    last4Weeks.forEach(w => {
      const weekGoals = allGoals.filter(g => g.weekStart === w);
      if (weekGoals.length > 0) {
        const completed = weekGoals.filter(g => g.completed).length;
        sumCompletionRate += (completed / weekGoals.length) * 100;
        weeksWithGoals++;
      }
    });
    const weeklyConsistency = weeksWithGoals > 0 ? Math.round(sumCompletionRate / weeksWithGoals) : 0;

    // Missed tasks (uncompleted goals/unchecked subtasks in past weeks)
    let missedTasks = 0;
    allGoals.forEach(g => {
      if (g.weekStart < currentWeekStr) {
        if (g.subtasks && g.subtasks.length > 0) {
          missedTasks += g.subtasks.filter(s => !s.checked).length;
        } else if (!g.completed) {
          missedTasks += 1;
        }
      }
    });

    // Average completion rate (all-time goals)
    const totalGoals = allGoals.length;
    const completedGoals = allGoals.filter(g => g.completed).length;
    const averageCompletionRate = totalGoals > 0 ? Math.round((completedGoals / totalGoals) * 100) : 0;

    // --- 2. Streak Calculations ---
    const todayStr = formatDate(today);
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = formatDate(yesterday);

    // Helper to compute daily streak
    const computeDailyStreak = (datesSet) => {
      let streak = 0;
      let checkDate = new Date();
      let dateStr = formatDate(checkDate);

      if (!datesSet.has(dateStr)) {
        checkDate.setDate(checkDate.getDate() - 1);
        dateStr = formatDate(checkDate);
      }

      while (datesSet.has(dateStr)) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
        dateStr = formatDate(checkDate);
      }
      return streak;
    };

    // Workout Streak
    const workoutDatesSet = new Set();
    workoutLogs.forEach(log => {
      if (!log.skipped && log.exercises && log.exercises.length > 0 && log.exercises.some(ex => ex.completed)) {
        workoutDatesSet.add(log.date);
      }
    });
    const workoutStreak = computeDailyStreak(workoutDatesSet);

    // Healthy Eating Streak (nutrition logged & within 15% of calorie target)
    const eatingDatesSet = new Set();
    nutritionLogs.forEach(log => {
      if (log.totalCalories > 0 && Math.abs(log.totalCalories - targetCalories) <= targetCalories * 0.15) {
        eatingDatesSet.add(log.date);
      }
    });
    const healthyEatingStreak = computeDailyStreak(eatingDatesSet);

    // Productivity Streak (Routine log exists & productive hours > 0)
    const productivityDatesSet = new Set();
    routineLogs.forEach(log => {
      let productive = 0;
      if (log.activities && Array.isArray(log.activities)) {
        log.activities.forEach(act => {
          if (['Study', 'Work', 'Fitness'].includes(act.category)) {
            productive += act.duration;
          }
        });
      }
      if (productive > 0) {
        productivityDatesSet.add(log.date);
      }
    });
    const productivityStreak = computeDailyStreak(productivityDatesSet);

    // Goal Completion Streak (consecutive weeks with at least 1 completed goal)
    const hasCompletedGoalInWeek = (wStr) => {
      const weekGoals = allGoals.filter(g => g.weekStart === wStr);
      if (weekGoals.length === 0) return false;
      return weekGoals.some(g => g.completed);
    };

    let goalCompletionStreak = 0;
    let checkMonday = getMonday(today);
    let weekStr = formatDate(checkMonday);

    if (!hasCompletedGoalInWeek(weekStr)) {
      checkMonday.setDate(checkMonday.getDate() - 7);
      weekStr = formatDate(checkMonday);
    }

    while (hasCompletedGoalInWeek(weekStr)) {
      goalCompletionStreak++;
      checkMonday.setDate(checkMonday.getDate() - 7);
      weekStr = formatDate(checkMonday);
    }

    // --- 3. Achievement Badges ---
    // Count total completed tasks
    let totalTasksCompleted = 0;
    allGoals.forEach(g => {
      if (g.subtasks && g.subtasks.length > 0) {
        totalTasksCompleted += g.subtasks.filter(s => s.checked).length;
      } else if (g.completed) {
        totalTasksCompleted += 1;
      }
    });

    const diffTime = Math.abs(new Date() - new Date(user.createdAt || Date.now()));
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const firstMonthCompleted = diffDays >= 30;

    // Total active days logged across all features (to supplement 30-day consistency check)
    const totalLoggedDaysSet = new Set([
      ...workoutDatesSet,
      ...eatingDatesSet,
      ...productivityDatesSet
    ]);
    const totalLoggedDays = totalLoggedDaysSet.size;

    const badges = [];
    
    // Badge: 7-Day Workout Streak
    if (workoutStreak >= 7) {
      badges.push({
        id: 'workout_7',
        name: '7-Day Workout Streak',
        description: 'Completed workouts for 7 consecutive days.',
        icon: '🔥',
        metric: `${workoutStreak} days`
      });
    }

    // Badge: 30-Day Consistency
    if (workoutStreak >= 30 || healthyEatingStreak >= 30 || productivityStreak >= 30 || totalLoggedDays >= 30) {
      badges.push({
        id: 'consistency_30',
        name: '30-Day Consistency Badge',
        description: 'Maintained a 30-day streak or logged 30 total days.',
        icon: '🏆',
        metric: `${Math.max(workoutStreak, healthyEatingStreak, productivityStreak, totalLoggedDays)} days`
      });
    }

    // Badge: 100 Completed Tasks
    if (totalTasksCompleted >= 100) {
      badges.push({
        id: 'tasks_100',
        name: '100 Completed Tasks',
        description: 'Successfully checked off 100 goals or checklist items.',
        icon: '⚡',
        metric: `${totalTasksCompleted} tasks`
      });
    }

    // Badge: First Month Completed
    if (firstMonthCompleted) {
      badges.push({
        id: 'first_month',
        name: 'First Month Completed',
        description: 'Completed your first month on Aegis Planner.',
        icon: '🌟',
        metric: '1 month'
      });
    }

    // --- 4. Productivity Insights generation ---
    const insights = [];

    // Goal Insight
    if (currentWeekGoals.length > 0) {
      insights.push(`You completed ${goalCompletionPct}% of planned goals this week.`);
    } else {
      const lastWeekMon = getMonday(today);
      lastWeekMon.setDate(lastWeekMon.getDate() - 7);
      const lastWeekStr = formatDate(lastWeekMon);
      const lastWeekGoals = allGoals.filter(g => g.weekStart === lastWeekStr);
      if (lastWeekGoals.length > 0) {
        const lastPct = Math.round((lastWeekGoals.filter(g => g.completed).length / lastWeekGoals.length) * 100);
        insights.push(`You completed ${lastPct}% of planned goals last week.`);
      } else {
        insights.push("No goals planned for this week or last week. Get started today!");
      }
    }

    // Workout Consistency Insight
    const currentMon = getMonday(today);
    const lastMon = new Date(currentMon);
    lastMon.setDate(lastMon.getDate() - 7);

    const getWeekDateRange = (mon) => {
      const start = formatDate(mon);
      const endObj = new Date(mon);
      endObj.setDate(endObj.getDate() + 6);
      return { start, end: formatDate(endObj) };
    };

    const curRange = getWeekDateRange(currentMon);
    const lastRange = getWeekDateRange(lastMon);

    const curWorkoutsCount = workoutLogs.filter(l => l.date >= curRange.start && l.date <= curRange.end && !l.skipped).length;
    const lastWorkoutsCount = workoutLogs.filter(l => l.date >= lastRange.start && l.date <= lastRange.end && !l.skipped).length;

    if (lastWorkoutsCount === 0) {
      if (curWorkoutsCount > 0) {
        insights.push(`Workout consistency improved! Logged ${curWorkoutsCount} session${curWorkoutsCount > 1 ? 's' : ''} this week.`);
      } else {
        insights.push("Try scheduling a workout to jumpstart your fitness streak.");
      }
    } else {
      const diff = curWorkoutsCount - lastWorkoutsCount;
      if (diff > 0) {
        const pct = Math.round((diff / lastWorkoutsCount) * 100);
        insights.push(`Workout consistency improved by ${pct}% compared to last week.`);
      } else if (diff < 0) {
        const pct = Math.round((Math.abs(diff) / lastWorkoutsCount) * 100);
        insights.push(`Workout consistency decreased by ${pct}% - aim to match last week's target!`);
      } else {
        insights.push(`Workout consistency maintained with ${curWorkoutsCount} session${curWorkoutsCount > 1 ? 's' : ''} logged.`);
      }
    }

    // Productivity (Day of week) Insight
    const dayProductiveHours = Array(7).fill(0);
    const dayCounts = Array(7).fill(0);
    
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
    const fdaStr = formatDate(fourteenDaysAgo);
    
    const recentRoutineLogs = routineLogs.filter(l => l.date >= fdaStr);
    recentRoutineLogs.forEach(log => {
      let productive = 0;
      if (log.activities) {
        log.activities.forEach(act => {
          if (['Study', 'Work', 'Fitness'].includes(act.category)) {
            productive += act.duration;
          }
        });
      }
      const [y, mMonth, dDay] = log.date.split('-').map(Number);
      const dayOfWeek = new Date(y, mMonth - 1, dDay).getDay();
      dayProductiveHours[dayOfWeek] += productive;
      dayCounts[dayOfWeek]++;
    });

    let bestDayIdx = -1;
    let maxAvg = -1;
    for (let i = 0; i < 7; i++) {
      if (dayCounts[i] > 0) {
        const avg = dayProductiveHours[i] / dayCounts[i];
        if (avg > maxAvg) {
          maxAvg = avg;
          bestDayIdx = i;
        }
      }
    }

    if (bestDayIdx !== -1 && maxAvg > 0) {
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      insights.push(`${dayNames[bestDayIdx]} was your most productive day over the last two weeks.`);
    } else {
      insights.push("Log your study, work, or fitness routines to find your most productive day.");
    }

    // Productive hours this week (Study + Work + Fitness categories logged in current week)
    let productiveHoursThisWeek = 0;
    const currentWeekRoutineLogs = routineLogs.filter(l => l.date >= curRange.start && l.date <= curRange.end);
    currentWeekRoutineLogs.forEach(log => {
      if (log.activities) {
        log.activities.forEach(act => {
          if (['Study', 'Work', 'Fitness'].includes(act.category)) {
            productiveHoursThisWeek += act.duration;
          }
        });
      }
    });
    productiveHoursThisWeek = Number(productiveHoursThisWeek.toFixed(1));

    res.json({
      goalCompletionPct,
      weeklyConsistency,
      missedTasks,
      averageCompletionRate,
      workoutSessionsThisWeek: curWorkoutsCount,
      productiveHoursThisWeek,
      streaks: {
        workoutStreak,
        healthyEatingStreak,
        productivityStreak,
        goalCompletionStreak
      },
      badges,
      insights
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Get all weekly goals for a specific week
// @route   GET /api/week-goals/:weekStart
// @access  Private
router.get('/:weekStart', protect, async (req, res) => {
  const { weekStart } = req.params;

  try {
    const goals = await WeekGoal.find({ user: req.user._id, weekStart }).sort({ createdAt: 1 });
    res.json(goals);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Create a weekly goal
// @route   POST /api/week-goals
// @access  Private
router.post('/', protect, async (req, res) => {
  const { weekStart, title, subtasks } = req.body;

  if (!weekStart || !title) {
    return res.status(400).json({ message: 'Week start and title are required' });
  }

  try {
    const goal = await WeekGoal.create({
      user: req.user._id,
      weekStart,
      title,
      subtasks: subtasks || [],
    });
    res.status(201).json(goal);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Update a weekly goal
// @route   PUT /api/week-goals/:id
// @access  Private
router.put('/:id', protect, async (req, res) => {
  const { id } = req.params;
  const { title, completed, subtasks } = req.body;

  try {
    const goal = await WeekGoal.findOne({ _id: id, user: req.user._id });
    if (!goal) {
      return res.status(404).json({ message: 'Weekly goal not found' });
    }

    if (title !== undefined) goal.title = title;
    if (completed !== undefined) goal.completed = completed;
    if (subtasks !== undefined) goal.subtasks = subtasks;

    await goal.save();
    res.json(goal);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Delete a weekly goal
// @route   DELETE /api/week-goals/:id
// @access  Private
router.delete('/:id', protect, async (req, res) => {
  const { id } = req.params;

  try {
    const goal = await WeekGoal.findOneAndDelete({ _id: id, user: req.user._id });
    if (!goal) {
      return res.status(404).json({ message: 'Weekly goal not found' });
    }
    res.json({ message: 'Goal deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
