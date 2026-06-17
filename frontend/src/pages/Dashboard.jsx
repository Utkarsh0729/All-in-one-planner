import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import { 
  Utensils, 
  Dumbbell, 
  Calendar, 
  Bell, 
  Sparkles,
  Zap,
  Target,
  Flame,
  Brain,
  ChevronRight
} from 'lucide-react';

const Dashboard = () => {
  const { user, token, API_URL } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    caloriesEaten: 0,
    calorieTarget: 2000,
    workoutStatus: 'No workout logged',
    workoutCompleted: 0,
    workoutTotal: 0,
    workoutCompletionPct: 0,
    routineFilledHours: 0,
    weeklyGoalProgress: 0,
    notesCount: 0,
    focusScore: 0,
    productivityScore: 0,
    currentStreak: 0,
    streakType: 'No Active Streak',
    
    // Weekly Snapshot Stats
    weeklyProductiveHours: 0,
    weeklyWorkoutsCompleted: 0,
    nutritionAdherence: 0,
    goalCompletionRate: 0,

    // Recommendations list
    recommendations: []
  });

  const [reminderReport, setReminderReport] = useState(null);
  const [fetchingReport, setFetchingReport] = useState(false);
  const [reportError, setReportError] = useState('');

  useEffect(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const fetchDashboardStats = async () => {
      setLoading(true);
      try {
        let caloriesEaten = 0;
        let calorieTarget = 2000;
        let workoutStatus = 'No workout logged';
        let workoutCompleted = 0;
        let workoutTotal = 0;
        let workoutStreak = 0;
        let healthyEatingStreak = 0;
        let productivityStreak = 0;
        let goalCompletionStreak = 0;
        let goalCompletionRate = 0;

        const headers = { Authorization: `Bearer ${token}` };

        // Define fetching sub-jobs to run in parallel
        const loadProfile = async () => {
          try {
            const res = await fetch(`${API_URL}/profile`, { headers });
            if (res.ok) {
              const profileData = await res.json();
              calorieTarget = profileData.targetCalories || 2000;
            }
          } catch (e) {
            console.error('Error fetching profile targets:', e);
          }
        };

        const loadNutrition = async () => {
          try {
            const res = await fetch(`${API_URL}/nutrition/${todayStr}`, { headers });
            if (res.ok) {
              const nutritionData = await res.json();
              caloriesEaten = nutritionData.totalCalories || 0;
            }
          } catch (e) {
            console.error('Error fetching nutrition logs:', e);
          }
        };

        const loadWorkout = async () => {
          try {
            const res = await fetch(`${API_URL}/workouts/${todayStr}`, { headers });
            if (res.ok) {
              const workoutData = await res.json();
              workoutCompleted = workoutData.exercises ? workoutData.exercises.filter(ex => ex.completed).length : 0;
              workoutTotal = workoutData.exercises ? workoutData.exercises.length : 0;
              if (workoutData.skipped) {
                workoutStatus = 'Workout Skipped';
              } else if (workoutTotal > 0) {
                workoutStatus = `${workoutCompleted}/${workoutTotal} exercises done`;
              }
            }
          } catch (e) {
            console.error('Error fetching workout logs:', e);
          }
        };

        const loadGoalsAnalytics = async () => {
          try {
            const res = await fetch(`${API_URL}/week-goals/analytics/summary`, { headers });
            if (res.ok) {
              const goalsAnalytics = await res.json();
              goalCompletionRate = goalsAnalytics.goalCompletionPct || 0;
              workoutStreak = goalsAnalytics.streaks?.workoutStreak || 0;
              healthyEatingStreak = goalsAnalytics.streaks?.healthyEatingStreak || 0;
              productivityStreak = goalsAnalytics.streaks?.productivityStreak || 0;
              goalCompletionStreak = goalsAnalytics.streaks?.goalCompletionStreak || 0;
            }
          } catch (e) {
            console.error('Error fetching goals analytics:', e);
          }
        };

        // Fire all fetches in parallel to eliminate blocking sequential request lag
        await Promise.all([
          loadProfile(),
          loadNutrition(),
          loadWorkout(),
          loadGoalsAnalytics()
        ]);

        // Determine maximum active streak and its label
        const maxStreak = Math.max(workoutStreak, healthyEatingStreak, productivityStreak);
        let activeStreak = 0;
        let streakLabel = 'No Active Streak';

        if (maxStreak > 0) {
          activeStreak = maxStreak;
          if (maxStreak === workoutStreak) streakLabel = `${workoutStreak}-Day Workout Streak`;
          else if (maxStreak === healthyEatingStreak) streakLabel = `${healthyEatingStreak}-Day Healthy eating`;
          else streakLabel = `${productivityStreak}-Day Productivity`;
        } else if (goalCompletionStreak > 0) {
          activeStreak = goalCompletionStreak;
          streakLabel = `${goalCompletionStreak}-Week Goal Streak`;
        }

        const workoutCompletionPct = workoutTotal > 0 ? Math.round((workoutCompleted / workoutTotal) * 100) : 0;

        setData({
          caloriesEaten,
          calorieTarget,
          workoutStatus,
          workoutCompleted,
          workoutTotal,
          workoutCompletionPct,
          weeklyGoalProgress: goalCompletionRate,
          currentStreak: activeStreak,
          streakType: streakLabel,
          goalCompletionRate
        });

      } catch (err) {
        console.error('Failed to aggregate dashboard metrics:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardStats();
  }, [token, API_URL]);

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

  const caloriesRemaining = Math.max(0, data.calorieTarget - data.caloriesEaten);
  const caloriesExceeded = data.caloriesEaten > data.calorieTarget ? data.caloriesEaten - data.calorieTarget : 0;

  return (
    <div className="main-content page-fade-in">
      {/* Dashboard Top Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Command Center</h1>
          <p className="page-subtitle">
            Welcome back, {user ? user.name : 'Member'}! Here is your daily intelligence report.
          </p>
        </div>
        {data.currentStreak > 0 && (
          <div style={{ 
            background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(249, 115, 22, 0.1) 100%)', 
            border: '1px solid rgba(249, 115, 22, 0.3)', 
            padding: '10px 18px', 
            borderRadius: '30px', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px', 
            fontSize: '13px', 
            fontWeight: '600',
            boxShadow: '0 4px 15px -3px rgba(249, 115, 22, 0.15)'
          }}>
            <Flame size={18} style={{ color: '#f97316' }} />
            <span>Active Streak: <strong style={{ color: '#f97316' }}>{data.streakType}</strong></span>
          </div>
        )}
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }} className="page-fade-in">
          {/* KPI Cards Skeleton Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '20px' }}>
            {[1, 2, 3, 4].map(n => (
              <div key={n} className="card skeleton" style={{ height: '110px', border: 'none' }} />
            ))}
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          
          {/* KPI Cards Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '20px' }}>
            
            {/* KPI 1: Calories Remaining */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '18px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: '600' }}>Remaining Cal</span>
                <Utensils size={18} className="text-cyan" />
              </div>
              <div style={{ marginTop: '16px' }}>
                <div style={{ fontSize: '28px', fontWeight: '800', fontFamily: 'var(--font-display)', color: caloriesExceeded > 0 ? 'var(--text-red)' : 'var(--accent-cyan)' }}>
                  {caloriesRemaining} <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>kcal</span>
                </div>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginTop: '4px' }}>
                  {caloriesExceeded > 0 ? `Exceeded by ${caloriesExceeded} kcal` : `Eaten: ${data.caloriesEaten} kcal`}
                </span>
              </div>
            </div>

            {/* KPI 2: Workout Completion */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '18px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: '600' }}>Workout Complete</span>
                <Dumbbell size={18} className="text-purple" />
              </div>
              <div style={{ marginTop: '16px' }}>
                <div style={{ fontSize: '28px', fontWeight: '800', fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>
                  {data.workoutCompletionPct}%
                </div>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginTop: '4px' }}>
                  {data.workoutStatus}
                </span>
              </div>
            </div>

            {/* KPI 3: Weekly Goal Progress */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '18px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: '600' }}>Goal Progress</span>
                <Target size={18} className="text-emerald" />
              </div>
              <div style={{ marginTop: '16px' }}>
                <div style={{ fontSize: '28px', fontWeight: '800', fontFamily: 'var(--font-display)', color: 'var(--accent-emerald)' }}>
                  {data.weeklyGoalProgress}%
                </div>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginTop: '4px' }}>
                  Current week checklist
                </span>
              </div>
            </div>

            {/* KPI 4: Current Streak Display */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '18px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: '600' }}>Current Streak</span>
                <Flame size={18} style={{ color: '#fbbf24' }} />
              </div>
              <div style={{ marginTop: '16px' }}>
                <div style={{ fontSize: '28px', fontWeight: '800', fontFamily: 'var(--font-display)', color: '#fbbf24' }}>
                  {data.currentStreak} <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>{data.currentStreak === 1 ? 'day' : 'days'}</span>
                </div>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginTop: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {data.currentStreak > 0 ? data.streakType.split('-')[1] || 'Consistent activity' : 'Keep logging data!'}
                </span>
              </div>
            </div>

          </div>

          {/* Daily 10 PM Report Summary Alert */}
          <div className="card" style={{ borderLeft: '3px solid var(--accent-cyan)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Bell size={20} className="text-cyan" />
                <span style={{ fontSize: '18px', fontWeight: '700' }}>10:00 PM Daily Alert Report</span>
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
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}>
                    <div style={{ borderLeft: '3px solid var(--accent-cyan)', paddingLeft: '12px' }}>
                      <h4 style={{ color: 'var(--accent-cyan)', marginBottom: '4px', fontSize: '14px', fontWeight: '700' }}>🍎 Nutrition</h4>
                      <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.4' }}>{reminderReport.report.nutrition}</p>
                    </div>
                    <div style={{ borderLeft: '3px solid var(--accent-purple)', paddingLeft: '12px' }}>
                      <h4 style={{ color: 'var(--accent-purple)', marginBottom: '4px', fontSize: '14px', fontWeight: '700' }}>💪 Gym & Exercise</h4>
                      <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.4' }}>{reminderReport.report.workout}</p>
                    </div>
                    <div style={{ borderLeft: '3px solid var(--accent-emerald)', paddingLeft: '12px' }}>
                      <h4 style={{ color: 'var(--accent-emerald)', marginBottom: '4px', fontSize: '14px', fontWeight: '700' }}>📅 Goals Status</h4>
                      <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.4' }}>{reminderReport.report.weeklyGoals}</p>
                    </div>
                  </div>
                ) : (
                  <p style={{ color: 'var(--text-muted)', fontSize: '14px', textAlign: 'center' }}>
                    {reminderReport.message} (You can enable updates in the Settings tab).
                  </p>
                )
              ) : (
                <p style={{ color: 'var(--text-muted)', fontSize: '14.5px', textAlign: 'center', paddingTop: '15px' }}>
                  Click the button above to generate a preview of your daily 10 PM update email dispatch.
                </p>
              )}
            </div>
          </div>

        </div>
      )}
    </div>
  );
};

export default Dashboard;
