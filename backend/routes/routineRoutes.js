import express from 'express';
import { protect } from '../middleware/auth.js';
import RoutineLog from '../models/RoutineLog.js';
import { queryNvidiaAI } from '../utils/nvidia.js';

const router = express.Router();

// Helper to calculate daily statistics for a log entry
const calculateDayStats = (log) => {
  let productive = 0;
  let unproductive = 0;
  let sleep = 0;
  let tracked = 0;

  if (log && log.activities && Array.isArray(log.activities)) {
    log.activities.forEach(act => {
      const dur = Number(act.duration) || 0;
      tracked += dur;
      if (['Study', 'Work', 'Fitness'].includes(act.category)) {
        productive += dur;
      } else if (['Entertainment', 'Social Media', 'Leisure'].includes(act.category)) {
        unproductive += dur;
      } else if (act.category === 'Sleep') {
        sleep += dur;
      }
    });
  }

  const untracked = Math.max(0, 24 - tracked);

  return {
    date: log ? log.date : '',
    productive: Number(productive.toFixed(1)),
    unproductive: Number(unproductive.toFixed(1)),
    sleep: Number(sleep.toFixed(1)),
    tracked: Number(tracked.toFixed(1)),
    untracked: Number(untracked.toFixed(1))
  };
};

// Helper to sum category hours over a list of logs
const sumCategoryHours = (logsList, category) => {
  let total = 0;
  logsList.forEach(log => {
    if (log && log.activities) {
      log.activities.forEach(act => {
        if (act.category === category) {
          total += Number(act.duration) || 0;
        }
      });
    }
  });
  return total;
};

// Helper to count occurrences of a category (e.g. number of Fitness sessions)
const countCategoryOccurrences = (logsList, category) => {
  let count = 0;
  logsList.forEach(log => {
    if (log && log.activities) {
      log.activities.forEach(act => {
        if (act.category === category && Number(act.duration) > 0) {
          count++;
        }
      });
    }
  });
  return count;
};

