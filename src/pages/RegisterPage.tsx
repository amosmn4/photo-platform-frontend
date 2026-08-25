import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { ApiClientError } from '../api/client';
import { config } from '../config';

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ fullName: '', businessName: '', email: '', password: '' });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function update<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await register(form);
      navigate('/');
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Something went wrong. Try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="btn-ghost mb-4 text-sm text-ink-faint hover:text-ink"
        >
          ← Back
        </button>
        <h1 className="mb-1 text-center font-display text-2xl font-semibold text-ink">{config.appName}</h1>
        <p className="mb-8 text-center text-sm text-ink-faint">Set up your photographer account.</p>

        <form onSubmit={handleSubmit} className="card space-y-4 p-6">
          <div>
            <label className="label" htmlFor="fullName">Full name</label>
            <input id="fullName" required className="input" value={form.fullName} onChange={(e) => update('fullName', e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="businessName">Business name (optional)</label>
            <input id="businessName" className="input" value={form.businessName} onChange={(e) => update('businessName', e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="email">Email</label>
            <input id="email" type="email" required className="input" value={form.email} onChange={(e) => update('email', e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="password">Password</label>
            <input id="password" type="password" required minLength={8} className="input" value={form.password} onChange={(e) => update('password', e.target.value)} />
            <p className="mt-1 text-xs text-ink-faint">At least 8 characters.</p>
          </div>
          {error && <p className="text-sm text-mark">{error}</p>}
          <button type="submit" className="btn-primary w-full" disabled={submitting}>
            {submitting ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-ink-faint">
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-mark hover:text-mark-hover">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
