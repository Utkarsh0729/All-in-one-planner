import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import OnboardingModal from '../components/OnboardingModal';
import { Utensils, Plus, Trash2, Calendar, Database, Eye } from 'lucide-react';

const CalorieCalculator = () => {
  const { user, token, API_URL } = useAuth();
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [log, setLog] = useState({ items: [], totalCalories: 0, totalProtein: 0, totalCarbs: 0, totalFat: 0 });
  const [profile, setProfile] = useState({ targetCalories: 2000, targetProtein: 150, targetCarbs: 200, targetFat: 60 });
  
  // Forms state
  const [foodName, setFoodName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState('gm');
  
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState('');
  const [sourceMessage, setSourceMessage] = useState('');

  const fetchLogAndProfile = async () => {
    setLoading(true);
    setError('');
    try {
      // Fetch Log
      const logRes = await fetch(`${API_URL}/nutrition/${date}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const logData = await logRes.json();
      setLog(logData);

      // Fetch Profile
      const profileRes = await fetch(`${API_URL}/profile`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const profileData = await profileRes.json();
      setProfile(profileData);

      // If profile target is unconfigured, trigger lazy onboarding modal
      if (!user.onboardingCompleted.nutrition) {
        setIsOnboardingOpen(true);
      }
    } catch (err) {
      setError('Failed to fetch nutrition data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogAndProfile();
  }, [date, user.onboardingCompleted.nutrition]);

  const handleAddFood = async (e) => {
    e.preventDefault();
    if (!foodName || !quantity) return;
    setAdding(true);
    setError('');
    setSourceMessage('');

    try {
      const res = await fetch(`${API_URL}/nutrition/${date}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ name: foodName, quantity, unit })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to add food');

      setLog(data.log);
      setFoodName('');
      setQuantity('');

      // Show source notification
      if (data.source === 'cache') {
        setSourceMessage('⚡ Loaded instantly from database cache!');
      } else if (data.source === 'open_food_facts') {
        setSourceMessage('🍎 Nutrients retrieved from Open Food Facts API & cached.');
      } else if (data.source === 'nvidia_ai') {
        setSourceMessage('🤖 Nutrients parsed by NVIDIA AI & cached.');
      } else {
        setSourceMessage('📋 Loaded nutrients from local fallback & cached.');
      }
      setTimeout(() => setSourceMessage(''), 4500);

    } catch (err) {
      setError(err.message);
    } finally {
      setAdding(false);
    }
  };

  const handleDeleteItem = async (itemId) => {
    try {
      const res = await fetch(`${API_URL}/nutrition/${date}/${itemId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setLog(data);
    } catch (err) {
      setError('Failed to delete item.');
    }
  };

  return (
    <div className="main-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">Nutrition Tracker</h1>
          <p className="page-subtitle">Surf nutrients, aggregate calories, and track fitness targets</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Calendar size={18} className="text-cyan" />
          <input 
            type="date" 
            className="input-field" 
            style={{ width: '160px', padding: '8px 12px' }}
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
      </div>

      <div className="calorie-grid">
        {/* Left Column: Form & Food List */}
        <div>
          <div className="card" style={{ marginBottom: '24px' }}>
            <h3 style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Utensils size={20} className="text-cyan" /> Log Food Eaten
            </h3>
            
            {sourceMessage && (
              <div style={{ background: 'rgba(6, 182, 212, 0.08)', border: '1px solid rgba(6, 182, 212, 0.2)', padding: '10px 14px', borderRadius: '8px', fontSize: '13px', color: 'var(--accent-cyan)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Database size={14} />
                <span>{sourceMessage}</span>
              </div>
            )}

            <form onSubmit={handleAddFood} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1.2fr auto', gap: '12px', alignItems: 'end' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Food Item / Meal</label>
                <input 
                  type="text" 
                  required 
                  placeholder="e.g. 2 eggs or boiled rice"
                  className="input-field"
                  value={foodName}
                  onChange={(e) => setFoodName(e.target.value)}
                />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Quantity</label>
                <input 
                  type="number" 
                  required 
                  placeholder="Quantity"
                  className="input-field"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Unit</label>
                <select 
                  className="input-field"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                >
                  <option value="gm">grams (gm)</option>
                  <option value="ml">milliliters (ml)</option>
                  <option value="piece">pieces</option>
                  <option value="bowl">bowl(s)</option>
                  <option value="cup">cup(s)</option>
                  <option value="plate">plate(s)</option>
                </select>
              </div>
              <button type="submit" disabled={adding} className="btn btn-primary" style={{ padding: '12px 18px' }}>
                <Plus size={18} />
                {adding ? 'Surfing...' : 'Add'}
              </button>
            </form>
          </div>

          <div className="card">
            <h3 style={{ marginBottom: '16px' }}>Logged Meals</h3>
            {loading ? (
              <p style={{ color: 'var(--text-muted)' }}>Loading logs...</p>
            ) : log.items && log.items.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {log.items.map((item) => (
                  <div key={item._id} className="flex-between" style={{ padding: '12px 16px', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-light)', borderRadius: '8px' }}>
                    <div>
                      <strong style={{ fontSize: '15px' }}>{item.name}</strong>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                        {item.quantity} {item.unit} | P: {item.protein}g | C: {item.carbs}g | F: {item.fat}g
                      </div>
                    </div>
                    <div className="gap-10">
                      <span className="text-cyan" style={{ fontWeight: '600', fontSize: '15px' }}>{item.calories} kcal</span>
                      <button 
                        onClick={() => handleDeleteItem(item._id)} 
                        className="btn-danger" 
                        style={{ border: 'none', background: 'none', cursor: 'pointer', display: 'flex', padding: '6px' }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: 'var(--text-muted)', fontSize: '14px', textAlign: 'center', padding: '24px 0' }}>
                No food logged for this date yet.
              </p>
            )}
          </div>
        </div>

        {/* Right Column: Calories Target Progress */}
        <div className="card macro-chart-container">
          <h3 style={{ marginBottom: '16px', borderBottom: '1px solid var(--border-light)', paddingBottom: '10px' }}>Goal Progression</h3>
          
          <div style={{ textAlign: 'center', margin: '10px 0 20px 0' }}>
            <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Total Calories</span>
            <div className="widget-value text-cyan" style={{ fontSize: '42px', marginTop: '6px' }}>
              {log.totalCalories} <span style={{ fontSize: '18px', color: 'var(--text-muted)' }}>/ {profile.targetCalories} kcal</span>
            </div>
          </div>

          {/* Calories Progress */}
          <div>
            <div className="macro-row">
              <span style={{ fontSize: '13px', fontWeight: '500' }}>Calories Limit</span>
              <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{Math.round((log.totalCalories / profile.targetCalories) * 100)}%</span>
            </div>
            <div className="progress-bar-bg">
              <div 
                className="progress-bar-fill" 
                style={{ 
                  width: `${Math.min((log.totalCalories / profile.targetCalories) * 100, 100)}%`,
                  background: 'var(--accent-cyan)'
                }}
              />
            </div>
          </div>

          {/* Protein Progress */}
          <div style={{ marginTop: '14px' }}>
            <div className="macro-row">
              <span style={{ fontSize: '13px', fontWeight: '500' }}>Protein Target</span>
              <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{log.totalProtein}g / {profile.targetProtein}g</span>
            </div>
            <div className="progress-bar-bg">
              <div 
                className="progress-bar-fill" 
                style={{ 
                  width: `${Math.min((log.totalProtein / profile.targetProtein) * 100, 100)}%`,
                  background: 'var(--primary)'
                }}
              />
            </div>
          </div>

          {/* Carbs Progress */}
          <div style={{ marginTop: '14px' }}>
            <div className="macro-row">
              <span style={{ fontSize: '13px', fontWeight: '500' }}>Carbohydrates Limit</span>
              <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{log.totalCarbs}g / {profile.targetCarbs}g</span>
            </div>
            <div className="progress-bar-bg">
              <div 
                className="progress-bar-fill" 
                style={{ 
                  width: `${Math.min((log.totalCarbs / profile.targetCarbs) * 100, 100)}%`,
                  background: 'var(--accent-purple)'
                }}
              />
            </div>
          </div>

          {/* Fat Progress */}
          <div style={{ marginTop: '14px' }}>
            <div className="macro-row">
              <span style={{ fontSize: '13px', fontWeight: '500' }}>Fats Limit</span>
              <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{log.totalFat}g / {profile.targetFat}g</span>
            </div>
            <div className="progress-bar-bg">
              <div 
                className="progress-bar-fill" 
                style={{ 
                  width: `${Math.min((log.totalFat / profile.targetFat) * 100, 100)}%`,
                  background: 'var(--accent-orange)'
                }}
              />
            </div>
          </div>

          <button 
            className="btn btn-secondary" 
            style={{ width: '100%', marginTop: '20px', fontSize: '13px' }}
            onClick={() => setIsOnboardingOpen(true)}
          >
            Update Setup Parameters
          </button>
        </div>
      </div>

      <OnboardingModal 
        section="nutrition" 
        isOpen={isOnboardingOpen} 
        onClose={() => setIsOnboardingOpen(false)} 
      />
    </div>
  );
};

export default CalorieCalculator;
