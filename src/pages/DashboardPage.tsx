import React, { useEffect, useState } from 'react';
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
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const res = await eventsApi.list();
    setEvents(res.events);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await eventsApi.create({ name, eventDate: eventDate || undefined });
      setName('');
      setEventDate('');
      setCreating(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create event');
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
          <form onSubmit={handleCreate} className="card mb-6 flex flex-wrap items-end gap-3 p-5">
            <div className="flex-1 min-w-[220px]">
              <label className="label" htmlFor="name">Event name</label>
              <input id="name" required className="input" placeholder="Beach Photos — 22 Aug 2026" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <label className="label" htmlFor="date">Shoot date</label>
              <input id="date" type="date" className="input" value={eventDate} onChange={(e) => setEventDate(e.target.value)} />
            </div>
            <button type="submit" className="btn-primary">Create</button>
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
              <Link key={event.id} to={`/events/${event.id}`} className="card block p-5 transition-shadow hover:shadow-lift">
                <p className="font-display text-base font-semibold text-ink">{event.name}</p>
                <p className="frame-tag mt-1 text-ink-faint">
                  {event.event_date ? new Date(event.event_date).toLocaleDateString() : 'No date set'}
                </p>
                <div className="mt-3 flex items-center justify-between text-xs text-ink-soft">
                  <span>{event.photo_count} photos</span>
                  <span>{formatBytes(event.total_size_bytes)}</span>
                  <span className="rounded-full bg-hairline/60 px-2 py-0.5 capitalize">{event.status}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
