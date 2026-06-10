import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import OnboardingModal from '../components/OnboardingModal';
import { 
  Utensils, Plus, Trash2, Calendar, Database, Star, Trophy, Sparkles, 
  TrendingUp, Heart, Info, ChevronLeft, ChevronRight
} from 'lucide-react';

const CalorieCalculator = () => {
  const { user, token, API_URL } = useAuth();
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
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
  const [log, setLog] = useState({ items: [], totalCalories: 0, totalProtein: 0, totalCarbs: 0, totalFat: 0, totalFiber: 0 });
  const [profile, setProfile] = useState({ targetCalories: 2000, targetProtein: 150, targetCarbs: 200, targetFat: 60, targetFiber: 25 });
  
  // Tabs: 'tracker' or 'analytics'
  const [activeTab, setActiveTab] = useState('tracker');

  // Forms state
  const [foodName, setFoodName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState('gm');
  
  // Smart features state
  const [recentFoods, setRecentFoods] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  
  // Quick Add Form
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [quickName, setQuickName] = useState('');
  const [quickCalories, setQuickCalories] = useState('');
  const [quickProtein, setQuickProtein] = useState('');
  const [quickCarbs, setQuickCarbs] = useState('');
  const [quickFat, setQuickFat] = useState('');
  const [quickFiber, setQuickFiber] = useState('');

  // Favorites Manual Create
  const [showFavCreate, setShowFavCreate] = useState(false);
  const [favName, setFavName] = useState('');
  const [favCalories, setFavCalories] = useState('');
  const [favProtein, setFavProtein] = useState('');
  const [favCarbs, setFavCarbs] = useState('');
  const [favFat, setFavFat] = useState('');
  const [favFiber, setFavFiber] = useState('');

  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState('');
  const [sourceMessage, setSourceMessage] = useState('');

  const fetchAnalyticsSummary = useCallback(async () => {
    setLoadingAnalytics(true);
    try {
      const res = await fetch(`${API_URL}/nutrition/analytics/summary`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setAnalytics(data);
    } catch (err) {
      console.error('Failed to fetch nutrition analytics summary:', err);
    } finally {
      setLoadingAnalytics(false);
    }
  }, [token, API_URL]);

  const fetchLogAndProfile = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      // 1. Fetch daily log
      const logRes = await fetch(`${API_URL}/nutrition/${date}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const logData = await logRes.json();
      setLog(logData);

      // 2. Fetch user profile
      const profileRes = await fetch(`${API_URL}/profile`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const profileData = await profileRes.json();
      setProfile(profileData);

      // 3. Fetch recent food entries
      const recentRes = await fetch(`${API_URL}/nutrition/recent`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const recentData = await recentRes.json();
      setRecentFoods(recentData);

      // 4. Fetch favorite meals
      const favRes = await fetch(`${API_URL}/nutrition/favorites`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const favData = await favRes.json();
      setFavorites(favData);

      // 5. Load analytics
      fetchAnalyticsSummary();

      // Trigger lazy onboarding modal if target metrics are not setup
      if (!user.onboardingCompleted.nutrition) {
        setIsOnboardingOpen(true);
      }
    } catch (err) {
      setError('Failed to fetch nutrition data.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [date, token, API_URL, user.onboardingCompleted.nutrition, fetchAnalyticsSummary]);

  useEffect(() => {
    const load = async () => {
      await Promise.resolve();
      fetchLogAndProfile();
    };
    load();
  }, [fetchLogAndProfile]);

  // Log food items
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

      // Show database / API resource status
      if (data.source === 'cache') {
        setSourceMessage('⚡ Loaded instantly from database cache!');
      } else if (data.source === 'open_food_facts') {
        setSourceMessage('🍎 Nutrients retrieved from Open Food Facts API.');
      } else if (data.source === 'nvidia_ai') {
        setSourceMessage('🤖 Nutrients parsed by NVIDIA AI & cached.');
      } else {
        setSourceMessage('📋 Loaded nutrients from local fallback.');
      }
      setTimeout(() => setSourceMessage(''), 4500);

      // Refresh recent list and analytics
      const recentRes = await fetch(`${API_URL}/nutrition/recent`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const recentData = await recentRes.json();
      setRecentFoods(recentData);
      fetchAnalyticsSummary();

    } catch (err) {
      setError(err.message);
      console.error(err);
    } finally {
      setAdding(false);
    }
  };

  // Delete food item from daily logs
  const handleDeleteItem = async (itemId) => {
    try {
      const res = await fetch(`${API_URL}/nutrition/${date}/${itemId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setLog(data);
      fetchAnalyticsSummary();
    } catch (err) {
      setError('Failed to delete item.');
      console.error(err);
    }
  };

  // Perform quick macro logging
  const handleQuickAdd = async (e) => {
    e.preventDefault();
    if (!quickName || !quickCalories) return;
    setError('');
    try {
      const res = await fetch(`${API_URL}/nutrition/${date}/quick-add`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          name: quickName,
          calories: Number(quickCalories),
          protein: Number(quickProtein) || 0,
          carbs: Number(quickCarbs) || 0,
          fat: Number(quickFat) || 0,
          fiber: Number(quickFiber) || 0
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to quick log food');

      setLog(data);
      setQuickName('');
      setQuickCalories('');
      setQuickProtein('');
      setQuickCarbs('');
      setQuickFat('');
      setQuickFiber('');
      setShowQuickAdd(false);
      fetchAnalyticsSummary();
    } catch (err) {
      setError(err.message);
      console.error(err);
    }
  };

  // Log favorite meal directly to today's log
  const handleAddFavoriteToLog = async (favoriteId) => {
    setError('');
    try {
      const res = await fetch(`${API_URL}/nutrition/favorites/${favoriteId}/add/${date}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      setLog(data);
      fetchAnalyticsSummary();
    } catch (err) {
      setError('Failed to log favorite meal.');
      console.error(err);
    }
  };

  // Save current logged item as a preset favorite
  const handleSaveItemAsFavorite = async (item) => {
    setError('');
    try {
      const res = await fetch(`${API_URL}/nutrition/favorites`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          name: item.name,
          calories: item.calories,
          protein: item.protein,
          carbs: item.carbs,
          fat: item.fat,
          fiber: item.fiber || 0,
          quantity: item.quantity,
          unit: item.unit
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      // Refresh favorites list
      setFavorites(prev => [data, ...prev]);
    } catch (err) {
      setError(err.message || 'Failed to save favorite meal');
      console.error(err);
    }
  };

  // Create favorite meal manually
  const handleCreateFavoriteMeal = async (e) => {
    e.preventDefault();
    if (!favName || !favCalories) return;
    setError('');
    try {
      const res = await fetch(`${API_URL}/nutrition/favorites`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          name: favName,
          calories: Number(favCalories),
          protein: Number(favProtein) || 0,
          carbs: Number(favCarbs) || 0,
          fat: Number(favFat) || 0,
          fiber: Number(favFiber) || 0,
          quantity: 100,
          unit: 'g'
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      setFavorites(prev => [data, ...prev]);
      setFavName('');
      setFavCalories('');
      setFavProtein('');
      setFavCarbs('');
      setFavFat('');
      setFavFiber('');
      setShowFavCreate(false);
    } catch (err) {
      setError(err.message || 'Failed to create favorite meal');
      console.error(err);
    }
  };

  // Delete favorite meal from presets list
  const handleDeleteFavoriteMeal = async (favoriteId) => {
    try {
      const res = await fetch(`${API_URL}/nutrition/favorites/${favoriteId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message);
      }
      setFavorites(prev => prev.filter(f => f._id !== favoriteId));
    } catch (err) {
      setError('Failed to delete favorite meal.');
      console.error(err);
    }
  };

  const fillFormFromRecent = (food) => {
    setFoodName(food.name);
    setQuantity(food.quantity);
    setUnit(food.unit);
  };

  return (
    <div className="main-content page-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Utensils className="text-cyan animate-pulse" size={28} /> Nutrition Tracker V2
          </h1>
          <p className="page-subtitle">Personalized daily food logs, smart food presets, & AI-powered dietary insights</p>
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
            <Calendar size={15} className="text-cyan" />
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
          <Info size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Tabs navigation */}
      <div style={{ display: 'flex', gap: '16px', borderBottom: '1px solid var(--border-light)', marginBottom: '24px' }}>
        <button 
          onClick={() => setActiveTab('tracker')} 
          style={{
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'tracker' ? '2px solid var(--accent-cyan)' : '2px solid transparent',
            color: activeTab === 'tracker' ? 'var(--text-primary)' : 'var(--text-muted)',
            padding: '8px 16px 12px 16px',
            cursor: 'pointer',
            fontWeight: 'bold',
            fontSize: '16px',
            transition: 'var(--transition)'
          }}
        >
          Daily Tracker
        </button>
        <button 
          onClick={() => setActiveTab('analytics')} 
          style={{
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'analytics' ? '2px solid var(--accent-cyan)' : '2px solid transparent',
            color: activeTab === 'analytics' ? 'var(--text-primary)' : 'var(--text-muted)',
            padding: '8px 16px 12px 16px',
            cursor: 'pointer',
            fontWeight: 'bold',
            fontSize: '16px',
            transition: 'var(--transition)'
          }}
        >
          Nutrition Intelligence & AI Coach
        </button>
      </div>

      {activeTab === 'tracker' ? (
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '32px' }}>
          
          {/* Left Column: Logging & Recent Foods */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
            {/* Standard Food Logger */}
            <div className="card">
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
                    placeholder="e.g. 2 eggs or boiled oats"
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

              {/* Quick Actions (Quick Add / Create Favorite manual buttons) */}
              <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  style={{ fontSize: '12px', padding: '6px 12px' }}
                  onClick={() => setShowQuickAdd(!showQuickAdd)}
                >
                  {showQuickAdd ? 'Hide Quick Add' : '⚡ Direct Quick-Add (Macros)'}
                </button>
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  style={{ fontSize: '12px', padding: '6px 12px' }}
                  onClick={() => setShowFavCreate(!showFavCreate)}
                >
                  {showFavCreate ? 'Hide Favorite Meal Creator' : '⭐ Create Favorite Meal'}
                </button>
              </div>

              {/* Collapsible Quick-Add Form */}
              {showQuickAdd && (
                <div style={{ marginTop: '16px', padding: '16px', border: '1px solid var(--border-light)', borderRadius: '8px', background: 'rgba(255,255,255,0.01)' }}>
                  <h4 style={{ fontSize: '14px', marginBottom: '12px', color: 'var(--text-secondary)' }}>Direct Quick-Add Meal</h4>
                  <form onSubmit={handleQuickAdd} style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr) auto', gap: '12px', alignItems: 'end' }}>
                    <div className="form-group" style={{ gridColumn: 'span 3', margin: 0 }}>
                      <label className="form-label">Meal Name</label>
                      <input 
                        type="text" 
                        required 
                        placeholder="Generic Protein Shake"
                        className="input-field" 
                        value={quickName}
                        onChange={(e) => setQuickName(e.target.value)}
                      />
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label">Calories (kcal)</label>
                      <input 
                        type="number" 
                        required 
                        className="input-field" 
                        value={quickCalories}
                        onChange={(e) => setQuickCalories(e.target.value)}
                      />
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label">Protein (g)</label>
                      <input 
                        type="number" 
                        className="input-field" 
                        value={quickProtein}
                        onChange={(e) => setQuickProtein(e.target.value)}
                      />
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label">Carbs (g)</label>
                      <input 
                        type="number" 
                        className="input-field" 
                        value={quickCarbs}
                        onChange={(e) => setQuickCarbs(e.target.value)}
                      />
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label">Fat (g)</label>
                      <input 
                        type="number" 
                        className="input-field" 
                        value={quickFat}
                        onChange={(e) => setQuickFat(e.target.value)}
                      />
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label">Fiber (g)</label>
                      <input 
                        type="number" 
                        className="input-field" 
                        value={quickFiber}
                        onChange={(e) => setQuickFiber(e.target.value)}
                      />
                    </div>
                    <button type="submit" className="btn btn-primary" style={{ padding: '12px 18px', gridColumn: 'span 2' }}>
                      <Plus size={16} /> Quick-Log
                    </button>
                  </form>
                </div>
              )}

              {/* Collapsible Favorite Manual Form */}
              {showFavCreate && (
                <div style={{ marginTop: '16px', padding: '16px', border: '1px solid var(--border-light)', borderRadius: '8px', background: 'rgba(255,255,255,0.01)' }}>
                  <h4 style={{ fontSize: '14px', marginBottom: '12px', color: 'var(--text-secondary)' }}>Create Favorite Meal Template</h4>
                  <form onSubmit={handleCreateFavoriteMeal} style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr) auto', gap: '12px', alignItems: 'end' }}>
                    <div className="form-group" style={{ gridColumn: 'span 3', margin: 0 }}>
                      <label className="form-label">Meal Name</label>
                      <input 
                        type="text" 
                        required 
                        placeholder="My Standard Lunch"
                        className="input-field" 
                        value={favName}
                        onChange={(e) => setFavName(e.target.value)}
                      />
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label">Calories (kcal)</label>
                      <input 
                        type="number" 
                        required 
                        className="input-field" 
                        value={favCalories}
                        onChange={(e) => setFavCalories(e.target.value)}
                      />
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label">Protein (g)</label>
                      <input 
                        type="number" 
                        className="input-field" 
                        value={favProtein}
                        onChange={(e) => setFavProtein(e.target.value)}
                      />
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label">Carbs (g)</label>
                      <input 
                        type="number" 
                        className="input-field" 
                        value={favCarbs}
                        onChange={(e) => setFavCarbs(e.target.value)}
                      />
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label">Fat (g)</label>
                      <input 
                        type="number" 
                        className="input-field" 
                        value={favFat}
                        onChange={(e) => setFavFat(e.target.value)}
                      />
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label">Fiber (g)</label>
                      <input 
                        type="number" 
                        className="input-field" 
                        value={favFiber}
                        onChange={(e) => setFavFiber(e.target.value)}
                      />
                    </div>
                    <button type="submit" className="btn btn-primary" style={{ padding: '12px 18px', gridColumn: 'span 2' }}>
                      <Star size={16} /> Save Meal
                    </button>
                  </form>
                </div>
              )}
            </div>

            {/* Recent Food Pills (Smart Fill shortcut) */}
            {recentFoods.length > 0 && (
              <div className="card" style={{ padding: '16px 20px' }}>
                <h4 style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Database size={13} className="text-cyan" /> Frequently Eaten (Click to Autofill)
                </h4>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {recentFoods.map((food, idx) => (
                    <button
                      key={idx}
                      type="button"
                      className="btn btn-secondary"
                      style={{ 
                        fontSize: '11.5px', 
                        padding: '6px 12px', 
                        borderRadius: '20px', 
                        background: 'rgba(6, 182, 212, 0.02)', 
                        borderColor: 'rgba(6, 182, 212, 0.05)',
                        color: 'var(--text-secondary)'
                      }}
                      onClick={() => fillFormFromRecent(food)}
                      title={`Calories: ${food.calories}kcal | P: ${food.protein}g`}
                    >
                      {food.name} ({food.quantity}{food.unit})
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Logged Meals List */}
            <div className="card">
              <h3 style={{ marginBottom: '16px' }}>Logged Meals</h3>
              {loading ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {[1, 2, 3].map(n => (
                    <div key={n} className="skeleton" style={{ height: '54px', border: 'none' }} />
                  ))}
                </div>
              ) : log.items && log.items.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {log.items.map((item) => (
                    <div key={item._id} className="flex-between" style={{ padding: '12px 16px', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-light)', borderRadius: '8px' }}>
                      <div>
                        <strong style={{ fontSize: '15px' }}>{item.name}</strong>
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                          {item.quantity} {item.unit} | P: {item.protein}g | C: {item.carbs}g | F: {item.fat}g | Fiber: {item.fiber || 0}g
                        </div>
                      </div>
                      <div className="gap-10">
                        <span className="text-cyan" style={{ fontWeight: '600', fontSize: '15px' }}>{item.calories} kcal</span>
                        
                        <button
                          onClick={() => handleSaveItemAsFavorite(item)}
                          title="Save this meal item to favorites"
                          style={{ border: 'none', background: 'none', cursor: 'pointer', display: 'flex', padding: '6px', color: 'var(--text-secondary)' }}
                        >
                          <Star size={15} />
                        </button>
                        
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
                <div style={{ 
                  textAlign: 'center', 
                  padding: '32px 16px', 
                  border: '1px dashed var(--border-light)', 
                  borderRadius: '12px',
                  background: 'rgba(255,255,255,0.005)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '12px'
                }} className="card-hover-glow hover-scale">
                  <Utensils size={24} style={{ color: 'var(--accent-cyan)', opacity: 0.6 }} />
                  <div style={{ fontSize: '13.5px', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                    No meals logged today. Log your first meal or quick-add calorie presets.
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Goal Monitoring & Favorites */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
            {/* Daily Goal Progression Panel */}
            <div className="card">
              <h3 style={{ marginBottom: '16px', borderBottom: '1px solid var(--border-light)', paddingBottom: '10px' }}>Daily Goal Monitoring</h3>
              
              <div style={{ textAlign: 'center', margin: '10px 0 20px 0' }}>
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 'bold', textTransform: 'uppercase' }}>Total Calories Eaten</span>
                <div className="widget-value text-cyan" style={{ fontSize: '40px', marginTop: '6px', fontWeight: '800', fontFamily: 'var(--font-display)' }}>
                  {log.totalCalories} <span style={{ fontSize: '16px', color: 'var(--text-muted)', fontWeight: 'normal' }}>/ {profile.targetCalories} kcal</span>
                </div>
              </div>

              {/* Calories Progress bar */}
              <div>
                <div className="macro-row" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ fontSize: '13px', fontWeight: '600' }}>Calories Target</span>
                  <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{Math.round((log.totalCalories / (profile.targetCalories || 2000)) * 100)}%</span>
                </div>
                <div className="progress-bar-bg" style={{ height: '8px', background: 'rgba(255,255,255,0.03)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div 
                    className="progress-bar-fill" 
                    style={{ 
                      height: '100%',
                      width: `${Math.min((log.totalCalories / (profile.targetCalories || 2000)) * 100, 100)}%`,
                      background: 'var(--accent-cyan)',
                      borderRadius: '4px',
                      transition: 'var(--transition)'
                    }}
                  />
                </div>
              </div>

              {/* Protein Progress bar */}
              <div style={{ marginTop: '16px' }}>
                <div className="macro-row" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ fontSize: '13px', fontWeight: '600' }}>Protein Target</span>
                  <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{log.totalProtein}g / {profile.targetProtein}g ({Math.round((log.totalProtein / (profile.targetProtein || 120)) * 100)}%)</span>
                </div>
                <div className="progress-bar-bg" style={{ height: '8px', background: 'rgba(255,255,255,0.03)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div 
                    className="progress-bar-fill" 
                    style={{ 
                      height: '100%',
                      width: `${Math.min((log.totalProtein / (profile.targetProtein || 120)) * 100, 100)}%`,
                      background: 'var(--primary)',
                      borderRadius: '4px',
                      transition: 'var(--transition)'
                    }}
                  />
                </div>
              </div>

              {/* Carbohydrates Progress bar */}
              <div style={{ marginTop: '16px' }}>
                <div className="macro-row" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ fontSize: '13px', fontWeight: '600' }}>Carbohydrates Limit</span>
                  <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{log.totalCarbs}g / {profile.targetCarbs}g ({Math.round((log.totalCarbs / (profile.targetCarbs || 200)) * 100)}%)</span>
                </div>
                <div className="progress-bar-bg" style={{ height: '8px', background: 'rgba(255,255,255,0.03)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div 
                    className="progress-bar-fill" 
                    style={{ 
                      height: '100%',
                      width: `${Math.min((log.totalCarbs / (profile.targetCarbs || 200)) * 100, 100)}%`,
                      background: 'var(--accent-purple)',
                      borderRadius: '4px',
                      transition: 'var(--transition)'
                    }}
                  />
                </div>
              </div>

              {/* Fat Progress bar */}
              <div style={{ marginTop: '16px' }}>
                <div className="macro-row" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ fontSize: '13px', fontWeight: '600' }}>Fats Limit</span>
                  <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{log.totalFat}g / {profile.targetFat}g ({Math.round((log.totalFat / (profile.targetFat || 60)) * 100)}%)</span>
                </div>
                <div className="progress-bar-bg" style={{ height: '8px', background: 'rgba(255,255,255,0.03)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div 
                    className="progress-bar-fill" 
                    style={{ 
                      height: '100%',
                      width: `${Math.min((log.totalFat / (profile.targetFat || 60)) * 100, 100)}%`,
                      background: 'var(--accent-orange)',
                      borderRadius: '4px',
                      transition: 'var(--transition)'
                    }}
                  />
                </div>
              </div>

              {/* Fiber Progress bar */}
              <div style={{ marginTop: '16px' }}>
                <div className="macro-row" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ fontSize: '13px', fontWeight: '600' }}>Dietary Fiber Target</span>
                  <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{log.totalFiber}g / {profile.targetFiber || 25}g ({Math.round((log.totalFiber / (profile.targetFiber || 25)) * 100)}%)</span>
                </div>
                <div className="progress-bar-bg" style={{ height: '8px', background: 'rgba(255,255,255,0.03)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div 
                    className="progress-bar-fill" 
                    style={{ 
                      height: '100%',
                      width: `${Math.min((log.totalFiber / (profile.targetFiber || 25)) * 100, 100)}%`,
                      background: 'var(--accent-emerald)',
                      borderRadius: '4px',
                      transition: 'var(--transition)'
                    }}
                  />
                </div>
              </div>

              <button 
                className="btn btn-secondary" 
                style={{ width: '100%', marginTop: '24px', fontSize: '13px' }}
                onClick={() => setIsOnboardingOpen(true)}
              >
                Re-calculate Targets Onboarding
              </button>
            </div>

            {/* Favorite Meals presets card */}
            <div className="card">
              <h3 style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Heart size={18} className="text-purple" /> Favorite Meals templates
              </h3>
              {favorites.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {favorites.map((fav) => (
                    <div key={fav._id} style={{ padding: '12px', background: 'rgba(255,255,255,0.015)', border: '1px solid var(--border-light)', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: '13.5px', fontWeight: 'bold' }}>{fav.name}</span>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                          Cals: {fav.calories} | P: {fav.protein}g | C: {fav.carbs}g | F: {fav.fat}g | Fib: {fav.fiber || 0}g
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button
                          onClick={() => handleAddFavoriteToLog(fav._id)}
                          className="btn btn-secondary"
                          style={{ padding: '4px 8px', fontSize: '10.5px' }}
                          title="Log this preset to today"
                        >
                          Quick Log
                        </button>
                        <button
                          onClick={() => handleDeleteFavoriteMeal(fav._id)}
                          style={{ border: 'none', background: 'none', cursor: 'pointer', padding: '6px', color: 'var(--text-secondary)' }}
                          title="Delete favorite template"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ color: 'var(--text-muted)', fontSize: '13px', fontStyle: 'italic', padding: '10px 0', textAlign: 'center' }}>
                  No favorite meals saved yet.
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Nutrition Analytics Tab View */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          
          {/* Top Row Circular Gauges */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
            
            {/* Nutrition Adherence Score Ring */}
            <div className="card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
              <h4 style={{ marginBottom: '16px', fontSize: '15px', color: 'var(--text-secondary)', fontWeight: 'bold' }}>Nutrition Balance Score</h4>
              {loadingAnalytics ? (
                <div style={{ height: '100px', display: 'flex', alignItems: 'center' }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Loading analytics...</span>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                  <div style={{ position: 'relative', width: '100px', height: '100px' }}>
                    <svg width="100" height="100" viewBox="0 0 100 100">
                      <circle cx="50" cy="50" r="40" fill="transparent" stroke="rgba(255, 255, 255, 0.05)" strokeWidth="8" />
                      <circle 
                        cx="50" cy="50" r="40" fill="transparent" stroke="var(--accent-cyan)" strokeWidth="8" 
                        strokeDasharray={2 * Math.PI * 40}
                        strokeDashoffset={2 * Math.PI * 40 - ((analytics?.nutritionScore || 0) / 100) * (2 * Math.PI * 40)}
                        strokeLinecap="round"
                        transform="rotate(-90 50 50)"
                      />
                    </svg>
                    <div style={{ position: 'absolute', top: 0, left: 0, width: '100px', height: '100px', display: 'flex', alignItems: 'center', justify: 'center', fontSize: '18px', fontWeight: '800', color: 'var(--text-primary)' }}>
                      {analytics?.nutritionScore || 0}%
                    </div>
                  </div>
                  <div style={{ textAlign: 'left', fontSize: '13px', color: 'var(--text-secondary)' }}>
                    <p style={{ lineHeight: '1.4' }}>Calculated by parsing your daily calorie goals compliance and protein ratios adherence over the last week.</p>
                  </div>
                </div>
              )}
            </div>

            {/* Weekly Adherence Ring */}
            <div className="card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
              <h4 style={{ marginBottom: '16px', fontSize: '15px', color: 'var(--text-secondary)', fontWeight: 'bold' }}>Weekly Calorie Adherence</h4>
              {loadingAnalytics ? (
                <div style={{ height: '100px', display: 'flex', alignItems: 'center' }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Loading analytics...</span>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                  <div style={{ position: 'relative', width: '100px', height: '100px' }}>
                    <svg width="100" height="100" viewBox="0 0 100 100">
                      <circle cx="50" cy="50" r="40" fill="transparent" stroke="rgba(255, 255, 255, 0.05)" strokeWidth="8" />
                      <circle 
                        cx="50" cy="50" r="40" fill="transparent" stroke="var(--accent-purple)" strokeWidth="8" 
                        strokeDasharray={2 * Math.PI * 40}
                        strokeDashoffset={2 * Math.PI * 40 - ((analytics?.weeklyAdherenceScore || 0) / 100) * (2 * Math.PI * 40)}
                        strokeLinecap="round"
                        transform="rotate(-90 50 50)"
                      />
                    </svg>
                    <div style={{ position: 'absolute', top: 0, left: 0, width: '100px', height: '100px', display: 'flex', alignItems: 'center', justify: 'center', fontSize: '18px', fontWeight: '800', color: 'var(--text-primary)' }}>
                      {analytics?.weeklyAdherenceScore || 0}%
                    </div>
                  </div>
                  <div style={{ textAlign: 'left', fontSize: '13px', color: 'var(--text-secondary)' }}>
                    <p style={{ lineHeight: '1.4' }}>Percentage of logged days where total calories consumed matched within $\pm 10\%$ of target parameters.</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* AI Suggestions and Achievements Section */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px' }}>
            
            {/* AI suggestions card */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
              <h4 style={{ marginBottom: '16px', fontSize: '15px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold' }}>
                <Sparkles size={16} className="text-cyan animate-pulse" /> AI Nutritional Recommendations
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {analytics?.suggestions && analytics.suggestions.length > 0 ? (
                  analytics.suggestions.map((sug, idx) => (
                    <div 
                      key={idx} 
                      style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '10px', 
                        padding: '12px 14px', 
                        borderRadius: '8px', 
                        background: 'rgba(6, 182, 212, 0.03)', 
                        border: '1px solid rgba(6, 182, 212, 0.08)' 
                      }}
                    >
                      <Sparkles size={16} className="text-cyan" style={{ flexShrink: 0 }} />
                      <span style={{ fontSize: '13px', color: 'var(--text-primary)', lineHeight: '1.4' }}>
                        {sug}
                      </span>
                    </div>
                  ))
                ) : (
                  <div style={{ color: 'var(--text-muted)', fontSize: '13px', fontStyle: 'italic', padding: '10px 0' }}>
                    Log calorie logs over multiple days to trigger intelligence coaching.
                  </div>
                )}
              </div>
            </div>

            {/* Achievements and Surplus/Deficit log summary */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
              <h4 style={{ marginBottom: '16px', fontSize: '15px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold' }}>
                <Trophy size={16} className="text-cyan" /> Nutrition Milestones & Deficits Analysis
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {analytics?.achievements && analytics.achievements.length > 0 ? (
                  analytics.achievements.map((ach, idx) => (
                    <div 
                      key={idx} 
                      style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '10px', 
                        padding: '10px 12px', 
                        borderRadius: '8px', 
                        background: 'rgba(255, 255, 255, 0.015)', 
                        border: '1px solid var(--border-light)' 
                      }}
                    >
                      <TrendingUp size={16} className="text-cyan" style={{ flexShrink: 0 }} />
                      <span style={{ fontSize: '13px', color: 'var(--text-primary)', lineHeight: '1.4' }}>
                        {ach}
                      </span>
                    </div>
                  ))
                ) : (
                  <div style={{ color: 'var(--text-muted)', fontSize: '13px', fontStyle: 'italic', padding: '10px 0' }}>
                    Complete meal logs to trigger progressive overload reports.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Stats breakdown grid */}
          <div className="card">
            <h4 style={{ marginBottom: '16px', fontSize: '15px', color: 'var(--text-secondary)', fontWeight: 'bold' }}>Weekly Averages Summary (Last 7 days)</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '16px' }}>
              <div style={{ padding: '16px', borderRadius: '8px', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-light)', textAlign: 'center' }}>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Average Calories</div>
                <div style={{ fontSize: '20px', fontWeight: 'bold', color: 'var(--text-primary)', marginTop: '8px' }}>
                  {analytics?.calorieAnalysis?.avgIntake || 0} kcal
                </div>
              </div>
              <div style={{ padding: '16px', borderRadius: '8px', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-light)', textAlign: 'center' }}>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Average Protein</div>
                <div style={{ fontSize: '20px', fontWeight: 'bold', color: 'var(--text-primary)', marginTop: '8px' }}>
                  {analytics?.calorieAnalysis?.avgProtein || 0}g
                </div>
              </div>
              <div style={{ padding: '16px', borderRadius: '8px', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-light)', textAlign: 'center' }}>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Average Carbs</div>
                <div style={{ fontSize: '20px', fontWeight: 'bold', color: 'var(--text-primary)', marginTop: '8px' }}>
                  {analytics?.calorieAnalysis?.avgCarbs || 0}g
                </div>
              </div>
              <div style={{ padding: '16px', borderRadius: '8px', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-light)', textAlign: 'center' }}>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Average Fat</div>
                <div style={{ fontSize: '20px', fontWeight: 'bold', color: 'var(--text-primary)', marginTop: '8px' }}>
                  {analytics?.calorieAnalysis?.avgFat || 0}g
                </div>
              </div>
              <div style={{ padding: '16px', borderRadius: '8px', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-light)', textAlign: 'center' }}>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Average Fiber</div>
                <div style={{ fontSize: '20px', fontWeight: 'bold', color: 'var(--text-primary)', marginTop: '8px' }}>
                  {analytics?.calorieAnalysis?.avgFiber || 0}g
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <OnboardingModal 
        section="nutrition" 
        isOpen={isOnboardingOpen} 
        onClose={() => {
          setIsOnboardingOpen(false);
          fetchLogAndProfile();
        }} 
      />
    </div>
  );
};

export default CalorieCalculator;
