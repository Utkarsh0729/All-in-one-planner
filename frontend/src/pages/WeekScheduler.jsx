import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Calendar, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  ChevronLeft, 
  ChevronRight, 
  ChevronDown,
  Edit2,  
  Check, 
  X,
  Flame,
  Apple,
  Target,
  Award,
  Sparkles,
  Zap,
  TrendingUp
} from 'lucide-react';

const ProgressRing = ({ percentage, size = 110, strokeWidth = 10, color = 'var(--accent-emerald)', label }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (Math.min(100, Math.max(0, percentage)) / 100) * circumference;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
      <div style={{ position: 'relative', width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
          {/* Background circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke="rgba(255, 255, 255, 0.05)"
            strokeWidth={strokeWidth}
          />
          {/* Progress circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 0.35s' }}
          />
        </svg>
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'var(--font-display)',
          fontWeight: '700',
          fontSize: '18px',
          color: 'var(--text-primary)'
        }}>
          {percentage}%
        </div>
      </div>
      <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '600', textAlign: 'center' }}>
        {label}
      </span>
    </div>
  );
};

const WeekScheduler = () => {
  const { token, API_URL } = useAuth();
  
  // Helper to calculate the start of the week (Monday) in YYYY-MM-DD
  const getMonday = (d) => {
    const date = new Date(d);
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
    return new Date(date.setDate(diff));
  };

  const [currentWeekMonday, setCurrentWeekMonday] = useState(getMonday(new Date()));
  const [goals, setGoals] = useState([]);
  
  // Tab control state
  const [activeTab, setActiveTab] = useState('goals');

  // Form state
  const [goalTitle, setGoalTitle] = useState('');
  const [subtasksText, setSubtasksText] = useState(''); // comma-separated tasks
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Edit & Add Sub-goal state
  const [editingGoalId, setEditingGoalId] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [addingSubtaskGoalId, setAddingSubtaskGoalId] = useState(null);
  const [newSubtaskText, setNewSubtaskText] = useState('');
  const [collapsedGoals, setCollapsedGoals] = useState({});
  const [editingSubtask, setEditingSubtask] = useState({ goalId: null, subtaskId: null, text: '' });

  // Analytics data state
  const [analyticsData, setAnalyticsData] = useState({
    goalCompletionPct: 0,
    weeklyConsistency: 0,
    missedTasks: 0,
    averageCompletionRate: 0,
    streaks: {
      workoutStreak: 0,
      healthyEatingStreak: 0,
      productivityStreak: 0,
      goalCompletionStreak: 0
    },
    badges: [],
    insights: []
  });
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);

  const weekStartStr = currentWeekMonday.toISOString().split('T')[0];

  const fetchGoals = useCallback(async () => {
    // Defer state updates to avoid react-hooks/set-state-in-effect
    setTimeout(() => {
      setLoading(true);
      setError('');
    }, 0);
    try {
      const res = await fetch(`${API_URL}/week-goals/${weekStartStr}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setGoals(data);
    } catch (err) {
      console.error('Failed to fetch goals:', err);
      setError('Failed to fetch weekly goals.');
    } finally {
      setLoading(false);
    }
  }, [weekStartStr, token, API_URL]);

  const fetchAnalytics = useCallback(async () => {
    // Defer state updates to avoid react-hooks/set-state-in-effect
    setTimeout(() => {
      setLoadingAnalytics(true);
    }, 0);
    try {
      const res = await fetch(`${API_URL}/week-goals/analytics/summary`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setAnalyticsData(data);
      }
    } catch (err) {
      console.error('Failed to fetch goal analytics summary:', err);
    } finally {
      setLoadingAnalytics(false);
    }
  }, [token, API_URL]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchGoals();
      fetchAnalytics();
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchGoals, fetchAnalytics]);

  const handleCreateGoal = async (e) => {
    e.preventDefault();
    if (!goalTitle) return;

    setError('');
    const parsedSubtasks = subtasksText
      ? subtasksText.split(',').map(t => ({ text: t.trim(), checked: false })).filter(t => t.text)
      : [];

    try {
      const res = await fetch(`${API_URL}/week-goals`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          weekStart: weekStartStr,
          title: goalTitle,
          subtasks: parsedSubtasks
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      setGoals(prev => [...prev, data]);
      setGoalTitle('');
      setSubtasksText('');
      fetchAnalytics();
    } catch (err) {
      console.error(err);
      setError(err.message);
    }
  };

  const toggleGoalCollapse = (goalId) => {
    setCollapsedGoals(prev => ({
      ...prev,
      [goalId]: !prev[goalId]
    }));
  };

  const handleStartSubtaskEdit = (goalId, subtask) => {
    setEditingSubtask({
      goalId,
      subtaskId: subtask._id,
      text: subtask.text
    });
  };

  const handleSaveSubtaskEdit = async (goalId, subtaskId) => {
    if (!editingSubtask.text.trim()) return;
    setError('');
    const goal = goals.find(g => g._id === goalId);
    if (!goal) return;

    const updatedSubtasks = goal.subtasks.map(s => {
      if (s._id === subtaskId) {
        return { ...s, text: editingSubtask.text.trim() };
      }
      return s;
    });

    try {
      const res = await fetch(`${API_URL}/week-goals/${goalId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ subtasks: updatedSubtasks })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setGoals(prev => prev.map(g => g._id === goalId ? data : g));
      setEditingSubtask({ goalId: null, subtaskId: null, text: '' });
      fetchAnalytics();
    } catch (err) {
      console.error('Failed to edit sub-goal:', err);
      setError(err.message || 'Failed to edit sub-goal.');
    }
  };

  const handleDeleteSubtask = async (goalId, subtaskId) => {
    setError('');
    const goal = goals.find(g => g._id === goalId);
    if (!goal) return;

    const updatedSubtasks = goal.subtasks.filter(s => s._id !== subtaskId);

    try {
      const res = await fetch(`${API_URL}/week-goals/${goalId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ subtasks: updatedSubtasks })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setGoals(prev => prev.map(g => g._id === goalId ? data : g));
      fetchAnalytics();
    } catch (err) {
      console.error('Failed to delete sub-goal:', err);
      setError('Failed to delete sub-goal.');
    }
  };

  const handleToggleSubtask = async (goalId, subtaskId) => {
    const goal = goals.find(g => g._id === goalId);
    if (!goal) return;

    const previousGoals = [...goals];

    const updatedSubtasks = goal.subtasks.map(s => {
      if (s._id === subtaskId) {
        return { ...s, checked: !s.checked };
      }
      return s;
    });

    const checkedCount = updatedSubtasks.filter(s => s.checked).length;
    const progress = updatedSubtasks.length > 0 ? Math.round((checkedCount / updatedSubtasks.length) * 100) : 0;
    const completed = updatedSubtasks.length > 0 && checkedCount === updatedSubtasks.length;

    setGoals(prev => prev.map(g => g._id === goalId ? { ...g, subtasks: updatedSubtasks, progress, completed } : g));

    try {
      const res = await fetch(`${API_URL}/week-goals/${goalId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ subtasks: updatedSubtasks })
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      setGoals(prev => prev.map(g => g._id === goalId ? data : g));
      fetchAnalytics();
    } catch (err) {
      console.error('Failed to update subtask:', err);
      setError('Failed to update subtask. Reverting changes...');
      setGoals(previousGoals);
    }
  };

  const handleToggleGoalOnly = async (goalId) => {
    const goal = goals.find(g => g._id === goalId);
    if (!goal) return;

    const previousGoals = [...goals];
    const newCompleted = !goal.completed;
    const newProgress = newCompleted ? 100 : 0;

    setGoals(prev => prev.map(g => g._id === goalId ? { ...g, completed: newCompleted, progress: newProgress } : g));

    try {
      const res = await fetch(`${API_URL}/week-goals/${goalId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ completed: newCompleted })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      setGoals(prev => prev.map(g => g._id === goalId ? data : g));
      fetchAnalytics();
    } catch (err) {
      console.error('Failed to toggle goal status:', err);
      setError('Failed to update goal. Reverting changes...');
      setGoals(previousGoals);
    }
  };

  const handleDeleteGoal = async (goalId) => {
    try {
      const res = await fetch(`${API_URL}/week-goals/${goalId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error();

      setGoals(prev => prev.filter(g => g._id !== goalId));
      fetchAnalytics();
    } catch (err) {
      console.error('Failed to delete goal:', err);
      setError('Failed to delete goal.');
    }
  };

  const handleStartEdit = (goal) => {
    setEditingGoalId(goal._id);
    setEditTitle(goal.title);
  };

  const handleSaveEdit = async (goalId) => {
    if (!editTitle.trim()) return;
    setError('');
    try {
      const res = await fetch(`${API_URL}/week-goals/${goalId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ title: editTitle.trim() })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setGoals(prev => prev.map(g => g._id === goalId ? data : g));
      setEditingGoalId(null);
      fetchAnalytics();
    } catch (err) {
      console.error('Failed to save edit:', err);
      setError(err.message || 'Failed to update goal title.');
    }
  };

  const handleAddSubtask = async (goalId) => {
    if (!newSubtaskText.trim()) return;
    setError('');
    const goal = goals.find(g => g._id === goalId);
    if (!goal) return;

    const updatedSubtasks = [
      ...goal.subtasks,
      { text: newSubtaskText.trim(), checked: false }
    ];

    try {
      const res = await fetch(`${API_URL}/week-goals/${goalId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ subtasks: updatedSubtasks })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setGoals(prev => prev.map(g => g._id === goalId ? data : g));
      setAddingSubtaskGoalId(null);
      setNewSubtaskText('');
      fetchAnalytics();
    } catch (err) {
      console.error('Failed to add subtask:', err);
      setError(err.message || 'Failed to add sub-goal.');
    }
  };

  const changeWeek = (direction) => {
    const newMonday = new Date(currentWeekMonday);
    newMonday.setDate(newMonday.getDate() + direction * 7);
    setCurrentWeekMonday(newMonday);
  };

  const formatDateRange = () => {
    const start = new Date(currentWeekMonday);
    const end = new Date(currentWeekMonday);
    end.setDate(end.getDate() + 6);
    return `${start.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`;
  };

  return (
    <div className="main-content page-fade-in">
      {/* Header section */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Weekly Planner</h1>
          <p className="page-subtitle">Track goals, organize checklists, view analytics, and build streaks</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <button className="btn btn-secondary" onClick={() => changeWeek(-1)} style={{ padding: '8px' }}>
            <ChevronLeft size={18} />
          </button>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: '700', fontSize: '15px' }}>
            {formatDateRange()}
          </span>
          <button className="btn btn-secondary" onClick={() => changeWeek(1)} style={{ padding: '8px' }}>
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {error && <div className="text-red" style={{ marginBottom: '15px' }}>{error}</div>}

      {/* Tabs Menu */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border-light)', marginBottom: '24px', gap: '10px' }}>
        <button 
          className={`tab-btn ${activeTab === 'goals' ? 'active' : ''}`}
          onClick={() => setActiveTab('goals')}
          style={{
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'goals' ? '2px solid var(--accent-emerald)' : '2px solid transparent',
            padding: '12px 20px',
            color: activeTab === 'goals' ? 'var(--text-primary)' : 'var(--text-secondary)',
            fontWeight: '600',
            cursor: 'pointer',
            fontSize: '14.5px',
            transition: 'var(--transition)'
          }}
        >
          Goals & Checklist
        </button>
        <button 
          className={`tab-btn ${activeTab === 'analytics' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('analytics');
            fetchAnalytics();
          }}
          style={{
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'analytics' ? '2px solid var(--accent-emerald)' : '2px solid transparent',
            padding: '12px 20px',
            color: activeTab === 'analytics' ? 'var(--text-primary)' : 'var(--text-secondary)',
            fontWeight: '600',
            cursor: 'pointer',
            fontSize: '14.5px',
            transition: 'var(--transition)'
          }}
        >
          Analytics & Milestones
        </button>
      </div>

      {/* Tab contents */}
      {activeTab === 'goals' ? (
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '32px' }}>
          {/* Left Column: Weekly Goals List */}
          <div>
            <div className="card">
              <h3 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Calendar size={22} className="text-emerald" /> Goals for the Week
              </h3>

              {loading ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {[1, 2, 3].map((n) => (
                    <div key={n} className="skeleton" style={{ height: '100px', width: '100%', borderRadius: 'var(--radius)' }} />
                  ))}
                </div>
              ) : goals.length > 0 ? (
                <div className="week-goals-list">
                  {goals.map((goal) => (
                    <div key={goal._id} className="week-goal-card" style={{ marginBottom: '16px' }}>
                      <div className="week-goal-header" style={{ minHeight: '42px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        {editingGoalId === goal._id ? (
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', width: '100%', marginRight: '16px' }}>
                            <input
                              type="text"
                              className="input-field"
                              style={{ margin: 0, padding: '4px 8px', fontSize: '14px', flex: 1 }}
                              value={editTitle}
                              onChange={(e) => setEditTitle(e.target.value)}
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveEdit(goal._id);
                                if (e.key === 'Escape') setEditingGoalId(null);
                              }}
                            />
                            <button
                              type="button"
                              className="btn btn-primary"
                              onClick={() => handleSaveEdit(goal._id)}
                              style={{ padding: '6px' }}
                            >
                              <Check size={16} />
                            </button>
                            <button
                              type="button"
                              className="btn btn-secondary"
                              onClick={() => setEditingGoalId(null)}
                              style={{ padding: '6px' }}
                            >
                              <X size={16} />
                            </button>
                          </div>
                        ) : (
                          <>
                            <div 
                              style={{ 
                                display: 'flex', 
                                alignItems: 'flex-start', 
                                gap: '8px', 
                                flex: 1, 
                                cursor: goal.subtasks.length > 0 ? 'pointer' : 'default' 
                              }}
                              onClick={() => goal.subtasks.length > 0 && toggleGoalCollapse(goal._id)}
                            >
                              {goal.subtasks.length > 0 && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleGoalCollapse(goal._id);
                                  }}
                                  style={{
                                    border: 'none',
                                    background: 'none',
                                    cursor: 'pointer',
                                    padding: '4px',
                                    color: 'var(--text-secondary)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    marginTop: '2px',
                                    transition: 'transform 0.2s ease',
                                    transform: collapsedGoals[goal._id] ? 'rotate(-90deg)' : 'rotate(0deg)',
                                  }}
                                  title={collapsedGoals[goal._id] ? "Expand sub-goals" : "Collapse sub-goals"}
                                >
                                  <ChevronDown size={18} />
                                </button>
                              )}
                              <div style={{ flex: 1 }}>
                                <h4 style={{ fontSize: '17px', textDecoration: goal.completed ? 'line-through' : 'none' }}>
                                  {goal.title}
                                </h4>
                                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                                  Progress: {goal.progress}% Completed
                                </span>
                              </div>
                            </div>
                            <div className="gap-10" style={{ display: 'flex', alignItems: 'center' }}>
                              {goal.subtasks.length === 0 && (
                                <button 
                                  className={`btn ${goal.completed ? 'btn-primary' : 'btn-secondary'}`}
                                  onClick={() => handleToggleGoalOnly(goal._id)}
                                  style={{ fontSize: '12px', padding: '6px 12px' }}
                                >
                                  {goal.completed ? 'Done' : 'Mark Done'}
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => handleStartEdit(goal)}
                                style={{ border: 'none', background: 'none', cursor: 'pointer', padding: '6px', color: 'var(--text-secondary)' }}
                                title="Edit goal title"
                              >
                                <Edit2 size={16} />
                              </button>
                              <button 
                                className="btn-danger"
                                onClick={() => handleDeleteGoal(goal._id)}
                                style={{ border: 'none', background: 'none', cursor: 'pointer', padding: '6px' }}
                                title="Delete goal"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </>
                        )}
                      </div>

                      {/* Progress Bar */}
                      <div className="progress-bar-bg" style={{ margin: '12px 0 16px 0' }}>
                        <div 
                          className="progress-bar-fill"
                          style={{ 
                            width: `${goal.progress}%`,
                            background: 'var(--accent-emerald)'
                          }}
                        />
                      </div>

                      {/* Subtasks List */}
                      {(goal.subtasks.length > 0 || addingSubtaskGoalId === goal._id) ? (
                        <div style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '8px',
                          background: 'rgba(255,255,255,0.01)',
                          borderRadius: '8px',
                          border: '1px solid var(--border-light)',
                          overflow: 'hidden',
                          transition: 'max-height 0.3s cubic-bezier(0.4, 0, 0.2, 1), padding 0.3s ease, margin 0.3s ease, opacity 0.3s ease',
                          maxHeight: (goal.subtasks.length > 0 && !collapsedGoals[goal._id]) || addingSubtaskGoalId === goal._id ? '1000px' : '0px',
                          padding: (goal.subtasks.length > 0 && !collapsedGoals[goal._id]) || addingSubtaskGoalId === goal._id ? '12px' : '0px 12px',
                          marginTop: (goal.subtasks.length > 0 && !collapsedGoals[goal._id]) || addingSubtaskGoalId === goal._id ? '12px' : '0px',
                          opacity: (goal.subtasks.length > 0 && !collapsedGoals[goal._id]) || addingSubtaskGoalId === goal._id ? 1 : 0,
                          pointerEvents: (goal.subtasks.length > 0 && !collapsedGoals[goal._id]) || addingSubtaskGoalId === goal._id ? 'auto' : 'none'
                        }}>
                          {goal.subtasks.map((sub) => {
                            const isEditingThisSub = editingSubtask && editingSubtask.goalId === goal._id && editingSubtask.subtaskId === sub._id;
                            
                            return (
                              <div 
                                key={sub._id} 
                                className="subgoal-item"
                              >
                                {isEditingThisSub ? (
                                  <div 
                                    style={{ display: 'flex', gap: '8px', alignItems: 'center', flex: 1 }}
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <input 
                                      type="text" 
                                      className="input-field" 
                                      style={{ margin: 0, padding: '4px 8px', fontSize: '13px', flex: 1 }}
                                      value={editingSubtask.text}
                                      onChange={(e) => setEditingSubtask(prev => ({ ...prev, text: e.target.value }))}
                                      autoFocus
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleSaveSubtaskEdit(goal._id, sub._id);
                                        if (e.key === 'Escape') setEditingSubtask({ goalId: null, subtaskId: null, text: '' });
                                      }}
                                    />
                                    <button 
                                      type="button" 
                                      className="btn btn-primary"
                                      onClick={() => handleSaveSubtaskEdit(goal._id, sub._id)}
                                      style={{ padding: '6px' }}
                                    >
                                      <Check size={14} />
                                    </button>
                                    <button 
                                      type="button" 
                                      className="btn btn-secondary"
                                      onClick={() => setEditingSubtask({ goalId: null, subtaskId: null, text: '' })}
                                      style={{ padding: '6px' }}
                                    >
                                      <X size={14} />
                                    </button>
                                  </div>
                                ) : (
                                  <>
                                    <div 
                                      className="subgoal-item-left"
                                      onClick={() => handleToggleSubtask(goal._id, sub._id)}
                                    >
                                      <div className={`checkbox-custom ${sub.checked ? 'checked' : ''}`} style={{ width: '18px', height: '18px', borderRadius: '4px' }}>
                                        {sub.checked && <CheckCircle2 size={12} />}
                                      </div>
                                      <span style={{ 
                                        color: sub.checked ? 'var(--text-muted)' : 'var(--text-primary)', 
                                        textDecoration: sub.checked ? 'line-through' : 'none',
                                        wordBreak: 'break-all'
                                      }}>
                                        {sub.text}
                                      </span>
                                    </div>
                                    
                                    <div className="subgoal-actions" onClick={(e) => e.stopPropagation()}>
                                      <button
                                        type="button"
                                        className="subgoal-action-btn"
                                        onClick={() => handleStartSubtaskEdit(goal._id, sub)}
                                        title="Edit sub-goal"
                                      >
                                        <Edit2 size={13} />
                                      </button>
                                      <button
                                        type="button"
                                        className="subgoal-action-btn delete"
                                        onClick={() => handleDeleteSubtask(goal._id, sub._id)}
                                        title="Delete sub-goal"
                                      >
                                        <Trash2 size={13} />
                                      </button>
                                    </div>
                                  </>
                                )}
                              </div>
                            );
                          })}

                          {addingSubtaskGoalId === goal._id ? (
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: goal.subtasks.length > 0 ? '8px' : '0' }}>
                              <input 
                                type="text" 
                                placeholder="Type new sub-goal..."
                                className="input-field" 
                                style={{ margin: 0, padding: '4px 8px', fontSize: '13px', flex: 1 }}
                                value={newSubtaskText}
                                onChange={(e) => setNewSubtaskText(e.target.value)}
                                autoFocus
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleAddSubtask(goal._id);
                                  if (e.key === 'Escape') {
                                    setAddingSubtaskGoalId(null);
                                    setNewSubtaskText('');
                                  }
                                }}
                              />
                              <button 
                                type="button" 
                                className="btn btn-primary"
                                onClick={() => handleAddSubtask(goal._id)}
                                style={{ padding: '6px 12px', fontSize: '12px' }}
                              >
                                Add
                              </button>
                              <button 
                                type="button" 
                                className="btn btn-secondary"
                                onClick={() => {
                                  setAddingSubtaskGoalId(null);
                                  setNewSubtaskText('');
                                }}
                                style={{ padding: '6px 12px', fontSize: '12px' }}
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setCollapsedGoals(prev => ({ ...prev, [goal._id]: false }));
                                setAddingSubtaskGoalId(goal._id);
                              }}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                background: 'none',
                                border: 'none',
                                color: 'var(--accent-cyan)',
                                cursor: 'pointer',
                                fontSize: '13.5px',
                                padding: '4px 0',
                                marginTop: '6px',
                                width: 'fit-content',
                                transition: 'var(--transition)'
                              }}
                              className="hover-opacity"
                            >
                              <Plus size={14} /> Add Sub-goal
                            </button>
                          )}
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setCollapsedGoals(prev => ({ ...prev, [goal._id]: false }));
                            setAddingSubtaskGoalId(goal._id);
                          }}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            background: 'none',
                            border: 'none',
                            color: 'var(--accent-cyan)',
                            cursor: 'pointer',
                            fontSize: '13.5px',
                            padding: '4px 0',
                            width: 'fit-content',
                            transition: 'var(--transition)'
                          }}
                          className="hover-opacity"
                        >
                          <Plus size={14} /> Add Sub-goal
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ padding: '48px 0', textAlign: 'center', border: '1px dashed rgba(255,255,255,0.08)', borderRadius: 'var(--radius)', background: 'rgba(255,255,255,0.01)' }} className="card-hover-glow hover-scale">
                  <Target size={32} style={{ color: 'var(--text-muted)', marginBottom: '12px', display: 'inline-block' }} />
                  <h4 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '4px' }}>No Weekly Goals Set</h4>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '14.5px' }}>
                    Plan your upcoming achievements by creating your first weekly goal.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Goal Creator */}
          <div>
            <div className="card">
              <h3 style={{ marginBottom: '16px' }}>Add Goal</h3>
              <form onSubmit={handleCreateGoal}>
                <div className="form-group">
                  <label className="form-label">Goal Title</label>
                  <input 
                    type="text" 
                    required 
                    placeholder="e.g. Finish React Dashboard"
                    className="input-field" 
                    value={goalTitle}
                    onChange={(e) => setGoalTitle(e.target.value)}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: '24px' }}>
                  <label className="form-label">Checklist Items (comma separated)</label>
                  <textarea 
                    placeholder="e.g. Design routing, Write widgets, Test inputs"
                    className="input-field" 
                    style={{ minHeight: '80px', resize: 'vertical' }}
                    value={subtasksText}
                    onChange={(e) => setSubtasksText(e.target.value)}
                  />
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginTop: '6px' }}>
                    Leave blank to create a single-step checkbox goal.
                  </span>
                </div>

                <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
                  <Plus size={16} /> Plan Goal
                </button>
              </form>
            </div>
          </div>
        </div>
      ) : (
        /* Analytics & Milestones Tab content */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          {loadingAnalytics ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }} className="page-fade-in">
              <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '32px' }}>
                <div className="skeleton" style={{ height: '220px', borderRadius: 'var(--radius-lg)' }} />
                <div className="skeleton" style={{ height: '220px', borderRadius: 'var(--radius-lg)' }} />
              </div>
              <div className="skeleton" style={{ height: '120px', borderRadius: 'var(--radius-lg)' }} />
              <div className="skeleton" style={{ height: '180px', borderRadius: 'var(--radius-lg)' }} />
            </div>
          ) : (
            <>
              {/* Row 1: Gauge Rings and Productivity Insights */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '32px' }}>
                {/* Completion Analytics Gauges */}
                <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <h3 style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <TrendingUp size={22} className="text-emerald" /> Completion Analytics
                    </h3>
                    <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center', gap: '20px', flexWrap: 'wrap', padding: '10px 0' }}>
                      <ProgressRing 
                        percentage={analyticsData.goalCompletionPct} 
                        label="Current Week Progress" 
                        color="var(--accent-emerald)" 
                      />
                      <ProgressRing 
                        percentage={analyticsData.weeklyConsistency} 
                        label="Weekly Consistency" 
                        color="var(--accent-cyan)" 
                      />
                      <ProgressRing 
                        percentage={analyticsData.averageCompletionRate} 
                        label="All-time Goal Rate" 
                        color="var(--accent-purple)" 
                      />
                    </div>
                  </div>

                  <div style={{ marginTop: '24px', borderTop: '1px solid var(--border-light)', paddingTop: '16px', display: 'flex', justifyContent: 'space-around', fontSize: '13.5px', color: 'var(--text-secondary)' }}>
                    <span>Missed tasks (past weeks): <strong className="text-red" style={{ fontSize: '15px' }}>{analyticsData.missedTasks}</strong></span>
                  </div>
                </div>

                {/* Insights Card */}
                <div className="card">
                  <h3 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Sparkles size={22} style={{ color: '#fbbf24' }} /> Productivity Insights
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    {analyticsData.insights && analyticsData.insights.length > 0 ? (
                      analyticsData.insights.map((insight, idx) => (
                        <div key={idx} style={{ display: 'flex', gap: '12px', background: 'rgba(255, 255, 255, 0.02)', padding: '12px 16px', borderRadius: '10px', border: '1px solid var(--border-light)', alignItems: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(251, 191, 36, 0.1)', color: '#fbbf24', flexShrink: 0 }}>
                            <Sparkles size={14} />
                          </div>
                          <span style={{ fontSize: '13.5px', color: 'var(--text-secondary)', lineHeight: '1.4' }}>{insight}</span>
                        </div>
                      ))
                    ) : (
                      <p style={{ color: 'var(--text-muted)', fontSize: '13.5px' }}>Log fitness, nutrition, routines, or goals to generate personalized insights.</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Row 2: Streak Widgets */}
              <div className="card">
                <h3 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Flame size={22} style={{ color: '#f97316' }} /> Active Consistency Streaks
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
                  {/* Workout Streak */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px', background: 'rgba(249, 115, 22, 0.04)', border: '1px solid rgba(249, 115, 22, 0.12)', borderRadius: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '44px', height: '44px', borderRadius: '50%', background: 'rgba(249, 115, 22, 0.1)', color: '#f97316' }}>
                      <Flame size={22} />
                    </div>
                    <div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Workout Streak</div>
                      <div style={{ fontSize: '22px', fontWeight: '800', fontFamily: 'var(--font-display)', color: 'var(--text-primary)', marginTop: '2px' }}>
                        {analyticsData.streaks.workoutStreak} Days
                      </div>
                    </div>
                  </div>

                  {/* Nutrition Streak */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px', background: 'rgba(239, 68, 68, 0.04)', border: '1px solid rgba(239, 68, 68, 0.12)', borderRadius: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '44px', height: '44px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}>
                      <Apple size={22} />
                    </div>
                    <div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Healthy Eating</div>
                      <div style={{ fontSize: '22px', fontWeight: '800', fontFamily: 'var(--font-display)', color: 'var(--text-primary)', marginTop: '2px' }}>
                        {analyticsData.streaks.healthyEatingStreak} Days
                      </div>
                    </div>
                  </div>

                  {/* Productivity Streak */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px', background: 'rgba(234, 179, 8, 0.04)', border: '1px solid rgba(234, 179, 8, 0.12)', borderRadius: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '44px', height: '44px', borderRadius: '50%', background: 'rgba(234, 179, 8, 0.1)', color: '#eab308' }}>
                      <Zap size={22} />
                    </div>
                    <div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Productive Days</div>
                      <div style={{ fontSize: '22px', fontWeight: '800', fontFamily: 'var(--font-display)', color: 'var(--text-primary)', marginTop: '2px' }}>
                        {analyticsData.streaks.productivityStreak} Days
                      </div>
                    </div>
                  </div>

                  {/* Goals Streak */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px', background: 'rgba(16, 185, 129, 0.04)', border: '1px solid rgba(16, 185, 129, 0.12)', borderRadius: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '44px', height: '44px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
                      <Target size={22} />
                    </div>
                    <div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Goals Streak</div>
                      <div style={{ fontSize: '22px', fontWeight: '800', fontFamily: 'var(--font-display)', color: 'var(--text-primary)', marginTop: '2px' }}>
                        {analyticsData.streaks.goalCompletionStreak} Weeks
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Row 3: Achievements Case */}
              <div className="card">
                <h3 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Award size={22} className="text-purple" /> Achievement Badges
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
                  {(() => {
                    const allPossibleBadges = [
                      { id: 'workout_7', name: '7-Day Workout Streak', description: 'Log completed exercises for 7 consecutive days', icon: '🔥' },
                      { id: 'consistency_30', name: '30-Day Consistency Badge', description: 'Maintain a 30-day streak in fitness, nutrition, or productivity', icon: '🏆' },
                      { id: 'tasks_100', name: '100 Completed Tasks', description: 'Successfully finish 100 goals or sub-task checklist items', icon: '⚡' },
                      { id: 'first_month', name: 'First Month Completed', description: 'Stay active on Aegis OS for a month or more', icon: '🌟' }
                    ];

                    return allPossibleBadges.map((badge) => {
                      const matchingEarnedBadge = analyticsData.badges && analyticsData.badges.find(b => b.id === badge.id);
                      const earned = !!matchingEarnedBadge;
                      
                      return (
                        <div 
                          key={badge.id} 
                          style={{ 
                            padding: '20px', 
                            background: earned ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.05) 0%, rgba(168, 85, 247, 0.05) 100%)' : 'rgba(255,255,255,0.01)',
                            border: earned ? '1px solid rgba(168, 85, 247, 0.25)' : '1px solid var(--border-light)',
                            borderRadius: '16px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '16px',
                            opacity: earned ? 1 : 0.4,
                            transition: 'var(--transition)',
                            boxShadow: earned ? '0 4px 15px -3px rgba(168, 85, 247, 0.15)' : 'none'
                          }}
                        >
                          <div style={{ 
                            fontSize: '32px', 
                            width: '60px', 
                            height: '60px', 
                            borderRadius: '12px', 
                            background: earned ? 'rgba(168, 85, 247, 0.12)' : 'rgba(255, 255, 255, 0.02)', 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center',
                            border: earned ? '1px solid rgba(168, 85, 247, 0.2)' : '1px solid transparent'
                          }}>
                            {badge.icon}
                          </div>
                          <div style={{ flex: 1 }}>
                            <h4 style={{ fontSize: '15px', fontWeight: '700', color: earned ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                              {badge.name}
                            </h4>
                            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px', lineHeight: '1.3' }}>
                              {badge.description}
                            </p>
                            {earned && (
                              <span style={{ display: 'inline-block', fontSize: '10.5px', color: 'var(--accent-cyan)', background: 'rgba(6, 182, 212, 0.1)', padding: '2px 8px', borderRadius: '12px', marginTop: '8px', fontWeight: '700' }}>
                                Achieved: {matchingEarnedBadge.metric || 'Yes'}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default WeekScheduler;
