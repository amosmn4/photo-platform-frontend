import { api } from './client';
import { AdminAccount, SiteSettings } from '../types';

export const adminApi = {
  listUsers: (page = 1, pageSize = 20) =>
    api.get<{ users: AdminAccount[]; total: number; totalPages: number }>(
      `/admin/users?page=${page}&pageSize=${pageSize}`,
    ),

  suspendUser: (userId: string) => api.patch<{ user: AdminAccount }>(`/admin/users/${userId}/suspend`),

  reactivateUser: (userId: string) => api.patch<{ user: AdminAccount }>(`/admin/users/${userId}/reactivate`),

  deleteUser: (userId: string) => api.delete<void>(`/admin/users/${userId}`),

  updateSettings: (input: {
    tagline?: string | null;
    contactEmail?: string | null;
    contactPhone?: string | null;
    contactAddress?: string | null;
    socialLinks?: Record<string, string>;
  }) => api.patch<{ settings: SiteSettings }>('/admin/settings', input),

  uploadLogo: (file: File) => {
    const form = new FormData();
    form.append('image', file);
    return api.postForm<{ settings: SiteSettings }>('/admin/settings/logo', form);
  },
};
