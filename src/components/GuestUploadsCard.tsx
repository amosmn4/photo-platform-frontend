import React, { useState } from 'react';
import { eventsApi } from '../api/events';
import { EventSummary } from '../types';
import { formatDate } from '../utils/format';

interface Props {
  event: EventSummary;
  onChange: (event: EventSummary) => void;
}

const toDateInput = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

// Closing at the end of the chosen day (owner's local time) is what "open until Saturday" means.
const endOfDayIso = (dateInput: string) => new Date(`${dateInput}T23:59:59`).toISOString();

export function GuestUploadsCard({ event, onChange }: Props) {
  const initialDate = event.guest_uploads_until
    ? toDateInput(new Date(event.guest_uploads_until))
    : toDateInput(new Date(Date.now() + 7 * 24 * 3600 * 1000));
  const [untilDate, setUntilDate] = useState(initialDate);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const enabled = event.guest_uploads_enabled;
  const closesAt = event.guest_uploads_until ? new Date(event.guest_uploads_until) : null;
  const open = enabled && (!closesAt || closesAt.getTime() > Date.now());

  async function save(nextEnabled: boolean, nextDate: string) {
    setSaving(true);
    setError(null);
    try {
      const { event: updated } = await eventsApi.updateGuestUploads(event.id, {
        guestUploadsEnabled: nextEnabled,
        ...(nextEnabled ? { guestUploadsUntil: endOfDayIso(nextDate) } : {}),
      });
      onChange(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card mb-6 p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-display text-lg font-semibold text-ink">Guest uploads</h3>
            <span
              className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                open ? 'bg-ok-tint text-ok' : 'bg-hairline/60 text-ink-soft'
              }`}
            >
              {open ? `Open until ${formatDate(event.guest_uploads_until)}` : enabled ? 'Closed' : 'Off'}
            </span>
          </div>
          <p className="mt-1 max-w-xl text-sm text-ink-faint">
            Anyone with this event's QR code or link can add their own photos and short videos. Guests can delete what
            they uploaded — never anyone else's. You can remove anything.
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          aria-label="Allow guest uploads"
          disabled={saving}
          onClick={() => save(!enabled, untilDate)}
          className={`relative h-7 w-12 shrink-0 rounded-full transition-colors disabled:opacity-50 ${
            enabled ? 'bg-mark' : 'bg-hairline'
          }`}
        >
          <span
            className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${
              enabled ? 'translate-x-5' : 'translate-x-0.5'
            }`}
          />
        </button>
      </div>

      {enabled && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <label className="text-sm text-ink-soft" htmlFor="guestUntil">
            Open until
          </label>
          <input
            id="guestUntil"
            type="date"
            className="input w-auto py-1.5"
            min={toDateInput(new Date())}
            value={untilDate}
            disabled={saving}
            onChange={(e) => {
              setUntilDate(e.target.value);
              if (e.target.value) save(true, e.target.value);
            }}
          />
        </div>
      )}
      {error && <p className="mt-2 text-sm text-mark">{error}</p>}
    </div>
  );
}
