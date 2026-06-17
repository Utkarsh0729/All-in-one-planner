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
  Sparkles,
  Download
} from 'lucide-react';

const Sidebar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [deferredPrompt, setDeferredPrompt] = React.useState(null);

  React.useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User response to install: ${outcome}`);
    setDeferredPrompt(null);
  };

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

      {deferredPrompt && (
        <div style={{ padding: '0 16px', marginBottom: '16px' }}>
          <button 
            onClick={handleInstallClick} 
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              padding: '10px 16px',
              background: 'rgba(147, 51, 234, 0.08)',
              border: '1px solid rgba(147, 51, 234, 0.2)',
              borderRadius: '8px',
              color: '#a855f7',
              cursor: 'pointer',
              fontSize: '13.5px',
              fontWeight: '600',
              transition: 'all 0.2s ease',
              outline: 'none'
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'rgba(147, 51, 234, 0.16)';
              e.currentTarget.style.borderColor = 'rgba(147, 51, 234, 0.4)';
              e.currentTarget.style.color = '#c084fc';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'rgba(147, 51, 234, 0.08)';
              e.currentTarget.style.borderColor = 'rgba(147, 51, 234, 0.2)';
              e.currentTarget.style.color = '#a855f7';
            }}
          >
            <Download size={16} />
            <span>Download Desktop App</span>
          </button>
        </div>
      )}

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
