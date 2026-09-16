import React, { useCallback, useEffect, useState } from 'react';
import { eventsApi } from '../api/events';
import { OwnerGuest } from '../types';
import { formatBytes, formatDateTime } from '../utils/format';
import { ConfirmDialog } from './ConfirmDialog';
import { PlayIcon } from './MediaIcons';

interface BlockDialogProps {
  open: boolean;
  guestLabel?: string;
  uploads?: number;
  onBlock: (removeUploads: boolean) => void;
  onCancel: () => void;
}

// Block with an optional clean-up of everything that guest already added.
export function BlockGuestDialog({ open, guestLabel, uploads, onBlock, onCancel }: BlockDialogProps) {
  const [removeUploads, setRemoveUploads] = useState(true);
  useEffect(() => {
    if (open) setRemoveUploads(true);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onCancel();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onCancel]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-ink/40" onClick={onCancel} />
      <div className="card relative w-full max-w-sm p-5">
        <p className="font-display text-base font-semibold text-ink">Block {guestLabel ?? 'this guest'}?</p>
        <p className="mt-2 text-sm text-ink-soft">
          They won't be able to upload to this event from this device any more. They can still see the gallery.
        </p>
        <label className="mt-4 flex items-start gap-2 text-sm text-ink" htmlFor="block-remove-uploads">
          <input
            id="block-remove-uploads"
            type="checkbox"
            className="mt-0.5"
            checked={removeUploads}
            onChange={(e) => setRemoveUploads(e.target.checked)}
          />
          <span>
            Also remove {uploads !== undefined ? `their ${uploads} upload${uploads === 1 ? '' : 's'}` : 'everything they uploaded'}
          </span>
        </label>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" className="btn-secondary text-sm" onClick={onCancel}>
            Cancel
          </button>
          <button type="button" className="btn-primary text-sm" onClick={() => onBlock(removeUploads)}>
            Block
          </button>
        </div>
      </div>
    </div>
  );
}

interface Props {
  eventId: string;
  version: number; // bump to refetch after a block made elsewhere (e.g. from the photo viewer)
  onUploadsRemoved: () => void;
}

// Everyone who uploaded to the event, newest activity first, with a few thumbnails to tell them apart.
export function GuestList({ eventId, version, onUploadsRemoved }: Props) {
  const [guests, setGuests] = useState<OwnerGuest[] | null>(null);
  const [total, setTotal] = useState(0);
  const [blocking, setBlocking] = useState<OwnerGuest | null>(null);
  const [removing, setRemoving] = useState<OwnerGuest | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await eventsApi.listGuests(eventId);
      setGuests(res.guests);
      setTotal(res.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load guests');
    }
  }, [eventId]);

  useEffect(() => {
    load();
  }, [load, version]);

  async function act(guest: OwnerGuest, action: () => Promise<{ removed: number }>) {
    setBusyId(guest.id);
    setError(null);
    try {
      const { removed } = await action();
      await load();
      if (removed > 0) onUploadsRemoved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setBusyId(null);
    }
  }

  if (guests === null) return null;

  return (
    <div className="card mb-6 p-5">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="font-display text-lg font-semibold text-ink">Guests who uploaded</h3>
        <span className="frame-tag text-ink-faint">{total}</span>
      </div>
      {error && <p className="mt-2 text-sm text-mark">{error}</p>}

      {guests.length === 0 ? (
        <p className="mt-2 text-sm text-ink-faint">Nobody has uploaded yet.</p>
      ) : (
        <ul className="mt-3 divide-y divide-hairline">
          {guests.map((g) => {
            const uploads = g.photos + g.videos;
            return (
              <li key={g.id} className="flex flex-wrap items-center gap-3 py-3">
                <div className="flex shrink-0 gap-1">
                  {g.samples.map((s) => (
                    <div key={s.id} className="relative h-10 w-10 overflow-hidden rounded bg-hairline/50">
                      {s.thumbnailUrl && <img src={s.thumbnailUrl} alt="" className="h-full w-full object-cover" loading="lazy" />}
                      {s.mediaType === 'video' && (
                        <PlayIcon className="absolute bottom-0.5 right-0.5 h-3 w-3 text-white drop-shadow" />
                      )}
                    </div>
                  ))}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-ink">
                    {g.label}
                    {g.blockedAt && (
                      <span className="ml-2 rounded-full bg-mark-tint px-2 py-0.5 text-[11px] font-medium text-mark">Blocked</span>
                    )}
                  </p>
                  <p className="text-xs text-ink-faint">
                    {g.photos} photo{g.photos === 1 ? '' : 's'} · {g.videos} clip{g.videos === 1 ? '' : 's'} · {formatBytes(g.bytes)}
                    {g.lastUploadAt ? ` · last ${formatDateTime(g.lastUploadAt)}` : ''}
                  </p>
                </div>
                <div className="flex gap-1">
                  {uploads > 0 && (
                    <button
                      type="button"
                      className="btn-ghost text-xs"
                      disabled={busyId === g.id}
                      onClick={() => setRemoving(g)}
                    >
                      Remove uploads
                    </button>
                  )}
                  {g.blockedAt ? (
                    <button
                      type="button"
                      className="btn-secondary text-xs"
                      disabled={busyId === g.id}
                      onClick={() => act(g, () => eventsApi.unblockGuest(eventId, g.id))}
                    >
                      Unblock
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="btn-secondary text-xs text-mark"
                      disabled={busyId === g.id}
                      onClick={() => setBlocking(g)}
                    >
                      Block
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <BlockGuestDialog
        open={blocking !== null}
        guestLabel={blocking?.label}
        uploads={blocking ? blocking.photos + blocking.videos : undefined}
        onCancel={() => setBlocking(null)}
        onBlock={(removeUploads) => {
          const guest = blocking!;
          setBlocking(null);
          act(guest, () => eventsApi.blockGuest(eventId, guest.id, removeUploads));
        }}
      />
      <ConfirmDialog
        open={removing !== null}
        title={`Remove everything ${removing?.label ?? 'this guest'} uploaded?`}
        message="Their photos and clips disappear from the gallery. They can still upload unless you block them."
        confirmLabel="Remove"
        onConfirm={() => {
          const guest = removing!;
          setRemoving(null);
          act(guest, () => eventsApi.removeGuestUploads(eventId, guest.id));
        }}
        onCancel={() => setRemoving(null)}
      />
    </div>
  );
}
