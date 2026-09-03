import React, { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { galleryApi } from '../api/gallery';
import { useGallery } from '../hooks/useGallery';
import { PhotoGrid } from '../components/PhotoGrid';
import { Lightbox } from '../components/Lightbox';
import { GalleryPhoto, PhotoSession } from '../types';
import { config } from '../config';
import { ApiClientError } from '../api/client';

type Mode = 'browse' | 'find-by-time';

export function PublicGalleryPage() {
  const { token } = useParams<{ token: string }>();
  const [eventName, setEventName] = useState<string | null>(null);
  const [notFound, setNotFound] = useState<string | null>(null);
  const [sessions, setSessions] = useState<PhotoSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<string | undefined>(undefined);
  const [mode, setMode] = useState<Mode>('browse');
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [timeResults, setTimeResults] = useState<GalleryPhoto[] | null>(null);
  const [timeFrom, setTimeFrom] = useState('');
  const [timeTo, setTimeTo] = useState('');

  useEffect(() => {
    if (!token) return;
    galleryApi
      .getEvent(token)
      .then((res) => setEventName(res.event.name))
      .catch((e) => setNotFound(e instanceof ApiClientError ? e.message : 'This link is not available.'));
    galleryApi.listSessions(token).then((res) => setSessions(res.sessions));
  }, [token]);

  const fetchPage = useCallback(
    (cursor?: string) => galleryApi.browse(token!, cursor, 50, selectedSession),
    [token, selectedSession],
  );
  const gallery = useGallery({ fetchPage, resetKey: `${token}-${selectedSession ?? ''}` });

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

  const displayedItems = mode === 'find-by-time' && timeResults ? timeResults : gallery.items;

  if (notFound) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
        <p className="font-display text-xl text-ink">This link isn't available</p>
        <p className="mt-2 max-w-sm text-sm text-ink-faint">{notFound}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-hairline bg-paper-raised px-4 py-4">
        <p className="frame-tag text-ink-faint">{config.appName}</p>
        <h1 className="font-display text-xl font-semibold text-ink">{eventName ?? 'Loading gallery…'}</h1>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        <div className="mb-5 flex flex-wrap items-center gap-2">
          <div className="flex rounded-card border border-hairline bg-paper-raised p-1">
            <button
              type="button"
              onClick={() => setMode('browse')}
              className={`rounded px-3 py-1.5 text-sm font-medium transition-colors ${
                mode === 'browse' ? 'bg-mark text-white' : 'text-ink-soft'
              }`}
            >
              Browse all
            </button>
            <button
              type="button"
              onClick={() => setMode('find-by-time')}
              className={`rounded px-3 py-1.5 text-sm font-medium transition-colors ${
                mode === 'find-by-time' ? 'bg-mark text-white' : 'text-ink-soft'
              }`}
            >
              Find my photos
            </button>
          </div>

          {mode === 'browse' && sessions.length > 0 && (
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
        </div>

        {mode === 'find-by-time' && (
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

        {mode === 'find-by-time' && timeResults === null ? (
          <p className="py-16 text-center text-sm text-ink-faint">
            Enter roughly when you were photographed to narrow the search.
          </p>
        ) : (
          <PhotoGrid
            items={displayedItems}
            loading={mode === 'browse' ? gallery.loading : false}
            loadingMore={mode === 'browse' ? gallery.loadingMore : false}
            hasMore={mode === 'browse' ? gallery.hasMore : false}
            onLoadMore={gallery.loadMore}
            onOpen={(_photo, i) => setLightboxIndex(i)}
            onDownload={handleDownload}
            emptyLabel={mode === 'find-by-time' ? 'No photos found in that window' : 'No photos yet'}
          />
        )}

        {lightboxIndex !== null && (
          <Lightbox
            photos={displayedItems}
            index={lightboxIndex}
            onClose={() => setLightboxIndex(null)}
            onIndexChange={setLightboxIndex}
            onDownload={handleDownload}
          />
        )}
      </main>
    </div>
  );
}
