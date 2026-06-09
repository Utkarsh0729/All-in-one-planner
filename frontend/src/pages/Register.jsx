import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { UserPlus, Sparkles } from 'lucide-react';

const Register = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { register, googleLogin } = useAuth();
  const navigate = useNavigate();

  // Load and initialize Google Sign-In
  useEffect(() => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!clientId) {
      console.warn('VITE_GOOGLE_CLIENT_ID is not configured in .env. Google Sign-In will not render.');
      return;
    }

    const handleGoogleCallback = async (response) => {
      setError('');
      setLoading(true);
      try {
        await googleLogin(response.credential);
        navigate('/');
      } catch (err) {
        setError(err.message || 'Google authentication failed');
      } finally {
        setLoading(false);
      }
    };

    const initializeGoogle = () => {
      try {
        if (window.google) {
          window.google.accounts.id.initialize({
            client_id: clientId,
            callback: handleGoogleCallback,
          });

          window.google.accounts.id.renderButton(
            document.getElementById('google-signup-btn'),
            { theme: 'dark', size: 'large', width: 348 }
          );
        }
      } catch (e) {
        console.error('Google Sign-In initialization failed:', e);
      }
    };

    if (window.google) {
      initializeGoogle();
    } else {
      const interval = setInterval(() => {
        if (window.google) {
          initializeGoogle();
          clearInterval(interval);
        }
      }, 100);
      return () => clearInterval(interval);
    }
  }, [googleLogin, navigate]);

  // Handle standard registration
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await register(name, email, password);
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Quick Developer Bypass Login (Google Mock)
  const handleDeveloperBypass = async () => {
    setError('');
    setLoading(true);
    try {
      await googleLogin('mock-developer');
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="card" style={{ width: '100%', maxWidth: '420px', padding: '36px' }}>
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{ display: 'inline-flex', padding: '12px', background: 'rgba(99, 102, 241, 0.1)', borderRadius: '50%', marginBottom: '16px' }}>
            <Sparkles size={28} className="text-purple" />
          </div>
          <h2 style={{ fontSize: '26px', fontWeight: 800 }}>Create Account</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '6px' }}>
            Sign up to get access to all planner utilities
          </p>
        </div>

        {error && <div style={{ color: 'var(--accent-red)', background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.15)', padding: '12px', borderRadius: '8px', fontSize: '13px', marginBottom: '20px' }}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Full Name</label>
            <input 
              type="text" 
              required 
              placeholder="John Doe"
              className="input-field" 
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input 
              type="email" 
              required 
              placeholder="name@domain.com"
              className="input-field" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="form-group" style={{ marginBottom: '24px' }}>
            <label className="form-label">Password</label>
            <input 
              type="password" 
              required 
              placeholder="Min 6 characters"
              className="input-field" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button type="submit" disabled={loading} className="btn btn-primary" style={{ width: '100%', gap: '10px' }}>
            <UserPlus size={18} />
            {loading ? 'Registering...' : 'Register Account'}
          </button>
        </form>

        <div style={{ display: 'flex', alignItems: 'center', margin: '20px 0', color: 'var(--text-muted)', fontSize: '12px' }}>
          <hr style={{ flex: 1, border: 'none', borderTop: '1px solid var(--border-light)' }} />
          <span style={{ padding: '0 10px' }}>OR</span>
          <hr style={{ flex: 1, border: 'none', borderTop: '1px solid var(--border-light)' }} />
        </div>

        {/* Real Google Sign-In Button Container */}
        <div id="google-signup-btn" style={{ display: 'flex', justifyContent: 'center', marginBottom: '14px', minHeight: '40px' }}></div>

        {/* Fallback/Mock Developer Bypass Button */}
        <button onClick={handleDeveloperBypass} className="btn btn-secondary" style={{ width: '100%', gap: '8px', fontSize: '13px', background: 'rgba(99, 102, 241, 0.03)', borderColor: 'var(--border-light)', padding: '8px 16px' }}>
          <Sparkles size={14} className="text-cyan" />
          Bypass Google Auth (Mock Dev)
        </button>

        <p style={{ marginTop: '24px', textAlign: 'center', fontSize: '14px', color: 'var(--text-secondary)' }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: 'var(--primary)', fontWeight: '600', textDecoration: 'none' }}>
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
