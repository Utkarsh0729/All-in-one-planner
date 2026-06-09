import express from 'express';
import { protect } from '../middleware/auth.js';
import RoutineLog from '../models/RoutineLog.js';

const router = express.Router();

// Helper to generate empty 24-hour slots
const makeEmptySlots = () => {
  const slots = [];
  for (let i = 0; i < 24; i++) {
    slots.push({ hour: i, activity: '', notes: '' });
  }
  return slots;
};

// @desc    Get routine slots for a date
// @route   GET /api/routines/:date
// @access  Private
router.get('/:date', protect, async (req, res) => {
  const { date } = req.params;

  try {
    let log = await RoutineLog.findOne({ user: req.user._id, date });
    if (!log) {
      log = {
        date,
        slots: makeEmptySlots()
      };
    }
    res.json(log);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Update or save routine slots for a date
// @route   POST /api/routines/:date
// @access  Private
router.post('/:date', protect, async (req, res) => {
  const { date } = req.params;
  const { slots } = req.body;

  if (!slots || !Array.isArray(slots)) {
    return res.status(400).json({ message: 'Slots array is required' });
  }

  try {
    let log = await RoutineLog.findOne({ user: req.user._id, date });

    if (!log) {
      log = new RoutineLog({
        user: req.user._id,
        date,
        slots: makeEmptySlots()
      });
    }

    // Update slots (making sure match hour index)
    slots.forEach(updatedSlot => {
      const slot = log.slots.find(s => s.hour === updatedSlot.hour);
      if (slot) {
        slot.activity = updatedSlot.activity || '';
        slot.notes = updatedSlot.notes || '';
      }
    });

    // Reset expiry date to 14 days from now if updated
    log.expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

    await log.save();
    res.json(log);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
