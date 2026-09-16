import { api } from './client';
import {
  EventSummary,
  PhotoSession,
  AccessTokenSummary,
  IssuedAccess,
  GalleryPage,
  ProcessingSummary,
  UploadBatch,
  PresignedUpload,
  UploadFileMeta,
  ConfirmUploadItem,
  ConfirmUploadResult,
  ArchiveRequest,
  DownloadArchive,
  OwnerGuest,
} from '../types';

export const eventsApi = {
  create: (input: { name: string; description?: string; eventDate?: string; visibility?: string }) =>
    api.post<{ event: EventSummary; defaultAccess: IssuedAccess }>('/events', input),

  list: (page = 1, pageSize = 20) =>
    api.get<{ events: EventSummary[]; total: number; totalPages: number }>(
      `/events?page=${page}&pageSize=${pageSize}`,
    ),

  get: (eventId: string) => api.get<{ event: EventSummary }>(`/events/${eventId}`),

  publish: (eventId: string) => api.post<void>(`/events/${eventId}/publish`),

  uploadCover: (eventId: string, file: File) => {
    const form = new FormData();
    form.append('image', file);
    return api.postForm<{ event: EventSummary }>(`/events/${eventId}/cover`, form);
  },

  processingSummary: (eventId: string) =>
    api.get<{ summary: ProcessingSummary }>(`/events/${eventId}/processing-summary`),

  addSession: (eventId: string, input: { name: string; startsAt?: string; endsAt?: string }) =>
    api.post<{ session: PhotoSession }>(`/events/${eventId}/sessions`, input),

  listSessions: (eventId: string) => api.get<{ sessions: PhotoSession[] }>(`/events/${eventId}/sessions`),

  issueToken: (
    eventId: string,
    input: { label?: string; scope?: string; sessionId?: string; ttlDays?: number | null; maxUses?: number | null },
  ) => api.post<IssuedAccess>(`/events/${eventId}/access-tokens`, input),

  listTokens: (eventId: string) => api.get<{ tokens: AccessTokenSummary[] }>(`/events/${eventId}/access-tokens`),

  revokeToken: (eventId: string, tokenId: string, reason?: string) =>
    api.delete<void>(`/events/${eventId}/access-tokens/${tokenId}`, reason ? { reason } : undefined),

  deleteToken: (eventId: string, tokenId: string) =>
    api.delete<void>(`/events/${eventId}/access-tokens/${tokenId}/purge`),

  updateGuestUploads: (eventId: string, input: { guestUploadsEnabled: boolean; guestUploadsUntil?: string | null }) =>
    api.patch<{ event: EventSummary }>(`/events/${eventId}`, input),

  listPhotos: (eventId: string, cursor?: string, limit = 60, filter: MediaFilter = {}) => {
    const params = new URLSearchParams({ limit: String(limit) });
    if (cursor) params.set('cursor', cursor);
    if (filter.sessionId) params.set('sessionId', filter.sessionId);
    if (filter.source) params.set('source', filter.source);
    if (filter.type) params.set('type', filter.type);
    return api.get<GalleryPage>(`/events/${eventId}/photos?${params.toString()}`);
  },

  getPhotoDownloadUrl: (eventId: string, photoId: string, variant: 'original' | 'large' | 'medium' = 'original') =>
    api.get<{ url: string }>(`/events/${eventId}/photos/${photoId}/download?variant=${variant}`),

  deletePhoto: (eventId: string, photoId: string) => api.delete<void>(`/events/${eventId}/photos/${photoId}`),

  createArchive: (eventId: string, body: ArchiveRequest) =>
    api.post<{ archive: DownloadArchive }>(`/events/${eventId}/downloads`, body).then((r) => r.archive),

  archiveStatus: (eventId: string, archiveId: string) =>
    api.get<{ archive: DownloadArchive }>(`/events/${eventId}/downloads/${archiveId}`).then((r) => r.archive),

  listGuests: (eventId: string, page = 1) =>
    api.get<{ guests: OwnerGuest[]; total: number; page: number; pageSize: number }>(`/events/${eventId}/guests?page=${page}`),

  blockGuest: (eventId: string, guestId: string, removeUploads: boolean) =>
    api.post<{ blocked: boolean; removed: number }>(`/events/${eventId}/guests/${guestId}/block`, { removeUploads }),

  unblockGuest: (eventId: string, guestId: string) =>
    api.post<{ blocked: boolean; removed: number }>(`/events/${eventId}/guests/${guestId}/unblock`),

  removeGuestUploads: (eventId: string, guestId: string) =>
    api.post<{ removed: number }>(`/events/${eventId}/guests/${guestId}/remove-uploads`),
};

export interface MediaFilter {
  sessionId?: string;
  source?: 'owner' | 'guest';
  type?: 'photo' | 'video';
}

// Owner uploads: one batch for progress, then presign/confirm in chunks as files go up.
export const uploadApi = {
  start: (eventId: string, totalFiles: number, totalBytes: number) =>
    api.post<{ batchId: string }>(`/events/${eventId}/uploads/start`, { totalFiles, totalBytes }),

  presign: (eventId: string, batchId: string, files: UploadFileMeta[]) =>
    api.post<{ uploads: PresignedUpload[] }>(`/events/${eventId}/uploads/presign`, { batchId, files }),

  confirm: (eventId: string, batchId: string, items: ConfirmUploadItem[]) =>
    api.post<{ results: ConfirmUploadResult[] }>(`/events/${eventId}/uploads/confirm`, { batchId, items }),

  status: (batchId: string) => api.get<{ batch: UploadBatch }>(`/uploads/${batchId}/status`),
};
