import { api } from './client';
import { SiteSettings } from '../types';

export const settingsApi = {
  get: () => api.get<{ settings: SiteSettings }>('/settings'),
};