// @desc    Get AI-driven routine insights and consistency analytics
// @route   GET /api/routines/insights
// @access  Private
router.get('/insights', protect, async (req, res) => {
  try {
    // Get latest 14 logs to compare Week 1 vs Week 2
    const logs = await RoutineLog.find({ user: req.user._id })
      .sort({ date: -1 })
      .limit(14);

    if (logs.length === 0) {
      return res.json({ 
        hasData: false, 
        message: 'No routine logs found yet. Please log your activities first.' 
      });
    }

    // Sort chronologically ascending
    logs.reverse();

    // Split into This Week (last 7 logs) and Previous Week (remaining logs)
    const currentWeekLogs = logs.slice(-7);
    const previousWeekLogs = logs.slice(0, logs.length - 7);

    // Calculate daily metrics for current week
    const currentDayStats = currentWeekLogs.map(log => ({
      ...calculateDayStats(log),
      activities: log.activities,
      id: log._id
    }));

    const totalDays = currentWeekLogs.length;
    let sumProductive = 0;
    let sumUnproductive = 0;
    let sumSleep = 0;
    let sumTracked = 0;
    let sumUntracked = 0;

    currentDayStats.forEach(stats => {
      sumProductive += stats.productive;
      sumUnproductive += stats.unproductive;
      sumSleep += stats.sleep;
      sumTracked += stats.tracked;
      sumUntracked += stats.untracked;
    });

    const averageProductive = Number((sumProductive / totalDays).toFixed(1));
    const averageUnproductive = Number((sumUnproductive / totalDays).toFixed(1));
    const averageSleep = Number((sumSleep / totalDays).toFixed(1));
    const averageTracked = Number((sumTracked / totalDays).toFixed(1));
    const averageUntracked = Number((sumUntracked / totalDays).toFixed(1));

    // Most and Least productive days
    let mostProductiveDay = { date: '', hours: -1 };
    let leastProductiveDay = { date: '', hours: 999 };

    currentDayStats.forEach(stats => {
      if (stats.productive > mostProductiveDay.hours) {
        mostProductiveDay = { date: stats.date, hours: stats.productive };
      }
      if (stats.productive < leastProductiveDay.hours) {
        leastProductiveDay = { date: stats.date, hours: stats.productive };
      }
    });

    // Score Calculations
    // Productivity Score = Average daily productive hours out of 8h (perfect standard)
    const weeklyProductivityScore = Math.min(100, Math.round((averageProductive / 8) * 100));
    // Focus Score = ratio of productive hours to tracked active (waking) hours
    const wakingTrackedHours = sumTracked - sumSleep;
    const focusScore = wakingTrackedHours > 0 ? Math.round((sumProductive / wakingTrackedHours) * 100) : 0;

    // Previous Week comparison stats
    let studyChangePct = 0;
    let socialMediaDiff = 0;
    let averageProductiveDiff = 0;
    let exerciseCount = countCategoryOccurrences(currentWeekLogs, 'Fitness');
    let studyHoursThisWeek = sumCategoryHours(currentWeekLogs, 'Study');

    if (previousWeekLogs.length > 0) {
      const prevTotalDays = previousWeekLogs.length;
      let prevSumProductive = 0;
      previousWeekLogs.forEach(log => {
        const stats = calculateDayStats(log);
        prevSumProductive += stats.productive;
      });

      const prevAverageProductive = prevSumProductive / prevTotalDays;
      averageProductiveDiff = Number((averageProductive - prevAverageProductive).toFixed(1));

      const studyHoursPrevWeek = sumCategoryHours(previousWeekLogs, 'Study');
      studyChangePct = studyHoursPrevWeek > 0 
        ? Math.round(((studyHoursThisWeek - studyHoursPrevWeek) / studyHoursPrevWeek) * 100) 
        : 0;

      const socialMediaThisWeek = sumCategoryHours(currentWeekLogs, 'Social Media');
      const socialMediaPrevWeek = sumCategoryHours(previousWeekLogs, 'Social Media');
      socialMediaDiff = Number((socialMediaThisWeek - socialMediaPrevWeek).toFixed(1));
    }

    // AI summary prompts
    const formattedHistoryList = [];
    currentWeekLogs.forEach(log => {
      const stats = calculateDayStats(log);
      const actsStr = log.activities.map(a => `${a.name} (${a.duration}h, ${a.category})`).join(', ');
      formattedHistoryList.push(`${log.date}: [${actsStr}] (Productive: ${stats.productive}h, Unproductive: ${stats.unproductive}h, Sleep: ${stats.sleep}h)`);
    });

    const statisticsText = `
      Current Week Averages:
      - Average Sleep: ${averageSleep} hours/day
      - Average Productive Time (Study/Work/Fitness): ${averageProductive} hours/day
      - Average Unproductive Time (Entertainment/Social Media/Leisure): ${averageUnproductive} hours/day
      - Average Tracked: ${averageTracked} hours/day
      - Average Untracked: ${averageUntracked} hours/day
      - Weekly Productivity Score: ${weeklyProductivityScore}%
      - Focus Score: ${focusScore}%
      - Exercise Sessions: ${exerciseCount} times
      - Total Study Time: ${studyHoursThisWeek} hours

      Comparisons to Previous Week (if available):
      - Study Time Change Pct: ${studyChangePct >= 0 ? '+' : ''}${studyChangePct}%
      - Social Media Time Diff: ${socialMediaDiff >= 0 ? '+' : ''}${socialMediaDiff} hours total
      - Average Productive Hours Diff: ${averageProductiveDiff >= 0 ? '+' : ''}${averageProductiveDiff} hours/day
    `;

    const systemPrompt = `You are an AI life coach and routine optimization expert. Analyze the user's daily logged activities and write a weekly report. Focus on achievements, study hours, exercise frequency, and social media reductions/increases.`;

    const userPrompt = `Here is my daily routine history for the last 7 logged days:
    ${formattedHistoryList.join('\n')}

    Aggregate Statistics:
    ${statisticsText}

    Please generate an AI-powered weekly summary report containing:
    1. **Overview**: A brief summary of my weekly routine.
    2. **Performance Summary**: Quote numbers like: "This week you studied ${studyHoursThisWeek} hours, exercised ${exerciseCount} times, and social media usage changed by ${socialMediaDiff} hours." Customize this text based on my actual stats above.
    3. **Habit Optimizations**: Provide 3 clear recommendations to improve sleep, reduce untracked hours, or improve focus.
    
    Format the response cleanly with markdown headings and bullet points.`;

    let aiFeedback;
    try {
      aiFeedback = await queryNvidiaAI(systemPrompt, userPrompt, false);
    } catch (aiErr) {
      aiFeedback = `### Weekly Summary\n\n- **Study hours**: Logged ${studyHoursThisWeek} hours of study time.\n- **Fitness**: Completed ${exerciseCount} workouts.\n- **Social Media**: Time change of ${socialMediaDiff} hours total compared to last week.\n- **Productivity**: Averaged ${averageProductive}h of productive time per day.\n\n### Suggestions\n1. Reduce untracked time by logging habits immediately.\n2. Keep your social media scrolling below 1 hour per day.\n3. Dedicate a sleep window of at least 7-8 hours.`;
    }

    res.json({
      hasData: true,
      stats: {
        averageSleep,
        averageProductive,
        averageUnproductive,
        averageTracked,
        averageUntracked,
        weeklyProductivityScore,
        focusScore,
        mostProductiveDay,
        leastProductiveDay,
        studyHoursThisWeek,
        exerciseCount,
        studyChangePct,
        socialMediaDiff,
        averageProductiveDiff
      },
      currentDayStats,
      aiFeedback
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Get routine activities for a date
// @route   GET /api/routines/:date
// @access  Private
router.get('/:date', protect, async (req, res) => {
  const { date } = req.params;

  try {
    let log = await RoutineLog.findOne({ user: req.user._id, date });
    if (!log) {
      log = {
        date,
        activities: []
      };
    }
    res.json(log);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Update or save routine activities for a date
// @route   POST /api/routines/:date
// @access  Private
router.post('/:date', protect, async (req, res) => {
  const { date } = req.params;
  const { activities } = req.body;

  if (!activities || !Array.isArray(activities)) {
    return res.status(400).json({ message: 'Activities array is required' });
  }

  try {
    let log = await RoutineLog.findOne({ user: req.user._id, date });

    if (!log) {
      log = new RoutineLog({
        user: req.user._id,
        date,
        activities: []
      });
    }

    // Update activities
    log.activities = activities;
    // Reset expiry date to 14 days from now if updated
    log.expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

    await log.save();
    res.json(log);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
