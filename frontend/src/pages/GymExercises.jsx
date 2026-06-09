import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import OnboardingModal from '../components/OnboardingModal';
import { Dumbbell, Calendar, RefreshCw, Check, AlertCircle, Plus, Trash2, XCircle } from 'lucide-react';

const GymExercises = () => {
  const { user, token, API_URL } = useAuth();
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [log, setLog] = useState({ exercises: [], skipped: false, notes: '' });
  
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

  const fetchWorkoutLog = async () => {
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
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkoutLog();
  }, [date, user.onboardingCompleted.workout]);

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
    } finally {
      setSubmitting(false);
    }
  };

  // Generate new AI workout
  const handleGenerateWorkout = async () => {
    setGenerating(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/workouts/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ date })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      setLog(data.log);
    } catch (err) {
      setError(err.message);
    } finally {
      setGenerating(false);
    }
  };

  // Toggle single exercise completed
  const handleToggleExercise = async (exerciseId) => {
    try {
      const res = await fetch(`${API_URL}/workouts/${date}/exercise/${exerciseId}/toggle`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setLog(data);
    } catch (err) {
      setError('Failed to toggle exercise.');
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
    }
  };

  return (
    <div className="main-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">Gym Workout AI</h1>
          <p className="page-subtitle">Personalized daily workout scheduling & history shifting</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Calendar size={18} className="text-purple" />
          <input 
            type="date" 
            className="input-field" 
            style={{ width: '160px', padding: '8px 12px' }}
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
      </div>

      {error && <div style={{ color: 'var(--accent-red)', marginBottom: '15px' }}>{error}</div>}

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
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '32px' }}>
          {/* Main Workout Panel */}
          <div>
            <div className="card" style={{ marginBottom: '24px' }}>
              <div className="workout-header">
                <div>
                  <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Dumbbell size={22} className="text-purple" /> Today's Workout
                  </h3>
                  {log.skipped && <span className="text-orange" style={{ fontSize: '13px', fontWeight: 'bold' }}>Session Skipped</span>}
                </div>
                
                <div style={{ display: 'flex', gap: '12px' }}>
                  {log.exercises && log.exercises.length > 0 && (
                    <button 
                      onClick={handleToggleSkip} 
                      className={`btn ${log.skipped ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ fontSize: '13px', padding: '8px 16px' }}
                    >
                      {log.skipped ? 'Resume Session' : 'Skip Workout'}
                    </button>
                  )}
                  <button 
                    onClick={() => setIsOnboardingOpen(true)} 
                    className="btn btn-secondary"
                    style={{ fontSize: '13px', padding: '8px 16px' }}
                  >
                    Adjust Setup Setup
                  </button>
                </div>
              </div>

              {loading ? (
                <p style={{ color: 'var(--text-muted)' }}>Loading workout plans...</p>
              ) : log.exercises && log.exercises.length > 0 ? (
                <div className="exercise-list">
                  {log.exercises.map((ex) => (
                    <div 
                      key={ex._id} 
                      className={`exercise-item ${ex.completed ? 'completed' : ''}`}
                      style={{ opacity: log.skipped ? 0.5 : 1 }}
                    >
                      <div className="exercise-info">
                        <div 
                          className={`checkbox-custom ${ex.completed ? 'checked' : ''}`}
                          onClick={() => !log.skipped && handleToggleExercise(ex._id)}
                        >
                          {ex.completed && <Check size={14} />}
                        </div>
                        <div className="exercise-meta">
                          <span className="exercise-name" style={{ textDecoration: ex.completed ? 'line-through' : 'none' }}>
                            {ex.name}
                          </span>
                          <span className="exercise-detail">
                            {ex.sets} sets x {ex.reps} reps | Target: {ex.targetMuscles.join(', ')}
                            {ex.substituted && <span className="text-purple" style={{ marginLeft: '8px', fontSize: '11px' }}>(Substituted)</span>}
                          </span>
                        </div>
                      </div>

                      <div className="exercise-actions">
                        {!ex.completed && !log.skipped && (
                          <button 
                            className="btn btn-secondary"
                            onClick={() => handleRerollExercise(ex._id)}
                            title="Reroll substitute exercise"
                            style={{ padding: '8px', borderRadius: '6px' }}
                          >
                            <RefreshCw size={14} />
                          </button>
                        )}
                        <button 
                          className="btn-danger" 
                          onClick={() => handleDeleteExercise(ex._id)}
                          style={{ border: 'none', background: 'none', cursor: 'pointer', padding: '8px' }}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '40px 0' }}>
                  <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>
                    No workout plan generated for this date yet.
                  </p>
                  <button 
                    onClick={handleGenerateWorkout} 
                    disabled={generating} 
                    className="btn btn-primary"
                  >
                    {generating ? 'Querying Gemini...' : 'Generate Workout Routine'}
                  </button>
                </div>
              )}
            </div>
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
      )}

      <OnboardingModal 
        section="workout" 
        isOpen={isOnboardingOpen} 
        onClose={() => setIsOnboardingOpen(false)} 
      />
    </div>
  );
};

export default GymExercises;
