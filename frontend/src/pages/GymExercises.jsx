import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import OnboardingModal from '../components/OnboardingModal';
import { 
  Dumbbell, Calendar, RefreshCw, Check, AlertCircle, Plus, Trash2, XCircle, 
  Play, Pause, Volume2, VolumeX, Timer, Activity, ChevronDown, ChevronUp,
  Trophy, Sparkles, TrendingUp, Edit, Copy, Info, X, ChevronLeft, ChevronRight
} from 'lucide-react';



const TRAINING_TYPES = [
  { id: 'strength', name: 'Strength', desc: 'Focus on lifting and absolute power', icon: 'Trophy' },
  { id: 'muscle_building', name: 'Muscle Building', desc: 'Hypertrophy and lean muscle growth', icon: 'TrendingUp' },
  { id: 'gym', name: 'Gym Workout', desc: 'General fitness and gym routine', icon: 'Dumbbell' },
  { id: 'pain_relief', name: 'Pain Relief', desc: 'Target discomfort and joint rehab', icon: 'AlertCircle' },
  { id: 'stretching', name: 'Stretching & Mobility', desc: 'Flexibility and posture alignment', icon: 'RefreshCw' },
  { id: 'yoga', name: 'Yoga', desc: 'Vinyasa flow, Hatha, or Yin balance', icon: 'Sparkles' },
  { id: 'other', name: 'Other / Custom', desc: 'Create a fully custom workout spec', icon: 'Plus' }
];

const EQUIPMENT_MAP = {
  strength: ['Dumbbells', 'Barbell', 'Cables', 'Machines', 'Resistance Bands', 'Kettlebells'],
  muscle_building: ['Dumbbells', 'Barbell', 'Cables', 'Machines', 'Resistance Bands'],
  gym: ['Full Gym (All Machines)', 'Dumbbells', 'Barbell', 'Cables', 'Smith Machine'],
  pain_relief: ['Foam Roller', 'Resistance Bands', 'Yoga Mat', 'None (Bodyweight)'],
  stretching: ['Yoga Mat', 'Strap / Towel', 'Foam Roller', 'Yoga Blocks'],
  yoga: ['Yoga Mat', 'Yoga Blocks', 'Yoga Strap', 'Bolster'],
  other: ['Dumbbells', 'Barbell', 'Resistance Bands', 'None']
};

const ROUTINES_MAP = {
  strength: [
    { id: 'ppl', name: 'Push-Pull-Legs (PPL)' },
    { id: 'upper_lower', name: 'Upper-Lower Split' },
    { id: 'full_body', name: '5x5 Full Body Strength' },
    { id: 'bro_split', name: '5-Day Bro Split' }
  ],
  muscle_building: [
    { id: 'bro_split', name: 'Classic Bro Split' },
    { id: 'ppl_hypertrophy', name: 'PPL Hypertrophy' },
    { id: 'arnold', name: 'Arnold Split (Chest/Back, Shoulders/Arms, Legs)' },
    { id: 'upper_lower_hyper', name: 'Upper-Lower Hypertrophy' }
  ],
  gym: [
    { id: 'ppl', name: 'Push-Pull-Legs' },
    { id: 'bro_split', name: 'Bro Split (Single Muscle Groups)' },
    { id: 'full_body', name: 'Full Body Circuit' }
  ],
  pain_relief: [
    { id: 'lower_back', name: 'Lower Back Pain Relief' },
    { id: 'neck_shoulder', name: 'Neck & Shoulder Tension' },
    { id: 'knee_hip', name: 'Knee & Hip Joint Relief' },
    { id: 'wrist_forearm', name: 'Carpal Tunnel / Wrist Relief' }
  ],
  stretching: [
    { id: 'full_flexibility', name: 'Full Body Flexibility' },
    { id: 'morning_mobility', name: 'Morning Joint Mobility' },
    { id: 'post_workout', name: 'Post-Workout Cool Down' },
    { id: 'desk_worker', name: 'Desk Worker Posture Fix' }
  ],
  yoga: [
    { id: 'vinyasa', name: 'Vinyasa Flow (Dynamic)' },
    { id: 'hatha', name: 'Hatha Yoga (Gentle & Slow)' },
    { id: 'yin', name: 'Yin Yoga (Deep Stretch & Restorative)' },
    { id: 'power', name: 'Power Yoga (Strength & Sweat)' }
  ]
};

const renderTrainingIcon = (iconName, size = 18) => {
  switch (iconName) {
    case 'Trophy': return <Trophy size={size} />;
    case 'TrendingUp': return <TrendingUp size={size} />;
    case 'Dumbbell': return <Dumbbell size={size} />;
    case 'AlertCircle': return <AlertCircle size={size} />;
    case 'RefreshCw': return <RefreshCw size={size} />;
    case 'Sparkles': return <Sparkles size={size} />;
    case 'Plus': return <Plus size={size} />;
    default: return <Dumbbell size={size} />;
  }
};

const getExerciseMetrics = (workoutName, exerciseName) => {
  const exLower = (exerciseName || '').toLowerCase();
  const workLower = (workoutName || '').toLowerCase();
  
  // Recovery keywords specifically for exercise name
  const isRecoveryEx = 
    exLower.includes('stretch') || 
    exLower.includes('yoga') || 
    exLower.includes('pose') || 
    exLower.includes('hold') || 
    exLower.includes('breath') || 
    exLower.includes('mobility') || 
    exLower.includes('decompression') || 
    exLower.includes('rehab') ||
    exLower.includes('release') ||
    exLower.includes('relief');
     
  // Recovery keywords for the workout, but only apply if the exercise itself is not a known strength exercise
  const isStrengthEx = 
    exLower.includes('press') || 
    exLower.includes('lift') || 
    exLower.includes('squat') || 
    exLower.includes('curl') || 
    exLower.includes('extension') || 
    exLower.includes('row') || 
    exLower.includes('pull') || 
    exLower.includes('raise') || 
    exLower.includes('fly') || 
    exLower.includes('pushup') || 
    exLower.includes('dip') || 
    exLower.includes('shrug') || 
    exLower.includes('crunch');

  const isRecoveryWork = 
    workLower.includes('yoga') || 
    workLower.includes('stretch') || 
    workLower.includes('pain') || 
    workLower.includes('relief') || 
    workLower.includes('rehab') || 
    workLower.includes('mobility') || 
    workLower.includes('decompression') || 
    workLower.includes('flexibility');

  if (isRecoveryEx || (isRecoveryWork && !isStrengthEx)) {
    return {
      weightLabel: 'Hold Time (s)',
      repsLabel: 'Breaths',
      weightPlaceholder: '30',
      repsPlaceholder: '5'
    };
  }
  
  return {
    weightLabel: 'Weight (kg)',
    repsLabel: 'Reps',
    weightPlaceholder: '0',
    repsPlaceholder: '0'
  };
};

const getWorkoutCategory = (workoutName) => {
  const nameLower = (workoutName || '').toLowerCase();
  if (
    nameLower.includes('yoga') || 
    nameLower.includes('stretch') || 
    nameLower.includes('pain') || 
    nameLower.includes('relief') || 
    nameLower.includes('rehab') || 
    nameLower.includes('mobility') || 
    nameLower.includes('decompression') || 
    nameLower.includes('flexibility')
  ) {
    return 'recovery';
  }
  return 'strength';
};

