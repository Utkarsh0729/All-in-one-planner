import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Clock, Calendar, Plus, Trash2, Sparkles, Brain, 
  LayoutGrid, BarChart2, CheckCircle2, AlertTriangle, Activity
} from 'lucide-react';

// Categories Configuration
const CATEGORIES = [
  { value: 'Study', label: 'Study', emoji: '📚', color: '#10b981' },
  { value: 'Work', label: 'Work', emoji: '💼', color: '#3b82f6' },
  { value: 'Fitness', label: 'Fitness', emoji: '🏋️', color: '#ec4899' },
  { value: 'Sleep', label: 'Sleep', emoji: '🛌', color: '#6366f1' },
  { value: 'Entertainment', label: 'Entertainment', emoji: '🎮', color: '#a855f7' },
  { value: 'Social Media', label: 'Social Media', emoji: '📱', color: '#ef4444' },
  { value: 'Leisure', label: 'Leisure', emoji: '🏖️', color: '#06b6d4' },
  { value: 'Other', label: 'Other', emoji: '⚙️', color: '#64748b' }
];

// Circular progress component for Focus & Productivity Scores
const CircularProgress = ({ value, color, label }) => {
  const radius = 30;
  const circumference = 2 * Math.PI * radius; // ~188.49
  const strokeDashoffset = circumference - (value / 100) * circumference;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
      <div style={{ position: 'relative', width: '70px', height: '70px' }}>
        <svg style={{ transform: 'rotate(-90deg)', width: '70px', height: '70px' }}>
          <circle 
            cx="35" cy="35" r={radius} 
            stroke="rgba(255,255,255,0.03)" strokeWidth="5" fill="transparent" 
          />
          <circle 
            cx="35" cy="35" r={radius} 
            stroke={color} strokeWidth="5" fill="transparent" 
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 0.8s ease-out' }}
          />
        </svg>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 'bold' }}>
          {value}%
        </div>
      </div>
      <span style={{ fontSize: '12.5px', color: 'var(--text-secondary)', fontWeight: '500', textAlign: 'center' }}>{label}</span>
    </div>
  );
};

// Custom SVG doughnut pie chart
const DoughnutChart = ({ productive, unproductive, sleep, untracked }) => {
  const sum = Math.max(1, productive + unproductive + sleep + untracked);
  const prodPct = (productive / sum) * 100;
  const unprodPct = (unproductive / sum) * 100;
  const sleepPct = (sleep / sum) * 100;
  const untrackedPct = (untracked / sum) * 100;

  const radius = 45;
  const circumference = 2 * Math.PI * radius; // ~282.74

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '24px', justifyContent: 'center', flexWrap: 'wrap' }}>
      <div style={{ position: 'relative', width: '110px', height: '110px' }}>
        <svg viewBox="0 0 110 110" style={{ transform: 'rotate(-90deg)', width: '110px', height: '110px' }}>
          <circle cx="55" cy="55" r={radius} stroke="rgba(255,255,255,0.02)" strokeWidth="10" fill="none" />
          
          {/* Productive Segment */}
          {prodPct > 0 && (
            <circle cx="55" cy="55" r={radius} stroke="#10b981" strokeWidth="10" fill="none" 
              strokeDasharray={circumference}
              strokeDashoffset={circumference - (prodPct / 100) * circumference}
              style={{ transformOrigin: 'center', transition: 'stroke-dashoffset 0.8s ease-out' }}
            />
          )}
          
          {/* Unproductive Segment */}
          {unprodPct > 0 && (
            <circle cx="55" cy="55" r={radius} stroke="#ef4444" strokeWidth="10" fill="none" 
              strokeDasharray={circumference}
              strokeDashoffset={circumference - (unprodPct / 100) * circumference}
              style={{ 
                transform: `rotate(${(prodPct / 100) * 360}deg)`,
                transformOrigin: 'center',
                transition: 'stroke-dashoffset 0.8s ease-out' 
              }}
            />
          )}

          {/* Sleep Segment */}
          {sleepPct > 0 && (
            <circle cx="55" cy="55" r={radius} stroke="#6366f1" strokeWidth="10" fill="none" 
              strokeDasharray={circumference}
              strokeDashoffset={circumference - (sleepPct / 100) * circumference}
              style={{ 
                transform: `rotate(${((prodPct + unprodPct) / 100) * 360}deg)`,
                transformOrigin: 'center',
                transition: 'stroke-dashoffset 0.8s ease-out' 
              }}
            />
          )}

          {/* Untracked Segment */}
          {untrackedPct > 0 && (
            <circle cx="55" cy="55" r={radius} stroke="#475569" strokeWidth="10" fill="none" 
              strokeDasharray={circumference}
              strokeDashoffset={circumference - (untrackedPct / 100) * circumference}
              style={{ 
                transform: `rotate(${((prodPct + unprodPct + sleepPct) / 100) * 360}deg)`,
                transformOrigin: 'center',
                transition: 'stroke-dashoffset 0.8s ease-out' 
              }}
            />
          )}
        </svg>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10b981' }} />
          <span style={{ color: 'var(--text-secondary)' }}>Productive:</span>
          <strong>{productive}h ({Math.round(prodPct)}%)</strong>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#ef4444' }} />
          <span style={{ color: 'var(--text-secondary)' }}>Unproductive:</span>
          <strong>{unproductive}h ({Math.round(unprodPct)}%)</strong>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#6366f1' }} />
          <span style={{ color: 'var(--text-secondary)' }}>Sleep:</span>
          <strong>{sleep}h ({Math.round(sleepPct)}%)</strong>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#475569' }} />
          <span style={{ color: 'var(--text-secondary)' }}>Untracked:</span>
          <strong>{untracked}h ({Math.round(untrackedPct)}%)</strong>
        </div>
      </div>
    </div>
  );
};

