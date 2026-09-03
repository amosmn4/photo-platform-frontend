import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { ApiClientError } from '../api/client';
import { config } from '../config';
import { PasswordInput } from '../components/PasswordInput';
import { PasswordStrengthMeter } from '../components/PasswordStrengthMeter';
import { Footer } from '../components/Footer';

type Step = 'form' | 'verify';

export function RegisterPage() {
  const { register, verifyEmail, resendVerification } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('form');
  const [form, setForm] = useState({ fullName: '', businessName: '', email: '', password: '', confirmPassword: '' });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [devCode, setDevCode] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);

  function update<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  const passwordsMatch = form.confirmPassword.length > 0 && form.password === form.confirmPassword;
  const passwordsMismatch = form.confirmPassword.length > 0 && form.password !== form.confirmPassword;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setSubmitting(true);
    try {
      const { devVerificationCode } = await register(form);
      setDevCode(devVerificationCode ?? null);
      setStep('verify');
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Something went wrong. Try again.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setVerifyError(null);
    setVerifying(true);
    try {
      await verifyEmail(form.email, code);
      navigate('/dashboard');
    } catch (err) {
      setVerifyError(err instanceof ApiClientError ? err.message : 'Something went wrong. Try again.');
    } finally {
      setVerifying(false);
    }
  }

  async function handleResend() {
    setVerifyError(null);
    setResending(true);
    try {
      const { devVerificationCode } = await resendVerification(form.email);
      setDevCode(devVerificationCode ?? null);
    } catch (err) {
      setVerifyError(err instanceof ApiClientError ? err.message : 'Could not resend the code.');
    } finally {
      setResending(false);
    }
  }

  if (step === 'verify') {
    return (
      <div className="flex min-h-screen flex-col">
      <div className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm">
          <button
            type="button"
            onClick={() => setStep('form')}
            className="btn-ghost mb-4 text-sm text-ink-faint hover:text-ink"
          >
            ← Back
          </button>
          <h1 className="mb-1 text-center font-display text-2xl font-semibold text-ink">Verify your email</h1>
          <p className="mb-6 text-center text-sm text-ink-faint">
            Enter the 6-digit code we sent to <span className="text-ink">{form.email}</span>.
          </p>

          {devCode && (
            <div className="mb-4 rounded-card border border-safelight bg-safelight-tint p-3 text-center text-sm text-ink">
              No email service is configured in this environment. Dev code: <span className="font-mono font-semibold">{devCode}</span>
            </div>
          )}

          <form onSubmit={handleVerify} className="card space-y-4 p-6">
            <div>
              <label className="label" htmlFor="code">Verification code</label>
              <input
                id="code"
                required
                inputMode="numeric"
                maxLength={6}
                className="input text-center font-mono text-lg tracking-[0.4em]"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              />
            </div>
            {verifyError && <p className="text-sm text-mark">{verifyError}</p>}
            <button type="submit" className="btn-primary w-full" disabled={verifying || code.length !== 6}>
              {verifying ? 'Verifying…' : 'Verify & continue'}
            </button>
          </form>

          <p className="mt-4 text-center text-sm text-ink-faint">
            Didn't get a code?{' '}
            <button type="button" onClick={handleResend} disabled={resending} className="font-medium text-mark hover:text-mark-hover">
              {resending ? 'Sending…' : 'Resend code'}
            </button>
          </p>
        </div>
      </div>
      <Footer />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <div className="flex flex-1 items-center justify-center px-4 py-12">
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
            <PasswordInput
              id="password"
              label="Password"
              required
              minLength={8}
              autoComplete="new-password"
              value={form.password}
              onChange={(v) => update('password', v)}
            />
            <PasswordStrengthMeter password={form.password} />
          </div>
          <div>
            <PasswordInput
              id="confirmPassword"
              label="Confirm password"
              required
              minLength={8}
              autoComplete="new-password"
              value={form.confirmPassword}
              onChange={(v) => update('confirmPassword', v)}
            />
            {passwordsMatch && <p className="mt-1.5 text-xs text-ok">Passwords match</p>}
            {passwordsMismatch && <p className="mt-1.5 text-xs text-mark">Passwords do not match</p>}
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
      <Footer />
    </div>
  );
}
