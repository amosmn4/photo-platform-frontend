import { useCallback, useEffect, useRef, useState } from 'react';
import { ArchiveRequest, DownloadArchive } from '../types';

interface ArchiveApi {
  create: (body: ArchiveRequest) => Promise<DownloadArchive>;
  status: (archiveId: string) => Promise<DownloadArchive>;
}

const POLL_MS = 2000;

function saveFile(url: string) {
  const a = document.createElement('a');
  a.href = url;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
}

// Asks the server to zip a selection, follows its progress, and starts the download once it's ready.
// Some mobile browsers ignore a download that wasn't started by a tap, so `save` is there for a button too.
export function useArchiveDownload(archiveApi: ArchiveApi) {
  const [archive, setArchive] = useState<DownloadArchive | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const apiRef = useRef(archiveApi);
  apiRef.current = archiveApi;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoSaved = useRef<string | null>(null);
  const active = useRef<string | null>(null);

  const stopPolling = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };

  const follow = useCallback((next: DownloadArchive) => {
    if (active.current !== next.id) return;
    setArchive(next);
    if (next.status === 'ready' && next.url) {
      if (autoSaved.current !== next.id) {
        autoSaved.current = next.id;
        saveFile(next.url);
      }
      return;
    }
    if (next.status === 'failed') {
      setError(next.error ?? "We couldn't prepare this download. Please try again.");
      return;
    }
    timer.current = setTimeout(async () => {
      try {
        follow(await apiRef.current.status(next.id));
      } catch (err) {
        if (active.current === next.id) setError(err instanceof Error ? err.message : 'Lost track of the download.');
      }
    }, POLL_MS);
  }, []);

  const start = useCallback(
    async (body: ArchiveRequest) => {
      stopPolling();
      setError(null);
      setArchive(null);
      setStarting(true);
      try {
        const created = await apiRef.current.create(body);
        active.current = created.id;
        follow(created);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not start the download.');
      } finally {
        setStarting(false);
      }
    },
    [follow],
  );

  const dismiss = useCallback(() => {
    stopPolling();
    active.current = null;
    setArchive(null);
    setError(null);
  }, []);

  useEffect(() => stopPolling, []);

  return {
    archive,
    error,
    starting,
    busy: starting || archive?.status === 'queued' || archive?.status === 'building',
    start,
    dismiss,
    save: () => archive?.url && saveFile(archive.url),
  };
}