// Custom SVG stacked bar chart (representing the last 7 logged days)
const WeeklyBarChart = ({ dayStats }) => {
  const chartHeight = 130;
  const scale = chartHeight / 24; // ~5.4 px per hour
  const barWidth = 22;
  const startX = 45;

  return (
    <svg viewBox="0 0 440 200" style={{ width: '100%', height: '200px' }}>
      {/* Grid Lines */}
      {[6, 12, 18, 24].map(hours => {
        const y = 160 - hours * scale;
        return (
          <g key={hours}>
            <line x1={startX} y1={y} x2="420" y2={y} stroke="rgba(255,255,255,0.05)" strokeDasharray="3,3" />
            <text x={startX - 10} y={y + 4} fill="var(--text-muted)" fontSize="9" textAnchor="end">{hours}h</text>
          </g>
        );
      })}
      
      {/* Axis */}
      <line x1={startX} y1="160" x2="420" y2="160" stroke="rgba(255,255,255,0.1)" />

      {/* Bars */}
      {dayStats.map((day, idx) => {
        const x = startX + 15 + idx * ((420 - startX - 20) / Math.max(1, dayStats.length - 1 || 1)) - (barWidth / 2);
        
        const sleepHeight = day.sleep * scale;
        const sleepY = 160 - sleepHeight;

        const prodHeight = day.productive * scale;
        const prodY = sleepY - prodHeight;

        const unprodHeight = day.unproductive * scale;
        const unprodY = prodY - unprodHeight;

        const untrackedHeight = day.untracked * scale;
        const untrackedY = unprodY - untrackedHeight;

        const formattedDate = day.date ? day.date.substring(5) : ''; // MM-DD

        return (
          <g key={day.date || idx}>
            {sleepHeight > 0 && (
              <rect x={x} y={sleepY} width={barWidth} height={sleepHeight} fill="#6366f1" rx="2" />
            )}
            {prodHeight > 0 && (
              <rect x={x} y={prodY} width={barWidth} height={prodHeight} fill="#10b981" rx="2" />
            )}
            {unprodHeight > 0 && (
              <rect x={x} y={unprodY} width={barWidth} height={unprodHeight} fill="#ef4444" rx="2" />
            )}
            {untrackedHeight > 0 && (
              <rect x={x} y={untrackedY} width={barWidth} height={untrackedHeight} fill="#475569" rx="2" />
            )}

            <text x={x + barWidth / 2} y="178" fill="var(--text-secondary)" fontSize="9" textAnchor="middle">
              {formattedDate}
            </text>
          </g>
        );
      })}
    </svg>
  );
};

