import { create } from 'zustand';
import type { User } from '@plateforme/shared';
import { getAccessToken, setAccessToken } from '@/lib/api';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setSession: (user: User, token: string, expiresAt?: string) => void;
  setUser: (user: User) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: Boolean(getAccessToken()),
  isLoading: false,
  setSession: (user, token, expiresAt) => {
    setAccessToken(token, expiresAt);
    set({ user, isAuthenticated: true, isLoading: false });
  },
  setUser: (user) => set({ user }),
  logout: () => {
    setAccessToken(null);
    set({ user: null, isAuthenticated: false });
  },
}));
