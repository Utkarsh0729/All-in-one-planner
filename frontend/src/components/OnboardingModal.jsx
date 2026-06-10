import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../context/AuthContext';
import { X } from 'lucide-react';

const OnboardingModal = ({ section, isOpen, onClose }) => {
  const { token, updateOnboardingStatus, API_URL } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Nutrition state
  const [nutritionForm, setNutritionForm] = useState({
    age: '',
    gender: 'male',
    height: '',
    weight: '',
    activityLevel: 'moderately_active',
    fitnessGoal: 'maintain_weight',
  });

  // Workout state
  const [workoutForm, setWorkoutForm] = useState({
    workoutExperience: 'beginner',
    workoutSplit: 'full_body',
    gymLocation: 'gym',
  });

  if (!isOpen) return null;

  const handleNutritionSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch(`${API_URL}/profile/nutrition`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(nutritionForm),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Onboarding failed');

      updateOnboardingStatus('nutrition');
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleWorkoutSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch(`${API_URL}/profile/workout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(workoutForm),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Onboarding failed');

      updateOnboardingStatus('workout');
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <div className="modal-overlay">
      <div className="modal-content card" style={{ position: 'relative' }}>
        <button type="button" className="modal-close-btn" onClick={onClose} aria-label="Close modal">
          <X size={20} />
        </button>
        <h2 style={{ marginBottom: '10px', fontSize: '24px' }}>
          {section === 'nutrition' ? '🍎 Nutrition & Health Setup' : '💪 Gym Planner Setup'}
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '24px' }}>
          {section === 'nutrition' 
            ? 'We need a few details to calculate your daily targets and macro limits.' 
            : 'Configure your fitness history and splits to let the AI agent plan your routines.'}
        </p>

        {error && <div style={{ color: 'var(--accent-red)', marginBottom: '15px', fontSize: '14px' }}>{error}</div>}

        {section === 'nutrition' ? (
          <form onSubmit={handleNutritionSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label">Age</label>
                <input 
                  type="number" 
                  required 
                  className="input-field" 
                  value={nutritionForm.age}
                  onChange={(e) => setNutritionForm({ ...nutritionForm, age: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Gender</label>
                <select 
                  className="input-field"
                  value={nutritionForm.gender}
                  onChange={(e) => setNutritionForm({ ...nutritionForm, gender: e.target.value })}
                >
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label">Height (cm)</label>
                <input 
                  type="number" 
                  required 
                  className="input-field" 
                  value={nutritionForm.height}
                  onChange={(e) => setNutritionForm({ ...nutritionForm, height: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Weight (kg)</label>
                <input 
                  type="number" 
                  required 
                  className="input-field" 
                  value={nutritionForm.weight}
                  onChange={(e) => setNutritionForm({ ...nutritionForm, weight: e.target.value })}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Activity Level</label>
              <select 
                className="input-field"
                value={nutritionForm.activityLevel}
                onChange={(e) => setNutritionForm({ ...nutritionForm, activityLevel: e.target.value })}
              >
                <option value="sedentary">Sedentary (Little to no exercise)</option>
                <option value="lightly_active">Lightly Active (Exercise 1-3 days/week)</option>
                <option value="moderately_active">Moderately Active (Exercise 3-5 days/week)</option>
                <option value="very_active">Very Active (Heavy exercise 6-7 days/week)</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Fitness Goal</label>
              <select 
                className="input-field"
                value={nutritionForm.fitnessGoal}
                onChange={(e) => setNutritionForm({ ...nutritionForm, fitnessGoal: e.target.value })}
              >
                <option value="lose_weight">Lose Weight / Fat Loss</option>
                <option value="maintain_weight">Maintain Weight</option>
                <option value="gain_muscle">Gain Muscle / Bulking</option>
              </select>
            </div>

            <button type="submit" disabled={loading} className="btn btn-primary" style={{ width: '100%', marginTop: '10px' }}>
              {loading ? 'Calculating targets...' : 'Compute Targets & Save'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleWorkoutSubmit}>
            <div className="form-group">
              <label className="form-label">Workout Experience</label>
              <select 
                className="input-field"
                value={workoutForm.workoutExperience}
                onChange={(e) => setWorkoutForm({ ...workoutForm, workoutExperience: e.target.value })}
              >
                <option value="beginner">Beginner (learning basic movements)</option>
                <option value="intermediate">Intermediate (1-3 years experience)</option>
                <option value="advanced">Advanced (3+ years experience)</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Preferred Workout Split</label>
              <select 
                className="input-field"
                value={workoutForm.workoutSplit}
                onChange={(e) => setWorkoutForm({ ...workoutForm, workoutSplit: e.target.value })}
              >
                <option value="full_body">Full Body (General fitness & toning)</option>
                <option value="upper_lower">Upper / Lower (Balanced 4-day split)</option>
                <option value="push_pull_legs">Push / Pull / Legs (Hypertrophy 3-6 day split)</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Workout Location / Equipment Access</label>
              <select 
                className="input-field"
                value={workoutForm.gymLocation}
                onChange={(e) => setWorkoutForm({ ...workoutForm, gymLocation: e.target.value })}
              >
                <option value="gym">Commercial Gym (Full access to barbells/machines)</option>
                <option value="home">Home / Calisthenics (Dumbbells or Bodyweight only)</option>
              </select>
            </div>

            <button type="submit" disabled={loading} className="btn btn-primary" style={{ width: '100%', marginTop: '10px' }}>
              {loading ? 'Saving preferences...' : 'Generate Workout Split'}
            </button>
          </form>
        )}
      </div>
    </div>,
    document.body
  );
};

export default OnboardingModal;