// Custom SVG trend line graph
const ProductiveTrendGraph = ({ dayStats }) => {
  if (dayStats.length === 0) return null;

  const chartHeight = 100;
  const chartWidth = 360;
  const startX = 45;
  const startY = 150;
  const maxY = 12; // 12 hours is max scale

  const points = dayStats.map((day, idx) => {
    const x = startX + idx * (chartWidth / Math.max(1, dayStats.length - 1 || 1));
    const val = Math.min(maxY, day.productive);
    const y = startY - (val / maxY) * chartHeight;
    return { x, y, val: day.productive, date: day.date };
  });

  let pathD = '';
  let areaD = '';

  if (points.length > 0) {
    pathD = `M ${points[0].x} ${points[0].y}`;
    points.forEach((p, idx) => {
      if (idx > 0) {
        pathD += ` L ${p.x} ${p.y}`;
      }
    });

    areaD = `${pathD} L ${points[points.length - 1].x} ${startY} L ${points[0].x} ${startY} Z`;
  }

  return (
    <svg viewBox="0 0 440 200" style={{ width: '100%', height: '200px' }}>
      <defs>
        <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
        </linearGradient>
      </defs>

      {/* Y Axis Grid Lines */}
      {[3, 6, 9, 12].map(hours => {
        const y = startY - (hours / maxY) * chartHeight;
        return (
          <g key={hours}>
            <line x1={startX} y1={y} x2={startX + chartWidth} y2={y} stroke="rgba(255,255,255,0.05)" strokeDasharray="3,3" />
            <text x={startX - 10} y={y + 4} fill="var(--text-muted)" fontSize="9" textAnchor="end">{hours}h</text>
          </g>
        );
      })}

      {/* Base Line */}
      <line x1={startX} y1={startY} x2={startX + chartWidth} y2={startY} stroke="rgba(255,255,255,0.1)" />

      {/* Area under the line */}
      {areaD && <path d={areaD} fill="url(#trendGradient)" />}

      {/* Trend Line */}
      {pathD && <path d={pathD} fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />}

      {/* Data Points */}
      {points.map((p, idx) => (
        <g key={idx}>
          <circle cx={p.x} cy={p.y} r="3.5" fill="#10b981" stroke="var(--bg-dark)" strokeWidth="1.5" />
          <text x={p.x} y="168" fill="var(--text-secondary)" fontSize="9" textAnchor="middle">
            {p.date ? p.date.substring(5) : ''}
          </text>
        </g>
      ))}
    </svg>
  );
};

