import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import OnboardingModal from '../components/OnboardingModal';
import { 
  Dumbbell, Calendar, RefreshCw, Check, AlertCircle, Plus, Trash2, XCircle, 
  Play, Pause, Volume2, VolumeX, Timer, Activity, ChevronDown, ChevronUp,
  Trophy, Sparkles, TrendingUp, Edit, Copy, Info, X, ChevronLeft, ChevronRight
} from 'lucide-react';

const PROMPT_SUGGESTIONS = [
  "Generate a chest + triceps workout.",
  "Give me a push day.",
  "I only have dumbbells.",
  "I am cutting.",
  "I want a hypertrophy workout.",
  "I have shoulder pain.",
  "I want a 45 minute workout."
];

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
  
  // Tabs: 'workout' or 'analytics'
  const [activeTab, setActiveTab] = useState('workout');

  // Custom prompt state
  const [promptText, setPromptText] = useState('');
  const [showPromptGenerator, setShowPromptGenerator] = useState(false);

  // Custom exercise form state
  const [customName, setCustomName] = useState('');
  const [customSets, setCustomSets] = useState('3');
  const [customReps, setCustomReps] = useState('10-12');
  const [customMuscles, setCustomMuscles] = useState('');

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

  // History & Trends Analytics
  const [historyAnalytics, setHistoryAnalytics] = useState([]);
  const [analyticsSummary, setAnalyticsSummary] = useState(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [selectedTrendExercise, setSelectedTrendExercise] = useState('');

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

  const fetchHistoryAnalytics = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/workouts/analytics/trends`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setHistoryAnalytics(data);
    } catch (err) {
      console.error('Failed to fetch analytics history:', err);
    }
  }, [token, API_URL]);

  const fetchAnalyticsSummary = useCallback(async () => {
    setLoadingSummary(true);
    try {
      const res = await fetch(`${API_URL}/workouts/analytics/summary`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setAnalyticsSummary(data);
    } catch (err) {
      console.error('Failed to fetch analytics summary:', err);
    } finally {
      setLoadingSummary(false);
    }
  }, [token, API_URL]);

  useEffect(() => {
    const load = async () => {
      await Promise.resolve();
      fetchWorkoutLog();
      fetchHistoryAnalytics();
      fetchAnalyticsSummary();
    };
    load();
  }, [fetchWorkoutLog, fetchHistoryAnalytics, fetchAnalyticsSummary]);

  // Sync active seconds with loaded workout log duration
  useEffect(() => {
    const sync = async () => {
      await Promise.resolve();
      if (log && log.duration) {
        setActiveSeconds(log.duration);
      } else {
        setActiveSeconds(0);
      }
    };
    sync();
  }, [log]);

  // Auto-select first exercise for analytics trend when tab changes or data updates
  useEffect(() => {
    const autoSelect = async () => {
      await Promise.resolve();
      if (activeTab === 'analytics' && historyAnalytics.length > 0 && !selectedTrendExercise) {
        setSelectedTrendExercise(historyAnalytics[0].name);
      }
    };
    autoSelect();
  }, [activeTab, historyAnalytics, selectedTrendExercise]);

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
    const match = historyAnalytics.find(h => h.name.toLowerCase() === exerciseName.toLowerCase());
    if (match && match.history && match.history.length > 0) {
      const lastEntry = match.history[match.history.length - 1];
      return `${lastEntry.sets} sets (Max: ${lastEntry.maxWeight}kg / Vol: ${lastEntry.volume}kg)`;
    }
    return 'N/A';
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

      // Sync analytics summaries
      fetchHistoryAnalytics();
      fetchAnalyticsSummary();
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
      fetchHistoryAnalytics();
      fetchAnalyticsSummary();
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
      fetchHistoryAnalytics();
      fetchAnalyticsSummary();
    } catch (err) {
      setError(err.message);
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  // Generate new AI workout with prompt options
  const handleGenerateWorkout = async (customPromptValue) => {
    setGenerating(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/workouts/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ date, prompt: customPromptValue || promptText })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      setLog(data.log);
      setPromptText('');
      setShowPromptGenerator(false);
      fetchHistoryAnalytics();
      fetchAnalyticsSummary();
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
      fetchHistoryAnalytics();
      fetchAnalyticsSummary();
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
      fetchHistoryAnalytics();
      fetchAnalyticsSummary();
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
      fetchHistoryAnalytics();
      fetchAnalyticsSummary();
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
      fetchHistoryAnalytics();
      fetchAnalyticsSummary();
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

  const renderCustomSvgChart = (historyData, metric, strokeColor, gradientId) => {
    // Sort chronological ascending
    const data = [...historyData].sort((a, b) => a.date.localeCompare(b.date));
    
    const width = 500;
    const height = 220;
    
    if (data.length === 1) {
      const val = data[0][metric];
      const displayDate = data[0].date.slice(5).replace('-', '/');
      return (
        <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} style={{ overflow: 'visible' }}>
          <text x="250" y="80" textAnchor="middle" fill="var(--text-muted)" fontSize="12">Single entry logged on {displayDate}</text>
          <circle cx="250" cy="120" r="8" fill={strokeColor} />
          <text x="250" y="150" textAnchor="middle" fill="var(--text-primary)" fontWeight="bold" fontSize="18">{val} kg</text>
        </svg>
      );
    }
    
    const padX = 45;
    const padYTop = 25;
    const padYBottom = 35;
    const graphWidth = width - padX - 20;
    const graphHeight = height - padYTop - padYBottom;
    
    const values = data.map(d => d[metric]);
    const minY = Math.min(...values);
    const maxY = Math.max(...values);
    const diffY = maxY - minY;
    
    // Add buffer scaling
    const bufferY = diffY * 0.15 || 5;
    const scaleMinY = Math.max(0, minY - bufferY);
    const scaleMaxY = maxY + bufferY;
    const scaleDiff = scaleMaxY - scaleMinY;
    
    const points = data.map((d, i) => {
      const x = padX + (i / (data.length - 1)) * graphWidth;
      const y = padYTop + graphHeight - ((d[metric] - scaleMinY) / scaleDiff) * graphHeight;
      return { x, y, value: d[metric], date: d.date };
    });
    
    const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
    const areaPath = `${linePath} L ${points[points.length - 1].x} ${height - padYBottom} L ${points[0].x} ${height - padYBottom} Z`;
    
    // Calculate 3 y-ticks
    const tickCount = 3;
    const yTicks = Array.from({ length: tickCount }, (_, idx) => {
      const val = scaleMinY + (idx / (tickCount - 1)) * scaleDiff;
      const y = padYTop + graphHeight - (idx / (tickCount - 1)) * graphHeight;
      return { val: Math.round(val), y };
    });
    
    return (
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} style={{ overflow: 'visible' }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={strokeColor} stopOpacity="0.25" />
            <stop offset="100%" stopColor={strokeColor} stopOpacity="0" />
          </linearGradient>
        </defs>
        
        {/* Horizontal grid lines */}
        {yTicks.map((tick, idx) => (
          <g key={idx}>
            <line 
              x1={padX} 
              y1={tick.y} 
              x2={width - 15} 
              y2={tick.y} 
              stroke="rgba(255,255,255,0.03)" 
              strokeWidth="1" 
            />
            <text 
              x={padX - 8} 
              y={tick.y + 4} 
              textAnchor="end" 
              fill="var(--text-muted)" 
              fontSize="10"
              fontFamily="monospace"
            >
              {tick.val}
            </text>
          </g>
        ))}
        
        {/* Fill Area */}
        <path d={areaPath} fill={`url(#${gradientId})`} />
        
        {/* Path Stroke */}
        <path d={linePath} fill="transparent" stroke={strokeColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        
        {/* Points & Values */}
        {points.map((p, idx) => {
          const displayDate = p.date.slice(5).replace('-', '/');
          return (
            <g key={idx}>
              {/* Date ticks on X-axis */}
              <text 
                x={p.x} 
                y={height - 12} 
                textAnchor="middle" 
                fill="var(--text-muted)" 
                fontSize="10"
                fontFamily="monospace"
              >
                {displayDate}
              </text>
              
              {/* Vertical dotted grid line from point to X axis */}
              <line 
                x1={p.x} 
                y1={p.y} 
                x2={p.x} 
                y2={height - padYBottom} 
                stroke="rgba(255, 255, 255, 0.05)" 
                strokeWidth="1" 
                strokeDasharray="2,2" 
              />
              
              {/* Point circle */}
              <circle cx={p.x} cy={p.y} r="5" fill="var(--bg-dark)" stroke={strokeColor} strokeWidth="2" />
              
              {/* Value Label text directly above circle */}
              <text 
                x={p.x} 
                y={p.y - 8} 
                textAnchor="middle" 
                fill="var(--text-primary)" 
                fontSize="10.5" 
                fontWeight="bold"
                fontFamily="monospace"
              >
                {p.value}
              </text>
            </g>
          );
        })}
      </svg>
    );
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

      {/* Tabs navigation */}
      <div style={{ display: 'flex', gap: '16px', borderBottom: '1px solid var(--border-light)', marginBottom: '24px' }}>
        <button 
          onClick={() => setActiveTab('workout')} 
          style={{
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'workout' ? '2px solid var(--accent-purple)' : '2px solid transparent',
            color: activeTab === 'workout' ? 'var(--text-primary)' : 'var(--text-muted)',
            padding: '8px 16px 12px 16px',
            cursor: 'pointer',
            fontWeight: 'bold',
            fontSize: '16px',
            transition: 'var(--transition)'
          }}
        >
          Daily Workout
        </button>
        <button 
          onClick={() => setActiveTab('analytics')} 
          style={{
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'analytics' ? '2px solid var(--accent-purple)' : '2px solid transparent',
            color: activeTab === 'analytics' ? 'var(--text-primary)' : 'var(--text-muted)',
            padding: '8px 16px 12px 16px',
            cursor: 'pointer',
            fontWeight: 'bold',
            fontSize: '16px',
            transition: 'var(--transition)'
          }}
        >
          Progress Analytics
        </button>
      </div>

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
      ) : activeTab === 'workout' ? (
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

              {/* Prompt Generator Card (Shown when custom prompt is toggled or when board is empty and generator is opened) */}
              {(showPromptGenerator || ((!log.exercises || log.exercises.length === 0) && showPromptGenerator)) && (
                <div className="card" style={{ marginBottom: '24px', border: '1px solid rgba(168, 85, 247, 0.2)', background: 'rgba(168, 85, 247, 0.02)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Sparkles size={20} className="text-purple animate-pulse" /> Ask AI Fitness Coach
                  </h3>
                  {log.exercises && log.exercises.length > 0 && (
                    <button 
                      onClick={() => setShowPromptGenerator(false)} 
                      style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                    >
                      <X size={18} />
                    </button>
                  )}
                </div>
                <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '16px', lineHeight: '1.5' }}>
                  Tell the AI Coach what you want to train, your equipment constraints, focus area, or physical discomfort.
                </p>
                <div className="form-group" style={{ marginBottom: '16px' }}>
                  <textarea
                    className="input-field"
                    style={{ minHeight: '80px', resize: 'vertical', display: 'block' }}
                    placeholder="e.g. Give me a 45 minute dumbbells-only push day workout, avoiding overhead shoulder presses due to shoulder pain."
                    value={promptText}
                    onChange={(e) => setPromptText(e.target.value)}
                  />
                </div>
                
                {/* Suggestions List */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '20px' }}>
                  {PROMPT_SUGGESTIONS.map((pill, idx) => (
                    <button
                      key={idx}
                      type="button"
                      className="btn btn-secondary"
                      style={{ 
                        fontSize: '12px', 
                        padding: '6px 12px', 
                        borderRadius: '20px', 
                        background: 'rgba(255,255,255,0.02)', 
                        borderColor: 'rgba(255,255,255,0.05)',
                        color: 'var(--text-secondary)'
                      }}
                      onClick={() => setPromptText(pill)}
                    >
                      {pill}
                    </button>
                  ))}
                </div>

                <button 
                  onClick={() => handleGenerateWorkout(promptText)} 
                  disabled={generating} 
                  className="btn btn-primary"
                  style={{ width: '100%', padding: '12px' }}
                >
                  <RefreshCw size={16} className={generating ? 'animate-spin' : ''} />
                  {generating ? 'AI Fitness Coach is designing your workout...' : 'Generate Workout Routine'}
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
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13.5px', backgroundColor: 'rgba(255, 255, 255, 0.03)', padding: '6px 12px', borderRadius: '6px', border: '1px solid var(--border-light)' }}>
                        <Activity size={15} className="text-purple" />
                        <span>Volume: <strong>{calculateTotalVolume()} kg</strong></span>
                      </div>
                      
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
                                    <th style={{ textAlign: 'left', padding: '6px 8px' }}>Weight (kg)</th>
                                    <th style={{ textAlign: 'left', padding: '6px 8px' }}>Reps</th>
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
                                          placeholder="0"
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
                                          placeholder="0"
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
                                        {exerciseHistory[ex.name.toLowerCase()].map((hist, histIdx) => (
                                          <div key={histIdx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', borderBottom: '1px solid rgba(255,255,255,0.02)', paddingBottom: '4px' }}>
                                            <span style={{ fontWeight: '600', color: 'var(--accent-purple)' }}>{hist.date}</span>
                                            <span style={{ color: 'var(--text-secondary)' }}>
                                              {hist.sets.map((s) => `${s.weight}kg x ${s.reps}${s.completed ? ' ✓' : ''}`).join(', ')}
                                            </span>
                                          </div>
                                        ))}
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
                    onChange={(e) => setCustomName(e.target.value)}
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
      ) ) : (
        /* Progress Analytics Dashboard View */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          
          {/* Top Row Grid: Completion and Achievements */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '24px' }}>
            
            {/* Completion Ring Card */}
            <div className="card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
              <h4 style={{ marginBottom: '16px', fontSize: '15px', color: 'var(--text-secondary)', fontWeight: 'bold' }}>Weekly Completion Rate</h4>
              {loadingSummary ? (
                <div style={{ height: '100px', display: 'flex', alignItems: 'center' }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Loading completion stats...</span>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                  <div style={{ position: 'relative', width: '100px', height: '100px' }}>
                    <svg width="100" height="100" viewBox="0 0 100 100">
                      <circle 
                        cx="50" 
                        cy="50" 
                        r="40" 
                        fill="transparent" 
                        stroke="rgba(255, 255, 255, 0.05)" 
                        strokeWidth="8" 
                      />
                      <circle 
                        cx="50" 
                        cy="50" 
                        r="40" 
                        fill="transparent" 
                        stroke="var(--accent-purple)" 
                        strokeWidth="8" 
                        strokeDasharray={2 * Math.PI * 40}
                        strokeDashoffset={2 * Math.PI * 40 - ((analyticsSummary?.completion?.completionRate || 0) / 100) * (2 * Math.PI * 40)}
                        strokeLinecap="round"
                        transform="rotate(-90 50 50)"
                      />
                    </svg>
                    <div style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100px',
                      height: '100px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '18px',
                      fontWeight: '800',
                      fontFamily: 'var(--font-display)',
                      color: 'var(--text-primary)'
                    }}>
                      {analyticsSummary?.completion?.completionRate || 0}%
                    </div>
                  </div>
                  <div style={{ textAlign: 'left', fontSize: '13px', color: 'var(--text-secondary)' }}>
                    <div style={{ marginBottom: '4px' }}>
                      Completed: <strong style={{ color: 'var(--accent-emerald)' }}>{analyticsSummary?.completion?.completedWorkouts || 0}</strong>
                    </div>
                    <div style={{ marginBottom: '4px' }}>
                      Skipped: <strong style={{ color: 'var(--accent-orange)' }}>{analyticsSummary?.completion?.skippedWorkouts || 0}</strong>
                    </div>
                    <div>
                      Total Logs: <strong>{analyticsSummary?.completion?.totalWorkouts || 0}</strong>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Achievements Milestones Card */}
            <div className="card" style={{ padding: '24px', display: 'flex', flexDirection: 'column' }}>
              <h4 style={{ marginBottom: '16px', fontSize: '15px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold' }}>
                <Sparkles size={16} className="text-purple" /> Progressive Milestones
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', overflowY: 'auto', maxHeight: '110px', paddingRight: '4px' }}>
                {analyticsSummary?.achievements && analyticsSummary.achievements.length > 0 ? (
                  analyticsSummary.achievements.map((ach, idx) => (
                    <div 
                      key={idx} 
                      style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '10px', 
                        padding: '10px 12px', 
                        borderRadius: '8px', 
                        background: 'rgba(168, 85, 247, 0.03)', 
                        border: '1px solid rgba(168, 85, 247, 0.08)' 
                      }}
                    >
                      <TrendingUp size={16} className="text-purple" style={{ flexShrink: 0 }} />
                      <span style={{ fontSize: '13px', color: 'var(--text-primary)', lineHeight: '1.4' }}>
                        {ach}
                      </span>
                    </div>
                  ))
                ) : (
                  <div style={{ color: 'var(--text-muted)', fontSize: '13px', fontStyle: 'italic', padding: '10px 0' }}>
                    No strength improvements recorded yet. Log weights over multiple sessions to unlock achievements.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Performance Progression Charts */}
          <div>
            <div className="form-group" style={{ maxWidth: '300px', marginBottom: '24px' }}>
              <label className="form-label">Analyze Exercise Progress</label>
              <select 
                className="input-field"
                value={selectedTrendExercise}
                onChange={(e) => setSelectedTrendExercise(e.target.value)}
              >
                <option value="">-- Choose Exercise --</option>
                {historyAnalytics.map(ex => (
                  <option key={ex.name} value={ex.name}>{ex.name}</option>
                ))}
              </select>
            </div>

            {selectedTrendExercise ? (() => {
              const exerciseData = historyAnalytics.find(h => h.name === selectedTrendExercise);
              const history = exerciseData?.history || [];
              
              if (history.length === 0) {
                return (
                  <p style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>
                    No completed sets history found for {selectedTrendExercise}.
                  </p>
                );
              }
              
              return (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                  {/* Strength Chart */}
                  <div className="card" style={{ padding: '20px' }}>
                    <h4 style={{ marginBottom: '16px', fontSize: '15px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold' }}>
                      <Trophy size={15} className="text-purple" /> Strength Curve (Max Weight)
                    </h4>
                    {renderCustomSvgChart(history, 'maxWeight', 'var(--accent-purple)', 'purple-grad')}
                  </div>
                  
                  {/* Volume Chart */}
                  <div className="card" style={{ padding: '20px' }}>
                    <h4 style={{ marginBottom: '16px', fontSize: '15px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold' }}>
                      <Activity size={15} className="text-cyan" /> Volume Curve (Total Weight Lifted)
                    </h4>
                    {renderCustomSvgChart(history, 'volume', 'var(--accent-cyan)', 'cyan-grad')}
                  </div>
                </div>
              );
            })() : (
              <div className="card" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                <Info size={32} style={{ margin: '0 auto 12px auto', opacity: 0.5 }} className="text-purple" />
                <p>Select an exercise from the dropdown above to plot strength and volume curves.</p>
              </div>
            )}
          </div>

          {/* Personal Records Grid */}
          <div>
            <h4 style={{ marginBottom: '16px', fontSize: '16px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold' }}>
              <Trophy size={16} className="text-purple" /> Personal Records (PRs)
            </h4>
            {analyticsSummary?.prs && Object.keys(analyticsSummary.prs).length > 0 ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '16px' }}>
                {Object.entries(analyticsSummary.prs).map(([exName, weight]) => (
                  <div key={exName} className="card" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(255, 255, 255, 0.015)' }}>
                    <div style={{ padding: '10px', borderRadius: '8px', background: 'rgba(168, 85, 247, 0.1)', color: 'var(--accent-purple)' }}>
                      <Trophy size={18} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '500' }}>{exName}</span>
                      <span style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--text-primary)' }}>{weight} kg</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ color: 'var(--text-muted)', fontSize: '13px', fontStyle: 'italic' }}>
                No personal records logged yet. Tick completed sets with weights to register milestones.
              </div>
            )}
          </div>
        </div>
      )}



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
                  onChange={(e) => setEditingExercise({ ...editingExercise, name: e.target.value })}
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
