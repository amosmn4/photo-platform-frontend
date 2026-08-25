import React, { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Navbar } from '../components/Navbar';
import { UploadManager } from '../components/UploadManager';
import { QRCard } from '../components/QRCard';
import { PhotoGrid } from '../components/PhotoGrid';
import { Lightbox } from '../components/Lightbox';
import { useGallery } from '../hooks/useGallery';
import { eventsApi } from '../api/events';
import { EventSummary, AccessTokenSummary, IssuedAccess, ProcessingSummary } from '../types';

type Tab = 'upload' | 'access' | 'photos';

export function EventDetailPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const [event, setEvent] = useState<EventSummary | null>(null);
  const [tab, setTab] = useState<Tab>('upload');
  const [tokens, setTokens] = useState<AccessTokenSummary[]>([]);
  const [issuedByTokenId, setIssuedByTokenId] = useState<Record<string, IssuedAccess>>({});
  const [summary, setSummary] = useState<ProcessingSummary | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [publishing, setPublishing] = useState(false);

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
    const res = await eventsApi.processingSummary(eventId);
    setSummary(res.summary);
  }, [eventId]);

  useEffect(() => {
    loadEvent();
    loadTokens();
    loadSummary();
  }, [loadEvent, loadTokens, loadSummary]);

  // Poll processing status while anything is still uploaded/processing —
  // this is the data source for the "3,421 / 5,000 processed" bar.
  useEffect(() => {
    if (!summary) return;
    const pending = summary.uploaded + summary.processing;
    if (pending === 0) return;
    const id = setInterval(loadSummary, 4000);
    return () => clearInterval(id);
  }, [summary, loadSummary]);

  const fetchPage = useCallback(
    (cursor?: string) => eventsApi.listPhotos(eventId!, cursor),
    [eventId],
  );
  const gallery = useGallery({ fetchPage, resetKey: eventId });

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
          <Link to="/" className="btn-ghost text-sm text-ink-faint hover:text-ink">
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
        <Link to="/" className="btn-ghost text-sm text-ink-faint hover:text-ink">
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
                      {token.status === 'active' && (
                        <button type="button" className="btn-ghost mt-2 text-xs text-mark" onClick={() => revokeToken(token.id)}>
                          Revoke
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {tab === 'photos' && (
            <>
              <PhotoGrid
                items={gallery.items}
                loading={gallery.loading}
                loadingMore={gallery.loadingMore}
                hasMore={gallery.hasMore}
                onLoadMore={gallery.loadMore}
                onOpen={(_photo, i) => setLightboxIndex(i)}
                emptyLabel="No processed photos yet"
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
    </div>
  );
}
