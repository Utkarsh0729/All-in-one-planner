import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Sidebar from './components/Sidebar';

// Pages
import Dashboard from './pages/Dashboard';
import CalorieCalculator from './pages/CalorieCalculator';
import GymExercises from './pages/GymExercises';
import RoutineAnalyser from './pages/RoutineAnalyser';
import WeekScheduler from './pages/WeekScheduler';
import NotesTaker from './pages/NotesTaker';
import NoteEditor from './pages/NoteEditor';
import Settings from './pages/Settings';
import Login from './pages/Login';
import Register from './pages/Register';

// Protected Route Wrapper
const ProtectedRoute = ({ children }) => {
  const { token, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', backgroundColor: '#08080c', color: '#94a3b8' }}>
        <p style={{ fontSize: '18px', fontWeight: '500' }}>Initializing Aegis Planner...</p>
      </div>
    );
  }

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

// Layout for Authenticated Pages
const AppLayout = () => {
  return (
    <div className="app-container">
      <Sidebar />
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/calories" element={<CalorieCalculator />} />
        <Route path="/workouts" element={<GymExercises />} />
        <Route path="/routine" element={<RoutineAnalyser />} />
        <Route path="/scheduler" element={<WeekScheduler />} />
        <Route path="/notes" element={<NotesTaker />} />
        <Route path="/notes/new" element={<NoteEditor />} />
        <Route path="/notes/edit/:id" element={<NoteEditor />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Authentication Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          
          {/* Protected Main App Routes */}
          <Route 
            path="/*" 
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            } 
          />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
