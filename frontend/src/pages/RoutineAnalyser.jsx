import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Clock, Calendar, Check, Save } from 'lucide-react';

const RoutineAnalyser = () => {
  const { token, API_URL } = useAuth();
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const ACTIVITIES = [
    { value: '', label: '💤 Unassigned / Rest' },
    { value: 'sleep', label: '🛌 Sleep' },
    { value: 'work', label: '💼 Job / Work' },
    { value: 'coding', label: '💻 Coding / Study' },
    { value: 'workout', label: '🏋️ Exercise / Gym' },
    { value: 'meals', label: '🍽️ Meals / Eating' },
    { value: 'leisure', label: '🎮 Leisure / Play' },
    { value: 'unproductive', label: '📱 Scrolling / Waste' },
  ];

  const fetchRoutine = async () => {
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const res = await fetch(`${API_URL}/routines/${date}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setSlots(data.slots || []);
    } catch (err) {
      setError('Failed to fetch routine log.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoutine();
  }, [date]);

  const handleSlotChange = (hour, field, value) => {
    setSlots(prev => prev.map(s => {
      if (s.hour === hour) {
        return { ...s, [field]: value };
      }
      return s;
    }));
  };

  const handleSaveRoutine = async () => {
    setSaving(true);
    setError('');
    setMessage('');

    try {
      const res = await fetch(`${API_URL}/routines/${date}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ slots })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      setSlots(data.slots);
      setMessage('📋 Routine saved successfully. Older data is pruned automatically.');
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setError('Failed to save daily routine.');
    } finally {
      setSaving(false);
    }
  };

  const formatHourLabel = (h) => {
    const startStr = h < 10 ? `0${h}:00` : `${h}:00`;
    const endHour = h + 1;
    const endStr = endHour < 10 ? `0${endHour}:00` : `${endHour}:00`;
    return `${startStr} - ${endStr}`;
  };

  return (
    <div className="main-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">Routine Analyser</h1>
          <p className="page-subtitle">Map your hour-by-hour activity to analyze weekly trends</p>
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
      {message && <div className="text-emerald" style={{ marginBottom: '15px', fontWeight: '500' }}>{message}</div>}

      <div className="card">
        <div className="flex-between" style={{ marginBottom: '24px', borderBottom: '1px solid var(--border-light)', paddingBottom: '16px' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Clock size={20} className="text-orange" /> Hourly Slot Scheduler
          </h3>
          <button 
            className="btn btn-primary"
            onClick={handleSaveRoutine}
            disabled={saving}
          >
            <Save size={16} />
            {saving ? 'Saving...' : 'Save Schedule'}
          </button>
        </div>

        {loading ? (
          <p style={{ color: 'var(--text-muted)' }}>Loading schedule...</p>
        ) : (
          <div className="routine-grid">
            {slots.map((slot) => (
              <div key={slot.hour} className="routine-hour-card">
                <span className="routine-hour-label">
                  {formatHourLabel(slot.hour)}
                </span>
                
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <select 
                    className="input-field" 
                    style={{ padding: '6px 10px', fontSize: '13px' }}
                    value={slot.activity}
                    onChange={(e) => handleSlotChange(slot.hour, 'activity', e.target.value)}
                  >
                    {ACTIVITIES.map(act => (
                      <option key={act.value} value={act.value}>{act.label}</option>
                    ))}
                  </select>
                  
                  <input 
                    type="text" 
                    placeholder="Short description / details..." 
                    className="input-field"
                    style={{ padding: '6px 10px', fontSize: '12px' }}
                    value={slot.notes}
                    onChange={(e) => handleSlotChange(slot.hour, 'notes', e.target.value)}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default RoutineAnalyser;
