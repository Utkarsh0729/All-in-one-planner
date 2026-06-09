import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Calendar, Plus, Trash2, CheckCircle2, ChevronLeft, ChevronRight, Edit2, Check, X } from 'lucide-react';

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

  const weekStartStr = currentWeekMonday.toISOString().split('T')[0];

  const fetchGoals = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/week-goals/${weekStartStr}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setGoals(data);
    } catch (err) {
      setError('Failed to fetch weekly goals.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGoals();
  }, [weekStartStr]);

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
    } catch (err) {
      setError(err.message);
    }
  };

  const handleToggleSubtask = async (goalId, subtaskId) => {
    const goal = goals.find(g => g._id === goalId);
    if (!goal) return;

    const updatedSubtasks = goal.subtasks.map(s => {
      if (s._id === subtaskId) {
        return { ...s, checked: !s.checked };
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
    } catch (err) {
      setError('Failed to update subtask.');
    }
  };

  const handleToggleGoalOnly = async (goalId) => {
    const goal = goals.find(g => g._id === goalId);
    if (!goal) return;

    try {
      const res = await fetch(`${API_URL}/week-goals/${goalId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ completed: !goal.completed })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      setGoals(prev => prev.map(g => g._id === goalId ? data : g));
    } catch (err) {
      setError('Failed to update goal.');
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
    } catch (err) {
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
    } catch (err) {
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
    } catch (err) {
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
    <div className="main-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">Week Scheduler</h1>
          <p className="page-subtitle">Track goals progress, tasks checklists, and completions</p>
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

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '32px' }}>
        {/* Left Column: Weekly Goals List */}
        <div>
          <div className="card">
            <h3 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Calendar size={22} className="text-emerald" /> Goals for the Week
            </h3>

            {loading ? (
              <p style={{ color: 'var(--text-muted)' }}>Loading weekly scheduler...</p>
            ) : goals.length > 0 ? (
              <div className="week-goals-list">
                {goals.map((goal) => (
                  <div key={goal._id} className="week-goal-card">
                    <div className="week-goal-header" style={{ minHeight: '42px', alignItems: 'center' }}>
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
                          <div>
                            <h4 style={{ fontSize: '17px', textDecoration: goal.completed ? 'line-through' : 'none' }}>
                              {goal.title}
                            </h4>
                            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                              Progress: {goal.progress}% Completed
                            </span>
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
                    <div className="progress-bar-bg" style={{ marginBottom: '16px' }}>
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
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', background: 'rgba(255,255,255,0.01)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-light)' }}>
                        {goal.subtasks.map((sub) => (
                          <div 
                            key={sub._id} 
                            style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '14px' }}
                            onClick={() => handleToggleSubtask(goal._id, sub._id)}
                          >
                            <div className={`checkbox-custom ${sub.checked ? 'checked' : ''}`} style={{ width: '18px', height: '18px', borderRadius: '4px' }}>
                              {sub.checked && <CheckCircle2 size={12} />}
                            </div>
                            <span style={{ color: sub.checked ? 'var(--text-muted)' : 'var(--text-primary)', textDecoration: sub.checked ? 'line-through' : 'none' }}>
                              {sub.text}
                            </span>
                          </div>
                        ))}

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
                            onClick={() => setAddingSubtaskGoalId(goal._id)}
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
                        onClick={() => setAddingSubtaskGoalId(goal._id)}
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
              <p style={{ color: 'var(--text-muted)', fontSize: '14px', textAlign: 'center', padding: '40px 0' }}>
                No goals listed for this week. Plan some goals now!
              </p>
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
    </div>
  );
};

export default WeekScheduler;