// Custom category horizontal progress bar list
const CategoryDistribution = ({ dayStats }) => {
  const categoryTotals = {};
  CATEGORIES.forEach(c => { categoryTotals[c.value] = 0; });

  dayStats.forEach(day => {
    if (day.activities) {
      day.activities.forEach(act => {
        if (categoryTotals[act.category] !== undefined) {
          categoryTotals[act.category] += Number(act.duration) || 0;
        }
      });
    }
  });

  const maxHours = Math.max(...Object.values(categoryTotals), 1);

  const sortedCategories = CATEGORIES.map(c => ({
    ...c,
    hours: Number(categoryTotals[c.value].toFixed(1))
  })).sort((a, b) => b.hours - a.hours);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {sortedCategories.map(cat => (
        <div key={cat.value}>
          <div className="flex-between" style={{ fontSize: '13px', marginBottom: '3px' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <span>{cat.emoji}</span>
              <span style={{ color: 'var(--text-secondary)' }}>{cat.label}</span>
            </span>
            <strong>{cat.hours}h</strong>
          </div>
          <div style={{ width: '100%', height: '5px', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: '2px', overflow: 'hidden' }}>
            <div 
              style={{ 
                width: `${(cat.hours / maxHours) * 100}%`, 
                height: '100%', 
                backgroundColor: cat.color, 
                borderRadius: '2px',
                transition: 'width 0.6s ease-out' 
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
};

const RoutineAnalyser = () => {
  const { token, API_URL } = useAuth();
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Tab Navigation
  const [activeTab, setActiveTab] = useState('schedule'); // 'schedule' or 'analytics'

  // Saving States
  const [hasChanges, setHasChanges] = useState(false);
  const [saveStatus, setSaveStatus] = useState(''); // '', 'saving', 'saved', 'error'

  // AI Coaching & Weekly analytics States
  const [aiLoading, setAiLoading] = useState(false);
  const [aiData, setAiData] = useState(null);

  // New Activity Inputs
  const [name, setName] = useState('');
  const [duration, setDuration] = useState('');
  const [category, setCategory] = useState('Study');

  // Load daily activity logs
  useEffect(() => {
    let active = true;
    const fetchRoutine = async () => {
      setLoading(true);
      setError('');
      setSaveStatus('');
      try {
        const res = await fetch(`${API_URL}/routines/${date}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (active) {
          setActivities(data.activities || []);
          setHasChanges(false);
        }
      } catch (err) {
        console.error('Fetch error:', err);
        if (active) setError('Failed to fetch routine log.');
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchRoutine();
    return () => { active = false; };
  }, [date, API_URL, token]);

  // Load Weekly Insights & Historical Logs
  const fetchAiInsights = useCallback(async () => {
    setAiLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/routines/insights`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setAiData(data);
    } catch (err) {
      console.error('AI Insights fetch error:', err);
      setError('Failed to fetch routine consistency analysis.');
    } finally {
      setAiLoading(false);
    }
  }, [API_URL, token]);

  useEffect(() => {
    let active = true;
    if (activeTab === 'analytics') {
      const run = async () => {
        await Promise.resolve();
        if (active) {
          fetchAiInsights();
        }
      };
      run();
    }
    return () => {
      active = false;
    };
  }, [activeTab, fetchAiInsights]);

  // Debounced auto-saving on activities list modification
  useEffect(() => {
    if (!hasChanges) return;

    const delayDebounce = setTimeout(async () => {
      setSaveStatus('saving');
      try {
        const res = await fetch(`${API_URL}/routines/${date}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ activities })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message);
        
        setActivities(data.activities);
        setSaveStatus('saved');
        setHasChanges(false);
        setTimeout(() => setSaveStatus(''), 2000);
      } catch (err) {
        console.error('Save error:', err);
        setSaveStatus('error');
        setError('Auto-save failed.');
      }
    }, 1000);

    return () => clearTimeout(delayDebounce);
  }, [activities, hasChanges, date, API_URL, token]);

  // Add a new activity
  const handleAddActivity = (e) => {
    e.preventDefault();
    const actName = name.trim();
    const actDur = parseFloat(duration);

    if (!actName) return;
    if (isNaN(actDur) || actDur <= 0 || actDur > 24) {
      alert('Please enter a valid duration (0.1 to 24 hours)');
      return;
    }

    const newAct = {
      name: actName,
      duration: actDur,
      category
    };

    setActivities(prev => [...prev, newAct]);
    setHasChanges(true);
    
    // Clear inputs
    setName('');
    setDuration('');
  };

  // Remove an activity
  const handleRemoveActivity = (idxToRemove) => {
    setActivities(prev => prev.filter((_, idx) => idx !== idxToRemove));
    setHasChanges(true);
  };

  // Populate workday/weekend template logs
  const applyTemplate = (type) => {
    setHasChanges(true);
    if (type === 'workday') {
      setActivities([
        { name: 'Sleep', duration: 8, category: 'Sleep' },
        { name: 'Job / Work', duration: 8, category: 'Work' },
        { name: 'Study OS', duration: 2.5, category: 'Study' },
        { name: 'Instagram & Scrolling', duration: 1.5, category: 'Social Media' },
        { name: 'Meals & Commute', duration: 2.5, category: 'Leisure' },
        { name: 'Gym Workout', duration: 1.5, category: 'Fitness' }
      ]);
    } else if (type === 'weekend') {
      setActivities([
        { name: 'Sleep', duration: 9, category: 'Sleep' },
        { name: 'Fitness Gym', duration: 1.5, category: 'Fitness' },
        { name: 'Gaming / Leisure', duration: 6, category: 'Leisure' },
        { name: 'Self Study / Coding', duration: 3, category: 'Study' },
        { name: 'Social Media', duration: 2, category: 'Social Media' },
        { name: 'Meals & Tasks', duration: 2.5, category: 'Other' }
      ]);
    }
  };

  // Compute live stats for the current day
  const computeTodayStats = () => {
    let productive = 0;
    let unproductive = 0;
    let sleep = 0;
    let tracked = 0;

    activities.forEach(act => {
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

    const untracked = Math.max(0, 24 - tracked);

    return {
      productive: Number(productive.toFixed(1)),
      unproductive: Number(unproductive.toFixed(1)),
      sleep: Number(sleep.toFixed(1)),
      tracked: Number(tracked.toFixed(1)),
      untracked: Number(untracked.toFixed(1))
    };
  };

  const todayStats = computeTodayStats();

  return (
    <div className="main-content page-fade-in">
      {/* Header Panel */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Daily Activity Analyzer</h1>
          <p className="page-subtitle">Log activities, analyze productive focus, and optimize schedules</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Calendar size={18} className="text-orange" />
          <input 
            type="date" 
            className="input-field" 
            style={{ width: '160px', padding: '8px 12px' }}
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
      </div>

      {error && <div className="text-red" style={{ marginBottom: '15px' }}>{error}</div>}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
        <button 
          id="tab-schedule-btn"
          className={`btn ${activeTab === 'schedule' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('schedule')}
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <LayoutGrid size={16} /> Log Routine
        </button>
        <button 
          id="tab-analytics-btn"
          className={`btn ${activeTab === 'analytics' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('analytics')}
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <Brain size={16} /> Analytics & AI Coach
        </button>
      </div>

      {activeTab === 'schedule' ? (
        /* LOG ROUTINE TAB */
        <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: '32px' }}>
          
          {/* Left Column: Logging Activities List */}
          <div className="card">
            <div className="flex-between" style={{ marginBottom: '24px', borderBottom: '1px solid var(--border-light)', paddingBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '18px' }}>
                <Clock size={20} className="text-orange" /> Daily Activity Logger
              </h3>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                {saveStatus === 'saving' && <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>⌛ Auto-saving...</span>}
                {saveStatus === 'saved' && <span style={{ fontSize: '13px', color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 'bold' }}><CheckCircle2 size={13} /> Saved</span>}
                {saveStatus === 'error' && <span style={{ fontSize: '13px', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 'bold' }}><AlertTriangle size={13} /> Auto-save failed</span>}
                
                <button 
                  id="template-workday-btn"
                  className="btn btn-secondary"
                  onClick={() => applyTemplate('workday')}
                  style={{ fontSize: '12px', padding: '6px 12px' }}
                >
                  📅 Workday Template
                </button>
                <button 
                  id="template-weekend-btn"
                  className="btn btn-secondary"
                  onClick={() => applyTemplate('weekend')}
                  style={{ fontSize: '12px', padding: '6px 12px' }}
                >
                  🏖️ Weekend Template
                </button>
              </div>
            </div>

            {/* Over 24 Hour Warning Alert */}
            {todayStats.tracked > 24 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', backgroundColor: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '12px 16px', borderRadius: 'var(--radius)', marginBottom: '20px', color: 'var(--accent-red)', fontSize: '13.5px' }}>
                <AlertTriangle size={18} />
                <span><strong>Warning:</strong> Total logged time ({todayStats.tracked} hours) exceeds 24 hours. Please review durations.</span>
              </div>
            )}

            {/* Logged Activities List */}
            {loading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
                {[1, 2, 3].map((n) => (
                  <div key={n} className="skeleton" style={{ height: '54px', width: '100%', borderRadius: 'var(--radius)' }} />
                ))}
              </div>
            ) : activities.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
                {activities.map((act, idx) => {
                  const catConfig = CATEGORIES.find(c => c.value === act.category) || {};
                  return (
                    <div 
                      key={idx}
                      style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'space-between',
                        padding: '14px 16px',
                        backgroundColor: 'rgba(255,255,255,0.015)',
                        border: '1px solid rgba(255,255,255,0.04)',
                        borderRadius: 'var(--radius)',
                        borderLeft: `4px solid ${catConfig.color || '#64748b'}`
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ fontSize: '18px' }}>{catConfig.emoji}</span>
                        <div>
                          <strong style={{ fontSize: '15px' }}>{act.name}</strong>
                          <span style={{ marginLeft: '10px', fontSize: '11px', color: 'var(--text-secondary)', backgroundColor: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: '4px' }}>
                            {act.category}
                          </span>
                        </div>
                      </div>
                      
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <span style={{ fontWeight: '600', fontSize: '14.5px', color: 'var(--text-primary)' }}>{act.duration}h</span>
                        <button 
                          className="btn-danger"
                          onClick={() => handleRemoveActivity(idx)}
                          style={{ border: 'none', background: 'none', cursor: 'pointer', padding: '6px', borderRadius: '6px', color: 'var(--text-muted)' }}
                          title="Remove Activity"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ padding: '48px 0', textAlign: 'center', border: '1px dashed rgba(255,255,255,0.08)', borderRadius: 'var(--radius)', background: 'rgba(255,255,255,0.01)', marginBottom: '24px' }} className="card-hover-glow hover-scale">
                <Clock size={32} style={{ color: 'var(--text-muted)', marginBottom: '12px', display: 'inline-block' }} />
                <h4 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '4px' }}>Today is a Blank Canvas</h4>
                <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Your day is a blank canvas. Start tracking your activities.</p>
              </div>
            )}

            {/* Quick Add Form */}
            <form onSubmit={handleAddActivity} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: '12px', alignItems: 'end', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
              <div>
                <label className="form-label" style={{ fontSize: '12px', marginBottom: '6px' }}>Activity Name</label>
                <input 
                  type="text" 
                  placeholder="e.g. Study OS, YouTube, Gym"
                  className="input-field"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              
              <div>
                <label className="form-label" style={{ fontSize: '12px', marginBottom: '6px' }}>Duration (hrs)</label>
                <input 
                  type="number" 
                  step="0.1"
                  min="0.1"
                  max="24"
                  placeholder="e.g. 1.5"
                  className="input-field"
                  required
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                />
              </div>

              <div>
                <label className="form-label" style={{ fontSize: '12px', marginBottom: '6px' }}>Category</label>
                <select 
                  className="input-field"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  {CATEGORIES.map(c => (
                    <option key={c.value} value={c.value}>{c.emoji} {c.label}</option>
                  ))}
                </select>
              </div>

              <button type="submit" className="btn btn-primary" style={{ padding: '12px 16px' }}>
                <Plus size={16} /> Add Log
              </button>
            </form>
          </div>

          {/* Right Column: Live Statistics Widgets */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className="card">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '16px', marginBottom: '20px' }}>
                <Activity size={18} className="text-orange" /> Today's Statistics
              </h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* Productive Hours */}
                <div>
                  <div className="flex-between" style={{ marginBottom: '6px', fontSize: '13px' }}>
                    <span>💻 Productive focus</span>
                    <strong>{todayStats.productive}h</strong>
                  </div>
                  <div style={{ width: '100%', height: '6px', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ width: `${Math.min(100, (todayStats.productive / 24) * 100)}%`, height: '100%', backgroundColor: '#10b981', borderRadius: '3px' }} />
                  </div>
                </div>

                {/* Unproductive Hours */}
                <div>
                  <div className="flex-between" style={{ marginBottom: '6px', fontSize: '13px' }}>
                    <span>📱 Unproductive scrolling</span>
                    <strong>{todayStats.unproductive}h</strong>
                  </div>
                  <div style={{ width: '100%', height: '6px', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ width: `${Math.min(100, (todayStats.unproductive / 24) * 100)}%`, height: '100%', backgroundColor: '#ef4444', borderRadius: '3px' }} />
                  </div>
                </div>

                {/* Sleep Hours */}
                <div>
                  <div className="flex-between" style={{ marginBottom: '6px', fontSize: '13px' }}>
                    <span>🛌 Sleep</span>
                    <strong>{todayStats.sleep}h</strong>
                  </div>
                  <div style={{ width: '100%', height: '6px', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ width: `${Math.min(100, (todayStats.sleep / 24) * 100)}%`, height: '100%', backgroundColor: '#6366f1', borderRadius: '3px' }} />
                  </div>
                </div>

                {/* Total Tracked and Untracked Indicators */}
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: '16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div style={{ backgroundColor: 'rgba(255,255,255,0.015)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-light)' }}>
                    <div style={{ fontSize: '10.5px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Tracked</div>
                    <div style={{ fontSize: '20px', fontWeight: 'bold', marginTop: '4px', color: 'var(--text-primary)' }}>{todayStats.tracked}h</div>
                  </div>
                  <div style={{ 
                    backgroundColor: todayStats.untracked > 8 ? 'rgba(249, 115, 22, 0.05)' : 'rgba(255,255,255,0.015)', 
                    padding: '12px', 
                    borderRadius: '8px', 
                    border: `1px solid ${todayStats.untracked > 8 ? 'rgba(249, 115, 22, 0.15)' : 'var(--border-light)'}` 
                  }}>
                    <div style={{ fontSize: '10.5px', color: todayStats.untracked > 8 ? 'var(--accent-orange)' : 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Untracked</div>
                    <div style={{ fontSize: '20px', fontWeight: 'bold', marginTop: '4px', color: todayStats.untracked > 8 ? 'var(--accent-orange)' : 'var(--text-primary)' }}>{todayStats.untracked}h</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* ANALYTICS & AI Tab */
        <div style={{ display: 'grid', gridTemplateColumns: '7fr 5fr', gap: '32px' }}>
          
          {/* Left Column: Visualizations & Statistics */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
            {/* Top Row: Circular progress scores & Averages Badges */}
            <div className="card" style={{ display: 'flex', flexWrap: 'wrap', gap: '32px', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', gap: '32px' }}>
                <CircularProgress 
                  value={aiData && aiData.stats ? aiData.stats.weeklyProductivityScore : 0} 
                  color="#10b981" 
                  label="Weekly Productivity" 
                />
                <CircularProgress 
                  value={aiData && aiData.stats ? aiData.stats.focusScore : 0} 
                  color="#3b82f6" 
                  label="Focus Rating" 
                />
              </div>

              {/* Weekly details badges */}
              <div style={{ flex: 1, minWidth: '220px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div style={{ backgroundColor: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-light)', padding: '12px', borderRadius: '8px' }}>
                  <div style={{ fontSize: '10px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Avg Productive</div>
                  <div style={{ fontSize: '16px', fontWeight: 'bold', marginTop: '3px' }}>
                    {aiData && aiData.stats ? aiData.stats.averageProductive : 0}h/day
                  </div>
                </div>
                <div style={{ backgroundColor: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-light)', padding: '12px', borderRadius: '8px' }}>
                  <div style={{ fontSize: '10px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Workouts Logged</div>
                  <div style={{ fontSize: '16px', fontWeight: 'bold', marginTop: '3px' }}>
                    {aiData && aiData.stats ? aiData.stats.exerciseCount : 0} sessions
                  </div>
                </div>
                <div style={{ backgroundColor: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-light)', padding: '12px', borderRadius: '8px' }}>
                  <div style={{ fontSize: '10px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Most Productive</div>
                  <div style={{ fontSize: '13.5px', fontWeight: 'bold', marginTop: '3px', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                    {aiData && aiData.stats && aiData.stats.mostProductiveDay ? aiData.stats.mostProductiveDay.date.substring(5) : 'N/A'} ({aiData && aiData.stats && aiData.stats.mostProductiveDay ? aiData.stats.mostProductiveDay.hours : 0}h)
                  </div>
                </div>
                <div style={{ backgroundColor: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-light)', padding: '12px', borderRadius: '8px' }}>
                  <div style={{ fontSize: '10px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Least Productive</div>
                  <div style={{ fontSize: '13.5px', fontWeight: 'bold', marginTop: '3px', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                    {aiData && aiData.stats && aiData.stats.leastProductiveDay ? aiData.stats.leastProductiveDay.date.substring(5) : 'N/A'} ({aiData && aiData.stats && aiData.stats.leastProductiveDay ? aiData.stats.leastProductiveDay.hours : 0}h)
                  </div>
                </div>
              </div>
            </div>

            {/* Graphs Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
              
              {/* Productive Allocation Pie */}
              <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <h3 style={{ fontSize: '15px', fontWeight: '600', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}><BarChart2 size={16} className="text-orange" /> Productivity Allocation</h3>
                {aiData && aiData.stats ? (
                  <DoughnutChart 
                    productive={aiData.stats.averageProductive} 
                    unproductive={aiData.stats.averageUnproductive}
                    sleep={aiData.stats.averageSleep}
                    untracked={aiData.stats.averageUntracked}
                  />
                ) : (
                  <p style={{ color: 'var(--text-secondary)' }}>No stats to draw doughnut allocation</p>
                )}
              </div>

              {/* Weekly stacked Bar Chart */}
              <div className="card">
                <h3 style={{ fontSize: '15px', fontWeight: '600', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}><Clock size={16} className="text-orange" /> Weekly Time Use</h3>
                {aiData && aiData.currentDayStats ? (
                  <WeeklyBarChart dayStats={aiData.currentDayStats} />
                ) : (
                  <p style={{ color: 'var(--text-secondary)' }}>No stats to draw weekly charts</p>
                )}
              </div>

              {/* Productive Trend Graph */}
              <div className="card">
                <h3 style={{ fontSize: '15px', fontWeight: '600', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}><Activity size={16} className="text-orange" /> Productive Hours Trend</h3>
                {aiData && aiData.currentDayStats ? (
                  <ProductiveTrendGraph dayStats={aiData.currentDayStats} />
                ) : (
                  <p style={{ color: 'var(--text-secondary)' }}>No stats to draw trends</p>
                )}
              </div>

              {/* Categories distribution horizontal progress lists */}
              <div className="card">
                <h3 style={{ fontSize: '15px', fontWeight: '600', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}><LayoutGrid size={16} className="text-orange" /> Category Distribution</h3>
                {aiData && aiData.currentDayStats ? (
                  <CategoryDistribution dayStats={aiData.currentDayStats} />
                ) : (
                  <p style={{ color: 'var(--text-secondary)' }}>No category totals</p>
                )}
              </div>

            </div>
          </div>

          {/* Right Column: AI Coach weekly reports */}
          <div>
            <div className="card" style={{ minHeight: '520px', display: 'flex', flexDirection: 'column' }}>
              <div className="flex-between" style={{ marginBottom: '20px', borderBottom: '1px solid var(--border-light)', paddingBottom: '12px' }}>
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '16px' }}>
                  <Sparkles size={18} className="text-orange" /> AI Routine Coach Insights
                </h3>
                <button 
                  id="refresh-ai-insights-btn"
                  className="btn btn-secondary" 
                  onClick={fetchAiInsights} 
                  disabled={aiLoading}
                  style={{ padding: '6px 12px', fontSize: '12px' }}
                >
                  {aiLoading ? 'Analyzing...' : 'Refresh'}
                </button>
              </div>

              {aiLoading ? (
                <div style={{ textAlign: 'center', padding: '100px 0', flex: 1 }}>
                  <Brain size={42} className="text-orange animate-pulse" style={{ marginBottom: '16px', display: 'inline-block' }} />
                  <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>AI Routine Coach is reviewing your weekly logging logs...</p>
                </div>
              ) : aiData && aiData.hasData ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', flex: 1 }}>
                  {/* Weekly Averages banner */}
                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: '1fr 1fr 1fr', 
                    gap: '10px', 
                    textAlign: 'center'
                  }}>
                    <div style={{ backgroundColor: 'rgba(99, 102, 241, 0.05)', padding: '10px', borderRadius: '8px', border: '1px solid rgba(99, 102, 241, 0.1)' }}>
                      <div style={{ fontSize: '9px', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 'bold' }}>Sleep Avg</div>
                      <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#6366f1', marginTop: '2px' }}>
                        {aiData.stats ? aiData.stats.averageSleep : 0}h/day
                      </div>
                    </div>
                    <div style={{ backgroundColor: 'rgba(16, 185, 129, 0.05)', padding: '10px', borderRadius: '8px', border: '1px solid rgba(16, 185, 129, 0.1)' }}>
                      <div style={{ fontSize: '9px', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 'bold' }}>Focus Avg</div>
                      <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#10b981', marginTop: '2px' }}>
                        {aiData.stats ? aiData.stats.averageProductive : 0}h/day
                      </div>
                    </div>
                    <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.05)', padding: '10px', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.1)' }}>
                      <div style={{ fontSize: '9px', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 'bold' }}>Scrolling Avg</div>
                      <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#ef4444', marginTop: '2px' }}>
                        {aiData.stats ? aiData.stats.averageUnproductive : 0}h/day
                      </div>
                    </div>
                  </div>

                  {/* AI Coach Insights Report */}
                  <div 
                    style={{ 
                      backgroundColor: 'rgba(0,0,0,0.15)', 
                      border: '1px solid var(--border-light)', 
                      padding: '16px', 
                      borderRadius: '8px', 
                      fontSize: '13.5px', 
                      lineHeight: '1.65',
                      color: 'var(--text-primary)',
                      whiteSpace: 'pre-wrap',
                      maxHeight: '400px',
                      overflowY: 'auto',
                      flex: 1
                    }}
                  >
                    {aiData.aiFeedback}
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '100px 0', color: 'var(--text-secondary)', flex: 1 }}>
                  <p style={{ fontSize: '14px' }}>{aiData ? aiData.message : 'No routine feedback available yet.'}</p>
                </div>
              )}
            </div>
          </div>

        </div>
      )}
    </div>
  );
};

export default RoutineAnalyser;
