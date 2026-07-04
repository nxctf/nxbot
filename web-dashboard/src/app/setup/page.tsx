'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, KeyRound, User, Check, Loader2 } from 'lucide-react';

export default function SetupPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  // Check if setup is already complete
  useEffect(() => {
    async function checkSetup() {
      try {
        const res = await fetch('/api/settings');
        if (res.status === 200) {
          // If 200, system is already setup and authenticated or can get settings info
          router.push('/dashboard');
        } else {
          setChecking(false);
        }
      } catch (err) {
        setChecking(false);
      }
    }
    checkSetup();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (username.trim().length < 3) {
      setError('Username must be at least 3 characters.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to complete setup.');
      }

      setSuccess(true);
      setTimeout(() => {
        router.push('/dashboard');
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div className="auth-wrapper">
        <Loader2 className="animate-spin text-cyan-400" size={48} style={{ color: '#38bdf8' }} />
      </div>
    );
  }

  return (
    <div className="auth-wrapper">
      <div className="glass-panel auth-card animate-fade-in">
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ 
            display: 'inline-flex', 
            padding: '12px', 
            borderRadius: '12px', 
            background: 'rgba(56, 189, 248, 0.1)', 
            color: '#38bdf8',
            marginBottom: '16px' 
          }}>
            <Shield size={32} />
          </div>
          <h1 style={{ fontSize: '28px', fontWeight: 800, marginBottom: '8px' }}>NXBot Setup</h1>
          <p style={{ color: '#94a3b8', fontSize: '15px' }}>Configure the administrator account for the CTF panel</p>
        </div>

        {error && (
          <div style={{ 
            background: 'rgba(244, 63, 94, 0.1)', 
            border: '1px solid rgba(244, 63, 94, 0.2)', 
            color: '#f43f5e', 
            padding: '12px 16px', 
            borderRadius: '8px', 
            marginBottom: '20px',
            fontSize: '14px' 
          }}>
            {error}
          </div>
        )}

        {success && (
          <div style={{ 
            background: 'rgba(16, 185, 129, 0.1)', 
            border: '1px solid rgba(16, 185, 129, 0.2)', 
            color: '#10b981', 
            padding: '12px 16px', 
            borderRadius: '8px', 
            marginBottom: '20px',
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <Check size={18} /> Setup complete! Redirecting...
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="username">Admin Username</label>
            <div style={{ position: 'relative' }}>
              <User size={18} style={{ position: 'absolute', left: '16px', top: '15px', color: '#94a3b8' }} />
              <input
                id="username"
                type="text"
                className="glass-input"
                style={{ paddingLeft: '48px' }}
                placeholder="admin"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                disabled={loading}
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <div style={{ position: 'relative' }}>
              <KeyRound size={18} style={{ position: 'absolute', left: '16px', top: '15px', color: '#94a3b8' }} />
              <input
                id="password"
                type="password"
                className="glass-input"
                style={{ paddingLeft: '48px' }}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
              />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: '28px' }}>
            <label htmlFor="confirmPassword">Confirm Password</label>
            <div style={{ position: 'relative' }}>
              <KeyRound size={18} style={{ position: 'absolute', left: '16px', top: '15px', color: '#94a3b8' }} />
              <input
                id="confirmPassword"
                type="password"
                className="glass-input"
                style={{ paddingLeft: '48px' }}
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={loading}
              />
            </div>
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="animate-spin" size={18} /> Completing setup...
              </>
            ) : (
              'Initialize Platform'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
