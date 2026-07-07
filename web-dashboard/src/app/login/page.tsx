'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Terminal, KeyRound, User, LogIn, Loader2, ShieldAlert } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [isSetupRequired, setIsSetupRequired] = useState(false);

  // Check if system setup is complete or if user is already authenticated
  useEffect(() => {
    async function checkState() {
      try {
        // 1. Check if setup is complete
        const setupRes = await fetch('/api/setup-status');
        const setupData = await setupRes.json();
        if (!setupData.is_setup) {
          setIsSetupRequired(true);
          setChecking(false);
          return;
        }

        // 2. Check if already logged in
        const res = await fetch('/api/settings');
        if (res.status === 200) {
          router.push('/dashboard');
        } else {
          setChecking(false);
        }
      } catch (err) {
        setChecking(false);
      }
    }
    checkState();
  }, [router]);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Invalid credentials.');
      }

      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
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
            background: isSetupRequired ? 'rgba(239, 68, 68, 0.1)' : 'rgba(168, 85, 247, 0.1)',
            color: isSetupRequired ? '#ef4444' : '#a855f7',
            marginBottom: '16px'
          }}>
            {isSetupRequired ? <ShieldAlert size={32} /> : <Terminal size={32} />}
          </div>
          <h1 style={{ fontSize: '28px', fontWeight: 800, marginBottom: '8px' }}>
            <span style={{ color: '#38bdf8' }}>NX</span>Bot Login
          </h1>
          <p style={{ color: '#94a3b8', fontSize: '15px' }}>
            {isSetupRequired ? 'CLI setup is required to configure admin account' : 'Enter credentials to access the management panel'}
          </p>
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

        {isSetupRequired ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              color: '#ef4444',
              padding: '16px',
              borderRadius: '8px',
              marginBottom: '20px',
              fontSize: '14px',
              lineHeight: '1.6'
            }}>
              <strong>Setup Incomplete</strong><br />
              Platform setup must be completed via the CLI before logging in.
            </div>
            <p style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '8px' }}>
              Run this command in the project root:
            </p>
            <div style={{
              background: 'rgba(255, 255, 255, 0.05)',
              padding: '12px',
              borderRadius: '6px',
              fontFamily: 'monospace',
              color: '#e2e8f0',
              fontSize: '14px',
              marginBottom: '20px'
            }}>
              ./nxbot setup
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="username">Username</label>
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

            <div className="form-group" style={{ marginBottom: '28px' }}>
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

            <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={18} /> Logging in...
                </>
              ) : (
                <>
                  <LogIn size={18} /> Authenticate
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
