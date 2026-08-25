import { api } from './client';
import { GalleryPage, PhotoSession } from '../types';

interface PublicEvent {
  id: string;
  name: string;
  description: string | null;
  eventDate: string | null;
  photoCount: number;
  photosAvailableUntil: string | null;
  visibility: string;
}

export const galleryApi = {
  getEvent: (token: string) => api.get<{ event: PublicEvent }>(`/g/${token}`),

  listSessions: (token: string) => api.get<{ sessions: PhotoSession[] }>(`/g/${token}/sessions`),

  browse: (token: string, cursor?: string, limit = 50, sessionId?: string) => {
    const params = new URLSearchParams({ limit: String(limit) });
    if (cursor) params.set('cursor', cursor);
    if (sessionId) params.set('sessionId', sessionId);
    return api.get<GalleryPage>(`/g/${token}/photos?${params.toString()}`);
  },

  findByTime: (token: string, fromIso: string, toIso: string) => {
    const params = new URLSearchParams({ from: fromIso, to: toIso });
    return api.get<{ items: GalleryPage['items'] }>(`/g/${token}/find-by-time?${params.toString()}`);
  },

  getDownloadUrl: (token: string, photoId: string, variant: 'original' | 'large' | 'medium' = 'original') =>
    api.get<{ url: string }>(`/g/${token}/photos/${photoId}/download?variant=${variant}`),
};
