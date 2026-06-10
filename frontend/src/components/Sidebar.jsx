import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  LayoutDashboard, 
  Utensils, 
  Dumbbell, 
  Clock, 
  Calendar, 
  FileText, 
  Settings as SettingsIcon, 
  LogOut,
  Sparkles
} from 'lucide-react';

const Sidebar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const menuItems = [
    { name: 'Dashboard', path: '/', icon: <LayoutDashboard size={20} /> },
    { name: 'Nutrition Tracker', path: '/calories', icon: <Utensils size={20} /> },
    { name: 'Gym Workout AI', path: '/workouts', icon: <Dumbbell size={20} /> },
    { name: 'Routine Analyser', path: '/routine', icon: <Clock size={20} /> },
    { name: 'Week Scheduler', path: '/scheduler', icon: <Calendar size={20} /> },
    { name: 'Notes Taker', path: '/notes', icon: <FileText size={20} /> },
    { name: 'Settings & Alerts', path: '/settings', icon: <SettingsIcon size={20} /> },
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getInitials = (name) => {
    if (!name) return 'A';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <Sparkles size={24} className="text-purple" />
        <span>AEGIS <span>OS</span></span>
      </div>

      <ul className="sidebar-menu">
        {menuItems.map((item) => (
          <li key={item.path} className="sidebar-item">
            <NavLink 
              to={item.path} 
              className={({ isActive }) => isActive ? 'active' : ''}
              end={item.path === '/'}
            >
              {item.icon}
              <span>{item.name}</span>
            </NavLink>
          </li>
        ))}
      </ul>

      {user && (
        <div className="sidebar-user">
          <div className="user-info">
            {user.avatar ? (
              <img src={user.avatar} alt={user.name} className="user-avatar" style={{ objectFit: 'cover' }} />
            ) : (
              <div className="user-avatar">
                {getInitials(user.name)}
              </div>
            )}
            <div style={{ overflow: 'hidden' }}>
              <div className="user-name">{user.name}</div>
              <div className="user-email">{user.email}</div>
            </div>
          </div>
          <button className="logout-btn" onClick={handleLogout} title="Log Out">
            <LogOut size={18} />
          </button>
        </div>
      )}
    </aside>
  );
};

export default Sidebar;
