import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Navbar } from '../components/Navbar';
import { UploadManager } from '../components/UploadManager';
import { QRCard } from '../components/QRCard';
import { PhotoGrid } from '../components/PhotoGrid';
import { Lightbox } from '../components/Lightbox';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { useGallery } from '../hooks/useGallery';
import { eventsApi } from '../api/events';
import { EventSummary, AccessTokenSummary, IssuedAccess, ProcessingSummary, GalleryPhoto } from '../types';

type Tab = 'upload' | 'access' | 'photos';
const PAGE_SIZE_OPTIONS = [20, 40, 60, 100, 150];
const MAX_SUMMARY_FAILURES = 5;

export function EventDetailPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const [event, setEvent] = useState<EventSummary | null>(null);
  const [tab, setTab] = useState<Tab>('upload');
  const [tokens, setTokens] = useState<AccessTokenSummary[]>([]);
  const [issuedByTokenId, setIssuedByTokenId] = useState<Record<string, IssuedAccess>>({});
  const [summary, setSummary] = useState<ProcessingSummary | null>(null);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const summaryFailuresRef = useRef(0);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [pageSize, setPageSize] = useState(60);
  const [selecting, setSelecting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
  const [confirmingRemoveSelected, setConfirmingRemoveSelected] = useState(false);
  const [confirmingDeleteTokenId, setConfirmingDeleteTokenId] = useState<string | null>(null);

  const loadEvent = useCallback(async () => {
    if (!eventId) return;
    const res = await eventsApi.get(eventId);
    setEvent(res.event);
  }, [eventId]);

  const loadTokens = useCallback(async () => {
    if (!eventId) return;
    const res = await eventsApi.listTokens(eventId);
    setTokens(res.tokens);
  }, [eventId]);

  const loadSummary = useCallback(async () => {
    if (!eventId) return;
    try {
      const res = await eventsApi.processingSummary(eventId);
      setSummary(res.summary);
      setSummaryError(null);
      summaryFailuresRef.current = 0;
    } catch (err) {
      summaryFailuresRef.current += 1;
      setSummaryError(err instanceof Error ? err.message : 'Could not check processing status.');
    }
  }, [eventId]);

  useEffect(() => {
    loadEvent();
    loadTokens();
    loadSummary();
  }, [loadEvent, loadTokens, loadSummary]);

  useEffect(() => {
    if (!summary) return;
    const pending = summary.uploaded + summary.processing;
    if (pending === 0) return;
    if (summaryFailuresRef.current >= MAX_SUMMARY_FAILURES) return;
    const id = setInterval(() => {
      if (summaryFailuresRef.current >= MAX_SUMMARY_FAILURES) {
        clearInterval(id);
        return;
      }
      loadSummary();
    }, 4000);
    return () => clearInterval(id);
  }, [summary, loadSummary]);

  const retrySummary = useCallback(() => {
    summaryFailuresRef.current = 0;
    setSummaryError(null);
    loadSummary();
  }, [loadSummary]);

  const fetchPage = useCallback(
    (cursor?: string) => eventsApi.listPhotos(eventId!, cursor, pageSize),
    [eventId, pageSize],
  );
  const gallery = useGallery({ fetchPage, resetKey: `${eventId}-${pageSize}` });

  function toggleSelect(photo: GalleryPhoto) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(photo.id)) next.delete(photo.id);
      else next.add(photo.id);
      return next;
    });
  }

  function cancelSelection() {
    setSelecting(false);
    setSelectedIds(new Set());
  }

  async function downloadSelected() {
    if (!eventId || selectedIds.size === 0) return;
    setBulkBusy(true);
    try {
      for (const photoId of selectedIds) {
        const { url } = await eventsApi.getPhotoDownloadUrl(eventId, photoId);
        const a = document.createElement('a');
        a.href = url;
        a.rel = 'noopener';
        document.body.appendChild(a);
        a.click();
        a.remove();
        await new Promise((r) => setTimeout(r, 400));
      }
    } finally {
      setBulkBusy(false);
    }
  }

  async function removeSelected() {
    if (!eventId || selectedIds.size === 0) return;
    setConfirmingRemoveSelected(true);
  }

  async function confirmRemoveSelected() {
    setConfirmingRemoveSelected(false);
    if (!eventId) return;
    setBulkBusy(true);
    try {
      for (const photoId of selectedIds) {
        await eventsApi.deletePhoto(eventId, photoId);
      }
      cancelSelection();
      await gallery.reload();
      await loadEvent();
    } finally {
      setBulkBusy(false);
    }
  }

  async function issueNewToken() {
    if (!eventId) return;
    const result = await eventsApi.issueToken(eventId, { label: `QR #${tokens.length + 1}` });
    setIssuedByTokenId((prev) => ({ ...prev, [result.token.id]: result }));
    await loadTokens();
  }

  async function revokeToken(tokenId: string) {
    if (!eventId) return;
    await eventsApi.revokeToken(eventId, tokenId, 'Revoked from dashboard');
    await loadTokens();
  }

  async function deleteToken(tokenId: string) {
    if (!eventId) return;
    await eventsApi.deleteToken(eventId, tokenId);
    setIssuedByTokenId((prev) => {
      const next = { ...prev };
      delete next[tokenId];
      return next;
    });
    await loadTokens();
  }

  async function handlePublish() {
    if (!eventId) return;
    setPublishing(true);
    try {
      await eventsApi.publish(eventId);
      await loadEvent();
    } finally {
      setPublishing(false);
    }
  }

  if (!event) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <main className="mx-auto max-w-6xl px-4 py-8">
          <Link to="/dashboard" className="btn-ghost text-sm text-ink-faint hover:text-ink">
            ← Back to events
          </Link>
          <p className="mt-4 text-ink-faint">Loading event…</p>
        </main>
      </div>
    );
  }

  const pendingCount = summary ? summary.uploaded + summary.processing : 0;

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <Link to="/dashboard" className="btn-ghost text-sm text-ink-faint hover:text-ink">
          ← Back to events
        </Link>
        <div className="mt-4 flex items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-semibold text-ink">{event.name}</h1>
            <p className="frame-tag mt-1 text-ink-faint">
              {event.photo_count} photos · {event.status}
            </p>
          </div>
          {event.status === 'draft' && (
            <button type="button" className="btn-primary shrink-0" onClick={handlePublish} disabled={publishing}>
              {publishing ? 'Publishing…' : 'Publish event'}
            </button>
          )}
        </div>

        {summary && pendingCount > 0 && (
          <div className="mt-4 card p-4">
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="text-ink-soft">Processing photos…</span>
              <span className="frame-tag text-ink-faint">
                {summary.ready} / {summary.ready + pendingCount + summary.failed} ready
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-hairline">
              <div
                className="h-full bg-safelight transition-all duration-500"
                style={{
                  width: `${(summary.ready / Math.max(summary.ready + pendingCount + summary.failed, 1)) * 100}%`,
                }}
              />
            </div>
            {summaryError && (
              <div className="mt-3 flex items-center justify-between gap-3 text-sm text-red-600">
                <span>
                  {summaryFailuresRef.current >= MAX_SUMMARY_FAILURES
                    ? `Lost touch with the server while checking progress (${summaryError}). Auto-refresh stopped.`
                    : `Couldn't reach the server to check progress (${summaryError}). Retrying…`}
                </span>
                {summaryFailuresRef.current >= MAX_SUMMARY_FAILURES && (
                  <button type="button" className="btn-secondary shrink-0" onClick={retrySummary}>
                    Retry
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        <nav className="mt-6 flex gap-1 border-b border-hairline">
          {(['upload', 'access', 'photos'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2.5 text-sm font-medium capitalize transition-colors ${
                tab === t ? 'border-b-2 border-mark text-ink' : 'text-ink-faint hover:text-ink'
              }`}
            >
              {t === 'access' ? 'QR & access' : t}
            </button>
          ))}
        </nav>

        <div className="mt-6">
          {tab === 'upload' && (
            <UploadManager eventId={eventId!} onAllUploaded={() => { loadSummary(); loadEvent(); }} />
          )}

          {tab === 'access' && (
            <div>
              <div className="mb-4 flex justify-end">
                <button type="button" className="btn-primary" onClick={issueNewToken}>
                  Generate new QR
                </button>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {tokens.map((token) => {
                  const issued = issuedByTokenId[token.id];
                  return issued ? (
                    <QRCard
                      key={token.id}
                      label={issued.token.label ?? 'QR'}
                      qrDataUrl={issued.qrDataUrl}
                      galleryUrl={issued.galleryUrl}
                      token={token}
                      onRevoke={() => revokeToken(token.id)}
                      onDelete={() => deleteToken(token.id)}
                    />
                  ) : (
                    <div key={token.id} className="card p-4">
                      <p className="font-display text-base font-semibold text-ink">{token.label ?? 'QR'}</p>
                      <p className="frame-tag mt-1 text-ink-faint">
                        Issued {new Date(token.created_at).toLocaleDateString()} · {token.use_count} scans
                      </p>
                      <span
                        className={`mt-2 inline-block rounded-full px-2 py-0.5 text-[11px] font-medium ${
                          token.status === 'active' ? 'bg-ok-tint text-ok' : 'bg-mark-tint text-mark'
                        }`}
                      >
                        {token.status}
                      </span>
                      <p className="mt-2 text-xs text-ink-faint">
                        The QR image is only shown once, right when it's generated. Revoke and issue a new one if
                        it's been lost.
                      </p>
                      <div className="mt-2 flex gap-2">
                        {token.status === 'active' && (
                          <button type="button" className="btn-ghost text-xs text-mark" onClick={() => revokeToken(token.id)}>
                            Revoke
                          </button>
                        )}
                        <button
                          type="button"
                          className="btn-ghost text-xs text-mark"
                          onClick={() => setConfirmingDeleteTokenId(token.id)}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {tab === 'photos' && (
            <>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <label className="frame-tag text-ink-faint" htmlFor="pageSize">Show</label>
                  <select
                    id="pageSize"
                    className="input w-auto py-1.5 text-sm"
                    value={pageSize}
                    onChange={(e) => setPageSize(Number(e.target.value))}
                  >
                    {PAGE_SIZE_OPTIONS.map((n) => (
                      <option key={n} value={n}>
                        {n} per page
                      </option>
                    ))}
                  </select>
                </div>

                {!selecting ? (
                  <button type="button" className="btn-secondary text-sm" onClick={() => setSelecting(true)}>
                    Select photos
                  </button>
                ) : (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="frame-tag text-ink-faint">{selectedIds.size} selected</span>
                    <button
                      type="button"
                      className="btn-secondary text-sm"
                      disabled={selectedIds.size === 0 || bulkBusy}
                      onClick={downloadSelected}
                    >
                      {bulkBusy ? 'Working…' : 'Download'}
                    </button>
                    <button
                      type="button"
                      className="btn-ghost text-sm text-mark"
                      disabled={selectedIds.size === 0 || bulkBusy}
                      onClick={removeSelected}
                    >
                      Remove
                    </button>
                    <button type="button" className="btn-ghost text-sm" onClick={cancelSelection}>
                      Cancel
                    </button>
                  </div>
                )}
              </div>

              <PhotoGrid
                items={gallery.items}
                loading={gallery.loading}
                loadingMore={gallery.loadingMore}
                hasMore={gallery.hasMore}
                onLoadMore={gallery.loadMore}
                onOpen={(_photo, i) => setLightboxIndex(i)}
                emptyLabel="No processed photos yet"
                selecting={selecting}
                selectedIds={selectedIds}
                onToggleSelect={toggleSelect}
              />
              {lightboxIndex !== null && (
                <Lightbox
                  photos={gallery.items}
                  index={lightboxIndex}
                  onClose={() => setLightboxIndex(null)}
                  onIndexChange={setLightboxIndex}
                />
              )}
            </>
          )}
        </div>
      </main>

      <ConfirmDialog
        open={confirmingRemoveSelected}
        title={`Remove ${selectedIds.size} photo(s)?`}
        message="This cannot be undone."
        confirmLabel="Remove"
        onConfirm={confirmRemoveSelected}
        onCancel={() => setConfirmingRemoveSelected(false)}
      />

      <ConfirmDialog
        open={confirmingDeleteTokenId !== null}
        title={`Delete "${tokens.find((t) => t.id === confirmingDeleteTokenId)?.label ?? 'this QR'}"?`}
        message="This cannot be undone."
        confirmLabel="Delete"
        onConfirm={() => {
          if (confirmingDeleteTokenId) deleteToken(confirmingDeleteTokenId);
          setConfirmingDeleteTokenId(null);
        }}
        onCancel={() => setConfirmingDeleteTokenId(null)}
      />
    </div>
  );
}
