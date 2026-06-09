import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Settings as SettingsIcon, Bell, Mail, AlertCircle, CheckCircle } from 'lucide-react';

const Settings = () => {
  const { token, API_URL } = useAuth();
  const [subscribed, setSubscribed] = useState(true);
  const [loading, setLoading] = useState(false);
  const [triggering, setTriggering] = useState(false);
  
  // Alert messages
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/reminders/settings`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setSubscribed(data.dailyUpdates ?? true);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleToggleSubscription = async () => {
    setLoading(true);
    setError('');
    setMessage('');
    
    try {
      const newStatus = !subscribed;
      const res = await fetch(`${API_URL}/reminders/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ dailyUpdates: newStatus })
      });
      const data = await res.json();
      setSubscribed(data.dailyUpdates);
      setMessage(`🔔 Reminder alerts ${data.dailyUpdates ? 'enabled' : 'disabled'} successfully.`);
    } catch (err) {
      setError('Failed to update alert settings.');
    } finally {
      setLoading(false);
    }
  };

  const handleTriggerTestEmail = async () => {
    setTriggering(true);
    setError('');
    setMessage('');
    try {
      const res = await fetch(`${API_URL}/reminders/trigger-email`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      
      if (res.ok) {
        setMessage(data.message);
      } else {
        setError(data.message || 'Verification email trigger failed.');
      }
    } catch (err) {
      setError('Verification trigger encountered an error. Check server logs.');
    } finally {
      setTriggering(false);
    }
  };

  return (
    <div className="main-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">Settings</h1>
          <p className="page-subtitle">Configure notification alerts, subscriptions and profiles</p>
        </div>
      </div>

      {error && <div className="text-red" style={{ marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}><AlertCircle size={16} /> {error}</div>}
      {message && <div className="text-emerald" style={{ marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '500' }}><CheckCircle size={16} /> {message}</div>}

      <div style={{ maxWidth: '600px' }}>
        <div className="card" style={{ marginBottom: '24px' }}>
          <h3 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Bell size={22} className="text-cyan" /> 10:00 PM Update Alerts
          </h3>
          
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '24px', lineHeight: '1.5' }}>
            When enabled, the planner compiles a summary of today's calories count, gym split targets, and checklists progress. 
            This summary is emailed directly to you every night around <strong>10:00 PM</strong>.
          </p>

          <div className="flex-between" style={{ padding: '16px', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-light)', borderRadius: '8px', marginBottom: '24px' }}>
            <div>
              <strong style={{ display: 'block', fontSize: '15px', marginBottom: '4px' }}>Daily Email Report</strong>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Send summaries at 10 PM daily</span>
            </div>
            
            <button 
              onClick={handleToggleSubscription}
              disabled={loading}
              className={`btn ${subscribed ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '8px 20px', fontSize: '13px' }}
            >
              {subscribed ? 'Subscribed' : 'Opted Out'}
            </button>
          </div>

          {subscribed && (
            <div>
              <h4 style={{ fontSize: '14px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}><Mail size={16} className="text-cyan" /> Verify System Dispatch</h4>
              <p style={{ color: 'var(--text-muted)', fontSize: '12px', marginBottom: '16px', lineHeight: '1.4' }}>
                You can manually dispatch a verification email log containing today's current summary to your email address now to test the SMTP Nodemailer pipeline.
              </p>
              <button 
                onClick={handleTriggerTestEmail}
                disabled={triggering}
                className="btn btn-secondary"
                style={{ fontSize: '13px', width: '100%', borderStyle: 'dashed' }}
              >
                {triggering ? 'Dispatching test alert...' : 'Send Test Summary Email'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Settings;
