import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import { 
  Utensils, 
  Dumbbell, 
  Clock, 
  Calendar, 
  FileText, 
  Bell, 
  Sparkles,
  ArrowRight,
  TrendingUp
} from 'lucide-react';

const Dashboard = () => {
  const { user, token, API_URL } = useAuth();
  const [data, setData] = useState({
    caloriesEaten: 0,
    calorieTarget: 2000,
    workoutStatus: 'No workout logged today',
    workoutCompleted: 0,
    workoutTotal: 0,
    routineFilledHours: 0,
    weeklyGoalProgress: 0,
    notesCount: 0,
  });

  const [reminderReport, setReminderReport] = useState(null);
  const [fetchingReport, setFetchingReport] = useState(false);
  const [reportError, setReportError] = useState('');

  const todayStr = new Date().toISOString().split('T')[0];

  useEffect(() => {
    const fetchDashboardStats = async () => {
      try {
        // 1. Fetch Nutrition
        const nutritionRes = await fetch(`${API_URL}/nutrition/${todayStr}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const nutritionData = await nutritionRes.json();
        
        // 2. Fetch Profile targets
        const profileRes = await fetch(`${API_URL}/profile`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const profileData = await profileRes.json();

        // 3. Fetch Workout Log
        const workoutRes = await fetch(`${API_URL}/workouts/${todayStr}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const workoutData = await workoutRes.json();

        // 4. Fetch Routine Log
        const routineRes = await fetch(`${API_URL}/routines/${todayStr}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const routineData = await routineRes.json();

        // 5. Fetch Notes Count
        const notesRes = await fetch(`${API_URL}/notes`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const notesData = await notesRes.json();

        // 6. Fetch Week Goals
        const startOfWeek = () => {
          const date = new Date();
          const day = date.getDay();
          const diff = date.getDate() - day + (day === 0 ? -6 : 1);
          return new Date(date.setDate(diff)).toISOString().split('T')[0];
        };
        const weekGoalsRes = await fetch(`${API_URL}/week-goals/${startOfWeek()}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const goalsData = await weekGoalsRes.json();

        // Calculate progress
        let progressSum = 0;
        if (goalsData.length > 0) {
          const totalProgress = goalsData.reduce((acc, curr) => acc + curr.progress, 0);
          progressSum = Math.round(totalProgress / goalsData.length);
        }

        const completedWorkoutEx = workoutData.exercises ? workoutData.exercises.filter(ex => ex.completed).length : 0;
        const totalWorkoutEx = workoutData.exercises ? workoutData.exercises.length : 0;
        let wkStatus = 'No workout logged';
        if (workoutData.skipped) {
          wkStatus = 'Workout Skipped';
        } else if (totalWorkoutEx > 0) {
          wkStatus = `${completedWorkoutEx}/${totalWorkoutEx} exercises completed`;
        }

        const routineFilled = routineData.slots ? routineData.slots.filter(s => s.activity !== '').length : 0;

        setData({
          caloriesEaten: nutritionData.totalCalories || 0,
          calorieTarget: profileData.targetCalories || 2000,
          workoutStatus: wkStatus,
          workoutCompleted: completedWorkoutEx,
          workoutTotal: totalWorkoutEx,
          routineFilledHours: routineFilled,
          weeklyGoalProgress: progressSum,
          notesCount: notesData.length || 0,
        });

      } catch (err) {
        console.error('Error fetching dashboard statistics:', err);
      }
    };

    fetchDashboardStats();
  }, [token]);

  const handleFetchReport = async () => {
    setFetchingReport(true);
    setReportError('');
    try {
      const res = await fetch(`${API_URL}/reminders/today`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const reportData = await res.json();
      if (!res.ok) throw new Error(reportData.message);
      
      setReminderReport(reportData);
    } catch (err) {
      setReportError(err.message || 'Could not fetch report.');
    } finally {
      setFetchingReport(false);
    }
  };

  return (
    <div className="main-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">
            Dashboard
          </h1>
          <p className="page-subtitle">
            Welcome back, {user ? user.name : 'User'}! Here is your daily summary updates.
          </p>
        </div>
        <div style={{ background: 'rgba(99, 102, 241, 0.1)', border: '1px solid var(--border-glow)', padding: '10px 18px', borderRadius: '30px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: '500' }}>
          <TrendingUp size={16} className="text-cyan" />
          <span>Active Streak: <strong>Healthy</strong></span>
        </div>
      </div>

      <div className="dashboard-grid">
        {/* Calorie Tracker Widget */}
        <div className="card widget-card">
          <div className="widget-header">
            <span className="widget-title">Daily Calories</span>
            <Utensils size={22} className="text-cyan" />
          </div>
          <div>
            <div className="widget-value text-cyan">
              {data.caloriesEaten} <span style={{ fontSize: '16px', color: 'var(--text-secondary)' }}>/ {data.calorieTarget} kcal</span>
            </div>
            <div className="progress-bar-bg" style={{ marginTop: '14px' }}>
              <div 
                className="progress-bar-fill" 
                style={{ 
                  width: `${Math.min((data.caloriesEaten / data.calorieTarget) * 100, 100)}%`,
                  background: 'var(--accent-cyan)'
                }}
              />
            </div>
          </div>
          <Link to="/calories" className="btn btn-secondary widget-action" style={{ fontSize: '12px', padding: '8px 16px' }}>
            Track Meals <ArrowRight size={14} />
          </Link>
        </div>

        {/* AI Workout Widget */}
        <div className="card widget-card">
          <div className="widget-header">
            <span className="widget-title">AI Workout</span>
            <Dumbbell size={22} className="text-purple" />
          </div>
          <div>
            <div className="widget-value text-purple" style={{ fontSize: '28px' }}>
              {data.workoutStatus}
            </div>
            {data.workoutTotal > 0 && (
              <div className="progress-bar-bg" style={{ marginTop: '14px' }}>
                <div 
                  className="progress-bar-fill" 
                  style={{ 
                    width: `${(data.workoutCompleted / data.workoutTotal) * 100}%`,
                    background: 'var(--accent-purple)'
                  }}
                />
              </div>
            )}
          </div>
          <Link to="/workouts" className="btn btn-secondary widget-action" style={{ fontSize: '12px', padding: '8px 16px' }}>
            Gym Planner <ArrowRight size={14} />
          </Link>
        </div>

        {/* Routine Widget */}
        <div className="card widget-card">
          <div className="widget-header">
            <span className="widget-title">Routine Analyzer</span>
            <Clock size={22} className="text-orange" />
          </div>
          <div>
            <div className="widget-value text-orange">
              {data.routineFilledHours} <span style={{ fontSize: '16px', color: 'var(--text-secondary)' }}>/ 24 hrs filled</span>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '10px' }}>
              Hour-by-hour time slot logger
            </p>
          </div>
          <Link to="/routine" className="btn btn-secondary widget-action" style={{ fontSize: '12px', padding: '8px 16px' }}>
            Open Tracker <ArrowRight size={14} />
          </Link>
        </div>

        {/* Weekly Scheduler Widget */}
        <div className="card widget-card">
          <div className="widget-header">
            <span className="widget-title">Week Goals</span>
            <Calendar size={22} className="text-emerald" />
          </div>
          <div>
            <div className="widget-value text-emerald">
              {data.weeklyGoalProgress}% <span style={{ fontSize: '16px', color: 'var(--text-secondary)' }}>Complete</span>
            </div>
            <div className="progress-bar-bg" style={{ marginTop: '14px' }}>
              <div 
                className="progress-bar-fill" 
                style={{ 
                  width: `${data.weeklyGoalProgress}%`,
                  background: 'var(--accent-emerald)'
                }}
              />
            </div>
          </div>
          <Link to="/scheduler" className="btn btn-secondary widget-action" style={{ fontSize: '12px', padding: '8px 16px' }}>
            Weekly Checklist <ArrowRight size={14} />
          </Link>
        </div>

        {/* Notes Taker Widget */}
        <div className="card widget-card">
          <div className="widget-header">
            <span className="widget-title">Secure Notes</span>
            <FileText size={22} style={{ color: '#ec4899' }} />
          </div>
          <div>
            <div className="widget-value" style={{ color: '#ec4899' }}>
              {data.notesCount} <span style={{ fontSize: '16px', color: 'var(--text-secondary)' }}>Notes created</span>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '10px' }}>
              Encrypted password-locked storage
            </p>
          </div>
          <Link to="/notes" className="btn btn-secondary widget-action" style={{ fontSize: '12px', padding: '8px 16px' }}>
            Open Drawer <ArrowRight size={14} />
          </Link>
        </div>

        {/* Daily Updates Live Check */}
        <div className="card widget-card" style={{ gridColumn: '1 / -1' }}>
          <div className="widget-header" style={{ marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Bell size={20} className="text-cyan" />
              <span style={{ fontSize: '18px', fontWeight: '600' }}>10:00 PM Daily Alert Report</span>
            </div>
            <button 
              className="btn btn-primary" 
              onClick={handleFetchReport}
              disabled={fetchingReport}
              style={{ fontSize: '12px', padding: '8px 16px' }}
            >
              {fetchingReport ? 'Compiling Summary...' : 'Fetch Today\'s 10 PM Report'}
            </button>
          </div>
          
          <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px dashed var(--border-light)', borderRadius: '8px', padding: '20px', minHeight: '100px' }}>
            {reportError && <div className="text-red">{reportError}</div>}
            {reminderReport ? (
              reminderReport.subscribed ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
                  <div style={{ borderLeft: '3px solid var(--accent-cyan)', paddingLeft: '12px' }}>
                    <h4 style={{ color: 'var(--accent-cyan)', marginBottom: '4px' }}>🍎 Nutrition</h4>
                    <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', lineHeight: '1.4' }}>{reminderReport.report.nutrition}</p>
                  </div>
                  <div style={{ borderLeft: '3px solid var(--accent-purple)', paddingLeft: '12px' }}>
                    <h4 style={{ color: 'var(--accent-purple)', marginBottom: '4px' }}>💪 Gym & Exercise</h4>
                    <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', lineHeight: '1.4' }}>{reminderReport.report.workout}</p>
                  </div>
                  <div style={{ borderLeft: '3px solid var(--accent-emerald)', paddingLeft: '12px' }}>
                    <h4 style={{ color: 'var(--accent-emerald)', marginBottom: '4px' }}>📅 Goals Status</h4>
                    <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', lineHeight: '1.4' }}>{reminderReport.report.weeklyGoals}</p>
                  </div>
                </div>
              ) : (
                <p style={{ color: 'var(--text-muted)', fontSize: '14px', textAlign: 'center' }}>
                  {reminderReport.message} (You can enable updates in the Settings tab).
                </p>
              )
            ) : (
              <p style={{ color: 'var(--text-muted)', fontSize: '14px', textAlign: 'center', paddingTop: '15px' }}>
                Click the button above to generate a preview of your daily 10 PM update email dispatch.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