const GymExercises = () => {
  const { user, token, API_URL } = useAuth();
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const dateInputRef = useRef(null);

  const changeDay = (direction) => {
    const d = new Date(date);
    d.setDate(d.getDate() + direction);
    setDate(d.toISOString().split('T')[0]);
  };

  const formatDateLabel = (dateStr) => {
    const d = new Date(dateStr + 'T00:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diff = Math.round((d - today) / 86400000);
    const dayName = d.toLocaleDateString(undefined, { weekday: 'short' });
    const dateLabel = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    if (diff === 0) return `Today, ${dateLabel}`;
    if (diff === -1) return `Yesterday, ${dateLabel}`;
    if (diff === 1) return `Tomorrow, ${dateLabel}`;
    return `${dayName}, ${dateLabel}`;
  };
  const [log, setLog] = useState({ exercises: [], skipped: false, notes: '', duration: 0, name: '', difficulty: '', estimatedDuration: 0 });

  // Custom prompt state
  const [promptText, setPromptText] = useState('');
  const [showPromptGenerator, setShowPromptGenerator] = useState(false);

  // Customizer state variables
  const [coachTrainingType, setCoachTrainingType] = useState('strength');
  const [coachHasEquipment, setCoachHasEquipment] = useState('yes');
  const [coachSelectedEquipments, setCoachSelectedEquipments] = useState([]);
  const [coachSelectedRoutine, setCoachSelectedRoutine] = useState('');
  const [coachCustomPrompt, setCoachCustomPrompt] = useState('');
  const [coachAppendMode, setCoachAppendMode] = useState(false);
  const [coachPlanDuration, setCoachPlanDuration] = useState('1_day');
  const [coachSelectedDays, setCoachSelectedDays] = useState([]);

  // Custom exercise form state
  const [customName, setCustomName] = useState('');
  const [customSets, setCustomSets] = useState('3');
  const [customReps, setCustomReps] = useState('10-12');
  const [customMuscles, setCustomMuscles] = useState('');

  // Helper: capitalize first letter of every word
  const toTitleCase = (str) =>
    str.replace(/\b\w/g, (c) => c.toUpperCase());

  // Shifting variables
  const [hasUnmarkedYesterday, setHasUnmarkedYesterday] = useState(false);
  const [yesterdayDate, setYesterdayDate] = useState('');

  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Expanded card state
  const [expandedExercises, setExpandedExercises] = useState({});

  // Individual Exercise History Panels (within daily workout list)
  const [exerciseHistory, setExerciseHistory] = useState({});
  const [loadingHistory, setLoadingHistory] = useState({});
  const [expandedHistory, setExpandedHistory] = useState({});

  // Modals state
  const [isMetadataModalOpen, setIsMetadataModalOpen] = useState(false);
  const [metadataForm, setMetadataForm] = useState({ name: '', difficulty: 'Intermediate', estimatedDuration: 45, notes: '' });
  
  const [isDuplicateModalOpen, setIsDuplicateModalOpen] = useState(false);
  const [duplicateTargetDate, setDuplicateTargetDate] = useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  });
  
  const [editingExercise, setEditingExercise] = useState(null); // holds {_id, name, sets, reps, restTime}

  // Rest Timer States
  const [restTimeLeft, setRestTimeLeft] = useState(0);
  const [isRestTimerRunning, setIsRestTimerRunning] = useState(false);
  const restPreset = 90; // default 90s constant
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Active Workout Stopwatch State
  const [activeSeconds, setActiveSeconds] = useState(0);

  // Parser helper to convert workout rest string to numeric seconds
  const parseRestTimeToSeconds = (restStr) => {
    if (!restStr) return 90;
    const cleanStr = restStr.trim().toLowerCase();
    if (/^\d+$/.test(cleanStr)) {
      return parseInt(cleanStr, 10);
    }
    if (cleanStr.endsWith('s')) {
      const secs = parseInt(cleanStr.slice(0, -1), 10);
      return isNaN(secs) ? 90 : secs;
    }
    if (cleanStr.includes('min')) {
      const mins = parseFloat(cleanStr);
      return isNaN(mins) ? 90 : Math.round(mins * 60);
    }
    return 90;
  };

  const fetchWorkoutLog = useCallback(async () => {
    setLoading(true);
    setError('');
    setHasUnmarkedYesterday(false);
    
    try {
      const res = await fetch(`${API_URL}/workouts/${date}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      
      if (data.hasUnmarkedYesterday) {
        setHasUnmarkedYesterday(true);
        setYesterdayDate(data.yesterdayDate);
      } else {
        setLog(data);
      }

      // If user split is not configured, trigger lazy onboarding modal
      if (!user.onboardingCompleted.workout) {
        setIsOnboardingOpen(true);
      }
    } catch (err) {
      setError('Failed to fetch gym schedule.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [date, token, API_URL, user.onboardingCompleted.workout]);

  useEffect(() => {
    fetchWorkoutLog();
  }, [fetchWorkoutLog]);

  const saveDuration = useCallback(async (secs) => {
    try {
      await fetch(`${API_URL}/workouts/${date}/duration`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ duration: secs })
      });
    } catch (err) {
      console.error('Failed to save workout duration:', err);
    }
  }, [date, token, API_URL]);

  // Stopwatch ticking interval
  useEffect(() => {
    if (log && log.exercises && log.exercises.length > 0 && !log.skipped && !hasUnmarkedYesterday) {
      const interval = setInterval(() => {
        setActiveSeconds(prev => {
          const next = prev + 1;
          if (next % 30 === 0) {
            saveDuration(next);
          }
          return next;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [log, hasUnmarkedYesterday, saveDuration]);

  // Rest Timer logic
  useEffect(() => {
    let timer;
    if (isRestTimerRunning && restTimeLeft > 0) {
      timer = setInterval(() => {
        setRestTimeLeft(prev => prev - 1);
      }, 1000);
    } else if (restTimeLeft === 0 && isRestTimerRunning) {
      const stopTimer = async () => {
        await Promise.resolve();
        setIsRestTimerRunning(false);
      };
      stopTimer();
      try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(880, audioCtx.currentTime); // A5 tone
        gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.3); // 300ms beep
      } catch (e) {
        console.warn('Audio feedback failed:', e);
      }
    }
    return () => clearInterval(timer);
  }, [isRestTimerRunning, restTimeLeft, soundEnabled]);

  const startRestTimer = (seconds) => {
    setRestTimeLeft(seconds || restPreset);
    setIsRestTimerRunning(true);
  };

  const formatStopwatch = (totalSeconds) => {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    return `${hrs > 0 ? hrs + ':' : ''}${mins < 10 ? '0' + mins : mins}:${secs < 10 ? '0' + secs : secs}`;
  };

  const getPriorPerformance = (exerciseName) => {
    const key = exerciseName.toLowerCase();
    const hist = exerciseHistory[key];
    if (hist && hist.length > 0) {
      const lastEntry = hist[0];
      const metrics = getExerciseMetrics(log.name, exerciseName);
      const isTimeBased = metrics.weightLabel === 'Hold Time (s)';
      const setsFormatted = lastEntry.sets.map(s => {
        if (isTimeBased) {
          return `${s.weight}s x ${s.reps}`;
        }
        return `${s.weight}kg x ${s.reps}`;
      }).join(', ');
      return `${lastEntry.sets.length} sets completed on ${lastEntry.date} (${setsFormatted})`;
    }
    return 'N/A (expand below to load history)';
  };

  const toggleExpandExercise = (exerciseId) => {
    setExpandedExercises(prev => ({
      ...prev,
      [exerciseId]: !prev[exerciseId]
    }));
  };

  const handleUpdateSet = async (exerciseId, setIndex, field, value) => {
    // Read the current exercise and set BEFORE any state update (avoid stale closure)
    const exercise = log.exercises.find(e => e._id === exerciseId);
    if (!exercise) return;
    const currentSet = exercise.setDetails[setIndex];

    // Optimistic UI update
    const updatedExercises = log.exercises.map(ex => {
      if (ex._id === exerciseId) {
        const updatedSets = ex.setDetails.map((s, idx) => {
          if (idx === setIndex) {
            const val = field === 'completed' ? !s.completed : value;
            return { ...s, [field]: val };
          }
          return s;
        });
        const completed = updatedSets.every(s => s.completed);
        return { ...ex, setDetails: updatedSets, completed };
      }
      return ex;
    });

    setLog(prev => ({ ...prev, exercises: updatedExercises }));

    const bodyPayload = {
      setIndex,
      weight: field === 'weight' ? Number(value) : currentSet.weight,
      reps: field === 'reps' ? Number(value) : currentSet.reps,
      completed: field === 'completed' ? !currentSet.completed : currentSet.completed
    };

    try {
      const res = await fetch(`${API_URL}/workouts/${date}/exercise/${exerciseId}/sets`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(bodyPayload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      
      setLog(data);
    } catch (err) {
      setError('Failed to update set details.');
      console.error(err);
      fetchWorkoutLog();
    }
  };

  // Toggle all sets on an exercise atomically (uses dedicated /toggle backend endpoint)
  const handleToggleAllSets = async (exerciseId) => {
    try {
      const res = await fetch(`${API_URL}/workouts/${date}/exercise/${exerciseId}/toggle`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setLog(data);
    } catch (err) {
      setError('Failed to toggle exercise completion.');
      console.error(err);
      fetchWorkoutLog();
    }
  };

  // Resolve yesterday's unmarked log
  const handleResolveYesterday = async (performed) => {
    setSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/workouts/resolve-unmarked`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          targetDate: date,
          yesterdayDate,
          performed
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      // Re-fetch log for today
      fetchWorkoutLog();
    } catch (err) {
      setError(err.message);
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  // Generate new AI workout with prompt options and program durations
  const handleGenerateWorkout = async (customPromptValue, appendMode = false, planDuration = '1_day', selectedDays = []) => {
    setGenerating(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/workouts/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ 
          date, 
          prompt: customPromptValue || promptText, 
          append: appendMode 
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      setLog(data.log);
      setPromptText('');
      setShowPromptGenerator(false);

      // Handle Plan Duration Duplication (copy to next N days or weekly routine)
      const targetDates = [];
      const baseDate = new Date(date);

      if (planDuration === '2_days') {
        const nextDay = new Date(baseDate);
        nextDay.setDate(nextDay.getDate() + 1);
        targetDates.push(nextDay.toISOString().split('T')[0]);
      } else if (planDuration === '3_days') {
        for (let i = 1; i <= 2; i++) {
          const nextDay = new Date(baseDate);
          nextDay.setDate(nextDay.getDate() + i);
          targetDates.push(nextDay.toISOString().split('T')[0]);
        }
      } else if (planDuration === '7_days') {
        for (let i = 1; i <= 6; i++) {
          const nextDay = new Date(baseDate);
          nextDay.setDate(nextDay.getDate() + i);
          targetDates.push(nextDay.toISOString().split('T')[0]);
        }
      } else if (planDuration === 'weekly_routine' && selectedDays.length > 0) {
        for (let i = 1; i <= 7; i++) {
          const nextDay = new Date(baseDate);
          nextDay.setDate(nextDay.getDate() + i);
          const dayName = nextDay.toLocaleDateString('en-US', { weekday: 'short' }).toLowerCase();
          if (selectedDays.includes(dayName)) {
            targetDates.push(nextDay.toISOString().split('T')[0]);
          }
        }
      }

      if (targetDates.length > 0) {
        await Promise.all(targetDates.map(tDate => 
          fetch(`${API_URL}/workouts/${date}/duplicate`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({ targetDate: tDate })
          })
        ));
      }
    } catch (err) {
      setError(err.message);
      console.error(err);
    } finally {
      setGenerating(false);
    }
  };

  // Reroll single exercise
  const handleRerollExercise = async (exerciseId) => {
    try {
      const res = await fetch(`${API_URL}/workouts/${date}/exercise/${exerciseId}/reroll`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setLog(data.log);
    } catch (err) {
      setError('Failed to reroll substitute.');
      console.error(err);
    }
  };

  // Toggle skip status
  const handleToggleSkip = async () => {
    try {
      const res = await fetch(`${API_URL}/workouts/${date}/skip`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setLog(data);
    } catch (err) {
      setError('Failed to toggle skip status.');
      console.error(err);
    }
  };

  // Toggle rest day
  const handleToggleRestDay = async () => {
    try {
      const res = await fetch(`${API_URL}/workouts/${date}/rest-day`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setLog(data);
    } catch (err) {
      setError('Failed to toggle rest day.');
      console.error(err);
    }
  };

  // Add custom exercise
  const handleAddCustomExercise = async (e) => {
    e.preventDefault();
    if (!customName) return;

    try {
      const res = await fetch(`${API_URL}/workouts/${date}/add`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          name: customName,
          sets: customSets,
          reps: customReps,
          targetMuscles: customMuscles ? customMuscles.split(',').map(m => m.trim()) : []
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      
      setLog(data);
      setCustomName('');
      setCustomMuscles('');
    } catch (err) {
      setError('Failed to add custom exercise.');
      console.error(err);
    }
  };

  // Delete custom exercise
  const handleDeleteExercise = async (exerciseId) => {
    try {
      const res = await fetch(`${API_URL}/workouts/${date}/exercise/${exerciseId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setLog(data);
    } catch (err) {
      setError('Failed to delete exercise.');
      console.error(err);
    }
  };

  // Duplicate current workout plan to target date
  const handleDuplicateWorkout = async (targetDateVal) => {
    if (!targetDateVal) return;
    setError('');
    try {
      const res = await fetch(`${API_URL}/workouts/${date}/duplicate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ targetDate: targetDateVal })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      
      // Navigate user to target duplicated date
      setDate(targetDateVal);
      setIsDuplicateModalOpen(false);
    } catch (err) {
      setError(err.message || 'Failed to duplicate workout');
      console.error(err);
    }
  };

  // Update workout log metadata
  const handleUpdateMetadata = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const res = await fetch(`${API_URL}/workouts/${date}/metadata`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(metadataForm)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      
      setLog(data);
      setIsMetadataModalOpen(false);
    } catch (err) {
      setError(err.message || 'Failed to update metadata');
      console.error(err);
    }
  };

  // Update individual exercise configuration
  const handleUpdateExerciseSettings = async (e) => {
    e.preventDefault();
    if (!editingExercise) return;
    setError('');
    try {
      const res = await fetch(`${API_URL}/workouts/${date}/exercise/${editingExercise._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          name: editingExercise.name,
          sets: Number(editingExercise.sets),
          reps: editingExercise.reps,
          restTime: editingExercise.restTime
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      
      setLog(data);
      setEditingExercise(null);
    } catch (err) {
      setError(err.message || 'Failed to update exercise');
      console.error(err);
    }
  };

  // Toggle exercise history collapsible log
  const toggleExerciseHistory = async (exerciseId, exerciseName) => {
    const isExpanding = !expandedHistory[exerciseId];
    setExpandedHistory(prev => ({ ...prev, [exerciseId]: isExpanding }));
    
    if (isExpanding) {
      const key = exerciseName.toLowerCase();
      if (exerciseHistory[key] || loadingHistory[key]) return;
      
      setLoadingHistory(prev => ({ ...prev, [key]: true }));
      try {
        const res = await fetch(`${API_URL}/workouts/exercise/${encodeURIComponent(exerciseName)}/history`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        setExerciseHistory(prev => ({ ...prev, [key]: data }));
      } catch (err) {
        console.error('Failed to fetch history for', exerciseName, err);
      } finally {
        setLoadingHistory(prev => ({ ...prev, [key]: false }));
      }
    }
  };

  const openMetadataModal = () => {
    setMetadataForm({
      name: log.name || '',
      difficulty: log.difficulty || 'Intermediate',
      estimatedDuration: log.estimatedDuration || 45,
      notes: log.notes || ''
    });
    setIsMetadataModalOpen(true);
  };

  const openEditExerciseModal = (exercise) => {
    setEditingExercise({
      _id: exercise._id,
      name: exercise.name,
      sets: exercise.sets || 3,
      reps: exercise.reps || '10-12',
      restTime: exercise.restTime || '90s'
    });
  };

  const calculateTotalVolume = () => {
    let vol = 0;
    if (log && log.exercises) {
      log.exercises.forEach(ex => {
        if (ex.setDetails) {
          ex.setDetails.forEach(s => {
            if (s.completed && s.weight > 0 && s.reps > 0) {
              vol += s.weight * s.reps;
            }
          });
        }
      });
    }
    return vol;
  };

  const calculateTotalHoldTime = () => {
    let totalHold = 0;
    if (log && log.exercises) {
      log.exercises.forEach(ex => {
        if (ex.setDetails) {
          const metrics = getExerciseMetrics(log.name, ex.name);
          if (metrics.weightLabel === 'Hold Time (s)') {
            ex.setDetails.forEach(s => {
              if (s.completed && s.weight > 0) {
                totalHold += s.weight;
              }
            });
          }
        }
      });
    }
    return totalHold;
  };

  return (
    <div className="main-content page-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Dumbbell className="text-purple animate-pulse" size={28} /> AI Fitness Coach
          </h1>
          <p className="page-subtitle">Your intelligent prompt-based workout routines & progressive tracking dashboard</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button className="btn btn-secondary" onClick={() => changeDay(-1)} style={{ padding: '8px' }} title="Previous day">
            <ChevronLeft size={18} />
          </button>
          <div
            onClick={() => dateInputRef.current?.showPicker()}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              cursor: 'pointer', padding: '7px 14px',
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid var(--border-light)',
              borderRadius: 'var(--radius)',
              fontWeight: '600', fontSize: '14px',
              userSelect: 'none', position: 'relative',
              transition: 'var(--transition)'
            }}
            title="Click to pick a date"
          >
            <Calendar size={15} className="text-purple" />
            <span>{formatDateLabel(date)}</span>
            <input
              ref={dateInputRef}
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              style={{ position: 'absolute', opacity: 0, pointerEvents: 'none', width: 0, height: 0 }}
            />
          </div>
          <button className="btn btn-secondary" onClick={() => changeDay(1)} style={{ padding: '8px' }} title="Next day">
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {error && (
        <div className="card" style={{ border: '1px solid rgba(239, 68, 68, 0.3)', background: 'rgba(239, 68, 68, 0.03)', color: 'var(--accent-red)', display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px', marginBottom: '20px' }}>
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Tabs navigation removed */}

      {/* Yesterday Unmarked Resolution Prompt */}
      {hasUnmarkedYesterday ? (
        <div className="card" style={{ border: '1px solid rgba(168, 85, 247, 0.3)', background: 'rgba(168, 85, 247, 0.03)', textAlign: 'center', padding: '40px 20px' }}>
          <AlertCircle size={40} className="text-purple" style={{ marginBottom: '16px' }} />
          <h2 style={{ fontSize: '22px', marginBottom: '8px' }}>Yesterday's Workout Unresolved</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '15px', maxWidth: '600px', margin: '0 auto 24px auto', lineHeight: '1.5' }}>
            We noticed that your scheduled workout for yesterday (<strong>{yesterdayDate}</strong>) has not been checked off. 
            Did you perform that workout?
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '16px' }}>
            <button 
              className="btn btn-primary" 
              onClick={() => handleResolveYesterday(true)}
              disabled={submitting}
              style={{ padding: '12px 28px' }}
            >
              <Check size={18} /> Yes, I performed it!
            </button>
            <button 
              className="btn btn-secondary" 
              onClick={() => handleResolveYesterday(false)}
              disabled={submitting}
              style={{ padding: '12px 28px' }}
            >
              <XCircle size={18} /> No, shift it to today
            </button>
          </div>
        </div>
      ) : (
        loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '32px' }} className="page-fade-in">
            <div>
              <div className="card skeleton" style={{ height: '160px', marginBottom: '24px', border: 'none' }} />
              <div className="card skeleton" style={{ height: '350px', border: 'none' }} />
            </div>
            <div>
              <div className="card skeleton" style={{ height: '400px', border: 'none' }} />
            </div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '32px' }} className="page-fade-in">
            
            {/* Main Workout Panel */}
            <div>
              {/* Descriptive empty state when training board is empty */}
              {(!log.exercises || log.exercises.length === 0) && !showPromptGenerator && !log.isRestDay && (
                <div style={{ 
                  textAlign: 'center', 
                  padding: '60px 20px', 
                  border: '1px dashed rgba(168, 85, 247, 0.25)', 
                  background: 'rgba(168, 85, 247, 0.01)', 
                  borderRadius: 'var(--radius-lg)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '16px',
                  marginBottom: '24px'
                }} className="card-hover-glow hover-scale">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(168, 85, 247, 0.1)', color: 'var(--accent-purple)' }}>
                    <Dumbbell size={28} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '6px' }}>Your Training Board is Empty</h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '14.5px', maxWidth: '440px', margin: '0 auto', lineHeight: '1.4' }}>
                      Start your fitness journey by generating your first workout.
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
                    <button 
                      className="btn btn-primary hover-scale active-press"
                      onClick={() => setShowPromptGenerator(true)}
                      style={{ padding: '10px 24px', fontSize: '13.5px', backgroundColor: 'var(--accent-purple)', borderColor: 'var(--accent-purple)' }}
                    >
                      <Sparkles size={16} /> Open AI Fitness Coach
                    </button>
                    <button 
                      className="btn btn-secondary hover-scale"
                      onClick={handleToggleRestDay}
                      style={{ padding: '10px 24px', fontSize: '13.5px' }}
                    >
                      🛌 Mark as Rest Day
                    </button>
                  </div>
                </div>
              )}

              {/* Rest Day Card */}
              {log.isRestDay && (
                <div style={{
                  textAlign: 'center',
                  padding: '48px 24px',
                  border: '1px solid rgba(16, 185, 129, 0.25)',
                  background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.04), rgba(16, 185, 129, 0.01))',
                  borderRadius: 'var(--radius-lg)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '16px',
                  marginBottom: '24px'
                }}>
                  <div style={{ fontSize: '52px' }}>🛌</div>
                  <div>
                    <h3 style={{ fontSize: '22px', fontWeight: '800', marginBottom: '8px', color: 'var(--accent-emerald)' }}>Rest Day</h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '14.5px', maxWidth: '460px', margin: '0 auto', lineHeight: '1.6' }}>
                      Recovery is part of the process. Your muscles are repairing and growing stronger. Stay hydrated, eat well, and come back stronger tomorrow.
                    </p>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', justifyContent: 'center', marginTop: '8px' }}>
                    {['💧 Stay Hydrated', '🥗 Eat Nutritious', '😴 Sleep 8hrs', '🧘 Light Stretching'].map(tip => (
                      <span key={tip} style={{
                        padding: '6px 14px',
                        borderRadius: '20px',
                        background: 'rgba(16, 185, 129, 0.08)',
                        border: '1px solid rgba(16, 185, 129, 0.2)',
                        color: 'var(--accent-emerald)',
                        fontSize: '12.5px',
                        fontWeight: '600'
                      }}>{tip}</span>
                    ))}
                  </div>
                  <button
                    className="btn btn-secondary"
                    onClick={handleToggleRestDay}
                    style={{ marginTop: '8px', fontSize: '13px', padding: '8px 20px' }}
                  >
                    Cancel Rest Day
                  </button>
                </div>
              )}

              {/* Prompt Generator Card (Customized AI Fitness Coach Form) */}
              {(showPromptGenerator || ((!log.exercises || log.exercises.length === 0) && showPromptGenerator)) && (
                <div className="card" style={{ marginBottom: '24px', border: '1px solid rgba(168, 85, 247, 0.25)', background: 'rgba(168, 85, 247, 0.02)', padding: '28px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '12px' }}>
                    <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '20px', fontWeight: '700' }}>
                      <Sparkles size={22} className="text-purple animate-pulse" /> AI Fitness Coach Customizer
                    </h3>
                    {log.exercises && log.exercises.length > 0 && (
                      <button 
                        onClick={() => setShowPromptGenerator(false)} 
                        style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                      >
                        <X size={20} />
                      </button>
                    )}
                  </div>

                  {/* Section 1: Type of Training */}
                  <div style={{ marginBottom: '24px' }}>
                    <label className="form-label" style={{ fontWeight: '700', fontSize: '14.5px', marginBottom: '12px', display: 'block', color: 'var(--text-primary)' }}>
                      1. What type of training would you like to plan?
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
                      {TRAINING_TYPES.map((type) => {
                        const isSelected = coachTrainingType === type.id;
                        return (
                          <div 
                            key={type.id}
                            onClick={() => {
                              setCoachTrainingType(type.id);
                              setCoachSelectedRoutine('');
                              setCoachSelectedEquipments([]);
                              if (['strength', 'muscle_building', 'gym'].includes(type.id)) {
                                setCoachHasEquipment('yes');
                              } else {
                                setCoachHasEquipment('no');
                              }
                            }}
                            style={{
                              padding: '16px',
                              background: isSelected ? 'rgba(168, 85, 247, 0.08)' : 'rgba(255, 255, 255, 0.01)',
                              border: isSelected ? '2px solid var(--accent-purple)' : '1px solid var(--border-light)',
                              borderRadius: 'var(--radius)',
                              cursor: 'pointer',
                              transition: 'var(--transition)',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '8px',
                              boxShadow: isSelected ? '0 4px 15px rgba(168, 85, 247, 0.15)' : 'none'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: isSelected ? 'var(--accent-purple)' : 'var(--text-secondary)', fontWeight: '700' }}>
                              {renderTrainingIcon(type.icon, 18)}
                              <span style={{ fontSize: '14.5px' }}>{type.name}</span>
                            </div>
                            <span style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.3' }}>{type.desc}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Section 2: Equipment Availability */}
                  <div style={{ marginBottom: '24px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '20px' }}>
                    <label className="form-label" style={{ fontWeight: '700', fontSize: '14.5px', marginBottom: '12px', display: 'block', color: 'var(--text-primary)' }}>
                      2. Equipment Availability
                    </label>

                    {['strength', 'muscle_building', 'gym'].includes(coachTrainingType) ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {/* Toggle segment */}
                        <div style={{ display: 'flex', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius)', padding: '4px', width: 'fit-content' }}>
                          <button
                            type="button"
                            className="btn"
                            onClick={() => {
                              setCoachHasEquipment('no');
                              setCoachSelectedEquipments([]);
                            }}
                            style={{ 
                              padding: '8px 16px', 
                              fontSize: '13px', 
                              borderRadius: '8px', 
                              border: 'none',
                              backgroundColor: coachHasEquipment === 'no' ? 'var(--accent-purple)' : 'transparent',
                              color: coachHasEquipment === 'no' ? '#fff' : 'var(--text-secondary)',
                              cursor: 'pointer'
                            }}
                          >
                            No Equipment (Bodyweight Only)
                          </button>
                          <button
                            type="button"
                            className="btn"
                            onClick={() => setCoachHasEquipment('yes')}
                            style={{ 
                              padding: '8px 16px', 
                              fontSize: '13px', 
                              borderRadius: '8px', 
                              border: 'none',
                              backgroundColor: coachHasEquipment === 'yes' ? 'var(--accent-purple)' : 'transparent',
                              color: coachHasEquipment === 'yes' ? '#fff' : 'var(--text-secondary)',
                              cursor: 'pointer'
                            }}
                          >
                            Yes, Equipment Available
                          </button>
                        </div>

                        {/* Equipment options */}
                        {coachHasEquipment === 'yes' && (
                          <div className="page-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '600' }}>Select available equipment:</span>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                              {EQUIPMENT_MAP[coachTrainingType]?.map(eq => {
                                const isChecked = coachSelectedEquipments.includes(eq);
                                return (
                                  <label 
                                    key={eq}
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '8px',
                                      padding: '8px 14px',
                                      borderRadius: '20px',
                                      background: isChecked ? 'rgba(168, 85, 247, 0.1)' : 'rgba(255,255,255,0.02)',
                                      border: isChecked ? '1px solid var(--accent-purple)' : '1px solid var(--border-light)',
                                      cursor: 'pointer',
                                      fontSize: '13px',
                                      color: isChecked ? 'var(--text-primary)' : 'var(--text-secondary)',
                                      transition: 'var(--transition)'
                                    }}
                                  >
                                    <input 
                                      type="checkbox"
                                      checked={isChecked}
                                      onChange={() => {
                                        setCoachSelectedEquipments(prev => 
                                          prev.includes(eq) ? prev.filter(item => item !== eq) : [...prev, eq]
                                        );
                                      }}
                                      style={{ display: 'none' }}
                                    />
                                    <div style={{
                                      width: '14px',
                                      height: '14px',
                                      borderRadius: '3px',
                                      border: '1px solid rgba(255,255,255,0.3)',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      backgroundColor: isChecked ? 'var(--accent-purple)' : 'transparent'
                                    }}>
                                      {isChecked && <Check size={10} style={{ color: '#fff' }} />}
                                    </div>
                                    {eq}
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      /* Yoga, stretching, pain relief: list equipment checkboxes directly */
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '600' }}>Select gear you have access to:</span>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                          {EQUIPMENT_MAP[coachTrainingType]?.map(eq => {
                            const isChecked = coachSelectedEquipments.includes(eq);
                            return (
                              <label 
                                key={eq}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '8px',
                                  padding: '8px 14px',
                                  borderRadius: '20px',
                                  background: isChecked ? 'rgba(168, 85, 247, 0.1)' : 'rgba(255,255,255,0.02)',
                                  border: isChecked ? '1px solid var(--accent-purple)' : '1px solid var(--border-light)',
                                  cursor: 'pointer',
                                  fontSize: '13px',
                                  color: isChecked ? 'var(--text-primary)' : 'var(--text-secondary)',
                                  transition: 'var(--transition)'
                                }}
                              >
                                <input 
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => {
                                    setCoachSelectedEquipments(prev => 
                                      prev.includes(eq) ? prev.filter(item => item !== eq) : [...prev, eq]
                                    );
                                  }}
                                  style={{ display: 'none' }}
                                />
                                <div style={{
                                  width: '14px',
                                  height: '14px',
                                  borderRadius: '3px',
                                  border: '1px solid rgba(255,255,255,0.3)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  backgroundColor: isChecked ? 'var(--accent-purple)' : 'transparent'
                                }}>
                                  {isChecked && <Check size={10} style={{ color: '#fff' }} />}
                                </div>
                                {eq}
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Section 3: Pre-existing Routines / Focus Areas */}
                  {ROUTINES_MAP[coachTrainingType] && ROUTINES_MAP[coachTrainingType].length > 0 && (
                    <div style={{ marginBottom: '24px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '20px' }} className="page-fade-in">
                      <label className="form-label" style={{ fontWeight: '700', fontSize: '14.5px', marginBottom: '12px', display: 'block', color: 'var(--text-primary)' }}>
                        {coachTrainingType === 'pain_relief' ? '3. Select focus discomfort area' : '3. Select Routine or Split'}
                      </label>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                        {ROUTINES_MAP[coachTrainingType].map((routine) => {
                          const isSelected = coachSelectedRoutine === routine.id;
                          return (
                            <button
                              key={routine.id}
                              type="button"
                              onClick={() => setCoachSelectedRoutine(isSelected ? '' : routine.id)}
                              className="btn"
                              style={{
                                fontSize: '13px',
                                padding: '8px 16px',
                                borderRadius: '20px',
                                border: isSelected ? '1px solid var(--accent-purple)' : '1px solid var(--border-light)',
                                background: isSelected ? 'rgba(168, 85, 247, 0.1)' : 'rgba(255,255,255,0.02)',
                                color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)',
                                cursor: 'pointer',
                                transition: 'var(--transition)'
                              }}
                            >
                              {routine.name}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Section 4: Planning Duration & Generation Mode */}
                  <div style={{ marginBottom: '24px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '20px' }}>
                    <label className="form-label" style={{ fontWeight: '700', fontSize: '14.5px', marginBottom: '12px', display: 'block', color: 'var(--text-primary)' }}>
                      4. Planning Duration & Mode
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '16px' }}>
                      {/* Generation Mode */}
                      <div>
                        <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '600', display: 'block', marginBottom: '8px' }}>Generation Mode</span>
                        <div style={{ display: 'flex', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius)', padding: '4px' }}>
                          <button
                            type="button"
                            className="btn"
                            onClick={() => setCoachAppendMode(false)}
                            style={{ 
                              flex: 1,
                              padding: '8px 12px', 
                              fontSize: '12.5px', 
                              borderRadius: '8px', 
                              border: 'none',
                              backgroundColor: !coachAppendMode ? 'var(--accent-purple)' : 'transparent',
                              color: !coachAppendMode ? '#fff' : 'var(--text-secondary)',
                              cursor: 'pointer',
                              fontWeight: '600',
                              transition: 'var(--transition)'
                            }}
                          >
                            Replace Plan
                          </button>
                          <button
                            type="button"
                            className="btn"
                            onClick={() => setCoachAppendMode(true)}
                            style={{ 
                              flex: 1,
                              padding: '8px 12px', 
                              fontSize: '12.5px', 
                              borderRadius: '8px', 
                              border: 'none',
                              backgroundColor: coachAppendMode ? 'var(--accent-purple)' : 'transparent',
                              color: coachAppendMode ? '#fff' : 'var(--text-secondary)',
                              cursor: 'pointer',
                              fontWeight: '600',
                              transition: 'var(--transition)'
                            }}
                          >
                            Append/Stack
                          </button>
                        </div>
                      </div>

                      {/* Plan Duration */}
                      <div>
                        <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '600', display: 'block', marginBottom: '8px' }}>How long is this planned for?</span>
                        <select
                          className="input-field"
                          value={coachPlanDuration}
                          onChange={(e) => setCoachPlanDuration(e.target.value)}
                          style={{ padding: '9px 12px', fontSize: '13px', borderRadius: 'var(--radius)', background: 'var(--bg-dark)', border: '1px solid var(--border-light)', color: 'var(--text-primary)', width: '100%' }}
                        >
                          <option value="1_day">Only Today</option>
                          <option value="2_days">Next 2 Days</option>
                          <option value="3_days">Next 3 Days</option>
                          <option value="7_days">Next 7 Days</option>
                          <option value="weekly_routine">Weekly Routine (Specific Days)</option>
                        </select>
                      </div>
                    </div>

                    {/* Weekday Selector for Weekly Routine */}
                    {coachPlanDuration === 'weekly_routine' && (
                      <div className="page-fade-in" style={{ background: 'rgba(255,255,255,0.01)', border: '1px dashed var(--border-light)', padding: '16px', borderRadius: 'var(--radius)', marginBottom: '16px' }}>
                        <span style={{ fontSize: '12.5px', color: 'var(--text-secondary)', fontWeight: '600', display: 'block', marginBottom: '10px' }}>Select days to schedule this routine:</span>
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                          {[
                            { id: 'mon', name: 'Mon' },
                            { id: 'tue', name: 'Tue' },
                            { id: 'wed', name: 'Wed' },
                            { id: 'thu', name: 'Thu' },
                            { id: 'fri', name: 'Fri' },
                            { id: 'sat', name: 'Sat' },
                            { id: 'sun', name: 'Sun' }
                          ].map((day) => {
                            const isSelected = coachSelectedDays.includes(day.id);
                            return (
                              <button
                                key={day.id}
                                type="button"
                                onClick={() => {
                                  setCoachSelectedDays(prev => 
                                    prev.includes(day.id) ? prev.filter(d => d !== day.id) : [...prev, day.id]
                                  );
                                }}
                                className="btn"
                                style={{
                                  padding: '6px 12px',
                                  fontSize: '12.5px',
                                  borderRadius: '20px',
                                  border: isSelected ? '1px solid var(--accent-purple)' : '1px solid var(--border-light)',
                                  background: isSelected ? 'rgba(168, 85, 247, 0.1)' : 'rgba(255,255,255,0.02)',
                                  color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)',
                                  cursor: 'pointer',
                                  fontWeight: isSelected ? 'bold' : 'normal',
                                  transition: 'var(--transition)'
                                }}
                              >
                                {day.name}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Section 5: Custom Coach Instructions */}
                  <div style={{ marginBottom: '24px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '20px' }}>
                    <label className="form-label" style={{ fontWeight: '700', fontSize: '14.5px', marginBottom: '8px', display: 'block', color: 'var(--text-primary)' }}>
                      5. Custom guidelines or focus instructions (Optional)
                    </label>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '12px', marginBottom: '12px' }}>
                      Add details about injuries, limitations, time constraints, or specific exercises to target.
                    </p>
                    <textarea
                      className="input-field"
                      style={{ minHeight: '80px', resize: 'vertical', display: 'block' }}
                      placeholder="e.g. Focus on chest development, skip any exercises causing wrist strain, or keep total duration below 40 minutes."
                      value={coachCustomPrompt}
                      onChange={(e) => setCoachCustomPrompt(e.target.value)}
                    />
                  </div>

                  <button 
                    onClick={() => {
                      const typeName = TRAINING_TYPES.find(t => t.id === coachTrainingType)?.name || coachTrainingType;
                      let generatedPrompt = `Design a ${typeName} workout.`;
                      
                      if (coachSelectedRoutine) {
                        const routineDetail = ROUTINES_MAP[coachTrainingType]?.find(r => r.id === coachSelectedRoutine);
                        if (routineDetail) {
                          if (coachTrainingType === 'pain_relief') {
                            generatedPrompt += ` Focus on pain relief and stretching for: ${routineDetail.name}.`;
                          } else {
                            generatedPrompt += ` Follow this routine split/style: ${routineDetail.name}.`;
                          }
                        }
                      }
                      
                      if (coachHasEquipment === 'yes' && coachSelectedEquipments.length > 0) {
                        generatedPrompt += ` Available equipment: ${coachSelectedEquipments.join(', ')}.`;
                      } else if (coachHasEquipment === 'no' || (['strength', 'muscle_building', 'gym'].includes(coachTrainingType) && coachHasEquipment === 'no')) {
                        generatedPrompt += ` No equipment available (bodyweight/calisthenics only).`;
                      }
                      
                      const isRecovery = ['stretching', 'yoga', 'pain_relief'].includes(coachTrainingType);
                      if (isRecovery) {
                        generatedPrompt += ` Make this a recovery/mobility routine. IMPORTANT: For stretching/yoga/pain relief, specify the estimated hold time in seconds (e.g., 30 or 45, as an integer representing seconds, don't include text units) in the 'weight' field, and the number of breath cycles or repetitions (e.g., 5 or 8, as an integer) in the 'reps' field.`;
                      }
                      
                      if (coachCustomPrompt.trim()) {
                        generatedPrompt += ` Additional details: ${coachCustomPrompt.trim()}`;
                      }
                      
                      handleGenerateWorkout(generatedPrompt, coachAppendMode, coachPlanDuration, coachSelectedDays);
                    }} 
                    disabled={generating} 
                    className="btn btn-primary"
                    style={{ width: '100%', padding: '14px', fontSize: '15px', backgroundColor: 'var(--accent-purple)', borderColor: 'var(--accent-purple)' }}
                  >
                    <RefreshCw size={16} className={generating ? 'animate-spin' : ''} style={{ marginRight: '8px' }} />
                    {generating ? 'AI Coach is crafting your workout...' : 'Generate Customized AI Workout'}
                  </button>
                </div>
              )}

            {/* Daily Exercises Logs and Dashboard */}
            {log.exercises && log.exercises.length > 0 && (
              <div className="card" style={{ marginBottom: '24px' }}>
                <div className="workout-header" style={{ borderBottom: '1px solid var(--border-light)', paddingBottom: '20px', marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', width: '100%' }}>
                    
                    {/* Title & Badges */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                        <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '20px', margin: 0 }}>
                          <Dumbbell size={22} className="text-purple" /> {log.name || 'Daily Workout Routine'}
                        </h3>
                        {log.difficulty && (
                          <span style={{
                            fontSize: '11px',
                            padding: '4px 8px',
                            borderRadius: '4px',
                            fontWeight: 'bold',
                            backgroundColor: log.difficulty === 'Advanced' ? 'rgba(239, 68, 68, 0.1)' : log.difficulty === 'Beginner' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(168, 85, 247, 0.1)',
                            color: log.difficulty === 'Advanced' ? 'var(--accent-red)' : log.difficulty === 'Beginner' ? 'var(--accent-emerald)' : 'var(--accent-purple)',
                            border: `1px solid ${log.difficulty === 'Advanced' ? 'rgba(239, 68, 68, 0.2)' : log.difficulty === 'Beginner' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(168, 85, 247, 0.2)'}`
                          }}>
                            {log.difficulty}
                          </span>
                        )}
                        {log.estimatedDuration && (
                          <span style={{
                            fontSize: '11px',
                            padding: '4px 8px',
                            borderRadius: '4px',
                            fontWeight: 'bold',
                            backgroundColor: 'rgba(255, 255, 255, 0.05)',
                            color: 'var(--text-secondary)',
                            border: '1px solid var(--border-light)'
                          }}>
                            ⏱ {log.estimatedDuration} mins
                          </span>
                        )}
                      </div>
                      {log.skipped && <span className="text-orange" style={{ fontSize: '13px', fontWeight: 'bold' }}>Workout Session Skipped</span>}
                    </div>

                    {/* Metadata & Customize Row Actions */}
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button 
                        onClick={openMetadataModal} 
                        className="btn btn-secondary"
                        style={{ fontSize: '12px', padding: '6px 12px' }}
                        title="Edit workout details"
                      >
                        <Edit size={13} /> Edit Details
                      </button>
                      <button 
                        onClick={() => setIsDuplicateModalOpen(true)} 
                        className="btn btn-secondary"
                        style={{ fontSize: '12px', padding: '6px 12px' }}
                        title="Duplicate workout to another day"
                      >
                        <Copy size={13} /> Duplicate
                      </button>
                      <button 
                        onClick={() => setShowPromptGenerator(!showPromptGenerator)} 
                        className="btn btn-secondary"
                        style={{ fontSize: '12px', padding: '6px 12px' }}
                        title="Regenerate today's routine with a prompt"
                      >
                        <RefreshCw size={13} /> Custom Prompt
                      </button>
                    </div>
                  </div>

                  {log.notes && (
                    <div style={{ padding: '10px 14px', borderRadius: '8px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-light)', fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                      <strong>Notes:</strong> {log.notes}
                    </div>
                  )}

                  {/* Volume stats row */}
                  {log.exercises && log.exercises.length > 0 && !log.skipped && (
                    <div style={{ display: 'flex', gap: '16px', alignItems: 'center', width: '100%', flexWrap: 'wrap' }}>
                      {log.exercises.some(ex => getExerciseMetrics(log.name, ex.name).weightLabel === 'Weight (kg)') && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13.5px', backgroundColor: 'rgba(255, 255, 255, 0.03)', padding: '6px 12px', borderRadius: '6px', border: '1px solid var(--border-light)' }}>
                          <Activity size={15} className="text-purple" />
                          <span>Volume: <strong>{calculateTotalVolume()} kg</strong></span>
                        </div>
                      )}
                      {log.exercises.some(ex => getExerciseMetrics(log.name, ex.name).weightLabel === 'Hold Time (s)') && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13.5px', backgroundColor: 'rgba(255, 255, 255, 0.03)', padding: '6px 12px', borderRadius: '6px', border: '1px solid var(--border-light)' }}>
                          <Activity size={15} className="text-purple" />
                          <span>Total Hold Time: <strong>{calculateTotalHoldTime()}s</strong></span>
                        </div>
                      )}
                      
                      <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
                        <button 
                          onClick={handleToggleSkip} 
                          className={`btn ${log.skipped ? 'btn-primary' : 'btn-secondary'}`}
                          style={{ fontSize: '13px', padding: '6px 14px' }}
                        >
                          {log.skipped ? 'Resume Session' : 'Skip Session'}
                        </button>
                        <button 
                          onClick={() => setIsOnboardingOpen(true)} 
                          className="btn btn-secondary"
                          style={{ fontSize: '13px', padding: '6px 14px' }}
                        >
                          Coach Setup
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {loading ? (
                  <p style={{ color: 'var(--text-muted)' }}>Loading workout details...</p>
                ) : (
                  <div className="exercise-list">
                    {log.exercises.map((ex) => {
                      const isExpanded = !!expandedExercises[ex._id];
                      const completedSetsCount = ex.setDetails ? ex.setDetails.filter(s => s.completed).length : 0;
                      const totalSetsCount = ex.setDetails ? ex.setDetails.length : ex.sets;

                      return (
                        <div 
                          key={ex._id} 
                          style={{ 
                            opacity: log.skipped ? 0.5 : 1,
                            backgroundColor: 'rgba(255,255,255,0.01)',
                            border: '1px solid var(--border-light)',
                            borderRadius: '8px',
                            marginBottom: '12px',
                            overflow: 'hidden',
                            transition: 'all 0.2s ease'
                          }}
                        >
                          {/* Header Row */}
                          <div 
                            onClick={() => toggleExpandExercise(ex._id)}
                            style={{ 
                              padding: '14px 16px', 
                              display: 'flex', 
                              justifyContent: 'space-between', 
                              alignItems: 'center',
                              cursor: 'pointer',
                              backgroundColor: ex.completed ? 'rgba(16, 185, 129, 0.03)' : 'transparent',
                              borderBottom: isExpanded ? '1px solid var(--border-light)' : 'none'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              <div 
                                className={`checkbox-custom ${ex.completed ? 'checked' : ''}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (!log.skipped) {
                                    handleToggleAllSets(ex._id);
                                  }
                                }}
                              >
                                {ex.completed && <Check size={14} />}
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <span className="exercise-name" style={{ textDecoration: ex.completed ? 'line-through' : 'none', fontWeight: 'bold' }}>
                                  {ex.name}
                                </span>
                                <span className="exercise-detail" style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                                  Sets: {completedSetsCount}/{totalSetsCount} | Targets: {ex.targetMuscles.join(', ')} | Rest: {ex.restTime || '90s'}
                                  {ex.substituted && <span className="text-purple" style={{ marginLeft: '8px', fontSize: '11px' }}>(Substituted)</span>}
                                </span>
                              </div>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }} onClick={(e) => e.stopPropagation()}>
                              {!ex.completed && !log.skipped && (
                                <button 
                                  className="btn btn-secondary"
                                  onClick={() => handleRerollExercise(ex._id)}
                                  title="Substitute exercise with AI Coach suggestion"
                                  style={{ padding: '6px', borderRadius: '6px' }}
                                >
                                  <RefreshCw size={14} />
                                </button>
                              )}
                              <button 
                                className="btn btn-secondary"
                                onClick={() => openEditExerciseModal(ex)}
                                title="Edit sets, reps, or rest settings"
                                style={{ padding: '6px', borderRadius: '6px' }}
                              >
                                <Edit size={14} />
                              </button>
                              <button 
                                className="btn-danger" 
                                onClick={() => handleDeleteExercise(ex._id)}
                                title="Delete exercise from workout"
                                style={{ border: 'none', background: 'none', cursor: 'pointer', padding: '6px' }}
                              >
                                <Trash2 size={15} />
                              </button>
                              <button
                                className="btn btn-secondary"
                                onClick={() => toggleExpandExercise(ex._id)}
                                style={{ padding: '6px', borderRadius: '6px' }}
                              >
                                {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                              </button>
                            </div>
                          </div>

                          {/* Expandable Table for Sets & Individual History */}
                          {isExpanded && (
                            <div style={{ padding: '16px', backgroundColor: 'rgba(255,255,255,0.015)' }}>
                              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <Activity size={12} className="text-purple" />
                                <span>Prior Performance: <strong style={{ color: 'var(--text-primary)' }}>{getPriorPerformance(ex.name)}</strong></span>
                              </div>

                              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                                <thead>
                                  <tr style={{ borderBottom: '1px solid var(--border-light)', color: 'var(--text-muted)' }}>
                                    <th style={{ textAlign: 'left', padding: '6px 8px' }}>Set #</th>
                                    <th style={{ textAlign: 'left', padding: '6px 8px' }}>{getExerciseMetrics(log.name, ex.name).weightLabel}</th>
                                    <th style={{ textAlign: 'left', padding: '6px 8px' }}>{getExerciseMetrics(log.name, ex.name).repsLabel}</th>
                                    <th style={{ textAlign: 'center', padding: '6px 8px', width: '80px' }}>Log</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {ex.setDetails && ex.setDetails.map((set, setIdx) => (
                                    <tr 
                                      key={setIdx} 
                                      style={{ 
                                        borderBottom: '1px dashed rgba(255,255,255,0.05)',
                                        backgroundColor: set.completed ? 'rgba(16, 185, 129, 0.02)' : 'transparent'
                                      }}
                                    >
                                      <td style={{ padding: '8px', fontWeight: 'bold' }}>{setIdx + 1}</td>
                                      <td style={{ padding: '8px' }}>
                                        <input 
                                          type="number" 
                                          className="input-field" 
                                          style={{ width: '70px', padding: '4px 8px', fontSize: '12.5px', textAlign: 'center' }}
                                          value={set.weight || ''}
                                          disabled={log.skipped}
                                          placeholder={getExerciseMetrics(log.name, ex.name).weightPlaceholder}
                                          onChange={(e) => handleUpdateSet(ex._id, setIdx, 'weight', e.target.value)}
                                        />
                                      </td>
                                      <td style={{ padding: '8px' }}>
                                        <input 
                                          type="number" 
                                          className="input-field" 
                                          style={{ width: '70px', padding: '4px 8px', fontSize: '12.5px', textAlign: 'center' }}
                                          value={set.reps || ''}
                                          disabled={log.skipped}
                                          placeholder={getExerciseMetrics(log.name, ex.name).repsPlaceholder}
                                          onChange={(e) => handleUpdateSet(ex._id, setIdx, 'reps', e.target.value)}
                                        />
                                      </td>
                                      <td style={{ padding: '8px', textAlign: 'center' }}>
                                        <button
                                          type="button"
                                          className={`btn ${set.completed ? 'btn-primary' : 'btn-secondary'}`}
                                          disabled={log.skipped}
                                          style={{ 
                                            padding: '4px 10px', 
                                            fontSize: '11px',
                                            backgroundColor: set.completed ? 'var(--accent-emerald, #10b981)' : 'transparent',
                                            borderColor: set.completed ? 'var(--accent-emerald, #10b981)' : 'var(--border-light)'
                                          }}
                                          onClick={() => handleUpdateSet(ex._id, setIdx, 'completed')}
                                        >
                                          {set.completed ? <Check size={12} /> : 'Check'}
                                        </button>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>

                              {/* Collapsible History & Progress */}
                              <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px dashed rgba(255,255,255,0.05)' }}>
                                <button
                                  type="button"
                                  className="btn btn-secondary"
                                  style={{ padding: '6px 12px', fontSize: '11.5px', gap: '6px' }}
                                  onClick={() => toggleExerciseHistory(ex._id, ex.name)}
                                >
                                  <TrendingUp size={12} />
                                  {expandedHistory[ex._id] ? 'Hide Performance History' : 'Show Performance History'}
                                </button>
                                
                                {expandedHistory[ex._id] && (
                                  <div style={{ marginTop: '12px', padding: '12px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>
                                    {loadingHistory[ex.name.toLowerCase()] ? (
                                      <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Loading history...</span>
                                    ) : !exerciseHistory[ex.name.toLowerCase()] || exerciseHistory[ex.name.toLowerCase()].length === 0 ? (
                                      <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>No performance history recorded yet. Complete sets to build history!</span>
                                    ) : (
                                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        {exerciseHistory[ex.name.toLowerCase()].map((hist, histIdx) => {
                                          const metrics = getExerciseMetrics(log.name, ex.name);
                                          const isTimeBased = metrics.weightLabel === 'Hold Time (s)';
                                          return (
                                            <div key={histIdx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', borderBottom: '1px solid rgba(255,255,255,0.02)', paddingBottom: '4px' }}>
                                              <span style={{ fontWeight: '600', color: 'var(--accent-purple)' }}>{hist.date}</span>
                                              <span style={{ color: 'var(--text-secondary)' }}>
                                                {hist.sets.map((s) => {
                                                  if (isTimeBased) {
                                                    return `${s.weight}s x ${s.reps} breaths${s.completed ? ' ✓' : ''}`;
                                                  }
                                                  return `${s.weight}kg x ${s.reps}${s.completed ? ' ✓' : ''}`;
                                                }).join(', ')}
                                              </span>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Column: Custom Exercise Creator */}
          <div>
            <div className="card">
              <h3 style={{ marginBottom: '16px' }}>Add Custom Exercise</h3>
              <form onSubmit={handleAddCustomExercise}>
                <div className="form-group">
                  <label className="form-label">Exercise Name</label>
                  <input 
                    type="text" 
                    required 
                    placeholder="e.g. Incline Bench Press"
                    className="input-field" 
                    value={customName}
                    onChange={(e) => setCustomName(toTitleCase(e.target.value))}
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="form-group">
                    <label className="form-label">Sets</label>
                    <input 
                      type="number" 
                      placeholder="3" 
                      className="input-field" 
                      value={customSets}
                      onChange={(e) => setCustomSets(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Reps</label>
                    <input 
                      type="text" 
                      placeholder="10-12" 
                      className="input-field" 
                      value={customReps}
                      onChange={(e) => setCustomReps(e.target.value)}
                    />
                  </div>
                </div>
                <div className="form-group" style={{ marginBottom: '20px' }}>
                  <label className="form-label">Target Muscles (comma separated)</label>
                  <input 
                    type="text" 
                    placeholder="chest, shoulders, triceps" 
                    className="input-field" 
                    value={customMuscles}
                    onChange={(e) => setCustomMuscles(e.target.value)}
                  />
                </div>
                <button type="submit" className="btn btn-secondary" style={{ width: '100%' }}>
                  <Plus size={16} /> Add Exercise
                </button>
              </form>
            </div>
          </div>
        </div>
      ))}



      {/* Edit Workout Metadata Modal */}
      {isMetadataModalOpen && (
        <div className="modal-overlay" onClick={() => setIsMetadataModalOpen(false)}>
          <div className="modal-content card" onClick={(e) => e.stopPropagation()}>
            <button 
              type="button" 
              className="modal-close-btn" 
              onClick={() => setIsMetadataModalOpen(false)}
              aria-label="Close modal"
            >
              <X size={20} />
            </button>
            <h2 style={{ marginBottom: '16px', fontSize: '22px' }}>Edit Workout Details</h2>
            <form onSubmit={handleUpdateMetadata}>
              <div className="form-group">
                <label className="form-label">Workout Name</label>
                <input 
                  type="text" 
                  required 
                  className="input-field" 
                  value={metadataForm.name}
                  onChange={(e) => setMetadataForm({ ...metadataForm, name: e.target.value })}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Difficulty</label>
                  <select 
                    className="input-field"
                    value={metadataForm.difficulty}
                    onChange={(e) => setMetadataForm({ ...metadataForm, difficulty: e.target.value })}
                  >
                    <option value="Beginner">Beginner</option>
                    <option value="Intermediate">Intermediate</option>
                    <option value="Advanced">Advanced</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Estimated Duration (mins)</label>
                  <input 
                    type="number" 
                    required 
                    className="input-field" 
                    value={metadataForm.estimatedDuration}
                    onChange={(e) => setMetadataForm({ ...metadataForm, estimatedDuration: e.target.value })}
                  />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Workout Notes</label>
                <textarea 
                  className="input-field"
                  style={{ minHeight: '80px', resize: 'vertical' }}
                  value={metadataForm.notes}
                  onChange={(e) => setMetadataForm({ ...metadataForm, notes: e.target.value })}
                  placeholder="Special instructions, mood, energy levels..."
                />
              </div>
              <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '10px' }}>
                Save Details
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Duplicate Workout Modal */}
      {isDuplicateModalOpen && (
        <div className="modal-overlay" onClick={() => setIsDuplicateModalOpen(false)}>
          <div className="modal-content card" onClick={(e) => e.stopPropagation()}>
            <button 
              type="button" 
              className="modal-close-btn" 
              onClick={() => setIsDuplicateModalOpen(false)}
              aria-label="Close modal"
            >
              <X size={20} />
            </button>
            <h2 style={{ marginBottom: '16px', fontSize: '22px' }}>Duplicate Workout Routine</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '20px', lineHeight: '1.5' }}>
              Copy all exercises, sets, reps, and target configurations from this workout to another date.
            </p>
            <div className="form-group" style={{ marginBottom: '20px' }}>
              <label className="form-label">Target Date</label>
              <input 
                type="date" 
                required 
                className="input-field" 
                value={duplicateTargetDate}
                onChange={(e) => setDuplicateTargetDate(e.target.value)}
              />
            </div>
            <button 
              onClick={() => handleDuplicateWorkout(duplicateTargetDate)} 
              className="btn btn-primary" 
              style={{ width: '100%' }}
            >
              Copy Routine to Date
            </button>
          </div>
        </div>
      )}

      {/* Edit Exercise Settings Modal */}
      {editingExercise && (
        <div className="modal-overlay" onClick={() => setEditingExercise(null)}>
          <div className="modal-content card" onClick={(e) => e.stopPropagation()}>
            <button 
              type="button" 
              className="modal-close-btn" 
              onClick={() => setEditingExercise(null)}
              aria-label="Close modal"
            >
              <X size={20} />
            </button>
            <h2 style={{ marginBottom: '16px', fontSize: '22px' }}>Edit Exercise Settings</h2>
            <form onSubmit={handleUpdateExerciseSettings}>
              <div className="form-group">
                <label className="form-label">Exercise Name</label>
                <input 
                  type="text" 
                  required 
                  className="input-field" 
                  value={editingExercise.name}
                  onChange={(e) => setEditingExercise({ ...editingExercise, name: toTitleCase(e.target.value) })}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Sets</label>
                  <input 
                    type="number" 
                    required 
                    className="input-field" 
                    value={editingExercise.sets}
                    onChange={(e) => setEditingExercise({ ...editingExercise, sets: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Reps</label>
                  <input 
                    type="text" 
                    required 
                    className="input-field" 
                    value={editingExercise.reps}
                    onChange={(e) => setEditingExercise({ ...editingExercise, reps: e.target.value })}
                  />
                </div>
              </div>
              <div className="form-group" style={{ marginBottom: '20px' }}>
                <label className="form-label">Rest Time (e.g. 90s, 60s, 2 mins)</label>
                <input 
                  type="text" 
                  required 
                  className="input-field" 
                  value={editingExercise.restTime}
                  onChange={(e) => setEditingExercise({ ...editingExercise, restTime: e.target.value })}
                />
              </div>
              <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
                Save Settings
              </button>
            </form>
          </div>
        </div>
      )}

      <OnboardingModal 
        section="workout" 
        isOpen={isOnboardingOpen} 
        onClose={() => {
          setIsOnboardingOpen(false);
          fetchWorkoutLog();
        }} 
      />
    </div>
  );
};

export default GymExercises;
