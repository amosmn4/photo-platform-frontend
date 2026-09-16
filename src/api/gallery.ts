import { api } from './client';
import {
  ArchiveRequest,
  DownloadArchive,
  ConfirmUploadItem,
  ConfirmUploadResult,
  GalleryPage,
  PhotoSession,
  PresignedUpload,
  PublicEvent,
  UploadFileMeta,
} from '../types';

export interface GalleryFilter {
  sessionId?: string;
  source?: 'owner' | 'guest';
  type?: 'photo' | 'video';
}

const guestHeaders = (guestKey?: string | null): HeadersInit | undefined =>
  guestKey ? { 'X-Guest-Key': guestKey } : undefined;

export const galleryApi = {
  getEvent: (token: string) => api.get<{ event: PublicEvent }>(`/g/${token}`),

  listSessions: (token: string) => api.get<{ sessions: PhotoSession[] }>(`/g/${token}/sessions`),

  // The guest key is optional here — sent only so the viewer's own uploads come back with isMine.
  browse: (token: string, cursor?: string, limit = 50, filter: GalleryFilter = {}, guestKey?: string | null) => {
    const params = new URLSearchParams({ limit: String(limit) });
    if (cursor) params.set('cursor', cursor);
    if (filter.sessionId) params.set('sessionId', filter.sessionId);
    if (filter.source) params.set('source', filter.source);
    if (filter.type) params.set('type', filter.type);
    return api.get<GalleryPage>(`/g/${token}/photos?${params.toString()}`, guestHeaders(guestKey));
  },

  myUploads: (token: string, guestKey: string, cursor?: string, limit = 50) => {
    const params = new URLSearchParams({ limit: String(limit) });
    if (cursor) params.set('cursor', cursor);
    return api.get<GalleryPage>(`/g/${token}/my-uploads?${params.toString()}`, guestHeaders(guestKey));
  },

  findByTime: (token: string, fromIso: string, toIso: string) => {
    const params = new URLSearchParams({ from: fromIso, to: toIso });
    return api.get<{ items: GalleryPage['items'] }>(`/g/${token}/find-by-time?${params.toString()}`);
  },

  getDownloadUrl: (token: string, photoId: string, variant: 'original' | 'large' | 'medium' = 'original') =>
    api.get<{ url: string }>(`/g/${token}/photos/${photoId}/download?variant=${variant}`),

  issueGuestKey: (token: string) => api.post<{ guestKey: string }>(`/g/${token}/guest-key`),

  presign: (token: string, guestKey: string, files: UploadFileMeta[]) =>
    api.post<{ uploads: PresignedUpload[] }>(`/g/${token}/uploads/presign`, { files }, guestHeaders(guestKey)),

  confirm: (token: string, guestKey: string, items: ConfirmUploadItem[]) =>
    api.post<{ results: ConfirmUploadResult[] }>(`/g/${token}/uploads/confirm`, { items }, guestHeaders(guestKey)),

  createArchive: (token: string, body: ArchiveRequest) =>
    api.post<{ archive: DownloadArchive }>(`/g/${token}/downloads`, body).then((r) => r.archive),

  archiveStatus: (token: string, archiveId: string) =>
    api.get<{ archive: DownloadArchive }>(`/g/${token}/downloads/${archiveId}`).then((r) => r.archive),

  deleteMine: (token: string, guestKey: string, photoId: string) =>
    api.delete<void>(`/g/${token}/photos/${photoId}`, undefined, guestHeaders(guestKey)),
};
