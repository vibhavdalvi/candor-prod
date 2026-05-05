import { create } from 'zustand';
import api from 'shared/api';

export const useAuthStore = create((set, get) => ({
  user:    null,
  token:   localStorage.getItem('candor_token') || null,
  loading: true,

  init: async () => {
    const token = localStorage.getItem('candor_token');
    if (!token) { set({ loading: false }); return; }
    try {
      const { data } = await api.get('/auth/me');
      set({ user: data.user, token: localStorage.getItem('candor_token'), loading: false });
    } catch {
      localStorage.removeItem('candor_token');
      set({ user: null, token: null, loading: false });
    }
  },

  login: async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    localStorage.setItem('candor_token', data.token);
    set({ user: data.user, token: data.token });
    return data.user;
  },

  signup: async (email, password, fullName) => {
    const { data } = await api.post('/auth/signup', { email, password, fullName });
    localStorage.setItem('candor_token', data.token);
    set({ user: data.user, token: data.token });
    return data.user;
  },

  loginWithGoogle: async (credential) => {
    const { data } = await api.post('/auth/google', { credential });
    localStorage.setItem('candor_token', data.token);
    set({ user: data.user, token: data.token });
    return data.user;
  },

  logout: () => {
    localStorage.removeItem('candor_token');
    set({ user: null, token: null });
  },
}));
