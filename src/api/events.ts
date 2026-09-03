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

  listPhotos: (eventId: string, cursor?: string, limit = 60, sessionId?: string) => {
    const params = new URLSearchParams({ limit: String(limit) });
    if (cursor) params.set('cursor', cursor);
    if (sessionId) params.set('sessionId', sessionId);
    return api.get<GalleryPage>(`/events/${eventId}/photos?${params.toString()}`);
  },

  getPhotoDownloadUrl: (eventId: string, photoId: string, variant: 'original' | 'large' | 'medium' = 'original') =>
    api.get<{ url: string }>(`/events/${eventId}/photos/${photoId}/download?variant=${variant}`),

  deletePhoto: (eventId: string, photoId: string) => api.delete<void>(`/events/${eventId}/photos/${photoId}`),
};

export const uploadApi = {
  start: (eventId: string, files: { filename: string; mimeType: string; sizeBytes: number }[]) =>
    api.post<{ batchId: string; uploads: PresignedUpload[] }>(`/events/${eventId}/uploads/start`, { files }),

  confirm: (
    eventId: string,
    input: {
      batchId: string;
      storageKey: string;
      originalFilename: string;
      mimeType: string;
      sizeBytes: number;
      checksumSha256: string;
      sessionId?: string;
    },
  ) => api.post<{ result: unknown }>(`/events/${eventId}/uploads/confirm`, input),

  status: (batchId: string) => api.get<{ batch: UploadBatch }>(`/uploads/${batchId}/status`),
};
