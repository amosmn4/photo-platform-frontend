import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { galleryApi, GalleryFilter } from '../api/gallery';
import { useGallery } from '../hooks/useGallery';
import { PhotoGrid } from '../components/PhotoGrid';
import { Lightbox } from '../components/Lightbox';
import { GuestUploader } from '../components/GuestUploader';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { DownloadToolbar } from '../components/DownloadToolbar';
import { useArchiveDownload } from '../hooks/useArchiveDownload';
import { GalleryPhoto, PhotoSession, PublicEvent } from '../types';
import { config } from '../config';
import { ApiClientError } from '../api/client';
import { Footer } from '../components/Footer';
import { readGuestKey, saveGuestKey } from '../utils/guestKey';

type Tab = 'photos' | 'guests' | 'moments' | 'yours';

// Photos = the photographer's shots, Guests = photos guests added, Moments = every short clip.
const TAB_FILTERS: Record<Exclude<Tab, 'yours'>, GalleryFilter> = {
  photos: { source: 'owner', type: 'photo' },
  guests: { source: 'guest', type: 'photo' },
  moments: { type: 'video' },
};

const EMPTY: Record<Tab, { label: string; hint: string }> = {
  photos: { label: 'No photos yet', hint: "The photographer's photos will appear here." },
  guests: { label: 'No guest photos yet', hint: 'Photos shared by guests show up here.' },
  moments: { label: 'No moments yet', hint: 'Short video clips from the event show up here.' },
  yours: { label: 'Nothing uploaded yet', hint: 'Photos and clips you add will show up here.' },
};

