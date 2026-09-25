'use client';

import React, { useState } from 'react';

export default function AdminLoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (data.success) {
        // Successful login: navigate to the existing admin dashboard
        window.location.href = '/admin';
      } else {
        setError(data.error || 'Authentication rejected. Verify credentials.');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('Network communication failed during authentication.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col justify-center items-center px-6 py-24 select-none">
      <div className="w-full max-w-md space-y-12">
        {/* Header Block */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center space-x-2 font-mono text-[10px] text-kred uppercase tracking-widest pb-2">
            <span className="w-1.5 h-1.5 rounded-full bg-kred animate-pulse" />
            <span>SECURE ACCESS GATEWAY</span>
          </div>

          <h1 className="text-4xl sm:text-5xl font-bold uppercase tracking-ultra text-white">
            KARKANA
          </h1>

          <div className="text-xs font-mono text-white/50 tracking-widest uppercase">
            ADMIN PORTAL
          </div>
        </div>

        {/* Login Card */}
        <div className="border border-white/20 bg-white/[0.01] p-8 sm:p-12 space-y-8">
          {error && (
            <div className="p-4 border border-kred bg-kred/10 text-kred text-xs font-mono tracking-wider flex items-center justify-between">
              <span>{error}</span>
              <span className="text-[10px] text-kred uppercase font-bold">REJECTED</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6 font-mono text-xs">
            {/* Username / Email */}
            <div className="space-y-2">
              <label
                htmlFor="admin-username"
                className="block uppercase tracking-widest text-white/60"
              >
                USERNAME / EMAIL
              </label>
              <input
                id="admin-username"
                type="text"
                required
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. admin or admin@karkana.com"
                className="w-full bg-black border border-white/20 p-3.5 text-white placeholder-white/25 focus:outline-none focus:border-white transition-colors"
              />
            </div>

            {/* Password */}
            <div className="space-y-2">
              <label
                htmlFor="admin-password"
                className="block uppercase tracking-widest text-white/60"
              >
                PASSWORD
              </label>
              <input
                id="admin-password"
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full bg-black border border-white/20 p-3.5 text-white placeholder-white/25 focus:outline-none focus:border-white transition-colors"
              />
            </div>

            {/* Submit Button */}
            <div className="pt-4">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-white text-black font-bold uppercase tracking-widest text-xs hover:bg-kred hover:text-white transition-all duration-300 disabled:opacity-40"
              >
                {loading ? 'AUTHENTICATING...' : 'LOGIN →'}
              </button>
            </div>
          </form>
        </div>

        {/* Footer Note */}
        <div className="text-center font-mono text-[10px] text-white/30 tracking-widest uppercase">
          PROTECTED ATELIER SYSTEM // ALL SESSIONS LOGGED
        </div>
      </div>
    </div>
  );
}

