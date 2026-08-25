import { api, setAccessToken } from './client';
import { PublicUser } from '../types';

interface LoginResponse {
  user: PublicUser;
  accessToken: string;
}

export const authApi = {
  async register(input: { email: string; password: string; fullName: string; businessName?: string }) {
    return api.post<{ user: PublicUser }>('/auth/register', input);
  },

  async login(input: { email: string; password: string }) {
    const res = await api.post<LoginResponse>('/auth/login', input);
    setAccessToken(res.accessToken);
    return res.user;
  },

  async refresh() {
    const res = await api.post<LoginResponse>('/auth/refresh');
    setAccessToken(res.accessToken);
    return res.user;
  },

  async logout() {
    await api.post('/auth/logout');
    setAccessToken(null);
  },
};
