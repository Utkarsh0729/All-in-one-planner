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
        let routineFilledHours = 0;
        let notesCount = 0;
        let focusScore = 0;
        let productivityScore = 0;
        let workoutStreak = 0;
        let healthyEatingStreak = 0;
        let productivityStreak = 0;
        let goalCompletionStreak = 0;
        let weeklyProductiveHours = 0;
        let weeklyWorkoutsCompleted = 0;
        let nutritionAdherence = 0;
        let goalCompletionRate = 0;
        let rawRecommendations = [];

        const headers = { Authorization: `Bearer ${token}` };

        // 1. Fetch Profile
        try {
          const res = await fetch(`${API_URL}/profile`, { headers });
          if (res.ok) {
            const profileData = await res.json();
            calorieTarget = profileData.targetCalories || 2000;
          }
        } catch (e) {
          console.error('Error fetching profile targets:', e);
        }

        // 2. Fetch Nutrition Eaten Today
        try {
          const res = await fetch(`${API_URL}/nutrition/${todayStr}`, { headers });
          if (res.ok) {
            const nutritionData = await res.json();
            caloriesEaten = nutritionData.totalCalories || 0;
          }
        } catch (e) {
          console.error('Error fetching nutrition logs:', e);
        }

        // 3. Fetch Workout Today
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

        // 4. Fetch Routine Today
        try {
          const res = await fetch(`${API_URL}/routines/${todayStr}`, { headers });
          if (res.ok) {
            const routineData = await res.json();
            if (routineData.activities) {
              routineFilledHours = routineData.activities.reduce((acc, curr) => acc + (Number(curr.duration) || 0), 0);
              routineFilledHours = Number(routineFilledHours.toFixed(1));
            }
          }
        } catch (e) {
          console.error('Error fetching routine logs:', e);
        }

        // 5. Fetch Notes Count
        try {
          const res = await fetch(`${API_URL}/notes`, { headers });
          if (res.ok) {
            const notesData = await res.json();
            notesCount = notesData.length || 0;
          }
        } catch (e) {
          console.error('Error fetching notes:', e);
        }

        // 6. Fetch Routine Insights (Focus Score, Productivity Score)
        try {
          const res = await fetch(`${API_URL}/routines/insights`, { headers });
          if (res.ok) {
            const routineInsights = await res.json();
            if (routineInsights && routineInsights.hasData !== false) {
              focusScore = routineInsights.focusScore || 0;
              productivityScore = routineInsights.weeklyProductivityScore || 0;
              
              if (routineInsights.insights) {
                // Add AI routine suggestions
                rawRecommendations.push({
                  source: 'Routine',
                  text: 'Check routine: ' + routineInsights.insights.split('\n')[0].replace(/[*#]/g, '').trim(),
                  type: 'tip'
                });
              }
            }
          }
        } catch (e) {
          console.error('Error fetching routine insights:', e);
        }

        // 7. Fetch Nutrition Analytics
        try {
          const res = await fetch(`${API_URL}/nutrition/analytics/summary`, { headers });
          if (res.ok) {
            const nutritionAnalytics = await res.json();
            nutritionAdherence = nutritionAnalytics.weeklyAdherenceScore || 0;
            
            if (nutritionAnalytics.suggestions && Array.isArray(nutritionAnalytics.suggestions)) {
              nutritionAnalytics.suggestions.forEach(s => {
                rawRecommendations.push({
                  source: 'Nutrition',
                  text: s,
                  type: 'alert'
                });
              });
            }
          }
        } catch (e) {
          console.error('Error fetching nutrition analytics:', e);
        }

        // 8. Fetch Goals Analytics & Streaks
        try {
          const res = await fetch(`${API_URL}/week-goals/analytics/summary`, { headers });
          if (res.ok) {
            const goalsAnalytics = await res.json();
            goalCompletionRate = goalsAnalytics.goalCompletionPct || 0;
            workoutStreak = goalsAnalytics.streaks?.workoutStreak || 0;
            healthyEatingStreak = goalsAnalytics.streaks?.healthyEatingStreak || 0;
            productivityStreak = goalsAnalytics.streaks?.productivityStreak || 0;
            goalCompletionStreak = goalsAnalytics.streaks?.goalCompletionStreak || 0;
            weeklyProductiveHours = goalsAnalytics.productiveHoursThisWeek || 0;
            weeklyWorkoutsCompleted = goalsAnalytics.workoutSessionsThisWeek || 0;

            if (goalsAnalytics.insights && Array.isArray(goalsAnalytics.insights)) {
              goalsAnalytics.insights.forEach(ins => {
                rawRecommendations.push({
                  source: 'Goals & Consistency',
                  text: ins,
                  type: 'milestone'
                });
              });
            }
          }
        } catch (e) {
          console.error('Error fetching goals analytics:', e);
        }

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

        // Append fallback recommendations if aggregate suggestions list is sparse
        if (rawRecommendations.length < 3) {
          const fallbacks = [
            { source: 'Nutrition', text: 'Protein intake is consistently low. Consider adding one protein-rich meal.', type: 'alert' },
            { source: 'Routine', text: 'You are most productive between 9 AM and 12 PM. Block notifications during this time.', type: 'tip' },
            { source: 'Goals', text: 'Goal completion is trending upward. Keep up the high checklist adherence!', type: 'milestone' }
          ];
          rawRecommendations = [...rawRecommendations, ...fallbacks];
        }

        const workoutCompletionPct = workoutTotal > 0 ? Math.round((workoutCompleted / workoutTotal) * 100) : 0;

        setData({
          caloriesEaten,
          calorieTarget,
          workoutStatus,
          workoutCompleted,
          workoutTotal,
          workoutCompletionPct,
          routineFilledHours,
          weeklyGoalProgress: goalCompletionRate,
          notesCount,
          focusScore,
          productivityScore,
          currentStreak: activeStreak,
          streakType: streakLabel,
          weeklyProductiveHours,
          weeklyWorkoutsCompleted,
          nutritionAdherence,
          goalCompletionRate,
          recommendations: rawRecommendations.slice(0, 5) // display top 5 suggestions
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
    <div className="main-content">
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
        <div style={{ color: 'var(--text-muted)', padding: '40px 0', textAlign: 'center' }}>
          Assembling intelligence command metrics...
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          
          {/* KPI Cards Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '20px' }}>
            
            {/* KPI 1: Focus Score */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column', justifycontent: 'space-between', padding: '18px', position: 'relative', overflow: 'hidden' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: '600' }}>Focus Score</span>
                <Brain size={18} className="text-cyan" />
              </div>
              <div style={{ marginTop: '16px' }}>
                <div style={{ fontSize: '28px', fontWeight: '800', fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>
                  {data.focusScore}%
                </div>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginTop: '4px' }}>
                  Waking active focus
                </span>
              </div>
            </div>

            {/* KPI 2: Productivity Score */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column', justifycontent: 'space-between', padding: '18px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: '600' }}>Productivity</span>
                <Zap size={18} className="text-orange" />
              </div>
              <div style={{ marginTop: '16px' }}>
                <div style={{ fontSize: '28px', fontWeight: '800', fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>
                  {data.productivityScore}%
                </div>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginTop: '4px' }}>
                  Productive hours ratio
                </span>
              </div>
            </div>

            {/* KPI 3: Calories Remaining */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column', justifycontent: 'space-between', padding: '18px' }}>
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

            {/* KPI 4: Workout Completion */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column', justifycontent: 'space-between', padding: '18px' }}>
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

            {/* KPI 5: Weekly Goal Progress */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column', justifycontent: 'space-between', padding: '18px' }}>
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

            {/* KPI 6: Current Streak Display */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column', justifycontent: 'space-between', padding: '18px' }}>
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

          {/* Row 2: Weekly Snapshot & Smart Recommendations */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '32px' }}>
            
            {/* Weekly Snapshot */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column', justifycontent: 'space-between' }}>
              <div>
                <h3 style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Calendar size={22} className="text-cyan" /> Weekly Snapshot
                </h3>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {/* Item 1: Productive Hours */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13.5px', marginBottom: '6px' }}>
                      <span style={{ color: 'var(--text-secondary)', fontWeight: '500' }}>Productive Hours Logged</span>
                      <strong style={{ color: 'var(--text-primary)' }}>{data.weeklyProductiveHours} hrs</strong>
                    </div>
                    <div className="progress-bar-bg">
                      <div 
                        className="progress-bar-fill" 
                        style={{ 
                          width: `${Math.min((data.weeklyProductiveHours / 40) * 100, 100)}%`, // out of 40h standard
                          background: 'var(--accent-orange)'
                        }}
                      />
                    </div>
                  </div>

                  {/* Item 2: Workout Sessions */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13.5px', marginBottom: '6px' }}>
                      <span style={{ color: 'var(--text-secondary)', fontWeight: '500' }}>Workout Sessions Completed</span>
                      <strong style={{ color: 'var(--text-primary)' }}>{data.weeklyWorkoutsCompleted} sessions</strong>
                    </div>
                    <div className="progress-bar-bg">
                      <div 
                        className="progress-bar-fill" 
                        style={{ 
                          width: `${Math.min((data.weeklyWorkoutsCompleted / 4) * 100, 100)}%`, // out of 4 targeted workouts
                          background: 'var(--accent-purple)'
                        }}
                      />
                    </div>
                  </div>

                  {/* Item 3: Nutrition Adherence */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13.5px', marginBottom: '6px' }}>
                      <span style={{ color: 'var(--text-secondary)', fontWeight: '500' }}>Nutrition Compliance Adherence</span>
                      <strong style={{ color: 'var(--text-primary)' }}>{data.nutritionAdherence}% compliant</strong>
                    </div>
                    <div className="progress-bar-bg">
                      <div 
                        className="progress-bar-fill" 
                        style={{ 
                          width: `${data.nutritionAdherence}%`,
                          background: 'var(--accent-cyan)'
                        }}
                      />
                    </div>
                  </div>

                  {/* Item 4: Goal Completion */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13.5px', marginBottom: '6px' }}>
                      <span style={{ color: 'var(--text-secondary)', fontWeight: '500' }}>Goal Completion Rate</span>
                      <strong style={{ color: 'var(--text-primary)' }}>{data.goalCompletionRate}% completed</strong>
                    </div>
                    <div className="progress-bar-bg">
                      <div 
                        className="progress-bar-fill" 
                        style={{ 
                          width: `${data.goalCompletionRate}%`,
                          background: 'var(--accent-emerald)'
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ marginTop: '24px', borderTop: '1px solid var(--border-light)', paddingTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>Quick Links:</span>
                <div style={{ display: 'flex', gap: '14px' }}>
                  <Link to="/scheduler" style={{ fontSize: '13px', color: 'var(--accent-emerald)', display: 'flex', alignItems: 'center', gap: '2px', textDecoration: 'none' }} className="hover-opacity">
                    Planner <ChevronRight size={14} />
                  </Link>
                  <Link to="/calories" style={{ fontSize: '13px', color: 'var(--accent-cyan)', display: 'flex', alignItems: 'center', gap: '2px', textDecoration: 'none' }} className="hover-opacity">
                    Calories <ChevronRight size={14} />
                  </Link>
                  <Link to="/workouts" style={{ fontSize: '13px', color: 'var(--accent-purple)', display: 'flex', alignItems: 'center', gap: '2px', textDecoration: 'none' }} className="hover-opacity">
                    Fitness <ChevronRight size={14} />
                  </Link>
                </div>
              </div>
            </div>

            {/* Smart Recommendations */}
            <div className="card">
              <h3 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Sparkles size={22} style={{ color: '#fbbf24' }} /> Smart Recommendations
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {data.recommendations.map((rec, index) => {
                  let badgeColor = 'rgba(6, 182, 212, 0.1)';
                  let textColor = 'var(--accent-cyan)';
                  if (rec.type === 'alert') {
                    badgeColor = 'rgba(239, 68, 68, 0.08)';
                    textColor = 'var(--text-red)';
                  } else if (rec.type === 'milestone') {
                    badgeColor = 'rgba(168, 85, 247, 0.08)';
                    textColor = 'var(--accent-purple)';
                  }

                  return (
                    <div 
                      key={index} 
                      style={{ 
                        padding: '14px', 
                        background: 'rgba(255, 255, 255, 0.02)', 
                        border: '1px solid var(--border-light)', 
                        borderRadius: '12px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '700', color: 'var(--text-muted)' }}>
                          {rec.source}
                        </span>
                        <span style={{ fontSize: '10px', background: badgeColor, color: textColor, padding: '2px 8px', borderRadius: '10px', fontWeight: '700' }}>
                          {rec.type.toUpperCase()}
                        </span>
                      </div>
                      <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.4', margin: 0 }}>
                        {rec.text}
                      </p>
                    </div>
                  );
                })}
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