export function PublicGalleryPage() {
  const { token } = useParams<{ token: string }>();
  const [event, setEvent] = useState<PublicEvent | null>(null);
  const [notFound, setNotFound] = useState<string | null>(null);
  const [sessions, setSessions] = useState<PhotoSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<string | undefined>(undefined);
  const [tab, setTab] = useState<Tab>('photos');
  const [guestKey, setGuestKey] = useState<string | null>(() => (token ? readGuestKey(token) : null));
  const [hasOwnUploads, setHasOwnUploads] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [pendingDelete, setPendingDelete] = useState<GalleryPhoto | null>(null);
  const [selecting, setSelecting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [findByTime, setFindByTime] = useState(false);
  const [timeResults, setTimeResults] = useState<GalleryPhoto[] | null>(null);
  const [timeFrom, setTimeFrom] = useState('');
  const [timeTo, setTimeTo] = useState('');

  // Set once the visitor picks a tab, so a late response never moves them somewhere else.
  const tabChosen = useRef(false);

  useEffect(() => {
    if (!token) return;
    let current = true;
    galleryApi
      .getEvent(token)
      .then((res) => {
        if (!current) return;
        setEvent(res.event);
        if (tabChosen.current) return;
        // Land on the first tab that has something to show.
        const { photos, guests, moments } = res.event.counts;
        if (photos === 0 && guests > 0) setTab('guests');
        else if (photos === 0 && guests === 0 && moments > 0) setTab('moments');
      })
      .catch((e) => current && setNotFound(e instanceof ApiClientError ? e.message : 'This link is not available.'));
    galleryApi
      .listSessions(token)
      .then((res) => current && setSessions(res.sessions))
      .catch(() => current && setSessions([]));
    return () => {
      current = false;
    };
  }, [token]);

  // A stored key the server no longer recognises is dropped, so the uploader mints a fresh one.
  useEffect(() => {
    if (!token || !guestKey) return;
    galleryApi
      .myUploads(token, guestKey, undefined, 1)
      .then((res) => setHasOwnUploads(res.items.length > 0))
      .catch((err) => {
        if (err instanceof ApiClientError && err.status === 401) {
          saveGuestKey(token, null);
          setGuestKey(null);
        }
      });
  }, [token, guestKey]);

  const fetchPage = useCallback(
    (cursor?: string) => {
      if (tab === 'yours') {
        return guestKey ? galleryApi.myUploads(token!, guestKey, cursor) : Promise.resolve({ items: [], nextCursor: null });
      }
      const filter = { ...TAB_FILTERS[tab], sessionId: tab === 'photos' ? selectedSession : undefined };
      return galleryApi.browse(token!, cursor, 50, filter, guestKey);
    },
    [token, tab, selectedSession, guestKey],
  );
  const gallery = useGallery({ fetchPage, resetKey: `${token}-${tab}-${selectedSession ?? ''}` });

  // While your fresh uploads are still processing, refresh "Yours" so they flip to ready on their own.
  const stillProcessing = tab === 'yours' && gallery.items.some((p) => p.status === 'uploaded' || p.status === 'processing');
  useEffect(() => {
    if (!stillProcessing || gallery.hasMore) return;
    const id = setInterval(() => gallery.reload(), 8000);
    return () => clearInterval(id);
  }, [stillProcessing, gallery.hasMore, gallery.reload]);

  const maxDownloadFiles = event?.downloads.maxFiles ?? 500;
  const downloads = useArchiveDownload({
    create: (body) => galleryApi.createArchive(token!, body),
    status: (id) => galleryApi.archiveStatus(token!, id),
  });

  function toggleSelect(photo: GalleryPhoto) {
    if (photo.status !== 'ready') return;
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(photo.id)) next.delete(photo.id);
      else if (next.size < maxDownloadFiles) next.add(photo.id);
      return next;
    });
  }

  function stopSelecting() {
    setSelecting(false);
    setSelectedIds(new Set());
  }

  function downloadSelected() {
    downloads.start({ photoIds: [...selectedIds] });
    stopSelecting();
  }

  function downloadAll() {
    if (tab === 'yours') return;
    downloads.start({ all: true, ...TAB_FILTERS[tab], sessionId: tab === 'photos' ? selectedSession : undefined });
  }

  function switchTab(next: Tab) {
    tabChosen.current = true;
    setTab(next);
    setLightboxIndex(null);
    setFindByTime(false);
    setTimeResults(null);
    stopSelecting();
  }

  function handleUploaded() {
    setHasOwnUploads(true);
    if (tab === 'yours') gallery.reload();
    else switchTab('yours');
  }

  async function handleFindByTime(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !timeFrom || !timeTo) return;
    const res = await galleryApi.findByTime(token, new Date(timeFrom).toISOString(), new Date(timeTo).toISOString());
    setTimeResults(res.items);
  }

  async function handleDownload(photo: GalleryPhoto) {
    if (!token) return;
    // Opened synchronously on click so browsers don't treat it as a blocked
    // popup once the URL fetch below resolves asynchronously.
    const downloadWindow = window.open('', '_blank');
    try {
      const { url } = await galleryApi.getDownloadUrl(token, photo.id, 'original');
      if (downloadWindow) downloadWindow.location.href = url;
      else window.location.href = url;
    } catch (err) {
      downloadWindow?.close();
      throw err;
    }
  }

  async function confirmDelete() {
    const photo = pendingDelete;
    setPendingDelete(null);
    if (!photo || !token || !guestKey) return;
    await galleryApi.deleteMine(token, guestKey, photo.id);
    setLightboxIndex(null);
    gallery.removeItem(photo.id);
    if (photo.status === 'ready' && event) {
      const key = photo.mediaType === 'video' ? 'moments' : photo.source === 'guest' ? 'guests' : 'photos';
      setEvent({ ...event, counts: { ...event.counts, [key]: Math.max(0, event.counts[key] - 1) } });
    }
  }

  if (notFound) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
        <p className="font-display text-xl text-ink">This link isn't available</p>
        <p className="mt-2 max-w-sm text-sm text-ink-faint">{notFound}</p>
      </div>
    );
  }

  const uploadsOpen = Boolean(event?.guestUploads.open);
  const counts = event?.counts ?? { photos: 0, guests: 0, moments: 0 };
  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: 'photos', label: 'Photos', count: counts.photos },
    ...(uploadsOpen || counts.guests > 0 ? [{ id: 'guests' as Tab, label: 'Guests', count: counts.guests }] : []),
    ...(uploadsOpen || counts.moments > 0 ? [{ id: 'moments' as Tab, label: 'Moments', count: counts.moments }] : []),
    ...(hasOwnUploads ? [{ id: 'yours' as Tab, label: 'Yours' }] : []),
  ];
  const displayedItems = findByTime && timeResults ? timeResults : gallery.items;

  return (
    <div className="min-h-screen pb-24">
      <header className="border-b border-hairline bg-paper-raised px-4 py-5">
        <div className="mx-auto max-w-6xl">
          <p className="frame-tag text-ink-faint">{config.appName}</p>
          <h1 className="font-display text-2xl font-semibold text-ink">{event?.name ?? 'Loading gallery…'}</h1>
          {event && token && uploadsOpen && (
            <div className="mt-4">
              <GuestUploader
                token={token}
                settings={event.guestUploads}
                onGuestKey={setGuestKey}
                onUploaded={handleUploaded}
              />
            </div>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-5">
        {tabs.length > 1 && (
          <nav role="tablist" className="-mx-4 mb-4 flex gap-1 overflow-x-auto border-b border-hairline px-4">
            {tabs.map((t) => (
              <button
                key={t.id}
                role="tab"
                aria-selected={tab === t.id}
                onClick={() => switchTab(t.id)}
                className={`shrink-0 px-3 py-2.5 text-sm font-medium transition-colors ${
                  tab === t.id ? 'border-b-2 border-mark text-ink' : 'text-ink-faint hover:text-ink'
                }`}
              >
                {t.label}
                {t.count !== undefined && t.count > 0 && (
                  <span className="frame-tag ml-1.5 text-ink-faint">{t.count.toLocaleString()}</span>
                )}
              </button>
            ))}
          </nav>
        )}

        {tab === 'photos' && (
          <div className="mb-4 flex flex-wrap items-center gap-2">
            {sessions.length > 0 && !findByTime && (
              <select
                className="input w-auto"
                value={selectedSession ?? ''}
                onChange={(e) => setSelectedSession(e.target.value || undefined)}
              >
                <option value="">All sessions</option>
                {sessions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            )}
            <button
              type="button"
              className="btn-ghost text-sm"
              onClick={() => {
                setFindByTime((v) => !v);
                setTimeResults(null);
              }}
            >
              {findByTime ? 'Show all photos' : 'Find my photos by time'}
            </button>
          </div>
        )}

        {findByTime && (
          <form onSubmit={handleFindByTime} className="card mb-5 flex flex-wrap items-end gap-3 p-4">
            <div>
              <label className="label" htmlFor="from">Roughly from</label>
              <input id="from" type="datetime-local" required className="input" value={timeFrom} onChange={(e) => setTimeFrom(e.target.value)} />
            </div>
            <div>
              <label className="label" htmlFor="to">To</label>
              <input id="to" type="datetime-local" required className="input" value={timeTo} onChange={(e) => setTimeTo(e.target.value)} />
            </div>
            <button type="submit" className="btn-primary">Search</button>
          </form>
        )}

        {displayedItems.length > 0 && (
          <DownloadToolbar
            selecting={selecting}
            selectedCount={selectedIds.size}
            maxFiles={maxDownloadFiles}
            allowDownloadAll={tab !== 'yours' && !findByTime}
            totalInView={tab === 'yours' ? undefined : counts[tab]}
            archive={downloads.archive}
            error={downloads.error}
            starting={downloads.starting}
            onStartSelecting={() => setSelecting(true)}
            onCancelSelecting={stopSelecting}
            onDownloadSelected={downloadSelected}
            onDownloadAll={downloadAll}
            onSave={downloads.save}
            onDismiss={downloads.dismiss}
          />
        )}

        {findByTime && timeResults === null ? (
          <p className="py-16 text-center text-sm text-ink-faint">
            Enter roughly when you were photographed to narrow the search.
          </p>
        ) : (
          <PhotoGrid
            items={displayedItems}
            loading={findByTime ? false : gallery.loading}
            loadingMore={findByTime ? false : gallery.loadingMore}
            hasMore={findByTime ? false : gallery.hasMore}
            onLoadMore={gallery.loadMore}
            onOpen={(_photo, i) => setLightboxIndex(i)}
            selecting={selecting}
            selectedIds={selectedIds}
            onToggleSelect={toggleSelect}
            onDownload={handleDownload}
            onDelete={guestKey ? setPendingDelete : undefined}
            emptyLabel={findByTime ? 'No photos found in that window' : EMPTY[tab].label}
            emptyHint={EMPTY[tab].hint}
          />
        )}

        {lightboxIndex !== null && (
          <Lightbox
            photos={displayedItems}
            index={lightboxIndex}
            onClose={() => setLightboxIndex(null)}
            onIndexChange={setLightboxIndex}
            onDownload={handleDownload}
            onDelete={guestKey ? setPendingDelete : undefined}
          />
        )}
      </main>

      <ConfirmDialog
        open={pendingDelete !== null}
        title={`Delete this ${pendingDelete?.mediaType === 'video' ? 'video' : 'photo'}?`}
        message="It will be removed from the gallery for everyone."
        confirmLabel="Delete"
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
      <Footer />
    </div>
  );
}
