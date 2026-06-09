import express from 'express';
import { protect } from '../middleware/auth.js';
import WeekGoal from '../models/WeekGoal.js';

const router = express.Router();

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
