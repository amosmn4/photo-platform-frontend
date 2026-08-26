import React from 'react';
import { Link } from 'react-router-dom';
import { config } from '../config';

const FEATURES = [
  {
    title: 'Bulk upload, zero babysitting',
    body: 'Drag in thousands of photos at once. Uploads go straight to storage with live per-batch progress — thumbnailing and EXIF run in the background.',
  },
  {
    title: 'QR codes, printed and ready',
    body: 'Every event gets a scannable QR the moment you create it. Print it at the venue; guests scan and see their gallery in seconds, no login required.',
  },
  {
    title: 'Find my photos, by time',
    body: '"I was there around 2pm" is enough. Guests narrow a 5,000-photo gallery down to the handful that are actually theirs.',
  },
  {
    title: 'Built for the full shoot',
    body: 'Sessions, access windows, and revocable links so you control exactly who sees what, and for how long.',
  },
];

const STEPS = [
  { n: '01', title: 'Create an event', body: 'Name it, set a shoot date, and a default QR is generated instantly.' },
  { n: '02', title: 'Upload your photos', body: 'Bulk-upload thousands of images; processing happens in the background.' },
  { n: '03', title: 'Share the QR', body: 'Print it or share the link. Guests browse and download without an account.' },
];

export function HomePage() {
  return (
    <div className="min-h-screen">
      <header className="border-b border-hairline bg-paper-raised">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <span className="font-display text-lg font-semibold tracking-tight text-ink">{config.appName}</span>
          <nav className="hidden items-center gap-6 sm:flex">
            <a href="#features" className="text-sm text-ink-soft hover:text-ink">Features</a>
            <a href="#how-it-works" className="text-sm text-ink-soft hover:text-ink">How it works</a>
          </nav>
          <div className="flex items-center gap-2">
            <Link to="/login" className="btn-ghost text-sm">Sign in</Link>
            <Link to="/register" className="btn-primary text-sm">Get started</Link>
          </div>
        </div>
      </header>

      <main>
        <section className="mx-auto max-w-6xl px-4 py-20 text-center sm:py-28">
          <h1 className="mx-auto max-w-2xl font-display text-4xl font-semibold tracking-tight text-ink sm:text-5xl">
            Scan the QR. Find your photos.
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-ink-soft">
            Upload thousands of photos from a shoot, hand out a QR code, and let every guest find and download their
            own photos — no accounts, no email chains, no USB drives.
          </p>
          <div className="mt-8 flex items-center justify-center gap-3">
            <Link to="/register" className="btn-primary">Create your first event</Link>
            <Link to="/login" className="btn-secondary">Sign in</Link>
          </div>
        </section>

        <section className="border-t border-hairline bg-paper-raised py-6">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-10 gap-y-2 px-4 text-center text-sm text-ink-faint">
            <span>20,000+ photos per event</span>
            <span>Cursor-based galleries that stay fast</span>
            <span>Direct-to-storage uploads</span>
          </div>
        </section>

        <section id="features" className="mx-auto max-w-6xl px-4 py-20">
          <h2 className="text-center font-display text-2xl font-semibold text-ink">Everything the shoot needs</h2>
          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            {FEATURES.map((f) => (
              <div key={f.title} className="card p-5">
                <p className="font-display text-base font-semibold text-ink">{f.title}</p>
                <p className="mt-1.5 text-sm text-ink-soft">{f.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="how-it-works" className="border-t border-hairline bg-paper-raised py-20">
          <div className="mx-auto max-w-6xl px-4">
            <h2 className="text-center font-display text-2xl font-semibold text-ink">How it works</h2>
            <div className="mt-10 grid gap-6 sm:grid-cols-3">
              {STEPS.map((s) => (
                <div key={s.n}>
                  <span className="frame-tag text-mark">{s.n}</span>
                  <p className="mt-2 font-display text-base font-semibold text-ink">{s.title}</p>
                  <p className="mt-1.5 text-sm text-ink-soft">{s.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-20 text-center">
          <h2 className="font-display text-2xl font-semibold text-ink">Ready to hand out your first QR?</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-ink-soft">
            Set up an account and create your first event in under a minute.
          </p>
          <div className="mt-6">
            <Link to="/register" className="btn-primary">Get started free</Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-hairline">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-8 text-sm text-ink-faint sm:flex-row">
          <span>{config.appName}</span>
          <div className="flex items-center gap-4">
            <a href="#features" className="hover:text-ink">Features</a>
            <a href="#how-it-works" className="hover:text-ink">How it works</a>
            <Link to="/login" className="hover:text-ink">Sign in</Link>
          </div>
          <span className="frame-tag">© {new Date().getFullYear()}</span>
        </div>
      </footer>
    </div>
  );
}
