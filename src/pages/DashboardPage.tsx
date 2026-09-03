import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Navbar } from '../components/Navbar';
import { eventsApi } from '../api/events';
import { EventSummary } from '../types';
import { formatBytes } from '../utils/format';

export function DashboardPage() {
  const [events, setEvents] = useState<EventSummary[] | null>(null);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const coverInputRef = useRef<HTMLInputElement>(null);

  async function load() {
    const res = await eventsApi.list();
    setEvents(res.events);
  }

  useEffect(() => {
    load();
  }, []);

  function handleCoverSelected(file: File | null) {
    setCoverFile(file);
    setCoverPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return file ? URL.createObjectURL(file) : null;
    });
  }

  function resetCreateForm() {
    setName('');
    setEventDate('');
    handleCoverSelected(null);
    setCreating(false);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const { event } = await eventsApi.create({ name, eventDate: eventDate || undefined });
      if (coverFile) await eventsApi.uploadCover(event.id, coverFile);
      resetCreateForm();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create event');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-semibold text-ink">Your events</h1>
            <p className="text-sm text-ink-faint">Each event gets its own gallery, QR code, and upload batch.</p>
          </div>
          <button type="button" className="btn-primary" onClick={() => setCreating((v) => !v)}>
            New event
          </button>
        </div>

        {creating && (
          <form onSubmit={handleCreate} className="card mb-6 space-y-4 p-5">
            <div className="flex flex-wrap items-end gap-3">
              <div className="flex-1 min-w-[220px]">
                <label className="label" htmlFor="name">Event name</label>
                <input id="name" required className="input" placeholder="Beach Photos, 22 Aug 2026" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div>
                <label className="label" htmlFor="date">Shoot date</label>
                <input id="date" type="date" className="input" value={eventDate} onChange={(e) => setEventDate(e.target.value)} />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <input
                ref={coverInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => handleCoverSelected(e.target.files?.[0] ?? null)}
              />
              {coverPreview ? (
                <img src={coverPreview} alt="Cover preview" className="h-16 w-24 rounded-card object-cover" />
              ) : (
                <div className="flex h-16 w-24 items-center justify-center rounded-card bg-hairline/40 text-xs text-ink-faint">
                  No cover
                </div>
              )}
              <div className="flex flex-col gap-1">
                <button type="button" className="btn-secondary text-sm" onClick={() => coverInputRef.current?.click()}>
                  {coverFile ? 'Change cover image' : 'Choose cover image'}
                </button>
                {coverFile && (
                  <button type="button" className="text-left text-xs text-ink-faint hover:text-ink" onClick={() => handleCoverSelected(null)}>
                    Remove
                  </button>
                )}
              </div>
            </div>

            <div className="flex justify-end">
              <button type="submit" className="btn-primary" disabled={submitting}>
                {submitting ? 'Creating…' : 'Create'}
              </button>
            </div>
          </form>
        )}
        {error && <p className="mb-4 text-sm text-mark">{error}</p>}

        {events === null ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-32 animate-pulse rounded-card bg-hairline/60" />
            ))}
          </div>
        ) : events.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-card border border-dashed border-hairline py-24 text-center">
            <p className="font-display text-lg text-ink">No events yet</p>
            <p className="text-sm text-ink-faint">Create one to get an upload link and a printable QR code.</p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {events.map((event) => (
              <Link
                key={event.id}
                to={`/events/${event.id}`}
                className="card block overflow-hidden p-0 transition-shadow hover:shadow-lift"
              >
                {event.coverImageUrl ? (
                  <img src={event.coverImageUrl} alt="" className="h-32 w-full object-cover" />
                ) : (
                  <div className="flex h-32 w-full items-center justify-center bg-gradient-to-br from-hairline/60 to-hairline/20 text-xs text-ink-faint">
                    No cover image
                  </div>
                )}
                <div className="p-5">
                  <p className="font-display text-base font-semibold text-ink">{event.name}</p>
                  <p className="frame-tag mt-1 text-ink-faint">
                    {event.event_date ? new Date(event.event_date).toLocaleDateString() : 'No date set'}
                  </p>
                  <div className="mt-3 flex items-center justify-between text-xs text-ink-soft">
                    <span>{event.photo_count} photos</span>
                    <span>{formatBytes(event.total_size_bytes)}</span>
                    <span className="rounded-full bg-hairline/60 px-2 py-0.5 capitalize">{event.status}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
