import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor — attach JWT token
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token');
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor — handle errors
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Token expired or invalid — redirect to login
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/';
      }
    }

    if (error.response?.status === 403) {
      console.error('[API] Forbidden: insufficient permissions');
    }

    if (error.response?.status === 429) {
      console.error('[API] Rate limited. Please slow down.');
    }

    return Promise.reject(error);
  }
);

// ── API Methods ───────────────────────────────────────────────────────────────

export const authApi = {
  login: (code: string) => api.post('/auth/callback', { code }),
  getMe: () => api.get('/auth/me'),
  getGuilds: () => api.get('/auth/guilds'),
};

export const guildApi = {
  getStats: (guildId: string) => api.get(`/guilds/${guildId}/stats`),
  getSettings: (guildId: string) => api.get(`/guilds/${guildId}/settings`),
  updateSettings: (guildId: string, settings: Record<string, unknown>) =>
    api.patch(`/guilds/${guildId}/settings`, settings),
};

export const moderationApi = {
  getCases: (guildId: string, params?: { type?: string; page?: number }) =>
    api.get(`/guilds/${guildId}/cases`, { params }),
  getCase: (guildId: string, caseId: number) =>
    api.get(`/guilds/${guildId}/cases/${caseId}`),
  addNote: (guildId: string, caseId: number, note: string) =>
    api.post(`/guilds/${guildId}/cases/${caseId}/notes`, { note }),
};

export const ticketApi = {
  getTickets: (guildId: string, params?: { status?: string }) =>
    api.get(`/guilds/${guildId}/tickets`, { params }),
  getTranscript: (guildId: string, ticketId: string) =>
    api.get(`/guilds/${guildId}/tickets/${ticketId}/transcript`, {
      responseType: 'blob',
    }),
};

export const analyticsApi = {
  getAnalytics: (guildId: string, params?: { period?: string }) =>
    api.get(`/guilds/${guildId}/analytics`, { params }),
};

export default api;
